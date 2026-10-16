export interface ExperimentVariant {
  key: string;
  name?: string;
  weight?: number; // e.g. 50 for 50%
}

export interface ExperimentDefinitionDto {
  id: string;
  name: string;
  description?: string | null;
  variants: ExperimentVariant[];
  isActive: boolean;
  createdAt: string;
}

export interface CreateExperimentDto {
  id: string;
  name: string;
  description?: string;
  variants: ExperimentVariant[];
  isActive?: boolean;
}

export interface AssignmentResultDto {
  experimentId: string;
  subjectId: string;
  variant: string;
  isNewAssignment: boolean;
}

export interface TrackExposureDto {
  experimentId: string;
  subjectId: string;
}

export interface TrackEventDto {
  eventName: string;
  userId?: string;
  sessionId?: string;
  properties?: Record<string, unknown>;
}

export interface ExperimentEvaluationDto {
  experimentId: string;
  name: string;
  isActive: boolean;
  totalAssignments: number;
  totalExposures: number;
  variants: Array<{
    key: string;
    assignments: number;
    exposures: number;
    conversions: number;
    conversionRate: number;
  }>;
}
