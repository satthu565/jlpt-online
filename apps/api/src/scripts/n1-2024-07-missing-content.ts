/**
 * Questions of N1 7/2024 that were missing from the website (source Q25, Q41-44, Q57-66).
 * Text transcribed from the owner-supplied full paper `JLPT-N1-7-2024-full.pdf`;
 * keys from the official answer sheet (`Đáp án N1 T7-2024.pdf`).
 */

type Inline = Record<string, unknown>;
type Block = Record<string, unknown>;

export interface MissingQuestion {
  number: number;
  stem: Inline[];
  options: Inline[][];
  correctOption: 1 | 2 | 3 | 4;
  translation: string;
  reason: string;
  wrong: Record<number, string>;
}

export interface MissingGroup {
  title: string;
  mondaiType: string;
  skill: 'grammar' | 'reading' | 'vocabulary';
  passage: Block[];
  questions: MissingQuestion[];
}

const t = (text: string): Inline => ({ t: 'text', text });
const br = (): Inline => ({ t: 'br' });
const ul = (text: string): Inline => ({ t: 'underline', children: [t(text)] });
const blank = (label: string): Inline => ({ t: 'blank', label });
const p = (...content: Inline[]): Block => ({ type: 'paragraph', content });
const text1 = (text: string): Inline[] => [t(text)];

const notes = (...lines: string[]): Block =>
  p(...lines.flatMap((line, index) => (index === 0 ? [t(line)] : [br(), t(line)])));

export const N1_2024_07_MISSING_GROUPS: readonly MissingGroup[] = [
  {
    title: 'Nhóm g-vocab-4-v25',
    mondaiType: 'usage',
    skill: 'vocabulary',
    passage: [],
    questions: [
      {
        number: 25,
        stem: text1('ずばり'),
        options: [
          [t('木村さんの一言を聞いて、あのときの出来事が'), ul('ずばり'), t('と脳裏によみがえってきた。')],
          [t('息子は、ずっと続けていた野球を'), ul('ずばり'), t('とやめ、勉強に専念した。')],
          [t('森さんはきちょうめんな人で、机の上の本はいつも'), ul('ずばり'), t('とそろえて置かれている。')],
          [t('友人に自分の欠点を'), ul('ずばり'), t('と指摘されて、しばらく落ち込んだ。')],
        ],
        correctOption: 4,
        translation:
          'Từ vựng: 「ずばり」 nghĩa là nói thẳng, chỉ ra đúng trọng tâm không vòng vo.',
        reason:
          '「ずばり」 dùng khi nói hoặc chỉ ra điều gì đó một cách thẳng thắn, trúng điểm mấu chốt (ずばりと指摘する). Câu 4 bị bạn chỉ thẳng khuyết điểm của mình nên dùng đúng.',
        wrong: {
          1: 'Ký ức hiện lên rõ mồn một phải dùng 「ありありと」 hoặc 「まざまざと」, không dùng 「ずばり」.',
          2: 'Bỏ hẳn một việc một cách dứt khoát phải dùng 「すっぱり」 hoặc 「きっぱり」.',
          3: 'Xếp đồ ngay ngắn gọn gàng phải dùng 「きちんと」 hoặc 「ぴったり」.',
        },
      },
    ],
  },
  {
    title: 'Nhóm g-grammar-7-g41',
    mondaiType: 'text_grammar',
    skill: 'grammar',
    passage: [
      p(t('以下は、医師が脳と心の健康について書いた文章である。')),
      p(t('人には会いに行こう')),
      p(
        t(
          '人に会いに行こうというと、当たり前だと思うでしょう。わざわざ人には会いに行こうとしたのは、電話や手紙（もしくはメール）ですませるのではなく、会うことに意味があるからです。',
        ),
      ),
      p(
        t(
          '会うのは、コミュニケーションとしてきわめて重要です。つまり、コミュニケーションは自分の持っている情報を伝えるだけでなく、相手との共感がありますが、自分自身の規制、相手の規制にもつながる場合もあります。会って',
        ),
        blank('41'),
        t('、相手も変わり、自分も変わる可能性があるということです。'),
      ),
      p(
        t(
          'コミュニケーションではお互いにわかりあう、つまり共感がたいへん重要です。相手の身になって何かを感じる、それは相手の感情かもしれないし、痛みかもしれません。こうした共感こそ、人間のコミュニケーションです。',
        ),
      ),
      p(
        t(
          '会わなくても電話や手紙（メール）でも、こうした共感は生まれますが、相手の身になることができるかというとむずかしいでしょう。やはり実際に',
        ),
        blank('42'),
        t('本当の共感は生まれると思います。'),
      ),
      p(
        t('脳にとっても、刺激の度合いが違います。初恋の人とデートをしたときのことを'),
        blank('43'),
        t(
          '。胸がどきどきして、たいへん緊張したでしょう。初恋の人でなくても、好きな人に会えば脳は活性化し、ときめき状態を維持しますし、反対に嫌いな人に会うとそれなりの負の感情が生まれてきます。感情の流れが生まれ、共感も発生します。当然、脳も喜びにあふれるでしょうし、反対に嫌悪の情が流れることもあるでしょう。それだけ活性化される',
        ),
        blank('44'),
        t('。'),
      ),
      p(t('やはり人には会いに行きましょう。ときめきを求めて。')),
    ],
    questions: [
      {
        number: 41,
        stem: [blank('41')],
        options: [text1('話したとしても'), text1('話そうものなら'), text1('話すことで'), text1('話さないかぎり')],
        correctOption: 3,
        translation:
          'Khi gặp mặt và trò chuyện thì đối phương thay đổi, bản thân cũng có khả năng thay đổi.',
        reason:
          '「〜ことで」 chỉ phương tiện dẫn đến kết quả: nhờ gặp và nói chuyện mà cả hai bên có thể thay đổi. Phương án 3 nối tự nhiên với 「相手も変わり、自分も変わる可能性がある」.',
        wrong: {
          1: '「〜としても」 là nghịch tiếp (dù có nói thì…), không khớp với ý "nhờ nói chuyện mà thay đổi".',
          2: '「〜ものなら」 mang sắc thái giả định có kết quả xấu hoặc nghiêm trọng, không hợp ngữ cảnh tích cực này.',
          4: '「〜ないかぎり」 nghĩa là chừng nào chưa nói thì…, làm vế sau trở nên vô lý.',
        },
      },
      {
        number: 42,
        stem: [blank('42')],
        options: [text1('会うよりも'), text1('会ってこそ'), text1('会うまでに'), text1('会っただけでも')],
        correctOption: 2,
        translation: 'Chỉ khi thực sự gặp mặt thì sự đồng cảm thật sự mới nảy sinh.',
        reason:
          '「〜てこそ」 nhấn mạnh rằng chỉ khi làm việc đó mới đạt được điều phía sau. Cả đoạn đề cao việc gặp trực tiếp nên 「会ってこそ本当の共感は生まれる」 là hợp lý.',
        wrong: {
          1: '「会うよりも」 so sánh và coi nhẹ việc gặp, ngược với chủ đề bài viết.',
          3: '「会うまでに」 nghĩa là trước khi gặp, không khớp với 「本当の共感は生まれる」.',
          4: '「会っただけでも」 nghĩa là chỉ gặp thôi cũng đủ, không diễn đạt được điều kiện cần như 「こそ」.',
        },
      },
      {
        number: 43,
        stem: [blank('43')],
        options: [
          text1('思い出したくてたまらないのです'),
          text1('思い出すのではないでしょうか'),
          text1('思い出すしかありません'),
          text1('思い出してください'),
        ],
        correctOption: 4,
        translation:
          'Hãy nhớ lại lúc hẹn hò với mối tình đầu. Tim đập thình thịch và rất căng thẳng.',
        reason:
          'Câu sau là 「胸がどきどきして、たいへん緊張したでしょう」 nên tác giả đang mời người đọc hồi tưởng. Dạng yêu cầu 「思い出してください」 khớp nhất.',
        wrong: {
          1: 'Diễn tả mong muốn của người nói là nhớ lại đến mức không chịu nổi, không hợp câu kêu gọi người đọc.',
          2: 'Dạng suy đoán hỏi lại, không nối được với câu "chắc bạn đã rất căng thẳng".',
          3: 'Nghĩa là chỉ còn cách nhớ lại, không có ý bắt buộc nào trong đoạn văn.',
        },
      },
      {
        number: 44,
        stem: [blank('44')],
        options: [text1('というわけです'), text1('という点です'), text1('とします'), text1('としています')],
        correctOption: 1,
        translation: 'Vì vậy não càng được kích hoạt, đó là điều đang nói.',
        reason:
          '「それだけ活性化される」 là kết luận của đoạn nên 「というわけです」 (tức là như vậy) là cách kết thúc tự nhiên.',
        wrong: {
          2: '「という点です」 dùng khi chỉ ra một điểm cụ thể, không phải câu kết luận.',
          3: '「とします」 là giả định hoặc quyết định của người viết, không hợp.',
          4: '「としています」 thường dùng khi thuật lại việc người khác làm, không hợp.',
        },
      },
    ],
  },
  {
    title: 'Nhóm g-read-10-r57',
    mondaiType: 'comprehension_long',
    skill: 'reading',
    passage: [
      p(t('以下は、ある数学者が書いた文章である。')),
      p(
        t(
          '数学というものは、解き方がわかってしまったあとで、力がつくことはない。解き方を身につける前の、まだ解き方のわからない間だけが、力をつけるチャンスである。解けるようになるのは同じでも、それまでのあり方で、力が身につくかどうかが、きまってくる。',
        ),
      ),
      p(
        t(
          'それに、おもしろいのも、本当は、まだ解けないで、いろいろと考えている間である。解けなきゃつまらないようだが、それは早く解こうとあせるからで、楽しみは解けるまでのほうにある。解けるようになったあとは、むしろむなしい。だいたい、「答えのわかっている謎」なんて、意味がない。解き方がわからないからこそ、問題の名にあたいするのだ。',
        ),
      ),
      p(
        t('もちろん、まったく手がつかない（注1）のでは、おもしろくもないが、案外に、多少はわからないでも、うまく'),
        ul('頭のなかに飼っておく'),
        t(
          'と、そのうちに馴れてくれて、わかってきたりする。その、だんだん少しずつ、わかりかけというのも、オツ（注2）なものだ。そのためには、それを飼っておく、頭の牧場がゆたかでなければならない。本当のところは、数学の力というのは、いろいろとわかったことをためこむより、わからないのを飼っておける、その牧場のゆたかさのほうにあるのかもしれない。',
        ),
      ),
      p(
        t(
          'とくに、公式などをおぼえるのには、ぼくは反対である。それは簡単すぎて、少しもおもしろくないし、おぼえたものは忘れるものだ。とくに、急いでおぼえたものは、早く忘れる。同じおぼえるにしても、なるべくなら時間をかけたほうが、長持ちする。',
        ),
      ),
      p(t('（中略）')),
      p(
        t(
          'このごろは、テストでおどされる（注3）ことが多いので、わかること、解けることを急ぐ傾向にある。たしかに、テストなどでは、時間がかぎられているので、急ぐのも多少は仕方がない。しかしながら、時間を制限されたときに急いでできるためには、時間の制限されていないときに、時間を気にしないでやっておいたほうがよい。テストで急ぐためには、テスト以外では急がないほうがよいのである。',
        ),
      ),
      p(
        t(
          'どんなやり方でも、わかって、問題が解けるようになる、という結果は同じかもしれない。しかし、ゆったりとやると、そのわかり方にコク（注4）が出てくるものだ。そして、その結果に達するまでの道筋を楽しむことで、力がつく。',
        ),
      ),
      p(
        t(
          '勉強を楽しむなんて、と思うかもしれないが、それは目的ばかり見てあせるからで、楽しむ気になれば、なんだって楽しめるものだ。',
        ),
      ),
      notes(
        '（注1）手がつかない：ここでは、できない',
        '（注2）オツな：ここでは、おもしろい',
        '（注3）おどされる：ここでは、早く問題を解かされる',
        '（注4）コク：深み',
      ),
    ],
    questions: [
      {
        number: 57,
        stem: text1('数学の問題を解くことについて、筆者の考えに合うのはどれか。'),
        options: [
          text1('早く解けなくても、解き方を身につけることが大切だ。'),
          text1('解けても解けなくても、問題に取り組むことが大切だ。'),
          text1('解けなかった問題が解けるようになったらおもしろくなる。'),
          text1('解き方のわからない問題を解こうとすることに意味がある。'),
        ],
        correctOption: 4,
        translation: 'Về việc giải bài toán, ý nào hợp với ý kiến của tác giả?',
        reason:
          'Tác giả nói chỉ trong lúc chưa biết cách giải mới là cơ hội rèn năng lực và cũng là lúc thú vị nhất, "câu đố đã biết đáp án thì vô nghĩa, vì không biết cách giải nên mới đáng gọi là bài toán" (「解き方がわからないからこそ、問題の名にあたいする」). Vậy phương án 4 đúng.',
        wrong: {
          1: 'Tác giả coi trọng giai đoạn chưa biết cách giải, không nói việc nắm cách giải mới là quan trọng.',
          2: 'Bài không nói giải được hay không đều như nhau; ý nhấn mạnh là quá trình lúc chưa giải được.',
          3: 'Ngược lại, tác giả cho rằng sau khi giải được thì 「むしろむなしい」.',
        },
      },
      {
        number: 58,
        stem: text1('頭のなかに飼っておくとはどういうことか。'),
        options: [
          text1('わかる問題を手がかりにして、わからない問題を考えること'),
          text1('わかる問題とわからない問題を、頭のなかで区別しておくこと'),
          text1('わからない問題をわかるまで解き続けていること'),
          text1('わからない状態のまま、問題を頭のなかに残しておくこと'),
        ],
        correctOption: 4,
        translation: '"Nuôi trong đầu" có nghĩa là gì?',
        reason:
          'Tác giả nói dù chưa hiểu hết, nếu khéo "nuôi" bài toán trong đầu thì dần dần sẽ quen và hiểu ra; năng lực toán học nằm ở sự phong phú của "bãi chăn" có thể nuôi cả những điều chưa hiểu. Tức là giữ bài toán trong đầu ở trạng thái chưa hiểu, phương án 4.',
        wrong: {
          1: 'Bài không nói dùng bài đã hiểu làm manh mối cho bài chưa hiểu.',
          2: 'Bài không nói việc phân loại bài hiểu và bài chưa hiểu.',
          3: 'Không phải cứ giải mãi cho đến khi hiểu; tác giả khuyên đừng vội mà để bài toán trong đầu.',
        },
      },
      {
        number: 59,
        stem: text1('筆者によると、どのように勉強すればよいか。'),
        options: [
          text1('結果を急がずに、考えることを楽しむ。'),
          text1('結果に達することができれば、どんなやり方でもよい。'),
          text1('目的を忘れないで、あせらずに勉強を楽しめばよい。'),
          text1('自分に合ったやり方を探して、時間を気にせず取り組む。'),
        ],
        correctOption: 1,
        translation: 'Theo tác giả, nên học như thế nào?',
        reason:
          'Tác giả khuyên không vội vàng, tận hưởng quá trình suy nghĩ cho đến khi đạt kết quả (「その結果に達するまでの道筋を楽しむことで、力がつく」). Phương án 1 khớp.',
        wrong: {
          2: 'Tác giả nhấn mạnh cách học thong thả và quá trình, không coi kết quả là đủ.',
          3: 'Tác giả phê phán việc "chỉ nhìn mục đích rồi sốt ruột" (目的ばかり見てあせる), nên không khuyên giữ mục đích trong đầu.',
          4: 'Bài không nói việc tìm cách học phù hợp với bản thân.',
        },
      },
    ],
  },
  {
    title: 'Nhóm g-read-11-r60',
    mondaiType: 'integrated_reading',
    skill: 'reading',
    passage: [
      p(t('A')),
      p(
        t(
          'まじめで責任感が強く、負けず嫌いな人は「あきらめない」傾向があります。「あきらめない」ことは、基本的にはもちろんいいことなのですが、しかし一方、あきらめたほうがよいことも、実はけっこうあるものです。',
        ),
        br(),
        t(
          '一所懸命に取り組んでも、うまくいかない、成果が出ない、充足感や満足感が得られない。そうした場合は「あきらめる」というのも、十分よい選択肢になります。',
        ),
        br(),
        t('こうした場合の「あきらめる」とは、「やめてしまう」ということです。'),
        br(),
        t('（中略）'),
        br(),
        t(
          'やめる際には、「うまくいかなかった。やめてよかった」と思うのがコツでしょうね。うまくいかなかったことを悔やみつつやめるのは、避けたいものです。それでは、うまくいかなかったことが尾を引いて（注）しまいます。「うまくいかなくてよかった」と思うくらいがちょうどいいでしょう。それができるようになると、一時的には落ち込んでも、立ち直りが早くなります。',
        ),
      ),
      p(t('B')),
      p(
        t(
          '最近は仕事で悩んでいる人に対して「無理をしないであきらめたほうがよい。」というアドバイスを目にすることがある。もちろん体調を崩してしまうような場合には途中でもやめるべきだ。しかしあきらめるということは、やれることはすべてやり尽くしたあとで考えるべきではないだろうか。困難な目標ほど簡単には達成できないものだ。だから、最初から、できなければあきらめてもいいんだという気持ちでいては、つらくなったときに頑張り続けることができない。',
        ),
        br(),
        t(
          '仮にどうしてもうまくいかずにあきらめることになったとしても、精いっぱい努力した結果ならば納得できる。落ち込んだりくよくよしたりするのではなく気持ちを切り替えて、しっかり原因を考えて次に生かすことが重要だ。',
        ),
      ),
      p(t('（注）尾を引く：ずっと残る')),
    ],
    questions: [
      {
        number: 60,
        stem: text1('あきらめることについて、AとBはどのように述べているか。'),
        options: [
          text1('AもBも、成果が出せる可能性が低い場合には、あきらめたほうがよいと述べている。'),
          text1('AもBも、つらくても、できるだけあきらめずに頑張ったほうがよいと述べている。'),
          text1('Aは状況によっては、あきらめたほうがよいこともあると述べ、Bはあきらめてもいいと思ったほうが、頑張り続けられる場合もあると述べている。'),
          text1('Aは努力しても結果に結びつかない場合は、あきらめたほうがよいと述べ、Bは十分にやってみるまでは、あきらめることを考えるべきではないと述べている。'),
        ],
        correctOption: 4,
        translation: 'A và B nói gì về việc từ bỏ?',
        reason:
          'A: nếu đã cố gắng hết sức mà không có kết quả thì từ bỏ cũng là lựa chọn tốt. B: chỉ nên nghĩ đến việc từ bỏ sau khi đã làm hết những gì có thể (「やれることはすべてやり尽くしたあとで考えるべき」). Phương án 4 tóm đúng hai ý.',
        wrong: {
          1: 'B không nói từ bỏ khi khả năng thành công thấp mà yêu cầu làm hết sức trước.',
          2: 'A cho rằng từ bỏ cũng là lựa chọn tốt, không khuyên cố gắng bằng mọi giá.',
          3: 'B phê phán thái độ "bỏ cuộc cũng được" ngay từ đầu vì sẽ không cố gắng được khi khó khăn.',
        },
      },
      {
        number: 61,
        stem: text1('AとBの認識で共通していることは何か。'),
        options: [
          text1('あきらめることになった原因を考えるべきだ。'),
          text1('あきらめるのが早ければ、早く立ち直れる。'),
          text1('あきらめたことでも、再挑戦することはできる。'),
          text1('あきらめたことを後悔してはいけない。'),
        ],
        correctOption: 4,
        translation: 'Điểm chung trong nhận thức của A và B là gì?',
        reason:
          'A khuyên nên nghĩ "may mà đã bỏ" và tránh việc vừa tiếc nuối vừa dừng lại; B nói nếu đã hết sức thì chấp nhận được, đừng buồn bã hay day dứt. Cả hai đều cho rằng không nên hối tiếc về việc đã từ bỏ.',
        wrong: {
          1: 'Chỉ B nói cần suy nghĩ nguyên nhân để rút kinh nghiệm.',
          2: 'Chỉ A nhắc đến việc phục hồi nhanh, và nó không gắn với "từ bỏ sớm".',
          3: 'Cả hai đều không nói đến việc thử thách lại.',
        },
      },
    ],
  },
  {
    title: 'Nhóm g-read-12-r62',
    mondaiType: 'thematic',
    skill: 'reading',
    passage: [
      p(
        t(
          '子育て（養育）にしろ、学校での教育にしろ、当事者（親・教師）が心がけなければならないのは、まず子どもは親（教師）の思うとおりにならないということである。あるいは、こちらの思うとおりになったら、かえって問題だということである。',
        ),
      ),
      p(
        t(
          '「子どもは親（教師）の思うとおりにならない」という意味は、甘やかして野放図にする（注1）していいということではない。反抗は望ましいから、大いに結構だとも違う。もともと、親も教師も言葉で説得できるようになる以前から、まず子ども（生徒）たちを家庭や学校の生活の枠組みに入れなければならない。絶対に放っておくわけにはいかないし、理屈抜きで生活の型や秩序を押しつけざるをえない。それが親や教師の社会的役割であり、個人としてはどうかと思うようなことも、親や教師は、一律に画一的に身につけさせようとする。それは避けられない。望むと望まざるとにかかわらず、みんながやらなくてはならない。',
        ),
      ),
      p(
        t(
          '人間が社会的動物であるということは、そういうことであろう。動物が持って生まれてきた本能で自由に生きられるのに対して、ひとの子どもは動物的な本能を抑圧されて、社会的規範を生まれてから次々と覚え、身につけていかねばならない。これは、ほかの動物と比較すると、不自由なことである。親や教師は、そういうひとの宿命である不自由を子どもたちに身につけさせなければならない。',
        ),
      ),
      p(t('（中略）')),
      p(
        t(
          'そういう社会的規範は、今の社会のレベルや段階が必要としていることであり、本当にひとの幸福にとってふさわしいものかどうかはわからない。ましてや、生まれ育っていくその子どもにとって、絶対的に必要なものかどうかもわからない。ただ、わかっているのは、社会的に生きていくために今ある社会的規範やルール、考え方をひとまず受け入れなければならないということだけである。そして、そういうひとを規制し構成してきたもろもろ（注2）の',
        ),
        ul('精神的な財産'),
        t('は、時代とともに変わってきたという事実である。'),
      ),
      p(
        t(
          'だから、次の世代は、私たちと同じにはならない。したがって、子どもは親（教師）の思うとおりにはならないのだ。',
        ),
      ),
      p(
        t(
          'もちろん、思うとおりにしようとすることは避けられないとしても、思うとおりにならないことを覚悟しているべきである。それが子ども（生徒）や、あとの世代の人たちへの尊敬であり、信頼であろう。「こちらの思うとおりになったら、かえって問題だ」も同じことだが、現在の人間や社会がすでに理想を実現した完璧な社会であるはずがないし、私たちが正しいと思い、子どもたちに押しつけている社会規範やルールも、あくまでも暫定的なものにすぎない。だから、私たちが予想した以上に、私たちの思いどおりになる子どもができてしまったら、大変なことになる。',
        ),
      ),
      p(t('おとなと子どもとの誤差は、基本的にはいつでも歓迎していいことである。')),
      notes('（注1）野放図にする：勝手にさせる', '（注2）もろもろの：さまざまな'),
    ],
    questions: [
      {
        number: 62,
        stem: text1('筆者によると、親や教師は子どもや生徒に対して何をしているか。'),
        options: [
          text1('反抗を容認しつつ、不自由な社会的規範に従わせている。'),
          text1('どの時代にも通用する社会的規範を身につけさせている。'),
          text1('社会的規範を教え、社会の枠組みに適応させている。'),
          text1('社会的規範を教えたうえで、自由に生きる方法を身につけさせている。'),
        ],
        correctOption: 3,
        translation: 'Theo tác giả, cha mẹ và giáo viên đang làm gì với trẻ em và học sinh?',
        reason:
          'Tác giả nói cha mẹ và giáo viên buộc phải đưa trẻ vào khung sinh hoạt của gia đình, trường học và áp đặt khuôn mẫu, trật tự sinh hoạt (「生活の枠組みに入れなければならない」「型や秩序を押しつけざるをえない」). Đó là dạy chuẩn mực xã hội để trẻ thích nghi, phương án 3.',
        wrong: {
          1: 'Bài nói rõ "phản kháng là đáng mong muốn nên rất tốt" là sai (反抗は望ましいから…とも違う).',
          2: 'Chuẩn mực xã hội thay đổi theo thời đại nên không phải thứ dùng được ở mọi thời.',
          4: 'Bài nói cha mẹ buộc trẻ học sự bất tự do, không dạy cách sống tự do.',
        },
      },
      {
        number: 63,
        stem: [t('精神的な財産とは何か。')],
        options: [
          text1('ひとが幸福になるために守ってきたもの'),
          text1('ひとが本能を抑圧されずに生きるためのもの'),
          text1('ひとが社会で生きていくために作られてきたもの'),
          text1('これから生まれ育っていく子どもにとって必要なもの'),
        ],
        correctOption: 3,
        translation: '"Tài sản tinh thần" là gì?',
        reason:
          '「精神的な財産」 chỉ các chuẩn mực, quy tắc, cách nghĩ mà con người phải tạm thời chấp nhận để sống trong xã hội và đã quy định, hình thành nên con người. Phương án 3 nói đúng điều đó.',
        wrong: {
          1: 'Bài nói không biết chúng có thật sự phù hợp với hạnh phúc của con người hay không.',
          2: 'Ngược lại, chuẩn mực xã hội đàn áp bản năng của con người.',
          4: 'Bài nói không biết chúng có tuyệt đối cần thiết cho đứa trẻ hay không.',
        },
      },
      {
        number: 64,
        stem: text1('筆者が言いたいことは何か。'),
        options: [
          text1('社会的規範は時代によって変化するものであり、子どもはおとなの思うとおりにならなくて当然である。'),
          text1('社会的規範は暫定的なものにすぎず、子どもが自身の考え方に合ったものを作っていくことが望ましい。'),
          text1('時代の変化に適応できるように、おとなは子どもに社会的規範の背景となる考え方を教えたほうがいい。'),
          text1('時代によって考え方は変化するものなので、それに合わせて次の世代が社会的規範を変えるべきだ。'),
        ],
        correctOption: 1,
        translation: 'Điều tác giả muốn nói là gì?',
        reason:
          'Chuẩn mực xã hội thay đổi theo thời đại nên thế hệ sau không giống ta, vì vậy trẻ không làm theo ý người lớn là lẽ đương nhiên, và sai lệch giữa người lớn và trẻ em về cơ bản nên được hoan nghênh. Đó là phương án 1.',
        wrong: {
          2: 'Bài không nói trẻ nên tự tạo ra chuẩn mực phù hợp với suy nghĩ của mình.',
          3: 'Bài không đề cập việc dạy trẻ bối cảnh tư duy đằng sau chuẩn mực.',
          4: 'Bài không nói thế hệ sau phải đổi chuẩn mực; chỉ nói chúng khác thế hệ trước là tự nhiên.',
        },
      },
    ],
  },
  {
    title: 'Nhóm g-read-13-r65',
    mondaiType: 'info_retrieval',
    skill: 'reading',
    passage: [
      p(t('秋川大学＞秋川大学図書館＞一般利用')),
      p(t('一般の方の図書館利用について')),
      p(
        t(
          '秋川大学の学生以外の一般の方も、研究等の目的のために、秋川キャンパスにある中央図書館と文学部図書館の資料が利用できます。',
        ),
      ),
      p(
        t('【入館方法】'),
        br(),
        t('・図書館利用カードをお持ちの方は、自動入退館ゲートから入退館ができます。'),
        br(),
        t('・お持ちでない方は、カウンターで一日入館証を発行いたします。'),
      ),
      p(
        t('【図書館利用カードについて】'),
        br(),
        t('・図書館利用カードは、図書館資料の貸し出しの際に必要になります。'),
        br(),
        t(
          '・発行をご希望の方は、身分証明書をお持ちになり、中央図書館、または文学部図書館のカウンターにお越しください（文学部図書館では平日のみ受け付けています）。',
        ),
        br(),
        t(
          '・平日の9時から17時までの間に申請を受け付けた場合、その日のうちにカードをお渡しします。平日の17時以降、および土日に受け付けた場合は、次の平日開館日以降にお渡しします。',
        ),
      ),
      p(
        t('【貸し出しと返却】'),
        br(),
        t('・貸し出し冊数は5冊まで、貸し出し期間は2週間です。'),
        br(),
        t('・中央図書館の貸し出し受付時間は閉館30分前まで、文学部図書館は閉館15分前までです。'),
        br(),
        t('・開館時の返却は、カウンターで受け付けています。閉館・休館時は、ブックポストに入れてください。'),
      ),
      p(
        t('【資料の複写】'),
        br(),
        t('・館内の複写機で、図書館資料の複写ができます。'),
        br(),
        t('・複写機は、中央図書館は閉館10分前まで、文学部図書館は閉館時間まで利用できます。'),
      ),
      p(t('【開館時間】')),
      {
        type: 'table',
        rows: [
          [text1(''), text1('期間※'), text1('平日'), text1('土曜・日曜')],
          [text1('中央図書館'), text1('授業期間'), text1('9:00～22:00'), text1('9:00～17:00')],
          [text1('中央図書館'), text1('夏休み・春休み期間'), text1('9:00～19:00'), text1('休館')],
          [text1('文学部図書館'), text1('授業期間'), text1('9:00～21:00'), text1('9:00～17:00')],
          [text1('文学部図書館'), text1('夏休み・春休み期間'), text1('9:00～18:00'), text1('休館')],
        ],
      },
      p(t('※各期間の具体的な日程は、開館カレンダーのページをご覧ください。')),
    ],
    questions: [
      {
        number: 65,
        stem: text1(
          'マリーさんは秋川大学で本を借りるために、図書館利用カードを作ろうと思っている。今日は金曜日である。明日の夜までに本を借りたいが、図書館利用カードは、どのように申請しなければならないか。',
        ),
        options: [
          text1('今日、中央図書館か文学部図書館で9時から17時までの間に申請する。'),
          text1('今日、中央図書館で9時から17時までの間に申請する。文学部図書館では申請できない。'),
          text1('今日、中央図書館か文学部図書館で9時から17時までの間に申請するか、明日、中央図書館で9時から17時までの間に申請する。'),
          text1('今日か明日、中央図書館か文学部図書館で9時から17時までの間に申請する。'),
        ],
        correctOption: 1,
        translation:
          'Mary muốn làm thẻ thư viện ở Đại học Akikawa để mượn sách. Hôm nay là thứ Sáu và cô muốn mượn sách trước tối mai. Cô phải đăng ký thẻ như thế nào?',
        reason:
          'Đăng ký trong khoảng 9 đến 17 giờ ngày thường thì được nhận thẻ ngay trong ngày; đăng ký vào thứ Bảy, Chủ nhật thì phải đợi đến ngày thường tiếp theo. Hôm nay thứ Sáu là ngày thường nên cả thư viện trung tâm lẫn thư viện khoa Văn đều nhận, vậy phương án 1.',
        wrong: {
          2: 'Thứ Sáu là ngày thường nên thư viện khoa Văn cũng nhận đăng ký.',
          3: 'Nếu đăng ký vào ngày mai (thứ Bảy) thì thẻ chỉ được trao vào ngày thường tiếp theo, không kịp mượn sách.',
          4: 'Đăng ký vào thứ Bảy thì không nhận được thẻ ngay, và thư viện khoa Văn không nhận đăng ký ngày cuối tuần.',
        },
      },
      {
        number: 66,
        stem: text1(
          'カイさんは、研究のために資料を借りたり複写したりする必要があって、秋川大学の文学部図書館に来た。図書館利用カードは持っている。今日は、授業期間の火曜日である。貸し出しと複写は、何時まで可能か。',
        ),
        options: [
          text1('貸し出しは18時の15分前まで、複写は18時まで可能である。'),
          text1('貸し出しは21時の15分前まで、複写は21時まで可能である。'),
          text1('貸し出しは21時の15分前まで、複写は21時の10分前まで可能である。'),
          text1('貸し出しは21時の30分前まで、複写は21時の10分前まで可能である。'),
        ],
        correctOption: 2,
        translation:
          'Kai đến thư viện khoa Văn của Đại học Akikawa để mượn và photo tài liệu nghiên cứu. Hôm nay là thứ Ba trong kỳ học. Mượn sách và photo được đến mấy giờ?',
        reason:
          'Thư viện khoa Văn kỳ học ngày thường mở cửa đến 21:00. Mượn sách đến trước giờ đóng cửa 15 phút (20:45), máy photo dùng được đến giờ đóng cửa là 21:00. Vậy phương án 2.',
        wrong: {
          1: '18:00 là giờ đóng cửa trong kỳ nghỉ hè, xuân, không phải kỳ học.',
          3: 'Photo đến trước đóng cửa 10 phút là quy định của thư viện trung tâm; thư viện khoa Văn dùng được đến giờ đóng cửa.',
          4: 'Mượn đến trước đóng cửa 30 phút và photo đến trước 10 phút đều là quy định của thư viện trung tâm.',
        },
      },
    ],
  },
] as const;
