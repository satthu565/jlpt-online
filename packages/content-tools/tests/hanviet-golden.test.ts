import { describe, expect, it } from 'vitest';
import { computeHanViet, getHanVietForWord, getHanVietForKanji } from '../src/nlp/hanviet.js';
import { checkHanVietOnyomiCoverage } from '../../../tools/import-data/bin/check-hanviet-onyomi.mjs';

describe('H01: Dữ liệu âm Hán Việt theo từng từ vựng và độ tin cậy', () => {
  it('Acceptance 1: hanviet-onyomi.tsv phủ mọi âm On của 2.136 chữ Jōyō; script kiểm tra báo 0 chữ thiếu', () => {
    const report = checkHanVietOnyomiCoverage();
    expect(report.success).toBe(true);
    expect(report.missingKanji.length).toBe(0);
    expect(report.missingReadings.length).toBe(0);
  });

  describe('Acceptance 2: Bộ từ chuẩn hanviet-golden (từ + reading + âm đúng) gồm ít nhất 200 từ JLPT N5-N1 đạt 100%', () => {
    const GOLDEN_WORDS: Array<{ term: string; reading: string; expected: string; note?: string }> = [
      // 20 từ bắt buộc theo đề bài
      { term: '予約', reading: 'よやく', expected: 'DỰ ƯỚC' },
      { term: '要約', reading: 'ようやく', expected: 'YẾU ƯỚC' },
      { term: '約束', reading: 'やくそく', expected: 'ƯỚC THÚC' },
      { term: '重要', reading: 'じゅうよう', expected: 'TRỌNG YẾU' },
      { term: '重複', reading: 'ちょうふく', expected: 'TRÙNG PHỨC' },
      { term: '貴重', reading: 'きちょう', expected: 'QUÝ TRỌNG' },
      { term: '必要', reading: 'ひつよう', expected: 'TẤT YẾU' },
      { term: '番号', reading: 'ばんごう', expected: 'PHIÊN HIỆU' },
      { term: '音楽', reading: 'おんがく', expected: 'ÂM NHẠC' },
      { term: '楽園', reading: 'らくえん', expected: 'LẠC VIÊN' },
      { term: '貿易', reading: 'ぼうえき', expected: 'MẬU DỊCH' },
      { term: '容易', reading: 'ようい', expected: 'DUNG DỊ' },
      { term: '社長', reading: 'しゃちょう', expected: 'XÃ TRƯỞNG' },
      { term: '部長', reading: 'ぶちょう', expected: 'BỘ TRƯỞNG' },
      { term: '長期', reading: 'ちょうき', expected: 'TRƯỜNG KỲ' },
      { term: '銀行', reading: 'ぎんこう', expected: 'NGÂN HÀNG' },
      { term: '旅行', reading: 'りょこう', expected: 'LỮ HÀNH' },
      { term: '学生', reading: 'がくせい', expected: 'HỌC SINH' },
      { term: '経済', reading: 'けいざい', expected: 'KINH TẾ' },
      { term: '勉強', reading: 'べんきょう', expected: 'MIỄN CƯỜNG' },

      // Từ vựng chữ 長 (TRƯỞNG vs TRƯỜNG)
      { term: '課長', reading: 'かちょう', expected: 'KHÓA TRƯỞNG' },
      { term: '会長', reading: 'かいちょう', expected: 'HỘI TRƯỞNG' },
      { term: '議長', reading: 'ぎちょう', expected: 'NGHỊ TRƯỞNG' },
      { term: '店長', reading: 'てんちょう', expected: 'TIẾM TRƯỞNG' },
      { term: '院長', reading: 'いんちょう', expected: 'VIỆN TRƯỞNG' },
      { term: '校長', reading: 'こうちょう', expected: 'HIỆU TRƯỞNG' },
      { term: '学長', reading: 'がくちょう', expected: 'HỌC TRƯỞNG' },
      { term: '市長', reading: 'しちょう', expected: 'THỊ TRƯỞNG' },
      { term: '署長', reading: 'しょちょう', expected: 'THỰ TRƯỞNG' },
      { term: '隊長', reading: 'たいちょう', expected: 'ĐỘI TRƯỞNG' },
      { term: '船長', reading: 'せんちょう', expected: 'THUYỀN TRƯỞNG' },
      { term: '駅長', reading: 'えきちょう', expected: 'DỊCH TRƯỞNG' },
      { term: '組長', reading: 'くみちょう', expected: 'TỔ TRƯỞNG' },
      { term: '班長', reading: 'はんちょう', expected: 'BAN TRƯỞNG' },
      { term: '首長', reading: 'しゅちょう', expected: 'THỦ TRƯỞNG' },
      { term: '局長', reading: 'きょくちょう', expected: 'CỤC TRƯỞNG' },
      { term: '係長', reading: 'かかりちょう', expected: 'HỆ TRƯỞNG' },
      { term: '所長', reading: 'しょちょう', expected: 'SỞ TRƯỞNG' },
      { term: '委員長', reading: 'いいんちょう', expected: 'ỦY VIÊN TRƯỞNG' },
      { term: '館長', reading: 'かんちょう', expected: 'QUÁN TRƯỞNG' },
      { term: '団長', reading: 'だんちょう', expected: 'ĐOÀN TRƯỞNG' },
      { term: '園長', reading: 'えんちょう', expected: 'VIÊN TRƯỞNG' },
      { term: '成長', reading: 'せいちょう', expected: 'THÀNH TRƯỞNG' },
      { term: '生長', reading: 'せいちょう', expected: 'SINH TRƯỞNG' },
      { term: '長男', reading: 'ちょうなん', expected: 'TRƯỞNG NAM' },
      { term: '長女', reading: 'ちょうじょ', expected: 'TRƯỞNG NỮ' },
      { term: '長子', reading: 'ちょうし', expected: 'TRƯỞNG TỬ' },
      { term: '年長', reading: 'ねんちょう', expected: 'NIÊN TRƯỞNG' },
      { term: '長老', reading: 'ちょうろう', expected: 'TRƯỞNG LÃO' },
      { term: '長時間', reading: 'ちょうじかん', expected: 'TRƯỜNG THỜI GIAN' },
      { term: '長所', reading: 'ちょうしょ', expected: 'TRƯỜNG SỞ' },
      { term: '長短', reading: 'ちょうたん', expected: 'TRƯỜNG ĐOẢN' },
      { term: '延長', reading: 'えんちょう', expected: 'DUYÊN TRƯỜNG' },
      { term: '波長', reading: 'はちょう', expected: 'BA TRƯỜNG' },
      { term: '特長', reading: 'とくちょう', expected: 'ĐẶC TRƯỜNG' },
      { term: '最長', reading: 'さいちょう', expected: 'TỐI TRƯỜNG' },
      { term: '全長', reading: 'ぜんちょう', expected: 'TOÀN TRƯỜNG' },
      { term: '身長', reading: 'しんちょう', expected: 'THÂN TRƯỜNG' },
      { term: '長方形', reading: 'ちょうほうけい', expected: 'TRƯỜNG PHƯƠNG HÌNH' },
      { term: '長寿', reading: 'ちょうじゅ', expected: 'TRƯỜNG THỌ' },
      { term: '長編', reading: 'ちょうへん', expected: 'TRƯỜNG BIÊN' },
      { term: '長大', reading: 'ちょうだい', expected: 'TRƯỜNG ĐẠI' },
      { term: '長文', reading: 'ちょうぶん', expected: 'TRƯỜNG VĂN' },
      { term: '長夜', reading: 'ちょうや', expected: 'TRƯỜNG DẠ' },
      { term: '長距離', reading: 'ちょうきょり', expected: 'TRƯỜNG CỰ LY' },
      { term: '長蛇', reading: 'ちょうだ', expected: 'TRƯỜNG XÀ' },
      { term: '長生', reading: 'ちょうせい', expected: 'TRƯỜNG SINH' },

      // Từ vựng chữ 行 (HÀNG vs HÀNH)
      { term: '行列', reading: 'ぎょうれつ', expected: 'HÀNG LIỆT' },
      { term: '発行', reading: 'はっこう', expected: 'PHÁT HÀNH' },
      { term: '奥行', reading: 'おくゆき', expected: 'ÁO HÀNH' },
      { term: '行動', reading: 'こうどう', expected: 'HÀNH ĐỘNG' },
      { term: '行為', reading: 'こうい', expected: 'HÀNH VI' },
      { term: '実行', reading: 'じっこう', expected: 'THỰC HÀNH' },
      { term: '進行', reading: 'しんこう', expected: 'TIẾN HÀNH' },
      { term: '流行', reading: 'りゅうこう', expected: 'LƯU HÀNH' },
      { term: '犯行', reading: 'はんこう', expected: 'PHẠM HÀNH' },
      { term: '強行', reading: 'きょうこう', expected: 'CƯỜNG HÀNH' },
      { term: '飛行', reading: 'ひこう', expected: 'PHI HÀNH' },
      { term: '航行', reading: 'こうこう', expected: 'HÀNG HÀNH' },
      { term: '通行', reading: 'つうこう', expected: 'THÔNG HÀNH' },
      { term: '徐行', reading: 'じょこう', expected: 'TỪ HÀNH' },
      { term: '急行', reading: 'きゅうこう', expected: 'CẤP HÀNH' },
      { term: '運行', reading: 'うんこう', expected: 'VẬN HÀNH' },
      { term: '並行', reading: 'へいこう', expected: 'TỊNH HÀNH' },
      { term: '興行', reading: 'こうぎょう', expected: 'HƯNG HÀNH' },
      { term: '現行', reading: 'げんこう', expected: 'HIỆN HÀNH' },
      { term: '執行', reading: 'しっこう', expected: 'CHẤP HÀNH' },
      { term: '連行', reading: 'れんこう', expected: 'LIÊN HÀNH' },
      { term: '慣行', reading: 'かんこう', expected: 'QUÁN HÀNH' },
      { term: '敢行', reading: 'かんこう', expected: 'CẢM HÀNH' },
      { term: '直行', reading: 'ちょっこう', expected: 'TRỰC HÀNH' },
      { term: '歩行', reading: 'ほこう', expected: 'BỘ HÀNH' },
      { term: '行進', reading: 'こうしん', expected: 'HÀNH TIẾN' },
      { term: '行事', reading: 'ぎょうじ', expected: 'HÀNH SỰ' },
      { term: '行政', reading: 'ぎょうせい', expected: 'HÀNH CHÍNH' },
      { term: '履行', reading: 'りこう', expected: 'LÝ HÀNH' },
      { term: '刊行', reading: 'かんこう', expected: 'KHAN HÀNH' },
      { term: '移行', reading: 'いこう', expected: 'DI HÀNH' },
      { term: '逆行', reading: 'ぎゃっこう', expected: 'NGHỊCH HÀNH' },
      { term: '先行', reading: 'せんこう', expected: 'TIÊN HÀNH' },
      { term: '巡行', reading: 'じゅんこう', expected: 'TUẦN HÀNH' },
      { term: '随行', reading: 'ずいこう', expected: 'TÙY HÀNH' },
      { term: '同行', reading: 'どうこう', expected: 'ĐỒNG HÀNH' },
      { term: '走行', reading: 'そうこう', expected: 'TẨU HÀNH' },
      { term: '修行', reading: 'しゅぎょう', expected: 'TU HÀNH' },

      // Từ vựng chữ 重 (TRỌNG vs TRÙNG)
      { term: '体重', reading: 'たいじゅう', expected: 'THỂ TRỌNG' },
      { term: '重点', reading: 'じゅうてん', expected: 'TRỌNG ĐIỂM' },
      { term: '重大', reading: 'じゅうだい', expected: 'TRỌNG ĐẠI' },
      { term: '重力', reading: 'じゅうりょく', expected: 'TRỌNG LỰC' },
      { term: '重視', reading: 'じゅうし', expected: 'TRỌNG THỊ' },
      { term: '尊重', reading: 'そんちょう', expected: 'TÔN TRỌNG' },
      { term: '慎重', reading: 'しんちょう', expected: 'THẬN TRỌNG' },
      { term: '厳重', reading: 'げんじゅう', expected: 'NGHIÊM TRỌNG' },
      { term: '荷重', reading: 'かじゅう', expected: 'HẠ TRỌNG' },
      { term: '過重', reading: 'かじゅう', expected: 'QUÁ TRỌNG' },
      { term: '重荷', reading: 'おもに', expected: 'TRỌNG HÀ' },
      { term: '軽重', reading: 'けいちょう', expected: 'KHINH TRỌNG' },
      { term: '比重', reading: 'ひじゅう', expected: 'TỶ TRỌNG' },
      { term: '重罪', reading: 'じゅうざい', expected: 'TRỌNG TỘI' },
      { term: '重傷', reading: 'じゅうしょう', expected: 'TRỌNG THƯƠNG' },
      { term: '重病', reading: 'じゅうびょう', expected: 'TRỌNG BỆNH' },
      { term: '重労働', reading: 'じゅうろうどう', expected: 'TRỌNG LAO ĐỘNG' },
      { term: '重任', reading: 'じゅうにん', expected: 'TRỌNG NHIỆM' },
      { term: '敬重', reading: 'けいちょう', expected: 'KÍNH TRỌNG' },
      { term: '重用', reading: 'じゅうよう', expected: 'TRỌNG DỤNG' },
      { term: '重厚', reading: 'じゅうこう', expected: 'TRỌNG HẬU' },
      { term: '二重', reading: 'にじゅう', expected: 'NHỊ TRÙNG' },
      { term: '三重', reading: 'さんじゅう', expected: 'TAM TRÙNG' },
      { term: '多重', reading: 'たじゅう', expected: 'ĐA TRÙNG' },
      { term: '重畳', reading: 'ちょうじょう', expected: 'TRÙNG ĐIỆP' },

      // Từ vựng chữ 楽 (NHẠC vs LẠC)
      { term: '楽器', reading: 'がっき', expected: 'NHẠC KHÍ' },
      { term: '楽譜', reading: 'がくふ', expected: 'NHẠC PHỔ' },
      { term: '楽曲', reading: 'がっきょく', expected: 'NHẠC KHÚC' },
      { term: '声楽', reading: 'せいがく', expected: 'THANH NHẠC' },
      { term: '軍楽', reading: 'ぐんがく', expected: 'QUÂN NHẠC' },
      { term: '邦楽', reading: 'ほうがく', expected: 'BANG NHẠC' },
      { term: '洋楽', reading: 'ようがく', expected: 'DƯƠNG NHẠC' },
      { term: '器楽', reading: 'きがく', expected: 'KHÍ NHẠC' },
      { term: '楽団', reading: 'がくだん', expected: 'NHẠC ĐOÀN' },
      { term: '楽士', reading: 'がくし', expected: 'NHẠC SĨ' },
      { term: '音楽家', reading: 'おんがくか', expected: 'ÂM NHẠC GIA' },
      { term: '弦楽', reading: 'げんがく', expected: 'HUYỀN NHẠC' },
      { term: '管弦楽', reading: 'かんげいがく', expected: 'QUẢN HUYỀN NHẠC' },
      { term: '雅楽', reading: 'ががく', expected: 'NHÃ NHẠC' },
      { term: '娯楽', reading: 'ごらく', expected: 'NGU LẠC' },
      { term: '極楽', reading: 'ごくらく', expected: 'CỰC LẠC' },
      { term: '安楽', reading: 'あんらく', expected: 'AN LẠC' },
      { term: '快楽', reading: 'かいらく', expected: 'KHOÁI LẠC' },
      { term: '享楽', reading: 'きょうらく', expected: 'HƯỞNG LẠC' },
      { term: '楽観', reading: 'らっかん', expected: 'LẠC QUAN' },
      { term: '哀楽', reading: 'あいらく', expected: 'AI LẠC' },
      { term: '楽土', reading: 'らくど', expected: 'LẠC THỔ' },
      { term: '歓楽', reading: 'かんらく', expected: 'HOAN LẠC' },

      // Từ vựng chữ 易 (DỊCH vs DỊ)
      { term: '交易', reading: 'こうえき', expected: 'GIAO DỊCH' },
      { term: '変易', reading: 'へんえき', expected: 'BIẾN DỊCH' },
      { term: '安易', reading: 'あんい', expected: 'AN DỊ' },
      { term: '簡易', reading: 'かんい', expected: 'GIẢN DỊ' },
      { term: '平易', reading: 'へいい', expected: 'BÌNH DỊ' },
      { term: '難易', reading: 'なんい', expected: 'NAN DỊ' },

      // Từ vựng chữ 悪 (ÁC vs Ố)
      { term: '悪意', reading: 'あくい', expected: 'ÁC Ý' },
      { term: '悪化', reading: 'あっか', expected: 'ÁC HÓA' },
      { term: '悪魔', reading: 'あくま', expected: 'ÁC MA' },
      { term: '悪事', reading: 'あくじ', expected: 'ÁC SỰ' },
      { term: '善悪', reading: 'ぜんあく', expected: 'THIỆN ÁC' },
      { term: '罪悪', reading: 'ざいあく', expected: 'TỘI ÁC' },
      { term: '凶悪', reading: 'きょうあく', expected: 'HUNG ÁC' },
      { term: '険悪', reading: 'けんあく', expected: 'HIỂM ÁC' },
      { term: '最悪', reading: 'さいあく', expected: 'TỐI ÁC' },
      { term: '悪天候', reading: 'あくてんこう', expected: 'ÁC THIÊN HẬU' },
      { term: '悪循環', reading: 'あくじゅんかん', expected: 'ÁC TUẦN HOÀN' },
      { term: '悪寒', reading: 'おかん', expected: 'Ố HÀN' },
      { term: '悪感', reading: 'おかん', expected: 'Ố CẢM' },
      { term: '嫌悪', reading: 'けんお', expected: 'HIỂM Ố' },
      { term: '憎悪', reading: 'ぞうお', expected: 'TĂNG Ố' },

      // Từ vựng chữ 説 (THUYẾT vs THUẾ)
      { term: '小説', reading: 'しょうせつ', expected: 'TIỂU THUYẾT' },
      { term: '説明', reading: 'せつめい', expected: 'THUYẾT MINH' },
      { term: '伝説', reading: 'でんせつ', expected: 'TRUYỀN THUYẾT' },
      { term: '説得', reading: 'せっとく', expected: 'THUYẾT ĐẮC' },
      { term: '演説', reading: 'えんぜつ', expected: 'DIỄN THUYẾT' },
      { term: '学説', reading: 'がくせつ', expected: 'HỌC THUYẾT' },
      { term: '逆説', reading: 'ぎゃくせつ', expected: 'NGHỊCH THUYẾT' },
      { term: '解説', reading: 'かいせつ', expected: 'GIẢI THUYẾT' },
      { term: '諸説', reading: 'しょせつ', expected: 'CHƯ THUYẾT' },
      { term: '説教', reading: 'せっきょう', expected: 'THUYẾT GIÁO' },
      { term: '論説', reading: 'ろんせつ', expected: 'LUẬN THUYẾT' },
      { term: '遊説', reading: 'ゆうぜい', expected: 'DU THUẾ' },

      // Từ vựng chữ 画 (HOẠCH vs HỌA)
      { term: '計画', reading: 'けいかく', expected: 'KẾ HOẠCH' },
      { term: '企画', reading: 'きかく', expected: 'XÍ HOẠCH' },
      { term: '区画', reading: 'くかく', expected: 'KHU HOẠCH' },
      { term: '画策', reading: 'かくさく', expected: 'HOẠCH SÁCH' },
      { term: '映画', reading: 'えいが', expected: 'ÁNH HỌA' },
      { term: '画面', reading: 'がめん', expected: 'HỌA DIỆN' },
      { term: '画家', reading: 'がか', expected: 'HỌA GIA' },
      { term: '絵画', reading: 'かいが', expected: 'HỘI HỌA' },
      { term: '漫画', reading: 'まんが', expected: 'MẠN HỌA' },
      { term: '画数', reading: 'かくすう', expected: 'HỌA SỐ' },
      { term: '版画', reading: 'はんが', expected: 'BẢN HỌA' },
      { term: '原画', reading: 'げんが', expected: 'NGUYÊN HỌA' },
      { term: '作画', reading: 'さくが', expected: 'TÁC HỌA' },
      { term: '図画', reading: 'ずが', expected: 'ĐỒ HỌA' },
      { term: '洋画', reading: 'ようが', expected: 'DƯƠNG HỌA' },
      { term: '動画', reading: 'どうが', expected: 'ĐỘNG HỌA' },
      { term: '壁画', reading: 'へきが', expected: 'BÍCH HỌA' },

      // Từ vựng chữ 分 (PHẦN vs PHÂN)
      { term: '部分', reading: 'ぶぶん', expected: 'BỘ PHẦN' },
      { term: '身分', reading: 'みぶん', expected: 'THÂN PHẬN' },
      { term: '本分', reading: 'ほんぶん', expected: 'BỔN PHẬN' },
      { term: '成分', reading: 'せいぶん', expected: 'THÀNH PHẦN' },
      { term: '余分', reading: 'よぶん', expected: 'DƯ PHẦN' },
      { term: '分野', reading: 'ぶんや', expected: 'PHÂN DÃ' },
      { term: '分析', reading: 'ぶんせき', expected: 'PHÂN TÍCH' },
      { term: '自分', reading: 'じぶん', expected: 'TỰ PHÂN' },
      { term: '気分', reading: 'きぶん', expected: 'KHÍ PHÂN' },
      { term: '十分', reading: 'じゅうぶん', expected: 'THẬP PHÂN' },
      { term: '半分', reading: 'はんぶん', expected: 'BÁN PHÂN' },
      { term: '水分', reading: 'すいぶん', expected: 'THỦY PHÂN' },
      { term: '塩分', reading: 'えんぶん', expected: 'DIÊM PHÂN' },
      { term: '分散', reading: 'ぶんさん', expected: 'PHÂN TÁN' },
      { term: '分割', reading: 'ぶんかつ', expected: 'PHÂN CÁT' },
      { term: '分配', reading: 'ぶんぱい', expected: 'PHÂN PHỐI' },
      { term: '分離', reading: 'ぶんり', expected: 'PHÂN LY' },
      { term: '分類', reading: 'ぶんるい', expected: 'PHÂN LOẠI' },
      { term: '分解', reading: 'ぶんかい', expected: 'PHÂN GIẢI' },

      // Từ vựng chữ 降 (HÀNG vs GIÁNG)
      { term: '降伏', reading: 'こうふく', expected: 'HÀNG PHỤC' },
      { term: '投降', reading: 'とうこう', expected: 'ĐẦU HÀNG' },
      { term: '降下', reading: 'こうか', expected: 'GIÁNG HẠ' },
      { term: '降水', reading: 'こうすい', expected: 'GIÁNG THỦY' },
      { term: '降雪', reading: 'こうせつ', expected: 'GIÁNG TUYẾT' },
      { term: '降雨', reading: 'こうう', expected: 'GIÁNG VŨ' },
      { term: '昇降', reading: 'しょうこう', expected: 'THĂNG GIÁNG' },
      { term: '降臨', reading: 'こうりん', expected: 'GIÁNG LÂM' },

      // Từ vựng chữ 処 (XỬ vs XỨ)
      { term: '処理', reading: 'しょり', expected: 'XỬ LÝ' },
      { term: '処置', reading: 'しょち', expected: 'XỬ TRÍ' },
      { term: '処分', reading: 'しょぶん', expected: 'XỬ PHÂN' },
      { term: '処方', reading: 'しょほう', expected: 'XỬ PHƯƠNG' },
      { term: '対処', reading: 'たいしょ', expected: 'ĐỐI XỬ' },
      { term: '善処', reading: 'ぜんしょ', expected: 'THIỆN XỬ' },
      { term: '処罰', reading: 'しょばつ', expected: 'XỬ PHẠT' },
      { term: '苦処', reading: 'くしょ', expected: 'KHỔ XỨ' },
      { term: '処々', reading: 'しょしょ', expected: 'XỨ XỨ' },
      { term: '出処', reading: 'しゅっしょ', expected: 'XUẤT XỨ' },

      // Từ vựng chữ 著 (TRỨ vs TRƯỚC)
      { term: '著名', reading: 'ちょめい', expected: 'TRỨ DANH' },
      { term: '著明', reading: 'ちょめい', expected: 'TRỨ MINH' },
      { term: '顕著', reading: 'けんちょ', expected: 'HIỂN TRỨ' },
      { term: '著書', reading: 'ちょしょ', expected: 'TRƯỚC THƯ' },
      { term: '著者', reading: 'ちょしゃ', expected: 'TRƯỚC GIẢ' },
      { term: '共著', reading: 'きょうちょ', expected: 'CỘNG TRƯỚC' },
      { term: '原著', reading: 'げんちょ', expected: 'NGUYÊN TRƯỚC' },

      // Từ vựng chữ 卒 (TỐT vs THỐT)
      { term: '卒業', reading: 'そつぎょう', expected: 'TỐT NGHIỆP' },
      { term: '兵卒', reading: 'へいそつ', expected: 'BINH TỐT' },
      { term: '卒中', reading: 'そっちゅう', expected: 'TỐT TRUNG' },
      { term: '卒倒', reading: 'そっとう', expected: 'THỐT ĐẢO' },
      { term: '卒然', reading: 'そつぜん', expected: 'THỐT NHIÊN' },

      // Từ vựng chữ 質 (CHẤT vs CHÍ)
      { term: '質問', reading: 'しつもん', expected: 'CHẤT VẤN' },
      { term: '品質', reading: 'ひんしつ', expected: 'PHẨM CHẤT' },
      { term: '性質', reading: 'せいしつ', expected: 'TÍNH CHẤT' },
      { term: '物質', reading: 'ぶっしつ', expected: 'VẬT CHẤT' },
      { term: '本質', reading: 'ほんしつ', expected: 'BẢN CHẤT' },
      { term: '素質', reading: 'そしつ', expected: 'TỐ CHẤT' },
      { term: '人質', reading: 'ひとじち', expected: 'NHÂN CHÍ' },

      // Từ vựng chữ 創 (SÁNG vs THƯƠNG)
      { term: '創造', reading: 'そうぞう', expected: 'SÁNG TẠO' },
      { term: '創立', reading: 'そうりつ', expected: 'SÁNG LẬP' },
      { term: '創作', reading: 'そうさく', expected: 'SÁNG TÁC' },
      { term: '独創', reading: 'どくそう', expected: 'ĐỘC SÁNG' },
      { term: '創業', reading: 'そうぎょう', expected: 'SÁNG NGHIỆP' },
      { term: '創傷', reading: 'そうしょう', expected: 'THƯƠNG THƯƠNG' },

      // Từ vựng chữ 丁
      { term: '丁寧', reading: 'ていねい', expected: 'ĐINH NINH' },
      { term: '丁目', reading: 'ちょうめ', expected: 'ĐINH MỤC' },
      { term: '丁度', reading: 'ちょうど', expected: 'ĐINH ĐỘ' },
      { term: '装丁', reading: 'そうてい', expected: 'TRANG ĐINH' },

      // Từ vựng chữ 読 (ĐỘC vs ĐẬU)
      { term: '読書', reading: 'どくしょ', expected: 'ĐỘC THƯ' },
      { term: '読解', reading: 'どっかい', expected: 'ĐỘC GIẢI' },
      { term: '読者', reading: 'どくしゃ', expected: 'ĐỘC GIẢ' },
      { term: '音読', reading: 'おんどく', expected: 'ÂM ĐỘC' },
      { term: '訓読', reading: 'くんどく', expected: 'HUẤN ĐỘC' },
      { term: '朗読', reading: 'ろうどく', expected: 'LÃNG ĐỘC' },
      { term: '句読', reading: 'くとう', expected: 'CÂU ĐẬU' },

      // Từ vựng chữ 否 (PHỦ vs BĨ)
      { term: '否定', reading: 'ひてい', expected: 'PHỦ ĐỊNH' },
      { term: '拒否', reading: 'きょひ', expected: 'CỰ PHỦ' },
      { term: '安否', reading: 'あんぴ', expected: 'AN PHỦ' },
      { term: '賛否', reading: 'さんぴ', expected: 'TÁN PHỦ' },
      { term: '否認', reading: 'ひにん', expected: 'PHỦ NHẬN' },
      { term: '否決', reading: 'ひけつ', expected: 'PHỦ QUYẾT' },
      { term: '運否', reading: 'うんぴ', expected: 'VẬN BĨ' },

      // Từ vựng chữ 塞 (TẮC vs TÁI)
      { term: '閉塞', reading: 'へいそく', expected: 'BẾ TẮC' },
      { term: '梗塞', reading: 'こうそく', expected: 'NGẠNH TẮC' },
      { term: '要塞', reading: 'ようさい', expected: 'YẾU TÁI' },
      { term: '塞翁', reading: 'さいおう', expected: 'TÁI ÔNG' },

      // Từ vựng chữ 仮 (GIẢ vs GIÁ)
      { term: '仮名', reading: 'かな', expected: 'GIẢ DANH' },
      { term: '仮定', reading: 'かてい', expected: 'GIẢ ĐỊNH' },
      { term: '仮説', reading: 'かせつ', expected: 'GIẢ THUYẾT' },
      { term: '仮眠', reading: 'かみん', expected: 'GIẢ MIÊN' },
      { term: '仮面', reading: 'かめん', expected: 'GIẢ DIỆN' },
      { term: '休暇', reading: 'きゅうか', expected: 'HƯU GIÁ' },

      // Từ vựng chữ 正 (CHÍNH vs CHÁNH)
      { term: '正確', reading: 'せいかく', expected: 'CHÍNH XÁC' },
      { term: '正式', reading: 'せいしき', expected: 'CHÍNH THỨC' },
      { term: '正直', reading: 'しょうじき', expected: 'CHÍNH TRỰC' },
      { term: '正義', reading: 'せいぎ', expected: 'CHÍNH NGHĨA' },
      { term: '正当', reading: 'せいとう', expected: 'CHÍNH ĐƯƠNG' },
      { term: '正解', reading: 'せいかい', expected: 'CHÍNH GIẢI' },
      { term: '正面', reading: 'しょうめん', expected: 'CHÍNH DIỆN' },
      { term: '修正', reading: 'しゅうせい', expected: 'TU CHÍNH' },
      { term: '是正', reading: 'ぜせい', expected: 'THỊ CHÍNH' },
      { term: '訂正', reading: 'ていせい', expected: 'ĐÍNH CHÍNH' },
      { term: '改正', reading: 'かいせい', expected: 'CẢI CHÍNH' },
      { term: '不正', reading: 'ふせい', expected: 'BẤT CHÍNH' },
      { term: '正月', reading: 'しょうがつ', expected: 'CHÁNH NGUYỆT' },

      // Từ vựng chữ 生
      { term: '先生', reading: 'せんせい', expected: 'TIÊN SINH' },
      { term: '生活', reading: 'せいかつ', expected: 'SINH HOẠT' },
      { term: '生産', reading: 'せいさん', expected: 'SINH SẢN' },
      { term: '生命', reading: 'せいめい', expected: 'SINH MỆNH' },
      { term: '生徒', reading: 'せいと', expected: 'SINH ĐỒ' },
      { term: '生年月日', reading: 'せいねんがっぴ', expected: 'SINH NIÊN NGUYỆT NHẬT' },
      { term: '誕生', reading: 'たんじょう', expected: 'ĐẢN SINH' },
      { term: '一生', reading: 'いっしょう', expected: 'NHẤT SINH' },
      { term: '発生', reading: 'はっせい', expected: 'PHÁT SINH' },
      { term: '生存', reading: 'せいぞん', expected: 'SINH TỒN' },
      { term: '生物', reading: 'せいぶつ', expected: 'SINH VẬT' },
      { term: '生涯', reading: 'しょうがい', expected: 'SINH NHAI' },
      { term: '衛生', reading: 'えいせい', expected: 'VỆ SINH' },
      { term: '再生', reading: 'さいせい', expected: 'TÁI SINH' },

      // Từ vựng chữ 伝 (TRUYỀN vs TRUYỆN)
      { term: '伝統', reading: 'でんとう', expected: 'TRUYỀN THỐNG' },
      { term: '宣伝', reading: 'せんでん', expected: 'TUYÊN TRUYỀN' },
      { term: '伝言', reading: 'でんごん', expected: 'TRUYỀN NGÔN' },
      { term: '伝染', reading: 'でんせん', expected: 'TRUYỀN NHIỄM' },
      { term: '遺伝', reading: 'いでん', expected: 'DI TRUYỀN' },
      { term: '伝達', reading: 'でんたつ', expected: 'TRUYỀN ĐẠT' },
      { term: '自伝', reading: 'じでん', expected: 'TỰ TRUYỆN' },
      { term: '伝記', reading: 'でんき', expected: 'TRUYỆN KÝ' },
      { term: '評伝', reading: 'ひょうでん', expected: 'BÌNH TRUYỆN' },

      // Từ vựng chữ 担
      { term: '担当', reading: 'たんとう', expected: 'ĐẢM ĐƯƠNG' },
      { term: '担保', reading: 'たんぽ', expected: 'ĐẢM BẢO' },
      { term: '負担', reading: 'ふたん', expected: 'PHỤ ĐẢM' },
      { term: '分担', reading: 'ぶんたん', expected: 'PHÂN ĐẢM' },
      { term: '担任', reading: 'たんにん', expected: 'ĐẢM NHIỆM' },

      // Từ vựng chữ 結
      { term: '結果', reading: 'けっか', expected: 'KẾT QUẢ' },
      { term: '結論', reading: 'けつろん', expected: 'KẾT LUẬN' },
      { term: '結婚', reading: 'けっこん', expected: 'KẾT HÔN' },
      { term: '結成', reading: 'けっせい', expected: 'KẾT THÀNH' },
      { term: '結末', reading: 'けつまつ', expected: 'KẾT MẠT' },
      { term: '終結', reading: 'しゅうけつ', expected: 'CHUNG KẾT' },
      { term: '締結', reading: 'ていけつ', expected: 'ĐẾ KẾT' },
      { term: '団結', reading: 'だんけつ', expected: 'ĐOÀN KẾT' },
      { term: '結合', reading: 'けつごう', expected: 'KẾT HỢP' },

      // Từ vựng chữ 便
      { term: '便利', reading: 'べんり', expected: 'TIỆN LỢI' },
      { term: '不便', reading: 'ふべん', expected: 'BẤT TIỆN' },
      { term: '便益', reading: 'べんえき', expected: 'TIỆN ÍCH' },
      { term: '郵便', reading: 'ゆうびん', expected: 'BƯU TIỆN' },
      { term: '船便', reading: 'ふなびん', expected: 'THUYỀN TIỆN' },
      { term: '航空便', reading: 'こうくうびん', expected: 'HÀNG KHÔNG TIỆN' },

      // Từ vựng chữ 復 (PHỤC)
      { term: '回復', reading: 'かいふく', expected: 'HỒI PHỤC' },
      { term: '復習', reading: 'ふくしゅう', expected: 'PHỤC TẬP' },
      { term: '復活', reading: 'ふっかつ', expected: 'PHỤC HOẠT' },
      { term: '復帰', reading: 'ふっき', expected: 'PHỤC QUY' },
      { term: '復興', reading: 'ふっこう', expected: 'PHỤC HƯNG' },
      { term: '復旧', reading: 'ふっきゅう', expected: 'PHỤC CỰU' },
      { term: '往復', reading: 'おうふく', expected: 'VÃNG PHỤC' },

      // Từ vựng chữ 予 & 約 & 要 & 番
      { term: '条約', reading: 'じょうやく', expected: 'ĐIỀU ƯỚC' },
      { term: '節約', reading: 'せつやく', expected: 'TIẾT ƯỚC' },
      { term: '契約', reading: 'けいやく', expected: 'KHẾ ƯỚC' },
      { term: '婚約', reading: 'こんやく', expected: 'HÔN ƯỚC' },
      { term: '誓約', reading: 'せいやく', expected: 'THỆ ƯỚC' },
      { term: '予習', reading: 'よしゅう', expected: 'DỰ TẬP' },
      { term: '予定', reading: 'よてい', expected: 'DỰ ĐỊNH' },
      { term: '予感', reading: 'よかん', expected: 'DỰ CẢM' },
      { term: '予算', reading: 'よさん', expected: 'DỰ TOÁN' },
      { term: '予備', reading: 'よび', expected: 'DỰ BỊ' },
      { term: '予測', reading: 'よそく', expected: 'DỰ TRẮC' },
      { term: '予期', reading: 'よき', expected: 'DỰ KỲ' },
      { term: '予防', reading: 'よぼう', expected: 'DỰ PHÒNG' },
      { term: '天気予報', reading: 'てんきよほう', expected: 'THIÊN KHÍ DỰ BÁO' },
      { term: '要求', reading: 'ようきゅう', expected: 'YÊU CẦU' },
      { term: '要件', reading: 'ようけん', expected: 'YẾU KIỆN' },
      { term: '要素', reading: 'ようそ', expected: 'YẾU TỐ' },
      { term: '要点', reading: 'ようてん', expected: 'YẾU ĐIỂM' },
      { term: '要因', reading: 'よういん', expected: 'YẾU NHÂN' },
      { term: '主要', reading: 'しゅよう', expected: 'CHỦ YẾU' },
      { term: '緊要', reading: 'きんよう', expected: 'KHẨN YẾU' },
      { term: '肝要', reading: 'かんよう', expected: 'CAN YẾU' },
      { term: '番組', reading: 'ばんぐみ', expected: 'PHIÊN TỔ' },
      { term: '一番', reading: 'いちばん', expected: 'NHẤT PHIÊN' },
      { term: '順番', reading: 'じゅんばん', expected: 'THUẬN PHIÊN' },
      { term: '当番', reading: 'とうばん', expected: 'ĐƯƠNG PHIÊN' },
      { term: '交番', reading: 'こうばん', expected: 'GIAO PHIÊN' },
      { term: '交代', reading: 'こうたい', expected: 'GIAO ĐẠI' },

      // Từ vựng chữ 経 & 済 & 学 & 校 & 強
      { term: '経験', reading: 'けいけん', expected: 'KINH NGHIỆM' },
      { term: '経過', reading: 'けいか', expected: 'KINH QUÁ' },
      { term: '経営', reading: 'けいえい', expected: 'KINH DOANH' },
      { term: '経費', reading: 'けいひ', expected: 'KINH PHÍ' },
      { term: '経度', reading: 'けいど', expected: 'KINH ĐỘ' },
      { term: '返済', reading: 'へんさい', expected: 'PHẢN TẾ' },
      { term: '救済', reading: 'きゅうさい', expected: 'CỨU TẾ' },
      { term: '共済', reading: 'きょうさい', expected: 'CỘNG TẾ' },
      { term: '大学', reading: 'だいがく', expected: 'ĐẠI HỌC' },
      { term: '学校', reading: 'がっこう', expected: 'HỌC HIỆU' },
      { term: '学部', reading: 'がくぶ', expected: 'HỌC BỘ' },
      { term: '学者', reading: 'がくしゃ', expected: 'HỌC GIẢ' },
      { term: '学問', reading: 'がくもん', expected: 'HỌC VẤN' },
      { term: '学会', reading: 'がっかい', expected: 'HỌC HỘI' },
      { term: '入学', reading: 'にゅうがく', expected: 'NHẬP HỌC' },
      { term: '留学', reading: 'りゅうがく', expected: 'LƯU HỌC' },
      { term: '見学', reading: 'けんがく', expected: 'KIẾN HỌC' },
      { term: '高校', reading: 'こうこう', expected: 'CAO HIỆU' },
      { term: '中学校', reading: 'ちゅうがっこう', expected: 'TRUNG HỌC HIỆU' },
      { term: '小学校', reading: 'しょうがっこう', expected: 'TIỂU HỌC HIỆU' },
      { term: '校舎', reading: 'こうしゃ', expected: 'HIỆU XÁ' },
      { term: '校歌', reading: 'こうか', expected: 'HIỆU CA' },
      { term: '母校', reading: 'ぼこう', expected: 'MẪU HIỆU' },
      { term: '強調', reading: 'きょうちょう', expected: 'CƯỜNG ĐIỆU' },
      { term: '強力', reading: 'きょうりょく', expected: 'CƯỜNG LỰC' },
      { term: '強度', reading: 'きょうど', expected: 'CƯỜNG ĐỘ' },
      { term: '強制', reading: 'きょうせい', expected: 'CƯỜNG CHẾ' },
      { term: '強硬', reading: 'きょうこう', expected: 'CƯỜNG NGẠNH' },
      { term: '強引', reading: 'ごういん', expected: 'CƯỜNG DẪN' },
      { term: '強盗', reading: 'ごうとう', expected: 'CƯỜNG ĐẠO' },
    ];

    it(`chứa ít nhất 200 từ chuẩn JLPT N5-N1 (hiện có: ${GOLDEN_WORDS.length} từ)`, () => {
      expect(GOLDEN_WORDS.length).toBeGreaterThanOrEqual(200);
    });

    it('đạt 100% âm Hán Việt chính xác cho toàn bộ danh sách Golden', () => {
      let passedCount = 0;
      const failures: Array<{ term: string; reading: string; expected: string; actual: string }> = [];

      for (const item of GOLDEN_WORDS) {
        const actual = getHanVietForWord(item.term, item.reading);
        if (actual === item.expected) {
          passedCount++;
        } else {
          failures.push({
            term: item.term,
            reading: item.reading,
            expected: item.expected,
            actual,
          });
        }
      }

      if (failures.length > 0) {
        console.error('Lỗi phân giải âm Hán Việt:', failures);
      }

      expect(failures).toEqual([]);
      expect(passedCount).toBe(GOLDEN_WORDS.length);
    });
  });

  describe('Acceptance 3: Test thuật toán (kun confidence, review khi thiếu ngoại lệ, biến âm)', () => {
    it('楽しい và 山 cho confidence kun', () => {
      const tanoshii = computeHanViet('楽しい', 'たのしい');
      expect(tanoshii.hanViet).toBe('LẠC');
      expect(tanoshii.confidence).toBe('kun');
      expect(tanoshii.source).toBe('rule');

      const yama = computeHanViet('山', 'やま');
      expect(yama.hanViet).toBe('SƠN');
      expect(yama.confidence).toBe('kun');
      expect(yama.source).toBe('rule');

      const taberu = computeHanViet('食べる', 'たべる');
      expect(taberu.hanViet).toBe('THỰC');
      expect(taberu.confidence).toBe('kun');
      expect(taberu.source).toBe('rule');
    });

    it('từ có chữ đổi âm theo nghĩa không có trong ngoại lệ cho confidence review', () => {
      // Giả sử có từ ghép mới chứa chữ '長' hoặc '重' hoặc '行' mà không nằm trong bảng overrides:
      // Ví dụ: '長身' (ちょうしん: thân dài/chiều cao lớn, không có trong overrides)
      // Chữ '長' thuộc MEANING_DEPENDENT_KANJI -> thuật toán tách được âm On nhưng vì không có trong overrides nên phải gắn cờ review
      const res = computeHanViet('長躯', 'ちょうく');
      expect(res.hanViet).toBe('TRƯỜNG KHU');
      expect(res.confidence).toBe('review');
      expect(res.source).toBe('rule');

      const res2 = computeHanViet('重任', 'じゅうにん');
      // '重任' có trong overrides -> confidence high
      expect(res2.confidence).toBe('high');
      expect(res2.source).toBe('override');
    });

    it('biến âm (âm ngắt sokuon 学校 がっこう, bán đục handakuon 一本 いっぽん) tách đúng', () => {
      const gakko = computeHanViet('学校', 'がっこう');
      expect(gakko.hanViet).toBe('HỌC HIỆU');
      expect(gakko.perKanji).toEqual([
        { kanji: '学', onyomi: 'ガク', hanViet: 'HỌC' },
        { kanji: '校', onyomi: 'コウ', hanViet: 'HIỆU' },
      ]);
      expect(gakko.confidence).toBe('high');

      const ippon = computeHanViet('一本', 'いっぽん');
      expect(ippon.hanViet).toBe('NHẤT BẢN');
      expect(ippon.perKanji).toEqual([
        { kanji: '一', onyomi: 'イチ', hanViet: 'NHẤT' },
        { kanji: '本', onyomi: 'ホン', hanViet: 'BẢN' },
      ]);
      expect(ippon.confidence).toBe('high');
      expect(ippon.source).toBe('rule');
    });
  });
});
