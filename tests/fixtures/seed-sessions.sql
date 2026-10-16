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
