// ─── Hardware tRPC Router ──────────────────────────────────────
// All tRPC procedures for the hardware integration module.

import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { TrpcService } from '../../trpc/trpc.service';
import { HardwareDeviceService } from './hardware.device.service';
import { HardwareRfidService } from './hardware.rfid.service';
import { HardwareBarcodeService } from './hardware.barcode.service';
import { HardwareScaleService } from './hardware.scale.service';
import { HardwarePrinterService } from './hardware.printer.service';
import { HardwareDisplayService } from './hardware.display.service';
import { HardwareBiometricService } from './hardware.biometric.service';
import {
  CreateDeviceConfigSchema,
  UpdateDeviceConfigSchema,
  DeviceListInputSchema,
  RfidScanResultSchema,
  RfidStockTakeInputSchema,
  RfidWriteRequestSchema,
  RfidAntiTheftCheckSchema,
  BarcodeGenerateRequestSchema,
  BarcodeBulkGenerateRequestSchema,
  WeightCaptureRequestSchema,
  WeightPricingRequestSchema,
  WeightToleranceCheckSchema,
  WeightReadingSchema,
  CreateLabelTemplateSchema,
  UpdateLabelTemplateSchema,
  PrintLabelRequestSchema,
  PrintBulkLabelRequestSchema,
  CustomerDisplayMessageSchema,
  BiometricEventSchema,
  BiometricAttendanceQuerySchema,
} from '@caratflow/shared-types';

@Injectable()
export class HardwareTrpcRouter {
  constructor(
    private readonly trpc: TrpcService,
    private readonly deviceService: HardwareDeviceService,
    private readonly rfidService: HardwareRfidService,
    private readonly barcodeService: HardwareBarcodeService,
    private readonly scaleService: HardwareScaleService,
    private readonly printerService: HardwarePrinterService,
    private readonly displayService: HardwareDisplayService,
    private readonly biometricService: HardwareBiometricService,
  ) {}

  get router() {
    return this.trpc.router({
      // ─── Device Management ──────────────────────────────────
      devices: this.trpc.router({
        list: this.trpc.authedProcedure
          .input(DeviceListInputSchema)
          .query(({ ctx, input }) =>
            this.deviceService.listDevices(ctx.tenantId, input),
          ),

        register: this.trpc.authedProcedure
          .input(CreateDeviceConfigSchema)
          .mutation(({ ctx, input }) =>
            this.deviceService.registerDevice(ctx.tenantId, ctx.userId, input),
          ),

        update: this.trpc.authedProcedure
          .input(z.object({ deviceId: z.string().uuid(), data: UpdateDeviceConfigSchema }))
          .mutation(({ ctx, input }) =>
            this.deviceService.updateDevice(ctx.tenantId, ctx.userId, input.deviceId, input.data),
          ),

        remove: this.trpc.authedProcedure
          .input(z.object({ deviceId: z.string().uuid() }))
          .mutation(({ ctx, input }) =>
            this.deviceService.removeDevice(ctx.tenantId, input.deviceId),
          ),

        getStatus: this.trpc.authedProcedure
          .input(z.object({ deviceId: z.string().uuid() }))
          .query(({ ctx, input }) =>
            this.deviceService.getDeviceStatus(ctx.tenantId, input.deviceId),
          ),

        getById: this.trpc.authedProcedure
          .input(z.object({ deviceId: z.string().uuid() }))
          .query(({ ctx, input }) =>
            this.deviceService.getDevice(ctx.tenantId, input.deviceId),
          ),
      }),

      // ─── RFID ───────────────────────────────────────────────
      rfid: this.trpc.router({
        processScans: this.trpc.authedProcedure
          .input(RfidScanResultSchema)
          .mutation(({ ctx, input }) =>
            this.rfidService.processScans(ctx.tenantId, input),
          ),

        lookupTag: this.trpc.authedProcedure
          .input(z.object({ epc: z.string().min(1) }))
          .query(({ ctx, input }) =>
            this.rfidService.lookupTag(ctx.tenantId, input.epc),
          ),

        stockTake: this.trpc.authedProcedure
          .input(RfidStockTakeInputSchema)
          .mutation(({ ctx, input }) =>
            this.rfidService.stockTake(ctx.tenantId, input),
          ),

        writeTag: this.trpc.authedProcedure
          .input(z.object({ serialNumberId: z.string().uuid(), data: RfidWriteRequestSchema }))
          .mutation(({ ctx, input }) =>
            this.rfidService.writeTag(ctx.tenantId, ctx.userId, input.serialNumberId, input.data),
          ),

        antiTheftCheck: this.trpc.authedProcedure
          .input(RfidAntiTheftCheckSchema)
          .query(({ ctx, input }) =>
            this.rfidService.antiTheftCheck(ctx.tenantId, input),
          ),
      }),

      // ─── Barcode ────────────────────────────────────────────
      barcode: this.trpc.router({
        lookup: this.trpc.authedProcedure
          .input(z.object({ barcode: z.string().min(1) }))
          .query(({ ctx, input }) =>
            this.barcodeService.lookup(ctx.tenantId, input.barcode),
          ),

        generate: this.trpc.authedProcedure
          .input(BarcodeGenerateRequestSchema)
          .mutation(({ ctx, input }) =>
            this.barcodeService.generate(ctx.tenantId, input),
          ),

        generateBulk: this.trpc.authedProcedure
          .input(BarcodeBulkGenerateRequestSchema)
          .mutation(({ ctx, input }) =>
            this.barcodeService.generateBulk(ctx.tenantId, input),
          ),
      }),

      // ─── Weighing Scale ─────────────────────────────────────
      scale: this.trpc.router({
        getReading: this.trpc.authedProcedure
          .input(z.object({ deviceId: z.string().uuid() }))
          .query(({ ctx, input }) =>
            this.scaleService.getLastReading(ctx.tenantId, input.deviceId),
          ),

        captureWeight: this.trpc.authedProcedure
          .input(WeightCaptureRequestSchema)
          .mutation(({ ctx, input }) =>
            this.scaleService.captureWeight(ctx.tenantId, input),
          ),

        tare: this.trpc.authedProcedure
          .input(z.object({
            deviceId: z.string().uuid(),
            tareWeightMg: z.number().int().nonnegative(),
          }))
          .mutation(({ ctx, input }) => {
            this.scaleService.setTare(ctx.tenantId, input.deviceId, input.tareWeightMg);
            return { success: true, tareWeightMg: input.tareWeightMg };
          }),

        clearTare: this.trpc.authedProcedure
          .input(z.object({ deviceId: z.string().uuid() }))
          .mutation(({ ctx, input }) => {
            this.scaleService.clearTare(ctx.tenantId, input.deviceId);
            return { success: true };
          }),

        calculatePrice: this.trpc.authedProcedure
          .input(WeightPricingRequestSchema)
          .query(({ input }) =>
            this.scaleService.calculateWeightPrice(input),
          ),

        checkTolerance: this.trpc.authedProcedure
          .input(WeightToleranceCheckSchema)
          .query(({ input }) =>
            this.scaleService.checkTolerance(input),
          ),

        processReading: this.trpc.authedProcedure
          .input(WeightReadingSchema)
          .mutation(({ ctx, input }) =>
            this.scaleService.processReading(ctx.tenantId, input),
          ),
      }),

      // ─── Label Printer ──────────────────────────────────────
      printer: this.trpc.router({
        templates: this.trpc.router({
          list: this.trpc.authedProcedure
            .query(({ ctx }) =>
              this.printerService.listTemplates(ctx.tenantId),
            ),

          create: this.trpc.authedProcedure
            .input(CreateLabelTemplateSchema)
            .mutation(({ ctx, input }) =>
              this.printerService.createTemplate(ctx.tenantId, ctx.userId, input),
            ),

          update: this.trpc.authedProcedure
            .input(z.object({ templateId: z.string().uuid(), data: UpdateLabelTemplateSchema }))
            .mutation(({ ctx, input }) =>
              this.printerService.updateTemplate(ctx.tenantId, ctx.userId, input.templateId, input.data),
            ),

          delete: this.trpc.authedProcedure
            .input(z.object({ templateId: z.string().uuid() }))
            .mutation(({ ctx, input }) =>
              this.printerService.deleteTemplate(ctx.tenantId, input.templateId),
            ),

          getById: this.trpc.authedProcedure
            .input(z.object({ templateId: z.string().uuid() }))
            .query(({ ctx, input }) =>
              this.printerService.getTemplate(ctx.tenantId, input.templateId),
            ),
        }),

        print: this.trpc.authedProcedure
          .input(PrintLabelRequestSchema)
          .mutation(({ ctx, input }) =>
            this.printerService.generatePrintData(ctx.tenantId, input),
          ),

        printBulk: this.trpc.authedProcedure
          .input(PrintBulkLabelRequestSchema)
          .mutation(({ ctx, input }) =>
            this.printerService.generateBulkPrintData(ctx.tenantId, input),
          ),

        preview: this.trpc.authedProcedure
          .input(z.object({
            templateId: z.string().uuid(),
            data: z.record(z.string()),
          }))
          .query(({ ctx, input }) =>
            this.printerService.preview(ctx.tenantId, input.templateId, input.data),
          ),

        jewelryLabel: this.trpc.authedProcedure
          .input(z.object({
            templateId: z.string().uuid(),
            productId: z.string().uuid(),
          }))
          .query(({ ctx, input }) =>
            this.printerService.generateJewelryLabel(ctx.tenantId, input.templateId, input.productId),
          ),
      }),

      // ─── Customer Display ───────────────────────────────────
      display: this.trpc.router({
        sendMessage: this.trpc.authedProcedure
          .input(CustomerDisplayMessageSchema)
          .mutation(({ ctx, input }) =>
            this.displayService.sendMessage(ctx.tenantId, input),
          ),

        clear: this.trpc.authedProcedure
          .input(z.object({ deviceId: z.string().uuid() }))
          .mutation(({ ctx, input }) =>
            this.displayService.clearDisplay(ctx.tenantId, input.deviceId),
          ),
      }),

      // ─── Biometric ──────────────────────────────────────────
      biometric: this.trpc.router({
        processEvent: this.trpc.authedProcedure
          .input(BiometricEventSchema)
          .mutation(({ ctx, input }) =>
            this.biometricService.processEvent(ctx.tenantId, input),
          ),

        getAttendance: this.trpc.authedProcedure
          .input(BiometricAttendanceQuerySchema)
          .query(({ ctx, input }) =>
            this.biometricService.getAttendance(ctx.tenantId, input),
          ),

        getSummary: this.trpc.authedProcedure
          .input(z.object({
            date: z.string(),
            deviceId: z.string().uuid().optional(),
          }))
          .query(({ ctx, input }) =>
            this.biometricService.getAttendanceSummary(ctx.tenantId, input.date, input.deviceId),
          ),
      }),
    });
  }
}
