import request from 'supertest';
import { INestApplication } from '@nestjs/common';

/** Logs in via POST /api/v1/auth/login and returns a supertest agent that
 * carries the resulting session cookie on subsequent requests — the Jest
 * mirror of the Playwright suite's tests/helpers/auth.ts loginApiContext. */
export async function loginAgent(
  app: INestApplication,
  email: string,
  password: string,
): Promise<ReturnType<typeof request.agent>> {
  const agent = request.agent(app.getHttpServer());
  const response = await agent.post('/api/v1/auth/login').send({ email, password });
  if (response.status !== 200) {
    throw new Error(`Login failed for ${email}: ${response.status} ${JSON.stringify(response.body)}`);
  }
  return agent;
}
