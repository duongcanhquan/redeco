# Architecture Decision Records (ADR)

Tệp này ghi lại **TẠI SAO** chúng ta chọn một công nghệ hoặc cấu trúc. Mỗi quyết định kiến trúc quan trọng phải được thêm vào đây theo format:

> `[Ngày] - [Quyết định] - [Ngữ cảnh] - [Hậu quả/Kết quả]`

Quy tắc: ADR đã ghi không bị sửa/xóa. Nếu quyết định thay đổi, ghi ADR mới và đánh dấu ADR cũ là `Superseded by ADR-XXX`.

---

## ADR-001

- **Ngày**: 2026-08-01
- **Quyết định**: Dùng cột **JSONB** (`attributes`/`custom_fields`) cho dữ liệu động theo tenant, thay vì mô hình **EAV** (Entity-Attribute-Value).
- **Ngữ cảnh**: ERP/MES multi-tenant cần cho phép mỗi khách hàng tự định nghĩa field riêng (custom fields) trên các entity như WorkOrder, Product, Inventory. Hai phương án: (1) EAV — bảng `entity_attributes(entity_id, attr_name, attr_value)`; (2) JSONB — một cột JSON trên chính bảng entity.
- **Hậu quả/Kết quả**:
  - ✅ Tránh **join explosion**: đọc 1 entity với N custom fields chỉ cần 1 row, không cần N join/pivot.
  - ✅ Query planner PostgreSQL hoạt động tốt, hỗ trợ GIN index (`jsonb_path_ops`) cho filter trên JSONB.
  - ✅ Đơn giản hóa Repository layer và giữ RLS trên 1 bảng duy nhất.
  - ⚠️ Đánh đổi: không có type/constraint ở tầng DB cho các field động → validation schema phải thực hiện ở Service layer dựa trên metadata definition của tenant.
  - ⚠️ Field trong JSONB không tham gia FK — field nào cần FK/JOIN phải được promote thành static column.

## ADR-002

- **Ngày**: 2026-08-01
- **Quyết định**: Lưu **UI Metadata (JSON cấu hình Form/Grid)** trên **Cloudflare R2**, frontend Next.js hoạt động như một **Rendering Engine** (Metadata-Driven Architecture).
- **Ngữ cảnh**: Mỗi tenant cần layout form/grid khác nhau (field tùy biến, label, validation, phân quyền hiển thị). Nếu hard-code UI theo tenant thì không scale. Cần một nơi lưu metadata: (1) bảng PostgreSQL; (2) object storage (R2).
- **Hậu quả/Kết quả**:
  - ✅ R2 không tính phí egress, latency thấp qua Cloudflare CDN — metadata được cache/serve như static asset, giảm tải cho PostgreSQL.
  - ✅ Metadata có version trong key (`...v{version}.json`) → dễ rollback, immutable deploy.
  - ✅ Thêm/sửa field cho tenant = publish JSON mới, không cần deploy code.
  - ⚠️ Đánh đổi: metadata cần zod validation phía client trước khi render; cần cơ chế invalidate cache khi publish version mới.

## ADR-003

- **Ngày**: 2026-08-01
- **Quyết định**: Cách ly dữ liệu multi-tenant bằng **PostgreSQL Row Level Security (RLS)** trên mô hình **shared database, shared schema** (phân biệt bằng `tenant_id`).
- **Ngữ cảnh**: Các phương án multi-tenancy: (1) database riêng mỗi tenant; (2) schema riêng mỗi tenant; (3) shared schema + `tenant_id` + RLS. Dự án SaaS cần onboard tenant nhanh, chi phí vận hành thấp, và tận dụng Supabase Auth (JWT claims).
- **Hậu quả/Kết quả**:
  - ✅ Cách ly dữ liệu được enforce ở tầng DB — kể cả khi application code có bug, RLS vẫn chặn rò rỉ dữ liệu chéo tenant.
  - ✅ Một migration áp dụng cho mọi tenant; chi phí vận hành thấp nhất.
  - ✅ Tích hợp tự nhiên với Supabase Auth: `tenant_id` nằm trong JWT claim, policy đọc qua `auth.jwt()`.
  - ⚠️ Đánh đổi: mọi bảng phải có `tenant_id` + policy + index theo `tenant_id`; cấm dùng `service_role` bypass RLS trong luồng nghiệp vụ (chi tiết: `.cursor/rules/database.mdc`).

## ADR-004

- **Ngày**: 2026-08-01
- **Quyết định**: Áp dụng **Clean Architecture + DDD** với phân lớp bắt buộc `Controller → Service → Repository → Entity`, và quy trình **Aggregate Design Blueprint** trước khi code module mới.
- **Ngữ cảnh**: ERP/MES có business logic phức tạp (invariants về sản xuất, tồn kho). Nếu logic phân tán vào Controller/UI sẽ không thể test, không thể tái sử dụng, và dễ vỡ khi mở rộng. Codebase sẽ được phát triển dài hạn bởi AI Agent + con người nên cần cấu trúc dự đoán được.
- **Hậu quả/Kết quả**:
  - ✅ Business logic tập trung tại Service/Entity → dễ unit test, không phụ thuộc framework.
  - ✅ Blueprint (Name, Context, Properties, Invariants, Policies, Domain Events) buộc thiết kế domain trước khi code → giảm rework.
  - ⚠️ Đánh đổi: nhiều boilerplate hơn cho CRUD đơn giản; mỗi module mới có thêm bước duyệt Blueprint (chi tiết: `.cursor/rules/ddd-blueprint.mdc`).

## ADR-005

- **Ngày**: 2026-08-01
- **Quyết định**: Quy trình lập trình của AI Agent bám chặt theo skill **Superpowers `using-superpowers`** — kiểm tra và invoke skill liên quan TRƯỚC mọi hành động; process skills (brainstorming, systematic-debugging) đi trước implementation skills.
- **Ngữ cảnh**: Dự án được phát triển chủ yếu qua AI Agent trong nhiều phiên. Nếu không có quy trình chuẩn, agent dễ hành động thiếu kỷ luật (code ngay không thiết kế, debug mò). Người dùng chỉ định skill tại `C:\Users\PC\.claude\plugins\cache\claude-plugins-official\superpowers\6.1.1\skills\using-superpowers\SKILL.md`.
- **Hậu quả/Kết quả**:
  - ✅ Mọi task đều đi qua bước kiểm tra skill → cách tiếp cận nhất quán giữa các phiên.
  - ✅ Kết hợp tự nhiên với quy trình Blueprint (ADR-004): brainstorm/design trước, code sau.
  - ⚠️ Đánh đổi: mỗi task có thêm bước kiểm tra skill (chi tiết: `.cursor/rules/skills-workflow.mdc`).

## ADR-006

- **Ngày**: 2026-08-01
- **Quyết định**: Toàn bộ thiết kế UI/UX sử dụng skill **`ui-ux-pro-max`** (design system persist tại `design-system/MASTER.md` + page overrides), với yêu cầu cứng: **responsive đủ 3 lớp thiết bị Desktop / iPad / Phone**, giao diện rõ ràng, minh bạch, đạt chất lượng thẩm mỹ cao.
- **Ngữ cảnh**: ERP/MES được dùng bởi nhân viên vận hành trên nhiều thiết bị (desktop văn phòng, tablet tại xưởng, điện thoại di động). UI metadata-driven (ADR-002) sinh giao diện động nên các renderer phải có chuẩn thiết kế thống nhất, không thể để chất lượng UI phụ thuộc cảm tính từng lần code. Skill tại `C:\Users\PC\.claude\plugins\cache\ui-ux-pro-max-skill\ui-ux-pro-max\2.5.0\.claude\skills\ui-ux-pro-max\SKILL.md`.
- **Hậu quả/Kết quả**:
  - ✅ Design system tập trung (semantic tokens, spacing 4/8px, type scale, icon set thống nhất) → mọi màn hình đồng bộ.
  - ✅ Checklist accessibility/touch/performance (CRITICAL/HIGH) bắt buộc pass trước khi bàn giao.
  - ✅ Chiến lược responsive rõ ràng: mobile-first 375px → tablet 768–1024px → desktop ≥1280px; grid/table tự thích ứng (table → card list trên phone).
  - ⚠️ Đánh đổi: cần chạy script design-system (Python) khi khởi tạo style mới; mọi UI task có thêm bước checklist (chi tiết: `.cursor/rules/ui-design.mdc`).

## ADR-007

- **Ngày**: 2026-08-01
- **Quyết định**: Chọn **NestJS** làm backend framework (thay vì Express thuần), tổ chức code dưới dạng **pnpm monorepo**: `apps/web` (Next.js App Router), `apps/api` (NestJS), `packages/domain` (shared domain types/entities).
- **Ngữ cảnh**: Tech stack ban đầu ghi "NestJS/Express" chưa chốt. Dự án theo Clean Architecture + DDD (ADR-004) với phân lớp Controller → Service → Repository → Entity, cần: dependency injection, module system theo Bounded Context, guards/interceptors cho multi-tenancy (tenant context từ JWT), và cấu trúc dự đoán được cho AI Agent phát triển dài hạn. Express thuần đòi hỏi tự dựng toàn bộ các phần này.
- **Hậu quả/Kết quả**:
  - ✅ Module system của NestJS ánh xạ 1:1 với Bounded Context; DI container hỗ trợ Repository pattern qua interface + injection token.
  - ✅ Guards/Interceptors chuẩn hóa việc extract `tenant_id` từ JWT cho mọi request (khớp ADR-003).
  - ✅ Pipes + class-validator/zod xử lý validation ở Controller layer đúng quy tắc `general.mdc`.
  - ✅ Monorepo pnpm cho phép `packages/domain` chia sẻ Entity/types giữa web và api — một nguồn sự thật cho domain model.
  - ⚠️ Đánh đổi: NestJS có learning curve (decorators, DI) và nhiều boilerplate hơn Express; chấp nhận vì tính kỷ luật kiến trúc quan trọng hơn tốc độ khởi đầu.
