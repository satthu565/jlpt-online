'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, Button, Badge, Alert, Select } from '@jlpt/ui';
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
    <div className="classroom-dashboard" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Top Header & Selector */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '1rem',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '1.25rem',
          backgroundColor: 'var(--bg-card)',
          borderRadius: '8px',
          border: '1px solid var(--border-subtle)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <div>
            <label htmlFor="select-class-dropdown" style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>
              {t('classroom.dashboard.selectClass')}
            </label>
            <div style={{ minWidth: '220px' }}>
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
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <Button
              variant="outline"
              onClick={() => setIsExportModalOpen(true)}
              data-testid="open-export-modal-button"
            >
              📥 {t('classroom.dashboard.exportGrades')}
            </Button>

            <Button
              variant="primary"
              onClick={() => setIsAssignModalOpen(true)}
              data-testid="open-create-assignment-button"
            >
              + {t('classroom.dashboard.createAssignment')}
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
        style={{
          display: 'flex',
          gap: '0.5rem',
          borderBottom: '1px solid var(--border-subtle)',
        }}
      >
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'assignments'}
          aria-controls="assignments-panel"
          id="tab-assignments"
          onClick={() => setActiveTab('assignments')}
          style={{
            padding: '0.75rem 1.25rem',
            fontWeight: 600,
            fontSize: '0.9375rem',
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            color: activeTab === 'assignments' ? 'var(--color-primary)' : 'var(--text-muted)',
            borderBottom: activeTab === 'assignments' ? '2px solid var(--color-primary)' : '2px solid transparent',
            marginBottom: '-1px',
            minHeight: '44px',
          }}
        >
          {t('classroom.dashboard.tabAssignments', { count: String(assignments.length) })}
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'members'}
          aria-controls="members-panel"
          id="tab-members"
          onClick={() => setActiveTab('members')}
          style={{
            padding: '0.75rem 1.25rem',
            fontWeight: 600,
            fontSize: '0.9375rem',
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            color: activeTab === 'members' ? 'var(--color-primary)' : 'var(--text-muted)',
            borderBottom: activeTab === 'members' ? '2px solid var(--color-primary)' : '2px solid transparent',
            marginBottom: '-1px',
            minHeight: '44px',
          }}
        >
          {t('classroom.dashboard.tabMembers', { count: String(members.length) })}
        </button>
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
              <CardContent style={{ padding: '3rem', textAlign: 'center' }}>
                <p style={{ color: 'var(--text-secondary)', margin: '0 0 1rem 0' }}>
                  {t('classroom.dashboard.noAssignments')}
                </p>
                {isTeacher && (
                  <Button variant="primary" onClick={() => setIsAssignModalOpen(true)}>
                    + {t('classroom.dashboard.createAssignment')}
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem' }}>
              {assignments.map((asgn) => {
                const isDue = new Date(asgn.dueAtUTC) < new Date();
                return (
                  <Card key={asgn.id} data-testid={`assignment-card-${asgn.id}`}>
                    <CardHeader style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <CardTitle style={{ fontSize: '1.125rem', margin: '0 0 0.25rem 0' }}>
                          {asgn.title}
                        </CardTitle>
                        <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                          {t('classroom.dashboard.due')}: {new Date(asgn.dueAtUTC).toLocaleString()}
                        </span>
                      </div>
                      <Badge variant={isDue ? 'default' : 'primary'}>
                        {isDue ? t('classroom.dashboard.statusClosed') : t('classroom.dashboard.statusActive')}
                      </Badge>
                    </CardHeader>

                    <CardContent>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '0.5rem 0',
                          borderTop: '1px solid var(--border-subtle)',
                          marginTop: '0.5rem',
                        }}
                      >
                        <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
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
                        >
                          📊 {t('classroom.dashboard.viewProgress')}
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
            <CardContent style={{ padding: '1rem' }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-subtle)', textAlign: 'left' }}>
                      <th style={{ padding: '0.75rem' }}>{t('classroom.members.name')}</th>
                      <th style={{ padding: '0.75rem' }}>{t('classroom.members.email')}</th>
                      <th style={{ padding: '0.75rem' }}>{t('classroom.members.status')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {members.map((m) => (
                      <tr key={m.userId} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <td style={{ padding: '0.75rem', fontWeight: 600 }}>{m.name || t('classroom.members.unknown')}</td>
                        <td style={{ padding: '0.75rem', color: 'var(--text-secondary)' }}>{m.email}</td>
                        <td style={{ padding: '0.75rem' }}>
                          <Badge variant={m.status === 'active' ? 'success' : 'default'}>
                            {m.status}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
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
