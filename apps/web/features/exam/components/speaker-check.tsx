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
  const context = useRef<AudioContext | null>(null);
  const media = useRef<HTMLAudioElement | null>(null);
  const [mediaReady, setMediaReady] = useState(!mediaSrc);
  const [mediaError, setMediaError] = useState(false);
  useEffect(() => {
    setMediaReady(!mediaSrc); setMediaError(false);
    if (!isOpen) { setReady(false); setPlaying(false); setError(false); }
    return () => { void context.current?.close().catch(() => {}); context.current = null; };
  }, [isOpen, mediaSrc]);
  const playTest = async () => {
    setError(false); setPlaying(true); setReady(false);
    if (mediaError) { setMediaError(false); media.current?.load(); }
    try {
      await context.current?.close();
      const audio = new AudioContext();
      context.current = audio;
      await audio.resume();
      if (audio.state !== 'running') throw new Error('Audio blocked');
      const oscillator = audio.createOscillator();
      const gain = audio.createGain();
      oscillator.frequency.value = 440;
      gain.gain.setValueAtTime(0, audio.currentTime);
      gain.gain.linearRampToValueAtTime(0.15, audio.currentTime + 0.05);
      gain.gain.linearRampToValueAtTime(0, audio.currentTime + 0.65);
      oscillator.connect(gain); gain.connect(audio.destination);
      oscillator.onended = () => { if (context.current === audio) { setPlaying(false); setReady(true); } };
      oscillator.start(); oscillator.stop(audio.currentTime + 0.7);
    } catch { setPlaying(false); setError(true); }
  };
  return <Modal isOpen={isOpen} onClose={() => { if (!isLoading) onClose(); }} title={t('paperExam.speakerTitle')} closeLabel={t('paperExam.close')} className={className}>
    <div className="space-y-4"><Headphones className="size-8" aria-hidden="true" /><p>{t('paperExam.speakerDescription')}</p>{isOpen && mediaSrc && <audio ref={media} src={mediaSrc} preload="auto" onCanPlay={() => setMediaReady(true)} onError={() => { setMediaReady(false); setMediaError(true); }} />}<Button variant="primary" disabled={playing || isLoading} onClick={() => { void playTest(); }}>{t(playing ? 'paperExam.testPlaying' : 'paperExam.testTone')}</Button><p>{t('paperExam.testToneHint')}</p>{error && <p role="alert">{t('paperExam.speakerError')}</p>}{mediaError && <p role="alert">{t('paperExam.prepareAudioError')}</p>}{ready && <p role="status">{t('paperExam.speakerReady')}</p>}<div className="flex flex-wrap gap-3"><Button variant="secondary" onClick={onClose} disabled={isLoading}>{t('paperExam.returnToExam')}</Button><Button variant="primary" onClick={onConfirm} disabled={!ready || !mediaReady || playing || isLoading} loading={isLoading}>{t('paperExam.speakerConfirm')}</Button></div></div>
  </Modal>;
}
