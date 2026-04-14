// ─── Hardware REST Controller ─────────────────────────────────
// REST endpoints exposed under /api/v1/hardware/* for things
// that don't fit the tRPC pattern (raw biometric webhook payloads
// from third-party terminals, on-demand scale reads, label print
// command download, customer-facing display SSE stream).

import {
  Controller,
  Get,
  Post,
  Body,
  Req,
  Res,
  Query,
  HttpCode,
  HttpStatus,
  BadRequestException,
  Sse,
  MessageEvent,
} from '@nestjs/common';
import { Observable, fromEvent, map, takeUntil, Subject, merge, of } from 'rxjs';
import type { Request, Response } from 'express';
import { HardwareScaleService } from './hardware.scale.service';
import { HardwareBarcodeService } from './hardware.barcode.service';
import { HardwarePrinterService } from './hardware.printer.service';
import { HardwareBiometricService } from './hardware.biometric.service';
import { HardwareGateway } from './hardware.gateway';
import {
  ScaleReadRequestSchema,
  CfdSaleStateSchema,
  BiometricWebhookPayloadSchema,
} from '@caratflow/shared-types';
import type {
  ApiResponse,
  ScaleReadRequest,
  WeightReading,
  BarcodeProductLookup,
  LabelPrintCommandResponse,
  CfdSaleState,
  BiometricEventResponse,
  BiometricWebhookPayload,
} from '@caratflow/shared-types';
import { z } from 'zod';

interface AuthenticatedRequest extends Request {
  tenantId?: string;
  userId?: string;
}

function ok<T>(data: T): ApiResponse<T> {
  return { success: true, data };
}

function getTenantId(req: AuthenticatedRequest): string {
  const tenantId =
    req.tenantId ??
    (req.headers['x-tenant-id'] as string | undefined) ??
    undefined;
  if (!tenantId) throw new BadRequestException('Missing tenant context');
  return tenantId;
}

const PrintLabelBodySchema = z.object({
  productId: z.string().uuid(),
  templateId: z.string().uuid(),
  copies: z.number().int().min(1).max(100).default(1),
  language: z.enum(['ZPL', 'TSPL']).default('ZPL'),
});

const BarcodeLookupBodySchema = z.object({
  barcode: z.string().min(1),
});

@Controller('api/v1/hardware')
export class HardwareController {
  constructor(
    private readonly scaleService: HardwareScaleService,
    private readonly barcodeService: HardwareBarcodeService,
    private readonly printerService: HardwarePrinterService,
    private readonly biometricService: HardwareBiometricService,
    private readonly gateway: HardwareGateway,
  ) {}

  // ─── Scale ────────────────────────────────────────────────

  /**
   * POST /api/v1/hardware/scale/read
   * Trigger an on-demand read from a registered scale device.
   * Returns the most recent stable reading.
   */
  @Post('scale/read')
  @HttpCode(HttpStatus.OK)
  async scaleRead(
    @Req() req: AuthenticatedRequest,
    @Body() body: unknown,
  ): Promise<ApiResponse<WeightReading>> {
    const tenantId = getTenantId(req);
    const input: ScaleReadRequest = ScaleReadRequestSchema.parse(body);
    const reading = await this.scaleService.readNow(tenantId, input);
    return ok(reading);
  }

  // ─── Barcode ──────────────────────────────────────────────

  /**
   * POST /api/v1/hardware/barcode/lookup
   * Validate a scanned barcode and resolve it to a product.
   */
  @Post('barcode/lookup')
  @HttpCode(HttpStatus.OK)
  async barcodeLookup(
    @Req() req: AuthenticatedRequest,
    @Body() body: unknown,
  ): Promise<ApiResponse<BarcodeProductLookup>> {
    const tenantId = getTenantId(req);
    const { barcode } = BarcodeLookupBodySchema.parse(body);
    const lookup = await this.barcodeService.lookup(tenantId, barcode);
    return ok(lookup);
  }

  // ─── Label Printer ────────────────────────────────────────

  /**
   * POST /api/v1/hardware/label/print
   * Render a jewelry label for a product and return the raw
   * printer command stream (ZPL or TSPL) for the local print
   * agent to send to the device.
   */
  @Post('label/print')
  @HttpCode(HttpStatus.OK)
  async labelPrint(
    @Req() req: AuthenticatedRequest,
    @Body() body: unknown,
  ): Promise<ApiResponse<LabelPrintCommandResponse>> {
    const tenantId = getTenantId(req);
    const input = PrintLabelBodySchema.parse(body);
    const cmd = await this.printerService.printJewelryLabel(
      tenantId,
      input.templateId,
      input.productId,
      input.copies,
      input.language,
    );
    return ok(cmd);
  }

  // ─── Customer-Facing Display ──────────────────────────────

  /**
   * POST /api/v1/hardware/cfd/push
   * POS terminal pushes the current sale state for the
   * customer-facing second screen.
   */
  @Post('cfd/push')
  @HttpCode(HttpStatus.OK)
  async cfdPush(
    @Req() req: AuthenticatedRequest,
    @Body() body: unknown,
  ): Promise<ApiResponse<{ pushed: true }>> {
    const tenantId = getTenantId(req);
    const state: CfdSaleState = CfdSaleStateSchema.parse(body);
    this.gateway.pushCfdState(tenantId, state);
    return ok({ pushed: true });
  }

  /**
   * GET /api/v1/hardware/cfd/stream?terminalId=...
   * Server-Sent Events stream for the customer-facing display.
   * The second-screen client subscribes here and receives every
   * new sale state pushed by the matching POS terminal.
   */
  @Sse('cfd/stream')
  cfdStream(
    @Req() req: AuthenticatedRequest,
    @Query('terminalId') terminalId: string,
  ): Observable<MessageEvent> {
    const tenantId = getTenantId(req);
    if (!terminalId) {
      throw new BadRequestException('terminalId query parameter is required');
    }

    const stop$ = new Subject<void>();
    const stateSubject = new Subject<CfdSaleState>();
    const off = this.gateway.subscribeCfd(tenantId, terminalId, (state) => {
      stateSubject.next(state);
    });

    // Clean up when the client disconnects
    req.on('close', () => {
      off();
      stop$.next();
      stop$.complete();
      stateSubject.complete();
    });

    // Send an initial keep-alive frame so the client knows it's connected
    const initial: MessageEvent = { data: { type: 'connected', terminalId } };
    return merge(of(initial), stateSubject.pipe(map((state): MessageEvent => ({ data: state })))).pipe(
      takeUntil(stop$),
    );
  }

  // ─── Biometric Webhook ────────────────────────────────────

  /**
   * POST /api/v1/hardware/biometric/webhook
   * Endpoint hit by ZKTeco / ESSL terminals when an employee
   * checks in or out. The terminal must include `x-tenant-id` so
   * that we can scope the event correctly.
   */
  @Post('biometric/webhook')
  @HttpCode(HttpStatus.OK)
  async biometricWebhook(
    @Req() req: AuthenticatedRequest,
    @Body() body: unknown,
  ): Promise<ApiResponse<BiometricEventResponse>> {
    const tenantId = getTenantId(req);
    const payload: BiometricWebhookPayload = BiometricWebhookPayloadSchema.parse(body);
    const event = await this.biometricService.processWebhook(tenantId, payload);
    return ok(event);
  }
}
