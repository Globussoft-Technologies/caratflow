import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { Queue, Worker, type Job } from 'bullmq';
import type { DomainEvent, DomainEventType } from '@caratflow/shared-types';

type EventHandler = (event: DomainEvent) => Promise<void>;

/** Domain queues -- one per bounded context */
const DOMAIN_QUEUES = [
  'inventory',
  'manufacturing',
  'financial',
  'retail',
  'crm',
  'wholesale',
  'export',
  'ecommerce',
  'compliance',
  'platform',
  'india',
  'storefront',
  'preorder',
  'digital-gold',
  'b2c',
] as const;

type DomainQueueName = (typeof DOMAIN_QUEUES)[number];

@Injectable()
export class EventBusService implements OnModuleDestroy {
  private queues = new Map<string, Queue>();
  private workers = new Map<string, Worker>();
  private handlers = new Map<DomainEventType, EventHandler[]>();

  private readonly redisConnection = {
    host: process.env.REDIS_HOST ?? 'localhost',
    port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
  };

  constructor() {
    // Initialize queues for each domain
    for (const domain of DOMAIN_QUEUES) {
      const queueName = `caratflow:${domain}`;
      this.queues.set(
        domain,
        new Queue(queueName, { connection: this.redisConnection }),
      );
    }
  }

  /**
   * Publish a domain event to the appropriate queue.
   * The queue is determined by the event type prefix (e.g., 'inventory.stock.adjusted' -> 'inventory').
   */
  async publish(event: DomainEvent): Promise<void> {
    const domain = event.type.split('.')[0] as DomainQueueName;
    const queue = this.queues.get(domain);
    if (!queue) {
      console.error(`[EventBus] No queue for domain: ${domain}`);
      return;
    }

    await queue.add(event.type, event, {
      removeOnComplete: 1000,
      removeOnFail: 5000,
      attempts: 3,
      backoff: { type: 'exponential', delay: 1000 },
    });
  }

  /**
   * Subscribe to a specific event type.
   * Creates a worker for the domain if one doesn't exist.
   */
  subscribe(eventType: DomainEventType, handler: EventHandler): void {
    const existing = this.handlers.get(eventType) ?? [];
    existing.push(handler);
    this.handlers.set(eventType, existing);

    // Ensure worker exists for the domain
    const domain = eventType.split('.')[0] as DomainQueueName;
    if (!this.workers.has(domain)) {
      this.startWorker(domain);
    }
  }

  private startWorker(domain: DomainQueueName): void {
    const queueName = `caratflow:${domain}`;
    const worker = new Worker(
      queueName,
      async (job: Job<DomainEvent>) => {
        const event = job.data;
        const handlers = this.handlers.get(event.type) ?? [];
        await Promise.all(handlers.map((h) => h(event)));
      },
      {
        connection: this.redisConnection,
        concurrency: 5,
      },
    );

    worker.on('failed', (job, err) => {
      console.error(`[EventBus] Job ${job?.id} failed:`, err.message);
    });

    this.workers.set(domain, worker);
  }

  async onModuleDestroy() {
    // Gracefully close all workers and queues
    const closePromises: Promise<void>[] = [];
    for (const worker of this.workers.values()) {
      closePromises.push(worker.close());
    }
    for (const queue of this.queues.values()) {
      closePromises.push(queue.close());
    }
    await Promise.all(closePromises);
  }
}
