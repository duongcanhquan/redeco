/**
 * Catalog nhà cung cấp AI — cấu hình lưu trong tenant_settings.
 * Runtime gọi API sẽ đọc provider + model + key + baseUrl (bước sau).
 */

export const AI_PROVIDER_IDS = [
  'openai',
  'azure',
  'anthropic',
  'google',
  'deepseek',
  'groq',
  'mistral',
  'custom',
] as const;

export type AiProviderId = (typeof AI_PROVIDER_IDS)[number];

export interface AiProviderDef {
  id: AiProviderId;
  label: string;
  /** Model gợi ý khi đổi provider */
  defaultModel: string;
  /** Base URL gợi ý (để trống nếu SDK mặc định) */
  defaultBaseUrl: string;
  /** Một vài model phổ biến — gợi ý datalist */
  modelHints: readonly string[];
  hint: string;
}

export const AI_PROVIDERS: readonly AiProviderDef[] = [
  {
    id: 'openai',
    label: 'OpenAI',
    defaultModel: 'gpt-4o-mini',
    defaultBaseUrl: '',
    modelHints: ['gpt-4o-mini', 'gpt-4o', 'o4-mini'],
    hint: 'API chuẩn OpenAI (api.openai.com).',
  },
  {
    id: 'azure',
    label: 'Azure OpenAI',
    defaultModel: 'gpt-4o-mini',
    defaultBaseUrl: 'https://YOUR_RESOURCE.openai.azure.com',
    modelHints: ['gpt-4o-mini', 'gpt-4o'],
    hint: 'Điền endpoint Azure; model = tên deployment.',
  },
  {
    id: 'anthropic',
    label: 'Anthropic (Claude)',
    defaultModel: 'claude-sonnet-4-20250514',
    defaultBaseUrl: '',
    modelHints: ['claude-sonnet-4-20250514', 'claude-haiku-4-5-20251001'],
    hint: 'API Anthropic Messages.',
  },
  {
    id: 'google',
    label: 'Google Gemini',
    defaultModel: 'gemini-2.0-flash',
    defaultBaseUrl: '',
    modelHints: ['gemini-2.0-flash', 'gemini-2.5-flash', 'gemini-2.5-pro'],
    hint: 'Google AI Studio / Gemini API.',
  },
  {
    id: 'deepseek',
    label: 'DeepSeek',
    defaultModel: 'deepseek-chat',
    defaultBaseUrl: 'https://api.deepseek.com',
    modelHints: ['deepseek-chat', 'deepseek-reasoner'],
    hint: 'Tương thích OpenAI-style; base URL mặc định DeepSeek.',
  },
  {
    id: 'groq',
    label: 'Groq',
    defaultModel: 'llama-3.3-70b-versatile',
    defaultBaseUrl: 'https://api.groq.com/openai/v1',
    modelHints: ['llama-3.3-70b-versatile', 'mixtral-8x7b-32768'],
    hint: 'Suy luận nhanh, API kiểu OpenAI.',
  },
  {
    id: 'mistral',
    label: 'Mistral AI',
    defaultModel: 'mistral-small-latest',
    defaultBaseUrl: 'https://api.mistral.ai/v1',
    modelHints: ['mistral-small-latest', 'mistral-large-latest'],
    hint: 'API Mistral (OpenAI-compatible endpoint).',
  },
  {
    id: 'custom',
    label: 'Tùy chỉnh / OpenAI-compatible',
    defaultModel: '',
    defaultBaseUrl: '',
    modelHints: [],
    hint: 'Endpoint riêng (vLLM, Ollama, gateway…) — bắt buộc điền địa chỉ API.',
  },
] as const;

export function isAiProviderId(v: string): v is AiProviderId {
  return (AI_PROVIDER_IDS as readonly string[]).includes(v);
}

export function getAiProvider(id: string): AiProviderDef {
  return AI_PROVIDERS.find((p) => p.id === id) ?? AI_PROVIDERS[AI_PROVIDERS.length - 1]!;
}

export function parseAiProviderId(raw: string, fallback: AiProviderId = 'openai'): AiProviderId {
  return isAiProviderId(raw) ? raw : fallback;
}

/** Endpoint chat mặc định khi tenant không nhập baseUrl. */
export function resolveProviderBaseUrl(provider: AiProviderId, configured: string): string {
  const trimmed = configured.trim().replace(/\/$/, '');
  if (trimmed) return trimmed;
  switch (provider) {
    case 'openai':
      return 'https://api.openai.com/v1';
    case 'deepseek':
      return 'https://api.deepseek.com';
    case 'groq':
      return 'https://api.groq.com/openai/v1';
    case 'mistral':
      return 'https://api.mistral.ai/v1';
    case 'anthropic':
      return 'https://api.anthropic.com';
    case 'google':
      return 'https://generativelanguage.googleapis.com/v1beta';
    case 'azure':
    case 'custom':
      return '';
    default:
      return '';
  }
}

export function usesOpenAiCompatibleChat(provider: AiProviderId): boolean {
  return (
    provider === 'openai' ||
    provider === 'deepseek' ||
    provider === 'groq' ||
    provider === 'mistral' ||
    provider === 'custom' ||
    provider === 'azure'
  );
}
