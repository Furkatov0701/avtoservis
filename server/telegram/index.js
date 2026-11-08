import { readBotConfig } from './config.js';
import { createBotServer } from './server.js';
try {
  const config = readBotConfig(process.env);
  const port = Number(process.env.PORT || 8787);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT must be between 1 and 65535');
  const server = createBotServer(config);
  server.on('error', () => { console.error('Bot server could not start. Check the port and hosting settings.'); process.exitCode = 1; });
  server.listen(port, '0.0.0.0', () => console.log(`Avto bot server listening on port ${port}`));
  for (const signal of ['SIGTERM', 'SIGINT']) process.on(signal, () => server.close());
} catch (error) { console.error(error.message); process.exitCode = 1; }
