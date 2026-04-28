use mailparse::{parse_mail, ParsedMail, MailHeaderMap};
use std::collections::HashMap;

#[derive(Debug, Clone, serde::Serialize)]
pub struct EmailMetadata {
    pub message_id: String,
    pub subject: String,
    pub from_name: String,
    pub from_email: String,
    pub to_list: Vec<String>,
    pub cc_list: Vec<String>,
    pub date: String,
    pub body_text: String,
    pub has_attachment: bool,
}

/// Parse raw .eml content into structured metadata
pub fn parse_email(raw_content: &[u8]) -> Result<EmailMetadata, String> {
    let parsed = parse_mail(raw_content).map_err(|e| format!("Parse error: {}", e))?;
    
    let headers = parsed.headers;
    
    let message_id = headers.get_first_value("Message-ID")
        .unwrap_or_default()
        .unwrap_or_else(|| format!("generated_{}", std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_millis()));
    
    let subject = headers.get_first_value("Subject")
        .unwrap_or_default()
        .unwrap_or_default();
    
    let from = headers.get_first_value("From")
        .unwrap_or_default()
        .unwrap_or_default();
    let (from_name, from_email) = parse_address(&from);
    
    let to_list = parse_address_list(&headers.get_first_value("To").unwrap_or_default().unwrap_or_default());
    let cc_list = parse_address_list(&headers.get_first_value("Cc").unwrap_or_default().unwrap_or_default());
    
    let date = headers.get_first_value("Date")
        .unwrap_or_default()
        .unwrap_or_default();
    
    let body_text = extract_body_text(&parsed)?;
    let has_attachment = has_attachments(&parsed);
    
    Ok(EmailMetadata {
        message_id,
        subject,
        from_name,
        from_email,
        to_list,
        cc_list,
        date,
        body_text,
        has_attachment,
    })
}

fn parse_address(addr: &str) -> (String, String) {
    if let Ok(addrs) = mailparse::addrparse(addr) {
        if let Some(first) = addrs.first() {
            let name = first.get_display_name().unwrap_or_default();
            let email = first.get_address().unwrap_or_default();
            return (name, email);
        }
    }
    (String::new(), addr.to_string())
}

fn parse_address_list(addrs: &str) -> Vec<String> {
    if addrs.is_empty() {
        return Vec::new();
    }
    
    match mailparse::addrparse(addrs) {
        Ok(parsed) => parsed.iter()
            .filter_map(|a| a.get_address().ok())
            .collect(),
        Err(_) => addrs.split(',').map(|s| s.trim().to_string()).collect(),
    }
}

fn extract_body_text(parsed: &ParsedMail) -> Result<String, String> {
    // If this is a multipart message, find the text/plain part
    if parsed.subparts.is_empty() {
        // Single part - return as text
        return parsed.get_body()
            .map_err(|e| format!("Body decode error: {}", e));
    }
    
    // Look for text/plain first
    for subpart in &parsed.subparts {
        let content_type = subpart.ctype.mimetype.to_lowercase();
        if content_type == "text/plain" {
            return subpart.get_body()
                .map_err(|e| format!("Body decode error: {}", e));
        }
    }
    
    // Fallback to text/html and strip tags (simplified)
    for subpart in &parsed.subparts {
        let content_type = subpart.ctype.mimetype.to_lowercase();
        if content_type == "text/html" {
            let html = subpart.get_body()
                .map_err(|e| format!("Body decode error: {}", e))?;
            // Simple HTML tag stripping
            return Ok(strip_html_tags(&html));
        }
    }
    
    // Final fallback - concatenate all text parts
    let mut result = String::new();
    for subpart in &parsed.subparts {
        if subpart.ctype.mimetype.starts_with("text/") {
            if let Ok(body) = subpart.get_body() {
                result.push_str(&body);
                result.push('\n');
            }
        }
    }
    
    Ok(result)
}

fn has_attachments(parsed: &ParsedMail) -> bool {
    if parsed.subparts.is_empty() {
        return false;
    }
    
    parsed.subparts.iter().any(|p| {
        let ct = p.ctype.mimetype.to_lowercase();
        !ct.starts_with("text/") && !ct.starts_with("multipart/")
    })
}

fn strip_html_tags(html: &str) -> String {
    let mut result = String::with_capacity(html.len());
    let mut in_tag = false;
    
    for ch in html.chars() {
        if ch == '<' {
            in_tag = true;
        } else if ch == '>' {
            in_tag = false;
        } else if !in_tag {
            result.push(ch);
        }
    }
    
    // Replace common HTML entities
    result.replace("&lt;", "<")
        .replace("&gt;", ">")
        .replace("&amp;", "&")
        .replace("&quot;", "\"")
        .replace("&#39;", "'")
        .replace("&nbsp;", " ")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_simple_email() {
        let raw = b"From: sender@example.com\r\n\
                     To: recipient@example.com\r\n\
                     Subject: Test Subject\r\n\
                     Message-ID: <test123@example.com>\r\n\
                     Date: Mon, 01 Jan 2024 00:00:00 +0000\r\n\
                     Content-Type: text/plain\r\n\r\n\
                     This is the email body.";
        
        let result = parse_email(raw);
        assert!(result.is_ok());
        
        let email = result.unwrap();
        assert_eq!(email.subject, "Test Subject");
        assert_eq!(email.from_email, "sender@example.com");
        assert_eq!(email.message_id, "<test123@example.com>");
        assert!(email.body_text.contains("This is the email body"));
    }

    #[test]
    fn test_parse_html_email() {
        let raw = b"From: sender@example.com\r\n\
                     To: recipient@example.com\r\n\
                     Subject: HTML Email\r\n\
                     Message-ID: <html123@example.com>\r\n\
                     Content-Type: multipart/alternative; boundary=\"boundary\"\r\n\r\n\
                     --boundary\r\n\
                     Content-Type: text/plain\r\n\r\n\
                     Plain text version\r\n\
                     --boundary\r\n\
                     Content-Type: text/html\r\n\r\n\
                     <html><body><p>HTML version</p></body></html>\r\n\
                     --boundary--";
        
        let result = parse_email(raw);
        assert!(result.is_ok());
        
        let email = result.unwrap();
        assert!(email.body_text.contains("Plain text version"));
    }

    #[test]
    fn test_parse_with_attachment() {
        let raw = b"From: sender@example.com\r\n\
                     To: recipient@example.com\r\n\
                     Subject: With Attachment\r\n\
                     Message-ID: <attach123@example.com>\r\n\
                     Content-Type: multipart/mixed; boundary=\"boundary\"\r\n\r\n\
                     --boundary\r\n\
                     Content-Type: text/plain\r\n\r\n\
                     See attached\r\n\
                     --boundary\r\n\
                     Content-Type: application/pdf\r\n\
                     Content-Disposition: attachment; filename=\"doc.pdf\"\r\n\r\n\
                     PDF content\r\n\
                     --boundary--";
        
        let result = parse_email(raw);
        assert!(result.is_ok());
        
        let email = result.unwrap();
        assert!(email.has_attachment);
        assert!(email.body_text.contains("See attached"));
    }

    #[test]
    fn test_empty_subject() {
        let raw = b"From: sender@example.com\r\n\
                     To: recipient@example.com\r\n\
                     Subject: \r\n\
                     Message-ID: <empty123@example.com>\r\n\
                     Content-Type: text/plain\r\n\r\n\
                     Body text";
        
        let result = parse_email(raw);
        assert!(result.is_ok());
        
        let email = result.unwrap();
        assert_eq!(email.subject, "");
        assert_eq!(email.body_text, "Body text");
    }

    #[test]
    fn test_strip_html_tags() {
        let html = "<html><body><p>Hello &lt;world&gt;</p></body></html>";
        let text = strip_html_tags(html);
        assert!(text.contains("Hello"));
        assert!(!text.contains("<html>"));
    }
}
