import {
  Injectable,
  CanActivate,
  ExecutionContext,
  Optional,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import * as jwt from 'jsonwebtoken';
import type { B2CJwtPayload } from '@caratflow/shared-types';
import { AccessTokenDenylistService } from './access-token-denylist.service';

/**
 * Extend Express Request to include B2C customer fields.
 */
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      customerAuthId?: string;
      customerId?: string;
      b2cTenantId?: string;
      accessTokenJti?: string;
      accessTokenExp?: number;
    }
  }
}

/**
 * Guard that authenticates B2C customers.
 * Separate from JwtAuthGuard which handles admin users.
 *
 * Validates the JWT contains `type: 'b2c'` to prevent
 * admin tokens from being used on B2C endpoints and vice versa.
 */
@Injectable()
export class B2CAuthGuard implements CanActivate {
  private readonly jwtSecret: string;

  constructor(@Optional() private readonly denylist?: AccessTokenDenylistService) {
    this.jwtSecret = process.env.JWT_SECRET ?? 'dev-secret-change-me-in-production';
  }

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const authHeader = request.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Authentication required');
    }

    try {
      const token = authHeader.slice(7);
      const payload = jwt.verify(token, this.jwtSecret) as B2CJwtPayload & {
        jti?: string;
        exp?: number;
      };

      // Ensure this is a B2C token, not an admin token
      if (payload.type !== 'b2c') {
        throw new UnauthorizedException('Invalid token type for B2C endpoint');
      }

      if (!payload.sub || !payload.customerId || !payload.tenantId) {
        throw new UnauthorizedException('Malformed authentication token');
      }

      // Reject tokens revoked by logout / refresh-rotation (D-037).
      if (this.denylist?.isRevoked(payload.jti)) {
        throw new UnauthorizedException('Token has been revoked');
      }

      // Attach B2C-specific fields to the request
      request.customerAuthId = payload.sub;
      request.customerId = payload.customerId;
      request.b2cTenantId = payload.tenantId;
      request.accessTokenJti = payload.jti;
      request.accessTokenExp = payload.exp;

      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      throw new UnauthorizedException('Invalid or expired authentication token');
    }
  }
}
