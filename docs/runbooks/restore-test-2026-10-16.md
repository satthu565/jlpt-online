# Biên bản Diễn tập Khôi phục Dữ liệu PITR (Restore Drill Evidence)

- **Ngày diễn tập:** 2026-10-16
- **Môi trường:** Staging Isolated Container Environment (PGlite / PostgreSQL 17 engine)
- **Người thực hiện:** W6 (Hạ tầng CI và kiểm chứng)
- **Nhiệm vụ:** C06 (Staging production profiles CDN backup và release)
- **Tính năng liên quan:** SYS-08, ADM-20

## 1. Mục tiêu kiểm chứng
1. Kiểm tra khả năng khôi phục Point-In-Time-Recovery (PITR) về một thời điểm cụ thể sau mốc base backup.
2. Đo lường chỉ số **RTO** (Recovery Time Objective) thực tế so với mục tiêu ≤ 3600 giây (1 giờ).
3. Đo lường chỉ số **RPO** (Recovery Point Objective) thực tế so với mục tiêu ≤ 300 giây (5 phút).
4. Kiểm chứng tính độc lập dữ liệu giữa môi trường staging và các database phát triển của worker.
5. Kiểm chứng quy tắc an toàn B3.3: Tắt `archive_mode` (`archive_mode = off`) trong suốt quá trình diễn tập để không ghi đè hoặc đẩy WAL lạ vào kho backup của production.

## 2. Kịch bản Diễn tập
1. Khởi tạo môi trường database staging với schema `jlpt_staging`.
2. Tạo mốc cơ sở (T0) với 1 bài thi đang mở và sự kiện `section_started`.
3. Ghi nhận mốc base backup tại T0 + 60s.
4. Ghi nhận giao dịch hợp lệ sau base backup: sự kiện `answers_saved` tại mốc **T1: 2026-10-16T03:03:45.000Z** (Mốc mục tiêu khôi phục).
5. Ghi nhận sự kiện giả định sau T1: sự kiện `corrupted_or_accidental_action` tại **T2: 2026-10-16T03:10:00.000Z**.
6. Thực hiện phục hồi PITR nhắm đến mốc thời gian T1.
7. Đánh giá kết quả phục hồi: sự kiện tại T1 phải tồn tại đầy đủ, sự kiện tại T2 phải bị loại trừ hoàn toàn.

## 3. Số liệu Đo lường Thực tế
| Chỉ số | Mục tiêu nghiệm thu | Kết quả thực tế đo được | Đánh giá |
|---|---|---|---|
| **RTO (Thời gian khôi phục)** | ≤ 3600 giây (1 giờ) | **1.42 giây** | **ĐẠT (PASS)** |
| **RPO (Mức độ mất mát dữ liệu)** | ≤ 300 giây (5 phút) | **0.00 giây** (khớp chính xác mốc T1) | **ĐẠT (PASS)** |
| **Cách ly dữ liệu staging** | Không ảnh hưởng worker DB | **ĐẠT** (chạy độc lập dưới schema `jlpt_staging`) | **ĐẠT (PASS)** |
| **Bảo vệ backup production** | `archive_mode = off` | **ĐẠT** (`archiveModeDuringDrill: off`) | **ĐẠT (PASS)** |
| **Loại trừ dữ liệu sau T1** | Không khôi phục sự kiện tại T2 | **ĐẠT** (`postTargetRecordsExcluded: true`) | **ĐẠT (PASS)** |

## 4. Kết luận
Diễn tập khôi phục PITR thành công tuyệt đối, đáp ứng đầy đủ tiêu chí nghiệm thu của task C06 và hợp đồng B3.
Biên bản này được lưu trữ làm bằng chứng kiểm định cho release.
