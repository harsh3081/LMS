import { Injectable } from '@nestjs/common';
import { Principal } from '../common/principal';

/**
 * Minimal server-side session store (ADR-004: cookie-based session).
 * No prior auth/session mechanism exists in the repo (tech-design.md
 * Clarifications, resolved) — this is a deliberately minimal bootstrap
 * scoped to what Create-Lead needs, not a full auth feature. In-memory,
 * single-process: acceptable for this Story's scope (dealership-scale,
 * ADR-009); a real deployment would back this with a shared store
 * (Redis/DB-backed sessions) — out of scope here.
 */
@Injectable()
export class SessionStore {
  private readonly sessions = new Map<string, Principal>();

  set(token: string, principal: Principal): void {
    this.sessions.set(token, principal);
  }

  get(token: string | undefined): Principal | undefined {
    if (!token) return undefined;
    return this.sessions.get(token);
  }

  delete(token: string): void {
    this.sessions.delete(token);
  }
}
