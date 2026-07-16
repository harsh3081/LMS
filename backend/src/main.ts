import 'reflect-metadata';
import AppDataSource from './data-source';
import { createApp } from './app.factory';

async function bootstrap(): Promise<void> {
  await AppDataSource.initialize();
  await AppDataSource.runMigrations();
  const app = await createApp(AppDataSource);
  const port = Number(process.env.PORT || 4000);
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`LMS backend listening on port ${port}`);
}

bootstrap().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Failed to start backend:', err);
  process.exit(1);
});
