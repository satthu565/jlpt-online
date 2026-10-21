import React from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { FEATURES } from '../../../lib/features';
import { PrivacyPolicyContent } from './privacy-policy-content';

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
  // Hidden in this release phase (lib/features.ts); NEXT_PUBLIC_FEATURE_PRIVACY_POLICY=1 brings it back.
  if (!FEATURES.privacyPolicyPage) notFound();
  return <PrivacyPolicyContent />;
}
