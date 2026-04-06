import { Injectable } from '@nestjs/common';
import { TrpcService } from './trpc.service';
import { InventoryTrpcRouter } from '../modules/inventory/inventory.trpc';
import { CmsTrpcRouter } from '../modules/cms/cms.trpc';
import { ReferralTrpcRouter } from '../modules/referral/referral.trpc';
import { AmlTrpcRouter } from '../modules/aml/aml.trpc';
import { PreOrderTrpcRouter } from '../modules/preorder/preorder.trpc';
import { SearchTrpcRouter } from '../modules/search/search.trpc';
import { z } from 'zod';

@Injectable()
export class TrpcRouter {
  constructor(
    private readonly trpc: TrpcService,
    private readonly inventoryTrpc: InventoryTrpcRouter,
    private readonly cmsTrpc: CmsTrpcRouter,
    private readonly referralTrpc: ReferralTrpcRouter,
    private readonly amlTrpc: AmlTrpcRouter,
    private readonly preOrderTrpc: PreOrderTrpcRouter,
    private readonly searchTrpc: SearchTrpcRouter,
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

      // CMS module (full implementation)
      cms: this.cmsTrpc.router,

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

      // Referral rewards program
      referral: this.referralTrpc.router,

      // AML compliance monitoring
      aml: this.amlTrpc.router,

      // Pre-order, backorder, modifications, reorder
      preorder: this.preOrderTrpc.router,

      // Search: synonyms, suggestions, analytics, reindex
      search: this.searchTrpc.router,
    });
  }
}

export type AppRouter = TrpcRouter['appRouter'];
