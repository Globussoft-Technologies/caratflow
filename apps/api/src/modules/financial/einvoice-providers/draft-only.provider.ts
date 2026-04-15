// ─── Draft-Only EInvoice Provider ──────────────────────────────
// Fallback provider for tenants without a configured GSP. Prepares the
// NIC-schema payload locally but does NOT submit it to any IRP.
// Returned IRN is null; status is 'DRAFT'.

import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import type {
  NicInvoicePayload,
  NicIrnResponse,
  NicCancelResponse,
  NicIrnDetails,
} from '@caratflow/shared-types';
import type { IEInvoiceProvider } from './einvoice-provider.interface';

@Injectable()
export class DraftOnlyEInvoiceProvider implements IEInvoiceProvider {
  public readonly name = 'draft-only';
  private readonly logger = new Logger(DraftOnlyEInvoiceProvider.name);

  async generateIrn(invoicePayload: NicInvoicePayload): Promise<NicIrnResponse> {
    this.logger.log(
      `DRAFT mode: preparing NIC payload for invoice ${invoicePayload.DocDtls.No} (no submission)`,
    );
    return {
      irn: null,
      ackNo: null,
      ackDate: null,
      signedInvoice: null,
      signedQrCode: null,
      status: 'DRAFT',
      rawPayload: invoicePayload,
    };
  }

  async cancelIrn(_irn: string, _reason: string, _remarks: string): Promise<NicCancelResponse> {
    throw new BadRequestException(
      'Cannot cancel an e-invoice in DRAFT mode: no GSP provider is configured.',
    );
  }

  async getIrnDetails(_irn: string): Promise<NicIrnDetails> {
    throw new BadRequestException(
      'Cannot fetch e-invoice status in DRAFT mode: no GSP provider is configured.',
    );
  }
}
