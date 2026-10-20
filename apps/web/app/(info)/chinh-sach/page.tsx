import React from 'react';
import type { Metadata } from 'next';
import { Card } from '@jlpt/ui/components/card';
import { JsonLd } from '@jlpt/ui/components/json-ld';

export const metadata: Metadata = {
  title: 'Chính sách Quyền riêng tư & Bảo mật Dữ liệu - JLPT Online',
  description: 'Cam kết bảo mật dữ liệu học viên, quyền riêng tư theo tiêu chuẩn quốc tế và chính sách quản lý cookie minh bạch.',
  alternates: {
    canonical: 'https://jlpt.vn/chinh-sach',
    languages: {
      vi: 'https://jlpt.vn/chinh-sach',
      ja: 'https://jlpt.vn/ja/chinh-sach',
      en: 'https://jlpt.vn/en/chinh-sach',
    },
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function PrivacyPolicyPage(): React.JSX.Element {
  const breadcrumbs = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Trang chủ', item: 'https://jlpt.vn' },
      { '@type': 'ListItem', position: 2, name: 'Chính sách quyền riêng tư', item: 'https://jlpt.vn/chinh-sach' },
    ],
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 space-y-6" data-testid="privacy-page">
      <JsonLd id="privacy-breadcrumbs" data={breadcrumbs} />

      {/* Breadcrumbs */}
      <nav aria-label="Đường dẫn điều hướng" className="text-xs text-slate-500">
        <a href="/" className="text-slate-500 no-underline hover:underline">Trang chủ</a> &gt;{' '}
        <span className="text-slate-900 dark:text-slate-100 font-semibold">Chính sách quyền riêng tư</span>
      </nav>

      <div className="border-b border-slate-200 dark:border-slate-800 pb-4">
        <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
          Chính sách Quyền riêng tư & Bảo vệ Dữ liệu Học viên
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Cập nhật lần cuối: Ngày 16 tháng 10 năm 2026
        </p>
      </div>

      <Card className="p-6 md:p-8 border border-slate-200 dark:border-slate-800 space-y-6 text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
        <section className="space-y-2">
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
            1. Cam kết bảo vệ dữ liệu cá nhân
          </h2>
          <p>
            JLPT Online tôn trọng và cam kết bảo vệ tuyệt đối quyền riêng tư của mọi học viên. Chúng tôi không chia sẻ, bán hoặc chuyển giao thông tin cá nhân của bạn cho bất kỳ bên thứ ba nào vì mục đích quảng cáo thương mại.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
            2. Thông tin thu thập & Mục đích sử dụng
          </h2>
          <p>
            Chúng tôi chỉ thu thập các thông tin tối thiểu cần thiết để vận hành dịch vụ học tập:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Thông tin tài khoản:</strong> Địa chỉ email, tên hiển thị, mật khẩu được mã hóa an toàn (Argon2id/bcrypt).</li>
            <li><strong>Dữ liệu học tập:</strong> Lịch sử làm bài thi, tiến độ flashcards SRS, ghi chú sổ tay và thống kê điểm số cá nhân.</li>
            <li><strong>Số đo hiệu năng (Core Web Vitals):</strong> Tốc độ tải trang, thời gian phản hồi chỉ được ghi nhận dưới dạng ẩn danh khi có sự đồng ý của học viên.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
            3. Chính sách Cookie & Quyền từ chối (Cookie Consent)
          </h2>
          <p>
            Hệ thống cung cấp banner đồng ý cookie rõ ràng ngay tại lần truy cập đầu tiên. Bạn có toàn quyền chọn &ldquo;Từ chối cookie phân tích&rdquo; (Decline Analytics). Khi đó, hệ thống chỉ lưu cookie chức năng bắt buộc để duy trì phiên đăng nhập và không gửi bất kỳ số đo tracking nào về máy chủ phân tích.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
            4. Quyền của học viên đối với dữ liệu
          </h2>
          <p>
            Theo quy định bảo vệ dữ liệu (GDPR / APPI), học viên có quyền:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Truy xuất toàn bộ dữ liệu lịch sử thi và điểm số của mình bất kỳ lúc nào.</li>
            <li>Yêu cầu chỉnh sửa hoặc cập nhật thông tin tài khoản không chính xác.</li>
            <li>Yêu cầu xóa vĩnh viễn tài khoản và toàn bộ dữ liệu cá nhân liên quan.</li>
          </ul>
        </section>
      </Card>
    </div>
  );
}
