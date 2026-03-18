const http = require('http');
const fs = require('fs');
const path = require('path');

const DIST = path.join(__dirname, 'dist');
const API_PORT = 3000;
const MIME = {
  '.html': 'text/html',
  '.js':   'application/javascript',
  '.css':  'text/css',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.ttf':  'font/ttf',
  '.json': 'application/json',
  '.ico':  'image/x-icon',
};

// Development-only server — HTTP is intentional for local use
const ALLOWED_PROXY_PREFIXES = ['/api/', '/health'];

http.createServer((req, res) => {
  const isProxyPath = ALLOWED_PROXY_PREFIXES.some(prefix => req.url === prefix.replace(/\/$/, '') || req.url.startsWith(prefix));
  if (isProxyPath) {
    // Build a strict proxy path from a whitelist — never forward raw user input
    let safePath;
    try {
      const parsed = new URL(req.url, 'http://localhost');
      safePath = parsed.pathname + (parsed.search || '');
    } catch {
      res.writeHead(400); res.end('Bad request'); return;
    }
    // Double-check the path still matches the whitelist after parsing
    if (!ALLOWED_PROXY_PREFIXES.some(p => safePath === p.replace(/\/$/, '') || safePath.startsWith(p))) {
      res.writeHead(400); res.end('Bad request'); return;
    }
    const options = {
      hostname: 'localhost',
      port: API_PORT,
      path: safePath,
      method: req.method,
      headers: { ...req.headers, host: `localhost:${API_PORT}` },
    };
    const proxy = http.request(options, (proxyRes) => {
      res.writeHead(proxyRes.statusCode, proxyRes.headers);
      proxyRes.pipe(res);
    });
    proxy.on('error', () => { res.writeHead(502); res.end('API unavailable'); });
    req.pipe(proxy);
    return;
  }

  // Serve static files with async fs to avoid blocking the event loop
  const urlPath = decodeURIComponent((req.url === '/' ? 'index.html' : req.url).split('?')[0]);
  let filePath = path.resolve(DIST, urlPath.replace(/^\/+/, ''));
  // Path traversal protection: ensure resolved path stays within DIST
  if (!filePath.startsWith(DIST)) {
    res.writeHead(403); res.end('Forbidden'); return;
  }
  fs.stat(filePath, (err, stats) => {
    if (err || stats.isDirectory()) {
      filePath = path.join(DIST, 'index.html');
    }
    const ext = path.extname(filePath);
    res.setHeader('Content-Type', MIME[ext] || 'application/octet-stream');
    res.setHeader('Access-Control-Allow-Origin', '*');
    fs.createReadStream(filePath).on('error', (fsErr) => {
      console.log('404:', urlPath, fsErr.message);
      res.writeHead(404); res.end('Not found');
    }).pipe(res);
  });
}).listen(8083, () => console.log('App disponible sur http://localhost:8083 (avec proxy API)'));
