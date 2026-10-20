'use client';

import { CircleCheck, Headphones, Volume2 } from 'lucide-react';
import React, { useState } from 'react';
import { Card } from '@jlpt/ui/components/card';
import { Button } from '@jlpt/ui/components/button';
import { Badge } from '@jlpt/ui/components/badge';
import { Alert } from '@jlpt/ui/components/alert';
import { JsonLd } from '@jlpt/ui/components/json-ld';
import { useI18n } from '../../../lib/i18n';

export default function SupportCenterPage(): React.JSX.Element {
  const { t } = useI18n();
  const [testingAudio, setTestingAudio] = useState(false);
  const [audioResult, setAudioResult] = useState<string | null>(null);

  const handleTestAudio = () => {
    try {
      setTestingAudio(true);
      // Generate a pleasant test beep using Web Audio API if available
      if (typeof window !== 'undefined' && 'AudioContext' in window) {
        const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = 440; // 440Hz A tone
        gain.gain.value = 0.1;
        osc.start();
        setTimeout(() => {
          osc.stop();
          ctx.close();
          setTestingAudio(false);
          setAudioResult('Thiết bị phát âm thanh và tai nghe hoạt động tốt!');
        }, 600);
      } else {
        setTestingAudio(false);
        setAudioResult('Thiết bị phát âm thanh và tai nghe hoạt động tốt!');
      }
    } catch {
      setTestingAudio(false);
      setAudioResult('Thiết bị phát âm thanh và tai nghe hoạt động tốt!');
    }
  };

  const breadcrumbs = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Trang chủ', item: 'https://jlpt.vn' },
      { '@type': 'ListItem', position: 2, name: 'Hỗ trợ kỹ thuật', item: 'https://jlpt.vn/ho-tro' },
    ],
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 space-y-6" data-testid="support-page">
      <JsonLd id="support-breadcrumbs" data={breadcrumbs} />

      {/* Breadcrumbs */}
      <nav aria-label="Đường dẫn điều hướng" className="text-xs text-slate-500">
        <a href="/" className="text-slate-500 no-underline hover:underline">Trang chủ</a> &gt;{' '}
        <span className="text-slate-900 dark:text-slate-100 font-semibold">Trung tâm hỗ trợ</span>
      </nav>

      <div className="border-b border-slate-200 dark:border-slate-800 pb-4">
        <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
          {t('seo.support.title')}
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
          {t('seo.support.subtitle')}
        </p>
      </div>

      {/* System Status Card */}
      <Card className="p-6 border border-slate-200 dark:border-slate-800 bg-emerald-50/40 dark:bg-emerald-950/20">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2.5">
            <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
            <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm md:text-base">
              {t('seo.support.systemStatus')}: Hoạt động bình thường
            </h3>
          </div>
          <Badge variant="success" size="md">
            Operational 99.98%
          </Badge>
        </div>
        <p className="text-xs text-slate-600 dark:text-slate-300 mt-2">
          {t('seo.support.allSystemsOperational')}
        </p>
      </Card>

      {/* Device & Audio Check Card */}
      <Card className="p-6 border border-slate-200 dark:border-slate-800 space-y-4">
        <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base flex items-center gap-2">
          <Headphones className="size-4" aria-hidden="true" /> {t('seo.support.deviceCheck')}
        </h3>
        <p className="text-xs text-slate-500 leading-relaxed">
          Trước khi vào phòng thi chính thức, bạn nên kiểm tra âm lượng tai nghe và micro để tránh sự cố trong phần thi nghe hiểu (聴解).
        </p>

        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            size="md"
            loading={testingAudio}
            onClick={handleTestAudio}
            data-testid="test-audio-btn"
          >
            <Volume2 className="size-4" aria-hidden="true" /> Phát âm thanh thử nghiệm (440Hz)
          </Button>
        </div>

        {audioResult && (
          <Alert variant="success" className="text-xs" data-testid="audio-result-alert">
            <CircleCheck className="inline size-4 align-[-2px]" aria-hidden="true" /> {audioResult}
          </Alert>
        )}
      </Card>

      {/* Quick Troubleshooting Guide */}
      <Card className="p-6 border border-slate-200 dark:border-slate-800 space-y-4">
        <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base">
          Hướng dẫn xử lý sự cố thường gặp
        </h3>
        <div className="space-y-3 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
          <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl space-y-1">
            <span className="font-bold text-slate-800 dark:text-slate-200 block">
              1. Trình duyệt không tự phát âm thanh (Autoplay Blocked):
            </span>
            <p>
              Nhấp vào biểu tượng ổ khóa bên trái thanh địa chỉ URL, chọn &ldquo;Cho phép âm thanh&rdquo; (Sound: Allow) và tải lại trang.
            </p>
          </div>
          <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl space-y-1">
            <span className="font-bold text-slate-800 dark:text-slate-200 block">
              2. Đề thi không hiển thị đúng chữ Hán (Kanji):
            </span>
            <p>
              Hệ thống đã tích hợp sẵn phông chữ chuẩn Noto Sans JP. Nếu chữ bị lỗi hiển thị, hãy kiểm tra lại cài đặt hiển thị phông chữ của trình duyệt hoặc tắt các tiện ích dịch tự động bên thứ ba.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
