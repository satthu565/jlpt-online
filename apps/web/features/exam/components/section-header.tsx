'use client';

import React from 'react';
import { BookOpen, Headphones } from 'lucide-react';
import { Tabs } from '@jlpt/ui/components/exam-controls';
import type { PublicSection } from '@jlpt/schema';
import { useI18n } from '../../../lib/i18n';

export interface SectionHeaderProps {
  sections: PublicSection[];
  currentSectionIndex: number;
  lockedSections: number[];
  onSelectSection?: (index: number) => void;
  className?: string;
}

interface SectionHeaderItem {
  id: 'language' | 'listening';
  title: string;
  durationSec: number;
  sectionIndexes: number[];
  targetIndex: number;
}

function isListeningSection(section: PublicSection): boolean {
  return section.code.toLowerCase().includes('listen') || section.title.includes('聴解');
}

export function buildSectionHeaderItems(sections: PublicSection[]): SectionHeaderItem[] {
  const languageSections = sections.filter((section) => !isListeningSection(section));
  const listeningSections = sections.filter(isListeningSection);
  const items: SectionHeaderItem[] = [];

  if (languageSections.length > 0) {
    items.push({
      id: 'language',
      title: languageSections.length > 1 ? '言語知識（文字・語彙・文法）・読解' : languageSections[0]!.title,
      durationSec: languageSections.reduce((total, section) => total + section.durationSec, 0),
      sectionIndexes: languageSections.map((section) => section.index),
      targetIndex: languageSections[0]!.index,
    });
  }

  if (listeningSections.length > 0) {
    items.push({
      id: 'listening',
      title: '聴解',
      durationSec: listeningSections.reduce((total, section) => total + section.durationSec, 0),
      sectionIndexes: listeningSections.map((section) => section.index),
      targetIndex: listeningSections[0]!.index,
    });
  }

  return items;
}

export function SectionHeader(props: SectionHeaderProps): React.JSX.Element {
  const { t } = useI18n();
  const items = buildSectionHeaderItems(props.sections);
  const selectedItem = items.find((item) => item.sectionIndexes.includes(props.currentSectionIndex)) ?? items[0];

  return (
    <nav className={`jlpt-section-header max-w-7xl w-full mx-auto px-4 pt-3 ${props.className ?? ''}`} aria-label={t('paperExam.sectionNavigation')}>
      <Tabs
        className="section-tabs"
        selectedKey={selectedItem?.id}
        onSelectionChange={(key) => {
          const item = items.find((candidate) => candidate.id === String(key));
          if (item && !item.sectionIndexes.includes(props.currentSectionIndex)) {
            props.onSelectSection?.(item.targetIndex);
          }
        }}
      >
        <Tabs.ListContainer className="section-tabs-container">
          <Tabs.List className="section-tabs-list" aria-label={t('paperExam.sectionNavigation')}>
            {items.map((item) => {
              const isCurrent = item.sectionIndexes.includes(props.currentSectionIndex);
              const isDisabled = !isCurrent && (item.targetIndex > props.currentSectionIndex || props.lockedSections.includes(item.targetIndex));
              const Icon = item.id === 'listening' ? Headphones : BookOpen;

              return (
                <Tabs.Tab
                  key={item.id}
                  id={item.id}
                  className={`section-tab section-tab-${item.id}`}
                  isDisabled={isDisabled}
                >
                  <Icon className="section-tab-icon" aria-hidden="true" />
                  <span className="section-tab-title" lang="ja">{item.title}</span>
                  <span className="section-tab-time">{Math.round(item.durationSec / 60)} {t('planner.overview.minutesUnit')}</span>
                  <Tabs.Indicator className="section-tab-indicator" />
                </Tabs.Tab>
              );
            })}
          </Tabs.List>
        </Tabs.ListContainer>
      </Tabs>
    </nav>
  );
}
