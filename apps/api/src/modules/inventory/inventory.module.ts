// ─── Inventory Module ──────────────────────────────────────────
// Stock management, transfers, stock-takes, valuation, metal/stone
// inventory, batch/lot tracking, serial numbers.

import { Module } from '@nestjs/common';
import { TrpcService } from '../../trpc/trpc.service';
import { InventoryService } from './inventory.service';
import { InventoryValuationService } from './inventory.valuation.service';
import { InventoryTrpcRouter } from './inventory.trpc';
import { InventoryEventHandler } from './inventory.event-handler';

@Module({
  providers: [
    TrpcService,
    InventoryService,
    InventoryValuationService,
    InventoryTrpcRouter,
    InventoryEventHandler,
  ],
  exports: [InventoryService, InventoryValuationService, InventoryTrpcRouter],
})
export class InventoryModule {}
