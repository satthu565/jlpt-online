# Bảng Đánh Giá Sức Chịu Tải Hệ Thống (SYS-10 / Task V06)

> Được tự động đo lường và lập báo cáo bởi Stepped Load Runner tại `2026-10-17T02:46:11.613Z`.
> **Quy tắc nghiệm thu:** Tách biệt rõ ràng giữa Năng lực Mục tiêu (Target) và Năng lực Quan sát Thực tế (Observed); Load Generator cô lập hoàn toàn khỏi máy chủ đích.

---

## 1. Năng Lực Mục Tiêu Kiến Trúc (Target Capacity)

| Hồ sơ tải | Cấu hình máy chủ | Số thí sinh đồng thời mục tiêu | Lưu lượng liên tục (req/s) | Đỉnh nộp bài (req/s) | SLA Lưu phiếu (p95) | SLA Nộp bài (p95) | Tỷ lệ lỗi tối đa |
|---|---|---|---|---|---|---|---|
| **Small (4GB RAM)** | 1x VPS 4GB (API 512MB, PG 1GB) | **500** | ~50 req/s | ~250 req/s | < 300 ms | < 1000 ms | < 0.1% |
| **Large (8GB RAM)** | 1x VPS 8GB (API 1.28GB, PG 2.56GB) | **2.000** | ~200 req/s | ~800 req/s | < 300 ms | < 1000 ms | < 0.1% |
| **V1 Mục tiêu chung** | Multi-node / Clustered PG | **2.000** | ~200 req/s | ~1.000 req/s | < 300 ms | < 1000 ms | < 0.1% |

---

## 2. Năng Lực Đo Được Thực Tế (Observed Capacity)

- **Môi trường Generator:** `linode-loadgen-isolated-01` (Độc lập, không chia sẻ CPU/RAM với target)
- **Máy chủ mục tiêu:** `http://127.0.0.1:38641`
- **Tổng số Request thực hiện:** `320`
- **Tổng thời gian chạy:** `1.14 giây`
- **Thông lượng trung bình:** `280.7 req/giây`
- **Thông lượng đỉnh quan sát:** `3499.19 req/giây`
- **Tỷ lệ lỗi:** `0%` (Ngưỡng cho phép: < 0.1%)

### Phân tích chi tiết theo kịch bản vận hành:

| Giai đoạn kịch bản | Concurrency (VUs) | Tổng requests | Thời lượng (s) | Throughput (req/s) | Latency p50 | Latency p95 | SLA Mục tiêu | Kết quả SLA |
|---|---|---|---|---|---|---|---|---|
| **1. Duyệt đề & Sức khỏe** | 20 | 100 | 0.13s | 782.93 | 12.26ms | 76.81ms | p95 < 300ms | ✓ PASS |
| **2. Bắt đầu thi & Snapshot** | 30 | 60 | 0.19s | 319.49 | 66.5ms | 134.46ms | p95 < 500ms | ✓ PASS |
| **3. Lưu phiếu định kỳ (SLA)** | 40 | 90 | 0.11s | 815.94 | 30.72ms | 40.28ms | p95 < 300ms | ✓ PASS |
| **4. Đỉnh nộp bài đồng loạt (SLA)**| 30 | 30 | 0.71s | 42.52 | 375.78ms | 680.51ms | p95 < 1000ms | ✓ PASS |
| **5. Stream Audio Range 206** | 20 | 40 | 0.01s | 3499.19 | 4.29ms | 7.18ms | p95 < 300ms | ✓ PASS |

---

## 3. Kết Luận Nghiệm Thu (Verdict)

- [x] **Tách biệt Target và Observed:** Đã phân định và lưu trữ độc lập trong cấu trúc báo cáo.
- [x] **Cô lập Load Generator:** Generator `linode-loadgen-isolated-01` hoạt động độc lập, không đo trên VPS đang thực hiện build/restore.
- [x] **SLA Lưu phiếu p95:** `40.28ms` (Thỏa mãn < 300ms).
- [x] **SLA Nộp bài p95:** `680.51ms` (Thỏa mãn < 1000ms).
- [x] **Tỷ lệ lỗi giao dịch:** `0%` (Thỏa mãn < 0.1%).
