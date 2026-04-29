use imap::Session;
use native_tls::TlsStream;
use std::net::TcpStream;

use crate::sync::parser::{parse_email, EmailMetadata};

enum ImapSession {
    Tls(Session<TlsStream<TcpStream>>),
    Plain(Session<TcpStream>),
}

pub struct ImapSync {
    session: Option<ImapSession>,
}

impl Default for ImapSync {
    fn default() -> Self {
        Self::new()
    }
}

impl ImapSync {
    pub fn new() -> Self {
        Self { session: None }
    }

    pub fn connect(&mut self, domain: &str, port: u16, username: &str, password: &str, use_tls: bool) -> Result<(), String> {
        if use_tls {
            let tls = native_tls::TlsConnector::builder()
                .build()
                .map_err(|e| format!("TLS error: {}", e))?;

            let stream = TcpStream::connect((domain, port))
                .map_err(|e| format!("TCP error: {}", e))?;
            let tls_stream = tls.connect(domain, stream)
                .map_err(|e| format!("TLS handshake error: {}", e))?;
            let client = imap::Client::new(tls_stream);

            let session = client
                .login(username, password)
                .map_err(|e| format!("Login error: {:?}", e))?;

            self.session = Some(ImapSession::Tls(session));
        } else {
            let stream = TcpStream::connect((domain, port))
                .map_err(|e| format!("TCP error: {}", e))?;
            let client = imap::Client::new(stream);

            let session = client
                .login(username, password)
                .map_err(|e| format!("Login error: {:?}", e))?;

            self.session = Some(ImapSession::Plain(session));
        }
        Ok(())
    }

    pub fn fetch_emails(&mut self, limit: usize) -> Result<Vec<EmailMetadata>, String> {
        let emails = match self.session.as_mut().ok_or("Not connected")? {
            ImapSession::Tls(session) => {
                session.select("INBOX").map_err(|e| format!("Select error: {}", e))?;
                Self::do_fetch(session, limit)?
            }
            ImapSession::Plain(session) => {
                session.select("INBOX").map_err(|e| format!("Select error: {}", e))?;
                Self::do_fetch(session, limit)?
            }
        };
        Ok(emails)
    }

    fn do_fetch<T: std::io::Read + std::io::Write>(session: &mut Session<T>, limit: usize) -> Result<Vec<EmailMetadata>, String> {
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
        if let Some(session) = self.session.take() {
            match session {
                ImapSession::Tls(mut s) => { let _ = s.logout(); }
                ImapSession::Plain(mut s) => { let _ = s.logout(); }
            }
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
