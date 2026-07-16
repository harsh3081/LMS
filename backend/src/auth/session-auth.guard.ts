import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SessionStore } from './session-store';
import { CAPABILITY_METADATA_KEY } from './require-capability.decorator';
import { SESSION_COOKIE_NAME } from './auth.controller';

/**
 * Single deny-by-default guard (tech-design.md Security / ADR-003):
 * - No/invalid session cookie -> 401 (EVAL-CC-06/07).
 * - Valid session but missing a route's required capability -> 403 (EVAL-CC-08).
 * Attaches the resolved Principal to the request for @Principal() to read.
 */
@Injectable()
export class SessionAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly sessionStore: SessionStore,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const token: string | undefined = request.cookies?.[SESSION_COOKIE_NAME];
    const principal = this.sessionStore.get(token);
    if (!principal) {
      throw new UnauthorizedException('Authentication required');
    }
    request.principal = principal;

    const requiredCapability = this.reflector.get<string | undefined>(CAPABILITY_METADATA_KEY, context.getHandler());
    if (requiredCapability && !principal.capabilities.includes(requiredCapability)) {
      throw new ForbiddenException(`Missing required capability: ${requiredCapability}`);
    }
    return true;
  }
}
