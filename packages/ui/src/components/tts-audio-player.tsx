'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Button } from './button.js';
import { Alert } from './alert.js';

export interface TTSAudioPlayerProps {
  text: string;
  voice?: string;
  audioUrl?: string | null;
  status?: 'PRODUCTION' | 'SANDBOX' | 'ERROR';
  isExternal?: boolean;
  onFetchAudio?: () => Promise<{ audioUrl: string; status: string; isExternal: boolean }>;
  labels: {
    play: string;
    pause: string;
    loading: string;
    sandboxNotice: string;
    errorNotice: string;
  };
  className?: string;
}

export function TTSAudioPlayer({
  text,
  voice,
  audioUrl: initialAudioUrl,
  status: initialStatus,
  isExternal: initialIsExternal = false,
  onFetchAudio,
  labels,
  className = '',
}: TTSAudioPlayerProps): React.JSX.Element {
  const [isPlaying, setIsPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [currentAudioUrl, setCurrentAudioUrl] = useState<string | null>(initialAudioUrl ?? null);
  const [status, setStatus] = useState<string | undefined>(initialStatus);
  const [isExternal, setIsExternal] = useState<boolean>(initialIsExternal);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (initialAudioUrl) setCurrentAudioUrl(initialAudioUrl);
    if (initialStatus) setStatus(initialStatus);
    if (initialIsExternal !== undefined) setIsExternal(initialIsExternal);
  }, [initialAudioUrl, initialStatus, initialIsExternal]);

  const handlePlayToggle = async () => {
    setErrorMessage(null);

    // If audio element is already playing, pause it
    if (audioRef.current && !audioRef.current.paused) {
      audioRef.current.pause();
      setIsPlaying(false);
      return;
    }

    // If we have an existing audioUrl, play it
    if (currentAudioUrl && audioRef.current) {
      try {
        await audioRef.current.play();
        setIsPlaying(true);
      } catch {
        setErrorMessage(labels.errorNotice);
        setIsPlaying(false);
      }
      return;
    }

    // Fetch audio from TTS API if onFetchAudio callback is provided
    if (onFetchAudio) {
      try {
        setLoading(true);
        const res = await onFetchAudio();
        setCurrentAudioUrl(res.audioUrl);
        setStatus(res.status);
        setIsExternal(res.isExternal);

        // Play newly acquired audioUrl
        setTimeout(async () => {
          if (audioRef.current) {
            try {
              await audioRef.current.play();
              setIsPlaying(true);
            } catch {
              setErrorMessage(labels.errorNotice);
            }
          }
        }, 50);
      } catch {
        setErrorMessage(labels.errorNotice);
      } finally {
        setLoading(false);
      }
    } else {
      setErrorMessage(labels.errorNotice);
    }
  };

  const isSandbox = status === 'SANDBOX' || isExternal === false;

  return (
    <div
      data-testid="tts-audio-player"
      data-text={text}
      className={`jlpt-tts-player ${className}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <Button
          type="button"
          size="sm"
          variant="outline"
          loading={loading}
          disabled={loading}
          onClick={handlePlayToggle}
          data-testid="tts-play-btn"
          aria-label={isPlaying ? labels.pause : labels.play}
        >
          {isPlaying ? '⏸ ' + labels.pause : '🔊 ' + labels.play}
        </Button>

        {voice && (
          <span
            style={{
              fontSize: '0.75rem',
              color: 'var(--text-muted, #64748b)',
            }}
          >
            Voice: {voice}
          </span>
        )}
      </div>

      {/* Audio element with optimized metadata preloading (SYS-02) */}
      {currentAudioUrl && (
        <audio
          ref={audioRef}
          src={currentAudioUrl}
          preload="metadata"
          onEnded={() => setIsPlaying(false)}
          onError={() => {
            setIsPlaying(false);
            setErrorMessage(labels.errorNotice);
          }}
          data-testid="tts-audio-element"
        />
      )}

      {/* Acceptance 3: Âm thanh TTS có fallback thông báo lỗi, không giả provider thành công */}
      {isSandbox && (
        <div data-testid="tts-sandbox-alert">
          <Alert variant="warning" className="text-xs">
            ⚠️ {labels.sandboxNotice}
          </Alert>
        </div>
      )}

      {errorMessage && (
        <div data-testid="tts-error-alert">
          <Alert variant="error" className="text-xs">
            ❌ {errorMessage}
          </Alert>
        </div>
      )}
    </div>
  );
}
