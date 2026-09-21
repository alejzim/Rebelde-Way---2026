import http from 'node:http';
import { createServer as createViteServer } from 'vite';
import handler from './app.js';

const port = Number(process.env.PORT || 5173);
const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'spa' });
const server = http.createServer((req, res) => {
  if (req.url === '/api' || req.url.startsWith('/api/')) void handler(req, res);
  else vite.middlewares(req, res);
});
server.requestTimeout = 15000;
server.headersTimeout = 10000;
server.listen(port, '127.0.0.1', () => console.log(`\n  Erreway · http://127.0.0.1:${port}\n  Panel   · http://127.0.0.1:${port}/admin\n`));
server.on('error', (error) => { console.error(`No se pudo iniciar el servidor: ${error.message}`); void vite.close(); process.exitCode = 1; });
for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => { server.close(); void vite.close().then(() => process.exit(0)); });
