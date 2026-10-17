import express from 'express';
import { createServer as createViteServer } from 'vite';
import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import http from 'http';

const PORT = Number(process.env.PORT) || 3000;
const PYTHON_PORT = Number(process.env.PYTHON_PORT) || 5001;

let pythonProcess: ChildProcess | null = null;

function startPythonBackend(): void {
  const scriptPath = path.resolve(process.cwd(), 'backend', 'app.py');
  pythonProcess = spawn('python3', [scriptPath, String(PYTHON_PORT)], {
    stdio: 'inherit',
  });

  pythonProcess.on('exit', (code) => {
    if (code !== 0 && code !== null) {
      console.error(`[Python Backend] exited with code ${code}`);
    }
  });
}

process.on('SIGINT', () => {
  if (pythonProcess) pythonProcess.kill();
  process.exit(0);
});

process.on('SIGTERM', () => {
  if (pythonProcess) pythonProcess.kill();
  process.exit(0);
});

async function startServer() {
  startPythonBackend();

  const app = express();
  app.use(express.json({ limit: '1mb' }));

  // Proxy /api/python/* requests to the Python backend engine on port 5001
  app.use('/api/python', (req, res) => {
    const targetPath = `/api/python${req.url === '/' ? '' : req.url}`;
    const bodyData =
      req.method !== 'GET' && req.method !== 'HEAD' && req.body
        ? JSON.stringify(req.body)
        : null;

    const options: http.RequestOptions = {
      hostname: '127.0.0.1',
      port: PYTHON_PORT,
      path: targetPath,
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
        ...(bodyData ? { 'Content-Length': Buffer.byteLength(bodyData) } : {}),
      },
    };

    const proxyReq = http.request(options, (proxyRes) => {
      res.status(proxyRes.statusCode || 200);
      Object.entries(proxyRes.headers).forEach(([k, v]) => {
        if (v !== undefined) res.setHeader(k, v);
      });
      proxyRes.pipe(res);
    });

    proxyReq.on('error', (err) => {
      res.status(502).json({
        error: 'Python backend unavailable',
        detail: err.message,
      });
    });

    if (bodyData) {
      proxyReq.write(bodyData);
    }
    proxyReq.end();
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Aegis Gateway] Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
