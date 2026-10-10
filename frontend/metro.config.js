const { getDefaultConfig } = require('expo/metro-config');
const http = require('http');

const config = getDefaultConfig(__dirname);

// Reverse-proxy /api traffic through Metro so tunnel & LAN clients can reach backend port 4000
const previousEnhanceMiddleware = config.server.enhanceMiddleware;
config.server.enhanceMiddleware = (metroMiddleware, server) => {
  const enhanced = previousEnhanceMiddleware
    ? previousEnhanceMiddleware(metroMiddleware, server)
    : metroMiddleware;

  return (req, res, next) => {
    const url = req.url || '';
    if (url.startsWith('/api/') || url === '/api' || url.startsWith('/api?')) {
      const proxyReq = http.request(
        {
          hostname: '127.0.0.1',
          port: 4000,
          path: url,
          method: req.method,
          headers: {
            ...req.headers,
            host: '127.0.0.1:4000',
          },
        },
        (proxyRes) => {
          res.writeHead(proxyRes.statusCode, proxyRes.headers);
          proxyRes.pipe(res, { end: true });
        }
      );

      proxyReq.on('error', (err) => {
        console.warn(`[Metro API Proxy] Backend unavailable on port 4000 for ${url}:`, err.message);
        res.writeHead(502, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Backend unreachable on port 4000' }));
      });

      req.pipe(proxyReq, { end: true });
      return;
    }

    return enhanced(req, res, next);
  };
};

module.exports = config;
