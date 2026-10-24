'use client';
import React from 'react';
import { Tabs, Chip } from '@jlpt/ui/components/exam-controls';
import type { PublicSection } from '@jlpt/schema';
import { useI18n } from '../../../lib/i18n';
export interface SectionHeaderProps { sections: PublicSection[]; currentSectionIndex: number; lockedSections: number[]; onSelectSection?: (index: number) => void; className?: string }
export function SectionHeader(props: SectionHeaderProps): React.JSX.Element {
 const {t}=useI18n();
 return <nav className={`jlpt-section-header max-w-7xl w-full mx-auto px-4 pt-3 ${props.className ?? ''}`} aria-label={t('paperExam.sectionNavigation')}><Tabs selectedKey={String(props.currentSectionIndex)} onSelectionChange={(key) => props.onSelectSection?.(Number(key))}><Tabs.ListContainer><Tabs.List aria-label={t('paperExam.sectionNavigation')}>{props.sections.map((section,index) => <Tabs.Tab key={index} id={String(index)} isDisabled={props.lockedSections.includes(index) || index > props.currentSectionIndex}>{section.title}<Chip size="sm" variant="soft">{Math.round(section.durationSec/60)} min</Chip><Tabs.Indicator /></Tabs.Tab>)}</Tabs.List></Tabs.ListContainer></Tabs></nav>;
}