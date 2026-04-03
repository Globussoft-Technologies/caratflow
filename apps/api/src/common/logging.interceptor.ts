import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { Request } from 'express';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<Request>();
    const { method, originalUrl } = req;
    const tenantId = req.tenantId ?? 'anonymous';
    const start = Date.now();

    return next.handle().pipe(
      tap(() => {
        const duration = Date.now() - start;
        const statusCode = context.switchToHttp().getResponse().statusCode;
        if (process.env.NODE_ENV === 'development') {
          console.warn(`[${tenantId}] ${method} ${originalUrl} ${statusCode} ${duration}ms`);
        }
      }),
    );
  }
}
