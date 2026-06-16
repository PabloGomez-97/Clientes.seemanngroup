/**
 * Servidor local para iterar el boceto del correo aéreo sin enviar emails.
 * Uso: npm run email:preview:air
 */
import { createServer } from 'node:http';
import { readFileSync, watch } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const PREVIEW_PATH = resolve(ROOT, 'tmp-air-email-preview.html');
const PORT = Number(process.env.EMAIL_PREVIEW_PORT || 5199);

let clients = [];

function broadcastReload() {
  for (const res of clients) {
    res.write('data: reload\n\n');
  }
}

function readPreview() {
  return readFileSync(PREVIEW_PATH, 'utf8');
}

const server = createServer((req, res) => {
  if (req.url === '/events') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    });
    clients.push(res);
    req.on('close', () => {
      clients = clients.filter((c) => c !== res);
    });
    return;
  }

  if (req.url === '/' || req.url === '/tmp-air-email-preview.html') {
    try {
      let html = readPreview();
      const inject = `
<script>
(function () {
  const source = new EventSource('/events');
  source.onmessage = function () { location.reload(); };
})();
</script>`;
      if (!html.includes('EventSource')) {
        html = html.replace('</body>', `${inject}\n</body>`);
      }
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(html);
      return;
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end(`No se pudo leer ${PREVIEW_PATH}\n${err}`);
      return;
    }
  }

  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('Not found');
});

server.listen(PORT, () => {
  console.log(`\n  Boceto email aéreo → http://localhost:${PORT}/`);
  console.log(`  Archivo: tmp-air-email-preview.html`);
  console.log(`  Guarda el HTML y el navegador recargará solo.\n`);
});

watch(PREVIEW_PATH, { persistent: true }, () => {
  console.log('[email:preview] cambios detectados, recargando…');
  broadcastReload();
});
