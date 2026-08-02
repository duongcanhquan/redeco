# Design Spec — AI RAG / Knowledge Base (R1)

> 2026-08-02 · Approach A · embedding storage float[] + cosine in-process.

## Flow

```
Cài đặt AI (ragEnabled, embeddingModel, chunk*, topK)
  → Manager tạo document (paste) trên collection theo module
  → ingest: chunk → embed API → rag_chunks
  → ask*Assistant: retrieve(module + chung) → LLM(system + snapshot + KB + q)
```

## Module keys collection

`chung` | `kinh-doanh` | `kho` | `san-xuat` | `nhan-su` | `thiet-bi`

## Easy Mode (polish 2026-08-02)

Mục tiêu: dễ dùng / dễ cài / chất lượng ổn.

- Không thêm dịch vụ ngoài (Pinecone/pgvector/Docker).
- 3 bước UI: key → dán SOP → hỏi AI.
- Thêm tài liệu → `enableRagEasyMode()` tự bật + defaults (chunk 350 / overlap 50 / topK 6).
- Embedding model theo provider; knobs ẩn trong «Tuỳ chọn nâng cao».
- Tiêu đề tuỳ chọn (lấy dòng đầu).
- Cảnh báo rõ khi provider không hỗ trợ `/v1/embeddings`.
