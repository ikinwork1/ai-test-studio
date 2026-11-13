import 'dotenv/config';
import express from 'express';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer } from 'node:http';
import { fork, type ChildProcess } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import YAML from 'yaml';
import * as store from './config-store.js';
import type { AppConfig, TestMeta, ProgressEvent } from './types.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', '..');
const CASES_DIR = path.join(ROOT, 'cases');

// Playwright будет искать браузеры в этой папке (Windows и Linux — одинаково)
process.env.PLAYWRIGHT_BROWSERS_PATH = path.join(ROOT, 'playwright-browsers');

const app = express();
app.use(express.json({ limit: '2mb' }));

// ---------- REST API: приложения ----------
app.get('/api/apps', async (_req, res) => {
  try {
    res.json(await store.listApps());
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

app.post('/api/apps', async (req, res) => {
  try {
    const body = req.body as AppConfig;
    if (!body.id || !body.baseUrl || !body.login?.username) {
      return res.status(400).json({ error: 'id, baseUrl, login.username обязательны' });
    }
    await store.saveApp(body);
    res.status(201).json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

app.put('/api/apps/:id', async (req, res) => {
  try {
    await store.saveApp({ ...req.body, id: req.params.id } as AppConfig);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

app.delete('/api/apps/:id', async (req, res) => {
  try {
    await store.deleteApp(req.params.id);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

// ---------- REST API: тесты ----------
app.get('/api/tests', async (_req, res) => {
  try {
    await fs.mkdir(CASES_DIR, { recursive: true });
    const files = (await fs.readdir(CASES_DIR)).filter((f) => f.endsWith('.yaml'));
    const tests: TestMeta[] = [];
    for (const filename of files) {
      try {
        const content = await fs.readFile(path.join(CASES_DIR, filename), 'utf8');
        const doc = YAML.parse(content) as { cases?: unknown[] };
        tests.push({
          filename,
          name: filename.replace(/\.yaml$/, ''),
          caseCount: doc.cases?.length ?? 0,
        });
      } catch (e) {
        console.warn(`[skip] ${filename}: ${(e as Error).message}`);
      }
    }
    res.json(tests);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

app.get('/api/tests/:filename', async (req, res) => {
  try {
    const content = await fs.readFile(path.join(CASES_DIR, req.params.filename), 'utf8');
    res.type('text/yaml').send(content);
  } catch {
    res.status(404).json({ error: 'Тест не найден' });
  }
});

app.put('/api/tests/:filename', async (req, res) => {
  try {
    const { content } = req.body as { content: string };
    if (!req.params.filename.endsWith('.yaml')) {
      return res.status(400).json({ error: 'Допустимы только .yaml файлы' });
    }
    await fs.mkdir(CASES_DIR, { recursive: true });
    await fs.writeFile(path.join(CASES_DIR, req.params.filename), content, 'utf8');
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

app.delete('/api/tests/:filename', async (req, res) => {
  try {
    await fs.unlink(path.join(CASES_DIR, req.params.filename));
    res.json({ ok: true });
  } catch {
    res.status(404).json({ error: 'Тест не найден' });
  }
});

// ---------- Запуск тестов + WebSocket ----------
const server = createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

const clients = new Set<WebSocket>();
wss.on('connection', (ws) => {
  clients.add(ws);
  ws.on('close', () => clients.delete(ws));
});

function broadcast(event: ProgressEvent) {
  const data = JSON.stringify(event);
  for (const ws of clients) {
    if (ws.readyState === WebSocket.OPEN) ws.send(data);
  }
}

app.post('/api/run', async (req, res) => {
  try {
    const { appId, testFile } = req.body as { appId: string; testFile: string };
    if (!appId || !testFile) {
      return res.status(400).json({ error: 'appId и testFile обязательны' });
    }

    const runnerPath = path.join(__dirname, 'test-runner.js');
    console.log('[server] launching runner:', runnerPath);
    const child: ChildProcess = fork(runnerPath, [JSON.stringify({ appId, testFile })], {
      stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
      env: { ...process.env },
    });

    child.stdout?.on('data', (chunk: Buffer) => {
      const text = chunk.toString().trim();
      console.log('[runner]', text);
      broadcast({ type: 'run:log', level: 'info', message: text });
    });
    child.stderr?.on('data', (chunk: Buffer) => {
      const text = chunk.toString().trim();
      console.error('[runner:err]', text);
      broadcast({ type: 'run:log', level: 'error', message: text });
    });
    child.on('message', (msg) => {
      broadcast(msg as ProgressEvent);
    });
    child.on('exit', (code) => {
      console.log('[server] runner exited with code', code);
      if (code !== 0) {
        broadcast({ type: 'run:end', status: 'failed' });
      }
    });
    child.on('error', (err) => {
      console.error('[server] runner error:', err);
    });

    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

// ---------- Раздача собранного frontend ----------
const FRONTEND_DIST = path.join(ROOT, 'frontend', 'dist');
app.use(express.static(FRONTEND_DIST));
app.get('*', (_req, res) => {
  res.sendFile(path.join(FRONTEND_DIST, 'index.html'));
});

const PORT = Number(process.env.PORT ?? 3000);
server.listen(PORT, () => {
  console.log(`AI Test Studio backend запущен на http://localhost:${PORT}`);
});