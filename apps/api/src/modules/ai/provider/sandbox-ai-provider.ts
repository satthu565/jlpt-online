import type {
  AiProvider,
  AiProviderRequest,
  AiProviderResponse,
} from './ai-provider.interface.js';

export class SandboxAiProvider implements AiProvider {
  readonly id = 'sandbox';
  readonly name = 'Sandbox Mock AI Provider';

  async isAvailable(): Promise<boolean> {
    return true;
  }

  async generate(request: AiProviderRequest): Promise<AiProviderResponse> {
    const action = request.action;
    const locale = request.locale ?? 'vi';

    switch (action) {
      case 'explain_question': {
        const text = locale === 'ja'
          ? '【解説】正解の選択肢は文脈に最も適しています。助詞の使い方と文末の表現に注意しましょう。'
          : '【Giải thích】Đáp án chính xác phù hợp nhất với ngữ cảnh của câu. Chú ý cách dùng trợ từ và cấu trúc ngữ pháp tương ứng.';
        return {
          text,
          structured: {
            summary: 'Giải thích chi tiết câu hỏi',
            correctRationale: 'Cấu trúc phù hợp với ngữ cảnh câu',
            distractorAnalysis: ['Lựa chọn 1 sai trợ từ', 'Lựa chọn 2 sai thì thời'],
          },
          tokensUsed: { prompt: 150, completion: 200, total: 350 },
          costMicroUsd: 1050,
          model: 'sandbox-jlpt-v1',
          finishReason: 'stop',
        };
      }

      case 'analyze_grammar': {
        const text = locale === 'ja'
          ? '【文法分析】この文にはJLPT N3レベルの「〜わけにはいかない」が含まれています。社会的・道徳的理由から〜できないという意味を表します。'
          : '【Phân tích ngữ pháp】Câu này chứa điểm ngữ pháp N3 「〜わけにはいかない」 biểu thị ý nghĩa không thể làm việc gì đó vì lý do đạo đức, xã hội hoặc tâm lý.';
        return {
          text,
          structured: {
            grammarPoint: '〜わけにはいかない',
            level: 'N3',
            meaning: 'Không thể làm vì lý do đạo đức / trách nhiệm',
            structure: 'V-ru + わけにはいかない',
          },
          tokensUsed: { prompt: 120, completion: 180, total: 300 },
          costMicroUsd: 900,
          model: 'sandbox-jlpt-v1',
          finishReason: 'stop',
        };
      }

      case 'compare_options': {
        const text = '【So sánh đáp án】\n- Đáp án 1 vs Đáp án 2: Điểm khác biệt cốt lõi nằm ở tính chủ động và quan hệ nguyên nhân - kết quả. Đáp án 1 dùng cho lý do khách quan, trong khi đáp án 2 thiên về cảm xúc chủ quan.';
        return {
          text,
          structured: {
            comparisons: [
              { optionIndex: 1, difference: 'Chủ quan, cảm xúc cá nhân' },
              { optionIndex: 2, difference: 'Khách quan, sự kiện tự nhiên' },
            ],
            keyDistinction: 'Khách quan vs Chủ quan',
          },
          tokensUsed: { prompt: 180, completion: 220, total: 400 },
          costMicroUsd: 1200,
          model: 'sandbox-jlpt-v1',
          finishReason: 'stop',
        };
      }

      case 'explain_reading': {
        const text = '【Giải thích bài đọc】\nĐoạn 1: Đặt vấn đề về biến đổi môi trường sống.\nĐoạn 2: Luận điểm của tác giả về thái độ thích nghi.\nĐoạn 3: Kết luận và giải pháp thực tiễn.';
        return {
          text,
          structured: {
            sections: [
              { section: 1, mainIdea: 'Đặt vấn đề môi trường' },
              { section: 2, mainIdea: 'Luận điểm thái độ thích nghi' },
              { section: 3, mainIdea: 'Giải pháp thực tiễn' },
            ],
          },
          tokensUsed: { prompt: 300, completion: 350, total: 650 },
          costMicroUsd: 1950,
          model: 'sandbox-jlpt-v1',
          finishReason: 'stop',
        };
      }

      case 'analyze_transcript': {
        const text = '【Phân tích transcript nghe】\n- Cụm từ quan trọng: 「実は〜」(thực ra là...)\n- Tín hiệu chuyển hướng: Sau từ 「でも」, ý định của người nói thay đổi, đây là điểm chốt đáp án.';
        return {
          text,
          structured: {
            keywords: ['実は', 'でも'],
            answerCue: 'Ý kiến thực sự xuất hiện ngay sau từ nối「でも」',
          },
          tokensUsed: { prompt: 200, completion: 250, total: 450 },
          costMicroUsd: 1350,
          model: 'sandbox-jlpt-v1',
          finishReason: 'stop',
        };
      }

      case 'ask_context': {
        const query = request.userMessage ?? 'câu hỏi';
        const text = `【Giải đáp câu hỏi】Dựa trên nội dung bài học, câu hỏi "${query}" có thể được hiểu thông qua ngữ cảnh giao tiếp trang trọng của người Nhật.`;
        return {
          text,
          tokensUsed: { prompt: 160, completion: 200, total: 360 },
          costMicroUsd: 1080,
          model: 'sandbox-jlpt-v1',
          finishReason: 'stop',
        };
      }

      case 'memory_hint': {
        const word = request.context?.vocabWord ?? '約束';
        const text = `【Mẹo ghi nhớ từ vựng: ${word}】\n- Chữ Hán: 約 (ƯỚC - hẹn ước) + 束 (THÚC - bó lại).\n- Câu chuyện gợi nhớ: Lời giao hẹn (約) được buộc chặt (束) lại với nhau thành lời hứa.`;
        return {
          text,
          structured: {
            word,
            mnemonics: 'Lời giao hẹn được buộc chặt lại thành lời hứa (yakusoku).',
            radicals: ['糸 (mịch)', '木 (mộc)'],
          },
          tokensUsed: { prompt: 100, completion: 150, total: 250 },
          costMicroUsd: 750,
          model: 'sandbox-jlpt-v1',
          finishReason: 'stop',
        };
      }

      case 'grammar_example': {
        const point = request.context?.grammarPoint ?? '〜にしたがって';
        const text = `【Ví dụ mới cho mẫu ${point}】\n1. 日本語が上手になるにしたがって、会話が楽しくなってきた。\n2. 気温が上がるにしたがって、体調を崩す人が増える。`;
        return {
          text,
          structured: {
            grammarPoint: point,
            examples: [
              { ja: '日本語が上手になるにしたがって、会話が楽しくなってきた。', vi: 'Cùng với việc tiếng Nhật trở nên giỏi hơn, việc trò chuyện cũng vui hơn.' },
              { ja: '気温が上がるにしたがって、体調を崩す人が増える。', vi: 'Nhiệt độ càng tăng lên thì số người đổ bệnh càng nhiều.' },
            ],
          },
          tokensUsed: { prompt: 140, completion: 200, total: 340 },
          costMicroUsd: 1020,
          model: 'sandbox-jlpt-v1',
          finishReason: 'stop',
        };
      }

      case 'generate_question': {
        const level = request.context?.userLevel ?? 'N3';
        const text = '【Câu hỏi sinh tự động】\nCâu: 田中さんは毎日遅くまで残業している＿＿＿、とても元気そうだ。\n1. にもかかわらず\n2. にしたがって\n3. につれて\n4. に反して';
        return {
          text,
          structured: {
            stem: '田中さんは毎日遅くまで残業している＿＿＿、とても元気そうだ。',
            level,
            skill: 'grammar',
            mondaiType: 'grammar_form',
            options: [
              'にもかかわらず',
              'にしたがって',
              'につれて',
              'に反して',
            ],
            correctOptionIndex: 0,
            explanation: '「〜にもかかわらず」có nghĩa là "mặc dù... nhưng...", biểu thị sự việc trái với dự đoán.',
          },
          tokensUsed: { prompt: 250, completion: 350, total: 600 },
          costMicroUsd: 1800,
          model: 'sandbox-jlpt-v1',
          finishReason: 'stop',
        };
      }

      case 'detect_repeated_errors': {
        const text = '【Phát hiện lỗi lặp lại】Học viên thường nhầm lẫn giữa trợ từ 「に」 và 「で」 khi chỉ nơi chốn tồn tại vs hành động diễn ra. Đã phát hiện 3 lần chọn sai mẫu tương tự.';
        return {
          text,
          structured: {
            errorCategory: 'particles',
            frequentMistake: 'Nhầm lẫn trợ từ に và で',
            recommendedFocus: 'Ôn tập trợ từ chỉ địa điểm hành động vs địa điểm tồn tại',
            occurrences: 3,
          },
          tokensUsed: { prompt: 220, completion: 240, total: 460 },
          costMicroUsd: 1380,
          model: 'sandbox-jlpt-v1',
          finishReason: 'stop',
        };
      }

      case 'recommend_practice': {
        const text = '【Đề xuất bài luyện tập】Dựa trên điểm yếu kỹ năng Đọc hiểu N3, đề xuất luyện 5 bài đọc ngắn (Comprehension Short) và ôn 10 từ vựng chủ đề công sở.';
        return {
          text,
          structured: {
            recommendedMondai: 'comprehension_short',
            targetLevel: 'N3',
            itemCount: 5,
            suggestedSkills: ['reading', 'vocabulary'],
          },
          tokensUsed: { prompt: 150, completion: 180, total: 330 },
          costMicroUsd: 990,
          model: 'sandbox-jlpt-v1',
          finishReason: 'stop',
        };
      }

      case 'weekly_summary': {
        const text = '【Tổng kết tuần】\n- Số câu hoàn thành: 85 câu\n- Tỷ lệ đúng: 78%\n- Điểm tiến bộ: Kỹ năng từ vựng đạt độ chính xác 85%\n- Cần cải thiện: Phần nghe phản xạ nhanh.';
        return {
          text,
          structured: {
            completedQuestions: 85,
            accuracyPercent: 78,
            strengths: ['vocabulary'],
            weaknesses: ['quick_response'],
            studyStreakDays: 6,
          },
          tokensUsed: { prompt: 250, completion: 300, total: 550 },
          costMicroUsd: 1650,
          model: 'sandbox-jlpt-v1',
          finishReason: 'stop',
        };
      }

      case 'generate_flashcards': {
        const text = '【Flashcard sinh tự động】Đã tạo 3 thẻ ghi nhớ từ các câu bạn làm sai gần đây.';
        return {
          text,
          structured: {
            flashcards: [
              { front: '曖昧 (あいまい)', back: 'Mơ hồ, không rõ ràng', hint: 'Từ vựng N2' },
              { front: '妥協 (だきょう)', back: 'Thỏa hiệp', hint: 'Từ vựng N2' },
              { front: '躊躇 (ちゅうちょ)', back: 'Ngập ngừng, do dự', hint: 'Từ vựng N1/N2' },
            ],
          },
          tokensUsed: { prompt: 200, completion: 300, total: 500 },
          costMicroUsd: 1500,
          model: 'sandbox-jlpt-v1',
          finishReason: 'stop',
        };
      }

      case 'deep_explain': {
        // EXPL-11
        const text = '【Giải thích chuyên sâu - EXPL-11】\nXét về cấu trúc ngữ pháp cổ điển, mẫu câu này bắt nguồn từ thể văn ngôn. Trong văn cảnh hiện đại, việc sử dụng mẫu này thể hiện sắc thái trang trọng, khách sáo và giữ khoảng cách lịch sự với người đối thoại.';
        return {
          text,
          structured: {
            linguisticDepth: 'Văn ngôn cổ điển chuyển ngữ sang khẩu ngữ trang trọng',
            culturalContext: 'Giữ khoảng cách lịch sự trong quan hệ cấp trên - cấp dưới',
            nuanceDifference: 'Không dùng trong giao tiếp gia đình hoặc bạn bè thân thiết',
          },
          tokensUsed: { prompt: 220, completion: 320, total: 540 },
          costMicroUsd: 1620,
          model: 'sandbox-jlpt-v1',
          finishReason: 'stop',
        };
      }

      case 'moderate_content': {
        // AI-14
        return {
          text: 'Content passed moderation checks.',
          structured: {
            flagged: false,
            score: 98,
            categories: { hate: false, violence: false, promptInjection: false },
          },
          tokensUsed: { prompt: 50, completion: 50, total: 100 },
          costMicroUsd: 300,
          model: 'sandbox-moderator-v1',
          finishReason: 'stop',
          moderationScore: 98,
        };
      }

      default: {
        return {
          text: `Đã xử lý yêu cầu ${action}.`,
          tokensUsed: { prompt: 100, completion: 100, total: 200 },
          costMicroUsd: 600,
          model: 'sandbox-jlpt-v1',
          finishReason: 'stop',
        };
      }
    }
  }
}
