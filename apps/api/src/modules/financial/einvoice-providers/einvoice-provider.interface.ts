// ─── EInvoice Provider Interface ───────────────────────────────
// Abstracts the NIC IRP (GST e-Invoice portal) interaction so CaratFlow
// can plug in different GSP (GST Suvidha Provider) implementations.
// Default providers: Masters India (real sandbox) and DraftOnly (fallback).

import type {
  NicInvoicePayload,
  NicIrnResponse,
  NicCancelResponse,
  NicIrnDetails,
} from '@caratflow/shared-types';

export const EINVOICE_PROVIDER = Symbol('EINVOICE_PROVIDER');

export interface IEInvoiceProvider {
  /** Provider identifier, e.g. "masters-india", "draft-only" */
  readonly name: string;

  /** Submit the NIC-schema invoice payload to the IRP and return IRN + signed QR. */
  generateIrn(invoicePayload: NicInvoicePayload): Promise<NicIrnResponse>;

  /** Cancel a previously-generated IRN. Only allowed within 24h per NIC rules. */
  cancelIrn(irn: string, reason: string, remarks: string): Promise<NicCancelResponse>;

  /** Fetch latest IRN status/details from the IRP. */
  getIrnDetails(irn: string): Promise<NicIrnDetails>;
}

/** NIC-standard cancel reason codes. */
export const NIC_CANCEL_REASONS = {
  DUPLICATE: '1',
  DATA_ENTRY_MISTAKE: '2',
  ORDER_CANCELLED: '3',
  OTHER: '4',
} as const;

export type NicCancelReasonCode = (typeof NIC_CANCEL_REASONS)[keyof typeof NIC_CANCEL_REASONS];
