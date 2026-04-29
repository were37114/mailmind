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
) -> Result<Vec<EmailData>, String> {
    let mut imap = ImapSync::new();
    
    imap.connect(&server, port, &username, &password, use_tls)?;
    
    let emails = imap.fetch_emails(100)?;
    
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
