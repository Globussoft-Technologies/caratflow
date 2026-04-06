import { Module } from '@nestjs/common';
import { TrpcService } from './trpc.service';
import { TrpcRouter } from './trpc.router';
import { TrpcController } from './trpc.controller';
import { InventoryModule } from '../modules/inventory/inventory.module';
import { CmsModule } from '../modules/cms/cms.module';
import { ReferralModule } from '../modules/referral/referral.module';
import { AmlModule } from '../modules/aml/aml.module';
import { PreOrderModule } from '../modules/preorder/preorder.module';
import { SearchModule } from '../modules/search/search.module';

@Module({
  imports: [InventoryModule, CmsModule, ReferralModule, AmlModule, PreOrderModule, SearchModule],
  controllers: [TrpcController],
  providers: [TrpcService, TrpcRouter],
  exports: [TrpcService, TrpcRouter],
})
export class TrpcModule {}
