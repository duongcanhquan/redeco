# HR NS1 (Core) — Design

**Ngày:** 2026-08-02  
**Blueprint:** `docs/blueprints/2026-08-02-hr-ns1-blueprint.md`  
**Status:** Implemented NS1

## Goal

Module `nhan-su` dùng được: cây phòng ban, hồ sơ NV, hợp đồng LĐ cơ bản — SSOT cho pha chấm công/lương sau.

## Stack

Giống Sales/Kho: migration Supabase + RLS, `hr.service.ts`, UI App Router glass/bento, không Prisma.

## UI (responsive)

| Route | Nội dung |
|---|---|
| `/{slug}/hr` | Hub KPI (số NV active, phòng ban, HĐ sắp hết) |
| `/{slug}/hr/departments` | Cây/list phòng ban + tạo |
| `/{slug}/hr/employees` | List + tìm + tạo/sửa |
| `/{slug}/hr/employees/[id]` | Chi tiết + danh sách HĐ + thêm HĐ |

## Out of scope

T&A, payroll, ATS, AI, `hanh-chinh`.
