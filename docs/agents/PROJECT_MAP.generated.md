<!-- File tự sinh bởi tools/agents/gen-project-map.mjs. Không sửa tay: chạy `pnpm docs:map`. -->

# Bản đồ dự án (tự sinh)

Sinh từ code: route web và admin, menu admin, API kèm quyền, cờ tính năng, phiên bản thư viện chính.

## Phiên bản

| Gói | Phiên bản |
|---|---|
| `pnpm` | 12.11.2 |
| `turbo` | 2.11.8 |
| `typescript` | 5.8.2 |
| `vitest` | 5.0.4 |
| `eslint` | 9.21.0 |
| `next` | 16.4.1 |
| `react` | 19.3.1 |
| `tailwindcss` | 4.1.14 |
| `@heroui/styles` | 3.2.6 |
| `@nestjs/core` | 12.1.3 |
| `fastify` | 5.12.7 |
| `drizzle-orm` | 0.45.4 |
| `@playwright/test` | 1.64.1 |

## Cờ tính năng (`apps/web/lib/features.ts`)

| Cờ | Biến lúc build |
|---|---|
| `privacyPolicyPage` | `NEXT_PUBLIC_FEATURE_PRIVACY_POLICY=1` |
| `tts` | `NEXT_PUBLIC_FEATURE_TTS=1` |
| `aiExplanation` | `NEXT_PUBLIC_FEATURE_AI_EXPLANATION=1` |

## Trang học viên (`apps/web`, 38 trang)

| Đường dẫn | Nhóm | File |
|---|---|---|
| `/` |  | `apps/web/app/page.tsx` |
| `/[level]` | seo | `apps/web/app/(seo)/[level]/page.tsx` |
| `/[level]/de-thi` | seo | `apps/web/app/(seo)/[level]/de-thi/page.tsx` |
| `/[level]/de-thi/[session]` | seo | `apps/web/app/(seo)/[level]/de-thi/[session]/page.tsx` |
| `/chia-se/de-tron/[token]` | share | `apps/web/app/(share)/chia-se/de-tron/[token]/page.tsx` |
| `/chia-se/ket-qua/[id]` | share | `apps/web/app/(share)/chia-se/ket-qua/[id]/page.tsx` |
| `/chinh-sach` | info | `apps/web/app/(info)/chinh-sach/page.tsx` |
| `/chinh-sach-bao-mat` | info | `apps/web/app/(info)/chinh-sach-bao-mat/page.tsx` |
| `/dang-ky` | auth | `apps/web/app/(auth)/dang-ky/page.tsx` |
| `/dang-nhap` | auth | `apps/web/app/(auth)/dang-nhap/page.tsx` |
| `/dat-lai-mat-khau` | auth | `apps/web/app/(auth)/dat-lai-mat-khau/page.tsx` |
| `/de-thi` | library | `apps/web/app/(library)/de-thi/page.tsx` |
| `/de-thi/[slug]` | library | `apps/web/app/(library)/de-thi/[slug]/page.tsx` |
| `/dieu-khoan` | info | `apps/web/app/(info)/dieu-khoan/page.tsx` |
| `/faq` | info | `apps/web/app/(info)/faq/page.tsx` |
| `/gioi-thieu` | info | `apps/web/app/(info)/gioi-thieu/page.tsx` |
| `/goi-thanh-vien` | billing | `apps/web/app/(billing)/goi-thanh-vien/page.tsx` |
| `/ho-tro` | info | `apps/web/app/(info)/ho-tro/page.tsx` |
| `/ke-hoach` | planner | `apps/web/app/(planner)/ke-hoach/page.tsx` |
| `/ket-qua/[id]` | results | `apps/web/app/(results)/ket-qua/[id]/page.tsx` |
| `/lich-su` | account | `apps/web/app/(account)/lich-su/page.tsx` |
| `/lich-thi` | info | `apps/web/app/(info)/lich-thi/page.tsx` |
| `/lien-he` | info | `apps/web/app/(info)/lien-he/page.tsx` |
| `/lop-hoc` | classroom | `apps/web/app/(classroom)/lop-hoc/page.tsx` |
| `/luyen-tap` | practice | `apps/web/app/(practice)/luyen-tap/page.tsx` |
| `/ngu-phap` | corpus | `apps/web/app/(corpus)/ngu-phap/page.tsx` |
| `/phong-thi` | exam | `apps/web/app/(exam)/phong-thi/page.tsx` |
| `/quen-mat-khau` | auth | `apps/web/app/(auth)/quen-mat-khau/page.tsx` |
| `/shared-exams/[token]` | share | `apps/web/app/(share)/shared-exams/[token]/page.tsx` |
| `/so-tay` | learning | `apps/web/app/(learning)/so-tay/page.tsx` |
| `/su-kien` | community | `apps/web/app/(community)/su-kien/page.tsx` |
| `/tai-khoan` | account | `apps/web/app/(account)/tai-khoan/page.tsx` |
| `/thao-luan` | community | `apps/web/app/(community)/thao-luan/page.tsx` |
| `/thong-ke` | analytics | `apps/web/app/(analytics)/thong-ke/page.tsx` |
| `/thong-ke-tu-vung` | corpus | `apps/web/app/(corpus)/thong-ke-tu-vung/page.tsx` |
| `/tu-vung` | corpus | `apps/web/app/(corpus)/tu-vung/page.tsx` |
| `/tu-vung/[term]` | corpus | `apps/web/app/(corpus)/tu-vung/[term]/page.tsx` |
| `/xac-minh-email` | auth | `apps/web/app/(auth)/xac-minh-email/page.tsx` |

## Trang quản trị (`apps/admin`, 40 trang)

Mục menu và vai trò lấy từ `apps/admin/lib/navigation.ts`.

| Đường dẫn | Menu | Vai trò | File |
|---|---|---|---|
| `/` | Bảng điều khiển | admin, editor, reviewer, moderator, billing_admin | `apps/admin/app/page.tsx` |
| `/audit-logs` | Nhật ký hệ thống | admin | `apps/admin/app/audit-logs/page.tsx` |
| `/blueprints` | Bản thiết kế đề | admin, editor | `apps/admin/app/blueprints/page.tsx` |
| `/cms` | Quản lý bài viết & CMS | admin, editor | `apps/admin/app/cms/page.tsx` |
| `/commercial/coupons` | Mã giảm giá | admin, billing_admin | `apps/admin/app/commercial/coupons/page.tsx` |
| `/commercial/payments` | Giao dịch thanh toán | admin, billing_admin | `apps/admin/app/commercial/payments/page.tsx` |
| `/commercial/plans` | Gói dịch vụ | admin, billing_admin | `apps/admin/app/commercial/plans/page.tsx` |
| `/commercial/reconciliation` | Đối soát giao dịch | admin, billing_admin | `apps/admin/app/commercial/reconciliation/page.tsx` |
| `/commercial/refunds` | Yêu cầu hoàn tiền | admin, billing_admin | `apps/admin/app/commercial/refunds/page.tsx` |
| `/commercial/subscriptions` | Thuê bao | admin, billing_admin | `apps/admin/app/commercial/subscriptions/page.tsx` |
| `/exams` | Quản lý đề thi | admin, editor, reviewer | `apps/admin/app/exams/page.tsx` |
| `/exams/mixed` | Quản lý đề trộn | admin, editor, reviewer | `apps/admin/app/exams/mixed/page.tsx` |
| `/exams/schedules` | Lịch thi JLPT | admin, editor | `apps/admin/app/exams/schedules/page.tsx` |
| `/exams/scoring` | Bảng quy đổi điểm | admin, editor | `apps/admin/app/exams/scoring/page.tsx` |
| `/experiments` | Thử nghiệm A/B | admin | `apps/admin/app/experiments/page.tsx` |
| `/hanviet` |  |  | `apps/admin/app/hanviet/page.tsx` |
| `/imports` | Gói nhập đề thi | admin, editor | `apps/admin/app/imports/page.tsx` |
| `/kanji` | Kanji | admin, editor, reviewer | `apps/admin/app/kanji/page.tsx` |
| `/lexicon` | Từ điển | admin, editor, reviewer | `apps/admin/app/lexicon/page.tsx` |
| `/lexicon/hanviet` | Duyệt Hán Việt | admin, editor, reviewer | `apps/admin/app/lexicon/hanviet/page.tsx` |
| `/login` |  |  | `apps/admin/app/login/page.tsx` |
| `/media` | Thư viện phương tiện | admin, editor | `apps/admin/app/media/page.tsx` |
| `/moderation/ai` | Kiểm duyệt AI | admin, moderator | `apps/admin/app/moderation/ai/page.tsx` |
| `/moderation/discussions` | Thảo luận & Bình luận | admin, moderator | `apps/admin/app/moderation/discussions/page.tsx` |
| `/questions` | Ngân hàng câu hỏi | admin, editor | `apps/admin/app/questions/page.tsx` |
| `/reports` | Báo cáo hệ thống (15 chỉ số) | admin, billing_admin | `apps/admin/app/reports/page.tsx` |
| `/reports/content` | Báo cáo nội dung | admin, reviewer, moderator | `apps/admin/app/reports/content/page.tsx` |
| `/reports/revenue` | Báo cáo doanh thu | admin, billing_admin | `apps/admin/app/reports/revenue/page.tsx` |
| `/reviews` | Hàng đợi kiểm duyệt | admin, reviewer | `apps/admin/app/reviews/page.tsx` |
| `/reviews/explanations` | Duyệt lời giải | admin, reviewer | `apps/admin/app/reviews/explanations/page.tsx` |
| `/schedules` |  |  | `apps/admin/app/schedules/page.tsx` |
| `/scoring-tables` |  |  | `apps/admin/app/scoring-tables/page.tsx` |
| `/settings` | Cài đặt hệ thống | admin | `apps/admin/app/settings/page.tsx` |
| `/settings/backup` | Sao lưu & Phục hồi | admin | `apps/admin/app/settings/backup/page.tsx` |
| `/settings/notifications` | Cấu hình thông báo & Email | admin | `apps/admin/app/settings/notifications/page.tsx` |
| `/settings/org` | Tổ chức & Giáo viên | admin | `apps/admin/app/settings/org/page.tsx` |
| `/setup-2fa` |  |  | `apps/admin/app/setup-2fa/page.tsx` |
| `/users` | Quản lý người dùng | admin | `apps/admin/app/users/page.tsx` |
| `/verify-2fa` |  |  | `apps/admin/app/verify-2fa/page.tsx` |
| `/vocab` | Từ vựng & Ngữ pháp | admin, editor | `apps/admin/app/vocab/page.tsx` |

## API (301 route, 26 module có controller)

Quyền: `công khai` = `@Public()`; `đăng nhập` = chỉ cần đăng nhập; còn lại là vai trò trong `@Roles`.

### admin

| Method | Đường dẫn | Quyền | Ghi chú | Hàm |
|---|---|---|---|---|
| GET | `/api/v1/admin/audit-logs` | admin |  | `getAuditLogs` |
| GET | `/api/v1/admin/jlpt-schedules` | admin, editor |  | `listJlptSchedules` |
| POST | `/api/v1/admin/jlpt-schedules` | admin |  | `createJlptSchedule` |
| DELETE | `/api/v1/admin/jlpt-schedules/:id` | admin |  | `deleteJlptSchedule` |
| GET | `/api/v1/admin/jlpt-schedules/:id` | admin, editor |  | `getJlptSchedule` |
| PATCH | `/api/v1/admin/jlpt-schedules/:id` | admin |  | `updateJlptSchedule` |
| POST | `/api/v1/admin/jlpt-schedules/:id/publish` | admin |  | `publishJlptSchedule` |
| POST | `/api/v1/admin/jlpt-schedules/:id/remind-registration` | admin |  | `remindJlptRegistration` |
| POST | `/api/v1/admin/jlpt-schedules/:id/unpublish` | admin |  | `unpublishJlptSchedule` |
| POST | `/api/v1/admin/jlpt-schedules/trigger-reminders` | admin |  | `triggerJlptReminders` |
| GET | `/api/v1/admin/moderation/ai` | admin, editor, reviewer |  | `listAiModerationLogs` |
| POST | `/api/v1/admin/moderation/ai/:id/approve` | admin, editor, reviewer |  | `approveAiModerationLog` |
| GET | `/api/v1/admin/notifications/templates` | admin |  | `listNotificationTemplates` |
| GET | `/api/v1/admin/notifications/templates/:id` | admin |  | `getNotificationTemplate` |
| PATCH | `/api/v1/admin/notifications/templates/:id` | admin |  | `updateNotificationTemplate` |
| POST | `/api/v1/admin/notifications/test-send` | admin |  | `testSendNotification` |
| GET | `/api/v1/admin/organizations` | admin, editor |  | `listOrganizations` |
| GET | `/api/v1/admin/teacher-applications` | admin |  | `listTeacherApplications` |
| POST | `/api/v1/admin/teacher-applications/:id/approve` | admin |  | `approveTeacherApplication` |
| POST | `/api/v1/admin/teacher-applications/:id/reject` | admin |  | `rejectTeacherApplication` |
| GET | `/api/v1/admin/users` | admin |  | `listUsers` |
| GET | `/api/v1/admin/users/:id` | admin |  | `getUserById` |
| PATCH | `/api/v1/admin/users/:id` | admin |  | `updateUser` |
| GET | `/api/v1/admin/vocab` | admin, editor |  | `listVocab` |
| POST | `/api/v1/admin/vocab` | admin, editor |  | `createVocab` |
| DELETE | `/api/v1/admin/vocab/:id` | admin, editor |  | `deleteVocab` |

### ai

| Method | Đường dẫn | Quyền | Ghi chú | Hàm |
|---|---|---|---|---|
| POST | `/api/v1/admin/ai-content/:id/reviews` | admin, reviewer |  | `reviewAiContent` |
| GET | `/api/v1/ai/generated-questions/:id/practice` | đăng nhập |  | `getGeneratedQuestionForPractice` |
| POST | `/api/v1/ai/generated-questions/:id/submit` | đăng nhập |  | `submitGeneratedQuestion` |
| POST | `/api/v1/ai/requests` | đăng nhập |  | `createRequest` |
| GET | `/api/v1/ai/requests/:id` | đăng nhập |  | `getRequest` |
| GET | `/api/v1/me/ai-usage` | đăng nhập |  | `getMyUsage` |

### attempt

| Method | Đường dẫn | Quyền | Ghi chú | Hàm |
|---|---|---|---|---|
| POST | `/api/v1/attempts` | đăng nhập | giới hạn tần suất, khách | `createAttempt` |
| GET | `/api/v1/attempts/:id` | đăng nhập | khách | `getAttemptDetail` |
| POST | `/api/v1/attempts/:id/check` | đăng nhập | khách | `checkAnswer` |
| POST | `/api/v1/attempts/:id/media-token` | đăng nhập | khách | `getMediaToken` |
| POST | `/api/v1/attempts/:id/resume` | đăng nhập | khách | `resumeAttempt` |
| GET | `/api/v1/attempts/:id/review` | đăng nhập | khách | `reviewAttempt` |
| POST | `/api/v1/attempts/:id/sections/next` | đăng nhập | khách | `nextSection` |
| PUT | `/api/v1/attempts/:id/sheet` | đăng nhập | khách | `updateSheet` |
| POST | `/api/v1/attempts/:id/submit` | đăng nhập | khách | `submitAttempt` |
| POST | `/api/v1/auth/attach-guest` | đăng nhập |  | `attachGuest` |
| GET | `/api/v1/me/attempts` | đăng nhập |  | `listMyAttempts` |

### auth

| Method | Đường dẫn | Quyền | Ghi chú | Hàm |
|---|---|---|---|---|
| POST | `/api/v1/auth/2fa/challenge` | đăng nhập |  | `challenge2faAlias` |
| POST | `/api/v1/auth/2fa/confirm` | đăng nhập |  | `confirm2faAlias` |
| POST | `/api/v1/auth/2fa/disable` | đăng nhập |  | `disable2faAlias` |
| POST | `/api/v1/auth/2fa/recovery` | đăng nhập |  | `recovery2faAlias` |
| POST | `/api/v1/auth/2fa/setup` | đăng nhập |  | `setup2faAlias` |
| POST | `/api/v1/auth/forgot-password` | công khai |  | `forgotPassword` |
| GET | `/api/v1/auth/google` | công khai |  | `googleOAuth` |
| GET | `/api/v1/auth/google/callback` | công khai |  | `googleOAuthCallback` |
| POST | `/api/v1/auth/reset-password` | công khai |  | `resetPassword` |
| GET | `/api/v1/auth/session` | công khai |  | `getSession` |
| POST | `/api/v1/auth/sign-in/email` | công khai |  | `signIn` |
| POST | `/api/v1/auth/sign-out` | công khai |  | `signOut` |
| POST | `/api/v1/auth/sign-up/email` | công khai |  | `signUp` |
| POST | `/api/v1/auth/totp/challenge` | đăng nhập |  | `challengeTotp` |
| POST | `/api/v1/auth/totp/confirm` | đăng nhập |  | `confirmTotp` |
| POST | `/api/v1/auth/totp/disable` | đăng nhập |  | `disableTotp` |
| POST | `/api/v1/auth/totp/recovery` | đăng nhập |  | `recoveryTotp` |
| POST | `/api/v1/auth/totp/setup` | đăng nhập |  | `setupTotp` |
| GET | `/api/v1/auth/verify-email` | công khai |  | `verifyEmail` |

### blueprint

| Method | Đường dẫn | Quyền | Ghi chú | Hàm |
|---|---|---|---|---|
| GET | `/api/v1/admin/blueprints` | admin, editor |  | `listBlueprints` |
| POST | `/api/v1/admin/blueprints` | admin, editor |  | `createBlueprint` |
| GET | `/api/v1/admin/blueprints/:id` | admin, editor |  | `getBlueprint` |
| POST | `/api/v1/admin/blueprints/:id/activate` | admin |  | `activateBlueprint` |
| POST | `/api/v1/admin/blueprints/:id/versions` | admin, editor |  | `createBlueprintVersion` |

### classroom

| Method | Đường dẫn | Quyền | Ghi chú | Hàm |
|---|---|---|---|---|
| GET | `/api/v1/assignments/:id` | đăng nhập |  | `getAssignment` |
| GET | `/api/v1/assignments/:id/analytics` | đăng nhập |  | `getAssignmentAnalytics` |
| GET | `/api/v1/assignments/:id/submissions` | đăng nhập |  | `listAssignmentSubmissions` |
| POST | `/api/v1/assignments/:id/supplements` | đăng nhập |  | `createSupplementAssignment` |
| POST | `/api/v1/class-invitations/:token/join` | đăng nhập |  | `joinClassByInvitation` |
| POST | `/api/v1/classes/:id/assignments` | đăng nhập |  | `createClassAssignment` |
| POST | `/api/v1/classes/:id/grade-exports` | đăng nhập |  | `exportClassGrades` |
| POST | `/api/v1/classes/:id/invitations` | đăng nhập |  | `createClassInvitation` |
| GET | `/api/v1/classes/:id/members` | đăng nhập |  | `listClassMembers` |
| DELETE | `/api/v1/classes/:id/members/:userId` | đăng nhập |  | `removeClassMember` |
| GET | `/api/v1/exam-events` | công khai |  | `listExamEvents` |
| POST | `/api/v1/exam-events` | đăng nhập |  | `createExamEvent` |
| GET | `/api/v1/exam-events/:id` | công khai |  | `getExamEvent` |
| POST | `/api/v1/exam-events/:id/attempts` | đăng nhập |  | `startExamEventAttempt` |
| GET | `/api/v1/exam-events/:id/lobby` | đăng nhập |  | `getExamEventLobby` |
| POST | `/api/v1/exam-events/:id/register` | đăng nhập |  | `registerExamEvent` |
| GET | `/api/v1/exam-events/:id/results` | công khai |  | `getExamEventResults` |
| GET | `/api/v1/organizations` | đăng nhập |  | `listOrganizations` |
| POST | `/api/v1/organizations` | đăng nhập |  | `createOrganization` |
| GET | `/api/v1/organizations/:id` | đăng nhập |  | `getOrganization` |
| PATCH | `/api/v1/organizations/:id` | đăng nhập |  | `updateOrganization` |
| GET | `/api/v1/organizations/:id/classes` | đăng nhập |  | `listOrganizationClasses` |
| POST | `/api/v1/organizations/:id/classes` | đăng nhập |  | `createClass` |
| POST | `/api/v1/teacher-applications` | đăng nhập |  | `submitTeacherApplication` |
| POST | `/api/v1/teacher-applications/:id/approve` | đăng nhập |  | `approveTeacherApplication` |

### cms

| Method | Đường dẫn | Quyền | Ghi chú | Hàm |
|---|---|---|---|---|
| GET | `/api/v1/cms/articles` | đăng nhập |  | `listArticles` |
| POST | `/api/v1/cms/articles` | admin, editor |  | `createArticle` |
| PUT | `/api/v1/cms/articles/:id` | admin, editor |  | `updateArticle` |
| GET | `/api/v1/cms/articles/:slug` | đăng nhập |  | `getArticleBySlug` |
| GET | `/api/v1/cms/faqs` | đăng nhập |  | `listFaqs` |
| POST | `/api/v1/cms/faqs` | admin, editor |  | `createFaq` |
| POST | `/api/v1/cms/landing` | admin, editor |  | `upsertLandingPage` |
| GET | `/api/v1/cms/landing/:slug` | đăng nhập |  | `getLandingPage` |
| POST | `/api/v1/cms/sanitize` | đăng nhập |  | `sanitizePreview` |

### community

| Method | Đường dẫn | Quyền | Ghi chú | Hàm |
|---|---|---|---|---|
| GET | `/api/v1/admin/community-reports` | admin, moderator |  | `adminListCommunityReports` |
| PATCH | `/api/v1/admin/community-reports/:id` | admin, moderator |  | `adminResolveCommunityReport` |
| DELETE | `/api/v1/comments/:id` | đăng nhập |  | `deleteComment` |
| POST | `/api/v1/comments/:id/reports` | đăng nhập |  | `reportComment` |
| POST | `/api/v1/me/achievement-shares` | đăng nhập |  | `shareAchievement` |
| GET | `/api/v1/questions/:id/discussions` | đăng nhập |  | `listQuestionDiscussions` |
| POST | `/api/v1/questions/:id/discussions` | đăng nhập |  | `postQuestionComment` |
| GET | `/api/v1/questions/discussions` | đăng nhập |  | `listDiscussableQuestions` |

### entitlement

| Method | Đường dẫn | Quyền | Ghi chú | Hàm |
|---|---|---|---|---|
| GET | `/api/v1/admin/tenants/:id/plan` | admin, billing_admin |  | `getTenantPlan` |
| POST | `/api/v1/admin/tenants/:id/plan` | admin, billing_admin |  | `updateTenantPlan` |
| POST | `/api/v1/ai/quota/refund` | đăng nhập |  | `refundAIQuota` |
| POST | `/api/v1/ai/quota/reserve` | đăng nhập |  | `reserveAIQuota` |
| POST | `/api/v1/ai/quota/settle` | đăng nhập |  | `settleAIQuota` |
| GET | `/api/v1/me/entitlements` | đăng nhập |  | `getUserEntitlements` |

### exam

| Method | Đường dẫn | Quyền | Ghi chú | Hàm |
|---|---|---|---|---|
| GET | `/api/v1/admin/exams` | admin, editor, reviewer |  | `listAdminExams` |
| POST | `/api/v1/admin/exams` | admin, editor |  | `createAdminExam` |
| GET | `/api/v1/admin/exams/:id` | admin, editor, reviewer |  | `getAdminExam` |
| PATCH | `/api/v1/admin/exams/:id` | admin, editor |  | `updateAdminExam` |
| POST | `/api/v1/admin/exams/:id/approve-and-publish` | admin |  | `approveAndPublishExam` |
| POST | `/api/v1/admin/exams/:id/delete` | admin |  | `deleteExam` |
| GET | `/api/v1/admin/exams/:id/preview` | admin, editor, reviewer |  | `getAdminExamPreview` |
| POST | `/api/v1/admin/exams/:id/publish` | admin |  | `publishExam` |
| POST | `/api/v1/admin/exams/:id/unpublish` | admin |  | `unpublishExam` |
| POST | `/api/v1/admin/exams/:id/validate` | admin, editor |  | `validateAdminExam` |
| GET | `/api/v1/exams` | công khai |  | `listExams` |
| GET | `/api/v1/exams/:id/v:version/snapshot.json` | công khai |  | `getExamSnapshot` |
| GET | `/api/v1/exams/:slug` | công khai |  | `getExamBySlug` |
| GET | `/api/v1/generated-exams` | đăng nhập |  | `listGeneratedExams` |
| GET | `/api/v1/generated-exams/:id` | đăng nhập |  | `getGeneratedExam` |
| POST | `/api/v1/generated-exams/:id/regenerate` | đăng nhập |  | `regenerateExam` |
| POST | `/api/v1/generated-exams/:id/shares` | đăng nhập |  | `shareExam` |
| GET | `/api/v1/jlpt-schedules` | công khai |  | `listPublicSchedules` |
| GET | `/api/v1/jlpt-schedules/:id` | công khai |  | `getPublicSchedule` |
| GET | `/api/v1/me/exam-status` | đăng nhập |  | `getMyExamStatus` |
| GET | `/api/v1/me/favorite-exams` | đăng nhập |  | `listFavoriteExams` |
| DELETE | `/api/v1/me/favorite-exams/:id` | đăng nhập |  | `unfavoriteExam` |
| PUT | `/api/v1/me/favorite-exams/:id` | đăng nhập |  | `favoriteExam` |
| GET | `/api/v1/me/practice-sessions/in-progress` | đăng nhập |  | `getInProgressPractice` |
| GET | `/api/v1/me/question-marks` | đăng nhập |  | `listMarkedQuestions` |
| DELETE | `/api/v1/me/question-marks/:id` | đăng nhập |  | `unmarkQuestion` |
| PUT | `/api/v1/me/question-marks/:id` | đăng nhập |  | `markQuestion` |
| POST | `/api/v1/mixed-exams` | đăng nhập |  | `createMixedExam` |
| POST | `/api/v1/mixed-exams/quick` | đăng nhập |  | `createQuickMixedExam` |
| POST | `/api/v1/practice-exams` | đăng nhập |  | `createPracticeExam` |
| GET | `/api/v1/shared-exams/:token` | công khai |  | `getSharedExam` |

### experiment

| Method | Đường dẫn | Quyền | Ghi chú | Hàm |
|---|---|---|---|---|
| GET | `/api/v1/experiments` | admin |  | `listExperiments` |
| POST | `/api/v1/experiments` | admin |  | `createExperiment` |
| POST | `/api/v1/experiments/:id/assign` | đăng nhập |  | `assignVariant` |
| GET | `/api/v1/experiments/:id/evaluate` | admin |  | `evaluateExperiment` |
| PATCH | `/api/v1/experiments/:id/toggle` | admin |  | `toggleExperiment` |
| POST | `/api/v1/experiments/:id/toggle` | admin |  | `toggleExperimentPost` |
| POST | `/api/v1/experiments/events` | đăng nhập |  | `trackEvent` |
| POST | `/api/v1/experiments/exposure` | đăng nhập |  | `trackExposure` |

### gamification

| Method | Đường dẫn | Quyền | Ghi chú | Hàm |
|---|---|---|---|---|
| GET | `/api/v1/challenges` | đăng nhập |  | `listChallenges` |
| POST | `/api/v1/challenges/:id/join` | đăng nhập |  | `joinChallenge` |
| GET | `/api/v1/classes/:id/gamification-stats` | đăng nhập |  | `getClassStats` |
| GET | `/api/v1/leaderboards` | công khai |  | `getLeaderboard` |
| POST | `/api/v1/me/achievement-shares` | đăng nhập |  | `shareAchievement` |
| GET | `/api/v1/me/achievements` | đăng nhập |  | `getMyAchievements` |
| PATCH | `/api/v1/me/leaderboard-opt-in` | đăng nhập |  | `updateOptIn` |
| GET | `/api/v1/me/streak` | đăng nhập |  | `getMyStreak` |
| POST | `/api/v1/me/streak/activity` | đăng nhập |  | `recordActivity` |

### health

| Method | Đường dẫn | Quyền | Ghi chú | Hàm |
|---|---|---|---|---|
| GET | `/api/v1/health` | đăng nhập |  | `getHealth` |

### import

| Method | Đường dẫn | Quyền | Ghi chú | Hàm |
|---|---|---|---|---|
| GET | `/api/v1/admin/imports` | admin, editor, reviewer |  | `listJobs` |
| POST | `/api/v1/admin/imports` | admin, editor, reviewer |  | `uploadPackage` |
| GET | `/api/v1/admin/imports/:id` | admin, editor, reviewer |  | `getJob` |

### learning

| Method | Đường dẫn | Quyền | Ghi chú | Hàm |
|---|---|---|---|---|
| GET | `/api/v1/me/dataset-gaps` | đăng nhập |  | `getDatasetGaps` |
| POST | `/api/v1/me/notebook-exports` | đăng nhập |  | `exportNotebook` |
| GET | `/api/v1/me/notebook-items` | đăng nhập |  | `listNotebookItems` |
| POST | `/api/v1/me/notebook-items` | đăng nhập |  | `createNotebookItem` |
| DELETE | `/api/v1/me/notebook-items/:id` | đăng nhập |  | `deleteNotebookItem` |
| GET | `/api/v1/me/notebook-items/:id` | đăng nhập |  | `getNotebookItem` |
| PATCH | `/api/v1/me/notebook-items/:id` | đăng nhập |  | `updateNotebookItem` |
| POST | `/api/v1/me/notebook-items/:id/cards` | đăng nhập |  | `generateCards` |
| GET | `/api/v1/me/notebook-items/:id/question-examples` | đăng nhập |  | `getQuestionExamples` |
| POST | `/api/v1/me/notebook-quizzes` | đăng nhập |  | `createNotebookQuiz` |
| GET | `/api/v1/me/srs/due` | đăng nhập |  | `getDueCards` |
| POST | `/api/v1/me/srs/reviews` | đăng nhập |  | `submitReview` |
| POST | `/api/v1/tts` | đăng nhập |  | `synthesizePronunciation` |
| GET | `/api/v1/tts/license` | đăng nhập |  | `getTtsLicense` |

### license

| Method | Đường dẫn | Quyền | Ghi chú | Hàm |
|---|---|---|---|---|
| GET | `/api/v1/admin/licenses` | đăng nhập |  | `listLicenses` |
| POST | `/api/v1/admin/licenses` | đăng nhập |  | `createLicense` |
| DELETE | `/api/v1/admin/licenses/:id` | đăng nhập |  | `deleteLicense` |
| GET | `/api/v1/admin/licenses/:id` | đăng nhập |  | `getLicense` |
| PATCH | `/api/v1/admin/licenses/:id` | đăng nhập |  | `updateLicense` |
| POST | `/api/v1/admin/licenses/:id/takedown` | admin |  | `takedownLicense` |
| GET | `/api/v1/admin/sources` | đăng nhập |  | `listSources` |
| POST | `/api/v1/admin/sources` | đăng nhập |  | `createSource` |
| DELETE | `/api/v1/admin/sources/:id` | đăng nhập |  | `deleteSource` |
| GET | `/api/v1/admin/sources/:id` | đăng nhập |  | `getSource` |
| PATCH | `/api/v1/admin/sources/:id` | đăng nhập |  | `updateSource` |

### media

| Method | Đường dẫn | Quyền | Ghi chú | Hàm |
|---|---|---|---|---|
| GET | `/api/v1/admin/media` | admin, editor, reviewer |  | `listMedia` |
| POST | `/api/v1/admin/media` | admin, editor, reviewer |  | `uploadMedia` |
| GET | `/api/v1/media/:id` | công khai |  | `getMedia` |
| GET | `/api/v1/media/by-sha/:sha256` | công khai |  | `getMediaBySha256` |

### notification

| Method | Đường dẫn | Quyền | Ghi chú | Hàm |
|---|---|---|---|---|
| GET | `/api/v1/me/notification-preferences` | đăng nhập |  | `getPreferences` |
| PATCH | `/api/v1/me/notification-preferences` | đăng nhập |  | `updatePreferences` |

### payment

| Method | Đường dẫn | Quyền | Ghi chú | Hàm |
|---|---|---|---|---|
| GET | `/api/v1/admin/coupons` | admin, billing_admin |  | `adminListCoupons` |
| POST | `/api/v1/admin/coupons` | admin, billing_admin |  | `adminCreateCoupon` |
| GET | `/api/v1/admin/payment/readiness` | admin, billing_admin |  | `getPaymentReadiness` |
| GET | `/api/v1/admin/payments` | admin, billing_admin |  | `adminListPayments` |
| GET | `/api/v1/admin/plans` | admin, billing_admin |  | `adminListPlans` |
| POST | `/api/v1/admin/plans` | admin, billing_admin |  | `adminCreatePlan` |
| POST | `/api/v1/admin/reconciliation/run` | admin, billing_admin |  | `runReconciliation` |
| GET | `/api/v1/admin/reconciliation/runs` | admin, billing_admin |  | `listReconciliationRuns` |
| GET | `/api/v1/admin/reconciliation/runs/:id` | admin, billing_admin |  | `getReconciliationRun` |
| GET | `/api/v1/admin/refunds` | admin, billing_admin |  | `adminListRefunds` |
| POST | `/api/v1/admin/refunds/:id/approve` | admin, billing_admin |  | `adminApproveRefund` |
| POST | `/api/v1/admin/refunds/:id/reject` | admin, billing_admin |  | `adminRejectRefund` |
| GET | `/api/v1/admin/reports/revenue` | admin, billing_admin |  | `adminGetRevenueReport` |
| GET | `/api/v1/admin/subscriptions` | admin, billing_admin |  | `adminListSubscriptions` |
| POST | `/api/v1/checkout-sessions` | đăng nhập |  | `createCheckoutSession` |
| POST | `/api/v1/me/refund-requests` | đăng nhập |  | `requestRefund` |
| GET | `/api/v1/me/subscription` | đăng nhập |  | `getUserSubscription` |
| POST | `/api/v1/me/subscription/cancel` | đăng nhập |  | `cancelSubscription` |
| POST | `/api/v1/me/subscription/change` | đăng nhập |  | `changeSubscriptionPlan` |
| POST | `/api/v1/me/subscription/renew` | đăng nhập |  | `renewSubscription` |
| GET | `/api/v1/me/transactions` | đăng nhập |  | `listUserTransactions` |
| GET | `/api/v1/plans` | công khai |  | `listPlans` |
| POST | `/api/v1/webhooks/payment/:provider` | công khai |  | `handlePaymentWebhook` |

### planner

| Method | Đường dẫn | Quyền | Ghi chú | Hàm |
|---|---|---|---|---|
| POST | `/api/v1/me/study-plans` | đăng nhập |  | `createStudyPlan` |
| GET | `/api/v1/me/study-plans/:id` | đăng nhập |  | `getStudyPlan` |
| GET | `/api/v1/me/study-plans/:id/reminders` | đăng nhập |  | `getPlanReminders` |
| POST | `/api/v1/me/study-plans/:id/replan` | đăng nhập |  | `replanStudyPlan` |
| PUT | `/api/v1/me/study-sessions/:id/completion` | đăng nhập |  | `completeStudySession` |
| GET | `/api/v1/me/study-sessions/today` | đăng nhập |  | `getTodaySessions` |

### question-bank

| Method | Đường dẫn | Quyền | Ghi chú | Hàm |
|---|---|---|---|---|
| GET | `/api/v1/admin/groups` | admin, editor, reviewer |  | `listGroups` |
| POST | `/api/v1/admin/groups` | admin, editor |  | `createGroup` |
| DELETE | `/api/v1/admin/groups/:id` | admin, editor |  | `deleteGroup` |
| GET | `/api/v1/admin/groups/:id` | admin, editor, reviewer |  | `getGroup` |
| PATCH | `/api/v1/admin/groups/:id` | admin, editor |  | `updateGroup` |
| POST | `/api/v1/admin/groups/:id/hide` | admin, reviewer |  | `hideGroup` |
| POST | `/api/v1/admin/groups/:id/reviews` | admin, reviewer |  | `reviewGroup` |
| POST | `/api/v1/admin/groups/:id/submit-review` | admin, editor |  | `submitForReview` |
| GET | `/api/v1/admin/groups/:id/versions` | admin, editor, reviewer |  | `listGroupVersions` |
| GET | `/api/v1/admin/questions` | admin, editor, reviewer |  | `searchQuestions` |
| GET | `/api/v1/admin/questions/:id/exam-usage` | admin, editor, reviewer |  | `getQuestionExamUsage` |
| GET | `/api/v1/groups/:id/preview` | công khai |  | `getPublicPreview` |

### reporting

| Method | Đường dẫn | Quyền | Ghi chú | Hàm |
|---|---|---|---|---|
| GET | `/api/v1/admin/dashboard` | admin, editor, reviewer, moderator, billing_admin |  | `getDashboard` |
| GET | `/api/v1/admin/reports/:kind` | admin, editor, reviewer, moderator, billing_admin |  | `getReport` |
| GET | `/api/v1/admin/reports/:kind/export` | admin, billing_admin |  | `exportReport` |
| GET | `/api/v1/admin/settings/backup/jobs` | admin |  | `getBackupJobs` |
| POST | `/api/v1/admin/settings/backup/jobs` | admin |  | `triggerBackupJob` |

### review

| Method | Đường dẫn | Quyền | Ghi chú | Hàm |
|---|---|---|---|---|
| GET | `/api/v1/admin/content-reports` | admin, reviewer, editor |  | `listReports` |
| PATCH | `/api/v1/admin/content-reports/:id` | admin, reviewer, editor |  | `updateReport` |
| GET | `/api/v1/admin/explanations` | admin, editor, reviewer |  | `listExplanations` |
| POST | `/api/v1/admin/explanations` | admin, editor |  | `createExplanation` |
| GET | `/api/v1/admin/explanations/:id` | admin, editor, reviewer |  | `getExplanation` |
| PATCH | `/api/v1/admin/explanations/:id` | admin, editor |  | `updateExplanation` |
| POST | `/api/v1/admin/explanations/:id/reviews` | admin, reviewer, editor |  | `reviewExplanation` |
| GET | `/api/v1/admin/reviews` | admin, reviewer |  | `listReviews` |
| POST | `/api/v1/admin/reviews/:targetType/:targetId/v:version/decision` | admin, editor, reviewer |  | `reviewDecision` |
| POST | `/api/v1/admin/reviews/submit` | admin, editor, reviewer |  | `submitForReview` |
| GET | `/api/v1/attempts/:id/explanations/:index` | đăng nhập | khách | `getAttemptExplanation` |
| POST | `/api/v1/content-reports` | đăng nhập |  | `createReport` |

### stats

| Method | Đường dẫn | Quyền | Ghi chú | Hàm |
|---|---|---|---|---|
| GET | `/api/v1/me/analytics` | đăng nhập |  | `getAnalytics` |
| GET | `/api/v1/me/readiness` | đăng nhập |  | `getReadiness` |
| GET | `/api/v1/questions/:id/difficulty-stats` | đăng nhập |  | `getQuestionDifficulty` |

### user

| Method | Đường dẫn | Quyền | Ghi chú | Hàm |
|---|---|---|---|---|
| GET | `/api/v1/me` | đăng nhập |  | `getProfile` |
| PATCH | `/api/v1/me` | đăng nhập |  | `updateProfile` |
| GET | `/api/v1/me/analytics` | đăng nhập |  | `getUserAnalytics` |
| DELETE | `/api/v1/me/avatar` | đăng nhập |  | `deleteAvatar` |
| POST | `/api/v1/me/avatar` | đăng nhập |  | `uploadAvatar` |
| GET | `/api/v1/me/consents` | đăng nhập |  | `getUserConsents` |
| PATCH | `/api/v1/me/consents` | đăng nhập |  | `updateUserConsents` |
| POST | `/api/v1/me/data-exports` | đăng nhập |  | `requestDataExport` |
| GET | `/api/v1/me/deletion-request` | đăng nhập |  | `getDeletionRequestStatus` |
| POST | `/api/v1/me/deletion-request` | đăng nhập |  | `createDeletionRequest` |
| DELETE | `/api/v1/me/sessions` | đăng nhập |  | `revokeAllOtherSessions` |
| GET | `/api/v1/me/sessions` | đăng nhập |  | `getSessions` |
| DELETE | `/api/v1/me/sessions/:id` | đăng nhập |  | `revokeSession` |

### vocab

| Method | Đường dẫn | Quyền | Ghi chú | Hàm |
|---|---|---|---|---|
| PATCH | `/api/v1/admin/lexicon/:id/hanviet` | admin, editor, reviewer |  | `adminUpdateHanViet` |
| GET | `/api/v1/admin/lexicon/entries` | admin, editor, reviewer |  | `adminListLexicon` |
| GET | `/api/v1/admin/lexicon/hanviet` | admin, editor, reviewer |  | `adminListHanViet` |
| GET | `/api/v1/admin/lexicon/kanji` | admin, editor, reviewer |  | `adminListKanji` |
| PATCH | `/api/v1/admin/lexicon/kanji/:kanji/hanviet` | admin, editor |  | `adminUpdateKanjiHanViet` |
| POST | `/api/v1/admin/lexicon/kanji/:kanji/hanviet/reset` | admin, editor |  | `adminResetKanjiHanViet` |
| GET | `/api/v1/datasets` | công khai |  | `listDatasets` |
| GET | `/api/v1/datasets/:id` | công khai |  | `getDataset` |
| POST | `/api/v1/datasets/:id/add-to-notebook` | đăng nhập |  | `addToNotebook` |
| GET | `/api/v1/datasets/:id/compare-with-learned` | đăng nhập |  | `compareWithLearned` |
| GET | `/api/v1/datasets/:id/compare/levels` | công khai |  | `compareLevels` |
| GET | `/api/v1/datasets/:id/export` | công khai |  | `exportDatasetGet` |
| POST | `/api/v1/datasets/:id/exports` | công khai |  | `exportDatasetPost` |
| GET | `/api/v1/datasets/:id/grammar` | công khai |  | `getDatasetGrammar` |
| GET | `/api/v1/datasets/:id/grammar/:patternId/practice` | công khai |  | `getGrammarPractice` |
| GET | `/api/v1/datasets/:id/kanji` | công khai |  | `getDatasetKanji` |
| GET | `/api/v1/datasets/:id/recommendations` | đăng nhập |  | `getRecommendations` |
| GET | `/api/v1/datasets/:id/study-lists` | công khai |  | `getStudyList` |
| POST | `/api/v1/datasets/:id/study-lists` | đăng nhập |  | `createStudyList` |
| GET | `/api/v1/datasets/:id/time-series` | công khai |  | `getTimeSeries` |
| GET | `/api/v1/datasets/:id/trends` | công khai |  | `getYearlyTrends` |
| GET | `/api/v1/datasets/:id/vocabulary` | công khai |  | `getDatasetVocabulary` |
| GET | `/api/v1/datasets/:id/vocabulary/:term/questions` | công khai |  | `getQuestionsForWord` |
| GET | `/api/v1/datasets/:id/vocabulary/:term/stats` | công khai |  | `getWordStatistics` |
| GET | `/api/v1/dictionary/entries/:term` | công khai | giới hạn tần suất | `getEntryDetails` |
| GET | `/api/v1/dictionary/hanviet` | công khai |  | `getHanViet` |
| POST | `/api/v1/dictionary/hanviet-reports` | đăng nhập | giới hạn tần suất | `reportHanViet` |
| GET | `/api/v1/dictionary/lookup` | công khai | giới hạn tần suất | `lookupDictionary` |
| POST | `/api/v1/vocab/tag-question` | đăng nhập |  | `tagQuestion` |
