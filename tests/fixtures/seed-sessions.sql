-- Seed users for E2E and Security verification (N06)
INSERT INTO users (id, email, name, role, email_verified, locale, timezone)
VALUES
  ('0192f000-0000-7000-8000-0000000000b1', 'publisher@jlpt.local', 'Demo Publisher Admin', 'admin', true, 'vi', 'Asia/Ho_Chi_Minh'),
  ('0192f000-0000-7000-8000-0000000000b2', 'billing.admin@jlpt.local', 'Demo Billing Admin', 'billing_admin', true, 'vi', 'Asia/Ho_Chi_Minh'),
  ('0192f000-0000-7000-8000-0000000000e1', 'editor@jlpt.local', 'Demo Editor', 'editor', true, 'vi', 'Asia/Ho_Chi_Minh'),
  ('0192f000-0000-7000-8000-0000000000d1', 'reviewer@jlpt.local', 'Demo Reviewer', 'reviewer', true, 'vi', 'Asia/Ho_Chi_Minh'),
  ('0192f000-0000-7000-8000-0000000000c1', 'student.verified@jlpt.local', 'Verified Student', 'student', true, 'vi', 'Asia/Ho_Chi_Minh'),
  ('0192f000-0000-7000-8000-0000000000c2', 'student.unverified@jlpt.local', 'Unverified Student', 'student', false, 'vi', 'Asia/Ho_Chi_Minh'),
  ('0192f000-0000-7000-8000-0000000000c3', 'student.other@jlpt.local', 'Other Student', 'student', true, 'vi', 'Asia/Ho_Chi_Minh'),
  ('0192f000-0000-7000-8000-0000000000e5', 'student.iphone@jlpt.local', 'iPhone Student', 'student', true, 'vi', 'Asia/Ho_Chi_Minh'),
  ('0192f000-0000-7000-8000-0000000000e6', 'student.pixel@jlpt.local', 'Pixel Student', 'student', true, 'vi', 'Asia/Ho_Chi_Minh'),
  ('0192f000-0000-7000-8000-0000000000e7', 'student.macbook@jlpt.local', 'MacBook Student', 'student', true, 'vi', 'Asia/Ho_Chi_Minh'),
  ('0192f000-0000-7000-8000-0000000000e8', 'student.windows@jlpt.local', 'Windows Student', 'student', true, 'vi', 'Asia/Ho_Chi_Minh'),
  ('0192f000-0000-7000-8000-0000000000e9', 'student.ubuntu@jlpt.local', 'Ubuntu Student', 'student', true, 'vi', 'Asia/Ho_Chi_Minh'),
  ('0192f000-0000-7000-8000-000000000100', 'student.load0@jlpt.local', 'Load Student 0', 'student', true, 'vi', 'Asia/Ho_Chi_Minh'),
  ('0192f000-0000-7000-8000-000000000101', 'student.load1@jlpt.local', 'Load Student 1', 'student', true, 'vi', 'Asia/Ho_Chi_Minh'),
  ('0192f000-0000-7000-8000-000000000102', 'student.load2@jlpt.local', 'Load Student 2', 'student', true, 'vi', 'Asia/Ho_Chi_Minh'),
  ('0192f000-0000-7000-8000-000000000103', 'student.load3@jlpt.local', 'Load Student 3', 'student', true, 'vi', 'Asia/Ho_Chi_Minh'),
  ('0192f000-0000-7000-8000-000000000104', 'student.load4@jlpt.local', 'Load Student 4', 'student', true, 'vi', 'Asia/Ho_Chi_Minh'),
  ('0192f000-0000-7000-8000-000000000105', 'student.load5@jlpt.local', 'Load Student 5', 'student', true, 'vi', 'Asia/Ho_Chi_Minh'),
  ('0192f000-0000-7000-8000-000000000106', 'student.load6@jlpt.local', 'Load Student 6', 'student', true, 'vi', 'Asia/Ho_Chi_Minh'),
  ('0192f000-0000-7000-8000-000000000107', 'student.load7@jlpt.local', 'Load Student 7', 'student', true, 'vi', 'Asia/Ho_Chi_Minh'),
  ('0192f000-0000-7000-8000-000000000108', 'student.load8@jlpt.local', 'Load Student 8', 'student', true, 'vi', 'Asia/Ho_Chi_Minh'),
  ('0192f000-0000-7000-8000-000000000109', 'student.load9@jlpt.local', 'Load Student 9', 'student', true, 'vi', 'Asia/Ho_Chi_Minh'),
  ('0192f000-0000-7000-8000-00000000010a', 'student.load10@jlpt.local', 'Load Student 10', 'student', true, 'vi', 'Asia/Ho_Chi_Minh'),
  ('0192f000-0000-7000-8000-00000000010b', 'student.load11@jlpt.local', 'Load Student 11', 'student', true, 'vi', 'Asia/Ho_Chi_Minh'),
  ('0192f000-0000-7000-8000-00000000010c', 'student.load12@jlpt.local', 'Load Student 12', 'student', true, 'vi', 'Asia/Ho_Chi_Minh'),
  ('0192f000-0000-7000-8000-00000000010d', 'student.load13@jlpt.local', 'Load Student 13', 'student', true, 'vi', 'Asia/Ho_Chi_Minh'),
  ('0192f000-0000-7000-8000-00000000010e', 'student.load14@jlpt.local', 'Load Student 14', 'student', true, 'vi', 'Asia/Ho_Chi_Minh'),
  ('0192f000-0000-7000-8000-00000000010f', 'student.load15@jlpt.local', 'Load Student 15', 'student', true, 'vi', 'Asia/Ho_Chi_Minh'),
  ('0192f000-0000-7000-8000-000000000110', 'student.load16@jlpt.local', 'Load Student 16', 'student', true, 'vi', 'Asia/Ho_Chi_Minh'),
  ('0192f000-0000-7000-8000-000000000111', 'student.load17@jlpt.local', 'Load Student 17', 'student', true, 'vi', 'Asia/Ho_Chi_Minh'),
  ('0192f000-0000-7000-8000-000000000112', 'student.load18@jlpt.local', 'Load Student 18', 'student', true, 'vi', 'Asia/Ho_Chi_Minh'),
  ('0192f000-0000-7000-8000-000000000113', 'student.load19@jlpt.local', 'Load Student 19', 'student', true, 'vi', 'Asia/Ho_Chi_Minh'),
  ('0192f000-0000-7000-8000-000000000114', 'student.load20@jlpt.local', 'Load Student 20', 'student', true, 'vi', 'Asia/Ho_Chi_Minh'),
  ('0192f000-0000-7000-8000-000000000115', 'student.load21@jlpt.local', 'Load Student 21', 'student', true, 'vi', 'Asia/Ho_Chi_Minh'),
  ('0192f000-0000-7000-8000-000000000116', 'student.load22@jlpt.local', 'Load Student 22', 'student', true, 'vi', 'Asia/Ho_Chi_Minh'),
  ('0192f000-0000-7000-8000-000000000117', 'student.load23@jlpt.local', 'Load Student 23', 'student', true, 'vi', 'Asia/Ho_Chi_Minh'),
  ('0192f000-0000-7000-8000-000000000118', 'student.load24@jlpt.local', 'Load Student 24', 'student', true, 'vi', 'Asia/Ho_Chi_Minh'),
  ('0192f000-0000-7000-8000-000000000119', 'student.load25@jlpt.local', 'Load Student 25', 'student', true, 'vi', 'Asia/Ho_Chi_Minh'),
  ('0192f000-0000-7000-8000-00000000011a', 'student.load26@jlpt.local', 'Load Student 26', 'student', true, 'vi', 'Asia/Ho_Chi_Minh'),
  ('0192f000-0000-7000-8000-00000000011b', 'student.load27@jlpt.local', 'Load Student 27', 'student', true, 'vi', 'Asia/Ho_Chi_Minh'),
  ('0192f000-0000-7000-8000-00000000011c', 'student.load28@jlpt.local', 'Load Student 28', 'student', true, 'vi', 'Asia/Ho_Chi_Minh'),
  ('0192f000-0000-7000-8000-00000000011d', 'student.load29@jlpt.local', 'Load Student 29', 'student', true, 'vi', 'Asia/Ho_Chi_Minh')
ON CONFLICT (id) DO UPDATE SET
  role = EXCLUDED.role,
  email_verified = EXCLUDED.email_verified;

-- Seed credential accounts for staff and student users for authentic password login (I00)
INSERT INTO accounts (id, user_id, account_id, provider_id, password)
VALUES
  ('0192f000-0000-7000-8000-000000000aa1', '0192f000-0000-7000-8000-0000000000b1', '0192f000-0000-7000-8000-0000000000b1', 'credential', '50fc4c2cacdde30d9823f1ecdc6ca63e:b1a4967bc29695815b832a27853f78150378eb8631024eff9470af0fc11ec1b8fb126fe37fdeb85657387c0d00d2268e21b75a9989c349189c01369966d2af3c'),
  ('0192f000-0000-7000-8000-000000000aa2', '0192f000-0000-7000-8000-0000000000b2', '0192f000-0000-7000-8000-0000000000b2', 'credential', '50fc4c2cacdde30d9823f1ecdc6ca63e:b1a4967bc29695815b832a27853f78150378eb8631024eff9470af0fc11ec1b8fb126fe37fdeb85657387c0d00d2268e21b75a9989c349189c01369966d2af3c'),
  ('0192f000-0000-7000-8000-000000000aa3', '0192f000-0000-7000-8000-0000000000e1', '0192f000-0000-7000-8000-0000000000e1', 'credential', '50fc4c2cacdde30d9823f1ecdc6ca63e:b1a4967bc29695815b832a27853f78150378eb8631024eff9470af0fc11ec1b8fb126fe37fdeb85657387c0d00d2268e21b75a9989c349189c01369966d2af3c'),
  ('0192f000-0000-7000-8000-000000000aa4', '0192f000-0000-7000-8000-0000000000d1', '0192f000-0000-7000-8000-0000000000d1', 'credential', '50fc4c2cacdde30d9823f1ecdc6ca63e:b1a4967bc29695815b832a27853f78150378eb8631024eff9470af0fc11ec1b8fb126fe37fdeb85657387c0d00d2268e21b75a9989c349189c01369966d2af3c'),
  ('0192f000-0000-7000-8000-000000000aa5', '0192f000-0000-7000-8000-0000000000c1', '0192f000-0000-7000-8000-0000000000c1', 'credential', '30d71c4d1a1f7bd9c4501d15127dc94d:e10c9d34889b3d32ba5d47ca12858ace122c21429093b704748d3891fb2dcc18466d60987a03fd1a88dedf6acaeb43aa3a7ff96024610a687edabd8df08019e3')
ON CONFLICT (id) DO UPDATE SET
  password = EXCLUDED.password;

-- Seed sessions for deterministic bearer token authorization
INSERT INTO sessions (id, user_id, token, expires_at)
VALUES
  ('0192f000-0000-7000-8000-000000000011', '0192f000-0000-7000-8000-0000000000b1', 'tok_admin_demo', NOW() + INTERVAL '30 days'),
  ('0192f000-0000-7000-8000-000000000017', '0192f000-0000-7000-8000-0000000000b2', 'tok_billing_admin_demo', NOW() + INTERVAL '30 days'),
  ('0192f000-0000-7000-8000-000000000012', '0192f000-0000-7000-8000-0000000000e1', 'tok_editor_demo', NOW() + INTERVAL '30 days'),
  ('0192f000-0000-7000-8000-000000000013', '0192f000-0000-7000-8000-0000000000d1', 'tok_reviewer_demo', NOW() + INTERVAL '30 days'),
  ('0192f000-0000-7000-8000-000000000014', '0192f000-0000-7000-8000-0000000000c1', 'tok_student_verified', NOW() + INTERVAL '30 days'),
  ('0192f000-0000-7000-8000-000000000015', '0192f000-0000-7000-8000-0000000000c2', 'tok_student_unverified', NOW() + INTERVAL '30 days'),
  ('0192f000-0000-7000-8000-000000000016', '0192f000-0000-7000-8000-0000000000c3', 'tok_other_student', NOW() + INTERVAL '30 days'),
  ('0192f000-0000-7000-8000-000000000021', '0192f000-0000-7000-8000-0000000000e5', 'tok_student_iphone', NOW() + INTERVAL '30 days'),
  ('0192f000-0000-7000-8000-000000000022', '0192f000-0000-7000-8000-0000000000e6', 'tok_student_pixel', NOW() + INTERVAL '30 days'),
  ('0192f000-0000-7000-8000-000000000023', '0192f000-0000-7000-8000-0000000000e7', 'tok_student_macbook', NOW() + INTERVAL '30 days'),
  ('0192f000-0000-7000-8000-000000000024', '0192f000-0000-7000-8000-0000000000e8', 'tok_student_windows', NOW() + INTERVAL '30 days'),
  ('0192f000-0000-7000-8000-000000000025', '0192f000-0000-7000-8000-0000000000e9', 'tok_student_ubuntu', NOW() + INTERVAL '30 days'),
  ('0192f000-0000-7000-8000-000000000200', '0192f000-0000-7000-8000-000000000100', 'tok_load_student_0', NOW() + INTERVAL '30 days'),
  ('0192f000-0000-7000-8000-000000000201', '0192f000-0000-7000-8000-000000000101', 'tok_load_student_1', NOW() + INTERVAL '30 days'),
  ('0192f000-0000-7000-8000-000000000202', '0192f000-0000-7000-8000-000000000102', 'tok_load_student_2', NOW() + INTERVAL '30 days'),
  ('0192f000-0000-7000-8000-000000000203', '0192f000-0000-7000-8000-000000000103', 'tok_load_student_3', NOW() + INTERVAL '30 days'),
  ('0192f000-0000-7000-8000-000000000204', '0192f000-0000-7000-8000-000000000104', 'tok_load_student_4', NOW() + INTERVAL '30 days'),
  ('0192f000-0000-7000-8000-000000000205', '0192f000-0000-7000-8000-000000000105', 'tok_load_student_5', NOW() + INTERVAL '30 days'),
  ('0192f000-0000-7000-8000-000000000206', '0192f000-0000-7000-8000-000000000106', 'tok_load_student_6', NOW() + INTERVAL '30 days'),
  ('0192f000-0000-7000-8000-000000000207', '0192f000-0000-7000-8000-000000000107', 'tok_load_student_7', NOW() + INTERVAL '30 days'),
  ('0192f000-0000-7000-8000-000000000208', '0192f000-0000-7000-8000-000000000108', 'tok_load_student_8', NOW() + INTERVAL '30 days'),
  ('0192f000-0000-7000-8000-000000000209', '0192f000-0000-7000-8000-000000000109', 'tok_load_student_9', NOW() + INTERVAL '30 days'),
  ('0192f000-0000-7000-8000-00000000020a', '0192f000-0000-7000-8000-00000000010a', 'tok_load_student_10', NOW() + INTERVAL '30 days'),
  ('0192f000-0000-7000-8000-00000000020b', '0192f000-0000-7000-8000-00000000010b', 'tok_load_student_11', NOW() + INTERVAL '30 days'),
  ('0192f000-0000-7000-8000-00000000020c', '0192f000-0000-7000-8000-00000000010c', 'tok_load_student_12', NOW() + INTERVAL '30 days'),
  ('0192f000-0000-7000-8000-00000000020d', '0192f000-0000-7000-8000-00000000010d', 'tok_load_student_13', NOW() + INTERVAL '30 days'),
  ('0192f000-0000-7000-8000-00000000020e', '0192f000-0000-7000-8000-00000000010e', 'tok_load_student_14', NOW() + INTERVAL '30 days'),
  ('0192f000-0000-7000-8000-00000000020f', '0192f000-0000-7000-8000-00000000010f', 'tok_load_student_15', NOW() + INTERVAL '30 days'),
  ('0192f000-0000-7000-8000-000000000210', '0192f000-0000-7000-8000-000000000110', 'tok_load_student_16', NOW() + INTERVAL '30 days'),
  ('0192f000-0000-7000-8000-000000000211', '0192f000-0000-7000-8000-000000000111', 'tok_load_student_17', NOW() + INTERVAL '30 days'),
  ('0192f000-0000-7000-8000-000000000212', '0192f000-0000-7000-8000-000000000112', 'tok_load_student_18', NOW() + INTERVAL '30 days'),
  ('0192f000-0000-7000-8000-000000000213', '0192f000-0000-7000-8000-000000000113', 'tok_load_student_19', NOW() + INTERVAL '30 days'),
  ('0192f000-0000-7000-8000-000000000214', '0192f000-0000-7000-8000-000000000114', 'tok_load_student_20', NOW() + INTERVAL '30 days'),
  ('0192f000-0000-7000-8000-000000000215', '0192f000-0000-7000-8000-000000000115', 'tok_load_student_21', NOW() + INTERVAL '30 days'),
  ('0192f000-0000-7000-8000-000000000216', '0192f000-0000-7000-8000-000000000116', 'tok_load_student_22', NOW() + INTERVAL '30 days'),
  ('0192f000-0000-7000-8000-000000000217', '0192f000-0000-7000-8000-000000000117', 'tok_load_student_23', NOW() + INTERVAL '30 days'),
  ('0192f000-0000-7000-8000-000000000218', '0192f000-0000-7000-8000-000000000118', 'tok_load_student_24', NOW() + INTERVAL '30 days'),
  ('0192f000-0000-7000-8000-000000000219', '0192f000-0000-7000-8000-000000000119', 'tok_load_student_25', NOW() + INTERVAL '30 days'),
  ('0192f000-0000-7000-8000-00000000021a', '0192f000-0000-7000-8000-00000000011a', 'tok_load_student_26', NOW() + INTERVAL '30 days'),
  ('0192f000-0000-7000-8000-00000000021b', '0192f000-0000-7000-8000-00000000011b', 'tok_load_student_27', NOW() + INTERVAL '30 days'),
  ('0192f000-0000-7000-8000-00000000021c', '0192f000-0000-7000-8000-00000000011c', 'tok_load_student_28', NOW() + INTERVAL '30 days'),
  ('0192f000-0000-7000-8000-00000000021d', '0192f000-0000-7000-8000-00000000011d', 'tok_load_student_29', NOW() + INTERVAL '30 days')
ON CONFLICT (id) DO UPDATE SET
  token = EXCLUDED.token,
  expires_at = EXCLUDED.expires_at;

-- Seed organizations and tenant plans for cross-tenant isolation testing (N06)
INSERT INTO organizations (id, name, slug)
VALUES
  ('0192f000-0000-7000-8000-000000000001', 'Tenant Organization Alpha', 'org-alpha'),
  ('0192f000-0000-7000-8000-000000000002', 'Tenant Organization Beta', 'org-beta')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  slug = EXCLUDED.slug;

INSERT INTO tenant_plans (tenant_id, plan_code, status, total_seats, used_seats, max_classes, features)
VALUES
  ('org-alpha', 'organization_standard', 'active', 50, 5, 10, '["unlimited_exams", "teacher_dashboard"]'::jsonb),
  ('org-beta', 'organization_enterprise', 'active', 200, 20, 50, '["unlimited_exams", "teacher_dashboard", "custom_branding"]'::jsonb)
ON CONFLICT (tenant_id) DO UPDATE SET
  total_seats = EXCLUDED.total_seats,
  status = EXCLUDED.status;

-- Seed org memberships linking users to organizations for realistic tenant isolation (N06)
INSERT INTO org_memberships (id, org_id, user_id, role)
VALUES
  ('0192f000-0000-7000-8000-000000000051', '0192f000-0000-7000-8000-000000000001', '0192f000-0000-7000-8000-0000000000c1', 'member'),
  ('0192f000-0000-7000-8000-000000000052', '0192f000-0000-7000-8000-000000000002', '0192f000-0000-7000-8000-0000000000c3', 'member')
ON CONFLICT (id) DO UPDATE SET
  org_id = EXCLUDED.org_id,
  user_id = EXCLUDED.user_id,
  role = EXCLUDED.role;

-- Enable guest trial for demo exam to support realistic load testing and unauthenticated trial runs
UPDATE exams SET description = 'guest_trial' WHERE slug = 'demo-n5-1';

-- Reset test student attempts for deterministic clean test runs
DELETE FROM attempt_events WHERE attempt_id IN (SELECT id FROM exam_attempts WHERE user_id = '0192f000-0000-7000-8000-0000000000c1');
DELETE FROM user_answers WHERE attempt_id IN (SELECT id FROM exam_attempts WHERE user_id = '0192f000-0000-7000-8000-0000000000c1');
DELETE FROM exam_attempts WHERE user_id = '0192f000-0000-7000-8000-0000000000c1';
