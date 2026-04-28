#!/bin/bash
# download-models.sh
# Download required models for MailMind MVP

set -e

MODELS_DIR="$(dirname "$0")/../models"
mkdir -p "$MODELS_DIR"

echo "📥 Downloading models for MailMind..."

# Qwen2.5-0.5B-Instruct (GGUF Q4_K_M)
if [ ! -f "$MODELS_DIR/qwen2.5-0.5b-q4_k_m.gguf" ]; then
    echo "Downloading Qwen2.5-0.5B-Instruct (~350MB)..."
    curl -L -o "$MODELS_DIR/qwen2.5-0.5b-q4_k_m.gguf" \
        "https://huggingface.co/Qwen/Qwen2.5-0.5B-Instruct-GGUF/resolve/main/qwen2.5-0.5b-instruct-q4_k_m.gguf" \
        || echo "⚠️ Failed to download 0.5B model"
else
    echo "✅ Qwen2.5-0.5B already exists"
fi

# Qwen2.5-7B-Instruct (GGUF Q4_K_M)
if [ ! -f "$MODELS_DIR/qwen2.5-7b-q4_k_m.gguf" ]; then
    echo "Downloading Qwen2.5-7B-Instruct (~4.5GB)..."
    curl -L -o "$MODELS_DIR/qwen2.5-7b-q4_k_m.gguf" \
        "https://huggingface.co/Qwen/Qwen2.5-7B-Instruct-GGUF/resolve/main/qwen2.5-7b-instruct-q4_k_m.gguf" \
        || echo "⚠️ Failed to download 7B model"
else
    echo "✅ Qwen2.5-7B already exists"
fi

# BGE-small-zh-v1.5 (ONNX)
if [ ! -f "$MODELS_DIR/bge-small-zh-v1.5.onnx" ]; then
    echo "Downloading BGE-small-zh-v1.5 (~95MB)..."
    curl -L -o "$MODELS_DIR/bge-small-zh-v1.5.onnx" \
        "https://huggingface.co/BAAI/bge-small-zh-v1.5/resolve/main/onnx/model.onnx" \
        || echo "⚠️ Failed to download BGE model"
else
    echo "✅ BGE-small-zh already exists"
fi

echo "✅ Model download complete!"
echo ""
echo "Downloaded models:"
ls -lh "$MODELS_DIR/"
