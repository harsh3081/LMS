import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Principal } from '../common/principal';

/** Reads the Principal attached by SessionAuthGuard onto the request. */
export const CurrentPrincipal = createParamDecorator((_data: unknown, ctx: ExecutionContext): Principal => {
  const request = ctx.switchToHttp().getRequest();
  return request.principal;
});
