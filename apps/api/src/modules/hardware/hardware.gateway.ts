// ─── Hardware Gateway (in-process pub/sub) ────────────────────
// The original implementation used socket.io / @nestjs/websockets,
// neither of which is installed in this environment. Rather than
// drag in a heavy WebSocket stack we expose a small in-process
// pub/sub used by the customer-facing display REST/SSE endpoints
// in HardwareController and by the various read services to fan
// out events to local subscribers (e.g. the CFD second screen).
//
// External consumers can subscribe via:
//   GET /api/v1/hardware/cfd/stream  (Server-Sent Events)
// and POS terminals push state via:
//   POST /api/v1/hardware/cfd/push

import { Injectable } from '@nestjs/common';
import { EventEmitter } from 'events';
import type { CfdSaleState } from '@caratflow/shared-types';

type CfdListener = (state: CfdSaleState) => void;

@Injectable()
export class HardwareGateway {
  /** Emits 'cfd:<tenantId>:<terminalId>' events with CfdSaleState payloads */
  private readonly bus = new EventEmitter();

  constructor() {
    // Allow many CFD subscribers per tenant
    this.bus.setMaxListeners(0);
  }

  /** POS pushes new sale state for a customer-facing display */
  pushCfdState(tenantId: string, state: CfdSaleState): void {
    const event = `cfd:${tenantId}:${state.terminalId}`;
    this.bus.emit(event, state);
    // Also emit a wildcard channel so a single CFD per tenant works
    this.bus.emit(`cfd:${tenantId}:*`, state);
  }

  /**
   * Subscribe to CFD updates. Pass `*` for terminalId to listen
   * to every terminal for the tenant.
   */
  subscribeCfd(
    tenantId: string,
    terminalId: string,
    listener: CfdListener,
  ): () => void {
    const event = `cfd:${tenantId}:${terminalId}`;
    this.bus.on(event, listener);
    return () => this.bus.off(event, listener);
  }
}
