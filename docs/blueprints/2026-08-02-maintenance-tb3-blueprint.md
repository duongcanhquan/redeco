# Aggregate Design Blueprint: Maintenance — Phase TB3

> Module: **`thiet-bi`**. Ngày: 2026-08-02.  
> Slice: Meter/PdM ngưỡng · OEE mỏng · AI ask `ai.thiet-bi`.  
> **Trạng thái: triển khai theo «làm hết» sau TB2.**

## Scope

**Trong**
- `eam_meters` + `eam_meter_readings` (manual + nguồn `iot_stub`)
- Vượt ngưỡng warn/critical → tạo WorkRequest (critical) + cảnh báo UI
- OEE tính từ downtime lệnh BT vs giờ kế hoạch/ngày trên thiết bị
- Catalog AI `ai.thiet-bi` / `ai.thiet-bi.hoi-dap` + panel hub + Cài đặt

**Ngoài (không làm full-stack IoT)**
- MQTT/OPC-UA realtime, Digital Twin 3D, camera CV, GA/APS
- Performance/Quality OEE từ đếm sản lượng máy thật (stub = 1)

## OEE

`OEE = Availability × Performance × Quality`  
TB3: A từ downtime; P=1; Q=1 (ghi rõ trên UI).
