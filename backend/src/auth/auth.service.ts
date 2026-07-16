import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import * as bcrypt from 'bcryptjs';
import { DataSource } from 'typeorm';
import { UserEntity } from '../users/entities/user.entity';
import { SessionStore } from './session-store';
import { Principal } from '../common/principal';

/**
 * Minimal bootstrap auth service (ADR-004). Verifies credentials against the
 * `users` table this Story creates and issues an opaque session token
 * (see fixtures/README.md assumption: `POST /api/v1/auth/login`).
 */
@Injectable()
export class AuthService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly sessionStore: SessionStore,
  ) {}

  async validateCredentials(email: string, password: string): Promise<Principal | null> {
    const user = await this.dataSource.getRepository(UserEntity).findOne({ where: { email } });
    if (!user) return null;
    const matches = await bcrypt.compare(password, user.passwordHash);
    if (!matches) return null;
    return {
      userId: user.userId,
      role: user.role,
      locationId: user.locationId,
      dealerGroupId: user.dealerGroupId,
      capabilities: user.capabilities,
    };
  }

  createSession(principal: Principal): string {
    const token = randomUUID();
    this.sessionStore.set(token, principal);
    return token;
  }
}
