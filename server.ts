import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import { createProxyMiddleware } from 'http-proxy-middleware';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Set headers for maximum compatibility
  app.use((req, res, next) => {
    res.setHeader('Content-Security-Policy', "frame-ancestors *;");
    res.removeHeader('X-Frame-Options');
    
    // Explicitly allow origin for our main app domain
    const origin = req.headers.origin || '*';
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    
    if (req.method === 'OPTIONS') {
      res.status(200).end();
      return;
    }
    
    next();
  });

  // Proxy requests to tonconnect bridges to bypass CORS
  app.use('/bridge', createProxyMiddleware({
    target: 'https://bridge.tonapi.io', // Основной мост, который работает стабильно
    changeOrigin: true,
    pathRewrite: { '^/bridge': '/bridge' },
  }));

  app.get('/tonconnect-manifest.json', (req, res) => {
    // Determine the host based on the request
    const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'https';
    const host = req.headers['x-forwarded-host'] || req.get('host');
    const fullUrl = `${protocol}://${host}`;
    
    res.json({
      url: fullUrl,
      name: "Isekai Quest",
      iconUrl: "https://ton-connect.github.io/demo-dapp/apple-touch-icon.png",
      termsOfServiceUrl: `${fullUrl}/terms`,
      privacyPolicyUrl: `${fullUrl}/privacy`
    });
  });

  app.get('/terms', (req, res) => res.send('<h1>Terms of Service</h1><p>Welcome to Isekai Quest!</p>'));
  app.get('/privacy', (req, res) => res.send('<h1>Privacy Policy</h1><p>Your privacy is important to us.</p>'));

  if (process.env.NODE_ENV === 'production') {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
    console.log('Telegram Mini App framing headers are active.');
  });
}

startServer();
