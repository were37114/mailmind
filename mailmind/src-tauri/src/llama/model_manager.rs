use std::path::Path;
use std::sync::{Arc, Mutex};

pub struct ModelManager {
    model_path: String,
    model_type: ModelType,
    loaded: bool,
}

#[derive(Clone, Copy, Debug)]
pub enum ModelType {
    Classifier, // 0.5B
    Analyzer,   // 7B
}

impl ModelManager {
    pub fn new(model_path: &str, model_type: ModelType) -> Self {
        Self {
            model_path: model_path.to_string(),
            model_type,
            loaded: false,
        }
    }

    pub fn load(&mut self) -> Result<(), String> {
        if !Path::new(&self.model_path).exists() {
            return Err(format!("Model file not found: {}", self.model_path));
        }

        // TODO: Integrate with llama.cpp for actual model loading
        // For Phase 0 validation, we just verify the file exists
        self.loaded = true;
        Ok(())
    }

    pub fn is_loaded(&self) -> bool {
        self.loaded
    }

    pub fn model_type(&self) -> ModelType {
        self.model_type
    }

    pub fn model_path(&self) -> &str {
        &self.model_path
    }
}

/// Verify model file integrity using SHA-256
pub fn verify_model_checksum(path: &str, expected_hash: &str) -> Result<bool, String> {
    use std::fs::File;
    use std::io::{BufReader, Read};

    let file = File::open(path).map_err(|e| format!("Failed to open model file: {}", e))?;
    let mut reader = BufReader::new(file);
    let mut hasher = sha2::Sha256::new();
    
    let mut buffer = [0u8; 8192];
    loop {
        match reader.read(&mut buffer) {
            Ok(0) => break,
            Ok(n) => hasher.update(&buffer[..n]),
            Err(e) => return Err(format!("Read error: {}", e)),
        }
    }

    let hash = format!("{:x}", hasher.finalize());
    Ok(hash == expected_hash)
}
