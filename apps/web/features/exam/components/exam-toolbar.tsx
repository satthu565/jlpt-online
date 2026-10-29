'use client';
import React from 'react';
import { Settings2, Focus, Keyboard, Headphones } from 'lucide-react';
import { Button, ButtonGroup, Popover, Switch, Label } from '@jlpt/ui/components/exam-controls';
import { useFurigana } from '@jlpt/ui/components/furigana-toggle';
import { useSelectLookupSetting } from '../../corpus';
import { useI18n } from '../../../lib/i18n';
export type JapaneseFontSize = 'sm' | 'base' | 'lg' | 'xl';
export interface ExamToolbarProps {
  fontSize: JapaneseFontSize; onFontSizeChange: (size: JapaneseFontSize) => void;
  isZenMode: boolean; onToggleZenMode: () => void; onOpenShortcutsHelp: () => void;
  onOpenSpeakerTest: () => void; hasListeningTimeline?: boolean;
  selectLookupEnabled?: boolean; onSelectLookupChange?: (enabled: boolean) => void; className?: string;
}
export function ExamToolbar(props: ExamToolbarProps): React.JSX.Element {
  const { t } = useI18n();
  const [furigana, setFurigana] = useFurigana();
  const [lookup, setLookup] = useSelectLookupSetting();
  return <div className={`jlpt-exam-toolbar flex items-center justify-between gap-2 py-2 ${props.className ?? ''}`} role="toolbar" aria-label={t('paperExam.displaySettings')}>
    <Popover><Button variant="secondary" size="sm"><Settings2 className="size-4" />{t('paperExam.displaySettings')}</Button>
      <Popover.Content><Popover.Dialog className="grid gap-4"><Popover.Heading>{t('paperExam.displaySettings')}</Popover.Heading>
        <ButtonGroup aria-label={t('paperExam.fontSize')}>{(['sm','base','lg','xl'] as const).map((size,index) => <Button key={size} size="sm" variant={props.fontSize === size ? 'primary' : 'secondary'} aria-pressed={props.fontSize === size} aria-label={t('paperExam.fontSizeStep',{number:index+1})} onClick={() => props.onFontSizeChange(size)}>{['A−','A','A+','A++'][index]}</Button>)}</ButtonGroup>
        <Switch isSelected={furigana} onChange={setFurigana}><Switch.Content><Switch.Control><Switch.Thumb /></Switch.Control><Label>Furigana</Label></Switch.Content></Switch>
        <Switch data-testid="select-lookup-switch" isSelected={props.selectLookupEnabled ?? lookup} onChange={props.onSelectLookupChange ?? setLookup}><Switch.Content><Switch.Control><Switch.Thumb /></Switch.Control><Label>{t('dictionary.selectLookupLabel')}</Label></Switch.Content></Switch>
      </Popover.Dialog></Popover.Content>
    </Popover>
    <div className="flex items-center gap-1"><Button variant="ghost" size="sm" aria-pressed={props.isZenMode} aria-label={t('paperExam.compact')} onClick={props.onToggleZenMode}><Focus className="size-4" /><span className="hidden sm:inline">{t('paperExam.compact')}</span></Button>{props.hasListeningTimeline && <Button variant="ghost" size="sm" aria-label={t('paperExam.speakerTitle')} onClick={props.onOpenSpeakerTest}><Headphones className="size-4" /></Button>}<Button variant="ghost" size="sm" aria-label={t('paperExam.shortcuts')} onClick={props.onOpenShortcutsHelp}><Keyboard className="size-4" /></Button></div>
  </div>;
}
