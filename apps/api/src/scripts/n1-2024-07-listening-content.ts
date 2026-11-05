/**
 * Listening explanations for N1 7/2024 (website Q67-Q96).
 * Scripts for Q67-Q70 are taken from the supplied script PDF (the stored transcripts differed from it).
 * Q77 (問題2 6番) is not in the script PDF, so only the audio-confirmed wording is adjusted.
 */
export interface ListeningEntry {
  number: number;
  translation: string;
  /** Omitted for entries whose explanation already exists and only needs the translation line. */
  reason?: string;
  wrong?: Record<number, string>;
  transcript?: readonly string[];
  transcriptReplace?: readonly [string, string];
}

export const N1_2024_07_LISTENING_SCRIPTS: Readonly<Record<number, readonly string[]>> = {
  67: [
    '１番',
    'スーパーでアルバイトの男の人と店長が話しています。アルバイトの男の人はこの後まず、何をしなければなりませんか。',
    '男：店長、おはようございます。',
    '女：あ、リーさん、お疲れ様。今日は加藤さんと一緒に日用品売り場に夏に向けての商品を並べてもらいたいんだ。日焼け止めクリームとか仕入れて倉庫に積んであるからそれを棚に並べてね。',
    '男：わかりました。',
    '女：えっと、加藤さんには今、パンの消費期限のチェックをして値引きシールを貼る作業をやってもらってて。',
    '男：はい。',
    '女：加藤さんも今の作業が終わったら始めてもらいたいからリーさんは加藤さんを手伝って早く終わらせて。',
    '男：はい。',
    '女：あ、今、日用品売り場の棚に並んでる商品は、新しい商品を並べる時に倉庫に片付けてくださいね。よろしくお願いします。',
    '男：はい、わかりました。',
    'アルバイトの男の人はこの後まず、何をしなければなりませんか。',
  ],
  68: [
    '２番',
    'お菓子の会社で女の人と課長が話しています。女の人は会議の資料をどのように直しますか。',
    '女：課長、明日の会議の資料、新商品「やわらかせんべい」のパッケージのデザイン案を表紙に載せました。こちらは高齢者を主なターゲットにした商品です。',
    '男：あぁ、資料の表紙に候補のデザイン案を３つ並べてくれたんだね。同じデザインで赤、青、茶の色違いの３種類。赤を大きくしているのはどうして？',
    '女：はい。先週の会議でご報告した通り、ネットで消費者へアンケートをした結果、総合的に赤を基調にしたものが一番好評だったということで。',
    '男：そうだったね。総合的には赤が一番好評だったけど確か、年代によって好みがけっこう分かれてたよね。今回の会議資料、年代別の回答のデータはどこに載せてある？',
    '女：商品説明の後です。',
    '男：あぁ、グラフも載せてあるね。グラフの色ははっきりしてて見やすいと思うよ。パッケージはターゲットの高齢者には赤より茶色が人気なんだ。会議でもみんなの意見を聞く必要があるから・・・そうだな、この最初の３つのデザイン案、大きさに差をつけないでおいてもらえるかな？',
    '女：わかりました。',
    '男：年代別の回答のデータは資料の順を入れ替えて、商品説明の前に見せてもよさそうだけど、とりあえずはこのままで。',
    '女の人は会議の資料をどのように直しますか。',
  ],
  69: [
    '３番',
    'かばんの会社で男の社長と女の人が話しています。女の人はこの後、まず何をしますか。',
    '男：村田さん、職人の井上さんから連絡あった？製作をお願いしている革バッグの納期が遅れてるよね？',
    '女：はい、先週お電話ありましたけど、指先を怪我してしまって作業に時間がかかるって。',
    '男：そう、早く良くなるといいね。あのデザインのバッグ、人気が出て予約がかなり増えてきてて・・・井上さんだけじゃ追いつかないから他の職人さんにも作業を依頼するって話も出てたけど、どうなってる？',
    '女：職人さんをリストアップして三人まで絞ったのでサンプルの作成を頼んだところです。',
    '男：そう、それはよかった。',
    '女：ただ、実際に作ったものを見ないと何とも言えませんし、三人のサンプルが揃ったらお持ちしますね。早めに確保したいですよね。',
    '男：そうだね。この件は村田さんに任せるからどんどん進めて。とは言え、納期が遅れてる分だけど、どのぐらいでできそうか、まず、そこを聞いといて。新しい人にどれくらい頼むかにも関わるし、場合によっては予約受付を止めないといけなくなるから。',
    '女：はい、わかりました。',
    '女の人はこの後、まず何をしますか。',
  ],
  70: [
    '４番',
    '大学で大学祭の実行委員の女の学生とサークルの部長が話しています。サークルの部長は企画書をどのように修正しますか。',
    '女：すみません、大学祭実行委員の加藤です。このサークルはお祭りにラーメン屋を出しますよね。えー、ご提出いただいた出店の企画書ですが、修正のお願いに来ました。',
    '男：はい、私が部長の吉田です。',
    '女：吉田さん、企画書、責任者のお名前が抜けてました。こちらでお名前記入しておきました。',
    '男：すみません。',
    '女：それから、費用のところを確認してください。',
    '男：あ、はい。',
    '女：材料費の詳細、肉とか野菜とか、もう少し具体的に書いてください。そうしないと大学から補助金が出ませんよ。調理方法の説明はそのままで結構です。あ、それと当日の第一希望の場所は正門の近くになっていますが、希望が多いと抽選になります。場合によっては第二希望に回ってもらいますが、よろしくお願いします。',
    '男：はい、わかりました。',
    '女：今週末までに出してください。',
    '男：はい。',
    'サークルの部長は企画書をどのように修正しますか。',
  ],
};

export const N1_2024_07_LISTENING_ENTRIES: readonly ListeningEntry[] = [
  {
    number: 67,
    translation:
      'Ở siêu thị, chủ cửa hàng dặn nhân viên làm thêm nam. Sau đây việc đầu tiên anh phải làm là gì?',
    reason:
      'Chủ cửa hàng bảo anh xếp hàng mùa hè lên kệ, nhưng trước đó nói anh Kato đang kiểm tra hạn dùng bánh mì và dán tem giảm giá, và dặn 「リーさんは加藤さんを手伝って早く終わらせて」. Việc đầu tiên là giúp dán tem giảm giá cho bánh mì, phương án 3.',
    wrong: {
      1: 'Xếp hàng mùa hè lên kệ là việc chính nhưng làm sau khi giúp anh Kato xong.',
      2: 'Kem chống nắng đã được chất sẵn trong kho để mang ra xếp lên kệ, không phải mang vào kho.',
      4: 'Hàng đang trên kệ chỉ cần dọn vào kho khi xếp hàng mới lên, tức là làm sau.',
    },
    transcript: N1_2024_07_LISTENING_SCRIPTS[67],
  },
  {
    number: 68,
    translation: 'Cô gái sẽ sửa tài liệu cuộc họp như thế nào?',
    reason:
      'Trưởng phòng bảo 「最初の３つのデザイン案、大きさに差をつけないでおいてもらえるかな？」 (đừng làm ba mẫu thiết kế đầu khác nhau về kích cỡ) nên phải đưa các mẫu về cùng kích cỡ, phương án 2.',
    wrong: {
      1: 'Không ai nói xóa mẫu thiết kế; chỉ yêu cầu bỏ chênh lệch kích cỡ.',
      3: 'Trưởng phòng nhận xét màu biểu đồ rõ và dễ nhìn nên không cần đổi.',
      4: 'Về việc đổi vị trí dữ liệu theo độ tuổi, ông nói 「とりあえずはこのままで」 (tạm thời giữ nguyên).',
    },
    transcript: N1_2024_07_LISTENING_SCRIPTS[68],
  },
  {
    number: 69,
    translation: 'Sau đây, việc đầu tiên cô gái sẽ làm là gì?',
    reason:
      'Giám đốc dặn 「納期が遅れてる分だけど、どのぐらいでできそうか、まず、そこを聞いといて」 nên việc đầu tiên là hỏi ông Inoue khi nào giao được hàng, phương án 1.',
    wrong: {
      2: 'Cô đã lập danh sách và chọn ra ba thợ rồi, không phải đưa danh sách cho giám đốc xem.',
      3: 'Cô đã nhờ làm mẫu rồi (「サンプルの作成を頼んだところです」).',
      4: 'Dừng nhận đặt hàng chỉ là khả năng tùy kết quả sau khi hỏi thời gian giao, không phải việc đầu tiên.',
    },
    transcript: N1_2024_07_LISTENING_SCRIPTS[69],
  },
  {
    number: 70,
    translation: 'Trưởng câu lạc bộ sẽ sửa bản kế hoạch như thế nào?',
    reason:
      'Cô gái dặn 「材料費の詳細、肉とか野菜とか、もう少し具体的に書いてください」 nên phải ghi chi phí chi tiết hơn, phương án 2.',
    wrong: {
      1: 'Tên người phụ trách còn thiếu nhưng cô đã tự ghi vào rồi.',
      3: 'Cô nói phần giải thích cách chế biến 「そのままで結構です」 (giữ nguyên).',
      4: 'Nguyện vọng thứ hai chỉ được chuyển sang nếu nguyện vọng thứ nhất phải bốc thăm, không phải chỗ cần sửa.',
    },
    transcript: N1_2024_07_LISTENING_SCRIPTS[70],
  },
  {
    number: 71,
    translation:
      'Nhân viên nói về sự kiện học trải nghiệm biển. Người tham gia trước hết tham gia hoạt động nào?',
    reason:
      'Vì thủy triều nên 3 hoạt động ngoài trời được làm trước: buổi sáng là trải nghiệm đánh cá, và trong lúc chuẩn bị cho trải nghiệm đó thì tổ chức buổi quan sát sinh vật biển. Vậy hoạt động đầu tiên là buổi quan sát (phương án 3).',
    wrong: {
      1: 'Buổi hội thảo trong nhà bị dời lại, làm sau các hoạt động ngoài trời.',
      2: 'Trải nghiệm đánh cá chỉ bắt đầu khi chuẩn bị xong, trong lúc đó làm buổi quan sát.',
      4: 'Trải nghiệm lái thuyền buồm bắt đầu từ buổi chiều.',
    },
  },
  {
    number: 72,
    translation: 'Chủ hiệu sách nói nên đọc cho trẻ nghe loại sách tranh nào?',
    reason:
      'Chủ tiệm nói 「私は親自身が読んで面白いかどうかということに尽きると思います」 (theo tôi quan trọng là chính cha mẹ thấy cuốn sách thú vị), phương án 4. Các loại khác chỉ là cách nhiều người chọn.',
    wrong: {
      1: 'Chọn theo độ tuổi, sở thích chỉ là chuyện nhiều phụ huynh cân nhắc, không phải ý của chủ tiệm.',
      2: 'Sách có hiệu quả giáo dục cao cũng là lựa chọn phổ biến, không phải ý của bà.',
      3: 'Sách kinh điển đọc lâu năm cũng chỉ là lựa chọn của nhiều người.',
    },
  },
  {
    number: 73,
    translation: 'Trưởng phòng nói nên đổi sản phẩm mẫu như thế nào?',
    reason:
      'Ông thấy lượng uống một lần hơi nhiều và đề nghị 「キャップで閉められる容器に変えたらどうかな？」 (đổi sang bình có nắp đậy), vì có thể không uống hết một lần. Đáp án là phương án 3.',
    wrong: {
      1: 'Ông còn khen dạng uống vì dạng rắn như bánh quy khó ăn với người cao tuổi.',
      2: 'Dung lượng nhiều là để bổ sung đủ dinh dưỡng cả ngày, ông không bảo giảm mà đề nghị thêm nắp.',
      4: 'Ông nói độ ngọt hiện tại dễ uống, không cần ngọt hơn.',
    },
  },
  {
    number: 74,
    translation: 'Người đàn ông sẽ tham quan khóa học nào?',
    reason:
      'Anh muốn khóa có thể bắt đầu ngay. Khóa vẽ minh họa bằng máy tính 「パソコンやペンダブレットなどの道具は教室に準備してありますので次の回から始められますよ」 nên có thể bắt đầu từ buổi sau, phương án 1.',
    wrong: {
      2: 'Tranh sơn dầu cần dụng cụ chuyên dụng và rất nghiêm túc, không hợp người mới.',
      3: 'Khóa bút chì màu vẽ động vật hiện không mở vì lý do của giáo viên.',
      4: 'Khóa vẽ hoa theo mùa trên bưu thiếp chỉ có vào các thứ khác, không phải thứ Tư.',
    },
  },
  {
    number: 75,
    translation: 'Người đàn ông nói đối tác đánh giá cao điều gì?',
    reason:
      'Anh nói 「北山工業さんの急な要望に対応できたこと、高く評価してもらえましたよ」 (họ đánh giá cao việc đáp ứng yêu cầu đột xuất), tức việc thay đổi thiết kế theo yêu cầu, phương án 1.',
    wrong: {
      2: 'Việc họ muốn nhờ làm mẫu các bộ phận khác là hệ quả của đánh giá đó, không phải điều được khen.',
      3: 'Giao hàng sớm là nhận xét của hai người về công xưởng của mình, không phải đối tác khen.',
      4: 'Kết quả kiểm tra chất lượng chỉ có sau hai ngày nữa, nên chưa biết đánh giá.',
    },
  },
  {
    number: 76,
    translation: 'Trưởng phòng coi trọng điều gì nhất khi phân tích video quảng cáo này?',
    reason:
      'Bà nói 「狙い通りの人たちが見てくれたかどうかがこの商品の運命を決めると思ってる」 (việc đúng đối tượng mục tiêu có xem hay không quyết định số phận sản phẩm), phương án 1.',
    wrong: {
      2: 'Số lượt xem bà có quan tâm nhưng không phải điều bà coi trọng nhất.',
      3: 'Phân tích lượt xem ở nước ngoài chỉ là yêu cầu bổ sung 「念のため」.',
      4: 'Việc người xem có xem đến cuối hay không cũng được nhờ kiểm tra, nhưng bà nói điều quyết định là đối tượng.',
    },
  },
  {
    number: 77,
    translation: 'Ngư dân nói trong các loại cá không ra chợ thì loại nào nhiều nhất?',
    reason:
      'Sau khi kể cá cỡ không đạt chuẩn, cá khó tiêu thụ do sản lượng, ông nói 「知名度が低い魚、占める割合はこれが何より大きいんですね」 nên loại nhiều nhất là cá ít người biết, phương án 3.',
    wrong: {
      1: 'Cá cỡ không đạt chuẩn chỉ là ví dụ đầu tiên, không phải loại chiếm nhiều nhất.',
      2: 'Cá đánh bắt quá nhiều nên ế cũng chỉ là một nguyên nhân khác.',
      4: 'Cá nhiều xương nhỏ khó chế biến được nhắc cuối cùng như một lý do khác.',
    },
    transcriptReplace: ['値崩れする', '売れ残る'],
  },
  {
    number: 78,
    translation:
      'Ký túc xá sinh viên đang được chú ý trở lại: 40 năm trước bị tránh vì luật khắt khe, nay hấp dẫn hơn nhờ cơ sở vật chất, bữa ăn và nhân viên thường trực.',
  },
  {
    number: 79,
    translation:
      'Một giám đốc phát biểu ở buổi hội thảo kinh doanh, kể về lời dạy "hãy gieo hạt" của người cha đã mất. Bà nói về điều gì?',
    reason:
      'Bà kể lời cha 「大きな花を咲かせたいと思うならまず、種を蒔くことだ」 đã động viên mình mỗi khi gặp thất bại (「いつも父の言葉に励まされてきました」). Nội dung chính là điểm tựa tinh thần của bản thân, phương án 1.',
    wrong: {
      2: 'Cha bà từng điều hành công ty nhưng bà không nói về việc kế thừa sự nghiệp đó.',
      3: 'Rủi ro khi khởi nghiệp chỉ được nhắc thoáng qua.',
      4: 'Bà không kể lý do bắt đầu công ty.',
    },
  },
  {
    number: 80,
    translation:
      'Người của hãng rèm cửa nói rằng rèm cửa phổ biến ở Nhật từ thập niên Showa 30 khi lối sống kiểu phương Tây và nhà kiểu Tây xuất hiện.',
  },
  {
    number: 81,
    translation: 'Một nhà văn nói trên truyền hình. Bà nói về điều gì?',
    reason:
      'Bà nói 「私にとって桜町は第二の故郷です」, kể nơi này gắn với thời sinh viên và luôn là bối cảnh các tiểu thuyết của mình. Chủ đề là thị trấn đặc biệt với bản thân, phương án 1.',
    wrong: {
      2: 'Thời sinh viên chỉ là bối cảnh gắn với thị trấn, không phải chủ đề chính.',
      3: 'Bà nói đó là 「第二の故郷」, không phải quê nơi bà sinh ra.',
      4: 'Bà không nói về vẻ đẹp của thị trấn.',
    },
  },
  {
    number: 82,
    translation:
      'Nhà nghiên cứu nói về phương pháp điều tra thức ăn của khủng long bằng cách phân tích vết xước trên răng hóa thạch.',
  },
  {
    number: 83,
    translation: 'Nữ: Bài báo cáo của buổi học hôm nay có vẻ không dễ viết nhỉ.',
    reason:
      'Người nói cho rằng bài khó viết nên câu đáp tự nhiên là đồng cảm và nói vẫn phải làm: 「大変だけどやるしかないよ」.',
    wrong: {
      2: 'Hỏi lại "không nghĩ là khó sao?" không hợp vì người nói đã nói là khó.',
      3: '"Dễ nên đỡ quá" trái với ý "không dễ viết".',
    },
  },
  {
    number: 84,
    translation: 'Nam: Từ hôm trước tới giờ tôi đang cãi nhau với Wada…',
    reason:
      '「揉めてて」 là đang tranh cãi, mâu thuẫn nên câu hỏi thăm lý do 「何で？何があったの？」 là tự nhiên.',
    wrong: {
      1: 'Cãi nhau không đi với việc "hai người có vẻ vui".',
      2: 'Anh nói đang còn mâu thuẫn, chưa làm lành.',
    },
  },
  {
    number: 85,
    translation: 'Nữ: Cảnh cuối của bộ phim vừa xem làm tôi rất xúc động.',
    reason:
      '「胸を打たれた」 nghĩa là bị rung động sâu sắc, nên đồng tình 「感動的だったよね」 là phù hợp.',
    wrong: {
      1: 'Hỏi vì sao thấy hồi hộp lệch nghĩa; "xúc động" không phải "hồi hộp".',
      2: 'Nói cảnh đó vô nghĩa là trái ý người nói.',
    },
  },
  {
    number: 86,
    translation: 'Nam: Cà phê phục vụ miễn phí uống ở quán cơm trưa dở đến mức không uống nổi nhỉ.',
    reason:
      '「飲めたもんじゃない」 nghĩa là tệ đến mức không uống nổi, nên đồng tình 「ちょっとひどかったよね」.',
    wrong: {
      1: 'Anh chê nên "uống thêm cho tốt" là mâu thuẫn.',
      2: 'Nói "ngon" trái với ý người nói.',
    },
  },
  {
    number: 87,
    translation: 'Nữ: Với Mori thì chắc chắn không đi muộn, vậy mà vẫn chưa thấy đến.',
    reason:
      'Người nói tin Mori không bao giờ trễ nên câu đáp lo lắng, ngạc nhiên 「遅れるなんてどうしたんだろう？」 hợp lý.',
    wrong: {
      1: 'Câu trách móc cho rằng Mori hay cẩu thả, trái với ý "không thể đi muộn".',
      2: 'Nói Mori hay đi muộn trái với câu 「遅刻するはずない」.',
    },
  },
  {
    number: 88,
    translation:
      'Nam: Chuyện hai thành viên câu lạc bộ cãi nhau hôm qua thì không đến mức phải báo cáo với đàn anh nhỉ.',
    reason: '「報告するまでもない」 nghĩa là không cần phải báo cáo. Đồng tình là 「必要ないよね」.',
    wrong: {
      1: 'Cho rằng người nói định báo với đàn anh, là hiểu ngược.',
      3: 'Nói nên báo cáo trái với ý 「報告するまでもない」.',
    },
  },
  {
    number: 89,
    translation: 'Hôm qua tôi đi xem trận judo của trường mình, tôi đã hồi hộp lo sợ họ sẽ thua.',
    reason:
      '「負けはしないかハラハラした」 nghĩa là đã lo họ có thể thua; người nghe hỏi kết quả theo hướng "rốt cuộc cũng thắng được" là 「何とか勝てたんだ」.',
    wrong: {
      2: 'Người nói không nói đội đã thua; "tiếc nhỉ" không có căn cứ.',
      3: 'Đã hồi hộp lo thua thì không thể là thắng dễ dàng.',
    },
  },
  {
    number: 90,
    translation:
      'Nam: Trưởng phòng, tôi phụ trách giới thiệu sản phẩm cho công ty Sakura, mong ông đi cùng được không ạ?',
    reason:
      '「ご一緒願えないでしょうか」 là lời nhờ đi cùng nên nhận lời bằng 「かまいませんよ、行きますよ」.',
    wrong: {
      2: 'Câu này chê người phụ trách không đi, không đáp lại lời nhờ.',
      3: 'Hiểu nhầm thành nhờ người nghe đi thay.',
    },
  },
  {
    number: 91,
    translation: 'Nữ: Anh Kato, về phân tích dữ liệu thì không ai bằng anh Kimura nhỉ.',
    reason:
      '「木村さんにかなう人はいない」 nghĩa là không ai sánh được với Kimura, tức Kimura giỏi nhất. Đồng ý là 「木村さんが１番詳しいと思う」.',
    wrong: {
      1: 'Cho rằng Kimura chẳng hiểu gì, ngược nghĩa.',
      3: 'Nói Kimura yếu về phân tích dữ liệu, ngược nghĩa.',
    },
  },
  {
    number: 92,
    translation:
      'Nam: Trưởng phòng đột ngột nhờ tôi giúp việc sự kiện, tôi muốn từ chối cũng không từ chối được.',
    reason: '「断るに断れなかった」 nghĩa là không thể từ chối. Đồng cảm là 「頼まれたら断れないよね」.',
    wrong: {
      2: 'Nói là đã từ chối, trái với ý "không từ chối được".',
      3: 'Người nói thực ra muốn từ chối, chứ không phải không muốn từ chối.',
    },
  },
  {
    number: 93,
    translation:
      'Nam: Nghe nói thành tích kinh doanh tháng trước của Watanabe, nhân viên mới, bám sát trưởng phòng dày dạn.',
    reason:
      '「迫る勢い」 nghĩa là đang đuổi sát nhưng chưa vượt. Do đó 「あと少しで課長を抜くぐらいだったんだ」 là đúng.',
    wrong: {
      1: 'Nói chưa tới gần thành tích của trưởng phòng, trái với 「迫る勢い」.',
      3: 'Nói đã vượt trưởng phòng, quá mức so với 「迫る」.',
    },
  },
  {
    number: 94,
    translation:
      'Chuyên đề về câu lạc bộ bóng chày trên báo: sau khi cân nhắc các ý tưởng, trưởng ban chọn bám sát vài tuyển thủ chủ chốt để ghi lại một ngày của họ.',
  },
  {
    number: 95,
    translation:
      'Câu hỏi 1: Người phụ nữ ban đầu muốn tham gia khóa nào? Đáp án: khóa quan sát Trạm Vũ trụ Quốc tế.',
  },
  {
    number: 96,
    translation: 'Câu hỏi 2: Hai người quyết định tham gia khóa nào? Đáp án: khóa quan sát sao băng.',
  },
];
