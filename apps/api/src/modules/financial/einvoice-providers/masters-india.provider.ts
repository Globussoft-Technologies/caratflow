// ─── Masters India EInvoice Provider ───────────────────────────
// Uses Masters India GSP sandbox (https://sandb-aspsdk.mastersindia.co)
// to submit invoices to the NIC IRP and retrieve IRN + signed QR code.
//
// Env vars (per-tenant config may override in future):
//   MASTERS_INDIA_BASE_URL     default: https://sandb-aspsdk.mastersindia.co
//   MASTERS_INDIA_USERNAME     Masters India ASP username
//   MASTERS_INDIA_PASSWORD     Masters India ASP password
//   MASTERS_INDIA_GSTIN        Seller GSTIN (Masters India scopes tokens per GSTIN)
//   MASTERS_INDIA_CLIENT_ID    Optional OAuth client id (sandbox shared)
//   MASTERS_INDIA_CLIENT_SECRET Optional OAuth client secret
//
// Uses native fetch (Node 20+). No external HTTP client dependency.

import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import type {
  NicInvoicePayload,
  NicIrnResponse,
  NicCancelResponse,
  NicIrnDetails,
} from '@caratflow/shared-types';
import type { IEInvoiceProvider } from './einvoice-provider.interface';

interface MastersIndiaAuthResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

interface MastersIndiaIrnResponse {
  results?: {
    message?: {
      Irn?: string;
      AckNo?: string | number;
      AckDt?: string;
      SignedInvoice?: string;
      SignedQRCode?: string;
    };
    error?: {
      error_cd?: string;
      message?: string;
    };
  };
  error?: {
    error_cd?: string;
    message?: string;
  };
}

interface MastersIndiaCancelResponse {
  results?: {
    message?: {
      Irn?: string;
      CancelDate?: string;
    };
    error?: { error_cd?: string; message?: string };
  };
}

interface MastersIndiaGetResponse {
  results?: {
    message?: {
      Irn?: string;
      AckNo?: string | number;
      AckDt?: string;
      Status?: string;
      SignedInvoice?: string;
      SignedQRCode?: string;
    };
  };
}

@Injectable()
export class MastersIndiaEInvoiceProvider implements IEInvoiceProvider {
  public readonly name = 'masters-india';
  private readonly logger = new Logger(MastersIndiaEInvoiceProvider.name);

  private cachedToken: { value: string; expiresAt: number } | null = null;

  private get baseUrl(): string {
    return (
      process.env.MASTERS_INDIA_BASE_URL?.replace(/\/$/, '') ??
      'https://sandb-aspsdk.mastersindia.co'
    );
  }

  private get gstin(): string {
    const gstin = process.env.MASTERS_INDIA_GSTIN;
    if (!gstin) {
      throw new InternalServerErrorException('MASTERS_INDIA_GSTIN env var is not configured');
    }
    return gstin;
  }

  /** Whether env vars are present. Used by the factory to decide which provider to wire. */
  static isConfigured(): boolean {
    return Boolean(
      process.env.MASTERS_INDIA_USERNAME &&
        process.env.MASTERS_INDIA_PASSWORD &&
        process.env.MASTERS_INDIA_GSTIN,
    );
  }

  // ─── Auth ─────────────────────────────────────────────────────

  private async authenticate(): Promise<string> {
    const now = Date.now();
    if (this.cachedToken && this.cachedToken.expiresAt > now + 30_000) {
      return this.cachedToken.value;
    }

    const username = process.env.MASTERS_INDIA_USERNAME;
    const password = process.env.MASTERS_INDIA_PASSWORD;
    if (!username || !password) {
      throw new InternalServerErrorException(
        'Masters India credentials not configured (MASTERS_INDIA_USERNAME / _PASSWORD)',
      );
    }

    const url = `${this.baseUrl}/auth/token`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username,
        password,
        client_id: process.env.MASTERS_INDIA_CLIENT_ID ?? 'caratflow-sandbox',
        client_secret: process.env.MASTERS_INDIA_CLIENT_SECRET ?? '',
        grant_type: 'password',
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new InternalServerErrorException(
        `Masters India auth failed: HTTP ${res.status} ${body}`,
      );
    }

    const json = (await res.json()) as MastersIndiaAuthResponse;
    const expiresIn = typeof json.expires_in === 'number' ? json.expires_in : 3600;
    this.cachedToken = {
      value: json.access_token,
      expiresAt: now + expiresIn * 1000,
    };
    return json.access_token;
  }

  private async authHeaders(): Promise<Record<string, string>> {
    const token = await this.authenticate();
    return {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      gstin: this.gstin,
    };
  }

  // ─── Generate IRN ─────────────────────────────────────────────

  async generateIrn(invoicePayload: NicInvoicePayload): Promise<NicIrnResponse> {
    const url = `${this.baseUrl}/einvoice/type/GENERATE/version/V1_03`;
    const headers = await this.authHeaders();

    this.logger.log(
      `Submitting invoice ${invoicePayload.DocDtls.No} to Masters India IRP`,
    );

    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(invoicePayload),
    });

    if (!res.ok) {
      const body = await res.text();
      this.logger.error(`Masters India HTTP ${res.status}: ${body}`);
      return {
        irn: null,
        ackNo: null,
        ackDate: null,
        signedInvoice: null,
        signedQrCode: null,
        status: 'ERROR',
        errorCode: `HTTP_${res.status}`,
        errorMessage: body.slice(0, 500),
        rawPayload: invoicePayload,
      };
    }

    const json = (await res.json()) as MastersIndiaIrnResponse;
    const err = json.results?.error ?? json.error;
    if (err) {
      return {
        irn: null,
        ackNo: null,
        ackDate: null,
        signedInvoice: null,
        signedQrCode: null,
        status: 'ERROR',
        errorCode: err.error_cd ?? 'UNKNOWN',
        errorMessage: err.message ?? 'Unknown IRP error',
        rawPayload: invoicePayload,
      };
    }

    const msg = json.results?.message ?? {};
    if (!msg.Irn) {
      return {
        irn: null,
        ackNo: null,
        ackDate: null,
        signedInvoice: null,
        signedQrCode: null,
        status: 'ERROR',
        errorCode: 'NO_IRN',
        errorMessage: 'IRP response did not include an IRN',
        rawPayload: invoicePayload,
      };
    }

    return {
      irn: msg.Irn,
      ackNo: msg.AckNo != null ? String(msg.AckNo) : null,
      ackDate: msg.AckDt ?? null,
      signedInvoice: msg.SignedInvoice ?? null,
      signedQrCode: msg.SignedQRCode ?? null,
      status: 'ACT',
      rawPayload: invoicePayload,
    };
  }

  // ─── Cancel IRN ───────────────────────────────────────────────

  async cancelIrn(irn: string, reason: string, remarks: string): Promise<NicCancelResponse> {
    const url = `${this.baseUrl}/einvoice/type/CANCEL/version/V1_03`;
    const headers = await this.authHeaders();

    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({ Irn: irn, CnlRsn: reason, CnlRem: remarks }),
    });

    if (!res.ok) {
      const body = await res.text();
      return {
        irn,
        cancelDate: '',
        status: 'ERROR',
        errorCode: `HTTP_${res.status}`,
        errorMessage: body.slice(0, 500),
      };
    }

    const json = (await res.json()) as MastersIndiaCancelResponse;
    const err = json.results?.error;
    if (err) {
      return {
        irn,
        cancelDate: '',
        status: 'ERROR',
        errorCode: err.error_cd ?? 'UNKNOWN',
        errorMessage: err.message ?? 'Cancel failed',
      };
    }

    return {
      irn: json.results?.message?.Irn ?? irn,
      cancelDate: json.results?.message?.CancelDate ?? new Date().toISOString(),
      status: 'CNL',
    };
  }

  // ─── Get Details ──────────────────────────────────────────────

  async getIrnDetails(irn: string): Promise<NicIrnDetails> {
    const url = `${this.baseUrl}/einvoice/type/GETIRNDETAILS/version/V1_03?irn=${encodeURIComponent(irn)}`;
    const headers = await this.authHeaders();

    const res = await fetch(url, { method: 'GET', headers });
    if (!res.ok) {
      throw new InternalServerErrorException(
        `Masters India get-IRN failed: HTTP ${res.status}`,
      );
    }

    const json = (await res.json()) as MastersIndiaGetResponse;
    const msg = json.results?.message;
    if (!msg?.Irn) {
      throw new InternalServerErrorException('IRP returned no details for IRN');
    }

    const statusRaw = (msg.Status ?? 'ACT').toUpperCase();
    const status = statusRaw === 'CNL' ? 'CNL' : 'ACT';

    return {
      irn: msg.Irn,
      ackNo: msg.AckNo != null ? String(msg.AckNo) : '',
      ackDate: msg.AckDt ?? '',
      status,
      signedInvoice: msg.SignedInvoice,
      signedQrCode: msg.SignedQRCode,
    };
  }
}
