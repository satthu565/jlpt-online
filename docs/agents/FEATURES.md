# Tính năng theo trạng thái

Cập nhật lần cuối: 22/10/2026. **Agent xong một tính năng thì sửa file này trong cùng PR.**

Ký hiệu: ✅ đang chạy · 🙈 đã code nhưng đang ẩn · ⏳ code xong, chờ dịch vụ ngoài · 🚧 đang làm · 📋 dự kiến.

## ✅ Đang chạy

### Học viên (`apps/web`)

| Tính năng | Trang | Code chính |
|---|---|---|
| Thư viện đề, chi tiết đề | `/de-thi`, `/de-thi/[slug]`, `/[level]/de-thi` | `features/library`, module API `exam` |
| Phòng thi có giờ (thi thật và luyện tập), đồng bộ khi mất mạng | `/phong-thi` | `features/exam`, module `attempt` |
| Kết quả, đỗ/trượt theo JLPT, điểm sàn từng phần, phân tích thời gian | `/ket-qua/[id]` | `features/results`, `packages/exam-engine` |
| Luyện tập trộn câu | `/luyen-tap` | `features/practice`, `features/mix` |
| Nghe có audio và hình | trong phòng thi | `features/exam`, module `media` |
| Furigana bật/tắt, Hán Việt theo từng từ | toàn site | `packages/content-tools/src/nlp` |
| Cảnh báo nhịp làm bài | phòng thi | `packages/exam-engine/src/pacing.ts` |
| Bôi đen chữ trong đề để tra từ (H06) | phòng thi, luyện tập | `features/corpus/hooks/use-select-lookup.ts` |
| Tra từ, chi tiết từ vựng | `/tu-vung`, `/tu-vung/[term]` | `features/corpus`, module `vocab` |
| Ngữ pháp, thống kê từ vựng trong đề | `/ngu-phap`, `/thong-ke-tu-vung` | `features/corpus` |
| Sổ tay, flashcard SRS | `/so-tay` | `features/learning`, `packages/srs` |
| Kế hoạch học | `/ke-hoach` | `features/planner` |
| Thống kê cá nhân | `/thong-ke` | `features/analytics` |
| Lịch thi JLPT tại Việt Nam, nhắc hạn đăng ký | `/lich-thi` | `apps/api/src/modules/exam/jlpt-schedule.controller.ts` |
| Tài khoản, lịch sử | `/tai-khoan`, `/lich-su` | `features/account` |
| Đăng ký, đăng nhập, xác minh email, quên mật khẩu | `/dang-ky`, `/dang-nhap`… | module `auth` |
| Lớp học, sự kiện thi, thảo luận | `/lop-hoc`, `/su-kien`, `/thao-luan` | `features/classroom`, `features/community` |
| Chia sẻ đề trộn, chia sẻ kết quả | `/chia-se/...` | module `exam` |
| Trang thông tin, FAQ, SEO theo cấp | `/gioi-thieu`, `/faq`, `/[level]`… | module `cms` |

### Quản trị (`apps/admin`)

Ngân hàng câu hỏi `/questions` · blueprint `/blueprints` · media `/media` · nhập đề `/imports` · duyệt `/reviews`, `/reviews/explanations` · đề `/exams`, `/exams/mixed` · lịch thi `/schedules` · bảng quy đổi `/scoring-tables` · người dùng `/users` · CMS `/cms` · thương mại `/commercial/*` · báo cáo `/reports/*` · thử nghiệm `/experiments` · kiểm duyệt `/moderation/*` · nhật ký `/audit-logs` · cài đặt `/settings/*` · từ điển `/lexicon` · duyệt Hán Việt `/lexicon/hanviet` · Hán Việt `/hanviet` · kanji `/kanji` · từ vựng `/vocab`.

Menu và quyền của từng mục khai báo ở `apps/admin/lib/navigation.ts`.

## 🙈 Đang ẩn (bật lại bằng cờ lúc build web)

| Tính năng | Biến | Ghi chú |
|---|---|---|
| Trang chính sách và bảo mật | `NEXT_PUBLIC_FEATURE_PRIVACY_POLICY=1` | Cần chủ dự án duyệt nội dung pháp lý |
| Đọc thành tiếng (TTS) | `NEXT_PUBLIC_FEATURE_TTS=1` | Cần nhà cung cấp TTS |
| AI giải thích đáp án | `NEXT_PUBLIC_FEATURE_AI_EXPLANATION=1` | Cần nhà cung cấp AI và ngân sách |

Cờ khai báo ở `apps/web/lib/features.ts`; chi tiết ở `docs/decisions/feature-flags-phase-1.md`. API và admin không bị ẩn.

## ⏳ Code xong, chờ dịch vụ ngoài

| Task | Chờ gì |
|---|---|
| A02 | Chính sách quyền riêng tư (pháp lý) |
| A05 | Nhà cung cấp AI, ngân sách AI |
| C02 | Cloudflare R2 |
| C06 | Cloudflare, R2, hosting |
| F03 | Google OAuth, dịch vụ email |
| L04, V04 | Cổng thanh toán, chính sách bán gói |
| L05 | Nhà cung cấp TTS |
| V05 | AI và TTS |
| N06, R06 | Hosting production |
| R03, V06 | Thử trên thiết bị thật, hosting |

Chủ dự án cung cấp tài khoản hoặc dịch vụ thì mới nghiệm thu được các task này. Agent không tự đăng ký dịch vụ trả phí.

## 🚧 Đang làm

| Việc | Trạng thái |
|---|---|
| Bộ dữ liệu kanji chuẩn (`data/kanji`, bảng `kanji_dataset`, migration 0010) | PR #127 chờ CI |
| Bộ tài liệu cho agent (`AGENTS.md`, `docs/agents/`) | Đang viết |
| Trích xuất đề N2 từ PDF thành gói nhập (ngoài repo, chạy trên máy ảo) | 3/31 đề xong |

## 📋 Dự kiến

- Trang Kanji mức 2: sửa âm Hán Việt từng chữ ngay trong database.
- Bộ chuyển đổi để coordinator giao việc cho Codex.
- Sổ tay từng bước (`docs/agent-guides/`) và các file tự sinh từ code (`*.generated.md`).
