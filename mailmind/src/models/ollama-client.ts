/**
 * Ollama LLM Client — 本地模型推理客户端
 * 
 * 通过Ollama API与本地GGUF模型交互，支持：
 * - 审批邮件精筛（替代规则引擎的深层识别）
 * - 邮件分类（5类+紧急度）
 * - 周报生成
 * 
 * 降级策略：Ollama不可用时→规则引擎
 */

const OLLAMA_BASE_URL = 'http://localhost:11434';

export interface OllamaResponse {
  response: string;
  totalDuration: number; // ms
  evalCount: number;
  model: string;
}

export interface ApprovalResult {
  isApproval: boolean;
  confidence: number;
  amount: string | null;
  deadline: string | null;
  approvalType: string;
}

export interface ClassifyResult {
  category: '审批' | '通知' | '讨论' | '汇报' | '其他';
  urgency: '高' | '中' | '低';
  confidence: number;
}

/**
 * Check if Ollama server is available
 */
export async function isOllamaAvailable(): Promise<boolean> {
  try {
    const res = await fetch(`${OLLAMA_BASE_URL}/api/tags`, {
      signal: AbortSignal.timeout(3000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * List available models
 */
export async function listModels(): Promise<string[]> {
  try {
    const res = await fetch(`${OLLAMA_BASE_URL}/api/tags`);
    const data = await res.json();
    return (data.models || []).map((m: { name: string }) => m.name);
  } catch {
    return [];
  }
}

/**
 * Generate completion via Ollama API
 */
async function generate(
  model: string,
  prompt: string,
  options?: { temperature?: number; num_predict?: number }
): Promise<OllamaResponse> {
  const res = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      prompt,
      stream: false,
      options: {
        temperature: options?.temperature ?? 0.3,
        num_predict: options?.num_predict ?? 256,
      },
    }),
  });

  if (!res.ok) {
    throw new Error(`Ollama API error: ${res.status}`);
  }

  const data = await res.json();
  return {
    response: data.response,
    totalDuration: Math.round(data.total_duration / 1_000_000), // ns → ms
    evalCount: data.eval_count,
    model: data.model,
  };
}

/**
 * Classify an email using local LLM
 */
export async function classifyEmail(
  subject: string,
  body: string,
  model = 'qwen2.5:3b'
): Promise<ClassifyResult> {
  const prompt = `你是一个邮件分类助手。请分析以下邮件，将其分类到以下类别之一：审批、通知、讨论、汇报、其他。并判断紧急程度：高、中、低。

邮件主题: ${subject}
邮件内容: ${body.slice(0, 500)}

只输出以下格式：
类别: [审批/通知/讨论/汇报/其他]
紧急程度: [高/中/低]
置信度: [0-1]`;

  const result = await generate(model, prompt);

  // Parse response - handle both "类别: 审批" and "类别: [审批]" formats
  const categoryMatch = result.response.match(/类别[:：]\s*\[?(审批|通知|讨论|汇报|其他)\]?/);
  const urgencyMatch = result.response.match(/紧急程度[:：]\s*\[?(高|中|低)\]?/);
  const confidenceMatch = result.response.match(/置信度[:：]\s*\[?([\d.]+)\]?/);

  return {
    category: (categoryMatch?.[1] as ClassifyResult['category']) || '其他',
    urgency: (urgencyMatch?.[1] as ClassifyResult['urgency']) || '低',
    confidence: confidenceMatch ? parseFloat(confidenceMatch[1]) : 0.5,
  };
}

/**
 * Refine approval detection using local LLM
 * Used as the second layer after rule-engine recall
 */
export async function refineApproval(
  subject: string,
  body: string,
  model = 'qwen2.5:3b'
): Promise<ApprovalResult> {
  const prompt = `你是一个审批邮件识别专家。请分析以下邮件，判断它是否是需要用户审批的邮件。

审批邮件特征：
- 包含"请审批"、"请批复"、"请审核"、"请批准"等字样
- 涉及金额（预算、报销、采购等）
- 涉及人事（请假、调岗、离职等）
- 涉及合同或协议
- 有明确的截止时间

邮件主题: ${subject}
邮件内容: ${body.slice(0, 500)}

只输出以下格式：
是审批邮件: [是/否]
置信度: [0-1]
金额: [金额或无]
截止时间: [时间或无]
审批类型: [预算/人事/合同/其他/无]`;

  const result = await generate(model, prompt);

  // Parse response
  const isApprovalMatch = result.response.match(/是审批邮件[:：]\s*\[?(是|否)\]?/);
  const confidenceMatch = result.response.match(/置信度[:：]\s*\[?([\d.]+)\]?/);
  const amountMatch = result.response.match(/金额[:：]\s*\[?(.+?)\]?$/m);
  const deadlineMatch = result.response.match(/截止时间[:：]\s*\[?(.+?)\]?$/m);
  const typeMatch = result.response.match(/审批类型[:：]\s*\[?(预算|人事|合同|其他|无)\]?/);

  return {
    isApproval: isApprovalMatch?.[1] === '是',
    confidence: confidenceMatch ? parseFloat(confidenceMatch[1]) : 0.5,
    amount: amountMatch?.[1]?.trim() || null,
    deadline: deadlineMatch?.[1]?.trim() || null,
    approvalType: typeMatch?.[1] || '无',
  };
}

/**
 * Generate weekly report summary using local LLM
 */
export async function generateWeeklyReport(
  emailSummaries: string[],
  weekRange: string,
  model = 'qwen2.5:3b'
): Promise<string> {
  const prompt = `你是一个周报生成助手。根据以下本周邮件摘要，生成一份结构化的工作周报。

周报范围: ${weekRange}

本周邮件摘要:
${emailSummaries.map((s, i) => `${i + 1}. ${s}`).join('\n')}

请生成以下内容：
1. 本周工作重点（3-5条）
2. 审批事项汇总（如有）
3. 待跟进事项（如有）
4. 下周计划建议

确保事实准确，不要编造信息。`;

  const result = await generate(model, prompt, { num_predict: 1024 });
  return result.response;
}

export const ollamaClient = {
  isAvailable: isOllamaAvailable,
  listModels,
  classifyEmail,
  refineApproval,
  generateWeeklyReport,
};
