-- Seed users for E2E and Security verification (N06)
INSERT INTO users (id, email, name, role, email_verified, locale, timezone)
VALUES
  ('0192f000-0000-7000-8000-0000000000b1', 'publisher@jlpt.local', 'Demo Publisher Admin', 'admin', true, 'vi', 'Asia/Ho_Chi_Minh'),
  ('0192f000-0000-7000-8000-0000000000e1', 'editor@jlpt.local', 'Demo Editor', 'editor', true, 'vi', 'Asia/Ho_Chi_Minh'),
  ('0192f000-0000-7000-8000-0000000000d1', 'reviewer@jlpt.local', 'Demo Reviewer', 'reviewer', true, 'vi', 'Asia/Ho_Chi_Minh'),
  ('0192f000-0000-7000-8000-0000000000c1', 'student.verified@jlpt.local', 'Verified Student', 'student', true, 'vi', 'Asia/Ho_Chi_Minh'),
  ('0192f000-0000-7000-8000-0000000000c2', 'student.unverified@jlpt.local', 'Unverified Student', 'student', false, 'vi', 'Asia/Ho_Chi_Minh'),
  ('0192f000-0000-7000-8000-0000000000c3', 'student.other@jlpt.local', 'Other Student', 'student', true, 'vi', 'Asia/Ho_Chi_Minh')
ON CONFLICT (id) DO UPDATE SET
  role = EXCLUDED.role,
  email_verified = EXCLUDED.email_verified;

-- Seed sessions for deterministic bearer token authorization
INSERT INTO sessions (id, user_id, token, expires_at)
VALUES
  ('0192f000-0000-7000-8000-000000000011', '0192f000-0000-7000-8000-0000000000b1', 'tok_admin_demo', NOW() + INTERVAL '30 days'),
  ('0192f000-0000-7000-8000-000000000012', '0192f000-0000-7000-8000-0000000000e1', 'tok_editor_demo', NOW() + INTERVAL '30 days'),
  ('0192f000-0000-7000-8000-000000000013', '0192f000-0000-7000-8000-0000000000d1', 'tok_reviewer_demo', NOW() + INTERVAL '30 days'),
  ('0192f000-0000-7000-8000-000000000014', '0192f000-0000-7000-8000-0000000000c1', 'tok_student_verified', NOW() + INTERVAL '30 days'),
  ('0192f000-0000-7000-8000-000000000015', '0192f000-0000-7000-8000-0000000000c2', 'tok_student_unverified', NOW() + INTERVAL '30 days'),
  ('0192f000-0000-7000-8000-000000000016', '0192f000-0000-7000-8000-0000000000c3', 'tok_other_student', NOW() + INTERVAL '30 days')
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

