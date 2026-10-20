import React from 'react';
import type { Metadata } from 'next';
import { Card } from '@jlpt/ui/components/card';
import { JsonLd } from '@jlpt/ui/components/json-ld';

export const metadata: Metadata = {
  title: 'Điều khoản Dịch vụ & Quy chế thi - JLPT Online',
  description: 'Quy định sử dụng dịch vụ, bản quyền nội dung đề thi năng lực tiếng Nhật JLPT và chính sách hoàn tiền minh bạch.',
  alternates: {
    canonical: 'https://jlpt.vn/dieu-khoan',
    languages: {
      vi: 'https://jlpt.vn/dieu-khoan',
      ja: 'https://jlpt.vn/ja/dieu-khoan',
      en: 'https://jlpt.vn/en/dieu-khoan',
    },
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function TermsOfServicePage(): React.JSX.Element {
  const breadcrumbs = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Trang chủ', item: 'https://jlpt.vn' },
      { '@type': 'ListItem', position: 2, name: 'Điều khoản dịch vụ', item: 'https://jlpt.vn/dieu-khoan' },
    ],
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 space-y-6" data-testid="terms-page">
      <JsonLd id="terms-breadcrumbs" data={breadcrumbs} />

      {/* Breadcrumbs */}
      <nav aria-label="Đường dẫn điều hướng" className="text-xs text-slate-500">
        <a href="/" className="hover:underline">Trang chủ</a> &gt;{' '}
        <span className="text-slate-900 dark:text-slate-100 font-semibold">Điều khoản dịch vụ</span>
      </nav>

      <div className="border-b border-slate-200 dark:border-slate-800 pb-4">
        <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
          Điều khoản Dịch vụ & Quy chế Phòng thi JLPT Online
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Cập nhật lần cuối: Ngày 16 tháng 10 năm 2026
        </p>
      </div>

      <Card className="p-6 md:p-8 border border-slate-200 dark:border-slate-800 space-y-6 text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
        <section className="space-y-2">
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
            1. Chấp thuận điều khoản
          </h2>
          <p>
            Bằng việc truy cập, tạo tài khoản và sử dụng nền tảng JLPT Online, người dùng đồng ý tuân thủ toàn bộ các quy định trong văn bản này cũng như các chính sách bảo mật liên quan.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
            2. Quyền sở hữu trí tuệ & Bản quyền nội dung
          </h2>
          <p>
            Toàn bộ đề thi, ngân hàng câu hỏi, audio phần nghe hiểu, bài giải thích chi tiết và tài liệu học tập được số hóa trên hệ thống thuộc quyền sở hữu trí tuệ của JLPT Online hoặc được cấp phép khai thác hợp pháp theo thỏa thuận bản quyền giáo dục.
          </p>
          <p>
            Nghiêm cấm mọi hành vi trích xuất hàng loạt (scraping), sao chép, thương mại hóa hoặc phát tán tài liệu thi ra bên ngoài hệ thống khi chưa có sự đồng ý bằng văn bản của ban quản trị. Các tài liệu xuất bản (như phiếu điểm PDF) được đóng dấu bản quyền chìm (watermark) để phục vụ công tác truy vết vi phạm.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
            3. Quy chế thi và Phòng thi trực tuyến
          </h2>
          <p>
            Học viên tham gia phòng thi chuẩn JLPT cam kết làm bài trung thực. Hệ thống sử dụng cơ chế đồng bộ thời gian thực theo đồng hồ máy chủ (Server-side Deadline) và cơ chế chống rò rỉ đáp án (Zero Answer Leak Guard). Đáp án chính thức chỉ được công bố sau khi người dùng nộp bài thành công hoặc hết giờ làm bài quy định.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
            4. Chính sách thanh toán & Hoàn tiền
          </h2>
          <p>
            Giao dịch thanh toán được xử lý an toàn qua các cổng thanh toán được cấp phép. Người dùng có quyền gửi yêu cầu hoàn tiền trong vòng 7 ngày kể từ thời điểm giao dịch nếu dịch vụ phát sinh lỗi kỹ thuật nghiêm trọng hoặc chưa làm quá 2 bài thi chính thức.
          </p>
        </section>
      </Card>
    </div>
  );
}
