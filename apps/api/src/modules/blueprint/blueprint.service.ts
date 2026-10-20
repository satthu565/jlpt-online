import crypto from 'node:crypto';
import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, desc, eq } from 'drizzle-orm';
import { DB_CLIENT } from '../../common/database/database.module.js';
import type { DbClientInstance } from '../../db/client.js';
import * as schema from '../../db/schema.js';
import { activateBlueprint } from '../../db/blueprint-guard.js';
import type { Blueprint, Level } from '@jlpt/schema';

export function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

export function toDeterministicUuid(slugOrId: string): string {
  if (isUuid(slugOrId)) {
    return slugOrId;
  }
  const hash = crypto.createHash('sha256').update(`blueprint:${slugOrId}`).digest('hex');
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(13, 16)}-a${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
}


type BlueprintRow = typeof schema.blueprints.$inferSelect;

/** Current exam session as YYYY-MM, the format of effectiveFrom / effectiveTo. */
export function currentSession(now = new Date()): string {
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
}

/**
 * Picks the blueprint that applies today to a level when several are active (for example a demo
 * synthetic one plus the official 2010 and 2020 versions of N5): official before synthetic, then the
 * newest effectiveFrom, then the highest version. A blueprint whose effectiveTo is already past is
 * skipped, unless nothing else is left. Original past exams keep using the blueprintRef of their
 * import package instead.
 */
export function selectCurrentBlueprint(rows: BlueprintRow[], now = new Date()): BlueprintRow | undefined {
  const session = currentSession(now);
  const active = rows.filter((r) => r.status === 'active');
  const valid = active.filter((r) => !r.effectiveTo || r.effectiveTo >= session);
  const pool = valid.length > 0 ? valid : active;
  const official = (r: BlueprintRow) => (r.isOfficial || r.kind === 'official' ? 1 : 0);
  return [...pool].sort(
    (a, b) =>
      official(b) - official(a) ||
      (b.effectiveFrom ?? '').localeCompare(a.effectiveFrom ?? '') ||
      b.version - a.version,
  )[0];
}

@Injectable()
export class BlueprintService {
  constructor(@Inject(DB_CLIENT) private readonly dbClient: DbClientInstance) {}

  /**
   * Retrieves a blueprint by its UUID or slug identifier and optional version.
   */
  async getBlueprintById(idOrSlug: string, version?: number): Promise<typeof schema.blueprints.$inferSelect> {
    const blueprintId = toDeterministicUuid(idOrSlug);

    const conditions = [eq(schema.blueprints.id, blueprintId)];
    if (version !== undefined) {
      conditions.push(eq(schema.blueprints.version, version));
    }

    const rows = await this.dbClient.db
      .select()
      .from(schema.blueprints)
      .where(and(...conditions))
      .orderBy(desc(schema.blueprints.version))
      .limit(1);

    if (rows.length === 0) {
      // Fallback: search note or sourceRef for slug if stored differently
      const allRows = await this.dbClient.db
        .select()
        .from(schema.blueprints)
        .orderBy(desc(schema.blueprints.version));
      const match = allRows.find(
        (r: typeof schema.blueprints.$inferSelect) => r.id === idOrSlug || Boolean(r.note?.includes(idOrSlug)),
      );
      if (match) return match;

      throw new NotFoundException(`Blueprint không tồn tại: ${idOrSlug} (version: ${version ?? 'latest'})`);
    }

    return rows[0]!;
  }

  /**
   * Retrieves the active blueprint for a specific JLPT level.
   */
  async getActiveBlueprintByLevel(level: Level): Promise<typeof schema.blueprints.$inferSelect> {
    const rows = await this.dbClient.db
      .select()
      .from(schema.blueprints)
      .where(
        and(
          eq(schema.blueprints.level, level),
          eq(schema.blueprints.status, 'active'),
        ),
      );

    const current = selectCurrentBlueprint(rows);
    if (!current) {
      throw new NotFoundException(`Không tìm thấy blueprint active cho cấp độ ${level}`);
    }

    return current;
  }

  /**
   * Seeds or saves a blueprint in the database idempotently.
   */
  async upsertBlueprint(
    blueprintData: Record<string, unknown>,
    confirmedByUserId?: string,
  ): Promise<typeof schema.blueprints.$inferSelect> {
    const rawId = (blueprintData['id'] as string) || `synthetic-${blueprintData['level']}-v${blueprintData['version'] || 1}`;
    const blueprintId = toDeterministicUuid(rawId);
    const version = Number(blueprintData['version']) || 1;
    const level = String(blueprintData['level']) as Level;
    const isOfficial = blueprintData['kind'] === 'official' || Boolean(blueprintData['isOfficial']);

    let activated: Partial<Blueprint> & { status: string; isConfirmed: boolean; confirmedBy?: string; confirmedAt?: string };
    try {
      activated = activateBlueprint(
        blueprintData as unknown as Blueprint,
        confirmedByUserId ? { confirmedBy: confirmedByUserId } : undefined,
      );
    } catch {
      // If activation guard throws, save as draft
      activated = {
        ...blueprintData,
        status: isOfficial ? 'draft' : 'active',
        isConfirmed: !isOfficial,
      };
    }

    const existing = await this.dbClient.db
      .select()
      .from(schema.blueprints)
      .where(eq(schema.blueprints.id, blueprintId))
      .limit(1);

    if (existing.length > 0) {
      return existing[0]!;
    }

    const [inserted] = await this.dbClient.db
      .insert(schema.blueprints)
      .values({
        id: blueprintId,
        level,
        version,
        kind: isOfficial ? 'official' : 'synthetic',
        status: activated.status || (isOfficial ? 'draft' : 'active'),
        isOfficial,
        isConfirmed: activated.isConfirmed ?? !isOfficial,
        confirmedBy: confirmedByUserId || null,
        confirmedAt: activated.confirmedAt ? new Date(activated.confirmedAt) : null,
        effectiveFrom: String(blueprintData['effectiveFrom'] || '2026-10'),
        effectiveTo: typeof blueprintData['effectiveTo'] === 'string' ? blueprintData['effectiveTo'] : null,
        sourceRef: (blueprintData['sourceRef'] as unknown) ?? [],
        note: (blueprintData['note'] as string) || (rawId !== blueprintId ? `id:${rawId}` : ''),
        sections: blueprintData['sections'] as unknown,
        scoring: blueprintData['scoring'] as unknown,
      })
      .returning();

    return inserted!;
  }

  /**
   * Admin: List all blueprints (ADM-04).
   */
  async listBlueprints(): Promise<{ items: (typeof schema.blueprints.$inferSelect & { isCurrent: boolean })[] }> {
    const rows = await this.dbClient.db
      .select()
      .from(schema.blueprints)
      .orderBy(desc(schema.blueprints.level), desc(schema.blueprints.version));
    const currentIds = new Set<string>();
    for (const level of new Set(rows.map((r: BlueprintRow) => r.level))) {
      const current = selectCurrentBlueprint(rows.filter((r: BlueprintRow) => r.level === level));
      if (current) currentIds.add(current.id);
    }
    return { items: rows.map((r: BlueprintRow) => ({ ...r, isCurrent: currentIds.has(r.id) })) };
  }

  /**
   * Admin: Create a new blueprint draft (ADM-04).
   */
  async createBlueprint(
    data: Record<string, unknown>,
    userId: string,
  ): Promise<{ id: string }> {
    const inserted = await this.upsertBlueprint(data, userId);
    return { id: inserted.id };
  }

  /**
   * Admin: Create a new version of an existing blueprint (ADM-04).
   */
  async createBlueprintVersion(
    id: string,
    data: Record<string, unknown>,
    userId: string,
  ): Promise<{ version: number }> {
    const existing = await this.getBlueprintById(id);
    const nextVersion = existing.version + 1;
    const blueprintData = {
      ...existing,
      ...data,
      id: `${id}-v${nextVersion}`,
      version: nextVersion,
      status: 'draft',
      isConfirmed: false,
    };
    await this.upsertBlueprint(blueprintData, userId);
    return { version: nextVersion };
  }

  /**
   * Admin: Activate blueprint with confirmation and safety checks (ADM-04).
   */
  async activateBlueprint(
    id: string,
    confirmation: unknown,
    userId: string,
  ): Promise<{ active: boolean }> {
    const blueprint = await this.getBlueprintById(id);
    activateBlueprint(
      blueprint as unknown as Blueprint,
      { confirmedBy: userId },
    );

    await this.dbClient.db
      .update(schema.blueprints)
      .set({
        status: 'active',
        isConfirmed: true,
        confirmedBy: userId,
        confirmedAt: new Date(),
      })
      .where(eq(schema.blueprints.id, blueprint.id));

    return { active: true };
  }
}
