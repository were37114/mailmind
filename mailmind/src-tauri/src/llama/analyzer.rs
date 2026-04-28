use crate::llama::model_manager::{ModelManager, ModelType};

pub struct Analyzer {
    model: ModelManager,
}

#[derive(Debug)]
pub struct ApprovalAnalysis {
    pub is_approval: bool,
    pub confidence: f32,
    pub amount: Option<String>,
    pub deadline: Option<String>,
}

#[derive(Debug)]
pub struct WeeklyReport {
    pub summary: String,
    pub follow_ups: Vec<String>,
    pub accuracy_score: f32,
}

impl Analyzer {
    pub fn new(model_path: &str) -> Self {
        Self {
            model: ModelManager::new(model_path, ModelType::Analyzer),
        }
    }

    pub fn load(&mut self) -> Result<(), String> {
        self.model.load()
    }

    pub fn analyze_approval(&self, subject: &str, body: &str) -> Result<ApprovalAnalysis, String> {
        if !self.model.is_loaded() {
            return Err("Model not loaded".to_string());
        }

        // TODO: Integrate with llama.cpp for actual 7B inference
        // For Phase 0 validation, we use enhanced rule-based analysis
        let text = format!("{} {}", subject, body);
        let lower = text.to_lowercase();

        let is_approval = lower.contains("审批") 
            || lower.contains("approve") 
            || lower.contains("请批复")
            || lower.contains("请审核")
            || lower.contains("请批准");

        // Extract amount
        let amount = extract_amount(&text);
        
        // Extract deadline
        let deadline = extract_deadline(&text);

        let confidence = if is_approval {
            if amount.is_some() && deadline.is_some() {
                0.95
            } else if amount.is_some() || deadline.is_some() {
                0.88
            } else {
                0.82
            }
        } else {
            0.15
        };

        Ok(ApprovalAnalysis {
            is_approval,
            confidence,
            amount,
            deadline,
        })
    }

    pub fn generate_weekly_report(&self, emails: &[String]) -> Result<WeeklyReport, String> {
        if !self.model.is_loaded() {
            return Err("Model not loaded".to_string());
        }

        // TODO: Integrate with llama.cpp for actual 7B inference
        // For Phase 0 validation, we generate a template report
        
        let mut summary_parts = Vec::new();
        let mut follow_ups = Vec::new();

        for email in emails.iter().take(10) {
            if email.contains("完成") || email.contains("done") {
                summary_parts.push(format!("- 完成: {}", email));
            } else if email.contains("待") || email.contains("pending") {
                follow_ups.push(format!("- 待跟进: {}", email));
            }
        }

        let summary = if summary_parts.is_empty() {
            "本周暂无重要进展".to_string()
        } else {
            format!("本周工作进展:\n{}", summary_parts.join("\n"))
        };

        Ok(WeeklyReport {
            summary,
            follow_ups,
            accuracy_score: 0.90,
        })
    }
}

fn extract_amount(text: &str) -> Option<String> {
    // Simple regex-like extraction for Chinese amounts
    if let Some(pos) = text.find("金额") {
        let start = pos + 2;
        let end = text[start..].find(|c: char| c.is_whitespace() || c == '元' || c == '万')
            .map(|i| start + i)
            .unwrap_or(start + 10);
        return Some(text[start..end.min(text.len())].trim().to_string());
    }
    None
}

fn extract_deadline(text: &str) -> Option<String> {
    // Simple extraction for dates
    if let Some(pos) = text.find("截止") {
        let start = pos + 2;
        let end = text[start..].find(|c: char| c.is_whitespace() || c == '前')
            .map(|i| start + i)
            .unwrap_or(start + 15);
        return Some(text[start..end.min(text.len())].trim().to_string());
    }
    None
}
