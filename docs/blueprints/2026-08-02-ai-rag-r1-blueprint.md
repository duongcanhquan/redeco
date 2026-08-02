# Aggregate Design Blueprint: AI Knowledge / RAG — Phase R1

> Ngày: 2026-08-02. Entitlement: **`ai`** (+ node `ai.rag`).  
> Chốt triển khai: **Approach A** + embedding **float[] + cosine** (đổi pgvector sau không đổi API).  
> **Trạng thái: triển khai theo chỉ đạo «rà soát đồng bộ fix».**

## Scope R1

**Trong**
- `rag_collections` / `rag_documents` / `rag_chunks` + RLS tenant + `has_module_access('ai')`
- Setup trong Cài đặt → AI → Tri thức (RAG): bật/tắt, embedding model, chunk size/overlap, top-k
- Ingest text/markdown → chunk → embed (OpenAI-compatible `/v1/embeddings`) → `ready`
- `retrieve(moduleKey, query)` + inject ngữ cảnh vào mọi `ask*Assistant` (+ collection `chung`)
- Catalog `ai.rag` (feature quản trị KB)

**Ngoài**
- PDF/DOCX/R2, Nest queue, pgvector IVFFlat (pha sau), crawl web

## Invariants

1. Chỉ manager ghi document/ingest; member entitled `ai` được retrieve gián tiếp qua ask.
2. Document `ready` mới tham gia retrieve.
3. Prompt: chỉ dùng snapshot + chunk; cite `document.title`.
4. `ragEnabled=false` → ask như cũ (snapshot only).
