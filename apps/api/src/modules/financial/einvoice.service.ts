// ─── EInvoice Service ──────────────────────────────────────────
// Orchestrates NIC e-Invoice (IRP) integration:
//   - Fetches an Invoice + line items + customer + location from the DB
//   - Builds the NIC schema 1.1 payload
//   - Submits to the configured GSP provider (Masters India or draft-only)
//   - Persists IRN + signed QR back onto the Invoice row
//   - Emits `financial.einvoice.generated` on success
//
// NOTE on schema: the current Invoice model has no dedicated IRN columns, so
// e-invoice state is persisted inside the `notes` field as a JSON blob
// prefixed with `__einvoice__` (migrations can later promote this to first-
// class columns without changing this service's public surface).

import { Injectable, NotFoundException, BadRequestException, Inject, Optional } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { TenantAwareService } from '../../common/base.service';
import { PrismaService } from '../../common/prisma.service';
import { EventBusService } from '../../event-bus/event-bus.service';
import type { Prisma } from '@caratflow/db';
import type {
  NicInvoicePayload,
  NicIrnResponse,
  NicCancelResponse,
  NicIrnDetails,
  NicPartyDtls,
  NicItemDtls,
  NicValDtls,
} from '@caratflow/shared-types';
import {
  EINVOICE_PROVIDER,
  type IEInvoiceProvider,
} from './einvoice-providers/einvoice-provider.interface';
import { DraftOnlyEInvoiceProvider } from './einvoice-providers/draft-only.provider';
import { MastersIndiaEInvoiceProvider } from './einvoice-providers/masters-india.provider';

const EINVOICE_NOTE_MARKER = '__einvoice__:';

export interface StoredEInvoiceState {
  irn: string | null;
  ackNo: string | null;
  ackDate: string | null; // ISO
  signedQrCode: string | null;
  signedInvoice: string | null;
  status: 'DRAFT' | 'ACT' | 'CNL' | 'ERROR';
  provider: string;
  generatedAt: string; // ISO
  cancelledAt?: string;
  cancelReason?: string;
  cancelRemarks?: string;
  lastError?: string;
}

@Injectable()
export class EInvoiceService extends TenantAwareService {
  private readonly provider: IEInvoiceProvider;

  constructor(
    prisma: PrismaService,
    @Optional() @Inject(EINVOICE_PROVIDER) injectedProvider: IEInvoiceProvider | null,
    @Optional() private readonly eventBus?: EventBusService,
  ) {
    super(prisma);
    if (injectedProvider) {
      this.provider = injectedProvider;
    } else if (MastersIndiaEInvoiceProvider.isConfigured()) {
      this.provider = new MastersIndiaEInvoiceProvider();
    } else {
      this.provider = new DraftOnlyEInvoiceProvider();
    }
  }

  /** Exposed for tests / diagnostics. */
  getProviderName(): string {
    return this.provider.name;
  }

  // ─── Payload Preparation ──────────────────────────────────────

  async prepareInvoicePayload(tenantId: string, invoiceId: string): Promise<NicInvoicePayload> {
    const invoice = await this.prisma.invoice.findFirst({
      where: this.tenantWhere(tenantId, { id: invoiceId }) as Prisma.InvoiceWhereInput,
      include: {
        lineItems: true,
        customer: true,
        location: true,
      },
    });
    if (!invoice) throw new NotFoundException('Invoice not found');
    if (!invoice.lineItems || invoice.lineItems.length === 0) {
      throw new BadRequestException('Invoice has no line items to e-invoice');
    }

    // Pull seller GSTIN/address from tenant settings (or fall back to env).
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });
    const tenantSettings = (tenant?.settings as Record<string, unknown> | null) ?? {};
    const sellerCfg = (tenantSettings.einvoiceSeller as Record<string, string> | undefined) ?? {};

    const sellerGstin = sellerCfg.gstin ?? process.env.MASTERS_INDIA_GSTIN ?? '';
    if (!sellerGstin) {
      throw new BadRequestException(
        'Seller GSTIN not configured (tenant.settings.einvoiceSeller.gstin or MASTERS_INDIA_GSTIN)',
      );
    }

    const seller: NicPartyDtls = {
      Gstin: sellerGstin,
      LglNm: sellerCfg.legalName ?? tenant?.name ?? 'Unknown Seller',
      TrdNm: sellerCfg.tradeName ?? tenant?.name ?? undefined,
      Addr1: sellerCfg.addr1 ?? invoice.location.address ?? 'NA',
      Addr2: sellerCfg.addr2,
      Loc: sellerCfg.city ?? invoice.location.city ?? 'NA',
      Pin: Number(sellerCfg.pin ?? invoice.location.postalCode ?? '000000'),
      Stcd: sellerCfg.stateCode ?? this.stateCode(invoice.location.state) ?? '00',
      Ph: invoice.location.phone ?? undefined,
      Em: invoice.location.email ?? undefined,
    };

    const cust = invoice.customer;
    const buyerGstin = cust?.gstinNumber ?? 'URP'; // URP = Unregistered Person
    const buyer: NicPartyDtls = {
      Gstin: buyerGstin,
      LglNm: cust ? `${cust.firstName} ${cust.lastName}`.trim() : 'Walk-in Customer',
      Addr1: cust?.address ?? 'NA',
      Loc: cust?.city ?? 'NA',
      Pin: Number(cust?.postalCode ?? '000000'),
      Stcd: this.stateCode(cust?.state) ?? '00',
      Ph: cust?.phone ?? undefined,
      Em: cust?.email ?? undefined,
    };

    // Items — convert paise -> rupees (2 decimals) per NIC schema.
    const toRupees = (p: bigint | number): number =>
      Math.round(Number(p)) / 100;

    const items: NicItemDtls[] = invoice.lineItems.map((li, idx) => {
      const gstPercent = li.gstRate / 100; // stored as percent*100
      const assAmt = toRupees(li.taxableAmountPaise);
      return {
        SlNo: String(idx + 1),
        PrdDesc: li.description,
        IsServc: 'N',
        HsnCd: li.hsnCode,
        Qty: li.quantity,
        Unit: 'PCS',
        UnitPrice: toRupees(li.unitPricePaise),
        TotAmt: toRupees(BigInt(li.unitPricePaise) * BigInt(li.quantity)),
        Discount: toRupees(li.discountPaise),
        AssAmt: assAmt,
        GstRt: gstPercent,
        IgstAmt: toRupees(li.igstPaise),
        CgstAmt: toRupees(li.cgstPaise),
        SgstAmt: toRupees(li.sgstPaise),
        CesRt: 0,
        CesAmt: 0,
        CesNonAdvlAmt: 0,
        StateCesRt: 0,
        StateCesAmt: 0,
        StateCesNonAdvlAmt: 0,
        OthChrg: 0,
        TotItemVal: toRupees(li.totalPaise),
      };
    });

    const valDtls: NicValDtls = {
      AssVal: items.reduce((s, i) => s + i.AssAmt, 0),
      CgstVal: items.reduce((s, i) => s + i.CgstAmt, 0),
      SgstVal: items.reduce((s, i) => s + i.SgstAmt, 0),
      IgstVal: items.reduce((s, i) => s + i.IgstAmt, 0),
      CesVal: 0,
      StCesVal: 0,
      Discount: toRupees(invoice.discountPaise),
      OthChrg: 0,
      RndOffAmt: 0,
      TotInvVal: toRupees(invoice.totalPaise),
    };

    // Map CaratFlow invoice type -> NIC DocDtls.Typ
    const docTyp: 'INV' | 'CRN' | 'DBN' =
      invoice.invoiceType === 'CREDIT_NOTE'
        ? 'CRN'
        : invoice.invoiceType === 'DEBIT_NOTE'
          ? 'DBN'
          : 'INV';

    // Inter-state vs intra-state drives SupTyp B2B/B2C selection.
    const supTyp: 'B2B' | 'B2C' = buyerGstin && buyerGstin !== 'URP' ? 'B2B' : 'B2C';

    const payload: NicInvoicePayload = {
      Version: '1.1',
      TranDtls: {
        TaxSch: 'GST',
        SupTyp: supTyp,
        RegRev: 'N',
        IgstOnIntra: 'N',
      },
      DocDtls: {
        Typ: docTyp,
        No: invoice.invoiceNumber,
        Dt: this.formatNicDate(invoice.createdAt),
      },
      SellerDtls: seller,
      BuyerDtls: buyer,
      ItemList: items,
      ValDtls: valDtls,
    };

    return payload;
  }

  // ─── Submit to IRP ────────────────────────────────────────────

  async submitToIrp(tenantId: string, invoiceId: string): Promise<NicIrnResponse> {
    const existing = await this.readEInvoiceState(tenantId, invoiceId);
    if (existing && existing.status === 'ACT' && existing.irn) {
      throw new BadRequestException(
        `Invoice already has an active IRN (${existing.irn}); cancel it before re-submitting`,
      );
    }

    const payload = await this.prepareInvoicePayload(tenantId, invoiceId);
    const response = await this.provider.generateIrn(payload);

    const state: StoredEInvoiceState = {
      irn: response.irn,
      ackNo: response.ackNo,
      ackDate: response.ackDate,
      signedQrCode: response.signedQrCode,
      signedInvoice: response.signedInvoice,
      status: response.status,
      provider: this.provider.name,
      generatedAt: new Date().toISOString(),
      lastError: response.errorMessage,
    };

    await this.writeEInvoiceState(tenantId, invoiceId, state);

    if (response.status === 'ACT' && response.irn) {
      // Cast: `financial.einvoice.generated` is a new event type not yet in
      // the shared-types DomainEvent union — emitting via a loose cast avoids
      // a cross-module edit while still flowing through the same bus.
      await this.eventBus?.publish({
        id: uuidv4(),
        tenantId,
        timestamp: new Date().toISOString(),
        type: 'financial.einvoice.generated',
        payload: {
          invoiceId,
          irn: response.irn,
          ackNo: response.ackNo,
          ackDate: response.ackDate,
          provider: this.provider.name,
        },
      } as unknown as Parameters<EventBusService['publish']>[0]);
    }

    return response;
  }

  // ─── Cancel ───────────────────────────────────────────────────

  async cancelEInvoice(
    tenantId: string,
    invoiceId: string,
    reason: string,
    remarks: string,
  ): Promise<NicCancelResponse> {
    const state = await this.readEInvoiceState(tenantId, invoiceId);
    if (!state || !state.irn || state.status !== 'ACT') {
      throw new BadRequestException('Invoice has no active IRN to cancel');
    }

    // NIC rule: cancellation only allowed within 24h of generation.
    const generatedAt = new Date(state.generatedAt).getTime();
    const ageMs = Date.now() - generatedAt;
    if (ageMs > 24 * 60 * 60 * 1000) {
      throw new BadRequestException(
        'E-invoice cancellation window (24 hours) has expired; issue a credit note instead',
      );
    }

    const response = await this.provider.cancelIrn(state.irn, reason, remarks);

    if (response.status === 'CNL') {
      await this.writeEInvoiceState(tenantId, invoiceId, {
        ...state,
        status: 'CNL',
        cancelledAt: response.cancelDate || new Date().toISOString(),
        cancelReason: reason,
        cancelRemarks: remarks,
      });
    }

    return response;
  }

  // ─── Status ───────────────────────────────────────────────────

  async getEInvoiceStatus(tenantId: string, invoiceId: string): Promise<NicIrnDetails | StoredEInvoiceState> {
    const state = await this.readEInvoiceState(tenantId, invoiceId);
    if (!state) {
      throw new NotFoundException('No e-invoice record for this invoice');
    }
    if (!state.irn) {
      return state; // Draft / error — no remote details to fetch.
    }
    try {
      return await this.provider.getIrnDetails(state.irn);
    } catch {
      return state;
    }
  }

  // ─── Persistence helpers (notes-field workaround) ─────────────

  private async readEInvoiceState(
    tenantId: string,
    invoiceId: string,
  ): Promise<StoredEInvoiceState | null> {
    const invoice = await this.prisma.invoice.findFirst({
      where: this.tenantWhere(tenantId, { id: invoiceId }) as Prisma.InvoiceWhereInput,
      select: { notes: true },
    });
    if (!invoice) throw new NotFoundException('Invoice not found');
    return this.parseNotes(invoice.notes);
  }

  private async writeEInvoiceState(
    tenantId: string,
    invoiceId: string,
    state: StoredEInvoiceState,
  ): Promise<void> {
    const invoice = await this.prisma.invoice.findFirst({
      where: this.tenantWhere(tenantId, { id: invoiceId }) as Prisma.InvoiceWhereInput,
      select: { notes: true },
    });
    if (!invoice) throw new NotFoundException('Invoice not found');

    const humanNotes = this.stripEInvoiceBlock(invoice.notes ?? '');
    const serialized = `${EINVOICE_NOTE_MARKER}${JSON.stringify(state)}`;
    const combined = humanNotes ? `${humanNotes}\n${serialized}` : serialized;

    await this.prisma.invoice.update({
      where: { id: invoiceId },
      data: { notes: combined },
    });
  }

  private parseNotes(notes: string | null | undefined): StoredEInvoiceState | null {
    if (!notes) return null;
    const lines = notes.split('\n');
    for (const line of lines) {
      if (line.startsWith(EINVOICE_NOTE_MARKER)) {
        try {
          return JSON.parse(line.slice(EINVOICE_NOTE_MARKER.length)) as StoredEInvoiceState;
        } catch {
          return null;
        }
      }
    }
    return null;
  }

  private stripEInvoiceBlock(notes: string): string {
    return notes
      .split('\n')
      .filter((l) => !l.startsWith(EINVOICE_NOTE_MARKER))
      .join('\n')
      .trim();
  }

  // ─── Helpers ──────────────────────────────────────────────────

  private formatNicDate(d: Date): string {
    const dd = String(d.getUTCDate()).padStart(2, '0');
    const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
    const yyyy = d.getUTCFullYear();
    return `${dd}/${mm}/${yyyy}`;
  }

  /** Minimal Indian state -> 2-digit state code lookup (GSTIN prefix). */
  private stateCode(state: string | null | undefined): string | null {
    if (!state) return null;
    const map: Record<string, string> = {
      'JAMMU AND KASHMIR': '01',
      'HIMACHAL PRADESH': '02',
      PUNJAB: '03',
      CHANDIGARH: '04',
      UTTARAKHAND: '05',
      HARYANA: '06',
      DELHI: '07',
      RAJASTHAN: '08',
      'UTTAR PRADESH': '09',
      BIHAR: '10',
      SIKKIM: '11',
      'ARUNACHAL PRADESH': '12',
      NAGALAND: '13',
      MANIPUR: '14',
      MIZORAM: '15',
      TRIPURA: '16',
      MEGHALAYA: '17',
      ASSAM: '18',
      'WEST BENGAL': '19',
      JHARKHAND: '20',
      ODISHA: '21',
      CHHATTISGARH: '22',
      'MADHYA PRADESH': '23',
      GUJARAT: '24',
      MAHARASHTRA: '27',
      KARNATAKA: '29',
      GOA: '30',
      KERALA: '32',
      'TAMIL NADU': '33',
      PUDUCHERRY: '34',
      TELANGANA: '36',
      'ANDHRA PRADESH': '37',
    };
    return map[state.toUpperCase()] ?? null;
  }
}
