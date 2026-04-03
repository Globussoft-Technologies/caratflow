import { Module } from '@nestjs/common';
import { TrpcService } from './trpc.service';
import { TrpcRouter } from './trpc.router';
import { TrpcController } from './trpc.controller';
import { InventoryModule } from '../modules/inventory/inventory.module';

@Module({
  imports: [InventoryModule],
  controllers: [TrpcController],
  providers: [TrpcService, TrpcRouter],
  exports: [TrpcService, TrpcRouter],
})
export class TrpcModule {}
