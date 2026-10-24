'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Headphones } from 'lucide-react';
import { Modal } from '@jlpt/ui/components/modal';
import { Button } from '@jlpt/ui/components/button';
import { useI18n } from '../../../lib/i18n';

export interface SpeakerTestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  className?: string;
  isLoading?: boolean;
  mediaSrc?: string;
}

export function SpeakerTestModal({ isOpen, onClose, onConfirm, className, isLoading = false, mediaSrc }: SpeakerTestModalProps): React.JSX.Element {
  const { t } = useI18n();
  const [playing, setPlaying] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(false);
  const tone = useRef<HTMLAudioElement | null>(null);
  const media = useRef<HTMLAudioElement | null>(null);
  const [mediaReady, setMediaReady] = useState(!mediaSrc);
  const [mediaError, setMediaError] = useState(false);
  useEffect(() => {
    setMediaReady(!mediaSrc || Boolean(media.current && media.current.readyState >= 3 && media.current.getAttribute('src') === mediaSrc)); setMediaError(false);
    if (!isOpen) { setReady(false); setPlaying(false); setError(false); }
    return () => { tone.current?.pause(); tone.current = null; };
  }, [isOpen, mediaSrc]);
  const playTest = async () => {
    setError(false); setPlaying(true); setReady(false);
    if (mediaError) { setMediaError(false); media.current?.load(); }
    try {
      tone.current?.pause();
      const audio = new Audio('/audio/speaker-check.wav');
      tone.current = audio;
      audio.onended = () => { if (tone.current === audio) { setPlaying(false); setReady(true); } };
      audio.onerror = () => { if (tone.current === audio) { setPlaying(false); setError(true); } };
      await audio.play();
    } catch { setPlaying(false); setError(true); }
  };
  return <Modal isOpen={isOpen} onClose={() => { if (!isLoading) onClose(); }} title={t('paperExam.speakerTitle')} closeLabel={t('paperExam.close')} className={className}>
    <div className="space-y-4"><Headphones className="size-8" aria-hidden="true" /><p>{t('paperExam.speakerDescription')}</p>{isOpen && mediaSrc && <audio ref={media} src={mediaSrc} preload="auto" onCanPlay={() => setMediaReady(true)} onError={() => { setMediaReady(false); setMediaError(true); }} />}<Button variant="primary" disabled={playing || isLoading} onClick={() => { void playTest(); }}>{t(playing ? 'paperExam.testPlaying' : 'paperExam.testTone')}</Button><p>{t('paperExam.testToneHint')}</p>{error && <p role="alert">{t('paperExam.speakerError')}</p>}{mediaError && <p role="alert">{t('paperExam.prepareAudioError')}</p>}{ready && <p role="status">{t('paperExam.speakerReady')}</p>}<div className="flex flex-wrap gap-3"><Button variant="secondary" onClick={onClose} disabled={isLoading}>{t('paperExam.returnToExam')}</Button><Button variant="primary" onClick={onConfirm} disabled={!ready || !mediaReady || playing || isLoading} loading={isLoading}>{t('paperExam.speakerConfirm')}</Button></div></div>
  </Modal>;
}
