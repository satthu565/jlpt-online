export interface Organization {
  id: string;
  name: string;
  role?: string;
  createdAt?: string;
}

export interface ClassRoom {
  id: string;
  orgId: string;
  name: string;
  level: string;
  createdAt: string;
}

export interface ClassMember {
  userId: string;
  name: string | null;
  email: string;
  status: 'active' | 'pending' | 'removed';
  joinedAt?: string;
}

export interface ClassAssignment {
  id: string;
  classId: string;
  title: string;
  examId?: string;
  mixConfig?: Record<string, unknown>;
  opensAtUTC: string;
  dueAtUTC: string;
  attemptPolicy?: Record<string, unknown>;
  createdAt: string;
  totalAssigned?: number;
  submittedCount?: number;
}

export interface AssignmentSubmission {
  attemptId: string;
  learnerId: string;
  learnerName?: string;
  learnerEmail?: string;
  score?: number;
  passed?: boolean;
  submittedAt?: string;
  timeSpentSeconds?: number;
}

export interface AssignmentAnalytics {
  assignmentId: string;
  totalLearners: number;
  submissionCount: number;
  submissionRate: number;
  averageScore: number;
  passRate: number;
  highestScore: number;
  lowestScore: number;
  submissions: AssignmentSubmission[];
}

export interface GradeExportItem {
  userId: string;
  name: string;
  email: string;
  status: string;
  totalAssignments: number;
  submittedAssignments: number;
  averageScore: number;
}

export interface GradeExportResponse {
  className: string;
  level: string;
  exportedAt: string;
  format: 'CSV' | 'XLSX' | 'JSON' | 'PDF';
  rowCount: number;
  items: GradeExportItem[];
}

export interface CreateAssignmentInput {
  title: string;
  examId?: string;
  opensAtUTC: string;
  dueAtUTC: string;
  learnerIds?: string[];
  mixConfig?: Record<string, unknown>;
}

export interface CreateSupplementInput {
  assignmentId: string;
  learnerIds: string[];
  title?: string;
  examId?: string;
}
