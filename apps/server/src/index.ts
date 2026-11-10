import { buildApp } from './app.js';

const PORT = Number(process.env.PORT ?? 3333);
const HOST = process.env.HOST ?? '127.0.0.1';

async function main(): Promise<void> {
  const app = await buildApp();
  await app.listen({ port: PORT, host: HOST });
  process.stdout.write(`Mind Hub API & MCP Server running at http://${HOST}:${PORT}\n`);
}

main().catch((err: unknown) => {
  console.error('Failed to start Mind Hub server:', err);
  process.exit(1);
});

export * from './app.js';
export * from './repository.js';
export * from './ai-service.js';
export * from './mcp-handler.js';
export * from './db/schema.js';
