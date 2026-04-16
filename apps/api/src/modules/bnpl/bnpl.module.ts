// ─── BNPL Module ──────────────────────────────────────────────
// Buy Now Pay Later, EMI plans, saved payment methods.

import { Module } from '@nestjs/common';
import { BnplService } from './bnpl.service';
import { BnplEmiService } from './bnpl.emi.service';
import { BnplSavedPaymentService } from './bnpl.saved-payment.service';
import { PaymentGatewayService } from './payment-gateway.service';
import { BnplController } from './bnpl.controller';
import { BnplTrpcRouter } from './bnpl.trpc';

@Module({
  controllers: [BnplController],
  providers: [
    BnplService,
    BnplEmiService,
    BnplSavedPaymentService,
    PaymentGatewayService,
    BnplTrpcRouter,
  ],
  exports: [
    BnplService,
    BnplEmiService,
    BnplSavedPaymentService,
    PaymentGatewayService,
    BnplTrpcRouter,
  ],
})
export class BnplModule {}
