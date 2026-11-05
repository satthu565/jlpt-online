export type JlptLevel = 'N5' | 'N4' | 'N3' | 'N2' | 'N1';

export interface GrammarItem {
  id: string;
  pattern: string;
  cleanPattern: string;
  level: JlptLevel;
  meaning: string;
  formation: string;
  examples: string[];
  keywords: string[];
  isGrammarPrimary?: boolean;
}

export const GRAMMAR_DICTIONARY: GrammarItem[] = [
  // --- N5 Patterns ---
  {
    id: 'n5-te-wa-ikemasen',
    pattern: 'てはいけない',
    cleanPattern: 'てはいけない',
    level: 'N5',
    meaning: 'Không được làm gì (biểu thị sự cấm đoán, quy định)',
    formation: 'V-て + はいけない / はだめだ / はだめです',
    examples: ['ここで写真を撮ってはいけません。', '教室で走ってはいけません。'],
    keywords: ['てはいけない', 'てはいけません', 'ではいけない', 'ではいけません', 'てはだめ', 'ではだめ'],
    isGrammarPrimary: true,
  },
  {
    id: 'n5-nakereba-naranai',
    pattern: 'なければならない',
    cleanPattern: 'なければならない',
    level: 'N5',
    meaning: 'Phải làm gì (bắt buộc, nghĩa vụ)',
    formation: 'V-ない (bỏ い) + ければならない / ければいけない / なきゃ',
    examples: ['宿題を出さなければなりません。', '毎日薬を飲まなければならない。'],
    keywords: ['なければならない', 'なければなりません', 'なくてはいけない', 'なくてはいけません', 'なきゃいけない', 'ないと', 'なければ'],
    isGrammarPrimary: true,
  },
  {
    id: 'n5-te-mo-ii',
    pattern: 'てもいい',
    cleanPattern: 'てもいい',
    level: 'N5',
    meaning: 'Được phép làm gì (cho phép, xin phép)',
    formation: 'V-て / V-で + もいい / もよろしい / も構わない',
    examples: ['ここに入ってもいいですか。', 'ここで休んでもいいです。'],
    keywords: ['てもいい', 'てもいいですか', 'でもいい', 'でもいいですか', 'てもよろしい', 'ても構わない'],
    isGrammarPrimary: true,
  },
  {
    id: 'n5-koto-ga-aru',
    pattern: 'ことがある',
    cleanPattern: 'ことがある',
    level: 'N5',
    meaning: '1. Đã từng làm gì (kinh nghiệm - Vた) | 2. Thỉnh thoảng làm gì (Vる)',
    formation: 'V-た / V-る + ことがある / ことがあります',
    examples: ['富士山に登ったことがあります。', '日本料理を食べたことがある。'],
    keywords: ['ことがある', 'ことがあります', 'ことがない', 'ことがありません'],
    isGrammarPrimary: true,
  },
  {
    id: 'n5-tai',
    pattern: 'たい',
    cleanPattern: 'たい',
    level: 'N5',
    meaning: 'Muốn làm gì (người nói muốn thực hiện hành động)',
    formation: 'V-ます (bỏ ます) + たい / たくない / たかった',
    examples: ['日本へ行きたいです。', '冷たい水が飲みたい。'],
    keywords: ['たい', 'たいです', 'たくない', 'たくないです', 'たかった'],
    isGrammarPrimary: false,
  },
  {
    id: 'n5-mae-ni',
    pattern: '前に',
    cleanPattern: '前に',
    level: 'N5',
    meaning: 'Trước khi...',
    formation: 'V-る / N + の + 前に',
    examples: ['寝る前に歯を磨きます。', '食事の前に手を洗います。'],
    keywords: ['前に', 'まえに', 'の前'],
    isGrammarPrimary: false,
  },
  {
    id: 'n5-ato-de',
    pattern: '後で',
    cleanPattern: '後で',
    level: 'N5',
    meaning: 'Sau khi...',
    formation: 'V-た / N + の + 後で',
    examples: ['ご飯を食べた後で散歩します。', '仕事の後で飲みに行きましょう。'],
    keywords: ['後で', 'あとで', 'の後'],
    isGrammarPrimary: false,
  },

  // --- N4 Patterns ---
  {
    id: 'n4-ni-yoruto',
    pattern: '〜によると / 〜によれば',
    cleanPattern: 'によると',
    level: 'N4',
    meaning: 'Theo (nguồn tin)... nghe nói là... (trích dẫn căn cứ, nguồn tin)',
    formation: 'N + によると / によれば （vế sau thường đi kèm: 〜そうだ / 〜ということだ / 〜らしい）',
    examples: [
      '天気予報によると、明日は雨が降るそうです。',
      '新聞によれば、昨夜大きな地震があったということだ。',
      '彼らの話によると、新しい先生はとても優しいらしい。',
    ],
    keywords: ['によると', 'によれば', 'に依ると', 'に依れば', 'よると', 'よれば'],
    isGrammarPrimary: true,
  },
  {
    id: 'n4-ta-hou-ga-ii',
    pattern: 'たほうがいい',
    cleanPattern: 'たほうがいい',
    level: 'N4',
    meaning: 'Nên làm / không nên làm gì (đưa ra lời khuyên bảo, khuyến nghị)',
    formation: 'V-た / V-ない + ほうがいい / ほうがいいです',
    examples: ['早く寝たほうがいいですよ。', '無理をしないほうがいいです。'],
    keywords: ['たほうがいい', 'ないほうがいい', 'ほうがいい', 'ほうがいいです', '方がいい'],
    isGrammarPrimary: true,
  },
  {
    id: 'n4-kamo-shirenai',
    pattern: 'かもしれない',
    cleanPattern: 'かもしれない',
    level: 'N4',
    meaning: 'Có lẽ, có thể (xác suất xảy ra khoảng 50%)',
    formation: 'Thể thường (A-na/N bỏ だ) + かもしれない / かもしれません',
    examples: ['明日は雨が降るかもしれません。', '彼は忙しいかもしれない。'],
    keywords: ['かもしれない', 'かもしれません', 'かもしれん', 'かも知れない'],
    isGrammarPrimary: true,
  },
  {
    id: 'n4-sou-da-hearsay',
    pattern: 'そうだ（伝聞）',
    cleanPattern: 'そうだ',
    level: 'N4',
    meaning: 'Nghe nói là... (truyền đạt lại thông tin nghe được từ người khác)',
    formation: 'Thể thường + そうだ / そうです',
    examples: ['天気予報によると明日は晴れるそうです。', '山田さんは来月結婚するそうです。'],
    keywords: ['そうだ', 'そうです', 'そう伝聞'],
    isGrammarPrimary: false,
  },
  {
    id: 'n4-sou-da-looks',
    pattern: 'そうだ（様態）',
    cleanPattern: 'そうだ',
    level: 'N4',
    meaning: 'Trông có vẻ, sắp... (dự đoán trực quan sắp xảy ra)',
    formation: 'V-ます (bỏ ます) / A-i (bỏ い) / A-na + そうだ / そうです',
    examples: ['今にも雨が降りそうです。', 'このケーキはおいしそうです。'],
    keywords: ['そうに', 'そうな', 'そうに見える'],
    isGrammarPrimary: false,
  },
  {
    id: 'n4-you-ni-suru',
    pattern: 'ようにする',
    cleanPattern: 'ようにする',
    level: 'N4',
    meaning: 'Cố gắng làm / không làm gì (tạo thành thói quen đều đặn)',
    formation: 'V-る / V-ない + ようにする / ようにしている',
    examples: ['毎日野菜を食べるようにしています。', '夜遅く甘いものを食べないようにしましょう。'],
    keywords: ['ようにする', 'ようにしている', 'ようにしてください', 'ようにしましょう'],
    isGrammarPrimary: true,
  },
  {
    id: 'n4-you-ni-naru',
    pattern: 'ようになる',
    cleanPattern: 'ようになる',
    level: 'N4',
    meaning: 'Trở nên, bắt đầu có thể làm gì (sự thay đổi năng lực hoặc trạng thái)',
    formation: 'V-khả năng / V-る / V-ない + ようになる / ようになりました',
    examples: ['日本語が話せるようになりました。', '最近メガネをかけないようになった。'],
    keywords: ['ようになる', 'ようになった', 'なくなりました', 'ようになりました'],
    isGrammarPrimary: true,
  },
  {
    id: 'n4-tame-ni',
    pattern: 'ために',
    cleanPattern: 'ために',
    level: 'N4',
    meaning: '1. Để làm gì (mục đích) | 2. Vì, do (nguyên nhân, lý do)',
    formation: 'V-る / N + の + ために / ための + N',
    examples: ['日本へ留学するために日本語を勉強しています。', '大雪のために電車が止まりました。'],
    keywords: ['ために', 'ための', 'ためだ', 'ためです'],
    isGrammarPrimary: false,
  },
  {
    id: 'n4-tsumori',
    pattern: 'つもり',
    cleanPattern: 'つもり',
    level: 'N4',
    meaning: 'Dự định làm gì (ý định chắc chắn của người nói)',
    formation: 'V-る / V-ない + つもりだ / つもりです',
    examples: ['来年日本へ行くつもりです。', 'タバコはやめるつもりです。'],
    keywords: ['つもり', 'つもりだ', 'つもりです', 'つもりはない'],
    isGrammarPrimary: false,
  },
  {
    id: 'n4-sugiru',
    pattern: 'すぎる',
    cleanPattern: 'すぎる',
    level: 'N4',
    meaning: 'Quá... (vượt quá mức bình thường, thường mang sắc thái tiêu cực)',
    formation: 'V-ます (bỏ ます) / A-i (bỏ い) / A-na + すぎる / すぎます',
    examples: ['昨日お酒を飲みすぎました。', 'この問題は難しすぎる。'],
    keywords: ['すぎる', 'すぎます', 'すぎた', '過ぎる', '過ぎます'],
    isGrammarPrimary: false,
  },
  {
    id: 'n4-yasui-nikui',
    pattern: 'やすい / にくい',
    cleanPattern: 'やすい',
    level: 'N4',
    meaning: 'Dễ làm gì / Khó làm gì',
    formation: 'V-ます (bỏ ます) + やすい / にくい',
    examples: ['このペンはとても書きやすいです。', 'この本は字が小さくて読みにくい。'],
    keywords: ['やすい', 'にくい', '易い', '難い', 'やすいです', 'にくいです'],
    isGrammarPrimary: false,
  },

  // --- N3 Patterns ---
  {
    id: 'n3-ni-tsuite',
    pattern: '〜について / 〜についての',
    cleanPattern: 'について',
    level: 'N3',
    meaning: 'Về... (chỉ chủ đề thảo luận, nghiên cứu, suy nghĩ)',
    formation: 'N + について / についての + N',
    examples: [
      '日本の文化について調べています。',
      'この計画についてどう思われますか。',
      '環境問題についての本を読みました。',
    ],
    keywords: ['について', 'についての', 'につきまして', 'に就いて'],
    isGrammarPrimary: true,
  },
  {
    id: 'n3-ni-taishite',
    pattern: '〜に対して / 〜に対する',
    cleanPattern: 'に対して',
    level: 'N3',
    meaning: '1. Đối với (hướng tới đối tượng tác động) | 2. Trái ngược với...',
    formation: 'N + に対して / に対する + N',
    examples: [
      'お客様に対して失礼な態度をとってはいけません。',
      '兄が活発なのに対して弟はおとなしい性格だ。',
    ],
    keywords: ['に対して', 'に対する', 'たいして', 'たいする', '対して'],
    isGrammarPrimary: true,
  },
  {
    id: 'n3-ni-kansuru',
    pattern: '〜に関して / 〜に関する',
    cleanPattern: 'に関して',
    level: 'N3',
    meaning: 'Liên quan đến... (mang sắc thái trang trọng, học thuật hơn について)',
    formation: 'N + に関して / に関する + N',
    examples: [
      'この事件に関して詳しいことはまだ分かっていない。',
      '経済発展に関する調査結果が発表された。',
    ],
    keywords: ['に関して', 'に関する', '関して', '関する', 'かんして'],
    isGrammarPrimary: true,
  },
  {
    id: 'n3-ni-totte',
    pattern: '〜にとって / 〜にとっての',
    cleanPattern: 'にとって',
    level: 'N3',
    meaning: 'Đối với (đứng trên lập trường, góc nhìn của ai đó để đánh giá)',
    formation: 'N + にとって / にとっての + N',
    examples: [
      '私にとって家族が一番大切です。',
      '留学生にとって漢字を覚えるのは大変なことだ。',
    ],
    keywords: ['にとって', 'にとっての', 'にとっても'],
    isGrammarPrimary: true,
  },
  {
    id: 'n3-to-shite',
    pattern: '〜として / 〜としての',
    cleanPattern: 'として',
    level: 'N3',
    meaning: 'Với tư cách là, như là, trên danh nghĩa là...',
    formation: 'N + として / としての + N',
    examples: [
      '留学生として日本へ来ました。',
      '彼は医者としての責任を果たした。',
    ],
    keywords: ['として', 'としては', 'としての', 'としても'],
    isGrammarPrimary: true,
  },
  {
    id: 'n3-ni-yotte',
    pattern: '〜によって / 〜による',
    cleanPattern: 'によって',
    level: 'N3',
    meaning: '1. Do, bởi (nguyên nhân, tác giả sáng tạo) | 2. Tùy vào... | 3. Bằng cách...',
    formation: 'N + によって / による + N',
    examples: [
      '人によって考え方が違います。',
      '電話によって連絡を取ることができます。',
      'この絵は有名な画家によって描かれた。',
    ],
    keywords: ['によって', 'による', 'により', '依って'],
    isGrammarPrimary: true,
  },
  {
    id: 'n3-wake-ni-wa-ikanai',
    pattern: 'わけにはいかない',
    cleanPattern: 'わけにはいかない',
    level: 'N3',
    meaning: 'Không thể làm gì (do lương tâm, đạo đức, quy chuẩn xã hội không cho phép)',
    formation: 'V-る + わけにはいかない / わけにはいきません',
    examples: [
      '大事な会議があるので、休むわけにはいかない。',
      '車を運転するので、お酒を飲むわけにはいきません。',
    ],
    keywords: ['わけにはいかない', 'わけにはいきません', '訳にはいかない'],
    isGrammarPrimary: true,
  },
  {
    id: 'n3-wake-dewa-nai',
    pattern: 'わけではない',
    cleanPattern: 'わけではない',
    level: 'N3',
    meaning: 'Không hẳn là, không có nghĩa là... (phủ định một phần)',
    formation: 'Thể thường (A-na + な / N + の/な) + わけではない',
    examples: [
      '嫌いなわけではないが、あまり食べたくない。',
      '日本語が上手に話せるわけではありません。',
    ],
    keywords: ['わけではない', 'わけじゃない', 'わけではありません', '訳ではない'],
    isGrammarPrimary: true,
  },
  {
    id: 'n3-ni-chigai-nai',
    pattern: 'に違いない',
    cleanPattern: 'に違いない',
    level: 'N3',
    meaning: 'Chắc chắn là... (sự khẳng định, phán đoán chủ quan mạnh mẽ của người nói)',
    formation: 'Thể thường (A-na/N bỏ だ) + に違いない / に違いありません',
    examples: [
      '彼は努力したから、試験に合格するに違いない。',
      '犯人はあの男に違いない。',
    ],
    keywords: ['に違いない', 'にちがいない', 'に違いありません', 'に相違ない'],
    isGrammarPrimary: true,
  },
  {
    id: 'n3-hazu-da',
    pattern: 'はずだ',
    cleanPattern: 'はずだ',
    level: 'N3',
    meaning: 'Chắc chắn (dựa trên căn cứ hợp lý, quy luật, lịch trình đã định)',
    formation: 'Thể thường (A-na + な / N + の) + はずだ / はずがない',
    examples: [
      '彼は昨日連絡があったから、今日来るはずです。',
      'そんなはずはありません。',
    ],
    keywords: ['はずだ', 'はずです', 'はずがない', 'はずはありません', '筈だ'],
    isGrammarPrimary: true,
  },
  {
    id: 'n3-okage-de',
    pattern: 'おかげで',
    cleanPattern: 'おかげで',
    level: 'N3',
    meaning: 'Nhờ có... (biểu thị nguyên nhân dẫn đến kết quả tốt, tích cực)',
    formation: 'Thể thường / N + の + おかげで / おかげだ',
    examples: [
      '先生のおかげで無事に合格できました。',
      '薬を飲んだおかげで風邪が治りました。',
    ],
    keywords: ['おかげで', 'おかげだ', 'お陰で', 'お陰だ', 'おかげさまで'],
    isGrammarPrimary: true,
  },
  {
    id: 'n3-sei-de',
    pattern: 'せいで',
    cleanPattern: 'せいで',
    level: 'N3',
    meaning: 'Do, tại vì... (biểu thị nguyên nhân dẫn đến kết quả xấu, tiêu cực)',
    formation: 'Thể thường / N + の + せいで / せいだ',
    examples: [
      '大雨のせいで試合が中止になってしまった。',
      '寝不足のせいで頭が痛い。',
    ],
    keywords: ['せいで', 'せいだ', '所為で', '所為だ'],
    isGrammarPrimary: true,
  },
  {
    id: 'n3-bakari-da',
    pattern: 'ばかりだ',
    cleanPattern: 'ばかりだ',
    level: 'N3',
    meaning: '1. Càng ngày càng... (chiều hướng xấu) | 2. Chỉ còn chờ chuẩn bị xong là làm...',
    formation: 'V-る + ばかりだ / ばかりです',
    examples: [
      '物価は上がるばかりだ。',
      '準備は完了したので、出発するばかりだ。',
    ],
    keywords: ['ばかりだ', 'ばかりです', 'ばかりになっている'],
    isGrammarPrimary: true,
  },
  {
    id: 'n3-tabi-ni',
    pattern: 'たびに',
    cleanPattern: 'たびに',
    level: 'N3',
    meaning: 'Cứ mỗi lần... thì lại luôn... (hành động lặp đi lặp lại)',
    formation: 'V-る / N + の + たびに',
    examples: [
      'この曲を聴くたびに、学生時代のことを思い出す。',
      '母は会うたびに同じ小言を言う。',
    ],
    keywords: ['たびに', '度に', '度毎に'],
    isGrammarPrimary: true,
  },
  {
    id: 'n3-uchi-ni',
    pattern: 'うちに',
    cleanPattern: 'うちに',
    level: 'N3',
    meaning: '1. Trong lúc còn... thì hãy làm ngay kẻo lỡ | 2. Trong lúc đang... thì trạng thái biến đổi',
    formation: 'V-る / V-ない / A-i / A-na + な / N + の + うちに',
    examples: [
      '温かいうちに召し上がってください。',
      '日本にいるうちに富士山に登りたい。',
    ],
    keywords: ['うちに', 'ないうちに', '内に'],
    isGrammarPrimary: true,
  },
  {
    id: 'n3-aida-ni',
    pattern: 'あいだに',
    cleanPattern: 'あいだに',
    level: 'N3',
    meaning: 'Trong khoảng thời gian đang... thì một sự việc khác xảy ra',
    formation: 'V-ている / N + の + 間に / 間は',
    examples: [
      '留守の間に泥棒が入った。',
      '子供が寝ている間に部屋を掃除した。',
    ],
    keywords: ['間に', 'あいだに', '間中'],
    isGrammarPrimary: true,
  },
  {
    id: 'n3-toori-ni',
    pattern: 'とおりに',
    cleanPattern: 'とおりに',
    level: 'N3',
    meaning: 'Đúng như, theo như những gì...',
    formation: 'V-る / V-た / N + の + とおりに / N + どおりに',
    examples: [
      '先生が教えてくれたとおりにやってみました。',
      '予想どおりの結果になった。',
    ],
    keywords: ['とおりに', '通りに', 'どおりに', '通り', '通りだ'],
    isGrammarPrimary: true,
  },

  // --- N2 Patterns ---
  {
    id: 'n2-ni-tsurete',
    pattern: 'につれて',
    cleanPattern: 'につれて',
    level: 'N2',
    meaning: 'Cùng với, càng... càng... (sự biến đổi theo tỉ lệ thuận kéo theo)',
    formation: 'V-る / N + につれて',
    examples: [
      '年をとるにつれて、体力が衰えてくる。',
      '台風が近づくにつれて、風がだんだん強くなってきた。',
    ],
    keywords: ['につれて', '連れて', 'にしたがって'],
    isGrammarPrimary: true,
  },
  {
    id: 'n2-to-tomo-ni',
    pattern: 'とともに',
    cleanPattern: 'とともに',
    level: 'N2',
    meaning: '1. Cùng với... | 2. Đồng thời với việc... kéo theo biến đổi',
    formation: 'N / V-る + とともに',
    examples: [
      '家族とともに楽しい週末を過ごした。',
      '時代の変化とともに人々の価値観も変わっていく。',
    ],
    keywords: ['とともに', 'と共に', '伴い'],
    isGrammarPrimary: true,
  },
  {
    id: 'n2-ni-watatte',
    pattern: 'にわたって',
    cleanPattern: 'にわたって',
    level: 'N2',
    meaning: 'Suốt, trải dài trên diện rộng (thời gian, địa lý, phạm vi)',
    formation: 'N + にわたって / にわたり / にわたる + N',
    examples: [
      '国際会議は3日間にわたって開催された。',
      '広範囲にわたって大雨警報が出ている。',
    ],
    keywords: ['にわたって', 'にわたり', 'にわたる', '渡って'],
    isGrammarPrimary: true,
  },
  {
    id: 'n2-te-tamaranai',
    pattern: 'てたまらない',
    cleanPattern: 'てたまらない',
    level: 'N2',
    meaning: '...không chịu nổi (biểu thị cảm xúc, cảm giác mạnh đến mức không kìm nén được)',
    formation: 'A-くて / V-て / na-で + たまらない / たまりません',
    examples: [
      '試験に合格して嬉しくてたまらない。',
      '喉が渇いてたまらない。',
    ],
    keywords: ['てたまらない', 'でたまらない', 'てたまらん', 'てならない'],
    isGrammarPrimary: true,
  },
  {
    id: 'n2-wo-megutte',
    pattern: 'をめぐって',
    cleanPattern: 'をめぐって',
    level: 'N2',
    meaning: 'Xoay quanh (tranh cãi, ý kiến đối lập về một vấn đề)',
    formation: 'N + をめぐって / をめぐる + N',
    examples: [
      '遺産相続をめぐって親族が激しく争っている。',
      '新しい法案をめぐって国会で議論が続いている。',
    ],
    keywords: ['をめぐって', 'をめぐる', 'を巡って'],
    isGrammarPrimary: true,
  },
  {
    id: 'n2-ni-motozuite',
    pattern: 'に基づいて',
    cleanPattern: 'に基づいて',
    level: 'N2',
    meaning: 'Dựa trên, căn cứ vào (dữ liệu, sự thật, quy định làm nền tảng)',
    formation: 'N + に基づいて / に基づく + N',
    examples: [
      '歴史的事実に基づいて映画が制作された。',
      '調査結果に基づく報告書を作成しました。',
    ],
    keywords: ['に基づいて', 'に基づく', 'にもとづいて', '基いて'],
    isGrammarPrimary: true,
  },

  // --- N1 Patterns ---
  {
    id: 'n1-de-are',
    pattern: 'であれ',
    cleanPattern: 'であれ',
    level: 'N1',
    meaning: 'Cho dù là... đi chăng nữa',
    formation: 'N / Từ nghi vấn + であれ / であろうと',
    examples: [
      'たとえ大統領であれ、法を守らなければならない。',
      '理由が何であれ、遅刻は認められない。',
    ],
    keywords: ['であれ', 'であろうと'],
    isGrammarPrimary: true,
  },
  {
    id: 'n1-kiwamarunai',
    pattern: '極まりない',
    cleanPattern: '極まりない',
    level: 'N1',
    meaning: 'Vô cùng, cực kỳ (thường dùng cho các trạng thái tiêu cực)',
    formation: 'na / N + 極まりない / 極まる',
    examples: ['彼の無責任な発言は不愉快極まりない。'],
    keywords: ['極まりない', 'きわまりない', '極まる'],
    isGrammarPrimary: true,
  },
  {
    id: 'n1-wo-kawaki-kiri-ni',
    pattern: 'を皮切りに',
    cleanPattern: 'を皮切りに',
    level: 'N1',
    meaning: 'Mở đầu bằng... sau đó hàng loạt sự việc tương tự tiếp diễn',
    formation: 'N + を皮切りに / を皮切りにして',
    examples: ['東京公演を皮切りに全国ツアーが始まる。'],
    keywords: ['を皮切りに', 'を皮切りにして', 'をかわきりに'],
    isGrammarPrimary: true,
  },
  {
    id: 'n1-nari-ni',
    pattern: 'なりに',
    cleanPattern: 'なりに',
    level: 'N1',
    meaning: 'Theo cách của, trong khả năng của riêng mình...',
    formation: 'N / Thể thường + なりに / なりの + N',
    examples: ['子供は子供なりに一生懸命考えている。'],
    keywords: ['なりに', 'なりの'],
    isGrammarPrimary: true,
  },
];

/**
 * Searches and returns matching grammar patterns for a selected text.
 * Sorted by match specificity:
 * 1. Exact match (query matches pattern or keyword completely)
 * 2. Query contains full pattern / keyword
 * 3. Pattern / keyword contains query (partial query)
 * With tie-breaking preferring longer patterns.
 */
export function findMatchingGrammarPatterns(query: string): GrammarItem[] {
  if (!query) return [];
  const trimmed = query.trim().normalize('NFC');
  if (trimmed.length === 0) return [];

  const results: Array<{ item: GrammarItem; score: number }> = [];

  for (const item of GRAMMAR_DICTIONARY) {
    let bestScore = 0;

    for (const kw of item.keywords) {
      if (trimmed === kw) {
        bestScore = Math.max(bestScore, 100);
      } else if (trimmed.includes(kw)) {
        // Query has extra context around grammar keyword (e.g. "天気予報によると")
        bestScore = Math.max(bestScore, 80 + kw.length);
      } else if (trimmed.length >= 2 && kw.includes(trimmed)) {
        // User highlighted a significant prefix/suffix of the grammar pattern
        bestScore = Math.max(bestScore, 50 + trimmed.length);
      }
    }

    // Also check cleanPattern
    if (trimmed === item.cleanPattern) {
      bestScore = Math.max(bestScore, 100);
    } else if (trimmed.includes(item.cleanPattern)) {
      bestScore = Math.max(bestScore, 85 + item.cleanPattern.length);
    }

    if (bestScore > 0) {
      results.push({ item, score: bestScore });
    }
  }

  // Sort descending by score, then by level order, then by pattern length
  results.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return b.item.pattern.length - a.item.pattern.length;
  });

  return results.map((r) => r.item);
}

/**
 * Returns true if the query strongly indicates a dedicated grammar pattern
 * (i.e. not an ambiguous single word, but an established functional phrase).
 */
export function isPrimaryGrammarPattern(query: string): boolean {
  const matches = findMatchingGrammarPatterns(query);
  if (matches.length === 0) return false;
  return Boolean(matches[0]?.isGrammarPrimary);
}
