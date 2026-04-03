import { Controller, All, Req, Res } from '@nestjs/common';
import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import { Request, Response } from 'express';
import { TrpcRouter } from './trpc.router';
import type { TrpcContext } from './trpc.service';

@Controller('trpc')
export class TrpcController {
  constructor(private readonly trpcRouter: TrpcRouter) {}

  @All('*')
  async handleTrpc(@Req() req: Request, @Res() res: Response) {
    // Build the context from the already-processed middleware
    const context: TrpcContext = {
      tenantId: req.tenantId,
      userId: req.userId,
      userRole: req.userRole,
      userPermissions: req.userPermissions,
    };

    // Convert Express request to Fetch API Request
    const protocol = req.protocol;
    const host = req.get('host') ?? 'localhost:4000';
    const url = `${protocol}://${host}${req.originalUrl}`;

    const headers = new Headers();
    for (const [key, value] of Object.entries(req.headers)) {
      if (typeof value === 'string') {
        headers.set(key, value);
      }
    }

    const fetchReq = new globalThis.Request(url, {
      method: req.method,
      headers,
      body: ['GET', 'HEAD'].includes(req.method) ? undefined : JSON.stringify(req.body),
    });

    const fetchRes = await fetchRequestHandler({
      endpoint: '/trpc',
      req: fetchReq,
      router: this.trpcRouter.appRouter,
      createContext: () => context,
    });

    // Send the response back via Express
    res.status(fetchRes.status);
    fetchRes.headers.forEach((value, key) => {
      res.setHeader(key, value);
    });
    const body = await fetchRes.text();
    res.send(body);
  }
}
