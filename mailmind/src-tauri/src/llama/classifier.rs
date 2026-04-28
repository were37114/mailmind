use crate::llama::model_manager::{ModelManager, ModelType};

pub struct Classifier {
    model: ModelManager,
}

#[derive(Debug, Clone, Copy, PartialEq)]
pub enum EmailCategory {
    Approval = 0,    // 审批
    Notification = 1, // 通知
    Discussion = 2,   // 讨论
    Report = 3,       // 汇报
    Other = 4,        // 其他
}

#[derive(Debug, Clone, Copy, PartialEq)]
pub enum Urgency {
    Low = 0,
    Medium = 1,
    High = 2,
}

#[derive(Debug)]
pub struct ClassificationResult {
    pub category: EmailCategory,
    pub urgency: Urgency,
    pub confidence: f32,
}

impl Classifier {
    pub fn new(model_path: &str) -> Self {
        Self {
            model: ModelManager::new(model_path, ModelType::Classifier),
        }
    }

    pub fn load(&mut self) -> Result<(), String> {
        self.model.load()
    }

    pub fn classify(&self, subject: &str, body: &str) -> Result<ClassificationResult, String> {
        if !self.model.is_loaded() {
            return Err("Model not loaded".to_string());
        }

        // TODO: Integrate with llama.cpp for actual inference
        // For Phase 0 validation, we use rule-based classification
        let text = format!("{} {}", subject, body).to_lowercase();
        
        // Rule-based classification for validation
        let (category, confidence) = if text.contains("审批") || text.contains("approve") || text.contains("请批复") {
            (EmailCategory::Approval, 0.92)
        } else if text.contains("通知") || text.contains("notice") || text.contains("公告") {
            (EmailCategory::Notification, 0.88)
        } else if text.contains("re:") || text.contains("回复") || text.contains("讨论") {
            (EmailCategory::Discussion, 0.85)
        } else if text.contains("汇报") || text.contains("报告") || text.contains("总结") {
            (EmailCategory::Report, 0.87)
        } else {
            (EmailCategory::Other, 0.75)
        };

        // Determine urgency
        let urgency = if text.contains("紧急") || text.contains("urgent") || text.contains(" ASAP ") {
            Urgency::High
        } else if text.contains("重要") || text.contains("important") {
            Urgency::Medium
        } else {
            Urgency::Low
        };

        Ok(ClassificationResult {
            category,
            urgency,
            confidence,
        })
    }
}
