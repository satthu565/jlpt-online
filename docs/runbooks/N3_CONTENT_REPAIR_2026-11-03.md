# Sửa nội dung N3 — 03/11/2026

Ủy quyền: chủ dự án yêu cầu sửa những vấn đề có thể xác minh, bao gồm dữ liệu đề.

## Phạm vi

- 84 trường dữ liệu trong 66 câu / 19 đề; 17 ảnh được cắt lại từ PDF nguồn và kiểm tra trực quan.
- Giữ nguyên toàn bộ khóa đáp án. Q93–95 N3 7/2021: khôi phục cả thứ tự câu và phương án theo trang PDF 17 của script nguồn, soạn lại lý do đúng/sai.
- Q79 N3 12/2012: thay câu hỏi/lời giải về đồ đạc bị gắn sai bằng công việc ở nhà hàng theo script trang PDF 10, hình đề trang PDF 10 và bảng đáp án trang PDF 14. Đáp án vẫn là 1 (ア・ウ).
- Q53 N3 12/2018: khôi phục `入ってた`, giữ đủ ô trống và vị trí ★.
- Lưu dữ liệu trước/sau và căn cứ từng thay đổi trong `apps/api/src/scripts/n3-content-repair-plan.json`.

## An toàn

Mặc định chỉ dry-run. Manifest và ảnh phải khớp SHA256 cố định; nội dung khác cả giá trị trước và sau bị từ chối. Áp dụng yêu cầu backup dump hợp lệ. Không chạy migration khi khởi tạo script; không sử dụng database trong bộ nhớ thay thế. Tạo nhóm/câu/lời giải phiên bản mới, giữ nguyên phiên bản và snapshot cũ, chép nguyên các câu cùng nhóm. Xóa duy nhất liên kết group_media đến ảnh cũ đã được thay; không xóa media bytes. Xuất bản lại các đề có phiên bản nội dung mới và kiểm tra khả năng chạy lại.

```bash
N3_REPAIR_PLAN=/path/n3-content-repair-plan.json \
N3_REPAIR_MEDIA_DIR=/path/media \
  node apps/api/dist/src/scripts/repair-n3-content.js

# Sau CI xanh và có backup:
N3_REPAIR_BACKUP=/path/backup.dump N3_REPAIR_PLAN=/path/n3-content-repair-plan.json \
N3_REPAIR_MEDIA_DIR=/path/media \
  node apps/api/dist/src/scripts/repair-n3-content.js --apply
```

## Đính chính báo cáo cũ / chưa sửa

- N3 7/2022 PDF có 34 câu từ vựng, kết thúc bằng 通り過ぎる; chưa có bằng chứng bỏ sót câu. Không tự thêm câu số 35.
- N3 7/2012 Q75 và Q79 là câu có lựa chọn chữ, không phải câu cần sơ đồ báo cáo/phòng; nhận định thiếu hình trước đây sai. Q68 thiếu email ngay trong PDF, chưa có nguồn để bổ sung.
- Ảnh N3 12/2015 Q75,80; 7/2015 Q76; 7/2014 Q90–93; 7/2010 Q75 đã có trong paragraph.content, không phải mất ảnh. N3 7/2015 Q80 dùng lựa chọn chữ; không cần ảnh.
- N3 7/2011 Q75 có danh mục văn phòng phẩm dạng chữ (số lượng chưa khôi phục); Q79 có bốn lựa chọn chữ, không cần hình.
- N3 7/2023 bài đọc có `約年前` ngay trong bản PDF; chưa đoán số năm.
- N3 7/2024 Q59 lựa chọn 4 không liên quan nhưng đã xuất hiện như vậy trong PDF nguồn trang 11; chưa tự đặt lựa chọn mới.
- N3 12/2013 Q102 lựa chọn 3 lỗi chữ ngay trong script nguồn trang 13; chưa đoán nội dung thay thế.
- Chưa xác minh trực tiếp audio, chưa kiểm lại toàn bộ nội dung nghe ngoài những câu trong manifest.

## Ảnh đã đối chiếu

- n3-2021-12 Q74: N3 T12-2021 Final Version.pdf, trang PDF 16; ảnh `n3-2021-12-q74.png`, SHA256 `6ee1220167615d466e8a3b02c1328cce98571f70953eb8fb9affa325f18ee2ab`.
- n3-2021-12 Q76: N3 T12-2021 Final Version.pdf, trang PDF 17; ảnh `n3-2021-12-q76.png`, SHA256 `8892368f9530a49068a8b3adab4ab4b5fb50bd154147eb7f271a27571c94f558`.
- n3-2021-12 Q77: N3 T12-2021 Final Version.pdf, trang PDF 17; ảnh `n3-2021-12-q77.png`, SHA256 `231e6095c0835b6083c7d83ff39559f26fd3d618c71c6e52381383c55ac405ac`.
- n3-2021-12 Q79: N3 T12-2021 Final Version.pdf, trang PDF 18; ảnh `n3-2021-12-q79.png`, SHA256 `153b4f439953ce4f12c5e79f393437f8a82829cfcc2558baa7a1c4a4e9c4a01e`.
- n3-2017-12 Q90: Đề N3 12-2017.pdf, trang PDF 13; ảnh `n3-2017-12-q90.png`, SHA256 `b9969d70378910f96900e6cf133abbf2245988eeb1c2438b88f58bcdd86c60e0`.
- n3-2017-12 Q91: Đề N3 12-2017.pdf, trang PDF 13; ảnh `n3-2017-12-q91.png`, SHA256 `797f2ed6ca16997af7dce861d009d0767497fa8b0a44f1a468cc1a08fbfd9e47`.
- n3-2017-12 Q92: Đề N3 12-2017.pdf, trang PDF 13; ảnh `n3-2017-12-q92.png`, SHA256 `ea51d3cc3f991ba973ebb076e0708afa885aabb169a0c74e34421528075faa3c`.
- n3-2017-12 Q93: Đề N3 12-2017.pdf, trang PDF 13; ảnh `n3-2017-12-q93.png`, SHA256 `b4ce4c5861adaef492e55c04ec2c5dc09e551eae4d3a02508857c1183a592c3f`.
- n3-2018-12 Q90: N3-T12-2018.pdf, trang PDF 14; ảnh `n3-2018-12-q90.png`, SHA256 `0169266d18421b7e6e867059c0922f7e5b216f3b3766d7407f6bf3f67927ec6e`.
- n3-2018-12 Q91: N3-T12-2018.pdf, trang PDF 14; ảnh `n3-2018-12-q91.png`, SHA256 `2e5be9a6a29bcb7187fddfcda888562d4190a3257d7c6e7839861614b967164c`.
- n3-2018-12 Q92: N3-T12-2018.pdf, trang PDF 14; ảnh `n3-2018-12-q92.png`, SHA256 `5ffbd36920160c2c907f477f632af0a471c5e1bf2e8222ffe66d9a6048eb2e24`.
- n3-2018-12 Q93: N3-T12-2018.pdf, trang PDF 14; ảnh `n3-2018-12-q93.png`, SHA256 `9da9a11afdd7602d665ac7137839ec31875b891e6e544b82ff8d609908544b9b`.
- n3-2012-12 Q75: Đề N3 12-2012.pdf, trang PDF 10; ảnh `n3-2012-12-q75.png`, SHA256 `3db9455eaf4d06307da26015c1664e1b087c5fbb5b3054f42bf0a89c6317f155`.
- n3-2012-12 Q79: Đề N3 12-2012.pdf, trang PDF 10; ảnh `n3-2012-12-q79.png`, SHA256 `637ed5b93d7c44d93edb85aa16d215b3f583d0bba6ea73e1200ec09d7a093019`.
- n3-2011-12 Q76: Đề N3 12-2011.pdf, trang PDF 10; ảnh `n3-2011-12-q76.png`, SHA256 `a700ddee5ba6c60ef75118a3d7f59a3e3d00f5441ec492d2b8e4f19c71b9638d`.
- n3-2011-12 Q77: Đề N3 12-2011.pdf, trang PDF 10; ảnh `n3-2011-12-q77.png`, SHA256 `948382cd9684a55a6dbcc3e90ffc020c37d8d8ee825b37b99bcc9b7b5bfe9681`.
- n3-2013-07 Q79: Đề N3 7-2013.pdf, trang PDF 10; ảnh `n3-2013-07-q79.png`, SHA256 `5529aec5fd9a102b3b8614cfbc461bb6608f5065b1a2ec35d4ad5b64c7137fcc`.

## Kiểm tra trước PR

- Lint, typecheck, build, check:ui-primitives, check:no-mock-ui và docs:map đạt.
- 5 test mới đạt: từ chối nội dung bị sửa đồng thời, chạy lại an toàn, giữ thứ tự/ô trống/★/khóa đáp án, thứ tự ba câu nghe theo nguồn và đủ metadata 17 ảnh.
- `pnpm test`: các gói liên quan đạt; gói tests gặp lỗi môi trường có sẵn `integration/dac-ta-runner.test.ts`, Scenario 10 (worker filesystem/docker permissions). Không bỏ qua CI.
- Đã pg_dump toàn database và phục hồi thành database thử riêng `jlpt_n3_repair_check_20261103`.
- Thử áp dụng trên bản sao: 65 nhóm tạo phiên bản mới, 19 đề xuất bản, 84 trường / 17 ảnh xác minh thành công.
- Chạy lại trên bản sao: pending=0, groupsVersioned=0, examsPublished=0.
- Chưa áp dụng database dùng chung; chờ CI xanh. Không có preview :3210 vì đây là sửa dữ liệu.
