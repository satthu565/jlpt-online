import React from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { FEATURES } from '../../../lib/features';
import { absoluteUrl, localizedUrl } from '../../../lib/site';
import { PrivacyPolicyContent } from './privacy-policy-content';

export const metadata: Metadata = {
  title: 'Chính sách Quyền riêng tư & Bảo mật Dữ liệu - Gokakuya.com',
  description: 'Cam kết bảo mật dữ liệu học viên, quyền riêng tư theo tiêu chuẩn quốc tế và chính sách quản lý cookie minh bạch.',
  alternates: {
    canonical: absoluteUrl('/chinh-sach'),
    languages: {
      vi: localizedUrl('vi', '/chinh-sach'),
      ja: localizedUrl('ja', '/chinh-sach'),
      en: localizedUrl('en', '/chinh-sach'),
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

export { PrivacyPolicyContent } from './privacy-policy-content';

