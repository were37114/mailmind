use imap::{Client, Session};
use native_tls::TlsStream;
use std::net::TcpStream;

use crate::sync::parser::{parse_email, EmailMetadata};

pub struct ImapSync {
    session: Option<Session<TlsStream<TcpStream>>>,
}

impl ImapSync {
    pub fn new() -> Self {
        Self { session: None }
    }

    pub fn connect(&mut self, domain: &str, username: &str, password: &str) -> Result<(), String> {
        let tls = native_tls::TlsConnector::builder()
            .build()
            .map_err(|e| format!("TLS error: {}", e))?;

        let stream = TcpStream::connect((domain, 993))
            .map_err(|e| format!("TCP error: {}", e))?;
        let tls_stream = tls.connect(domain, stream)
            .map_err(|e| format!("TLS error: {}", e))?;
        let client = Client::new(tls_stream);

        let session = client
            .login(username, password)
            .map_err(|e| format!("Login error: {:?}", e))?;

        self.session = Some(session);
        Ok(())
    }

    pub fn fetch_emails(&mut self, limit: usize) -> Result<Vec<EmailMetadata>, String> {
        let session = self.session.as_mut().ok_or("Not connected")?;

        session
            .select("INBOX")
            .map_err(|e| format!("Select error: {}", e))?;

        let messages = session
            .search("ALL")
            .map_err(|e| format!("Search error: {}", e))?;

        let mut emails = Vec::new();
        let fetch_set: Vec<_> = messages.iter().take(limit).collect();

        if fetch_set.is_empty() {
            return Ok(emails);
        }

        let fetch_str = format!(
            "{}:{}",
            fetch_set.first().unwrap(),
            fetch_set.last().unwrap()
        );

        let fetches = session
            .fetch(fetch_str, "RFC822")
            .map_err(|e| format!("Fetch error: {}", e))?;

        for fetch in fetches.iter() {
            if let Some(body) = fetch.body() {
                match parse_email(body) {
                    Ok(email) => emails.push(email),
                    Err(e) => eprintln!("Parse error: {}", e),
                }
            }
        }

        Ok(emails)
    }

    pub fn disconnect(&mut self) {
        if let Some(mut session) = self.session.take() {
            let _ = session.logout();
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_imap_new() {
        let sync = ImapSync::new();
        assert!(sync.session.is_none());
    }
}
