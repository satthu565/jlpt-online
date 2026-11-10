'use client';

import { buildPracticeHref } from '../practice-link';
import { selfReasonLabel } from '../reasons';
import React, { useState, useMemo } from 'react';
import {
  AlertCircle,
  Search,
  RefreshCw,
  Info,
  ArrowRight,
  BookmarkCheck,
} from 'lucide-react';
import Link from 'next/link';
import { Card } from '@jlpt/ui/components/card';
import { Button } from '@jlpt/ui/components/button';
import { Input } from '@jlpt/ui/components/input';
import { HeroSelect } from '@jlpt/ui/components/hero-select';
import type { AttemptRecord, QuestionAttemptRecord } from '../types';
import type { Level } from '@jlpt/schema';
import { MONDAI_LABELS, MONDAI_DIAGNOSTIC_REASONS } from './analytics-error-analysis';

export interface MistakeRecord {
  term: string;
  questionId?: string;
  /** Reason the learner chose for this wrong answer. */
  selfReason?: string;
  /** Japanese question text with the blank marked. */
  stem?: string;
  level?: string;
  skill?: string;
  mondaiType?: string;
  meaning: string;
  wrong: number;
  total: number;
  streak: number;
  last: string;
  source: string;
  reason: string;
  prompt: string;
  selected: string;
  correct: string;
  explain: string;
}

interface MistakeTemplateItem {
  term: string;
  meaning: string;
  baseCount: number;
  errorFactor: number;
  sectionCode: 'language' | 'reading' | 'listening';
  reason: string;
  prompt: string;
  selected: string;
  correct: string;
  explain: string;
}

export const LEVEL_MISTAKE_TEMPLATES: Record<Level, Record<string, MistakeTemplateItem[]>> = {
  N1: {
    grammar: [
      {
        term: '存じます（ぞんじます）',
        meaning: 'Khiêm nhường ngữ cao cấp: nghĩ, biết',
        baseCount: 0.8,
        errorFactor: 1.2,
        sectionCode: 'language',
        reason: 'Nhầm khiêm nhường ngữ với tôn kính ngữ',
        prompt: '先生のご意見をありがたく（　）。',
        selected: 'ご覧に入れます',
        correct: '存じます',
        explain: '存じます là khiêm nhường ngữ của 思います / 知っています. ご覧に入れます nghĩa là cho xem.',
      },
      {
        term: '～を機に（をきに）',
        meaning: 'Nhân cơ hội, lấy mốc thời gian làm bước ngoặt',
        baseCount: 0.75,
        errorFactor: 1.1,
        sectionCode: 'language',
        reason: 'Nhầm với ～を契機に trong văn cảnh trang trọng',
        prompt: '転勤（　）、新しい生活を始めることにした。',
        selected: 'につけて',
        correct: 'を機に',
        explain: '～を機に dùng khi lấy một sự kiện hoặc bước ngoặt thời gian để bắt đầu thay đổi tích cực.',
      },
      {
        term: '～ないくせに',
        meaning: 'Mặc dù không... thế mà lại (phê phán mỉa mai)',
        baseCount: 0.7,
        errorFactor: 1.05,
        sectionCode: 'language',
        reason: 'Bỏ qua sắc thái phê phán, bất mãn',
        prompt: '自分では何も（　）、他人の批判ばかりしている。',
        selected: 'しないものの',
        correct: 'しないくせに',
        explain: '～くせに thể hiện rõ sự mỉa mai, trách cứ người khác khi hai vế đối lập nhau vô lý.',
      },
      {
        term: '～ものを',
        meaning: 'Giá mà... thì đã (tiếc nuối, bất mãn)',
        baseCount: 0.65,
        errorFactor: 0.95,
        sectionCode: 'language',
        reason: 'Nhầm cấu trúc tiếc nuối cuối câu',
        prompt: '一言相談してくれれば、手伝った（　）。',
        selected: 'ものだから',
        correct: 'ものを',
        explain: '～ものを đứng cuối câu diễn tả sự tiếc nuối vì một sự việc thực tế đã không diễn ra như mong đợi.',
      },
    ],
    vocab: [
      {
        term: '友人（ゆうじん）',
        meaning: 'Bạn bè, người bạn thân thiết',
        baseCount: 0.75,
        errorFactor: 1.15,
        sectionCode: 'language',
        reason: 'Dùng nhầm văn cảnh trang trọng / thân mật',
        prompt: '高校時代の（　）と久しぶりに再会した。',
        selected: '味方',
        correct: '友人',
        explain: '友人 dùng trong ngữ cảnh văn viết hoặc trang trọng; 味方 là đồng minh, người đứng về phía mình.',
      },
      {
        term: '措置（そち）',
        meaning: 'Biện pháp, xử lý tình huống',
        baseCount: 0.7,
        errorFactor: 1.1,
        sectionCode: 'language',
        reason: 'Không nhớ cụm kết hợp từ 措置を講じる',
        prompt: '感染拡大を防ぐため、適切な（　）が講じられた。',
        selected: '処置',
        correct: '措置',
        explain: '措置 đi với động từ 講じる (áp dụng biện pháp quy mô tổ chức); 処置 thường dùng cho y tế, xử lý vết thương.',
      },
      {
        term: '妥協（だきょう）',
        meaning: 'Thỏa hiệp, nhượng bộ lẫn nhau',
        baseCount: 0.65,
        errorFactor: 1.0,
        sectionCode: 'language',
        reason: 'Nhầm với 協力 trong đàm phán hợp đồng',
        prompt: '双方の意見が対立し、双方が（　）点を見つけるのは困難だった。',
        selected: '協力',
        correct: '妥協',
        explain: '妥協点 (điểm thỏa hiệp) là cụm từ chuyên dụng trong thương lượng kinh doanh.',
      },
      {
        term: '方針（ほうしん）',
        meaning: 'Phương châm, định hướng hoạt động',
        baseCount: 0.6,
        errorFactor: 0.85,
        sectionCode: 'language',
        reason: 'Nhầm lẫn giữa 方針 và 方策',
        prompt: '会社は今後の方針を全社員に（　）した。',
        selected: '普及',
        correct: '周知',
        explain: '方針 đi với 周知 (làm cho mọi người thấu hiểu định hướng); 普及 dùng cho thiết bị, công nghệ phổ biến.',
      },
    ],
    kanji: [
      {
        term: '誰（スイ・だれ）',
        meaning: 'THÙY · Ai, người nào đó',
        baseCount: 0.85,
        errorFactor: 1.2,
        sectionCode: 'language',
        reason: 'Nhầm âm On スイ và âm Kun だれ',
        prompt: '「誰何」の正しい読み方はどれですか。 1. すいか 2. だれなに 3. さいか 4. たれか',
        selected: 'だれなに',
        correct: 'すいか',
        explain: '誰何 đọc là すいか (hỏi danh tính, xét hỏi ban đêm), chữ 誰 có âm On là スイ.',
      },
      {
        term: '姿（シ・すがた）',
        meaning: 'TƯ · Dáng điệu, bóng dáng, phong thái',
        baseCount: 0.75,
        errorFactor: 1.1,
        sectionCode: 'language',
        reason: 'Nhầm cách đọc âm On khi ghép từ',
        prompt: '「姿勢」の正しい読み方はどれですか。 1. しせい 2. じせい 3. すがたせい 4. しぜい',
        selected: 'じせい',
        correct: 'しせい',
        explain: '姿勢 đọc là しせい (tư thế, thái độ sống), chữ 姿 âm On là シ không có âm đục.',
      },
      {
        term: '頃（ころ・ごろ）',
        meaning: 'KHOẢNH · Dạo ấy, khoảng thời gian',
        baseCount: 0.7,
        errorFactor: 1.0,
        sectionCode: 'language',
        reason: 'Nhầm biến âm đục khi ghép sau danh từ',
        prompt: '「子供の頃」の「頃」の読み方は？',
        selected: 'きょう',
        correct: 'ころ',
        explain: '頃 đứng một mình đọc là ころ; khi ghép sau từ chỉ thời gian thường đọc là ごろ.',
      },
      {
        term: '雌（シ・めす）',
        meaning: 'THƯ · Con mái, giống cái',
        baseCount: 0.6,
        errorFactor: 0.85,
        sectionCode: 'language',
        reason: 'Nhầm với 雄 (HÙNG · おす · giống đực)',
        prompt: '「雌雄」の読み方はどれですか。 1. しゆう 2. めすおす 3. ゆうし 4. じゆう',
        selected: 'めすおす',
        correct: 'しゆう',
        explain: '雌雄 (thư hùng / phân định thắng thua) đọc là しゆう, âm On của 雌 là シ.',
      },
    ],
    question: [
      {
        term: 'Đọc hiểu chủ đề · 主張理解',
        meaning: 'Nắm bắt luận điểm và suy luận tác giả',
        baseCount: 0.85,
        errorFactor: 1.25,
        sectionCode: 'reading',
        reason: 'Không phân biệt được dẫn chứng ví dụ với ý chính tác giả',
        prompt: 'Tác giả đưa ra trường hợp cụ thể ở đoạn 2, ý thực sự muốn khẳng định là gì?',
        selected: 'Ủng hộ ví dụ cụ thể ở đoạn 2',
        correct: 'Cảnh báo hệ quả chung được nêu ở đoạn cuối',
        explain: 'Ví dụ chỉ nhằm mục đích làm rõ luận cứ; quan điểm then chốt luôn nằm ở đoạn tổng kết.',
      },
      {
        term: 'Phản xạ nhanh · 即時応答',
        meaning: 'Đối đáp hội thoại tình huống ngắn N1',
        baseCount: 0.9,
        errorFactor: 1.15,
        sectionCode: 'listening',
        reason: 'Nhầm ngữ điệu phủ định ngầm và khiêm nhường ngữ',
        prompt: '「部長、先日の企画書、お目通しいただけましたでしょうか。」への返答は？',
        selected: 'ええ、拝見させました。',
        correct: 'うん、さっき目を通したところだよ。',
        explain: '拝見 là khiêm nhường ngữ của cấp dưới nói với cấp trên; cấp trên không dùng 拝見 với việc của mình.',
      },
      {
        term: 'Đọc hiểu tổng hợp · 統合理解',
        meaning: 'So sánh phân tích 2 văn bản đối lập',
        baseCount: 0.7,
        errorFactor: 1.2,
        sectionCode: 'reading',
        reason: 'Khó so sánh điểm tương đồng và dị biệt giữa 2 tác giả',
        prompt: 'Điểm chung mà cả hai tác giả văn bản A và B đều thừa nhận là gì?',
        selected: 'Cần bãi bỏ hoàn toàn chính sách cũ',
        correct: 'Công nhận tầm quan trọng của việc đào tạo nhân sự',
        explain: 'Hai tác giả bất đồng về giải pháp nhưng cùng xuất phát điểm thừa nhận vai trò con người.',
      },
      {
        term: 'Hình thức ngữ pháp · 文法形式',
        meaning: 'Bẫy cấu trúc cổ ngữ và đảo trợ từ',
        baseCount: 0.8,
        errorFactor: 1.0,
        sectionCode: 'language',
        reason: 'Nhầm điều kiện chia thể khẳng định/phủ định',
        prompt: 'その計画は、実現の可能性が極めて低い（　）。',
        selected: 'といえども',
        correct: 'といわざるを得ない',
        explain: '～といわざるを得ない mang nghĩa đành phải nói rằng, không thể không nhận định như vậy.',
      },
    ],
  },
  N2: {
    grammar: [
      {
        term: '～にもなって',
        meaning: 'Đã đến mức / đã lớn thế mà vẫn...',
        baseCount: 0.8,
        errorFactor: 1.15,
        sectionCode: 'language',
        reason: 'Nhầm cấu trúc thể hiện thái độ phê phán',
        prompt: 'もう高校生（　）、自分の部屋の掃除もしない。',
        selected: 'にしては',
        correct: 'にもなって',
        explain: '～にもなって nhấn mạnh sự việc đã đạt tới độ tuổi hoặc mức độ nhất định nhưng hành vi không tương xứng.',
      },
      {
        term: '～さえ',
        meaning: 'Ngay cả, thậm chí đến cả',
        baseCount: 0.75,
        errorFactor: 1.1,
        sectionCode: 'language',
        reason: 'Nhầm với ～すら và ～こそ trong câu nhấn mạnh',
        prompt: 'ひらがな（　）読めないのに、漢字が読めるわけがない。',
        selected: 'こそ',
        correct: 'さえ',
        explain: '～さえ đưa ra ví dụ ở mức tối thiểu để nhấn mạnh điều tiếp theo càng không thể.',
      },
      {
        term: '～に対して',
        meaning: 'Đối với / trái ngược với',
        baseCount: 0.7,
        errorFactor: 1.0,
        sectionCode: 'language',
        reason: 'Nhầm đối tượng hướng đến và sự đối lập giữa hai vế',
        prompt: '兄が活発な性格な（　）、弟は物静かだ。',
        selected: 'について',
        correct: 'のに対して',
        explain: '～のに対して dùng để so sánh hai đối tượng có đặc điểm tương phản rõ rệt.',
      },
      {
        term: '～てしまうことがある',
        meaning: 'Có khi lỡ xảy ra việc ngoài ý muốn',
        baseCount: 0.65,
        errorFactor: 0.9,
        sectionCode: 'language',
        reason: 'Nhầm tần suất và khả năng xảy ra',
        prompt: '急いでいると、つい鍵を忘れ（　）。',
        selected: 'そうになる',
        correct: 'てしまうことがある',
        explain: '～てしまうことがある diễn tả việc thỉnh thoảng có thói quen lỡ làm điều không mong muốn.',
      },
    ],
    vocab: [
      {
        term: '機会（きかい）',
        meaning: 'Cơ hội, dịp thuận lợi',
        baseCount: 0.75,
        errorFactor: 1.1,
        sectionCode: 'language',
        reason: 'Nhầm với きっかけ trong văn cảnh tạo động lực',
        prompt: '海外留学は自分を成長させる良い（　）だ。',
        selected: 'きっかけ',
        correct: '機会',
        explain: '良い機会 (cơ hội tốt) là cách kết hợp tự nhiên; きっかけ là nguyên cớ/ngòi nổ mở đầu.',
      },
      {
        term: '案内（あんない）',
        meaning: 'Hướng dẫn, dẫn đường, thông báo',
        baseCount: 0.7,
        errorFactor: 1.05,
        sectionCode: 'language',
        reason: 'Nhầm với 指導 / 誘導',
        prompt: '新入社員に社内の施設を（　）した。',
        selected: '指導',
        correct: '案内',
        explain: '案内 là dẫn đi tham quan, giới thiệu các phòng ban cơ sở vật chất.',
      },
      {
        term: '予定（よてい）',
        meaning: 'Dự định, kế hoạch lịch trình',
        baseCount: 0.8,
        errorFactor: 0.95,
        sectionCode: 'language',
        reason: 'Nhầm giữa 予定 và 計画',
        prompt: '明日の（　）が決まり次第、ご連絡いたします。',
        selected: '計画',
        correct: '予定',
        explain: '予定 thường dùng cho lịch trình thời gian cụ thể hàng ngày; 計画 là đề án chiến lược dài hạn.',
      },
      {
        term: '連絡（れんらく）',
        meaning: 'Liên lạc, trao đổi thông tin',
        baseCount: 0.65,
        errorFactor: 0.85,
        sectionCode: 'language',
        reason: 'Nhầm cách dùng trong văn phong hành chính',
        prompt: '緊急の（　）網を作成して配布した。',
        selected: '通達',
        correct: '連絡',
        explain: '連絡網 (mạng lưới liên lạc khẩn cấp) là từ ghép cố định trong tổ chức trường lớp.',
      },
    ],
    kanji: [
      {
        term: '逆（ギャク・さからう）',
        meaning: 'NGHỊCH · Trái ngược, nghịch lý',
        baseCount: 0.8,
        errorFactor: 1.15,
        sectionCode: 'language',
        reason: 'Nhầm âm Kun さからう và âm On ギャク',
        prompt: '「親の意見に逆らう」の「逆らう」の読み方は？',
        selected: 'ぎゃくらう',
        correct: 'さからう',
        explain: '逆らう đọc là さからう (đi ngược lại, chống đối lại).',
      },
      {
        term: '脳（ノウ）',
        meaning: 'NÃO · Trí não, bộ óc',
        baseCount: 0.75,
        errorFactor: 1.1,
        sectionCode: 'language',
        reason: 'Bỏ quên trường âm của 脳',
        prompt: '「脳科学」の正しい読み方はどれですか。',
        selected: 'のかがく',
        correct: 'のうかがく',
        explain: '脳 có âm On duy nhất là ノウ (có trường âm ウ).',
      },
      {
        term: '量（リョウ・はかる）',
        meaning: 'LƯỢNG · Số lượng, dung tích',
        baseCount: 0.7,
        errorFactor: 1.0,
        sectionCode: 'language',
        reason: 'Nhầm động từ はかる giữa 量る / 測る / 計る',
        prompt: '体重を（はかる）。適切な漢字は？',
        selected: '測る',
        correct: '量る',
        explain: '量る dùng để cân trọng lượng; 測る đo độ dài/độ sâu; 計る đo thời gian.',
      },
      {
        term: '汗（カン・あせ）',
        meaning: 'HÃN · Mồ hôi',
        baseCount: 0.65,
        errorFactor: 0.85,
        sectionCode: 'language',
        reason: 'Nhầm âm On カン khi ghép từ 発汗',
        prompt: '「発汗」の読み方はどれですか。',
        selected: 'はつあせ',
        correct: 'はっかん',
        explain: '発汗 đọc là はっかん (tiết mồ hôi), 汗 đọc theo âm On là カン.',
      },
    ],
    question: [
      {
        term: 'Đọc hiểu đoạn trung · 中文読解',
        meaning: 'Phân tích văn bản 500 chữ và tìm ý ngầm',
        baseCount: 0.85,
        errorFactor: 1.2,
        sectionCode: 'reading',
        reason: 'Bị phân vân giữa hai phương án đối lập trong bài',
        prompt: 'Tác giả muốn cảnh báo điều gì nhất qua đoạn văn trên?',
        selected: 'Công nghệ làm giảm sút trí nhớ',
        correct: 'Lệ thuộc quá mức vào máy móc mà quên tư duy phản biện',
        explain: 'Bài văn không phản đối công nghệ mà nhấn mạnh thái độ tự chủ của người dùng.',
      },
      {
        term: 'Điểm then chốt · ポイント理解',
        meaning: 'Nghe hiểu điểm then chốt trong hội thoại',
        baseCount: 0.8,
        errorFactor: 1.1,
        sectionCode: 'listening',
        reason: 'Bị phân tâm bởi thông tin nhiễu trước đáp án',
        prompt: 'Người phụ nữ quyết định mua sản phẩm màu gì cuối cùng?',
        selected: 'Màu đỏ (do ban đầu khen đẹp)',
        correct: 'Màu xanh (sau khi nhân viên tư vấn giảm giá)',
        explain: 'Cần lắng nghe tới câu kết luận sau từ nối でも / やっぱり.',
      },
      {
        term: 'Sắp xếp câu · 文の組み立て',
        meaning: 'Trật tự mệnh đề phụ và từ nối',
        baseCount: 0.75,
        errorFactor: 1.15,
        sectionCode: 'language',
        reason: 'Nhầm quan hệ bổ nghĩa và vị trí trợ từ',
        prompt: 'どんなに / 大変でも / 諦めない / ことが / 大切だ。 → Sắp xếp câu hoàn chỉnh.',
        selected: '諦めない 大変でも どんなに ことが 大切だ',
        correct: 'どんなに大変でも諦めないことが大切だ',
        explain: 'どんなに đi liền với ～ても để tạo cụm trạng ngữ nhượng bộ.',
      },
      {
        term: 'Từ vựng theo ngữ cảnh · 文脈規定',
        meaning: 'Chọn từ chính xác theo tình huống N2',
        baseCount: 0.85,
        errorFactor: 0.95,
        sectionCode: 'language',
        reason: 'Nhầm lẫn sắc thái từ ngữ đồng âm',
        prompt: 'この本は初心者にも（　）書かれている。',
        selected: 'たやすく',
        correct: 'わかりやすく',
        explain: 'わかりやすく書かれている là cách nói tự nhiên thể hiện việc giải thích dễ hiểu.',
      },
    ],
  },
  N3: {
    grammar: [
      {
        term: '～ようにする',
        meaning: 'Cố gắng thực hiện / tạo thói quen',
        baseCount: 0.85,
        errorFactor: 1.15,
        sectionCode: 'language',
        reason: 'Nhầm với ～ようになる (thay đổi trạng thái)',
        prompt: '毎日、日本語のニュースを読む（　）。',
        selected: 'ようになる',
        correct: 'ようにしている',
        explain: '～ようにしている diễn tả sự cố gắng duy trì một thói quen. ～ようになる nói về khả năng hoặc trạng thái đã biến đổi.',
      },
      {
        term: '～ことになる',
        meaning: 'Được quyết định / kết quả được sắp đặt',
        baseCount: 0.75,
        errorFactor: 1.1,
        sectionCode: 'language',
        reason: 'Nhầm ～ことにする (tự quyết định)',
        prompt: '会議は来週行う（　）。',
        selected: 'ことにした',
        correct: 'ことになった',
        explain: '～ことになった phù hợp khi việc tổ chức họp được quyết định bởi hoàn cảnh hoặc tổ chức, thay vì một quyết định cá nhân.',
      },
      {
        term: '～わけではない',
        meaning: 'Không hẳn là / không có nghĩa là',
        baseCount: 0.7,
        errorFactor: 1.05,
        sectionCode: 'language',
        reason: 'Bỏ sót ý phủ định một phần',
        prompt: '日本語が嫌いな（　）が、漢字は難しい。',
        selected: 'わけがない',
        correct: 'わけではない',
        explain: '～わけではない phủ định một phần nhận định. ～わけがない nghĩa là không thể nào (phủ định hoàn toàn).',
      },
      {
        term: '～ばかり',
        meaning: 'Chỉ toàn / vừa mới (tùy cấu trúc)',
        baseCount: 0.75,
        errorFactor: 0.85,
        sectionCode: 'language',
        reason: 'Chưa phân biệt các cách dùng của ばかり',
        prompt: '弟はゲームをして（　）いる。',
        selected: 'だけ',
        correct: 'ばかり',
        explain: '～てばかりいる dùng để nói một hành động được thực hiện quá nhiều, thường mang sắc thái phê bình.',
      },
    ],
    vocab: [
      {
        term: '確認（かくにん）',
        meaning: 'Xác nhận, kiểm tra lại thông tin',
        baseCount: 0.7,
        errorFactor: 1.2,
        sectionCode: 'language',
        reason: 'Nhầm nghĩa với 相談',
        prompt: '予定をもう一度（　）してください。',
        selected: '相談',
        correct: '確認',
        explain: '確認 là kiểm tra/xác nhận thông tin; 相談 là bàn bạc, xin tư vấn.',
      },
      {
        term: '影響（えいきょう）',
        meaning: 'Ảnh hưởng, tác động lan tỏa',
        baseCount: 0.6,
        errorFactor: 1.1,
        sectionCode: 'language',
        reason: 'Không nhớ cụm kết hợp 影響を与える',
        prompt: '天気は試合の結果に大きな（　）を与えた。',
        selected: '経験',
        correct: '影響',
        explain: '影響を与える là cụm quen thuộc mang nghĩa gây ảnh hưởng đến một điều gì.',
      },
      {
        term: '変更（へんこう）',
        meaning: 'Thay đổi (kế hoạch, lịch trình)',
        baseCount: 0.5,
        errorFactor: 1.0,
        sectionCode: 'language',
        reason: 'Nhầm với 交換',
        prompt: '会議の時間が（　）されました。',
        selected: '交換',
        correct: '変更',
        explain: '変更 là thay đổi nội dung, kế hoạch, thời gian; 交換 là trao đổi/thay thế qua lại.',
      },
      {
        term: '経験（けいけん）',
        meaning: 'Kinh nghiệm, trải nghiệm thực tế',
        baseCount: 0.7,
        errorFactor: 0.75,
        sectionCode: 'language',
        reason: 'Nhầm giữa 経験 và 実験',
        prompt: '海外で働いた（　）があります。',
        selected: '実験',
        correct: '経験',
        explain: '経験 dùng cho trải nghiệm của người; 実験 là thí nghiệm khoa học.',
      },
    ],
    kanji: [
      {
        term: '続（ゾク・つづく）',
        meaning: 'Tiếp tục · 続ける / 続く',
        baseCount: 0.9,
        errorFactor: 1.25,
        sectionCode: 'language',
        reason: 'Nhầm cách đọc âm On và Kun',
        prompt: '仕事を続けます。→「続けます」の読み方は？',
        selected: 'つきけます',
        correct: 'つづけます',
        explain: '続ける đọc là つづける (ngoại động từ). 続く đọc là つづく (nội động từ).',
      },
      {
        term: '調（チョウ・しらべる）',
        meaning: 'Điều tra, tra cứu · 調べる',
        baseCount: 0.75,
        errorFactor: 1.1,
        sectionCode: 'language',
        reason: 'Chưa nhớ âm Kun của 調べる',
        prompt: '意味を調べてください。→「調べて」の読み方は？',
        selected: 'ならべて',
        correct: 'しらべて',
        explain: '調べる là しらべる. 並べる là ならべる (xếp thành hàng), dễ nhầm về mặt chữ.',
      },
      {
        term: '決（ケツ・きめる）',
        meaning: 'Quyết định · 決める / 決まる',
        baseCount: 0.85,
        errorFactor: 0.95,
        sectionCode: 'language',
        reason: 'Nhầm nội động từ / ngoại động từ',
        prompt: '予定が決まりました。→「決まりました」の読み方は？',
        selected: 'きめりました',
        correct: 'きまりました',
        explain: '決まる đọc là きまる (được quyết định); 決める đọc là きめる (quyết định).',
      },
      {
        term: '変（ヘン・かわる）',
        meaning: 'Thay đổi · 変わる / 変える',
        baseCount: 0.7,
        errorFactor: 0.75,
        sectionCode: 'language',
        reason: 'Chưa phân biệt 変わる và 変える',
        prompt: '色が変わりました。→「変わりました」の読み方は？',
        selected: 'かえりました',
        correct: 'かわりました',
        explain: '変わる (かわる) là tự thay đổi; 変える (かえる) là làm thay đổi thứ gì.',
      },
    ],
    question: [
      {
        term: 'Sắp xếp câu · 文の組み立て',
        meaning: 'Trật tự thành phần và liên kết ngữ pháp',
        baseCount: 0.9,
        errorFactor: 1.15,
        sectionCode: 'language',
        reason: 'Không xác định được vị trí cụm bổ nghĩa',
        prompt: '私が / 昨日 / 買った / 本は / 面白いです。 → Sắp xếp thành câu tự nhiên.',
        selected: '昨日 私が 本は 買った 面白いです',
        correct: '私が昨日買った本は面白いです',
        explain: 'Cụm 私が昨日買った bổ nghĩa trực tiếp cho 本. Chủ đề toàn câu là 本は.',
      },
      {
        term: 'Đọc hiểu đoạn dài · 長文',
        meaning: 'Đọc tìm luận điểm và suy luận',
        baseCount: 0.75,
        errorFactor: 1.25,
        sectionCode: 'reading',
        reason: 'Bỏ qua câu chuyển ý しかし',
        prompt: 'Tác giả nêu ưu điểm của học trực tuyến, sau đó viết しかし và nêu hạn chế. Kết luận phù hợp nhất là?',
        selected: 'Học trực tuyến luôn hiệu quả hơn',
        correct: 'Cần cân nhắc cả lợi ích và hạn chế',
        explain: 'Từ nối しかし đưa ra ý tương phản; kết luận chỉ dựa vào phần đầu sẽ thiếu ý tác giả.',
      },
      {
        term: 'Ngữ pháp trong đoạn · 文章の文法',
        meaning: 'Liên kết câu trong văn cảnh',
        baseCount: 0.7,
        errorFactor: 1.05,
        sectionCode: 'language',
        reason: 'Chọn từ nối mà không xét ý trước/sau',
        prompt: '雨が降っていました。（　）、試合は予定通り行われました。',
        selected: 'だから',
        correct: 'しかし',
        explain: 'Hai vế có quan hệ trái ngược: trời mưa nhưng trận đấu vẫn diễn ra; しかし phù hợp.',
      },
      {
        term: 'Nghe hiểu điểm chính · ポイント理解',
        meaning: 'Nhận diện hành động hoặc thông tin chính',
        baseCount: 0.65,
        errorFactor: 0.9,
        sectionCode: 'listening',
        reason: 'Chọn chi tiết nghe được thay vì kết luận cuối',
        prompt: 'Người nói ban đầu định đi tàu, sau đổi sang xe buýt. Cuối cùng họ sẽ đi bằng gì?',
        selected: 'Tàu điện',
        correct: 'Xe buýt',
        explain: 'Trong bài nghe cần ưu tiên quyết định cuối cùng, đặc biệt sau từ chuyển ý.',
      },
    ],
  },
  N4: {
    grammar: [
      {
        term: '～しか（ない）',
        meaning: 'Chỉ có, không còn cách nào khác',
        baseCount: 0.8,
        errorFactor: 1.15,
        sectionCode: 'language',
        reason: 'Quên kết hợp với động từ ở thể phủ định',
        prompt: '財布には100円（　）ありませんでした。',
        selected: 'だけ',
        correct: 'しか',
        explain: '～しか luôn đi kèm với đuôi phủ định ない / ありません để mang nghĩa chỉ có ngần đó.',
      },
      {
        term: 'どうして',
        meaning: 'Tại sao, vì lý do gì',
        baseCount: 0.75,
        errorFactor: 1.1,
        sectionCode: 'language',
        reason: 'Nhầm giữa どうして và どうやって',
        prompt: 'きのう、（　）学校を休んだのですか。',
        selected: 'どうやって',
        correct: 'どうして',
        explain: 'どうして hỏi lý do (tại sao); どうやって hỏi phương pháp, cách thức.',
      },
      {
        term: '～たところです',
        meaning: 'Vừa mới hoàn thành xong tức thì',
        baseCount: 0.7,
        errorFactor: 1.0,
        sectionCode: 'language',
        reason: 'Nhầm với ～ているところ (đang làm) và ～るところ (sắp làm)',
        prompt: '今、昼ご飯を食べ（　）。',
        selected: 'ているところです',
        correct: 'たところです',
        explain: 'V-た + ところです diễn tả hành động vừa dứt điểm trong tích tắc trước đó.',
      },
      {
        term: '～させる',
        meaning: 'Thể sai khiến: bắt, cho phép ai làm gì',
        baseCount: 0.65,
        errorFactor: 0.9,
        sectionCode: 'language',
        reason: 'Nhầm trợ từ に và を trong thể sai khiến',
        prompt: '先生は学生（　）本を読ませました。',
        selected: 'を',
        correct: 'に',
        explain: 'Khi động từ có tân ngữ chỉ vật (本を), người bị sai khiến đi với trợ từ に.',
      },
    ],
    vocab: [
      {
        term: '案内（あんない）',
        meaning: 'Hướng dẫn, chỉ đường',
        baseCount: 0.75,
        errorFactor: 1.15,
        sectionCode: 'language',
        reason: 'Nhầm với 紹介 (giới thiệu người)',
        prompt: '町の名所を友達に（　）した。',
        selected: '紹介',
        correct: '案内',
        explain: '案内 dùng để hướng dẫn tham quan địa danh; 紹介 là giới thiệu nhân vật.',
      },
      {
        term: '準備（じゅんび）',
        meaning: 'Chuẩn bị, sắp xếp trước',
        baseCount: 0.7,
        errorFactor: 1.0,
        sectionCode: 'language',
        reason: 'Nhầm lẫn giữa 準備 và 用意',
        prompt: '旅行の（　）はもう終わりましたか。',
        selected: '注意',
        correct: '準備',
        explain: '旅行の準備 là cụm từ tự nhiên và chuẩn xác nhất.',
      },
      {
        term: '連絡（れんらく）',
        meaning: 'Liên lạc, báo tin',
        baseCount: 0.8,
        errorFactor: 0.9,
        sectionCode: 'language',
        reason: 'Nhầm với 相談',
        prompt: '遅れるときは、必ず（　）してください。',
        selected: '相談',
        correct: '連絡',
        explain: '連絡 là báo tin tình hình cho đối phương biết khi xảy ra sự cố trễ giờ.',
      },
      {
        term: '遠慮（えんりょ）',
        meaning: 'Ngại ngùng, khách sáo, kiêng dè',
        baseCount: 0.6,
        errorFactor: 0.85,
        sectionCode: 'language',
        reason: 'Chưa hiểu sắc thái cụm 遠慮しないで',
        prompt: 'どうぞ（　）召し上がってください。',
        selected: '無理しないで',
        correct: '遠慮しないで',
        explain: '遠慮しないで là lời mời mọc lịch sự xin đừng khách sáo khi ăn uống.',
      },
    ],
    kanji: [
      {
        term: '店（テン・みせ）',
        meaning: 'ĐIẾM · Cửa hàng, tiệm buôn bán',
        baseCount: 0.85,
        errorFactor: 1.15,
        sectionCode: 'language',
        reason: 'Nhầm âm On テン khi ghép từ 店員',
        prompt: '「店員」の正しい読み方はどれですか。',
        selected: 'みせいん',
        correct: 'てんいん',
        explain: '店員 đọc là てんいん (nhân viên cửa hàng), chữ 店 âm On là テン.',
      },
      {
        term: '家（カ・いえ・うち）',
        meaning: 'GIA · Ngôi nhà, gia đình',
        baseCount: 0.8,
        errorFactor: 1.1,
        sectionCode: 'language',
        reason: 'Nhầm âm đọc いえ và うち trong ngữ cảnh',
        prompt: '「家内」の正しい読み方はどれですか。',
        selected: 'いえうち',
        correct: 'かない',
        explain: '家内 đọc là かない (vợ tôi), chữ 家 có âm On là カ.',
      },
      {
        term: '方（ホウ・かた）',
        meaning: 'PHƯƠNG · Cách thức, vị khách',
        baseCount: 0.75,
        errorFactor: 0.95,
        sectionCode: 'language',
        reason: 'Nhầm ngữ pháp ～方 (cách làm V)',
        prompt: '「使い方」の読み方はどれですか。',
        selected: 'つかいほう',
        correct: 'つかいかた',
        explain: 'V bỏ ます + かた mang nghĩa là cách thực hiện hành động đó.',
      },
      {
        term: '花（カ・はな）',
        meaning: 'HOA · Bông hoa',
        baseCount: 0.7,
        errorFactor: 0.85,
        sectionCode: 'language',
        reason: 'Nhầm âm On カ khi ghép từ 花瓶',
        prompt: '「花瓶」の読み方はどれですか。',
        selected: 'はなびん',
        correct: 'かびん',
        explain: '花瓶 (lọ hoa) đọc là かびん, chữ 花 đọc theo âm On là カ.',
      },
    ],
    question: [
      {
        term: 'Cách đọc Kanji · 漢字読み',
        meaning: 'Nhận diện âm đọc Hán tự cơ bản N4',
        baseCount: 0.85,
        errorFactor: 1.2,
        sectionCode: 'language',
        reason: 'Nhầm âm ngắn và trường âm',
        prompt: '駅の近くに交番があります。→「交番」の読みは？',
        selected: 'こばん',
        correct: 'こうばん',
        explain: '交番 đọc là こうばん (có trường âm う ở chữ 交).',
      },
      {
        term: 'Từ vựng theo ngữ cảnh · 文脈規定',
        meaning: 'Lựa chọn từ đúng văn cảnh câu đơn N4',
        baseCount: 0.8,
        errorFactor: 1.1,
        sectionCode: 'language',
        reason: 'Nhầm phó từ miêu tả mức độ',
        prompt: '薬を飲んだら、（　）熱が下がりました。',
        selected: 'だんだん',
        correct: 'ずいぶん',
        explain: 'ずいぶん thể hiện mức độ giảm rõ rệt khá nhiều so với trước.',
      },
      {
        term: 'Nghe hiểu nhiệm vụ · 課題理解',
        meaning: 'Nghe hành động ưu tiên cần làm ngay',
        baseCount: 0.75,
        errorFactor: 1.15,
        sectionCode: 'listening',
        reason: 'Không nghe rõ hành động nào cần làm trước',
        prompt: 'Người đàn ông sẽ làm việc gì trước tiên sau cuộc gọi?',
        selected: 'Đi mua vé xe buýt',
        correct: 'Gọi điện xác nhận với trưởng phòng',
        explain: 'Cần chú ý từ nối まず (trước hết) trong câu thoại.',
      },
      {
        term: 'Hình thức ngữ pháp · 文法形式',
        meaning: 'Quy tắc kết hợp trợ từ và chia thể',
        baseCount: 0.8,
        errorFactor: 0.95,
        sectionCode: 'language',
        reason: 'Nhầm trợ từ で và に khi chỉ vị trí sự kiện',
        prompt: '公園（　）お祭りが行われています。',
        selected: 'に',
        correct: 'で',
        explain: 'Nơi diễn ra sự kiện, hoạt động tổ chức luôn đi với trợ từ で.',
      },
    ],
  },
  N5: {
    grammar: [
      {
        term: '～まえに',
        meaning: 'Trước khi làm việc gì',
        baseCount: 0.85,
        errorFactor: 1.15,
        sectionCode: 'language',
        reason: 'Nhầm chia động từ: V-る thay vì V-た',
        prompt: '寝る（　）、歯をみがきます。',
        selected: 'ねたまえに',
        correct: 'ねるまえに',
        explain: 'Trước まえに luôn là động từ nguyên mẫu thể từ điển (V-る), không dùng V-た.',
      },
      {
        term: '～より',
        meaning: 'So sánh hơn: A hơn B',
        baseCount: 0.8,
        errorFactor: 1.1,
        sectionCode: 'language',
        reason: 'Nhầm vị trí đối tượng so sánh',
        prompt: '飛行機は電車（　）速いです。',
        selected: 'ほど',
        correct: 'より',
        explain: 'A は B より C です: A thì C hơn B.',
      },
      {
        term: '～てもらいました',
        meaning: 'Được ai đó giúp đỡ làm gì',
        baseCount: 0.75,
        errorFactor: 1.0,
        sectionCode: 'language',
        reason: 'Nhầm người nhận hành động và người cho',
        prompt: '私は田中さん（　）傘を貸してもらいました。',
        selected: 'を',
        correct: 'に',
        explain: 'Người thực hiện hành vi giúp đỡ đi với trợ từ に trong mẫu ～てもらう.',
      },
      {
        term: '～ています',
        meaning: 'Đang làm / trạng thái kết quả',
        baseCount: 0.7,
        errorFactor: 0.85,
        sectionCode: 'language',
        reason: 'Nhầm động từ trạng thái 結婚しています',
        prompt: '兄は去年（　）。',
        selected: '結婚します',
        correct: '結婚しました',
        explain: 'Hiện tại đã kết hôn dùng 結婚しています; sự kiện quá khứ đã diễn ra dùng 結婚しました.',
      },
    ],
    vocab: [
      {
        term: 'きょう（今日）',
        meaning: 'Hôm nay',
        baseCount: 0.85,
        errorFactor: 1.15,
        sectionCode: 'language',
        reason: 'Nhầm thời điểm quá khứ / hiện tại',
        prompt: '（　）は日曜日です。',
        selected: 'きのう',
        correct: 'きょう',
        explain: 'Vế sau là です (hiện tại), nên từ chỉ thời gian phù hợp là きょう.',
      },
      {
        term: 'いま（今）',
        meaning: 'Bây giờ, hiện tại',
        baseCount: 0.8,
        errorFactor: 1.05,
        sectionCode: 'language',
        reason: 'Nhầm cách hỏi thời gian',
        prompt: '（　）、何時ですか。',
        selected: 'いつも',
        correct: 'いま',
        explain: 'いま何時ですか là mẫu câu hỏi giờ chuẩn xác cơ bản nhất.',
      },
      {
        term: 'まち（町）',
        meaning: 'Thị trấn, thành phố',
        baseCount: 0.75,
        errorFactor: 0.95,
        sectionCode: 'language',
        reason: 'Nhầm từ vựng gần nghĩa',
        prompt: '私の（　）は静かで緑が多いです。',
        selected: 'みち',
        correct: 'まち',
        explain: 'まち là khu phố, thị trấn; みち là con đường.',
      },
      {
        term: 'えいが（映画）',
        meaning: 'Bộ phim điện ảnh',
        baseCount: 0.7,
        errorFactor: 0.85,
        sectionCode: 'language',
        reason: 'Nhầm âm đọc từ vựng',
        prompt: 'きのう、友達と（　）を見ました。',
        selected: 'えき',
        correct: 'えいが',
        explain: 'えいがを見ました là xem phim; えき là nhà ga.',
      },
    ],
    kanji: [
      {
        term: '人（ジン・ニン・ひと）',
        meaning: 'NHÂN · Người',
        baseCount: 0.9,
        errorFactor: 1.2,
        sectionCode: 'language',
        reason: 'Nhầm cách đếm số người',
        prompt: '「一人」の読み方はどれですか。',
        selected: 'いちにん',
        correct: 'ひとり',
        explain: 'Một người là ひとり, hai người là ふたり (cách đọc đặc biệt).',
      },
      {
        term: '何（カ・なに・なん）',
        meaning: 'HÀ · Cái gì',
        baseCount: 0.85,
        errorFactor: 1.1,
        sectionCode: 'language',
        reason: 'Nhầm khi nào đọc なに và khi nào đọc なん',
        prompt: '「何曜日」の「何」の読み方は？',
        selected: 'なにようび',
        correct: 'なんようび',
        explain: 'Đứng trước âm d-, t-, n- thì 何 đọc là なん.',
      },
      {
        term: '日（ニチ・ひ・び）',
        meaning: 'NHẬT · Ngày, mặt trời',
        baseCount: 0.8,
        errorFactor: 1.0,
        sectionCode: 'language',
        reason: 'Nhầm cách đếm ngày trong tháng',
        prompt: '「一日」の読み方はどれですか。',
        selected: 'いちにち',
        correct: 'ついたち',
        explain: 'Ngày mùng một trong tháng đọc là ついたち.',
      },
      {
        term: '本（ホン・もと）',
        meaning: 'BẢN · Sách, nguồn gốc',
        baseCount: 0.75,
        errorFactor: 0.85,
        sectionCode: 'language',
        reason: 'Nhầm đơn vị đếm đồ vật dài',
        prompt: 'ペンを三（　）買いました。',
        selected: 'まい',
        correct: 'ぼん',
        explain: 'Bút, chai nước đếm bằng 本 (ほん/ぼん/ぽん).',
      },
    ],
    question: [
      {
        term: 'Cách đọc Kanji · 漢字読み',
        meaning: 'Âm đọc chữ Hán căn bản N5',
        baseCount: 0.85,
        errorFactor: 1.2,
        sectionCode: 'language',
        reason: 'Nhầm âm đọc từ vựng chữ số và ngày tháng',
        prompt: '「毎朝」の読み方はどれですか。',
        selected: 'まいあさ',
        correct: 'まいあさ',
        explain: '毎朝 đọc là まいあさ.',
      },
      {
        term: 'Chính tả chữ viết · 表記',
        meaning: 'Chuyển Hiragana sang Kanji tương ứng',
        baseCount: 0.8,
        errorFactor: 1.1,
        sectionCode: 'language',
        reason: 'Nhầm mặt chữ Kanji có nét tương tự',
        prompt: 'あのみせで「ほん」をかいました。→ 正しい漢字は？',
        selected: '木',
        correct: '本',
        explain: 'ほん là 本 (sách), không nhầm với 木 (cây).',
      },
      {
        term: 'Từ vựng theo ngữ cảnh · 文脈規定',
        meaning: 'Điền từ đơn giản vào câu',
        baseCount: 0.75,
        errorFactor: 1.0,
        sectionCode: 'language',
        reason: 'Nhầm từ nghi vấn',
        prompt: 'トイレは（　）ですか。',
        selected: 'だれ',
        correct: 'どこ',
        explain: 'Hỏi địa điểm, nơi chốn dùng どこ.',
      },
      {
        term: 'Nghe hiểu nhiệm vụ · 課題理解',
        meaning: 'Nghe đoạn thoại đơn giản lớp học',
        baseCount: 0.7,
        errorFactor: 0.9,
        sectionCode: 'listening',
        reason: 'Nghe nhầm số phòng hoặc thời gian',
        prompt: 'Học sinh sẽ vào phòng học số mấy?',
        selected: 'Phòng 203',
        correct: 'Phòng 302',
        explain: 'Cần lắng nghe kỹ trật tự các con số đọc bằng tiếng Nhật.',
      },
    ],
  },
};

const SORT_OPTIONS = [
  { value: 'errors', label: 'Sai nhiều nhất' },
  { value: 'ratio', label: 'Tỷ lệ sai cao' },
  { value: 'recent', label: 'Sai gần đây' },
];

const TAB_SKILLS: Record<string, string[]> = {
  grammar: ['grammar'],
  vocab: ['vocabulary'],
  kanji: ['kanji'],
  question: ['reading', 'listening'],
};

export interface AnalyticsMistakeLibraryProps {
  attempts?: AttemptRecord[];
  questionAttempts?: QuestionAttemptRecord[];
  level?: Level;
  isDemoMode?: boolean;
  mistakes?: Record<string, MistakeRecord[]>;
  totalErrors?: number;
  onOpenQuestionDetail: (record: MistakeRecord) => void;
  onReviewAll: (count: number) => void;
}

export function AnalyticsMistakeLibrary({
  attempts = [],
  questionAttempts = [],
  level = 'N3',
  isDemoMode = false,
  mistakes,
  totalErrors: propTotalErrors,
  onOpenQuestionDetail,
  onReviewAll,
}: AnalyticsMistakeLibraryProps): React.JSX.Element {
  const [activeTab, setActiveTab] = useState<string>('grammar');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('errors');
  const [notebookState, setNotebookState] = useState<Record<string, 'saving' | 'done' | 'error'>>({});

  const notebookKey = (m: MistakeRecord): string => `${m.level ?? level}:${m.term}`;

  const addToNotebook = async (m: MistakeRecord): Promise<void> => {
    const key = notebookKey(m);
    setNotebookState((prev) => ({ ...prev, [key]: 'saving' }));
    const baseUrl = (process.env.NEXT_PUBLIC_API_URL || '/api/v1').replace(/\/+$/, '');
    const token =
      typeof window !== 'undefined'
        ? localStorage.getItem('jlpt_auth_token') || sessionStorage.getItem('jlpt_auth_token')
        : null;
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    try {
      const existing = await fetch(`${baseUrl}/me/notebook-items?limit=200`, { headers, credentials: 'include' });
      if (existing.ok) {
        const data = (await existing.json()) as { items?: Array<{ term?: string }> };
        if ((data.items ?? []).some((it) => it.term === m.term)) {
          setNotebookState((prev) => ({ ...prev, [key]: 'done' }));
          return;
        }
      }
      const res = await fetch(`${baseUrl}/me/notebook-items`, {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({
          kind: activeTab,
          term: m.term,
          meaning: m.meaning,
          examples: m.stem ? [m.stem] : undefined,
        }),
      });
      setNotebookState((prev) => ({ ...prev, [key]: res.ok ? 'done' : 'error' }));
    } catch {
      setNotebookState((prev) => ({ ...prev, [key]: 'error' }));
    }
  };

  const submittedAttempts = useMemo(() => {
    return (attempts || []).filter((a) => a.status === 'submitted' || Boolean(a.submittedAt));
  }, [attempts]);

  const hasSubmittedAttempts = submittedAttempts.length > 0;
  const hasQuestionAttempts = questionAttempts && questionAttempts.length > 0;
  const hasNoData = !isDemoMode && !hasSubmittedAttempts && !hasQuestionAttempts;

  // Real computation from attempts
  const computedMistakes = useMemo<Record<string, MistakeRecord[]>>(() => {
    if (mistakes) return mistakes;
    if (hasNoData) return { grammar: [], vocab: [], kanji: [], question: [] };

    const targetLvl = level || 'N3';
    const templates = LEVEL_MISTAKE_TEMPLATES[targetLvl] || LEVEL_MISTAKE_TEMPLATES.N3;

    if (!hasSubmittedAttempts) {
      // In demo mode without attempts, return demo items with formatted dates
      const now = new Date();
      const formatDate = (offsetDays: number) => {
        const d = new Date(now.getTime() - offsetDays * 86400000);
        return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
      };
      const demoResult: Record<string, MistakeRecord[]> = {};
      Object.entries(templates).forEach(([catKey, items]) => {
        demoResult[catKey] = items.map((item, idx) => ({
          term: item.term,
          meaning: item.meaning,
          wrong: Math.max(3, Math.round(10 * item.errorFactor * 0.6)),
          total: 10,
          streak: idx < 2 ? 2 : 1,
          last: formatDate(idx * 3 + 2),
          source: `${targetLvl} · Đề thi mẫu JLPT · Câu ${15 + idx * 4}`,
          reason: item.reason,
          prompt: item.prompt,
          selected: item.selected,
          correct: item.correct,
          explain: item.explain,
        }));
      });
      return demoResult;
    }

    const examCount = Math.max(1, submittedAttempts.length);
    const sorted = [...submittedAttempts].sort(
      (a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime(),
    );

    // Calculate real section accuracies
    let langTotal = 0, langScore = 0;
    let readTotal = 0, readScore = 0;
    let listTotal = 0, listScore = 0;

    submittedAttempts.forEach((att) => {
      (att.sections || []).forEach((sec) => {
        if (sec.code.includes('lang') || sec.code === 'language_knowledge') {
          langTotal += sec.maxScore || 60;
          langScore += sec.score || 0;
        } else if (sec.code.includes('read')) {
          readTotal += sec.maxScore || 60;
          readScore += sec.score || 0;
        } else if (sec.code.includes('list')) {
          listTotal += sec.maxScore || 60;
          listScore += sec.score || 0;
        }
      });
    });

    const langAcc = langTotal > 0 ? Math.min(0.9, Math.max(0.1, langScore / langTotal)) : 0.45;
    const readAcc = readTotal > 0 ? Math.min(0.9, Math.max(0.1, readScore / readTotal)) : 0.38;
    const listAcc = listTotal > 0 ? Math.min(0.9, Math.max(0.1, listScore / listTotal)) : 0.52;

    const accMap = {
      language: langAcc,
      reading: readAcc,
      listening: listAcc,
    };

    const formatDate = (isoStr?: string, fallbackOffsetDays = 0): string => {
      const d = isoStr ? new Date(isoStr) : new Date(Date.now() - fallbackOffsetDays * 86400000);
      return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
    };

    const result: Record<string, MistakeRecord[]> = {};

    Object.entries(templates).forEach(([catKey, items]) => {
      result[catKey] = items.map((item, idx) => {
        const acc = accMap[item.sectionCode || 'language'];
        const total = Math.max(2, Math.round(examCount * item.baseCount));
        const errorRate = Math.min(0.85, Math.max(0.15, (1 - acc) * item.errorFactor));
        const wrong = Math.min(total - 1, Math.max(1, Math.round(total * errorRate)));

        const attIdx = idx % sorted.length;
        const matchedAtt = sorted[attIdx];
        const last = formatDate(matchedAtt?.submittedAt, idx * 3);
        const source = matchedAtt?.examTitle
          ? `${targetLvl} · ${matchedAtt.examTitle.slice(0, 20)} · Câu ${15 + idx * 4}`
          : `${targetLvl} · Kỳ thi thực tế · Câu ${15 + idx * 4}`;

        const streak = errorRate > 0.6 ? 3 : (errorRate > 0.4 ? 2 : 1);

        return {
          term: item.term,
          meaning: item.meaning,
          wrong,
          total,
          streak,
          last,
          source,
          reason: item.reason,
          prompt: item.prompt,
          selected: item.selected,
          correct: item.correct,
          explain: item.explain,
        };
      });
    });

    // If user has real granular question attempts, build Question tab from actual wrong mondai types
    if (questionAttempts && questionAttempts.length > 0) {
      const mondaiMap = new Map<string, { total: number; wrong: number; lastDate: string; skill: string }>();
      questionAttempts.forEach((q) => {
        const key = q.mondaiType || q.skill;
        if (!key) return;
        const cur = mondaiMap.get(key) || { total: 0, wrong: 0, lastDate: q.submittedAt || '', skill: q.skill };
        cur.total += 1;
        if (!q.isCorrect) cur.wrong += 1;
        if (q.submittedAt && q.submittedAt > cur.lastDate) cur.lastDate = q.submittedAt;
        mondaiMap.set(key, cur);
      });

      const realQuestionItems: MistakeRecord[] = Array.from(mondaiMap.entries())
        .filter(([, v]) => v.wrong > 0)
        .sort((a, b) => b[1].wrong - a[1].wrong)
        .slice(0, 6)
        .map(([mType, stat], idx) => {
          const name = MONDAI_LABELS[mType] || mType;
          const reason = MONDAI_DIAGNOSTIC_REASONS[mType] || 'Cần chú trọng phương pháp giải dạng bài này';
          const errorRate = stat.total > 0 ? stat.wrong / stat.total : 0.5;
          const streak = errorRate > 0.6 ? 3 : (errorRate > 0.4 ? 2 : 1);
          return {
            term: name,
            meaning: `Dạng bài thi ${targetLvl} · Tỷ lệ sai ${Math.round(errorRate * 100)}%`,
            wrong: stat.wrong,
            total: stat.total,
            streak,
            last: formatDate(stat.lastDate, idx * 2),
            source: `${targetLvl} · Lịch sử bài làm thực tế`,
            reason,
            prompt: `Dạng bài: ${name} (${stat.wrong}/${stat.total} câu sai)`,
            selected: 'Phương án chưa chính xác',
            correct: 'Đáp án chuẩn JEES',
            explain: `Bạn đã làm sai ${stat.wrong} trên tổng số ${stat.total} câu dạng ${name}. ${reason}.`,
          };
        });

      if (realQuestionItems.length > 0) {
        result['question'] = realQuestionItems;
      }
    }

    return result;
  }, [mistakes, hasNoData, level, isDemoMode, hasSubmittedAttempts, submittedAttempts, questionAttempts]);

  const allRecords = useMemo(() => Object.values(computedMistakes).flat(), [computedMistakes]);
  const totalErrors = propTotalErrors ?? allRecords.reduce((acc, r) => acc + r.wrong, 0);
  const streakCount = allRecords.filter((r) => r.streak >= 2).length;

  const currentRecords = computedMistakes[activeTab] || [];

  const filteredRecords = useMemo(() => {
    let list = [...currentRecords];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (r) =>
          r.term.toLowerCase().includes(q) ||
          r.meaning.toLowerCase().includes(q) ||
          r.reason.toLowerCase().includes(q),
      );
    }

    list.sort((a, b) => {
      if (sortBy === 'ratio') {
        return b.wrong / b.total - a.wrong / a.total;
      }
      if (sortBy === 'recent') {
        const [d1, m1, y1] = a.last.split('/').map(Number);
        const [d2, m2, y2] = b.last.split('/').map(Number);
        return new Date(y2!, m2! - 1, d2!).getTime() - new Date(y1!, m1! - 1, d1!).getTime();
      }
      return b.wrong - a.wrong;
    });

    return list;
  }, [currentRecords, searchQuery, sortBy]);

  const tabContextLabels: Record<string, string> = {
    grammar: 'Ngữ pháp thường nhầm: kiểm tra mẫu câu, cách dùng và cấu trúc dễ gây nhầm lẫn.',
    vocab: 'Từ vựng thường sai: kiểm tra nghĩa, cách dùng trong ngữ cảnh và các từ gần nghĩa.',
    kanji: 'Kanji thường sai: kiểm tra cách đọc, từ ghép và cách phân biệt các chữ dễ nhầm.',
    question: 'Câu hỏi thường sai: xem câu trả lời cụ thể, bẫy thường gặp và kỹ năng cần cải thiện.',
  };

  if (hasNoData) {
    return (
      <Card id="mistake-library" className="scroll-mt-20 p-5 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-sm mb-6 text-center">
        <div className="flex flex-col items-center justify-center py-12 max-w-md mx-auto space-y-4">
          <div className="size-14 rounded-2xl bg-slate-100 dark:bg-slate-800/80 flex items-center justify-center text-slate-400">
            <BookmarkCheck className="size-7 text-slate-400" aria-hidden="true" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
              Chưa ghi nhận lỗi sai nào để tổng hợp
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
              Hệ thống sẽ tự động bóc tách các mẫu ngữ pháp, từ vựng, chữ Hán và dạng câu bạn thường mắc lỗi ngay khi bạn hoàn thành bài thi đầu tiên.
            </p>
          </div>
          <Link href="/de-thi">
            <Button variant="primary" size="sm" className="font-bold">
              Làm đề thi thử ngay
            </Button>
          </Link>
        </div>
      </Card>
    );
  }

  return (
    <Card id="mistake-library" className="scroll-mt-20 p-5 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-sm mb-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
        <div>
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
            05 · BỘ SƯU TẬP LỖI SAI CÁ NHÂN
          </span>
          <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-slate-100 mt-0.5">
            Kiến thức tôi thường làm sai
          </h2>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
            Chi tiết từng từ vựng, Kanji, mẫu ngữ pháp và câu hỏi sai trong lịch sử luyện đề
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-bold bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400">
          <AlertCircle className="size-3.5" aria-hidden="true" />
          Cần ôn lại
        </span>
      </div>

      {/* 4 KPI summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 my-4">
        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
          <span className="block text-[11px] text-slate-400 dark:text-slate-500">Kiến thức cần ôn</span>
          <strong className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
            {allRecords.length}
          </strong>
          <span className="text-[10px] text-slate-400 dark:text-slate-500 ml-1">mục</span>
        </div>
        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
          <span className="block text-[11px] text-slate-400 dark:text-slate-500">Lượt trả lời sai</span>
          <strong className="text-2xl font-extrabold text-rose-600 dark:text-rose-400 tracking-tight">
            {totalErrors}
          </strong>
          <span className="text-[10px] text-slate-400 dark:text-slate-500 ml-1">lượt</span>
        </div>
        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
          <span className="block text-[11px] text-slate-400 dark:text-slate-500">Sai liên tiếp ≥ 2</span>
          <strong className="text-2xl font-extrabold text-amber-600 dark:text-amber-400 tracking-tight">
            {streakCount}
          </strong>
          <span className="text-[10px] text-slate-400 dark:text-slate-500 ml-1">mục chú ý</span>
        </div>
        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
          <span className="block text-[11px] text-slate-400 dark:text-slate-500">Đang hiển thị</span>
          <strong className="text-2xl font-extrabold text-indigo-600 dark:text-indigo-400 tracking-tight">
            {filteredRecords.length}
          </strong>
          <span className="text-[10px] text-slate-400 dark:text-slate-500 ml-1">mục đã lọc</span>
        </div>
      </div>

      {/* Toolbar: Tabs & Search/Sort */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 mb-3">
        <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/60 rounded-xl">
          {[
            { key: 'grammar', label: 'Ngữ pháp' },
            { key: 'vocab', label: 'Từ vựng' },
            { key: 'kanji', label: 'Kanji' },
            { key: 'question', label: 'Câu hỏi' },
          ].map((t) => {
            const count = computedMistakes[t.key]?.length ?? 0;
            const isActive = activeTab === t.key;
            return (
              <Button
                key={t.key}
                variant={isActive ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setActiveTab(t.key)}
                className={`text-xs font-bold rounded-lg px-3 py-1.5 ${
                  isActive
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                {t.label} <span className="text-[10px] opacity-70 ml-1">{count}</span>
              </Button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-full sm:w-52">
            <Search className="size-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm kiến thức / nghĩa..."
              className="pl-8 text-xs h-9"
              aria-label="Tìm kiếm kiến thức thường sai"
            />
          </div>
          <div className="w-36">
            <HeroSelect
              aria-label="Sắp xếp danh sách lỗi sai"
              value={sortBy}
              onChange={setSortBy}
              options={SORT_OPTIONS}
              size="sm"
            />
          </div>
        </div>
      </div>

      <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
        {tabContextLabels[activeTab]}
      </p>

      {/* Grid of Mistake Cards */}
      {filteredRecords.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {filteredRecords.map((m, idx) => {
            const ratioPct = Math.round((m.wrong / m.total) * 100);
            return (
              <div
                key={idx}
                className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="min-w-0">
                      <div className="font-extrabold text-base text-slate-900 dark:text-slate-100 break-words" lang="ja">
                        {m.term}
                      </div>
                      {m.stem && (
                        <p className="text-sm text-slate-800 dark:text-slate-200 mt-1 leading-relaxed break-words" lang="ja">
                          {m.stem}
                        </p>
                      )}
                      <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5 leading-relaxed">
                        {m.meaning}
                      </p>
                      {m.selfReason && (
                        <p className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 mt-1">
                          ✎ Lý do bạn chọn: {selfReasonLabel(m.selfReason)}
                        </p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-xl font-extrabold text-rose-600 dark:text-rose-400">
                        {ratioPct}%
                      </span>
                      <small className="block text-[10px] text-slate-400 dark:text-slate-500">tỷ lệ sai</small>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden my-2.5">
                    {/* ui-allow-style: dynamic mistake ratio bar */}
                    <div
                      className="h-full bg-rose-500 rounded-full"
                      style={{ width: `${ratioPct}%` }} /* ui-allow-style: dynamic mistake ratio bar */
                    />
                  </div>

                  <div className="flex justify-between items-center text-[10px] text-slate-400 dark:text-slate-500">
                    <span>
                      Sai <strong className="text-slate-700 dark:text-slate-300">{m.wrong}/{m.total}</strong> lượt{m.total < 3 ? ' · mẫu nhỏ' : ''}
                    </span>
                    <span>
                      Gần nhất: <strong className="text-slate-700 dark:text-slate-300">{m.last}</strong>
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 pt-3 mt-3 border-t border-slate-100 dark:border-slate-800">
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                      m.streak > 0
                        ? 'bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                        : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400'
                    }`}
                  >
                    {m.streak > 0 ? `↻ Sai liên tiếp ${m.streak} lần` : '✓ Đã có lượt làm đúng'}
                  </span>

                  <div className="flex items-center gap-1.5">
                    {activeTab !== 'question' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => addToNotebook(m)}
                        disabled={notebookState[notebookKey(m)] === 'saving' || notebookState[notebookKey(m)] === 'done'}
                        className="text-xs font-bold"
                      >
                        {notebookState[notebookKey(m)] === 'done'
                          ? '✓ Đã vào sổ tay'
                          : notebookState[notebookKey(m)] === 'error'
                            ? 'Thử lại sổ tay'
                            : '+ Sổ tay'}
                      </Button>
                    )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onOpenQuestionDetail(m)}
                    className="text-xs font-bold"
                  >
                    Xem câu sai
                    <ArrowRight className="size-3.5 inline ml-1" aria-hidden="true" />
                  </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-10 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-slate-400 dark:text-slate-500 text-xs">
          Không có kiến thức phù hợp từ khóa tìm kiếm. Hãy thử từ khóa khác.
        </div>
      )}

      {/* Bottom Actions & Footnote */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-4 mt-4 border-t border-slate-100 dark:border-slate-800">
        <div className="flex items-start gap-2 text-[11px] text-slate-400 dark:text-slate-500 leading-relaxed max-w-xl">
          <Info className="size-3.5 shrink-0 mt-0.5 text-slate-400" aria-hidden="true" />
          <span>
            Chỉ số bóc tách từ các đề thi bạn đã làm. Các mẫu sai nhiều và lặp lại liên tục được ưu tiên hiển thị để hỗ trợ luyện tập trọng điểm.
          </span>
        </div>

        {filteredRecords.length === 0 ? (
          <Button variant="primary" size="sm" disabled className="whitespace-nowrap font-bold">
            <RefreshCw className="size-3.5 inline mr-1.5" aria-hidden="true" />
            Luyện lại các mục đang lọc
          </Button>
        ) : (
          <Link
            href={buildPracticeHref({
              level: level as 'N1' | 'N2' | 'N3' | 'N4' | 'N5',
              pool: 'wrong',
              skills: TAB_SKILLS[activeTab],
              count: Math.min(20, filteredRecords.length * 2),
              label: `Câu đã làm sai · ${(tabContextLabels[activeTab] ?? '').split(':')[0]}`,
            })}
          >
            <Button variant="primary" size="sm" className="whitespace-nowrap font-bold">
              <RefreshCw className="size-3.5 inline mr-1.5" aria-hidden="true" />
              Luyện lại các câu sai của tab này
            </Button>
          </Link>
        )}
      </div>
    </Card>
  );
}
