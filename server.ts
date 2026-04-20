import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Set headers for maximum compatibility (Allow framing everywhere)
  app.use((req, res, next) => {
    // Completely disable framing restrictions for maximum ease of use in Telegram
    res.setHeader('Content-Security-Policy', "frame-ancestors *;");
    res.removeHeader('X-Frame-Options');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    
    if (req.method === 'OPTIONS') {
      res.status(200).end();
      return;
    }
    
    next();
  });

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
