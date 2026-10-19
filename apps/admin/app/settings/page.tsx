'use client';

import React from 'react';
import Link from 'next/link';
import { AdminGuard } from '../../lib/ui-guard';

export default function SettingsHubPage(): React.JSX.Element {
  const sections = [
    {
      id: 'notifications',
      title: 'Cấu hình Thông báo & Email (ADM-18)',
      desc: 'Quản lý các mẫu thông báo, email tự động gửi khi học viên hoàn thành bài thi hoặc thanh toán.',
      href: '/settings/notifications',
      badge: 'Cấu hình',
    },
    {
      id: 'org',
      title: 'Tổ chức & Hồ sơ Giáo viên',
      desc: 'Xét duyệt hồ sơ ứng tuyển của giáo viên, phân bổ lớp học và quản lý tổ chức liên kết.',
      href: '/settings/org',
      badge: 'Giáo viên',
    },
    {
      id: 'backup',
      title: 'Sao lưu & Phục hồi Quản trị (ADM-20 / SYS-08)',
      desc: 'Quản lý các operator job sao lưu WAL-G, diễn tập PITR và xuất gói dữ liệu vận hành.',
      href: '/settings/backup',
      badge: 'Hạ tầng',
    },
  ];

  return (
    <AdminGuard pathname="/settings" requiredRoles={['admin']}>
      <div className="p-8 space-y-6 max-w-5xl mx-auto">
        <div>
          <h1 data-testid="page-title" className="text-2xl font-bold text-gray-900 dark:text-slate-100">
            Cài đặt Hệ thống Quản trị (System Settings)
          </h1>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
            Thiết lập cấu hình thông báo, đối soát tổ chức giáo viên và quy trình vận hành sao lưu phục hồi.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {sections.map((sec) => (
            <Link
              key={sec.id}
              href={sec.href}
              data-testid={`settings-card-${sec.id}`}
              className="p-5 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-lg hover:border-blue-400 hover:shadow-sm transition-all flex flex-col justify-between"
            >
              <div>
                <span className="inline-block px-2.5 py-0.5 rounded text-[11px] font-semibold bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300 mb-3">
                  {sec.badge}
                </span>
                <h3 className="text-base font-bold text-gray-900 dark:text-slate-100 mb-2">{sec.title}</h3>
                <p className="text-xs text-gray-500 dark:text-slate-400 leading-relaxed">{sec.desc}</p>
              </div>
              <div className="mt-4 pt-3 border-t border-gray-200 dark:border-slate-800 text-xs font-semibold text-blue-600 dark:text-blue-400 flex items-center justify-between">
                <span>Truy cập cài đặt</span>
                <span>→</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </AdminGuard>
  );
}
