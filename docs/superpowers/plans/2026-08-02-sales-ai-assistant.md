# Sales AI Assistant Implementation Plan

**Goal:** Panel hỏi AI trên hub Kinh doanh dùng snapshot + LLM theo cấu hình tenant.

## Tasks

1. `lib/ai-providers.ts` — helper endpoint/auth nếu cần; `services/ai-llm.service.ts` — callTenantLlm (OpenAI-compatible + Gemini + Anthropic tối thiểu).
2. `services/sales-ai.service.ts` — buildSalesAiSnapshot + askSalesAssistant.
3. Server action + UI `sales-ai-panel.tsx` trên `/sales`.
4. Typecheck; cập nhật current-state.
