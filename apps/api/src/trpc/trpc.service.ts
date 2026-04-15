import { Injectable } from '@nestjs/common';
import { initTRPC, TRPCError } from '@trpc/server';
import { z } from 'zod';

export interface TrpcContext {
  tenantId?: string;
  userId?: string;
  userRole?: string;
  userPermissions?: string[];
}

// Custom JSON transformer: serialize BigInt (paise/mg fields) as decimal
// strings so JSON.stringify doesn't throw "Do not know how to serialize
// a BigInt". Dates go through as ISO strings by default.
const bigIntTransformer = {
  input: {
    serialize: (obj: unknown) => obj,
    deserialize: (obj: unknown) => obj,
  },
  output: {
    serialize: (obj: unknown): unknown => {
      return JSON.parse(
        JSON.stringify(obj, (_k, v) => (typeof v === 'bigint' ? v.toString() : v)),
      );
    },
    deserialize: (obj: unknown) => obj,
  },
};

@Injectable()
export class TrpcService {
  private readonly t = initTRPC.context<TrpcContext>().create({
    transformer: bigIntTransformer,
  });

  get router() {
    return this.t.router;
  }

  get procedure() {
    return this.t.procedure;
  }

  get middleware() {
    return this.t.middleware;
  }

  get mergeRouters() {
    return this.t.mergeRouters;
  }

  /** Middleware that ensures user is authenticated */
  get authedProcedure() {
    return this.t.procedure.use(
      this.t.middleware(({ ctx, next }) => {
        if (!ctx.userId || !ctx.tenantId) {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Authentication required' });
        }
        return next({
          ctx: {
            ...ctx,
            tenantId: ctx.tenantId,
            userId: ctx.userId,
          },
        });
      }),
    );
  }
}
