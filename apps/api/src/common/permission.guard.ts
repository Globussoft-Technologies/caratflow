import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';

export const PERMISSION_KEY = 'required_permission';

/**
 * Decorator to require specific permission on a route.
 * Format: 'module.resource.action' (e.g., 'inventory.stock.read')
 * Use '*' for wildcard matching.
 */
export const RequirePermission = (...permissions: string[]) =>
  SetMetadata(PERMISSION_KEY, permissions);

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(PERMISSION_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // If no permissions are required, allow access (but user must be authenticated)
    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const { userId, userPermissions } = request;

    if (!userId) {
      throw new UnauthorizedException('Authentication required');
    }

    if (!userPermissions || userPermissions.length === 0) {
      throw new ForbiddenException('Insufficient permissions');
    }

    const hasPermission = requiredPermissions.every((required) =>
      this.matchPermission(userPermissions, required),
    );

    if (!hasPermission) {
      throw new ForbiddenException(
        `Missing required permission(s): ${requiredPermissions.join(', ')}`,
      );
    }

    return true;
  }

  private matchPermission(userPermissions: string[], required: string): boolean {
    return userPermissions.some((userPerm) => {
      // Exact match
      if (userPerm === required) return true;
      // Wildcard: '*' matches everything
      if (userPerm === '*') return true;
      // Partial wildcard: 'inventory.*' matches 'inventory.stock.read'
      if (userPerm.endsWith('.*')) {
        const prefix = userPerm.slice(0, -2);
        return required.startsWith(prefix);
      }
      // Permission array in JSON format: check if action is included
      // e.g., userPerm = 'inventory.stock' and required includes action
      return false;
    });
  }
}
