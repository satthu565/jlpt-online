'use client';

import { CircleCheck, CircleX, Send } from 'lucide-react';
import React, { useState } from 'react';
import { Card } from '@jlpt/ui/components/card';
import { Input } from '@jlpt/ui/components/input';
import { Select } from '@jlpt/ui/components/select';
import { Button } from '@jlpt/ui/components/button';
import { Alert } from '@jlpt/ui/components/alert';
import { JsonLd } from '@jlpt/ui/components/json-ld';
import { Textarea } from '@jlpt/ui/components/textarea';
import { useI18n } from '../../../lib/i18n';

export default function ContactPage(): React.JSX.Element {
  const { t } = useI18n();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [topic, setTopic] = useState('general');
  const [message, setMessage] = useState('');
  const [honeypot, setHoneypot] = useState('');

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Honeypot spam check
    if (honeypot) {
      return;
    }

    if (!name.trim() || !email.trim() || !message.trim()) {
      setErrorMessage('Vui lòng điền đầy đủ các trường bắt buộc.');
      return;
    }

    try {
      setLoading(true);

      const res = await fetch('/api/v1/support/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, topic, message }),
      });

      if (!res.ok) {
        throw new Error('Gửi thông tin không thành công');
      }

      setSuccess(true);
      setName('');
      setEmail('');
      setMessage('');
    } catch {
      setErrorMessage(t('seo.contact.errorNotice'));
    } finally {
      setLoading(false);
    }
  };

  const breadcrumbs = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Trang chủ', item: 'https://jlpt.vn' },
      { '@type': 'ListItem', position: 2, name: 'Liên hệ', item: 'https://jlpt.vn/lien-he' },
    ],
  };

  return (
    <div className="max-w-3xl mx-auto py-8 px-4 space-y-6" data-testid="contact-page">
      <JsonLd id="contact-breadcrumbs" data={breadcrumbs} />

      {/* Breadcrumbs */}
      <nav aria-label="Đường dẫn điều hướng" className="text-xs text-slate-500">
        <a href="/" className="text-slate-500 no-underline hover:underline">Trang chủ</a> &gt;{' '}
        <span className="text-slate-900 dark:text-slate-100 font-semibold">Liên hệ hỗ trợ</span>
      </nav>

      <div className="border-b border-slate-200 dark:border-slate-800 pb-4">
        <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
          {t('seo.contact.title')}
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
          {t('seo.contact.subtitle')}
        </p>
      </div>

      <Card className="p-6 md:p-8 border border-slate-200 dark:border-slate-800 space-y-6">
        {success && (
          <Alert variant="success" className="text-sm" data-testid="contact-success-alert">
            <CircleCheck className="inline size-4 align-[-2px]" aria-hidden="true" /> {t('seo.contact.successNotice')}
          </Alert>
        )}

        {errorMessage && (
          <Alert variant="error" className="text-sm" data-testid="contact-error-alert">
            <CircleX className="inline size-4 align-[-2px]" aria-hidden="true" /> {errorMessage}
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-4" data-testid="contact-form">
          {/* Honeypot field for bot protection */}
          <div className="hidden" aria-hidden="true">
            <Input
              type="text"
              name="website_hp"
              value={honeypot}
              onChange={(e) => setHoneypot(e.target.value)}
              tabIndex={-1}
              autoComplete="off"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label={t('seo.contact.nameLabel')}
              id="contact-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nguyễn Văn A"
              required
              data-testid="contact-name-input"
            />

            <Input
              label={t('seo.contact.emailLabel')}
              id="contact-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="hocvien@example.com"
              required
              data-testid="contact-email-input"
            />
          </div>

          <Select
            label={t('seo.contact.topicLabel')}
            id="contact-topic"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            options={[
              { value: 'general', label: t('seo.contact.topicGeneral') },
              { value: 'technical', label: t('seo.contact.topicTechnical') },
              { value: 'billing', label: t('seo.contact.topicBilling') },
            ]}
            data-testid="contact-topic-select"
          />

          <div>
            <label
              htmlFor="contact-message"
              className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {t('seo.contact.messageLabel')} *
            </label>
            <Textarea
              id="contact-message"
              rows={5}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Nêu rõ câu hỏi hoặc vấn đề bạn gặp phải..."
              required
              data-testid="contact-message-input"
              className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"/>
          </div>

          <Button
            type="submit"
            variant="primary"
            size="md"
            loading={loading}
            data-testid="contact-submit-btn"
          >
            <Send className="size-4" aria-hidden="true" /> {t('seo.contact.submitBtn')}
          </Button>
        </form>
      </Card>
    </div>
  );
}
