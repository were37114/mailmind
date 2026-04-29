use tauri::command;
use crate::sync::parser::parse_email;
use crate::sync::imap::ImapSync;

#[derive(serde::Serialize)]
pub struct EmailData {
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

#[derive(serde::Serialize)]
pub struct ClassificationResult {
    pub category: u32,
    pub urgency: u32,
    pub confidence: f32,
}

#[command]
pub async fn test_imap_connection(
    server: String,
    port: u16,
    username: String,
    password: String,
    use_tls: bool,
) -> Result<(), String> {
    let mut imap = ImapSync::new();
    imap.connect(&server, port, &username, &password, use_tls)?;
    imap.disconnect();
    Ok(())
}

#[command]
pub async fn sync_emails(
    server: String,
    port: u16,
    username: String,
    password: String,
    use_tls: bool,
    _last_uid: u32,
    limit: Option<u32>,
) -> Result<Vec<EmailData>, String> {
    let mut imap = ImapSync::new();
    
    imap.connect(&server, port, &username, &password, use_tls)?;
    
    // Default to 20 for first sync to avoid timeout on large mailboxes
    let fetch_limit = limit.unwrap_or(20) as usize;
    let emails = imap.fetch_emails(fetch_limit)?;
    
    imap.disconnect();
    
    Ok(emails.into_iter().map(|e| EmailData {
        message_id: e.message_id,
        subject: e.subject,
        from_name: e.from_name,
        from_email: e.from_email,
        to_list: e.to_list,
        cc_list: e.cc_list,
        date: e.date,
        body_text: e.body_text,
        has_attachment: e.has_attachment,
    }).collect())
}

#[command]
pub async fn parse_email_command(raw_content: Vec<u8>) -> Result<EmailData, String> {
    let email = parse_email(&raw_content)?;
    
    Ok(EmailData {
        message_id: email.message_id,
        subject: email.subject,
        from_name: email.from_name,
        from_email: email.from_email,
        to_list: email.to_list,
        cc_list: email.cc_list,
        date: email.date,
        body_text: email.body_text,
        has_attachment: email.has_attachment,
    })
}

#[command]
pub async fn load_classifier_model() -> Result<(), String> {
    // Stub: model loading will be integrated with llama.cpp in a future release
    // For now, classification falls back to rule-based in classify_email
    Ok(())
}

#[command]
pub async fn classify_email(subject: String, body: String) -> Result<ClassificationResult, String> {
    let text = format!("{} {}", subject, body).to_lowercase();

    let (category, confidence) = if text.contains("审批") || text.contains("批复") || text.contains("审核") || text.contains("批准") || text.contains("请批复") {
        (0u32, 0.92f32)
    } else if text.contains("通知") || text.contains("公告") || text.contains("温馨提醒") {
        (1u32, 0.88f32)
    } else if text.contains("re:") || text.contains("回复") || text.contains("讨论") || text.contains("fw:") {
        (2u32, 0.85f32)
    } else if text.contains("汇报") || text.contains("报告") || text.contains("总结") || text.contains("周报") {
        (3u32, 0.87f32)
    } else {
        (4u32, 0.75f32)
    };

    let urgency = if text.contains("紧急") || text.contains("urgent") || text.contains("asap") || text.contains("截止") {
        2u32
    } else if text.contains("重要") || text.contains("important") || text.contains("请尽快") {
        1u32
    } else {
        0u32
    };

    Ok(ClassificationResult { category, urgency, confidence })
}
