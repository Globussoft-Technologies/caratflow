// ─── Wholesale Module ──────────────────────────────────────────
// Purchase orders, consignments (in/out), goods receipts,
// agents/brokers, credit limits, outstanding balances, rate contracts.

import { Module } from '@nestjs/common';
import { WholesaleService } from './wholesale.service';
import { WholesaleConsignmentService } from './wholesale.consignment.service';
import { WholesaleAgentService } from './wholesale.agent.service';
import { WholesaleCreditService } from './wholesale.credit.service';
import { WholesaleRateContractService } from './wholesale.rate-contract.service';
import { WholesaleTrpcRouter } from './wholesale.trpc';
import { WholesaleEventHandler } from './wholesale.event-handler';

@Module({
  controllers: [],
  providers: [
    WholesaleService,
    WholesaleConsignmentService,
    WholesaleAgentService,
    WholesaleCreditService,
    WholesaleRateContractService,
    WholesaleTrpcRouter,
    WholesaleEventHandler,
  ],
  exports: [
    WholesaleService,
    WholesaleConsignmentService,
    WholesaleAgentService,
    WholesaleCreditService,
    WholesaleRateContractService,
    WholesaleTrpcRouter,
  ],
})
export class WholesaleModule {}
