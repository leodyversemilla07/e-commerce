import { UnauthorizedException, type ExecutionContext } from '@nestjs/common';
import { AdminApiGuard } from './admin-api.guard';

function context(key?: string): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => ({ header: () => key }) }),
  } as unknown as ExecutionContext;
}

describe('AdminApiGuard', () => {
  const original = process.env.ADMIN_API_SECRET;
  const secret = 'a-secure-server-to-server-key-over-32-characters';
  afterAll(() => {
    if (original === undefined) Reflect.deleteProperty(process.env, 'ADMIN_API_SECRET');
    else process.env.ADMIN_API_SECRET = original;
  });

  it('rejects requests without a configured key', () => {
    Reflect.deleteProperty(process.env, 'ADMIN_API_SECRET');
    expect(() => new AdminApiGuard().canActivate(context(secret))).toThrow(UnauthorizedException);
  });

  it('rejects unauthenticated and invalid keys', () => {
    process.env.ADMIN_API_SECRET = secret;
    expect(() => new AdminApiGuard().canActivate(context())).toThrow(UnauthorizedException);
    expect(() => new AdminApiGuard().canActivate(context('wrong'))).toThrow(UnauthorizedException);
  });

  it('permits the configured server key', () => {
    process.env.ADMIN_API_SECRET = secret;
    expect(new AdminApiGuard().canActivate(context(secret))).toBe(true);
  });
});
