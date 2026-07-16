import { Body, Controller, HttpCode, Post, Res, UnauthorizedException } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { AuthService } from './auth.service';
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
  constructor(private readonly authService: AuthService) {}

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
}
