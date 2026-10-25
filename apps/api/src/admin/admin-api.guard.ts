import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { timingSafeEqual } from 'node:crypto';
import type { Request } from 'express';

@Injectable()
export class AdminApiGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const expected = process.env.ADMIN_API_SECRET;
    if (!expected || expected.length < 32) throw new UnauthorizedException('Admin API is not configured');

    const supplied = context.switchToHttp().getRequest<Request>().header('x-admin-api-key');
    const a = Buffer.from(supplied ?? '');
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      throw new UnauthorizedException();
    }
    return true;
  }
}
