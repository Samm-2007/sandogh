import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { apply, initialState, type State, type Op } from '../shared/model.ts';

const PORT = Number(process.env.PORT || 3000);
const DATA = process.env.DATA_FILE || path.resolve('data/db.json');
const DIST = path.resolve('dist');
fs.mkdirSync(path.dirname(DATA), { recursive: true });

let state: State = fs.existsSync(DATA) ? JSON.parse(fs.readFileSync(DATA, 'utf8')) : initialState();
const save = () => { const tmp = DATA + '.tmp'; fs.writeFileSync(tmp, JSON.stringify(state, null, 1)); fs.renameSync(tmp, DATA); };
if (!fs.existsSync(DATA)) save();

const MIME: Record<string, string> = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.json': 'application/json', '.png': 'image/png', '.ico': 'image/x-icon', '.webmanifest': 'application/manifest+json', '.ttf': 'font/ttf', '.woff2': 'font/woff2' };
const json = (res: http.ServerResponse, code: number, body: unknown) => {
  res.writeHead(code, { 'content-type': 'application/json', 'cache-control': 'no-store' }); res.end(JSON.stringify(body));
};

http.createServer((req, res) => {
  const url = new URL(req.url || '/', 'http://x');
  if (url.pathname === '/api/state' && req.method === 'GET') return json(res, 200, state);
  if (url.pathname === '/api/op' && req.method === 'POST') {
    let body = '';
    req.on('data', (c) => { body += c; if (body.length > 1e6) req.destroy(); });
    req.on('end', () => {
      try { state = apply(state, JSON.parse(body) as Op); save(); json(res, 200, state); }
      catch (e) { json(res, 400, { error: String(e) }); }
    });
    return;
  }
  let file = path.join(DIST, path.normalize(url.pathname).replace(/^(\.\.[/\\])+/, ''));
  if (file.startsWith(DIST) && fs.existsSync(file) && fs.statSync(file).isDirectory() && fs.existsSync(path.join(file, 'index.html'))) file = path.join(file, 'index.html');
  if (!file.startsWith(DIST) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(DIST, 'index.html');
  res.writeHead(200, { 'content-type': MIME[path.extname(file)] || 'application/octet-stream',
    'cache-control': (file.includes('/assets/') || file.includes('/fonts/')) ? 'public, max-age=31536000, immutable' : 'no-cache' });
  fs.createReadStream(file).pipe(res);
}).listen(PORT, () => console.log('listening on', PORT));
