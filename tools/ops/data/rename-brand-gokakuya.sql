-- ============================================================================
-- SCRIPT CẬP NHẬT TÊN THƯƠNG HIỆU: 'JLPT Online' -> 'Gokakuya.com'
--
-- Mục đích:
--   Cập nhật các cột văn bản (text) và cấu trúc JSON (jsonb) đang lưu trữ
--   tên thương hiệu / nền tảng từ 'JLPT Online' thành 'Gokakuya.com'.
--
-- Tính chất:
--   - Idempotent: Có thể chạy nhiều lần mà không làm sai lệch dữ liệu.
--   - An toàn: Bọc trong transaction BEGIN ... COMMIT.
--   - Chỉ sử dụng UPDATE, không dùng DELETE/DROP.
--   - Cột jsonb ép sang ::text để replace rồi ép ngược về ::jsonb.
--   - Chỉ chạm vào các hàng thực sự chứa chuỗi 'JLPT Online'.
--
-- Hướng dẫn chạy thử nghiệm và thực thi:
--   1. Chạy đếm số hàng bị ảnh hưởng trước (dry-run):
--        docker exec -i jlpt-postgres-1 psql -U jlpt -d jlpt_prod -c "<câu SELECT bên dưới>"
--   2. Thực thi script cập nhật:
--        docker exec -i jlpt-postgres-1 psql -U jlpt -d jlpt_prod < tools/ops/data/rename-brand-gokakuya.sql
--      hoặc từ host server:
--        cat tools/ops/data/rename-brand-gokakuya.sql | docker exec -i $(docker ps -qf "name=postgres") psql -U jlpt -d jlpt_prod
-- ============================================================================

-- ============================================================================
-- CÁC CÂU LỆNH ĐẾM BẢN GHI (CHẠY THỬ TRƯỚC KHI THỰC THI)
-- ============================================================================
-- SELECT count(*) AS count_exam_sources_name FROM exam_sources WHERE name LIKE '%JLPT Online%';
-- SELECT count(*) AS count_exam_sources_metadata FROM exam_sources WHERE metadata::text LIKE '%JLPT Online%';
-- SELECT count(*) AS count_content_licenses_terms FROM content_licenses WHERE terms LIKE '%JLPT Online%';
-- SELECT count(*) AS count_lexicon_licenses_license FROM lexicon_licenses WHERE license LIKE '%JLPT Online%';
-- SELECT count(*) AS count_lexicon_licenses_rights_terms FROM lexicon_licenses WHERE rights_terms LIKE '%JLPT Online%';
-- SELECT count(*) AS count_landing_pages_title FROM landing_pages WHERE title LIKE '%JLPT Online%';
-- SELECT count(*) AS count_landing_pages_content FROM landing_pages WHERE content::text LIKE '%JLPT Online%';
-- SELECT count(*) AS count_article_versions_title FROM article_versions WHERE title LIKE '%JLPT Online%';
-- SELECT count(*) AS count_article_versions_content FROM article_versions WHERE content::text LIKE '%JLPT Online%';
-- SELECT count(*) AS count_site_content_versions_payload FROM site_content_versions WHERE payload::text LIKE '%JLPT Online%';
-- SELECT count(*) AS count_faq_items_question FROM faq_items WHERE question LIKE '%JLPT Online%';
-- SELECT count(*) AS count_faq_items_answer FROM faq_items WHERE answer LIKE '%JLPT Online%';
-- SELECT count(*) AS count_template_versions_subject FROM template_versions WHERE subject LIKE '%JLPT Online%';
-- SELECT count(*) AS count_template_versions_body FROM template_versions WHERE body LIKE '%JLPT Online%';
-- SELECT count(*) AS count_notification_jobs_payload FROM notification_jobs WHERE payload::text LIKE '%JLPT Online%';
-- SELECT count(*) AS count_plans_name FROM plans WHERE name LIKE '%JLPT Online%';
-- SELECT count(*) AS count_plans_description FROM plans WHERE description LIKE '%JLPT Online%';
-- SELECT count(*) AS count_plan_versions_entitlements FROM plan_versions WHERE entitlements::text LIKE '%JLPT Online%';

BEGIN;

-- 1. Nguồn đề thi và giấy phép nội dung
UPDATE exam_sources
SET name = replace(name, 'JLPT Online', 'Gokakuya.com')
WHERE name LIKE '%JLPT Online%';

UPDATE exam_sources
SET metadata = replace(metadata::text, 'JLPT Online', 'Gokakuya.com')::jsonb
WHERE metadata::text LIKE '%JLPT Online%';

UPDATE content_licenses
SET terms = replace(terms, 'JLPT Online', 'Gokakuya.com')
WHERE terms LIKE '%JLPT Online%';

UPDATE lexicon_licenses
SET license = replace(license, 'JLPT Online', 'Gokakuya.com')
WHERE license LIKE '%JLPT Online%';

UPDATE lexicon_licenses
SET rights_terms = replace(rights_terms, 'JLPT Online', 'Gokakuya.com')
WHERE rights_terms LIKE '%JLPT Online%';

-- 2. Nội dung CMS: Landing Pages và cấu hình SEO
UPDATE landing_pages
SET title = replace(title, 'JLPT Online', 'Gokakuya.com')
WHERE title LIKE '%JLPT Online%';

UPDATE landing_pages
SET content = replace(content::text, 'JLPT Online', 'Gokakuya.com')::jsonb
WHERE content::text LIKE '%JLPT Online%';

-- 3. Bài viết CMS, nội dung tĩnh và câu hỏi thường gặp
UPDATE article_versions
SET title = replace(title, 'JLPT Online', 'Gokakuya.com')
WHERE title LIKE '%JLPT Online%';

UPDATE article_versions
SET content = replace(content::text, 'JLPT Online', 'Gokakuya.com')::jsonb
WHERE content::text LIKE '%JLPT Online%';

UPDATE site_content_versions
SET payload = replace(payload::text, 'JLPT Online', 'Gokakuya.com')::jsonb
WHERE payload::text LIKE '%JLPT Online%';

UPDATE faq_items
SET question = replace(question, 'JLPT Online', 'Gokakuya.com')
WHERE question LIKE '%JLPT Online%';

UPDATE faq_items
SET answer = replace(answer, 'JLPT Online', 'Gokakuya.com')
WHERE answer LIKE '%JLPT Online%';

-- 4. Mẫu thông báo, email và hàng đợi thông báo
UPDATE template_versions
SET subject = replace(subject, 'JLPT Online', 'Gokakuya.com')
WHERE subject LIKE '%JLPT Online%';

UPDATE template_versions
SET body = replace(body, 'JLPT Online', 'Gokakuya.com')
WHERE body LIKE '%JLPT Online%';

UPDATE notification_jobs
SET payload = replace(payload::text, 'JLPT Online', 'Gokakuya.com')::jsonb
WHERE payload::text LIKE '%JLPT Online%';

-- 5. Gói dịch vụ thành viên và quyền lợi
UPDATE plans
SET name = replace(name, 'JLPT Online', 'Gokakuya.com')
WHERE name LIKE '%JLPT Online%';

UPDATE plans
SET description = replace(description, 'JLPT Online', 'Gokakuya.com')
WHERE description LIKE '%JLPT Online%';

UPDATE plan_versions
SET entitlements = replace(entitlements::text, 'JLPT Online', 'Gokakuya.com')::jsonb
WHERE entitlements::text LIKE '%JLPT Online%';

COMMIT;
