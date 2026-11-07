'use client';
import React from 'react';
import { Settings2, Focus, Keyboard, Headphones, RotateCcw } from 'lucide-react';
import { Button, Popover, Switch, Label, Separator } from '@jlpt/ui/components/exam-controls';
import { useFurigana } from '@jlpt/ui/components/furigana-toggle';
import { useSelectLookupSetting } from '../../corpus';
import { useI18n } from '../../../lib/i18n';

export type JapaneseFontSize = 'sm' | 'base' | 'lg' | 'xl' | `${number}%` | (string & {});

export interface ExamToolbarProps {
  fontSize: JapaneseFontSize;
  onFontSizeChange: (size: JapaneseFontSize) => void;
  isZenMode: boolean;
  onToggleZenMode: () => void;
  onOpenShortcutsHelp: () => void;
  onOpenSpeakerTest: () => void;
  hasListeningTimeline?: boolean;
  selectLookupEnabled?: boolean;
  onSelectLookupChange?: (enabled: boolean) => void;
  className?: string;
}

export function parseFontSizePercent(size: JapaneseFontSize | undefined): number {
  if (!size) return 100;
  if (size === 'base') return 100;
  if (size === 'sm') return 90;
  if (size === 'lg') return 110;
  if (size === 'xl') return 120;
  const match = String(size).match(/(\d+)/);
  if (match && match[1]) {
    const val = parseInt(match[1], 10);
    if (val > 0) return val;
  }
  return 100;
}

export function ExamToolbar(props: ExamToolbarProps): React.JSX.Element {
  const { t } = useI18n();
  const [furigana, setFurigana] = useFurigana();
  const [lookup, setLookup] = useSelectLookupSetting();

  const currentPercent = parseFontSizePercent(props.fontSize);

  const handleDecrease = () => {
    // Zoom out by 10% steps with safe floor of 20%
    const nextPercent = Math.max(20, currentPercent - 10);
    props.onFontSizeChange(nextPercent === 100 ? 'base' : `${nextPercent}%`);
  };

  const handleIncrease = () => {
    // Zoom in by 10% steps with safe ceiling of 500%
    const nextPercent = Math.min(500, currentPercent + 10);
    props.onFontSizeChange(nextPercent === 100 ? 'base' : `${nextPercent}%`);
  };

  const handleReset = () => {
    props.onFontSizeChange('base');
  };

  return (
    <div
      className={`jlpt-exam-toolbar flex items-center justify-between gap-2 py-2 ${props.className ?? ''}`}
      role="toolbar"
      aria-label={t('paperExam.displaySettings')}
    >
      <Popover>
        <Button variant="secondary" size="sm">
          <Settings2 className="size-4" />
          {t('paperExam.displaySettings')}
        </Button>
        <Popover.Content>
          <Popover.Dialog className="grid gap-4">
            <Popover.Heading>{t('paperExam.displaySettings')}</Popover.Heading>
            <div
              role="group"
              aria-label={t('paperExam.fontSize')}
              className="inline-flex items-center justify-between bg-slate-100 dark:bg-slate-800 rounded-full px-2 py-1 w-full max-w-[240px] select-none"
            >
              <Button
                variant="ghost"
                size="sm"
                disabled={currentPercent <= 20}
                aria-label={t('paperExam.decreaseFontSize')}
                onClick={handleDecrease}
                className="font-bold text-sm text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white px-2.5 min-w-0 h-8 rounded-full"
              >
                A−
              </Button>
              <span
                className="font-bold text-sm text-slate-900 dark:text-slate-100 px-2 min-w-[3.5rem] text-center"
                aria-live="polite"
              >
                {currentPercent}%
              </span>
              <Button
                variant="ghost"
                size="sm"
                disabled={currentPercent >= 500}
                aria-label={t('paperExam.increaseFontSize')}
                onClick={handleIncrease}
                className="font-bold text-sm text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white px-2.5 min-w-0 h-8 rounded-full"
              >
                A+
              </Button>
              <Separator orientation="vertical" className="my-1.5 mx-1 h-5" />
              <Button
                variant="ghost"
                size="sm"
                aria-label={t('paperExam.resetFontSize')}
                onClick={handleReset}
                className="text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white p-1.5 min-w-0 h-8 w-8 rounded-full flex items-center justify-center"
              >
                <RotateCcw className="size-4" />
              </Button>
            </div>
            <Switch isSelected={furigana} onChange={setFurigana}>
              <Switch.Content>
                <Switch.Control>
                  <Switch.Thumb />
                </Switch.Control>
                <Label>Furigana</Label>
              </Switch.Content>
            </Switch>
            <Switch
              data-testid="select-lookup-switch"
              isSelected={props.selectLookupEnabled ?? lookup}
              onChange={props.onSelectLookupChange ?? setLookup}
            >
              <Switch.Content>
                <Switch.Control>
                  <Switch.Thumb />
                </Switch.Control>
                <Label>{t('dictionary.selectLookupLabel')}</Label>
              </Switch.Content>
            </Switch>
          </Popover.Dialog>
        </Popover.Content>
      </Popover>
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          aria-pressed={props.isZenMode}
          aria-label={t('paperExam.compact')}
          onClick={props.onToggleZenMode}
        >
          <Focus className="size-4" />
          <span className="hidden sm:inline">{t('paperExam.compact')}</span>
        </Button>
        {props.hasListeningTimeline && (
          <Button
            variant="ghost"
            size="sm"
            aria-label={t('paperExam.speakerTitle')}
            onClick={props.onOpenSpeakerTest}
          >
            <Headphones className="size-4" />
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          aria-label={t('paperExam.shortcuts')}
          onClick={props.onOpenShortcutsHelp}
        >
          <Keyboard className="size-4" />
        </Button>
      </div>
    </div>
  );
}
