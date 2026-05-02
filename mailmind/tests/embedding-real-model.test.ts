/**
 * Real model validation tests (require network access to HuggingFace)
 * 
 * Run manually: npx vitest run tests/embedding-real-model.test.ts
 * 
 * These are NOT included in the default test suite because:
 * 1. They require downloading ~100MB model from HuggingFace
 * 2. They fail in CI environments without network access
 */

import { describe, it, expect } from 'vitest';

describe.skipIf(process.env.CI === 'true' || process.env.SKIP_REAL_MODEL === '1')('Real model validation', () => {
  it('should download and initialize bge-small-zh', async () => {
    const { initEmbedder, isEmbedderReady } = await import('../src/models/onnx-embedder');
    await initEmbedder();
    expect(isEmbedderReady()).toBe(true);
  }, 120000);

  it('should generate normalized embeddings', async () => {
    const { embedText } = await import('../src/models/onnx-embedder');
    const result = await embedText('预算审批申请');
    expect(result.dimensions).toBe(384);
    const norm = Math.sqrt(result.embedding.reduce((s, v) => s + v * v, 0));
    expect(norm).toBeCloseTo(1.0, 1);
  }, 30000);
});
