// ─── Pre-Order Module ─────────────────────────────────────────
// Pre-orders, backorders, made-to-order, order modifications,
// and one-click reorder functionality.

import { Module } from '@nestjs/common';
import { PreOrderService } from './preorder.service';
import { PreOrderConfigService } from './preorder.config.service';
import { OrderModificationService } from './order-modification.service';
import { ReorderService } from './reorder.service';
import { PreOrderController } from './preorder.controller';
import { PreOrderTrpcRouter } from './preorder.trpc';
import { PreOrderEventHandler } from './preorder.event-handler';

@Module({
  controllers: [PreOrderController],
  providers: [
    PreOrderService,
    PreOrderConfigService,
    OrderModificationService,
    ReorderService,
    PreOrderTrpcRouter,
    PreOrderEventHandler,
  ],
  exports: [
    PreOrderService,
    PreOrderConfigService,
    OrderModificationService,
    ReorderService,
    PreOrderTrpcRouter,
  ],
})
export class PreOrderModule {}
