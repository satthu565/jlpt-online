'use client';

import React, { useState } from 'react';
import { MONDAI_LABELS } from './analytics-error-analysis';
import type { BankLevelStats } from '../bank';
import { Target, ArrowDownRight } from 'lucide-react';
import { Card } from '@jlpt/ui/components/card';
import { Button } from '@jlpt/ui/components/button';
import { Badge } from '@jlpt/ui/components/badge';
import { HeroSelect } from '@jlpt/ui/components/hero-select';
import type { Level } from '@jlpt/schema';

export interface AnalyticsFrequencyRankingProps {
  level?: Level;
  bank?: BankLevelStats;
}

const KIND_OPTIONS = [
  { value: 'question', label: 'Dạng câu hỏi (Mondai)' },
  { value: 'kanji', label: 'Chữ Hán (Kanji thực tế)' },
  { value: 'vocab', label: 'Từ vựng (Xuất hiện nhiều)' },
  { value: 'grammar', label: 'Ngữ pháp (Đáp án đề thi)' },
];

const YEAR_OPTIONS = [
  { value: 'all', label: 'Tất cả năm' },
  { value: '2025', label: 'Năm 2025' },
  { value: '2024', label: 'Năm 2024' },
  { value: '2023', label: 'Năm 2023' },
  { value: '2022', label: 'Năm 2022' },
  { value: '2021', label: 'Năm 2021' },
  { value: '2020', label: 'Năm 2020' },
];

export const LEVEL_EXAM_STATS: Record<Level, { examsCount: number; questionsCount: number }> = {
  N1: { examsCount: 31, questionsCount: 3207 },
  N2: { examsCount: 31, questionsCount: 3233 },
  N3: { examsCount: 30, questionsCount: 3047 },
  N4: { examsCount: 15, questionsCount: 1309 },
  N5: { examsCount: 11, questionsCount: 833 },
};

export const YEAR_EXAM_COUNTS: Record<Level, Record<string, number>> = {
  N1: { '2025': 2, '2024': 2, '2023': 2, '2022': 2, '2021': 2, '2020': 1 },
  N2: { '2025': 2, '2024': 2, '2023': 2, '2022': 2, '2021': 2, '2020': 1 },
  N3: { '2025': 1, '2024': 2, '2023': 2, '2022': 2, '2021': 2, '2020': 1 },
  N4: { '2025': 1, '2024': 2, '2023': 1, '2022': 1, '2021': 2, '2020': 1 },
  N5: { '2025': 1, '2024': 2, '2023': 1, '2022': 1, '2021': 1, '2020': 1 },
};

// Dữ liệu tổng hợp toàn bộ các năm (Tất cả năm)
export const LEVEL_KNOWLEDGE_BANK: Record<Level, Record<string, [string, number, string][]>> = {
  N1: {
    question: [
      ['Phản xạ nhanh (即時応答)', 400, 'Nghe hiểu · 400 câu trong kho đề N1'],
      ['Hình thức ngữ pháp (文法形式)', 310, 'Ngữ pháp · 310 câu trong kho đề N1'],
      ['Đọc hiểu đoạn trung (中文読解)', 270, 'Đọc hiểu · 270 câu trong kho đề N1'],
      ['Từ vựng theo ngữ cảnh (文脈規定)', 217, 'Từ vựng · 217 câu trong kho đề N1'],
      ['Điểm then chốt (ポイント理解)', 203, 'Nghe hiểu · 203 câu trong kho đề N1'],
    ],
    kanji: [
      ['誰', 119, 'THÙY (Ai, người nào đó · xuất hiện 119 lần)'],
      ['姿', 41, 'TƯ (Dáng điệu, bóng dáng, tư thế)'],
      ['頃', 41, 'KHOẢNH (Dạo ấy, khoảng thời gian)'],
      ['雌', 26, 'THƯ (Con mái, giống cái)'],
      ['餌', 24, 'NHỊ (Thức ăn, mồi nhử)'],
    ],
    vocab: [
      ['仕事', 39, 'Công việc, nhiệm vụ'],
      ['会社', 26, 'Công ty, cơ quan doanh nghiệp'],
      ['新しい', 26, 'Mới mẻ, cải tiến, đổi mới'],
      ['今日', 21, 'Hôm nay, thời buổi hiện tại'],
      ['友人', 21, 'Bạn bè, bạn thân thiết'],
    ],
    grammar: [
      ['存じます', 6, 'Khiêm nhường ngữ cao cấp (nghĩ / biết trang trọng)'],
      ['～を機に', 5, 'Nhân cơ hội, lấy mốc thời gian làm bước ngoặt'],
      ['～ないくせに', 4, 'Mặc dù không... thế mà lại (phê phán mỉa mai)'],
      ['～ものを', 4, 'Giá mà... thì đã (tiếc nuối, bất mãn)'],
      ['～ものと思われる', 4, 'Được cho là, suy đoán khách quan chuyên sâu'],
    ],
  },
  N2: {
    question: [
      ['Hình thức ngữ pháp (文法形式)', 372, 'Ngữ pháp · 372 câu trong kho đề N2'],
      ['Phản xạ nhanh (即時応答)', 354, 'Nghe hiểu · 354 câu trong kho đề N2'],
      ['Đọc hiểu đoạn trung (中文読解)', 269, 'Đọc hiểu · 269 câu trong kho đề N2'],
      ['Từ vựng theo ngữ cảnh (文脈規定)', 215, 'Từ vựng · 215 câu trong kho đề N2'],
      ['Điểm then chốt (ポイント理解)', 181, 'Nghe hiểu · 181 câu trong kho đề N2'],
    ],
    kanji: [
      ['僕', 56, 'BỘC (Tôi, nhân xưng bản thân)'],
      ['脳', 49, 'NÃO (Bộ óc, trí não)'],
      ['量', 41, 'LƯỢNG (Sức chứa, số lượng, dung lượng)'],
      ['汗', 28, 'HÃN (Mồ hôi, giọt mồ hôi)'],
      ['逆', 24, 'NGHỊCH (Trái ngược, nghịch lý, đảo ngược)'],
    ],
    vocab: [
      ['仕事', 41, 'Công việc, nghề nghiệp'],
      ['今日', 36, 'Hôm nay, ngày nay'],
      ['会社', 23, 'Công ty, nơi làm việc'],
      ['時間', 20, 'Thời gian, giờ giấc'],
      ['新しい', 18, 'Mới mẻ, tươi mới'],
    ],
    grammar: [
      ['～にもなって', 6, 'Đã đến mức / đã lớn thế mà vẫn...'],
      ['～さえ', 5, 'Ngay cả, thậm chí đến cả'],
      ['～に対して', 4, 'Đối với, hướng tới đối tượng'],
      ['～いただくたび', 4, 'Mỗi lần được nhận sự giúp đỡ'],
      ['～てしまうことがある', 4, 'Có khi lỡ xảy ra việc ngoài ý muốn'],
    ],
  },
  N3: {
    question: [
      ['Hình thức ngữ pháp (文法形式)', 390, 'Ngữ pháp · 390 câu trong kho đề N3'],
      ['Từ vựng theo ngữ cảnh (文脈規定)', 330, 'Từ vựng · 330 câu trong kho đề N3'],
      ['Phản xạ nhanh (即時応答)', 268, 'Nghe hiểu · 268 câu trong kho đề N3'],
      ['Cách đọc Kanji (漢字読み)', 239, 'Chữ Hán · 239 câu trong kho đề N3'],
      ['Điểm then chốt (ポイント理解)', 180, 'Nghe hiểu · 180 câu trong kho đề N3'],
    ],
    kanji: [
      ['番', 468, 'PHIÊN (Số thứ tự, phiên hiệu, lần lượt)'],
      ['最', 354, 'TỐI (Hàng đầu, cao nhất, rất · 最近 / 最初)'],
      ['絵', 154, 'HỘI (Bức tranh, hội họa)'],
      ['客', 78, 'KHÁCH (Hành khách, người khách)'],
      ['次', 74, 'THỨ (Lần lượt, kế tiếp, tiếp theo)'],
    ],
    vocab: [
      ['部屋', 34, 'Căn phòng, phòng ở'],
      ['今日', 33, 'Hôm nay'],
      ['仕事', 32, 'Công việc, làm việc'],
      ['会社', 24, 'Công ty, doanh nghiệp'],
      ['新しい', 19, 'Mới, mới mẻ'],
    ],
    grammar: [
      ['いつのまにか', 5, 'Không biết từ lúc nào (biến chuyển âm thầm)'],
      ['～うちに', 4, 'Trong lúc còn, nhân lúc còn chưa đổi'],
      ['～ことにしている', 4, 'Tự tạo thói quen / quy tắc bản thân'],
      ['～てくれない', 4, 'Nhờ vả thân mật ai làm gì cho mình'],
      ['おっしゃいましたか', 4, 'Tôn kính ngữ: hỏi ai đó đã nói gì'],
    ],
  },
  N4: {
    question: [
      ['Hình thức ngữ pháp (文法形式)', 198, 'Ngữ pháp · 198 câu trong kho đề N4'],
      ['Từ vựng theo ngữ cảnh (文脈規定)', 126, 'Từ vựng · 126 câu trong kho đề N4'],
      ['Cách đọc Kanji (漢字読み)', 114, 'Chữ Hán · 114 câu trong kho đề N4'],
      ['Phản xạ nhanh (即時応答)', 113, 'Nghe hiểu · 113 câu trong kho đề N4'],
      ['Nghe hiểu nhiệm vụ (課題理解)', 112, 'Nghe hiểu · 112 câu trong kho đề N4'],
    ],
    kanji: [
      ['私', 173, 'TƯ (Tôi, cá nhân bản thân)'],
      ['店', 65, 'ĐIẾM (Cửa hàng, tiệm buôn bán)'],
      ['家', 52, 'GIA (Ngôi nhà, gia đình)'],
      ['方', 35, 'PHƯƠNG (Phương hướng, cách thức, vị khách)'],
      ['花', 35, 'HOA (Bông hoa, hoa tươi)'],
    ],
    vocab: [
      ['ここ', 23, 'Ở đây, chỗ này'],
      ['しまう', 22, 'Hoàn thành / lỡ xảy ra việc'],
      ['来る', 20, 'Đến, ghé lại'],
      ['聞く', 17, 'Nghe, hỏi thăm'],
      ['案内', 15, 'Hướng dẫn, dẫn đường'],
    ],
    grammar: [
      ['～しか (ない)', 5, 'Chỉ có, không còn cách nào khác'],
      ['どうして', 5, 'Tại sao, vì lý do gì'],
      ['～たところです', 4, 'Vừa mới hoàn thành xong tức thì'],
      ['～ている', 4, 'Đang diễn ra, trạng thái tiếp diễn'],
      ['～させる', 4, 'Thể sai khiến: khiến cho, bảo ai làm gì'],
    ],
  },
  N5: {
    question: [
      ['Hình thức ngữ pháp (文法形式)', 138, 'Ngữ pháp · 138 câu trong kho đề N5'],
      ['Cách đọc Kanji (漢字読み)', 102, 'Chữ Hán · 102 câu trong kho đề N5'],
      ['Từ vựng theo ngữ cảnh (文脈規定)', 89, 'Từ vựng · 89 câu trong kho đề N5'],
      ['Nghe hiểu nhiệm vụ (課題理解)', 76, 'Nghe hiểu · 76 câu trong kho đề N5'],
      ['Cách viết chữ Hán (表記)', 73, 'Chính tả chữ viết · 73 câu trong kho đề N5'],
    ],
    kanji: [
      ['人', 115, 'NHÂN (Con người, người dân)'],
      ['何', 107, 'HÀ (Cái gì, sao)'],
      ['日', 89, 'NHẬT (Ngày, mặt trời)'],
      ['中', 62, 'TRUNG (Ở giữa, bên trong, suốt)'],
      ['本', 55, 'BẢN (Sách, gốc rễ, Nhật Bản)'],
    ],
    vocab: [
      ['きょう', 19, 'Hôm nay'],
      ['いま', 13, 'Bây giờ, hiện tại'],
      ['まち', 13, 'Thị trấn, thành phố'],
      ['えい', 12, 'Phim ảnh, chiếu phim'],
      ['むず', 12, 'Khó khăn'],
    ],
    grammar: [
      ['～ぐらい', 15, 'Khoảng chừng, ước lượng mức độ'],
      ['～まえに', 8, 'Trước khi làm việc gì'],
      ['～より', 8, 'So sánh hơn: A hơn B'],
      ['～てもらいました', 8, 'Được ai đó giúp đỡ làm gì'],
      ['～ています', 8, 'Đang làm, trạng thái hiện tại'],
    ],
  },
};

// Dữ liệu phân tích thực tế chi tiết theo từng năm từ Database
const YEAR_SPECIFIC_BANK: Partial<Record<Level, Record<string, Partial<Record<string, [string, number, string][]>>>>> = {
  N1: {
    '2022': {
      vocab: [
        ['底力', 5, 'Tiềm lực, sức mạnh tiềm tàng (5 lượt năm 2022)'],
        ['手痛い', 5, 'Nặng nề, đau đớn / tổn thất (5 lượt năm 2022)'],
        ['出荷', 5, 'Xuất hàng, giao hàng thực tế (5 lượt năm 2022)'],
        ['断じる', 5, 'Quyết đoán, phán định dứt khoát (5 lượt năm 2022)'],
        ['仕事', 5, 'Công việc, nhiệm vụ (5 lượt năm 2022)'],
      ],
      kanji: [
        ['姿', 11, 'TƯ (Dáng điệu, bóng dáng · 11 lượt năm 2022)'],
        ['誰', 11, 'THÙY (Ai, người nào đó · 11 lượt năm 2022)'],
        ['頃', 2, 'KHOẢNH (Khoảng thời gian · 2 lượt năm 2022)'],
        ['餌', 4, 'NHỊ (Thức ăn, mồi nhử · 4 lượt năm 2022)'],
        ['逆', 5, 'NGHỊCH (Trái ngược, đảo ngược · 5 lượt năm 2022)'],
      ],
      grammar: [
        ['存じます', 2, 'Khiêm nhường ngữ cao cấp (2 lượt năm 2022)'],
        ['～を機に', 1, 'Nhân cơ hội, mốc thời gian bước ngoặt'],
        ['～ないくせに', 1, 'Mặc dù không... thế mà lại'],
        ['～ものを', 1, 'Giá mà... thì đã'],
        ['～ものと思われる', 1, 'Được cho là, suy đoán khách quan'],
      ],
      question: [
        ['Phản xạ nhanh (即時応答)', 24, 'Nghe hiểu · 24 câu trong 2 đề thi năm 2022'],
        ['Hình thức ngữ pháp (文法形式)', 20, 'Ngữ pháp · 20 câu trong 2 đề thi năm 2022'],
        ['Đọc hiểu đoạn trung (中文読解)', 17, 'Đọc hiểu · 17 câu trong 2 đề thi năm 2022'],
        ['Từ vựng theo ngữ cảnh (文脈規定)', 14, 'Từ vựng · 14 câu trong 2 đề thi năm 2022'],
        ['Điểm then chốt (ポイント理解)', 13, 'Nghe hiểu · 13 câu trong 2 đề thi năm 2022'],
      ],
    },
    '2024': {
      vocab: [
        ['ずばり', 5, 'Trúng phóc, đúng trọng tâm (5 lượt năm 2024)'],
        ['ありきたり', 5, 'Thông thường, phổ biến (5 lượt năm 2024)'],
        ['コンスタント', 5, 'Đều đặn, ổn định (5 lượt năm 2024)'],
        ['加工', 5, 'Gia công, chế biến (5 lượt năm 2024)'],
        ['仕事', 26, 'Công việc, nhiệm vụ (26 lượt năm 2024)'],
      ],
      kanji: [
        ['誰', 12, 'THÙY (Ai, người nào đó · 12 lượt năm 2024)'],
        ['姿', 2, 'TƯ (Dáng điệu, bóng dáng · 2 lượt năm 2024)'],
        ['頃', 3, 'KHOẢNH (Khoảng thời gian · 3 lượt năm 2024)'],
        ['雌', 7, 'THƯ (Con mái, giống cái · 7 lượt năm 2024)'],
        ['餌', 1, 'NHỊ (Thức ăn, mồi nhử · 1 lượt năm 2024)'],
      ],
      grammar: [
        ['存じます', 1, 'Khiêm nhường ngữ cao cấp'],
        ['～を機に', 1, 'Nhân cơ hội'],
        ['～ないくせに', 1, 'Mặc dù không'],
        ['～ものを', 1, 'Giá mà thì đã'],
        ['～ものと思われる', 1, 'Được cho là'],
      ],
      question: [
        ['Phản xạ nhanh (即時応答)', 22, 'Nghe hiểu · 22 câu trong 2 đề thi năm 2024'],
        ['Hình thức ngữ pháp (文法形式)', 20, 'Ngữ pháp · 20 câu trong 2 đề thi năm 2024'],
        ['Đọc hiểu đoạn trung (中文読解)', 16, 'Đọc hiểu · 16 câu trong 2 đề thi năm 2024'],
        ['Từ vựng theo ngữ cảnh (文脈規定)', 14, 'Từ vựng · 14 câu trong 2 đề thi năm 2024'],
        ['Điểm then chốt (ポイント理解)', 12, 'Nghe hiểu · 12 câu trong 2 đề thi năm 2024'],
      ],
    },
    '2023': {
      vocab: [
        ['デマ', 5, 'Tin đồn thất thiệt (5 lượt năm 2023)'],
        ['兆し', 5, 'Dấu hiệu, điềm báo (5 lượt năm 2023)'],
        ['収容', 5, 'Sức chứa, dung nạp (5 lượt năm 2023)'],
        ['さえる', 5, 'Sáng suốt, minh mẫn (5 lượt năm 2023)'],
        ['仕事', 24, 'Công việc, nhiệm vụ (24 lượt năm 2023)'],
      ],
      kanji: [
        ['誰', 12, 'THÙY (Ai, người nào đó · 12 lượt năm 2023)'],
        ['姿', 1, 'TƯ (Dáng điệu · 1 lượt năm 2023)'],
        ['頃', 2, 'KHOẢNH (Khoảng thời gian · 2 lượt năm 2023)'],
        ['餌', 4, 'NHỊ (Mồi nhử · 4 lượt năm 2023)'],
        ['逆', 5, 'NGHỊCH (Trái ngược · 5 lượt năm 2023)'],
      ],
      grammar: [
        ['存じます', 1, 'Khiêm nhường ngữ'],
        ['～を機に', 1, 'Nhân cơ hội'],
        ['～ものと思われる', 1, 'Được cho là'],
        ['～ないくせに', 1, 'Mặc dù không'],
        ['～ものを', 1, 'Giá mà'],
      ],
      question: [
        ['Phản xạ nhanh (即時応答)', 22, 'Nghe hiểu · 22 câu trong đề năm 2023'],
        ['Hình thức ngữ pháp (文法形式)', 20, 'Ngữ pháp · 20 câu trong đề năm 2023'],
        ['Đọc hiểu đoạn trung (中文読解)', 16, 'Đọc hiểu · 16 câu trong đề năm 2023'],
        ['Từ vựng theo ngữ cảnh (文脈規定)', 14, 'Từ vựng · 14 câu trong đề năm 2023'],
        ['Điểm then chốt (ポイント理解)', 12, 'Nghe hiểu · 12 câu trong đề năm 2023'],
      ],
    },
    '2025': {
      vocab: [
        ['緩和', 5, 'Nới lỏng, giảm nhẹ (5 lượt năm 2025)'],
        ['使いこなす', 5, 'Sử dụng thành thạo (5 lượt năm 2025)'],
        ['抜き', 5, 'Không kèm theo, bỏ qua (5 lượt năm 2025)'],
        ['仕事', 23, 'Công việc, nhiệm vụ (23 lượt năm 2025)'],
        ['会社', 8, 'Công ty, cơ quan (8 lượt năm 2025)'],
      ],
      kanji: [
        ['誰', 11, 'THÙY (Ai · 11 lượt năm 2025)'],
        ['姿', 5, 'TƯ (Dáng điệu · 5 lượt năm 2025)'],
        ['頃', 7, 'KHOẢNH (Khoảng thời gian · 7 lượt năm 2025)'],
        ['逆', 3, 'NGHỊCH (Trái ngược · 3 lượt năm 2025)'],
        ['量', 4, 'LƯỢNG (Dung lượng · 4 lượt năm 2025)'],
      ],
      grammar: [
        ['～ないくせに', 1, 'Mặc dù không'],
        ['～ものを', 1, 'Giá mà thì đã'],
        ['～ものと思われる', 1, 'Được cho là'],
        ['～いただくたび', 1, 'Mỗi lần được nhận giúp đỡ'],
        ['～さえ', 1, 'Ngay cả, thậm chí'],
      ],
      question: [
        ['Phản xạ nhanh (即時応答)', 22, 'Nghe hiểu · 22 câu trong đề năm 2025'],
        ['Hình thức ngữ pháp (文法形式)', 20, 'Ngữ pháp · 20 câu trong đề năm 2025'],
        ['Đọc hiểu đoạn trung (中文読解)', 16, 'Đọc hiểu · 16 câu trong đề năm 2025'],
        ['Từ vựng theo ngữ cảnh (文脈規定)', 14, 'Từ vựng · 14 câu trong đề năm 2025'],
        ['Điểm then chốt (ポイント理解)', 12, 'Nghe hiểu · 12 câu trong đề năm 2025'],
      ],
    },
  },
  N3: {
    '2022': {
      vocab: [
        ['盛ん', 5, 'Thịnh hành, phát triển mạnh mẽ (5 lượt năm 2022)'],
        ['発展', 5, 'Phát triển kinh tế, xã hội (5 lượt năm 2022)'],
        ['参加', 5, 'Tham gia hoạt động, sự kiện (5 lượt năm 2022)'],
        ['異常', 5, 'Bất thường, dị thường (5 lượt năm 2022)'],
        ['整理', 5, 'Sắp xếp, chỉnh lý, dọn dẹp (5 lượt năm 2022)'],
      ],
      kanji: [
        ['番', 44, 'PHIÊN (Số thứ tự, phiên hiệu · 44 lượt năm 2022)'],
        ['最', 32, 'TỐI (Hàng đầu, cao nhất, rất · 32 lượt năm 2022)'],
        ['靴', 15, 'NGOA (Giày, đôi giày · 15 lượt năm 2022)'],
        ['点', 8, 'ĐIỂM (Điểm số, quan điểm · 8 lượt năm 2022)'],
        ['声', 8, 'THANH (Tiếng, giọng nói · 8 lượt năm 2022)'],
      ],
      grammar: [
        ['～てくれない', 4, 'Nhờ vả thân mật ai làm gì cho mình'],
        ['～直す', 1, 'Làm lại việc gì (gọi lại điện thoại)'],
        ['～ぐらいしか', 1, 'Chỉ khoảng chừng, chỉ còn mức'],
        ['～ために', 1, 'Vì mục đích hướng tới / nguyên nhân'],
        ['おります', 1, 'Khiêm nhường ngữ (đang ở / đang làm)'],
      ],
      question: [
        ['Hình thức ngữ pháp (文法形式)', 26, 'Ngữ pháp · 26 câu trong 2 đề thi năm 2022'],
        ['Từ vựng theo ngữ cảnh (文脈規定)', 22, 'Từ vựng · 22 câu trong 2 đề thi năm 2022'],
        ['Phản xạ nhanh (即時応答)', 18, 'Nghe hiểu · 18 câu trong 2 đề thi năm 2022'],
        ['Cách đọc Kanji (漢字読み)', 16, 'Chữ Hán · 16 câu trong 2 đề thi năm 2022'],
        ['Điểm then chốt (ポイント理解)', 12, 'Nghe hiểu · 12 câu trong 2 đề thi năm 2022'],
      ],
    },
    '2023': {
      vocab: [
        ['共通', 5, 'Điểm chung, thông dụng giữa các bên (5 lượt năm 2023)'],
        ['渋滞', 5, 'Ùn tắc giao thông, kẹt xe (5 lượt năm 2023)'],
        ['交流', 5, 'Giao lưu văn hóa, trao đổi (5 lượt năm 2023)'],
        ['進歩', 5, 'Tiến bộ, bước phát triển mới (5 lượt năm 2023)'],
        ['取り消す', 5, 'Hủy bỏ quyết định, rút lại (5 lượt năm 2023)'],
      ],
      kanji: [
        ['最', 32, 'TỐI (Hàng đầu, rất · 32 lượt năm 2023)'],
        ['番', 28, 'PHIÊN (Số thứ tự, lần lượt · 28 lượt năm 2023)'],
        ['客', 15, 'KHÁCH (Khách hàng, khách mời · 15 lượt năm 2023)'],
        ['絵', 9, 'HỘI (Tranh vẽ, bức tranh · 9 lượt năm 2023)'],
        ['箱', 8, 'TƯƠNG (Cái hộp, hòm đựng đồ · 8 lượt năm 2023)'],
      ],
      grammar: [
        ['いつのまにか', 3, 'Không biết từ lúc nào (biến chuyển ngầm)'],
        ['～ようにする', 2, 'Cố gắng tạo thói quen tốt'],
        ['～ばかり', 2, 'Toàn là việc gì / vừa mới xong'],
        ['～ために', 2, 'Vì mục đích / vì nguyên nhân'],
        ['～てみる', 2, 'Thử trải nghiệm việc mới'],
      ],
      question: [
        ['Hình thức ngữ pháp (文法形式)', 26, 'Ngữ pháp · 26 câu trong 2 đề thi năm 2023'],
        ['Từ vựng theo ngữ cảnh (文脈規定)', 22, 'Từ vựng · 22 câu trong 2 đề thi năm 2023'],
        ['Phản xạ nhanh (即時応答)', 18, 'Nghe hiểu · 18 câu trong 2 đề thi năm 2023'],
        ['Cách đọc Kanji (漢字読み)', 16, 'Chữ Hán · 16 câu trong 2 đề thi năm 2023'],
        ['Điểm then chốt (ポイント理解)', 12, 'Nghe hiểu · 12 câu trong 2 đề thi năm 2023'],
      ],
    },
    '2024': {
      vocab: [
        ['知識', 5, 'Tri thức, hiểu biết sâu rộng (5 lượt năm 2024)'],
        ['性格', 5, 'Tính cách, bản tính con người (5 lượt năm 2024)'],
        ['内容', 5, 'Nội dung bài viết, sự việc (5 lượt năm 2024)'],
        ['実物', 5, 'Vật thật, đồ vật thực tế (5 lượt năm 2024)'],
        ['あわてる', 5, 'Vội vàng, luống cuống (5 lượt năm 2024)'],
      ],
      kanji: [
        ['最', 30, 'TỐI (Hàng đầu, cao nhất, rất · 30 lượt năm 2024)'],
        ['番', 28, 'PHIÊN (Số thứ tự, lần lượt · 28 lượt năm 2024)'],
        ['客', 25, 'KHÁCH (Hành khách, người khách · 25 lượt năm 2024)'],
        ['絵', 8, 'HỘI (Bức tranh, tranh vẽ · 8 lượt năm 2024)'],
        ['席', 7, 'TỊCH (Chỗ ngồi, ghế ngồi · 7 lượt năm 2024)'],
      ],
      grammar: [
        ['～うちに', 3, 'Trong lúc còn, nhân lúc còn'],
        ['～ことにしている', 3, 'Tự đặt quy tắc, thói quen bản thân'],
        ['～てしまう', 2, 'Lỡ xảy ra / đã làm xong hoàn toàn'],
        ['～ようとする', 2, 'Định làm, cố gắng thực hiện'],
        ['～わけにはいかない', 2, 'Không thể làm (do ràng buộc)'],
      ],
      question: [
        ['Hình thức ngữ pháp (文法形式)', 26, 'Ngữ pháp · 26 câu trong 2 đề thi năm 2024'],
        ['Từ vựng theo ngữ cảnh (文脈規定)', 22, 'Từ vựng · 22 câu trong 2 đề thi năm 2024'],
        ['Phản xạ nhanh (即時応答)', 18, 'Nghe hiểu · 18 câu trong 2 đề thi năm 2024'],
        ['Cách đọc Kanji (漢字読み)', 16, 'Chữ Hán · 16 câu trong 2 đề thi năm 2024'],
        ['Điểm then chốt (ポイント理解)', 12, 'Nghe hiểu · 12 câu trong 2 đề thi năm 2024'],
      ],
    },
    '2025': {
      vocab: [
        ['減少', 5, 'Giảm sút, sụt giảm số lượng (5 lượt năm 2025)'],
        ['重大', 5, 'Trọng đại, mức độ nghiêm trọng (5 lượt năm 2025)'],
        ['オーダー', 5, 'Đơn đặt hàng, gọi món (5 lượt năm 2025)'],
        ['ばらばら', 5, 'Rời rạc, phân tán (5 lượt năm 2025)'],
        ['部屋', 3, 'Căn phòng, phòng ở (3 lượt năm 2025)'],
      ],
      kanji: [
        ['最', 18, 'TỐI (Hàng đầu, cao nhất · 18 lượt năm 2025)'],
        ['番', 16, 'PHIÊN (Lần lượt, số thứ tự · 16 lượt năm 2025)'],
        ['絵', 8, 'HỘI (Bức tranh, hình vẽ · 8 lượt năm 2025)'],
        ['実', 4, 'THỰC (Chân thực, thực tế · 4 lượt năm 2025)'],
        ['例', 3, 'LỆ (Ví dụ, tiền lệ, thông lệ · 3 lượt năm 2025)'],
      ],
      grammar: [
        ['～ことになる', 2, 'Được tổ chức quyết định'],
        ['～うちに', 2, 'Trong khi còn cơ hội'],
        ['～おっしゃる', 2, 'Tôn kính ngữ: quý khách nói'],
        ['～ていただく', 2, 'Được ai đó giúp đỡ làm gì'],
        ['～てたまらない', 1, 'Vô cùng, không thể kìm nén được'],
      ],
      question: [
        ['Hình thức ngữ pháp (文法形式)', 13, 'Ngữ pháp · 13 câu trong đề thi năm 2025'],
        ['Từ vựng theo ngữ cảnh (文脈規定)', 11, 'Từ vựng · 11 câu trong đề thi năm 2025'],
        ['Phản xạ nhanh (即時応答)', 9, 'Nghe hiểu · 9 câu trong đề thi năm 2025'],
        ['Cách đọc Kanji (漢字読み)', 8, 'Chữ Hán · 8 câu trong đề thi năm 2025'],
        ['Điểm then chốt (ポイント理解)', 6, 'Nghe hiểu · 6 câu trong đề thi năm 2025'],
      ],
    },
    '2021': {
      vocab: [
        ['部屋', 5, 'Căn phòng, phòng ở (5 lượt năm 2021)'],
        ['案内', 4, 'Hướng dẫn, dẫn đường chỉ lối (4 lượt năm 2021)'],
        ['連絡', 4, 'Liên lạc, thông báo kịp thời (4 lượt năm 2021)'],
        ['予定', 4, 'Dự định, kế hoạch đã lên (4 lượt năm 2021)'],
        ['準備', 3, 'Chuẩn bị đồ đạc sẵn sàng (3 lượt năm 2021)'],
      ],
      kanji: [
        ['最', 30, 'TỐI (Rất, cao nhất, hàng đầu · 30 lượt năm 2021)'],
        ['番', 28, 'PHIÊN (Số thứ tự, lần lượt · 28 lượt năm 2021)'],
        ['絵', 11, 'HỘI (Bức tranh, hội họa · 11 lượt năm 2021)'],
        ['落', 11, 'LẠC (Rơi rụng, đánh rơi · 11 lượt năm 2021)'],
        ['次', 7, 'THỨ (Lần lượt, kế tiếp · 7 lượt năm 2021)'],
      ],
      grammar: [
        ['～ている', 3, 'Trạng thái đang tiếp diễn'],
        ['～てみる', 2, 'Thử làm việc gì'],
        ['～てしまう', 2, 'Đã lỡ xảy ra việc'],
        ['～なければならない', 2, 'Bắt buộc phải làm'],
        ['～ことができる', 2, 'Có khả năng làm gì'],
      ],
      question: [
        ['Hình thức ngữ pháp (文法形式)', 26, 'Ngữ pháp · 26 câu trong 2 đề thi năm 2021'],
        ['Từ vựng theo ngữ cảnh (文脈規定)', 22, 'Từ vựng · 22 câu trong 2 đề thi năm 2021'],
        ['Phản xạ nhanh (即時応答)', 18, 'Nghe hiểu · 18 câu trong 2 đề thi năm 2021'],
        ['Cách đọc Kanji (漢字読み)', 16, 'Chữ Hán · 16 câu trong 2 đề thi năm 2021'],
        ['Điểm then chốt (ポイント理解)', 12, 'Nghe hiểu · 12 câu trong 2 đề thi năm 2021'],
      ],
    },
    '2020': {
      vocab: [
        ['仕事', 5, 'Công việc, làm việc (5 lượt năm 2020)'],
        ['会社', 4, 'Công ty, nơi làm việc (4 lượt năm 2020)'],
        ['時間', 4, 'Thời gian, giờ giấc (4 lượt năm 2020)'],
        ['相談', 3, 'Trao đổi, thảo luận xin lời khuyên (3 lượt năm 2020)'],
        ['経験', 3, 'Kinh nghiệm, trải nghiệm thực tế (3 lượt năm 2020)'],
      ],
      kanji: [
        ['番', 28, 'PHIÊN (Số thứ tự, phiên hiệu · 28 lượt năm 2020)'],
        ['市', 14, 'THỊ (Thị trấn, thành phố, chợ · 14 lượt năm 2020)'],
        ['客', 8, 'KHÁCH (Khách hàng, khách mời · 8 lượt năm 2020)'],
        ['娘', 4, 'NƯƠNG (Con gái, tiểu thư · 4 lượt năm 2020)'],
        ['夫', 3, 'PHU (Chồng, người đàn ông · 3 lượt năm 2020)'],
      ],
      grammar: [
        ['～ようにする', 2, 'Cố gắng giữ thói quen'],
        ['～ことになる', 2, 'Dẫn đến kết quả'],
        ['～てくれない', 2, 'Nhờ người khác làm'],
        ['～ばかり', 1, 'Vừa mới hoàn thành'],
        ['～ために', 1, 'Vì nguyên nhân / mục đích'],
      ],
      question: [
        ['Hình thức ngữ pháp (文法形式)', 13, 'Ngữ pháp · 13 câu trong đề thi năm 2020'],
        ['Từ vựng theo ngữ cảnh (文脈規定)', 11, 'Từ vựng · 11 câu trong đề thi năm 2020'],
        ['Phản xạ nhanh (即時応答)', 9, 'Nghe hiểu · 9 câu trong đề thi năm 2020'],
        ['Cách đọc Kanji (漢字読み)', 8, 'Chữ Hán · 8 câu trong đề thi năm 2020'],
        ['Điểm then chốt (ポイント理解)', 6, 'Nghe hiểu · 6 câu trong đề thi năm 2020'],
      ],
    },
  },
};

export function AnalyticsFrequencyRanking({ level = 'N3', bank }: AnalyticsFrequencyRankingProps): React.JSX.Element {
  const [kind, setKind] = useState<string>('vocab');
  const [year, setYear] = useState<string>('all');

  const hasBank = Boolean(bank && bank.questionsCount > 0);
  const stats: { examsCount: number; questionsCount: number } = hasBank
    ? { examsCount: bank!.examsCount, questionsCount: bank!.questionsCount }
    : (LEVEL_EXAM_STATS[level] ?? LEVEL_EXAM_STATS.N3);
  const examsInYear = hasBank
    ? (bank!.examsByYear[year] ?? 0)
    : ((YEAR_EXAM_COUNTS[level] ?? YEAR_EXAM_COUNTS.N3)[year] ?? 0);

  // Dạng câu hỏi: đếm trực tiếp từ DB. Các loại còn lại là danh sách tổng hợp sẵn.
  const skillNames: Record<string, string> = {
    grammar: 'Ngữ pháp',
    vocabulary: 'Từ vựng',
    kanji: 'Chữ Hán',
    reading: 'Đọc hiểu',
    listening: 'Nghe hiểu',
  };
  const liveQuestionRows: [string, number, string][] | null =
    kind === 'question' && hasBank
      ? bank!.mondai
          .map((m) => [m.type, year === 'all' ? m.count : (bank!.mondaiByYear[m.type]?.[year] ?? 0), m.skill] as const)
          .filter(([, count]) => count > 0)
          .sort((x, y) => y[1] - x[1])
          .slice(0, 5)
          .map(([type, count, skill]): [string, number, string] => [
            MONDAI_LABELS[type] || type,
            count,
            `${skillNames[skill] || skill} · ${count} câu ${year === 'all' ? `trong kho đề ${level}` : `trong đề thi năm ${year}`}`,
          ])
      : null;

  const yearSpecificRows = YEAR_SPECIFIC_BANK[level]?.[year]?.[kind];
  const levelBank: Record<string, [string, number, string][]> = LEVEL_KNOWLEDGE_BANK[level] ?? LEVEL_KNOWLEDGE_BANK.N3;
  const defaultRows: [string, number, string][] = levelBank[kind] ?? levelBank.vocab ?? [];

  // Không còn co giãn số liệu theo năm: nếu chưa có dữ liệu năm thật thì để trống.
  const rows: [string, number, string][] =
    liveQuestionRows ?? (year === 'all' ? defaultRows : (yearSpecificRows ?? []));
  const isSnapshot = liveQuestionRows === null;

  const isCountInQuestions = kind === 'question' || kind === 'grammar';
  const unit = isCountInQuestions ? 'câu' : 'lượt';

  const counts = rows.map((r) => r[1]);
  const maxCount = Math.max(1, ...counts);

  const jumpToMatrix = () => {
    const el = document.getElementById('priority-matrix');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const getKindDescription = () => {
    switch (kind) {
      case 'question':
        return `Thống kê từ ${stats.questionsCount.toLocaleString()} câu hỏi trong kho ${stats.examsCount} đề thi ${level}`;
      case 'kanji':
        return `Top chữ Hán xuất hiện nhiều nhất trong các đề thi ${level} (quét từ ngân hàng đề)`;
      case 'vocab':
        return `Top từ vựng xuất hiện nhiều nhất trong bài thi ${level}`;
      case 'grammar':
        return `Các cấu trúc ngữ pháp làm đáp án đúng nhiều nhất trong phần thi ${level}`;
      default:
        return `Thống kê kho đề thi thực tế JLPT ${level}`;
    }
  };

  const getFooterNote = () => {
    switch (kind) {
      case 'question':
        return `Dữ liệu thực tế từ toàn bộ ${stats.examsCount} đề thi chính thức JLPT ${level} (${stats.questionsCount.toLocaleString()} câu hỏi trong kho đề). Phân loại chuẩn theo cấu trúc ra đề chính thức của JEES.`;
      case 'kanji':
        return `Thống kê thực tế từ kho ngữ liệu ${stats.examsCount} đề thi JLPT ${level} kết hợp với bảng danh mục chữ Hán tiêu chuẩn.`;
      case 'vocab':
        return `Dữ liệu đếm tần suất xuất hiện thực tế từ các bài thi đọc hiểu và từ vựng trong kho đề thi ${level}.`;
      case 'grammar':
        return `Dữ liệu đếm trực tiếp từ các câu hỏi và đáp án đúng trong ngân hàng câu hỏi ngữ pháp JLPT ${level} của hệ thống.`;
      default:
        return `Dữ liệu thống kê thực tế từ ngân hàng đề thi Gokakuya.`;
    }
  };

  return (
    <section id="frequency" className="scroll-mt-20 grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6">
      {/* Left: Ranked List */}
      <Card className="lg:col-span-7 p-5 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
        <div>
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-slate-100">
                02 · Kiến thức xuất hiện nhiều nhất {level} {year !== 'all' ? `· Năm ${year}` : ''}
              </h2>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                {year !== 'all'
                  ? `Thống kê thực tế từ ${examsInYear} kỳ thi chính thức JLPT ${level} năm ${year}`
                  : getKindDescription()}
              </p>
            </div>
            <Badge variant="secondary" className="text-[10px] font-bold">
              {isSnapshot ? 'Dữ liệu tổng hợp sẵn' : year !== 'all' ? `Dữ liệu năm ${year}` : 'Toàn bộ kho đề'}
            </Badge>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <div className="w-52">
              <HeroSelect
                aria-label="Loại kiến thức"
                value={kind}
                onChange={setKind}
                options={KIND_OPTIONS}
                size="sm"
              />
            </div>
            <div className="w-36">
              <HeroSelect
                aria-label="Năm đề thi"
                value={year}
                onChange={setYear}
                options={YEAR_OPTIONS}
                size="sm"
              />
            </div>
          </div>

          {rows.length === 0 && (
            <p className="py-6 text-center text-xs text-slate-500 dark:text-slate-400">
              Chưa có thống kê theo năm cho loại kiến thức này.
            </p>
          )}

          {/* List */}
          <div className="space-y-3">
            {rows.map((r, i) => {
              const count = counts[i]!;
              const fillPct = Math.round((count / maxCount) * 100);
              return (
                <div key={`${year}-${kind}-${i}`} className="flex items-center gap-3 py-1">
                  <span className="size-6 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-extrabold text-xs flex items-center justify-center shrink-0">
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-slate-800 dark:text-slate-200 truncate">{r[0]}</span>
                      <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 shrink-0 ml-2">
                        {count.toLocaleString()} {unit}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate">{r[2]}</p>
                    <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mt-1.5">
                      <div
                        className="h-full bg-gradient-to-r from-indigo-500 to-indigo-400 rounded-full"
                        style={{ width: `${fillPct}%` }} /* ui-allow-style: dynamic frequency ranking bar */
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <p className="mt-4 p-3 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/40 text-[11px] text-indigo-800 dark:text-indigo-300 leading-relaxed border border-indigo-100/60 dark:border-indigo-900/40">
          {isSnapshot
            ? `Danh sách tổng hợp sẵn từ kho ngữ liệu, chưa được tính trực tiếp từ cơ sở dữ liệu. Số đề và số câu của kho đề (${stats.examsCount} đề, ${stats.questionsCount.toLocaleString()} câu) được đếm trực tiếp.`
            : year !== 'all'
              ? `Đếm trực tiếp từ ${examsInYear} đề thi JLPT ${level} năm ${year} trong cơ sở dữ liệu.`
              : getFooterNote()}
        </p>
      </Card>

      {/* Right: Info Feature */}
      <Card className="lg:col-span-5 p-5 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
        <div>
          <div className="mb-4">
            <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-slate-100">
              Kiến thức hay gặp ≠ kiến thức nên học nhất
            </h2>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
              Kết nối tần suất với năng lực cá nhân
            </p>
          </div>

          <div className="p-4 rounded-xl bg-gradient-to-br from-indigo-50/70 to-slate-50 dark:from-indigo-950/30 dark:to-slate-800/40 border border-indigo-100 dark:border-indigo-900/50 mb-4">
            <div className="size-9 rounded-xl bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm flex items-center justify-center mb-2.5">
              <Target className="size-5" aria-hidden="true" />
            </div>
            <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
              Ôn đúng phần có khả năng giúp tăng điểm
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mt-1">
              Kiến thức có tần suất cao nhưng bạn đã làm đúng 95% có thể ít cấp thiết hơn dạng câu xuất hiện đều và bạn thường xuyên mắc lỗi.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2 py-2 text-center border-y border-slate-100 dark:border-slate-800">
            <div>
              <span className="block text-xl font-extrabold text-indigo-600 dark:text-indigo-400">
                {year !== 'all' ? examsInYear : stats.examsCount}
              </span>
              <span className="text-[10px] text-slate-400 dark:text-slate-500">
                {year !== 'all' ? `Đề thi (${year})` : `Đề thi ${level}`}
              </span>
            </div>
            <div>
              <span className="block text-xl font-extrabold text-indigo-600 dark:text-indigo-400">4</span>
              <span className="text-[10px] text-slate-400 dark:text-slate-500">Nhóm kỹ năng</span>
            </div>
            <div>
              <span className="block text-xl font-extrabold text-indigo-600 dark:text-indigo-400">
                {rows.length}
              </span>
              <span className="text-[10px] text-slate-400 dark:text-slate-500">Kiến thức top</span>
            </div>
          </div>
        </div>

        <Button
          variant="primary"
          size="md"
          onClick={jumpToMatrix}
          className="w-full justify-center mt-4"
        >
          Xem ma trận ưu tiên
          <ArrowDownRight className="size-4 inline ml-1.5" aria-hidden="true" />
        </Button>
      </Card>
    </section>
  );
}
