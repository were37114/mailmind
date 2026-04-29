// Re-export math utilities
export { cosineSimilarity } from '../utils/embedding-math';

// bge-small-zh-v1.5: 384-dim embeddings for Chinese text
// For better quality, use bge-large-zh-v1.5 (1024-dim) or bge-m3 (1024-dim)
const MODEL_NAME = 'Xenova/bge-small-zh-v1.5';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let embedder: any = null;
let isLoading = false;

export interface EmbeddingResult {
  embedding: number[];
  dimensions: number;
}

/**
 * Initialize the ONNX embedder with bge-small-zh-v1.5
 * First call will download the model (~100MB)
 */
export async function initEmbedder(): Promise<void> {
  if (embedder) return;
  if (isLoading) {
    // Wait for existing load to complete
    while (isLoading) {
      await new Promise(r => setTimeout(r, 100));
    }
    return;
  }

  isLoading = true;
  try {
    // Dynamically import transformers to avoid network calls at module load
    const { pipeline } = await import('@xenova/transformers');
    // Use feature-extraction pipeline for embeddings
    embedder = await pipeline('feature-extraction', MODEL_NAME, {
      quantized: true, // Use quantized model for smaller size
    });
  } finally {
    isLoading = false;
  }
}

/**
 * Generate embedding for a single text
 * @param text - Input text (will be truncated if >512 tokens)
 * @returns Embedding vector (384 dimensions for bge-small-zh)
 */
export async function embedText(text: string): Promise<EmbeddingResult> {
  if (!embedder) {
    await initEmbedder();
  }

  if (!embedder) {
    throw new Error('Embedder initialization failed');
  }

  // Truncate to avoid excessive tokenization
  const truncated = text.slice(0, 2000);

  const output = await embedder(truncated, {
    pooling: 'mean',
    normalize: true,
  });

  // output is a Tensor, extract the embedding vector
  const embedding = Array.from(output.data as Float32Array);

  return {
    embedding,
    dimensions: embedding.length,
  };
}

/**
 * Generate embeddings for multiple texts in batch
 * @param texts - Array of input texts
 * @returns Array of embedding results
 */
export async function embedBatch(texts: string[]): Promise<EmbeddingResult[]> {
  if (!embedder) {
    await initEmbedder();
  }

  if (!embedder) {
    throw new Error('Embedder initialization failed');
  }

  const truncated = texts.map(t => t.slice(0, 2000));

  const outputs = await embedder(truncated, {
    pooling: 'mean',
    normalize: true,
  });

  // Handle single or batch output
  const results: EmbeddingResult[] = [];

  if (Array.isArray(outputs)) {
    for (const output of outputs) {
      const embedding = Array.from(output.data as Float32Array);
      results.push({ embedding, dimensions: embedding.length });
    }
  } else {
    const embedding = Array.from(outputs.data as Float32Array);
    results.push({ embedding, dimensions: embedding.length });
  }

  return results;
}

/**
 * Check if embedder is ready
 */
export function isEmbedderReady(): boolean {
  return embedder !== null;
}

/**
 * Dispose the embedder to free memory
 */
export function disposeEmbedder(): void {
  embedder = null;
}
