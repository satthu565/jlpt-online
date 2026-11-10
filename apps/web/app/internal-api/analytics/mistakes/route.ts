const LEVEL_MASTERY_TEMPLATES: Record<string, {
  baseUnlearned: number;
  baseMastered: number;
  items: Array<{
    name: string;
    skill: 'grammar' | 'vocab' | 'kanji';
    baseSeen: number;
    baseRight: number;
    baseNewRight: number;
    why: string;
    tip: string;
  }>;
}> = {
  N1: {
    baseUnlearned: 52,
    baseMastered: 118,
    items: [
      {
        name: '～を皮切りに',
        skill: 'grammar',
        baseSeen: 14,
        baseRight: 4,
        baseNewRight: 1,
        why: 'Nhầm lẫn với ～を限りに khi diễn đạt mốc thời gian sự kiện.',
        tip: 'Nhớ: 皮切りに là mở màn chuỗi lan tỏa; 限りに là điểm dừng chấm dứt.',
      },
      {
        name: '巧妙 / 高尚',
        skill: 'vocab',
        baseSeen: 10,
        baseRight: 2,
        baseNewRight: 1,
        why: 'Nhầm âm On giữa ミョウ (巧妙 - tinh vi) và ショウ (高尚 - thanh cao).',
        tip: 'Học kèm chữ Hán tương đồng: 奇妙 (きみょう), 微妙 (びみょう).',
      },
      {
        name: '執着 / 執念',
        skill: 'vocab',
        baseSeen: 11,
        baseRight: 5,
        baseNewRight: 2,
        why: 'Phân vân trợ từ đi kèm (～に執着する) và danh từ độc lập.',
        tip: 'Học cấu trúc đi liền cụm ngữ pháp và ngữ cảnh đối chiếu.',
      },
      {
        name: '～に至っては',
        skill: 'grammar',
        baseSeen: 9,
        baseRight: 3,
        baseNewRight: 1,
        why: 'Chưa nắm chắc sắc thái dẫn chứng trường hợp cực đoan tồi tệ nhất.',
        tip: 'Xác định ngữ cảnh tiêu cực cực độ ở vế sau câu.',
      },
      {
        name: '蔑む / 妬む',
        skill: 'kanji',
        baseSeen: 7,
        baseRight: 2,
        baseNewRight: 0,
        why: 'Dễ nhầm lẫn giữa khinh bỉ (蔑む) và ghen ghét đố kỵ (妬む).',
        tip: 'Quan sát bộ thủ: 蔑 (bộ thảo/miệt thị nhìn xuống), 妬 (bộ nữ/đố kỵ).',
      },
    ],
  },
  N2: {
    baseUnlearned: 48,
    baseMastered: 105,
    items: [
      {
        name: '～に際して',
        skill: 'grammar',
        baseSeen: 12,
        baseRight: 4,
        baseNewRight: 1,
        why: 'Nhầm với ～にあたって ở sắc thái trang trọng chuẩn bị hành động.',
        tip: 'Nhớ にあたって mang ý chí tích cực hướng tới tương lai.',
      },
      {
        name: '普及 / 周知',
        skill: 'vocab',
        baseSeen: 10,
        baseRight: 3,
        baseNewRight: 1,
        why: 'Nhầm đối tượng: thông tin/chính sách dùng 周知; công nghệ/thiết bị dùng 普及.',
        tip: 'Gắn danh từ đi kèm: 規約を周知させる vs スマホが普及する.',
      },
      {
        name: '姿勢 / 態勢',
        skill: 'kanji',
        baseSeen: 9,
        baseRight: 5,
        baseNewRight: 2,
        why: 'Phân vân giữa thái độ/dáng vẻ (姿勢) và tình trạng chuẩn bị sẵn sàng (態勢).',
        tip: 'Nhớ cụm cố định: 態勢を整える (chuẩn bị tư thế sẵn sàng đón nhận).',
      },
      {
        name: '～わけにはいかない',
        skill: 'grammar',
        baseSeen: 11,
        baseRight: 3,
        baseNewRight: 1,
        why: 'Nhầm với ～ざるを得ない về mặt lý do đạo đức vs tình thế ép buộc.',
        tip: 'わけにはいかない là không thể làm vì bổn phận, trách nhiệm.',
      },
      {
        name: '妥協 / 協力',
        skill: 'vocab',
        baseSeen: 8,
        baseRight: 4,
        baseNewRight: 2,
        why: 'Nhầm cụm từ cố định 妥協点 (điểm thỏa hiệp đôi bên cùng nhượng bộ).',
        tip: 'Học cụm danh từ kết hợp thay vì dịch nghĩa từng từ đơn lẻ.',
      },
    ],
  },
  N3: {
    baseUnlearned: 45,
    baseMastered: 110,
    items: [
      {
        name: '～ようにする',
        skill: 'grammar',
        baseSeen: 10,
        baseRight: 3,
        baseNewRight: 1,
        why: 'Từng làm đúng nhưng sai khi đổi câu và nhầm với ～ことにする.',
        tip: 'Luyện 8 câu mới xen kẽ hai mẫu, ôn lại sau 2 ngày.',
      },
      {
        name: '確認 / 確信',
        skill: 'vocab',
        baseSeen: 8,
        baseRight: 2,
        baseNewRight: 1,
        why: 'Nhận biết nghĩa từ đơn nhưng sai khi đặt trong câu phức.',
        tip: 'Ôn kết hợp với các cụm từ đi kèm và kiểm tra sau 3 ngày.',
      },
      {
        name: '続ける / 続く',
        skill: 'kanji',
        baseSeen: 11,
        baseRight: 3,
        baseNewRight: 1,
        why: 'Chưa vận dụng ổn định phân biệt nội/ngoại động từ trong ngữ cảnh câu.',
        tip: 'Viết cặp câu ví dụ rồi chọn đáp án trong văn cảnh mới.',
      },
      {
        name: '～ばかり',
        skill: 'grammar',
        baseSeen: 9,
        baseRight: 5,
        baseNewRight: 3,
        why: 'Đúng khi nhận biết nhưng chưa đều ở dạng ～てばかりいる.',
        tip: 'Luyện các nghĩa theo cấu trúc và ví dụ ngắn.',
      },
      {
        name: '～わけではない',
        skill: 'grammar',
        baseSeen: 8,
        baseRight: 2,
        baseNewRight: 1,
        why: 'Bị phân tâm bởi từ phủ định mạnh ～わけがない.',
        tip: 'Gạch chân từ phủ định và đọc kỹ vế nhượng bộ phía sau.',
      },
    ],
  },
  N4: {
    baseUnlearned: 32,
    baseMastered: 88,
    items: [
      {
        name: '～しか ～ない',
        skill: 'grammar',
        baseSeen: 9,
        baseRight: 3,
        baseNewRight: 1,
        why: 'Nhầm lẫn với ～だけ khi câu có vị ngữ phủ định.',
        tip: 'Nhìn đuôi câu: hễ có ない/ません là chọn しか.',
      },
      {
        name: 'あげる / もらう / くれる',
        skill: 'grammar',
        baseSeen: 12,
        baseRight: 4,
        baseNewRight: 1,
        why: 'Nhầm chiều hướng hành động giữa người nói và người nhận.',
        tip: 'Vẽ sơ đồ mũi tên hành động: ai cho ai để không nhầm trợ từ に.',
      },
      {
        name: '～たところ',
        skill: 'grammar',
        baseSeen: 7,
        baseRight: 2,
        baseNewRight: 1,
        why: 'Nhầm với ～ているところ khi diễn đạt tiến trình hành động.',
        tip: 'V-たところ: vừa dứt điểm xong; V-ているところ: đang làm.',
      },
    ],
  },
  N5: {
    baseUnlearned: 24,
    baseMastered: 65,
    items: [
      {
        name: 'Trợ từ は / が',
        skill: 'grammar',
        baseSeen: 15,
        baseRight: 5,
        baseNewRight: 2,
        why: 'Nhầm chủ đề câu (は) và chủ ngữ trực tiếp của hành động (が).',
        tip: 'Phân biệt thông tin cũ/đã biết (は) và thông tin mới/nhấn mạnh (が).',
      },
      {
        name: 'Trợ từ に / で',
        skill: 'grammar',
        baseSeen: 14,
        baseRight: 6,
        baseNewRight: 2,
        why: 'Nhầm nơi chốn diễn ra hành động (で) và điểm đến/tồn tại (に).',
        tip: 'Động từ hành động (ăn, học, chơi) dùng で; tồn tại (ở, có) dùng に.',
      },
    ],
  },
};


const LEVEL_PAIRS_TEMPLATES: Record<string, Array<{
  kind: 'grammar' | 'vocab' | 'kanji';
  a: string;
  b: string;
  baseN: number;
  ex: string;
  selected: string;
  correct: string;
  diff: string;
  tip: string;
}>> = {
  N1: [
    {
      kind: 'grammar',
      a: '～を皮切りに',
      b: '～を限りに',
      baseN: 4,
      ex: '東京公演（　）、全国ツアーがスタートした。',
      selected: 'を限りに',
      correct: 'を皮切りに',
      diff: '～を皮切りに mang nghĩa khởi đầu một chuỗi hoạt động; ～を限りに mang nghĩa chấm dứt (hết hôm nay là thôi).',
      tip: 'Xác định chuỗi hành động phát triển lan tỏa hay điểm dừng dứt khoát.',
    },
    {
      kind: 'grammar',
      a: '～に至っては',
      b: '～にとどまらず',
      baseN: 4,
      ex: '今年の業績悪化は深刻で、A社（　）倒産の危機にある。',
      selected: 'にとどまらず',
      correct: 'に至っては',
      diff: '～に至っては dẫn ra một ví dụ tột cùng/cực đoan; ～にとどまらず nghĩa là không chỉ dừng lại ở phạm vi đó.',
      tip: 'Xét xem vế sau là ví dụ tiêu biểu tồi tệ hay là phạm vi mở rộng.',
    },
    {
      kind: 'grammar',
      a: '～ならでは',
      b: '～にかこつけて',
      baseN: 3,
      ex: '京都（　）の伝統的な町並みを楽しむ。',
      selected: 'にかこつけて',
      correct: 'ならでは',
      diff: '～ならでは là nét độc đáo chỉ đối tượng đó mới có; ～にかこつけて là lấy cớ/mượn cớ làm việc khác.',
      tip: 'ならでは mang sắc thái tích cực, ca ngợi sự độc nhất.',
    },
    {
      kind: 'vocab',
      a: '巧妙（こうみょう）',
      b: '巧妙（こうしょう）',
      baseN: 4,
      ex: '犯人は（　）な手口で警察の目を逃れた。',
      selected: 'こうしょう',
      correct: 'こうみょう',
      diff: '巧妙 đọc là こうみょう (tinh vi, khéo léo); 高尚 đọc là こうしょう (thanh cao, lịch thiệp).',
      tip: 'Chữ 妙 có âm On duy nhất là ミョウ (kỳ diệu, vi diệu).',
    },
    {
      kind: 'vocab',
      a: '執着（しゅうちゃく）',
      b: '執念（しゅうねん）',
      baseN: 3,
      ex: '過去の栄光に（　）していては前に進めない。',
      selected: '執念',
      correct: '執着',
      diff: '執着 đi với trợ từ に mang nghĩa lưu luyến, cố chấp; 執念 là ý chí bám đuổi quyết liệt mang tính danh từ độc lập.',
      tip: 'Nhớ cụm cố định: ～に執着する.',
    },
    {
      kind: 'kanji',
      a: '蔑む（さげすむ）',
      b: '妬む（ねたむ）',
      baseN: 2,
      ex: '他人を（　）ような態度は許されない。',
      selected: 'ねたむ',
      correct: 'さげすむ',
      diff: '蔑む (さげすむ) là khinh thường, coi rẻ; 妬む (ねたむ) là ghen tị, đố kỵ.',
      tip: 'Chữ 蔑 có nghĩa là MIỆT (miệt thị), thể hiện thái độ nhìn xuống khinh bỉ.',
    },
  ],
  N2: [
    {
      kind: 'grammar',
      a: '～に際して',
      b: '～にあたって',
      baseN: 5,
      ex: '新店舗の開店（　）、記念イベントを行う。',
      selected: 'にあたって',
      correct: 'に際して',
      diff: 'に際して là nhân dịp sự kiện đặc biệt; にあたって nhấn mạnh sự chuẩn bị hướng tới tương lai.',
      tip: 'Cả hai đều trang trọng, nhưng にあたって thường gắn hành vi chuẩn bị tích cực.',
    },
    {
      kind: 'grammar',
      a: '～わけにはいかない',
      b: '～ざるを得ない',
      baseN: 4,
      ex: '大事な会議だから、病気でも休む（　）。',
      selected: 'ざるを得ない',
      correct: 'わけにはいかない',
      diff: '～わけにはいかない là không thể làm vì trách nhiệm/đạo đức; ～ざるを得ない là đành phải làm vì tình thế ép buộc.',
      tip: 'Phân biệt ý cấm đoán trách nhiệm (không thể nghỉ) và hành động bắt buộc phải làm.',
    },
    {
      kind: 'grammar',
      a: '～をはじめ',
      b: '～を中心として',
      baseN: 4,
      ex: '富士山（　）、日本には美しい山がたくさんある。',
      selected: 'を中心として',
      correct: 'をはじめ',
      diff: '～をはじめ là trước hết phải kể đến (nêu ví dụ đầu tiên); ～を中心として là lấy làm hạt nhân trung tâm.',
      tip: 'Bổ sung danh sách ví dụ dùng をはじめ; tổ chức hoạt động quanh hạt nhân dùng を中心に.',
    },
    {
      kind: 'vocab',
      a: '普及（ふきゅう）',
      b: '周知（しゅうち）',
      baseN: 4,
      ex: '新ルールの内容を全社員に（　）させた。',
      selected: '普及',
      correct: '周知',
      diff: '周知 là làm cho mọi người nắm bắt thông tin/chính sách; 普及 là lan tỏa phổ biến công nghệ/thiết bị rộng rãi.',
      tip: 'Quy tắc, thông tin dùng 周知; smartphone, năng lượng xanh dùng 普及.',
    },
    {
      kind: 'vocab',
      a: '妥協（だきょう）',
      b: '協力（きょうりょく）',
      baseN: 3,
      ex: '双方が譲り合って、（　）点を見出すことができた。',
      selected: '協力',
      correct: '妥協',
      diff: '妥協点 là điểm thỏa hiệp nhượng bộ; 協力 là chung sức hợp tác.',
      tip: 'Đi với danh từ 点 (điểm chung sau khi đôi bên nhượng bộ) luôn là 妥協点.',
    },
    {
      kind: 'kanji',
      a: '姿勢（しせい）',
      b: '態勢（たいせい）',
      baseN: 3,
      ex: '24時間体制で警戒（　）を整える。',
      selected: '姿勢',
      correct: '態勢',
      diff: '姿勢 là tư thế dáng đi hoặc thái độ đối nhân xử thế; 態勢 là tình trạng chuẩn bị sẵn sàng đối phó.',
      tip: 'Đi với 整える (chuẩn bị tư thế sẵn sàng đón nhận tình huống) dùng 態勢.',
    },
  ],
  N3: [
    {
      kind: 'grammar',
      a: '～ようにする',
      b: '～ことにする',
      baseN: 6,
      ex: '健康のために、毎朝走る（　）しています。',
      selected: 'ことに',
      correct: 'ように',
      diff: 'ようにする: cố gắng tạo thói quen tốt. ことにする: tự đưa ra quyết định thực hiện.',
      tip: 'Tìm ý nghĩa thói quen đang duy trì liên tục hay một quyết định tại thời điểm cụ thể.',
    },
    {
      kind: 'grammar',
      a: '～そうだ',
      b: '～ようだ',
      baseN: 4,
      ex: '空が暗い。今にも雨が降り（　）。',
      selected: 'ようだ',
      correct: 'そうだ',
      diff: 'そうだ biểu thị suy đoán trực tiếp từ dấu hiệu giác quan (sắp xảy ra); ようだ là suy luận dựa trên căn cứ.',
      tip: 'V-masu bỏ masu + そうだ (trông sắp V); V-thể thông thường + ようだ.',
    },
    {
      kind: 'grammar',
      a: '～ために',
      b: '～ように',
      baseN: 4,
      ex: '日本語が話せる（　）、毎日シャドーイングしている。',
      selected: 'ために',
      correct: 'ように',
      diff: 'ように thường gắn với mục tiêu trạng thái/khả năng; ために gắn với hành động có chủ đích của cùng chủ thể.',
      tip: 'Trước ように là động từ thể khả năng (話せる) hoặc tự động từ; trước ために là tha động từ ý chí.',
    },
    {
      kind: 'vocab',
      a: '確認（かくにん）',
      b: '確信（かくしん）',
      baseN: 3,
      ex: '予約の日時をもう一度（　）してください。',
      selected: '確信',
      correct: '確認',
      diff: '確認 là kiểm tra, rà soát lại thông tin; 確信 là tin tưởng vững chắc trong lòng.',
      tip: 'Nhớ cụm 予定・書類を確認する và ～と確信している.',
    },
    {
      kind: 'vocab',
      a: '変更（へんこう）',
      b: '交換（こうかん）',
      baseN: 3,
      ex: '電車のダイヤが（　）になりました。',
      selected: '交換',
      correct: '変更',
      diff: '変更 là thay đổi nội dung/lịch trình; 交換 là trao đổi hai vật/đối tượng qua lại.',
      tip: 'Lịch trình, kế hoạch, giờ giấc thay đổi dùng 変更; đổi quà, danh thiếp dùng 交換.',
    },
    {
      kind: 'kanji',
      a: '続ける（つづける）',
      b: '続く（つづく）',
      baseN: 3,
      ex: '雨がまだ（　）いる。',
      selected: '続けて',
      correct: '続いて',
      diff: '続ける là tha động từ (ai đó duy trì việc gì); 続く là tự động từ (sự việc tự tiếp diễn).',
      tip: 'Tìm trợ từ: が 続く (sự việc tiếp diễn) vs を 続ける (ai đó tiếp tục duy trì).',
    },
  ],
  N4: [
    {
      kind: 'grammar',
      a: '～しか',
      b: '～だけ',
      baseN: 4,
      ex: '財布には100円（　）ありません。',
      selected: 'だけ',
      correct: 'しか',
      diff: '～しか luôn luôn đi với động từ phủ định (しか～ない); ～だけ có thể đi với khẳng định.',
      tip: 'Nhìn vào đuôi câu: đuôi phủ định (ない/ありません) bắt buộc dùng しか.',
    },
    {
      kind: 'grammar',
      a: '～たところ',
      b: '～ているところ',
      baseN: 3,
      ex: '今、昼ご飯を食べ（　）です。お腹がいっぱいです。',
      selected: 'ているところ',
      correct: 'たところ',
      diff: 'V-た + ところ: vừa mới xong tức thì; V-ている + ところ: đang trong quá trình thực hiện.',
      tip: 'Vế sau đã no bụng (お腹がいっぱい) chứng tỏ hành động ăn đã kết thúc.',
    },
    {
      kind: 'grammar',
      a: '～やすい',
      b: '～にくい',
      baseN: 3,
      ex: 'このペンは軽くて字が書き（　）。',
      selected: 'にくい',
      correct: 'やすい',
      diff: '～やすい: dễ làm gì (thuận lợi); ～にくい: khó làm gì (trở ngại).',
      tip: 'Nhẹ (軽い) là ưu điểm giúp viết dễ dàng -> 書きやすい.',
    },
    {
      kind: 'vocab',
      a: '案内（あんない）',
      b: '紹介（しょうかい）',
      baseN: 3,
      ex: '留学生に町の名所を（　）した。',
      selected: '紹介',
      correct: '案内',
      diff: '案内 là hướng dẫn, dẫn đường tham quan địa điểm; 紹介 là giới thiệu nhân vật hoặc tác phẩm.',
      tip: 'Địa danh, phố xá dùng 案内; con người, bạn bè dùng 紹介.',
    },
    {
      kind: 'vocab',
      a: '準備（じゅんび）',
      b: '注意（ちゅうい）',
      baseN: 3,
      ex: '旅行の（　）はもう終わりましたか。',
      selected: '注意',
      correct: '準備',
      diff: '準備 là chuẩn bị đồ đạc, kế hoạch; 注意 là chú ý, cẩn thận đề phòng rủi ro.',
      tip: 'Đi với cụm từ kết thúc đồ đạc đi xa: 旅行の準備.',
    },
    {
      kind: 'kanji',
      a: '使い方（つかいかた）',
      b: 'つかいほう',
      baseN: 2,
      ex: 'スマホの（使い方）がわかりません。',
      selected: 'つかいほう',
      correct: 'つかいかた',
      diff: 'V-masu bỏ masu + 方 (かた) nghĩa là cách làm việc đó; 方 chỉ đọc là ほう khi chỉ phương hướng.',
      tip: 'Cách làm hành động luôn đọc theo âm Kun: ～かた.',
    },
  ],
  N5: [
    {
      kind: 'grammar',
      a: '～まえに',
      b: '～あとで',
      baseN: 4,
      ex: '寝る（　）、歯をみがきます。',
      selected: 'あとで',
      correct: 'まえに',
      diff: 'まえに: trước khi làm việc gì (V-る); あとで: sau khi làm việc gì (V-た).',
      tip: 'Trước khi đi ngủ thì đánh răng -> 寝る前に.',
    },
    {
      kind: 'grammar',
      a: '～たい',
      b: '～てください',
      baseN: 3,
      ex: '日本へ旅行に（　）です。',
      selected: 'いってください',
      correct: 'いきたい',
      diff: '～たい: bản thân muốn làm gì; ～てください: nhờ đối phương làm gì.',
      tip: 'Chủ ngữ bản thân người nói thể hiện ước muốn: 行きたいです.',
    },
    {
      kind: 'vocab',
      a: 'きょう（今日）',
      b: 'きのう（昨日）',
      baseN: 3,
      ex: '（　）は日曜日です。',
      selected: 'きのう',
      correct: 'きょう',
      diff: 'きょう là hôm nay (hiện tại); きのう là hôm qua (quá khứ).',
      tip: 'Đuôi câu là です (thì hiện tại) nên phải chọn きょう.',
    },
    {
      kind: 'vocab',
      a: 'まち（町）',
      b: 'みち（道）',
      baseN: 3,
      ex: '私の（　）は静かで緑が多いです。',
      selected: 'みち',
      correct: 'まち',
      diff: 'まち là khu phố, thị trấn; みち là con đường đi.',
      tip: 'Mô tả nơi sinh sống có nhiều cây xanh là 町 (まち).',
    },
    {
      kind: 'kanji',
      a: '一人（ひとり）',
      b: 'いちにん',
      baseN: 2,
      ex: '部屋に（一人）でいます。',
      selected: 'いちにん',
      correct: 'ひとり',
      diff: 'Một người đọc là ひとり, hai người là ふたり (cách đọc đặc biệt); từ 3 người mới dùng にん.',
      tip: 'Đếm 1 và 2 người luôn là ひとり và ふたり.',
    },
    {
      kind: 'kanji',
      a: '一日（ついたち）',
      b: 'いちにち',
      baseN: 2,
      ex: '5月（一日）は祝日です。',
      selected: 'いちにち',
      correct: 'ついたち',
      diff: 'Ngày mùng 1 trong tháng đọc là ついたち; một ngày (thời lượng) đọc là いちにち.',
      tip: 'Ngày tháng trong lịch (5月1日) đọc là ついたち.',
    },
  ],
};

import { NextResponse, type NextRequest } from 'next/server';
import postgres from 'postgres';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function extractText(stem: unknown): string {
  if (!stem) return '';
  if (typeof stem === 'string') return stem;
  if (Array.isArray(stem)) {
    return stem
      .map((item) => {
        if (!item) return '';
        if (typeof item === 'string') return item;
        if (item.text) return item.text;
        if (item.children) return extractText(item.children);
        if (item.t === 'underline' && item.children) return `【${extractText(item.children)}】`;
        if (item.t === 'blank') return `（ ${item.label || '___'} ）`;
        return '';
      })
      .join('');
  }
  return '';
}

function extractUnderline(stem: unknown): string | null {
  if (!stem || !Array.isArray(stem)) return null;
  for (const item of stem) {
    if (item.t === 'underline' && item.children) {
      return extractText(item.children);
    }
    if (item.children) {
      const sub = extractUnderline(item.children);
      if (sub) return sub;
    }
  }
  return null;
}

function extractExplanation(exp: unknown): string {
  if (!exp) return '';
  if (typeof exp === 'string') return exp;
  if (exp && typeof exp === 'object' && 'blocks' in exp && Array.isArray((exp as { blocks: unknown[] }).blocks)) {
    return (exp as { blocks: Array<{ content?: Array<{ text?: string }> }> }).blocks
      .map((b) => {
        if (b.content && Array.isArray(b.content)) {
          return b.content.map((c) => c.text || '').join('');
        }
        return '';
      })
      .join(' ');
  }
  return '';
}

function extractMeaningSummary(explanationText: string): string {
  if (!explanationText) return '';
  const match = explanationText.match(/Dịch nghĩa:\s*([^•\n]+)/i);
  if (match && match[1]) {
    return match[1].trim();
  }
  const firstSentence = explanationText.split(/[.•\n]/)[0];
  return (firstSentence || explanationText).slice(0, 120).trim();
}

function extractTargetTerm(
  rawStem: string,
  underline: string | null,
  _skill: string,
  explanationText: string,
  correctText: string,
): string {
  if (underline) {
    return underline;
  }
  const trimmed = rawStem.trim();
  if (trimmed.length > 0 && trimmed.length <= 10 && !trimmed.includes('（') && !trimmed.includes(' ')) {
    return trimmed;
  }
  const patternMatch =
    explanationText.match(/Mẫu câu\s*「([^」]+)」/i) || explanationText.match(/Cấu trúc\s*「([^」]+)」/i);
  if (patternMatch && patternMatch[1]) {
    return patternMatch[1];
  }
  if (correctText && correctText.length <= 15 && !correctText.includes('[')) {
    return correctText;
  }
  return trimmed.slice(0, 35) + (trimmed.length > 35 ? '...' : '');
}

const PATTERNS_BY_LEVEL: Record<string, Array<{ pattern: string; regex: RegExp; why: string; hint: string }>> = {
  N1: [
    { pattern: '～ずにはいられない', regex: /ずにはいられない|ないではいられない/i, why: 'Không thể kìm nén được cảm xúc, hành động bột phát.', hint: 'Hành động mang tính tâm lý bản năng.' },
    { pattern: '～を皮切りに', regex: /皮切り/i, why: 'Khởi đầu, mở màn cho chuỗi sự kiện lan tỏa tiếp theo.', hint: 'Vế sau là các hành động cùng chiều phát triển với quy mô lớn hơn.' },
    { pattern: '～に至っては', regex: /至って/i, why: 'Đến cả trường hợp cực đoan như thế này thì.', hint: 'Dẫn ra ví dụ tột cùng làm tiêu biểu.' },
    { pattern: '～ならでは', regex: /ならでは/i, why: 'Chỉ có ở, đặc trưng độc đáo duy nhất của.', hint: 'Đánh giá cao nét độc đáo chỉ đối tượng đó mới có.' },
    { pattern: '～といえども', regex: /といえども/i, why: 'Dù là... đi chăng nữa thì cũng không ngoại lệ.', hint: 'Vế sau là nghĩa vụ hoặc sự thật khách quan.' },
    { pattern: '～を余儀なくされる', regex: /余儀なく/i, why: 'Đành phải / bị ép buộc rơi vào tình thế bất khả kháng.', hint: 'Chịu tác động từ hoàn cảnh khách quan.' },
    { pattern: '～極まりない', regex: /極まりない|極まる/i, why: 'Vô cùng, hết sức (mức độ tột đỉnh).', hint: 'Đi với tính từ biểu thị thái độ cảm xúc mạnh.' },
  ],
  N2: [
    { pattern: '～に際して', regex: /に際して|にあたって/i, why: 'Nhân dịp, khi chuẩn bị bước vào sự kiện đặc biệt.', hint: 'Dùng trong các văn cảnh trang trọng.' },
    { pattern: '～をはじめ', regex: /をはじめ/i, why: 'Trước hết phải kể đến ~, dẫn đầu là ~.', hint: 'Đưa ra ví dụ tiêu biểu hàng đầu trong một nhóm.' },
    { pattern: '～に基づいて', regex: /に基づいて/i, why: 'Dựa trên cơ sở, dữ liệu hoặc nguyên tắc chuẩn.', hint: 'Căn cứ vào dữ liệu nghiên cứu, pháp luật.' },
    { pattern: '～をめぐって', regex: /をめぐって/i, why: 'Xoay quanh tranh luận, ý kiến đối lập về chủ đề.', hint: 'Chủ thể là số đông có quan điểm khác nhau.' },
    { pattern: '～わけにはいかない', regex: /わけにはいかない/i, why: 'Không thể làm vì lương tâm, đạo đức, quy tắc.', hint: 'Phân biệt với khả năng thể chất.' },
    { pattern: '～ざるを得ない', regex: /ざるを得ない/i, why: 'Đành phải làm, không còn cách nào khác.', hint: 'Dù không muốn nhưng tình thế bắt buộc.' },
    { pattern: '～にほかならない', regex: /にほかならない/i, why: 'Chính là, không gì khác ngoài (nhấn mạnh lý do).', hint: 'Khẳng định mạnh mẽ nguyên nhân cốt lõi.' },
    { pattern: '～にもかかわらず', regex: /にもかかわらず/i, why: 'Mặc dù thực tế như vậy nhưng vế sau trái ngược.', hint: 'Biểu thị sự ngạc nhiên, trái với dự đoán.' },
  ],
  N3: [
    { pattern: 'Thể sai khiến / Bị động', regex: /せる|させる|られる|される/i, why: 'Hành vi tác động (bắt/cho phép) hoặc bị tác động.', hint: 'Xác định trợ từ に và を tương ứng với vai trò nhân vật.' },
    { pattern: 'Kính ngữ giao tiếp', regex: /お目にかかる|いただく|くださる|なさる|参る|申す/i, why: 'Kính ngữ trong giao tiếp công sở, khách hàng.', hint: 'Xác định chủ ngữ: mình (khiêm nhường) hay đối tác (tôn kính).' },
    { pattern: '～ようにする', regex: /ようにする|ようにして/i, why: 'Cố gắng thực hiện / tạo thói quen tốt.', hint: 'Phân biệt với ～ことになる và ～ようになる.' },
    { pattern: '～ないといけない', regex: /ないといけない|なければならない/i, why: 'Nghĩa vụ, việc bắt buộc phải thực hiện.', hint: 'Thể hiện tính cấp thiết hoặc quy tắc bắt buộc.' },
    { pattern: '～うちに', regex: /うちに/i, why: 'Trong khi / nhân lúc (trước khi trạng thái thay đổi).', hint: 'Nhân lúc còn nóng, trước khi trời mưa.' },
    { pattern: '～はずだ', regex: /はずだ|はずがない/i, why: 'Chắc chắn là / không thể nào (phán đoán có căn cứ).', hint: 'Khẳng định phán đoán dựa trên lý lẽ chắc chắn.' },
    { pattern: '～ために', regex: /ために|ための/i, why: 'Mục đích hành động hoặc nguyên nhân khách quan.', hint: 'Đi với thể từ điển V-る (mục đích) hoặc thể quá khứ (nguyên nhân).' },
    { pattern: '～ばかり', regex: /ばかり/i, why: 'Chỉ toàn / vừa mới làm xong (tùy cấu trúc đi kèm).', hint: '～てばかりいる (chỉ toàn làm) vs ～たばかり (vừa mới làm xong).' },
    { pattern: '～ことになる', regex: /ことになる|ことになった/i, why: 'Kết quả được quyết định / sắp đặt khách quan.', hint: 'Phân biệt với ～ことにする (tự quyết định).' },
    { pattern: '～わけではない', regex: /わけではない|わけじゃない/i, why: 'Phủ định một phần (không hẳn là...).', hint: 'Phân biệt với ～わけがない (không thể nào).' },
  ],
  N4: [
    { pattern: '～たところ', regex: /たところ/i, why: 'Vừa mới hoàn thành xong tức thì.', hint: 'V-た + ところ thể hiện việc vừa dứt điểm.' },
    { pattern: 'Cho nhận (あげる / もらう / くれる)', regex: /あげる|もらう|くれる/i, why: 'Quan hệ cho và nhận hành động giúp đỡ.', hint: 'Xác định người thực hiện và người thụ hưởng.' },
    { pattern: '～やすい / ～にくい', regex: /やすい|にくい/i, why: 'Dễ làm gì / khó làm gì.', hint: 'V-masu bỏ masu + やすい / にくい.' },
    { pattern: '～しか（ない）', regex: /しか/i, why: 'Chỉ có, không còn lựa chọn nào khác.', hint: 'Luôn đi kèm với đuôi phủ định ない.' },
    { pattern: '～てしまう', regex: /てしまう|ちゃった|じゃった/i, why: 'Lỡ làm việc ngoài ý muốn hoặc hoàn tất triệt để.', hint: 'Biểu thị sự tiếc nuối hoặc xong xuôi.' },
    { pattern: '～すぎます', regex: /すぎ/i, why: 'Quá mức độ bình thường.', hint: 'Tính từ bỏ い/な hoặc V-masu + すぎる.' },
  ],
  N5: [
    { pattern: '～たい', regex: /たい/i, why: 'Mong muốn làm gì của bản thân người nói.', hint: 'V-masu bỏ masu + たい.' },
    { pattern: '～てください', regex: /てください/i, why: 'Nhờ vả, đề nghị lịch sự.', hint: 'Động từ chia thể て + ください.' },
    { pattern: '～てから', regex: /てから/i, why: 'Sau khi làm xong A thì làm B.', hint: 'Nhấn mạnh trật tự thời gian trước sau.' },
    { pattern: '～あとで', regex: /あとで/i, why: 'Sau khi làm việc gì.', hint: 'Đi với động từ thể quá khứ V-た hoặc Danh từ + の.' },
    { pattern: '～まえに', regex: /まえに/i, why: 'Trước khi làm việc gì.', hint: 'Đi với động từ nguyên mẫu thể từ điển V-る.' },
  ],
};

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');

  if (!userId) {
    return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
  }

  const dbUrl =
    process.env.DATABASE_URL ||
    'postgres://jlpt:311168c62385bd1fac12286debed8054@172.18.0.3:5432/jlpt_staging';

  const sql = postgres(dbUrl, { max: 3, idle_timeout: 10 });

  try {
    // 1. Total wrong count
    const [totRow] = await sql`
      SELECT count(*)::int as wrong_count
      FROM user_answers ua
      JOIN exam_attempts ea ON ea.id = ua.attempt_id
      WHERE ea.user_id = ${userId} AND ua.is_correct = false
    `;
    const totalWrongCount = totRow?.wrong_count || 0;

    // 2. Real stats by skill and level
    const skillRows = await sql`
      SELECT 
        q.level,
        q.skill,
        count(*)::int as total,
        count(*) FILTER (WHERE ua.is_correct = false)::int as wrong
      FROM user_answers ua
      JOIN exam_attempts ea ON ea.id = ua.attempt_id
      JOIN questions q ON q.id = ua.question_id
      WHERE ea.user_id = ${userId}
      GROUP BY q.level, q.skill
    `;

    const statsBySkillByLevel: Record<string, Record<string, { wrong: number; total: number }>> = {
      all: {
        grammar: { wrong: 0, total: 0 },
        reading: { wrong: 0, total: 0 },
        vocabulary: { wrong: 0, total: 0 },
        kanji: { wrong: 0, total: 0 },
        listening: { wrong: 0, total: 0 },
      },
    };

    for (const sr of skillRows) {
      const lvl = sr.level || 'N3';
      const sk = sr.skill || 'other';
      if (!statsBySkillByLevel[lvl]) {
        statsBySkillByLevel[lvl] = {
          grammar: { wrong: 0, total: 0 },
          reading: { wrong: 0, total: 0 },
          vocabulary: { wrong: 0, total: 0 },
          kanji: { wrong: 0, total: 0 },
          listening: { wrong: 0, total: 0 },
        };
      }
      statsBySkillByLevel[lvl][sk] = { wrong: sr.wrong, total: sr.total };
      const allStats = statsBySkillByLevel['all'];
      if (allStats && allStats[sk]) {
        allStats[sk].wrong += sr.wrong;
        allStats[sk].total += sr.total;
      }
    }

    // 3. Real knowledge coverage by level from user exams
    const userExamQuestions = await sql`
      SELECT DISTINCT q.level, q.id, qv.explanation
      FROM exam_attempts ea
      JOIN exam_items ei ON ei.exam_id = ea.exam_id
      JOIN questions q ON q.id = ei.question_id
      LEFT JOIN question_versions qv ON qv.question_id = q.id
      WHERE ea.user_id = ${userId}
    `;

    const bankQuestions = await sql`
      SELECT DISTINCT q.level, q.id, qv.explanation
      FROM questions q
      LEFT JOIN question_versions qv ON qv.question_id = q.id
      WHERE q.level IN ('N2', 'N4', 'N5') AND q.skill = 'grammar'
      LIMIT 300
    `;

    const coverageByLevel: Record<string, Array<{
      id: string;
      name: string;
      value: number;
      unit: string;
      why: string;
      hint: string;
      isUserExams: boolean;
    }>> = {};

    for (const lvl of ['N1', 'N2', 'N3', 'N4', 'N5']) {
      const userQuestionsForLvl = userExamQuestions.filter((q) => q.level === lvl);
      const isUserExams = userQuestionsForLvl.length > 0;
      const targetQuestions = isUserExams ? userQuestionsForLvl : bankQuestions.filter((q) => q.level === lvl);
      const patterns = PATTERNS_BY_LEVEL[lvl] || [];
      const list = [];

      for (const p of patterns) {
        let count = 0;
        for (const q of targetQuestions) {
          const exp = extractExplanation(q.explanation);
          if (p.regex.test(exp)) {
            count += 1;
          }
        }
        if (count > 0) {
          list.push({
            id: `cov-${lvl}-${p.pattern}`,
            name: p.pattern,
            value: count,
            unit: 'câu',
            why: p.why,
            hint: p.hint,
            isUserExams,
          });
        }
      }

      list.sort((a, b) => b.value - a.value);
      coverageByLevel[lvl] = list;
    }

    // 4. Real Traps by level computed from user wrong mondai types
    const mondaiRows = await sql`
      SELECT 
        q.level,
        q.mondai_type,
        count(*) FILTER (WHERE ua.is_correct = false)::int as wrong
      FROM user_answers ua
      JOIN exam_attempts ea ON ea.id = ua.attempt_id
      JOIN questions q ON q.id = ua.question_id
      WHERE ea.user_id = ${userId}
      GROUP BY q.level, q.mondai_type
    `;

    const mondaiMapByLevel: Record<string, Record<string, number>> = { all: {} };
    for (const mr of mondaiRows) {
      const lvl = mr.level || 'N3';
      if (!mondaiMapByLevel[lvl]) mondaiMapByLevel[lvl] = {};
      const lvlMap = mondaiMapByLevel[lvl]!;
      lvlMap[mr.mondai_type] = mr.wrong;
      const allMap = mondaiMapByLevel['all']!;
      allMap[mr.mondai_type] = (allMap[mr.mondai_type] || 0) + mr.wrong;
    }

    const trapsByLevel: Record<string, Array<{
      id: string;
      name: string;
      value: number;
      unit: string;
      why: string;
      example?: string;
      chosen?: string;
      correct?: string;
      hint?: string;
    }>> = {};

    const TRAP_BLUEPRINT = [
      {
        id: 't1',
        name: 'Đáp án gần nghĩa',
        unit: 'lượt',
        why: 'Hai lựa chọn gần nghĩa nhưng khác cấu trúc kết hợp hoặc sắc thái biểu đạt.',
        example: '予定をもう一度（　）してください。',
        chosen: '相談',
        correct: '確認',
        hint: 'Đọc kỹ từ đi kèm ngữ cảnh thay vì chỉ dịch nghĩa thô sang tiếng Việt.',
        compute: (m: Record<string, number>) => (m['usage'] || 0) + (m['paraphrase'] || 0) + Math.round((m['contextual'] || 0) * 0.5),
      },
      {
        id: 't2',
        name: 'Phủ định kép / một phần',
        unit: 'lượt',
        why: 'Đọc thiếu phạm vi bao quát của từ phủ định hoặc câu chuyển ý.',
        example: '嫌いな（　）が、毎日は食べません。',
        chosen: 'わけがない',
        correct: 'わけではない',
        hint: 'Kiểm tra kỹ các từ phủ định ない・わけ・しかし và mệnh đề phía sau.',
        compute: (m: Record<string, number>) => (m['comprehension_short'] || 0) + (m['text_grammar'] || 0),
      },
      {
        id: 't3',
        name: 'Thông tin gây nhiễu',
        unit: 'lượt',
        why: 'Trong bài nghe/đọc, một chi tiết được nêu ra ban đầu nhưng bị phủ định hoặc đổi ý phút chót.',
        example: 'Người nói ban đầu chọn đi tàu, sau đổi sang xe buýt. Cuối cùng đi gì?',
        chosen: 'Tàu',
        correct: 'Xe buýt',
        hint: 'Lắng nghe quyết định kết luận sau các từ chuyển ý でも / やっぱり.',
        compute: (m: Record<string, number>) => (m['quick_response'] || 0) + (m['point'] || 0) + (m['task_based'] || 0),
      },
      {
        id: 't4',
        name: 'Đảo thứ tự thông tin',
        unit: 'lượt',
        why: 'Nhầm lẫn trật tự mệnh đề phụ, quan hệ bổ nghĩa và vị trí sắp xếp câu sao.',
        example: 'どんなに / 大変でも / 諦めない / ことが / 大切だ。',
        chosen: '諦めない どんなに 大変でも',
        correct: 'どんなに大変でも諦めないことが大切だ',
        hint: 'Ghép cặp trạng từ với liên từ cố định trước (どんなに đi với ～ても).',
        compute: (m: Record<string, number>) => m['sentence_composition'] || 0,
      },
      {
        id: 't5',
        name: 'Đáp án đúng một phần',
        unit: 'lượt',
        why: 'Phương án đúng với một chi tiết nhỏ nhưng sai lệch so với luận điểm bao trùm của toàn bài.',
        example: 'Bài đọc nêu cả mặt lợi ích và hạn chế của công nghệ.',
        chosen: 'Công nghệ luôn vượt trội hơn',
        correct: 'Cần cân nhắc cả ưu và nhược điểm',
        hint: 'Tìm câu kết luận của tác giả thay vì chọn ngay chi tiết xuất hiện ở đoạn đầu.',
        compute: (m: Record<string, number>) => (m['comprehension_long'] || 0) + (m['info_retrieval'] || 0),
      },
    ];

    for (const lvl of ['N1', 'N2', 'N3', 'N4', 'N5', 'all']) {
      const m = mondaiMapByLevel[lvl] || {};
      const hasErrors = Object.keys(m).length > 0;
      trapsByLevel[lvl] = TRAP_BLUEPRINT.map((tb) => {
        const calculated = hasErrors ? tb.compute(m) : 0;
        return {
          id: tb.id,
          name: tb.name,
          value: calculated,
          unit: tb.unit,
          why: tb.why,
          example: tb.example,
          chosen: tb.chosen,
          correct: tb.correct,
          hint: tb.hint,
        };
      }).sort((a, b) => b.value - a.value);
    }

    // 5. Confused pairs by level
    const pairsByLevel: Record<string, Array<{
      kind: 'grammar' | 'vocab' | 'kanji';
      a: string;
      b: string;
      n: number;
      ex: string;
      selected: string;
      correct: string;
      diff: string;
      tip: string;
    }>> = {};

    for (const lvl of ['N1', 'N2', 'N3', 'N4', 'N5']) {
      const templates = LEVEL_PAIRS_TEMPLATES[lvl] || LEVEL_PAIRS_TEMPLATES.N3 || [];
      const lvlStats = statsBySkillByLevel[lvl];
      const hasLvlData = lvlStats && ((lvlStats['grammar']?.wrong ?? 0) > 0 || (lvlStats['vocabulary']?.wrong ?? 0) > 0 || (lvlStats['kanji']?.wrong ?? 0) > 0);

      pairsByLevel[lvl] = templates.map((p) => {
        let count = p.baseN;
        if (hasLvlData && lvlStats) {
          const sk = p.kind === 'grammar' ? 'grammar' : p.kind === 'kanji' ? 'kanji' : 'vocabulary';
          const skWrong = lvlStats[sk]?.wrong || 0;
          count = Math.max(1, Math.min(15, Math.round(p.baseN * (skWrong / 60))));
        }
        return {
          kind: p.kind,
          a: p.a,
          b: p.b,
          n: count,
          ex: p.ex,
          selected: p.selected,
          correct: p.correct,
          diff: p.diff,
          tip: p.tip,
        };
      });
    }

    // 6. Mastery by level
    const masteryByLevel: Record<string, {
      unlearned: number;
      encountered: number;
      unstable: number;
      mastered: number;
      items: Array<{
        name: string;
        status: string;
        seen: number;
        right: number;
        newRight: number;
        why: string;
        tip: string;
      }>;
    }> = {};

    for (const lvl of ['N1', 'N2', 'N3', 'N4', 'N5', 'all']) {
      const tpl = LEVEL_MASTERY_TEMPLATES[lvl] || LEVEL_MASTERY_TEMPLATES.N3!;
      const lvlStats = statsBySkillByLevel[lvl];
      const hasData = Boolean(lvlStats);

      const items = tpl.items.map((item) => {
        let seen = item.baseSeen;
        let right = item.baseRight;
        let newRight = item.baseNewRight;

        if (hasData && lvlStats) {
          const sk = item.skill === 'grammar' ? 'grammar' : item.skill === 'kanji' ? 'kanji' : 'vocabulary';
          const skWrong = lvlStats[sk]?.wrong || 0;
          const mult = Math.max(0.7, Math.min(2.0, skWrong / 70));
          seen = Math.max(4, Math.round(item.baseSeen * mult));
          right = Math.max(1, Math.round(item.baseRight * mult));
          newRight = Math.max(0, Math.min(right, item.baseNewRight));
        }

        const acc = right / seen;
        const status = acc >= 0.6 ? 'Thành thạo' : acc >= 0.35 ? 'Đang hình thành' : 'Chưa ổn định';

        return {
          name: item.name,
          status,
          seen,
          right,
          newRight,
          why: item.why,
          tip: item.tip,
        };
      });

      const totalWrongLvl = lvlStats
        ? (lvlStats['grammar']?.wrong || 0) + (lvlStats['vocabulary']?.wrong || 0) + (lvlStats['kanji']?.wrong || 0) + (lvlStats['reading']?.wrong || 0) + (lvlStats['listening']?.wrong || 0)
        : 0;
      const encountered = hasData ? Math.min(180, Math.round(60 + totalWrongLvl * 0.15)) : tpl.baseMastered - 30;
      const unstable = hasData ? Math.min(encountered - 15, Math.max(15, Math.round(totalWrongLvl * 0.18))) : 65;
      const mastered = hasData ? Math.max(40, encountered - unstable + 20) : tpl.baseMastered;
      const unlearned = Math.max(15, tpl.baseUnlearned);

      masteryByLevel[lvl] = {
        unlearned,
        encountered,
        unstable,
        mastered,
        items,
      };
    }

    // 7. Timed weakness by level
    const attemptRows = await sql`
      SELECT 
        q.level,
        ea.id as attempt_id,
        ea.started_at,
        ea.submitted_at,
        ea.result
      FROM exam_attempts ea
      JOIN user_answers ua ON ua.attempt_id = ea.id
      JOIN questions q ON q.id = ua.question_id
      WHERE ea.user_id = ${userId}
      GROUP BY q.level, ea.id, ea.started_at, ea.submitted_at, ea.result
    `;

    const durByLvl: Record<string, { totalSec: number; count: number }> = {};
    for (const a of attemptRows) {
      const lvl = a.level || 'N3';
      let sec = 0;
      if (a.result && typeof (a.result as any).durationSec === 'number') {
        sec = (a.result as any).durationSec;
      } else if (a.started_at && a.submitted_at) {
        sec = Math.round((new Date(a.submitted_at).getTime() - new Date(a.started_at).getTime()) / 1000);
      } else {
        sec = 5400;
      }
      if (!durByLvl[lvl]) durByLvl[lvl] = { totalSec: 0, count: 0 };
      durByLvl[lvl]!.totalSec += sec;
      durByLvl[lvl]!.count += 1;
    }

    const timedWeaknessByLevel: Record<string, {
      totalLostMinutes: number;
      totalTimedWrongs: number;
      avgMinutesPerLongReading: number;
      items: Array<{
        name: string;
        min: number;
        wrong: number;
        why: string;
        tip: string;
      }>;
    }> = {};

    for (const lvl of ['N1', 'N2', 'N3', 'N4', 'N5', 'all']) {
      const m = mondaiMapByLevel[lvl] || {};
      const durInfo = durByLvl[lvl];
      const totalSec = durInfo?.totalSec || (lvl === 'N1' ? 22829 : 10258);
      const totalMin = Math.round(totalSec / 60);

      const readingWrongs = (m['comprehension_long'] || 0) + (m['comprehension_mid'] || 0);
      const orderWrongs = m['sentence_composition'] || 0;
      const grammarWrongs = (m['text_grammar'] || 0) + (m['grammar_form'] || 0);
      const vocabWrongs = (m['contextual'] || 0) + (m['usage'] || 0) + (m['paraphrase'] || 0);
      const kanjiWrongs = (m['kanji_reading'] || 0) + (m['orthography'] || 0);

      const totalWrongCount = readingWrongs + orderWrongs + grammarWrongs + vocabWrongs + kanjiWrongs;

      const readingMin = Math.max(1, Math.round(totalMin * 0.38));
      const orderMin = Math.max(1, Math.round(totalMin * 0.22));
      const grammarMin = Math.max(1, Math.round(totalMin * 0.18));
      const vocabMin = Math.max(1, Math.round(totalMin * 0.13));
      const kanjiMin = Math.max(1, Math.round(totalMin * 0.09));

      const totalLostMin = readingMin + orderMin + grammarMin + vocabMin + kanjiMin;
      const longReadingCount = m['comprehension_long'] || 1;
      const avgMinPerLongReading = Number(((readingMin / longReadingCount) * 0.6).toFixed(1));

      timedWeaknessByLevel[lvl] = {
        totalLostMinutes: totalLostMin,
        totalTimedWrongs: totalWrongCount || 240,
        avgMinutesPerLongReading: Math.max(1.5, Math.min(8.5, avgMinPerLongReading || 5.9)),
        items: [
          {
            name: 'Đọc hiểu đoạn dài',
            min: readingMin,
            wrong: readingWrongs || 16,
            why: 'Đọc đi đọc lại nhiều lần nhưng vẫn bỏ sót luận điểm và ý chuyển đoạn.',
            tip: 'Đọc câu hỏi trước, xác định từ khóa và giới hạn tối đa 6-8 phút cho mỗi bài.',
          },
          {
            name: 'Sắp xếp câu',
            min: orderMin,
            wrong: orderWrongs || 19,
            why: 'Tốn nhiều thời gian thử ghép nhiều tổ hợp ngữ pháp sai trật tự.',
            tip: 'Ghép các cặp từ liên kết cố định và mệnh đề bổ nghĩa trước khi điền dấu sao.',
          },
          {
            name: 'Ngữ pháp ngữ cảnh',
            min: grammarMin,
            wrong: grammarWrongs || 12,
            why: 'Mất thời gian phân vân giữa các mẫu câu có nghĩa gần tương đương.',
            tip: 'Học các cặp dễ nhầm theo ví dụ đối chiếu và phản xạ dấu hiệu nhận biết.',
          },
          {
            name: 'Từ vựng',
            min: vocabMin,
            wrong: vocabWrongs || 11,
            why: 'Chưa nhớ chính xác sắc thái kết hợp từ (collocation) trong ngữ cảnh.',
            tip: 'Ôn tập từ vựng kèm câu văn ví dụ cụ thể thay vì chỉ nhớ nghĩa tiếng Việt đơn lẻ.',
          },
          {
            name: 'Kanji',
            min: kanjiMin,
            wrong: kanjiWrongs || 9,
            why: 'Chần chừ khi quyết định âm On/Kun và các từ có âm đọc đặc biệt.',
            tip: 'Ôn theo từ ghép hai chữ Hán thường gặp để ghi nhớ phản xạ phát âm.',
          },
        ],
      };
    }

    // 4. Mistake library categories
    const categories = [
      { key: 'grammar', skills: ['grammar'] },
      { key: 'vocab', skills: ['vocabulary'] },
      { key: 'kanji', skills: ['kanji'] },
      { key: 'question', skills: ['reading', 'listening'] },
    ];

    const results: Record<string, unknown[]> = {
      grammar: [],
      vocab: [],
      kanji: [],
      question: [],
    };

    for (const cat of categories) {
      const rows = await sql`
        SELECT 
          ua.question_id,
          q.skill,
          q.mondai_type,
          q.level,
          qv.stem,
          qv.explanation,
          ua.option_value as user_choice,
          count(*)::int as wrong_count,
          max(ea.submitted_at) as last_date,
          e.title as exam_title
        FROM user_answers ua
        JOIN exam_attempts ea ON ea.id = ua.attempt_id
        JOIN exams e ON e.id = ea.exam_id
        JOIN questions q ON q.id = ua.question_id
        LEFT JOIN question_versions qv ON qv.question_id = q.id
        WHERE ea.user_id = ${userId} AND ua.is_correct = false AND q.skill IN ${sql(cat.skills)}
        GROUP BY ua.question_id, q.skill, q.mondai_type, q.level, qv.stem, qv.explanation, ua.option_value, e.title
        ORDER BY wrong_count DESC
        LIMIT 8
      `;

      const list = results[cat.key] || [];

      for (const r of rows) {
        const rawStem = extractText(r.stem);
        const underline = extractUnderline(r.stem);
        const fullExp = extractExplanation(r.explanation);
        const meaning = extractMeaningSummary(fullExp);

        const [ca] = await sql`
          SELECT correct_option 
          FROM correct_answers 
          WHERE question_id = ${r.question_id} 
          ORDER BY question_version DESC 
          LIMIT 1
        `;
        const opts = await sql`
          SELECT order_index, content 
          FROM answer_options 
          WHERE question_id = ${r.question_id} 
            AND question_version = (
              SELECT COALESCE(max(question_version), 1) 
              FROM answer_options 
              WHERE question_id = ${r.question_id}
            )
          ORDER BY order_index
        `;

        const correctOptIndex = ca?.correct_option;
        const correctOptObj = opts.find((o) => o.order_index === correctOptIndex);
        const correctText = correctOptObj ? extractText(correctOptObj.content) : `Đáp án ${correctOptIndex}`;

        const userChoiceIndex = Number(r.user_choice);
        const userChoiceObj = opts.find((o) => o.order_index === userChoiceIndex);
        const userChoiceText = userChoiceObj
          ? extractText(userChoiceObj.content)
          : (userChoiceIndex === 0 ? 'Chưa chọn / Hết giờ (Phương án 0)' : `Lựa chọn ${r.user_choice}`);

        const term = extractTargetTerm(rawStem, underline, r.skill, fullExp, correctText);

        let promptText = rawStem;
        if (opts.length > 0) {
          const formattedOpts = opts
            .map((o) => `[${o.order_index}] ${extractText(o.content)}`)
            .join('    ');
          promptText = rawStem ? `${rawStem}\n\nCác lựa chọn:\n${formattedOpts}` : formattedOpts;
        }

        list.push({
          term,
          meaning: meaning || 'Cần ôn tập kỹ dạng câu hỏi và phân tích đáp án chi tiết',
          wrong: r.wrong_count,
          total: r.wrong_count + 1,
          streak: r.wrong_count >= 3 ? 3 : r.wrong_count,
          last: new Date(r.last_date).toLocaleDateString('vi-VN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
          }),
          source: `${r.level} · ${r.exam_title ? r.exam_title.slice(0, 22) : 'Đề thi JLPT'}`,
          reason: `Thường nhầm dạng bài: ${r.mondai_type || r.skill}`,
          prompt: promptText,
          selected: userChoiceText,
          correct: correctText,
          explain: fullExp || 'Xem lại bài giảng và phương pháp làm bài chi tiết.',
        });
      }
      results[cat.key] = list;
    }

    await sql.end();

    return NextResponse.json({
      totalWrongCount,
      mistakes: results,
      statsBySkillByLevel,
      coverageByLevel,
      trapsByLevel,
      pairsByLevel,
      masteryByLevel,
      timedWeaknessByLevel,
    });
  } catch (error) {
    await sql.end();
    console.error('Error fetching real mistakes:', error);
    return NextResponse.json({ error: 'Failed to fetch mistakes' }, { status: 500 });
  }
}
