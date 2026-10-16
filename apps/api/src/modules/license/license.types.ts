export type ProvenanceType = 'self_authored' | 'official_released' | 'licensed_partner';

export interface SourceRights {
  displayAllowed: boolean;
  remixAllowed: boolean;
  commercialAllowed: boolean;
  transcriptAllowed: boolean;
  aiProcessingAllowed: boolean;
  exportAllowed: boolean;
  expiresAt?: string | null;
}

export interface CreateSourceDto {
  slug: string;
  name: string;
  provenance: ProvenanceType;
  metadata?: Record<string, unknown>;
}

export interface UpdateSourceDto {
  name?: string;
  provenance?: ProvenanceType;
  metadata?: Record<string, unknown>;
}

export interface CreateLicenseDto {
  sourceId: string;
  licenseType: string;
  effectiveFrom: Date | string;
  expiresAt?: Date | string | null;
  terms?: string;
  rights?: Partial<SourceRights>;
}

export interface UpdateLicenseDto {
  licenseType?: string;
  effectiveFrom?: Date | string;
  expiresAt?: Date | string | null;
  terms?: string;
  rights?: Partial<SourceRights>;
}

export interface TakedownLicenseDto {
  reason: string;
}
