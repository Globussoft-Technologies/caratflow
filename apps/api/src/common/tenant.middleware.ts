import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import * as jwt from 'jsonwebtoken';

export interface JwtPayload {
  sub: string; // userId
  tenantId: string;
  email: string;
  role: string;
  permissions: string[];
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      tenantId?: string;
      userId?: string;
      userRole?: string;
      userPermissions?: string[];
    }
  }
}

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  use(req: Request, _res: Response, next: NextFunction) {
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      try {
        const token = authHeader.slice(7);
        const secret = process.env.JWT_SECRET ?? 'dev-secret';
        const payload = jwt.verify(token, secret) as JwtPayload;
        req.tenantId = payload.tenantId;
        req.userId = payload.sub;
        req.userRole = payload.role;
        req.userPermissions = payload.permissions;
      } catch {
        // Token invalid -- let guards handle the 401
      }
    }
    next();
  }
}
