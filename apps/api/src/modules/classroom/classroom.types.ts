export interface TeacherApplicationDto {
  intro: string;
  organizationName?: string;
}

export interface CreateOrganizationDto {
  name: string;
}

export interface UpdateOrganizationDto {
  name?: string;
}

export interface CreateClassDto {
  name: string;
  level: string;
}

export interface CreateClassInvitationDto {
  expiresAt?: string;
  maxUses?: number;
}

export interface CreateClassAssignmentDto {
  examId?: string;
  mixConfig?: Record<string, unknown>;
  opensAtUTC: string;
  dueAtUTC: string;
  attemptPolicy?: Record<string, unknown>;
  learnerIds?: string[];
  title?: string;
}

export interface CreateSupplementDto {
  learnerIds: string[];
  title?: string;
  examId?: string;
}

export interface ExportClassGradesDto {
  kind: 'CSV' | 'XLSX' | 'JSON' | 'PDF';
  resourceId?: string;
  filters?: Record<string, unknown>;
  locale?: string;
}

export interface CreateExamEventDto {
  examId: string;
  opensAt: string;
  startsAt: string;
  endsAt: string;
  resultReleaseAt: string;
  capacity: number;
  lateSyncWindowSec: number;
  rankingScope: string;
  title?: string;
  level?: string;
}
