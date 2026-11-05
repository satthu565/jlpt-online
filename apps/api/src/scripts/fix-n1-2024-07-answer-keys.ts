import { pathToFileURL } from 'node:url';
import { Logger } from '@nestjs/common';
import { type DisputedQuestionFix, runDisputedFix } from './fix-disputed-n1-answers.js';

/**
 * Seven N1 7/2024 keys that disagree with the official answer sheet (答案 / 聴解正解表).
 * Question numbers are website numbers: Q47 is source Q52, Q52-Q81 are the 30 listening items
 * (問題1 = Q52-56, 問題2 = Q57-62, 問題3 = Q63-67, 問題4 = Q68-78, 問題5 = Q79-81).
 */
export const N1_2024_07_KEY_FIXES: readonly DisputedQuestionFix[] = [
  {
    examSlug: 'n1-2024-07',
    questionNumber: 47,
    oldKey: 1,
    newKey: 3,
    reason:
      'Đoạn cuối bài viết khẳng định đột biến làm tăng sự đa dạng của sinh vật, còn áp lực môi trường có vai trò thu hẹp sự đa dạng đó, và tiến hóa có cả hai mặt (「突然変異は生物の多様性を拡大しますが、環境圧力にはその多様性を絞り込む役割があるといえるでしょう。生物の進化には、その両面があるのです」). Vì vậy cả đột biến lẫn áp lực môi trường đều có vai trò mở rộng hoặc thu hẹp sự đa dạng, khớp phương án 3 và bảng đáp án nguồn (câu 52 = 3).',
    oldKeyReason:
      'Phương án 1 chỉ nói sự đa dạng do đột biến được duy trì hay thu hẹp tùy môi trường, bỏ sót mặt thứ nhất (đột biến mở rộng đa dạng) và không phải kết luận "hai mặt" của tác giả.',
    wrongReasons: {
      1: 'Phương án 1: Chỉ nêu mặt môi trường duy trì hoặc thu hẹp đa dạng, bỏ sót việc đột biến làm đa dạng tăng lên; không phải kết luận "hai mặt" của tác giả.',
      2: 'Phương án 2: Bài không nói đột biến khiến cá thể không chịu ảnh hưởng của môi trường.',
      4: 'Phương án 4: Bài nói áp lực môi trường thu hẹp đa dạng, không nói đa dạng cứ thế mở rộng mãi nhờ đột biến.',
    },
  },
  {
    examSlug: 'n1-2024-07',
    questionNumber: 63,
    oldKey: 1,
    newKey: 2,
    reason:
      'Bài nghe kể rằng 40 năm trước ký túc xá bị tránh vì luật khắt khe, nhưng nay ký túc xá hấp dẫn hơn nhờ cơ sở vật chất, có bữa ăn và nhân viên thường trực nên số người muốn vào vượt định mức, thậm chí phải bốc thăm (「最近の寮は…魅力的になっています。寮に入りたいという人が定員を超え、抽選までしている寮もあります」). Nội dung chính là lý do ký túc xá lại được ưa chuộng trở lại, tức phương án 2.',
    oldKeyReason:
      'Phương án 1 sai vì luật lệ chỉ được nhắc ở quá khứ làm lý do bị tránh, bài không nói về sự thay đổi của luật.',
    wrongReasons: {
      1: 'Phương án 1: Luật khắt khe chỉ là lý do ký túc xá từng bị tránh; bài không nói về sự thay đổi của luật lệ.',
      3: 'Phương án 3: Bài không nói về nỗi lo của sinh viên sống một mình.',
      4: 'Phương án 4: Bữa ăn chỉ là một điểm cộng của ký túc xá, không phải chủ đề về món ăn được sinh viên sống một mình ưa chuộng.',
    },
  },
  {
    examSlug: 'n1-2024-07',
    questionNumber: 65,
    oldKey: 1,
    newKey: 4,
    reason:
      'Người của hãng rèm cửa nói rằng ở Nhật xưa dùng cửa lùa fusuma, shoji làm rèm, rèm cửa chỉ được dùng rộng rãi từ thập niên Showa 30 khi lối sống kiểu phương Tây xuất hiện và nhà kiểu Tây tăng nhanh, rồi dần thấm vào đời sống (「カーテンが日本で広く使われるようになったのは、西洋的なライフスタイルが始まった昭和３０年代以降です」). Chủ đề là quá trình rèm cửa phổ biến ở Nhật, tức phương án 4.',
    oldKeyReason:
      'Phương án 1 sai vì bài không nói về sự phát triển của chất liệu rèm; chất liệu chỉ được nhắc khi kể về fusuma, shoji ngày xưa.',
    wrongReasons: {
      1: 'Phương án 1: Bài không bàn về sự phát triển chất liệu rèm cửa.',
      2: 'Phương án 2: Bài không nói về thiết kế rèm mang phong cách Nhật; nói về việc rèm kiểu Tây phổ biến.',
      3: 'Phương án 3: Bài không nhắc đến giá cả của rèm cửa.',
    },
  },
  {
    examSlug: 'n1-2024-07',
    questionNumber: 67,
    oldKey: 1,
    newKey: 4,
    reason:
      'Nhà nghiên cứu cho biết chưa rõ con khủng long này ăn gì, nên nhóm đã phân tích vết xước li ti trên bề mặt răng hóa thạch bằng công nghệ mới và so với răng của bò sát để suy ra thức ăn (「歯に付く細かい傷は食べたものによって異なります。その違いを分析し…何を食べていたのかを具体的に推測できるようになった」). Nội dung nói về phương pháp điều tra thứ nó đã ăn, tức phương án 4.',
    oldKeyReason:
      'Phương án 1 sai vì bài không nói về cách ăn mà về việc điều tra loại thức ăn thông qua vết xước trên răng.',
    wrongReasons: {
      1: 'Phương án 1: Bài không nói về cách ăn mà về việc xác định loại thức ăn.',
      2: 'Phương án 2: Bài không nhắc đến đặc điểm của nơi nó từng ăn.',
      3: 'Phương án 3: Bài không nói về môi trường của thời đại nó sống.',
    },
  },
  {
    examSlug: 'n1-2024-07',
    questionNumber: 79,
    oldKey: 1,
    newKey: 3,
    reason:
      'Sau khi cân nhắc các ý tưởng, trưởng ban chọn ý tưởng bám sát vài tuyển thủ chủ chốt để ghi lại một ngày của họ (「さっきの密着取材の案、面白いんじゃないかな。…今回は何人かに絞って取材することにしよう」). Vì vậy chuyên đề viết về cách các tuyển thủ chủ chốt trải qua một ngày, tức phương án 3.',
    oldKeyReason:
      'Phương án 1 sai vì quyết tâm của đội trưởng là nội dung của lần đăng trước; trưởng ban nói không muốn lặp lại.',
    wrongReasons: {
      1: 'Phương án 1: Là nội dung đã làm lần trước; trưởng ban nói không muốn làm giống lần trước.',
      2: 'Phương án 2: Trưởng ban cho rằng chưa biết sẽ gặp đội nào nên đưa tin về đối thủ chưa phù hợp.',
      4: 'Phương án 4: Giới thiệu toàn bộ tuyển thủ chính thức bị loại vì trang báo có hạn.',
    },
  },
  {
    examSlug: 'n1-2024-07',
    questionNumber: 80,
    oldKey: 1,
    newKey: 4,
    reason:
      'Người phụ nữ nói không muốn làm chòm sao hay chụp ảnh sao vì mình đã tự chụp, còn trạm vũ trụ quốc tế thì chưa từng được nhìn thấy nên muốn tham gia buổi này (「だからこの講座に参加して見てみたいな」). Buổi cô ấy muốn tham gia đầu tiên là quan sát Trạm Vũ trụ Quốc tế, tức phương án 4.',
    oldKeyReason:
      'Phương án 1 sai vì người phụ nữ nói thà xem sao thật còn hơn tự tạo chòm sao.',
    wrongReasons: {
      1: 'Phương án 1: Cô ấy nói thích xem sao thật hơn là tạo chòm sao.',
      2: 'Phương án 2: Cô ấy thỉnh thoảng tự chụp ảnh bầu trời sao nên muốn khóa khác.',
      3: 'Phương án 3: Quan sát sao băng là lựa chọn cuối cùng của cả hai, không phải điều cô ấy muốn tham gia đầu tiên.',
    },
  },
  {
    examSlug: 'n1-2024-07',
    questionNumber: 81,
    oldKey: 1,
    newKey: 3,
    reason:
      'Người đàn ông nói muốn khóa tập trung ngắm sao hơn quan sát trạm vũ trụ, người phụ nữ đồng ý vì đây là cơ hội hiếm có và chốt chọn khóa đó (「めったにないチャンスだもんね。それにしよう！」). Hai người chọn khóa quan sát sao băng, tức phương án 3.',
    oldKeyReason:
      'Phương án 1 sai vì cả hai đều không muốn làm chòm sao mà muốn xem sao thật.',
    wrongReasons: {
      1: 'Phương án 1: Cả hai đều muốn xem sao thật hơn là tạo chòm sao.',
      2: 'Phương án 2: Người phụ nữ đã tự chụp ảnh bầu trời sao nên không chọn khóa này.',
      4: 'Phương án 4: Đây là khóa người phụ nữ muốn tham gia lúc đầu, nhưng người đàn ông muốn khóa ngắm sao hơn và cuối cùng hai người chọn khóa khác.',
    },
  },
] as const;

const entryPoint = process.argv[1] ? pathToFileURL(process.argv[1]).href : '';
if (entryPoint === import.meta.url) {
  runDisputedFix(process.argv.slice(2), N1_2024_07_KEY_FIXES).catch((error: unknown) => {
    Logger.error(error instanceof Error ? error.message : String(error), undefined, 'N1202407KeyFix');
    process.exitCode = 1;
  });
}
