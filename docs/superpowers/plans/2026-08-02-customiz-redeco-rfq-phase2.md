# Customiz REDECO RFQ Phase 2 — Bộ lọc phân loại

> **For agentic workers:** Execute task-by-task; verify after each.

**Goal:** Admin KD cấu hình quy tắc lọc → khi import (và nút «Chạy lại lọc») gắn tag `tiem-nang` | `can-nhac` | `khong-tiem-nang` (giữ `trung` riêng).

**Architecture:** Rules JSONB trên `customiz_rfq_filter_profiles` theo `tenant_id` + `pack_key`. Engine thuần TS evaluate điều kiện AND/OR trên field Excel. UI form thêm/sửa/xóa + đổi thứ tự ưu tiên (↑↓). Kéo-thả canvas đầy đủ = refinement sau nếu cần.

**Tech Stack:** Supabase, Next.js server actions, TypeScript.

## Global Constraints

- Không đụng quotation core; pack `customiz.kinh-doanh.redeco-rfq`.
- Tag phân loại **một** (ưu tiên rule đầu khớp); `trung` độc lập.
- Soft-deleted không chạy lại lọc.

## Roadmap liên quan (không làm trong P2)

- **C3–C4:** Danh mục tính toán báo giá theo DN (REDECO công thức/quy tắc sửa được) → bổ sung chi phí trên RFQ → tạo BG chuẩn. Ghi trong current-state.

---

### Task 1: Migration + types

- [ ] `customiz_rfq_filter_profiles` (tenant_id, pack_key, name, rules jsonb, is_active)
- [ ] RLS `has_module_access('customiz')`

### Task 2: Engine + tests

- [ ] `redeco-rfq-filter.ts` — ops: eq, neq, contains, gt, gte, lt, lte, empty, not_empty
- [ ] `scripts/test-redeco-rfq-filter.cjs`

### Task 3: Service + apply on import / re-run

- [ ] CRUD profile/rules; `classifyRedeecoRfqRow`; hook import; `reclassifyAll`

### Task 4: UI

- [ ] Tab/section «Bộ lọc» trên inbox + form rules
- [ ] Filter list by classification tag

### Task 5: Docs + commit
