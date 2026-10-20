'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@jlpt/ui/components/card';
import { Button } from '@jlpt/ui/components/button';
import { Badge } from '@jlpt/ui/components/badge';
import { Alert } from '@jlpt/ui/components/alert';
import { Select } from '@jlpt/ui/components/select';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@jlpt/ui/components/table';
import { EmptyState } from '@jlpt/ui/components/empty-state';
import { Download, Plus, BarChart2 } from 'lucide-react';
import type {
  Organization,
  ClassRoom,
  ClassMember,
  ClassAssignment,
  AssignmentAnalytics,
  CreateAssignmentInput,
  GradeExportResponse,
} from '../types';
import { CohortPrivacyBadge } from './cohort-privacy-badge';
import { CreateAssignmentModal } from './create-assignment-modal';
import { AssignmentProgressView } from './assignment-progress-view';
import { GradeExportModal } from './grade-export-modal';
import { useI18n } from '../../../lib/i18n';

export interface ClassroomDashboardProps {
  organizations: Organization[];
  classes: ClassRoom[];
  selectedClassId?: string;
  onSelectClass: (classId: string) => void;
  members: ClassMember[];
  assignments: ClassAssignment[];
  isTeacher?: boolean;
  onCreateAssignment: (input: CreateAssignmentInput) => Promise<void>;
  onLoadAssignmentAnalytics: (assignmentId: string) => Promise<AssignmentAnalytics>;
  onExportGrades: (classId: string, format: 'CSV' | 'XLSX' | 'JSON' | 'PDF') => Promise<GradeExportResponse>;
  onSupplementAssignment?: (assignmentId: string, learnerIds: string[]) => Promise<void>;
}

export function ClassroomDashboard({
  organizations: _organizations,
  classes,
  selectedClassId,
  onSelectClass,
  members,
  assignments,
  isTeacher = true,
  onCreateAssignment,
  onLoadAssignmentAnalytics,
  onExportGrades,
  onSupplementAssignment,
}: ClassroomDashboardProps): React.JSX.Element {
  const { t } = useI18n();

  const [activeTab, setActiveTab] = useState<'assignments' | 'members'>('assignments');
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [selectedAnalytics, setSelectedAnalytics] = useState<AssignmentAnalytics | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const activeClass = classes.find((c) => c.id === selectedClassId) || classes[0];

  const handleViewAnalytics = async (assignmentId: string) => {
    setAnalyticsLoading(true);
    setSelectedAnalytics(null);
    try {
      const data = await onLoadAssignmentAnalytics(assignmentId);
      setSelectedAnalytics(data);
    } catch {
      setFeedback({ type: 'error', message: t('classroom.analytics.loadError') });
    } finally {
      setAnalyticsLoading(false);
    }
  };

  return (
    <div className="classroom-dashboard flex flex-col gap-6">
      {/* Top Header & Selector */}
      <div className="flex flex-wrap gap-4 items-center justify-between p-5 bg-[var(--bg-card)] rounded-lg border border-[var(--border-subtle)]">
        <div className="flex items-center gap-4 flex-wrap">
          <div>
            <label htmlFor="select-class-dropdown" className="text-xs text-[var(--text-muted)] block mb-1">
              {t('classroom.dashboard.selectClass')}
            </label>
            <div className="min-w-[220px]">
              <Select
                id="select-class-dropdown"
                value={activeClass?.id || ''}
                onChange={(e) => onSelectClass(e.target.value)}
                options={classes.map((c) => ({
                  value: c.id,
                  label: `${c.name} (${c.level})`,
                }))}
              />
            </div>
          </div>

          <CohortPrivacyBadge isTeacher={isTeacher} />
        </div>

        {isTeacher && activeClass && (
          <div className="flex gap-3 items-center">
            <Button
              variant="outline"
              onClick={() => setIsExportModalOpen(true)}
              data-testid="open-export-modal-button"
              className="flex items-center gap-1.5"
            >
              <Download className="size-4" />
              <span>{t('classroom.dashboard.exportGrades')}</span>
            </Button>

            <Button
              variant="primary"
              onClick={() => setIsAssignModalOpen(true)}
              data-testid="open-create-assignment-button"
              className="flex items-center gap-1.5"
            >
              <Plus className="size-4" />
              <span>{t('classroom.dashboard.createAssignment')}</span>
            </Button>
          </div>
        )}
      </div>

      {feedback && (
        <Alert variant={feedback.type} onClose={() => setFeedback(null)}>
          {feedback.message}
        </Alert>
      )}

      {/* Tabs: Assignments vs Members */}
      <div
        role="tablist"
        aria-label={t('classroom.dashboard.tabsAria')}
        className="flex gap-2 border-b border-[var(--border-subtle)]"
      >
        <Button
          type="button"
          role="tab"
          variant="ghost"
          aria-selected={activeTab === 'assignments'}
          aria-controls="assignments-panel"
          id="tab-assignments"
          onClick={() => setActiveTab('assignments')}
          className={`px-5 py-3 font-semibold text-sm border-none bg-transparent cursor-pointer min-h-[44px] rounded-none mb-[-1px] ${
            activeTab === 'assignments'
              ? 'text-[var(--color-primary)] border-b-2 border-b-[var(--color-primary)]'
              : 'text-[var(--text-muted)] border-b-2 border-b-transparent hover:text-[var(--text-primary)]'
          }`}
        >
          {t('classroom.dashboard.tabAssignments', { count: String(assignments.length) })}
        </Button>

        <Button
          type="button"
          role="tab"
          variant="ghost"
          aria-selected={activeTab === 'members'}
          aria-controls="members-panel"
          id="tab-members"
          onClick={() => setActiveTab('members')}
          className={`px-5 py-3 font-semibold text-sm border-none bg-transparent cursor-pointer min-h-[44px] rounded-none mb-[-1px] ${
            activeTab === 'members'
              ? 'text-[var(--color-primary)] border-b-2 border-b-[var(--color-primary)]'
              : 'text-[var(--text-muted)] border-b-2 border-b-transparent hover:text-[var(--text-primary)]'
          }`}
        >
          {t('classroom.dashboard.tabMembers', { count: String(members.length) })}
        </Button>
      </div>

      {/* Active Assignment Analytics Detail View */}
      {selectedAnalytics && (
        <AssignmentProgressView
          analytics={selectedAnalytics}
          onClose={() => setSelectedAnalytics(null)}
          onSupplement={
            onSupplementAssignment
              ? async (learnerIds) => {
                  await onSupplementAssignment(selectedAnalytics.assignmentId, learnerIds);
                }
              : undefined
          }
        />
      )}

      {/* Tab 1: Assignments */}
      {activeTab === 'assignments' && (
        <div id="assignments-panel" role="tabpanel" aria-labelledby="tab-assignments">
          {assignments.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <EmptyState
                  variant="empty"
                  title={t('classroom.dashboard.noAssignments')}
                  action={
                    isTeacher ? (
                      <Button variant="primary" onClick={() => setIsAssignModalOpen(true)} className="flex items-center gap-1.5">
                        <Plus className="size-4" />
                        <span>{t('classroom.dashboard.createAssignment')}</span>
                      </Button>
                    ) : undefined
                  }
                  minHeight="sm"
                />
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {assignments.map((asgn) => {
                const isDue = new Date(asgn.dueAtUTC) < new Date();
                return (
                  <Card key={asgn.id} data-testid={`assignment-card-${asgn.id}`}>
                    <CardHeader className="flex flex-row justify-between items-start">
                      <div>
                        <CardTitle className="text-lg mb-1">
                          {asgn.title}
                        </CardTitle>
                        <span className="text-xs text-[var(--text-muted)]">
                          {t('classroom.dashboard.due')}: {new Date(asgn.dueAtUTC).toLocaleString()}
                        </span>
                      </div>
                      <Badge variant={isDue ? 'default' : 'primary'}>
                        {isDue ? t('classroom.dashboard.statusClosed') : t('classroom.dashboard.statusActive')}
                      </Badge>
                    </CardHeader>

                    <CardContent>
                      <div className="flex justify-between items-center py-2 border-t border-[var(--border-subtle)] mt-2">
                        <span className="text-sm text-[var(--text-secondary)]">
                          {t('classroom.dashboard.submissionsCount', {
                            submitted: String(asgn.submittedCount || 0),
                            total: String(asgn.totalAssigned || members.length),
                          })}
                        </span>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewAnalytics(asgn.id)}
                          loading={analyticsLoading}
                          data-testid={`view-analytics-${asgn.id}`}
                          className="flex items-center gap-1.5"
                        >
                          <BarChart2 className="size-3.5" />
                          <span>{t('classroom.dashboard.viewProgress')}</span>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Members */}
      {activeTab === 'members' && (
        <div id="members-panel" role="tabpanel" aria-labelledby="tab-members">
          <Card>
            <CardContent className="p-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('classroom.members.name')}</TableHead>
                    <TableHead>{t('classroom.members.email')}</TableHead>
                    <TableHead>{t('classroom.members.status')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members.map((m) => (
                    <TableRow key={m.userId}>
                      <TableCell className="font-semibold">{m.name || t('classroom.members.unknown')}</TableCell>
                      <TableCell className="text-[var(--text-secondary)]">{m.email}</TableCell>
                      <TableCell>
                        <Badge variant={m.status === 'active' ? 'success' : 'default'}>
                          {m.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Create Assignment Modal */}
      {isAssignModalOpen && activeClass && (
        <CreateAssignmentModal
          isOpen={isAssignModalOpen}
          classId={activeClass.id}
          members={members}
          onClose={() => setIsAssignModalOpen(false)}
          onSubmit={async (input) => {
            await onCreateAssignment(input);
            setIsAssignModalOpen(false);
            setFeedback({
              type: 'success',
              message: t('classroom.assignment.createSuccess'),
            });
          }}
        />
      )}

      {/* Grade Export Modal */}
      {isExportModalOpen && activeClass && (
        <GradeExportModal
          isOpen={isExportModalOpen}
          classId={activeClass.id}
          className={activeClass.name}
          onClose={() => setIsExportModalOpen(false)}
          onExport={async (fmt) => {
            return onExportGrades(activeClass.id, fmt);
          }}
        />
      )}
    </div>
  );
}
