import { Inject, Injectable } from '@nestjs/common';
import { desc, eq, and, gte, lte } from 'drizzle-orm';
import { DB_CLIENT } from '../../common/database/database.module.js';
import type { DbClientInstance } from '../../db/client.js';
import * as schema from '../../db/schema.js';
import { generateUuidV7 } from '../../common/utils/uuid.js';

export interface RecordActionParams {
  operatorId: string;
  action: string;
  targetResource: string;
  details?: Record<string, unknown>;
}

export interface QueryAuditLogsParams {
  operatorId?: string;
  targetResource?: string;
  action?: string;
  fromDate?: Date | string;
  toDate?: Date | string;
  limit?: number;
  cursor?: string;
}

@Injectable()
export class AuditService {
  constructor(@Inject(DB_CLIENT) private readonly dbClient: DbClientInstance) {}

  /**
   * Records an administrative/staff action to the operator_actions audit table (ADM-14).
   */
  async recordAction(params: RecordActionParams): Promise<string> {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(params.operatorId);
    if (!isUuid) {
      return '';
    }
    const id = generateUuidV7();
    await this.dbClient.db.insert(schema.operatorActions).values({
      id,
      operatorId: params.operatorId,
      action: params.action,
      targetResource: params.targetResource,
      details: params.details ?? {},
      timestamp: new Date(),
    });
    return id;
  }

  /**
   * Queries audit logs with pagination and filters (ADM-14).
   */
  async queryLogs(params: QueryAuditLogsParams) {
    const limit = Math.min(Math.max(params.limit ?? 20, 1), 100);
    const conditions = [];

    if (params.operatorId) {
      conditions.push(eq(schema.operatorActions.operatorId, params.operatorId));
    }
    if (params.targetResource) {
      conditions.push(eq(schema.operatorActions.targetResource, params.targetResource));
    }
    if (params.action) {
      conditions.push(eq(schema.operatorActions.action, params.action));
    }
    if (params.fromDate) {
      conditions.push(gte(schema.operatorActions.timestamp, new Date(params.fromDate)));
    }
    if (params.toDate) {
      conditions.push(lte(schema.operatorActions.timestamp, new Date(params.toDate)));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const items = await this.dbClient.db
      .select({
        id: schema.operatorActions.id,
        operatorId: schema.operatorActions.operatorId,
        action: schema.operatorActions.action,
        targetResource: schema.operatorActions.targetResource,
        details: schema.operatorActions.details,
        timestamp: schema.operatorActions.timestamp,
        operatorEmail: schema.users.email,
        operatorName: schema.users.name,
      })
      .from(schema.operatorActions)
      .leftJoin(schema.users, eq(schema.operatorActions.operatorId, schema.users.id))
      .where(whereClause)
      .orderBy(desc(schema.operatorActions.timestamp))
      .limit(limit + 1);

    const hasNext = items.length > limit;
    const returnItems = hasNext ? items.slice(0, limit) : items;
    const nextCursor = hasNext && returnItems.length > 0 ? returnItems[returnItems.length - 1]!.id : null;

    return {
      items: returnItems,
      nextCursor,
    };
  }
}
