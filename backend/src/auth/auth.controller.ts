import { Body, Controller, HttpCode, Post, Req, Res, UnauthorizedException } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { SessionStore } from './session-store';
import { LoginDto } from './dto/login.dto';

export const SESSION_COOKIE_NAME = 'sid';

/**
 * Bootstrap login endpoint (fixtures/README.md assumption, confirmed as the
 * single place this contract lives): `POST /api/v1/auth/login` accepting
 * `{ email, password }`, setting a session cookie on success (ADR-004).
 */
@ApiTags('auth')
@Controller('api/v1/auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly sessionStore: SessionStore,
  ) {}

  @Post('login')
  @HttpCode(200)
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response): Promise<{ ok: true }> {
    const principal = await this.authService.validateCredentials(dto.email, dto.password);
    if (!principal) {
      throw new UnauthorizedException('Invalid email or password');
    }
    const token = this.authService.createSession(principal);
    res.cookie(SESSION_COOKIE_NAME, token, { httpOnly: true, sameSite: 'lax', path: '/' });
    return { ok: true };
  }

  /**
   * NEW (Sidebar logout action) — deliberately not guarded by
   * SessionAuthGuard: logging out must succeed even against a
   * missing/already-expired session (no session cookie -> nothing to
   * delete, still a clean 200), so a client can always safely call this
   * without first checking whether it still has a valid session.
   */
  @Post('logout')
  @HttpCode(200)
  logout(@Req() req: Request, @Res({ passthrough: true }) res: Response): { ok: true } {
    const token: string | undefined = req.cookies?.[SESSION_COOKIE_NAME];
    if (token) {
      this.sessionStore.delete(token);
    }
    res.clearCookie(SESSION_COOKIE_NAME, { httpOnly: true, sameSite: 'lax', path: '/' });
    return { ok: true };
  }
}
