// ─── Hardware Integration Module ──────────────────────────────
// Hardware device management, RFID, barcode, weighing scale,
// label printing, customer display, and biometric integrations.

import { Module } from '@nestjs/common';
import { TrpcService } from '../../trpc/trpc.service';
import { HardwareDeviceService } from './hardware.device.service';
import { HardwareRfidService } from './hardware.rfid.service';
import { HardwareBarcodeService } from './hardware.barcode.service';
import { HardwareScaleService } from './hardware.scale.service';
import { HardwarePrinterService } from './hardware.printer.service';
import { HardwareDisplayService } from './hardware.display.service';
import { HardwareBiometricService } from './hardware.biometric.service';
import { HardwareGateway } from './hardware.gateway';
import { HardwareTrpcRouter } from './hardware.trpc';
import { HardwareController } from './hardware.controller';

@Module({
  controllers: [HardwareController],
  providers: [
    TrpcService,
    HardwareDeviceService,
    HardwareRfidService,
    HardwareBarcodeService,
    HardwareScaleService,
    HardwarePrinterService,
    HardwareDisplayService,
    HardwareBiometricService,
    HardwareGateway,
    HardwareTrpcRouter,
  ],
  exports: [
    HardwareDeviceService,
    HardwareRfidService,
    HardwareBarcodeService,
    HardwareScaleService,
    HardwarePrinterService,
    HardwareDisplayService,
    HardwareBiometricService,
    HardwareGateway,
    HardwareTrpcRouter,
  ],
})
export class HardwareModule {}
