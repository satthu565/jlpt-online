import { Inject, Injectable, Logger } from '@nestjs/common';
import { createEventEnvelope, type EventTopic } from '@jlpt/schema';
import { DB_CLIENT } from '../../common/database/database.module.js';
import type { DbClientInstance } from '../../db/client.js';
import * as schema from '../../db/schema.js';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

export type DbTx = Parameters<Parameters<PostgresJsDatabase<typeof schema>['transaction']>[0]>[0];

@Injectable()
export class OutboxService {
  private readonly logger = new Logger(OutboxService.name);

  constructor(@Inject(DB_CLIENT) private readonly dbClient: DbClientInstance) {}

  /**
   * Emits a domain event into the outbox table within the provided database transaction (A10, A15).
   * Ensures transactional consistency between domain operations and event delivery.
   */
  async emitEvent<T extends Record<string, unknown>>(
    topic: EventTopic,
    aggregateId: string,
    actorId: string,
    payload: T,
    tx?: unknown,
  ): Promise<string> {
    const envelope = createEventEnvelope(topic, aggregateId, actorId, payload);
    const db = (tx as DbTx) || this.dbClient.db;

    await (db as typeof this.dbClient.db).insert(schema.outbox).values({
      id: envelope.eventId,
      topic,
      payload: envelope as unknown as Record<string, unknown>,
      createdAt: new Date(envelope.occurredAt),
    });

    this.logger.debug(`[Outbox] Emitted event topic=${topic} aggregateId=${aggregateId} eventId=${envelope.eventId}`);
    return envelope.eventId;
  }
}
