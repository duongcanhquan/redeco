import 'server-only';
import {
  resolveProviderBaseUrl,
  usesOpenAiCompatibleChat,
  type AiProviderId,
} from '@/lib/ai-providers';

export interface LlmChatInput {
  provider: AiProviderId;
  model: string;
  apiKey: string;
  baseUrl: string;
  system: string;
  user: string;
  /** ms */
  timeoutMs?: number;
}

/**
 * Gọi LLM theo cấu hình tenant — chỉ chạy server-side.
 * Hỗ trợ OpenAI-compatible, Azure, Anthropic, Gemini.
 */
export async function callTenantLlm(input: LlmChatInput): Promise<string> {
  const timeoutMs = input.timeoutMs ?? 30_000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    if (input.provider === 'anthropic') {
      return await callAnthropic(input, controller.signal);
    }
    if (input.provider === 'google') {
      return await callGemini(input, controller.signal);
    }
    if (usesOpenAiCompatibleChat(input.provider)) {
      return await callOpenAiCompatible(input, controller.signal);
    }
    throw new Error('Nhà cung cấp AI chưa được hỗ trợ gọi runtime.');
  } catch (e) {
    if (e instanceof Error && e.name === 'AbortError') {
      throw new Error('AI phản hồi quá lâu — thử lại hoặc đổi model.');
    }
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

async function callOpenAiCompatible(
  input: LlmChatInput,
  signal: AbortSignal,
): Promise<string> {
  const base = resolveProviderBaseUrl(input.provider, input.baseUrl);
  if (!base) {
    throw new Error('Thiếu địa chỉ API cho nhà cung cấp này.');
  }

  let url: string;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (input.provider === 'azure') {
    url = `${base}/openai/deployments/${encodeURIComponent(input.model)}/chat/completions?api-version=2024-08-01-preview`;
    headers['api-key'] = input.apiKey;
  } else {
    const root = base.endsWith('/v1') ? base : `${base}/v1`;
    url = `${root}/chat/completions`;
    headers.Authorization = `Bearer ${input.apiKey}`;
  }

  const res = await fetch(url, {
    method: 'POST',
    headers,
    signal,
    body: JSON.stringify({
      model: input.provider === 'azure' ? undefined : input.model,
      temperature: 0.2,
      max_tokens: 1200,
      messages: [
        { role: 'system', content: input.system },
        { role: 'user', content: input.user },
      ],
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(friendlyHttpError(res.status, body));
  }
  const json = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const text = json.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error('AI không trả về nội dung.');
  return text;
}

async function callAnthropic(input: LlmChatInput, signal: AbortSignal): Promise<string> {
  const base = resolveProviderBaseUrl('anthropic', input.baseUrl) || 'https://api.anthropic.com';
  const res = await fetch(`${base}/v1/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': input.apiKey,
      'anthropic-version': '2023-06-01',
    },
    signal,
    body: JSON.stringify({
      model: input.model,
      max_tokens: 1200,
      system: input.system,
      messages: [{ role: 'user', content: input.user }],
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(friendlyHttpError(res.status, body));
  }
  const json = (await res.json()) as {
    content?: { type: string; text?: string }[];
  };
  const text = json.content?.find((c) => c.type === 'text')?.text?.trim();
  if (!text) throw new Error('AI không trả về nội dung.');
  return text;
}

async function callGemini(input: LlmChatInput, signal: AbortSignal): Promise<string> {
  const base =
    resolveProviderBaseUrl('google', input.baseUrl) ||
    'https://generativelanguage.googleapis.com/v1beta';
  const url = `${base}/models/${encodeURIComponent(input.model)}:generateContent?key=${encodeURIComponent(input.apiKey)}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal,
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: input.system }] },
      contents: [{ role: 'user', parts: [{ text: input.user }] }],
      generationConfig: { temperature: 0.2, maxOutputTokens: 1200 },
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(friendlyHttpError(res.status, body));
  }
  const json = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  const text = json.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('').trim();
  if (!text) throw new Error('AI không trả về nội dung.');
  return text;
}

export interface EmbeddingInput {
  provider: AiProviderId;
  model: string;
  apiKey: string;
  baseUrl: string;
  texts: string[];
  timeoutMs?: number;
}

/**
 * Embeddings OpenAI-compatible. Anthropic/Google: dùng cùng base custom hoặc
 * bắt buộc provider openai/azure/custom/deepseek/groq tương thích /v1/embeddings.
 */
export async function callTenantEmbeddings(input: EmbeddingInput): Promise<number[][]> {
  if (input.texts.length === 0) return [];
  if (input.provider === 'anthropic' || input.provider === 'google') {
    throw new Error(
      'RAG embedding cần nhà cung cấp OpenAI-compatible (OpenAI / Azure / Custom / DeepSeek…). Đổi provider hoặc base URL hỗ trợ /v1/embeddings.',
    );
  }
  const timeoutMs = input.timeoutMs ?? 60_000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const base = resolveProviderBaseUrl(input.provider, input.baseUrl);
    if (!base) throw new Error('Thiếu địa chỉ API embedding.');

    let url: string;
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (input.provider === 'azure') {
      url = `${base}/openai/deployments/${encodeURIComponent(input.model)}/embeddings?api-version=2024-08-01-preview`;
      headers['api-key'] = input.apiKey;
    } else {
      const root = base.endsWith('/v1') ? base : `${base}/v1`;
      url = `${root}/embeddings`;
      headers.Authorization = `Bearer ${input.apiKey}`;
    }

    const payload =
      input.provider === 'azure'
        ? { input: input.texts }
        : { model: input.model, input: input.texts };
    const res = await fetch(url, {
      method: 'POST',
      headers,
      signal: controller.signal,
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(friendlyHttpError(res.status, body));
    }
    const json = (await res.json()) as {
      data?: { embedding?: number[]; index?: number }[];
    };
    const rows = json.data ?? [];
    if (rows.length !== input.texts.length) {
      throw new Error('Embedding API trả thiếu vector.');
    }
    return [...rows]
      .sort((a, b) => (a.index ?? 0) - (b.index ?? 0))
      .map((r) => {
        const emb = r.embedding;
        if (!emb || emb.length === 0) throw new Error('Embedding rỗng.');
        return emb;
      });
  } catch (e) {
    if (e instanceof Error && e.name === 'AbortError') {
      throw new Error('Embedding quá lâu — thử lại.');
    }
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

function friendlyHttpError(status: number, body: string): string {
  if (status === 401 || status === 403) {
    return 'API key AI bị từ chối — kiểm tra lại ở Cài đặt → AI.';
  }
  if (status === 429) return 'Nhà cung cấp AI đang giới hạn tốc độ — thử lại sau.';
  if (status >= 500) return 'Máy chủ AI tạm lỗi — thử lại sau.';
  const snip = body.slice(0, 160).replace(/\s+/g, ' ');
  return snip ? `Lỗi AI (${status}): ${snip}` : `Lỗi AI (HTTP ${status}).`;
}
