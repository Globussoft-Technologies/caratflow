import { Injectable } from '@nestjs/common';
import { TrpcService } from './trpc.service';
import { InventoryTrpcRouter } from '../modules/inventory/inventory.trpc';
import { z } from 'zod';

@Injectable()
export class TrpcRouter {
  constructor(
    private readonly trpc: TrpcService,
    private readonly inventoryTrpc: InventoryTrpcRouter,
  ) {}

  get appRouter() {
    return this.trpc.router({
      // Health check
      health: this.trpc.procedure.query(() => ({
        status: 'ok',
        timestamp: new Date().toISOString(),
      })),

      // Inventory module (full implementation)
      inventory: this.inventoryTrpc.router,

      manufacturing: this.trpc.router({
        list: this.trpc.authedProcedure.query(() => ({ items: [], total: 0 })),
      }),

      financial: this.trpc.router({
        list: this.trpc.authedProcedure.query(() => ({ items: [], total: 0 })),
      }),

      retail: this.trpc.router({
        list: this.trpc.authedProcedure.query(() => ({ items: [], total: 0 })),
      }),

      crm: this.trpc.router({
        customers: this.trpc.router({
          list: this.trpc.authedProcedure.query(() => ({ items: [], total: 0 })),
        }),
      }),

      wholesale: this.trpc.router({
        list: this.trpc.authedProcedure.query(() => ({ items: [], total: 0 })),
      }),

      ecommerce: this.trpc.router({
        list: this.trpc.authedProcedure.query(() => ({ items: [], total: 0 })),
      }),

      compliance: this.trpc.router({
        list: this.trpc.authedProcedure.query(() => ({ items: [], total: 0 })),
      }),

      reporting: this.trpc.router({
        list: this.trpc.authedProcedure.query(() => ({ items: [], total: 0 })),
      }),

      platform: this.trpc.router({
        locations: this.trpc.authedProcedure.query(() => ({ items: [], total: 0 })),
        settings: this.trpc.authedProcedure.query(() => ({})),
      }),
    });
  }
}

export type AppRouter = TrpcRouter['appRouter'];
