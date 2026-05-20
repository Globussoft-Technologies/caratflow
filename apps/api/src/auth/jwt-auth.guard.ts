import {
  Injectable,
  CanActivate,
  ExecutionContext,
  Optional,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { AccessTokenDenylistService } from './access-token-denylist.service';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(@Optional() private readonly denylist?: AccessTokenDenylistService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();

    if (!request.userId || !request.tenantId) {
      throw new UnauthorizedException('Authentication required');
    }

    // TenantMiddleware decoded the JWT and attached jti/exp. Reject tokens
    // revoked by logout / refresh-rotation (D-037).
    if (this.denylist?.isRevoked(request.accessTokenJti)) {
      throw new UnauthorizedException('Token has been revoked');
    }

    return true;
  }
}
