import fs from 'node:fs/promises';
import path from 'node:path';
import type { AppConfig, AppPublic } from './types.js';

const APPS_DIR = path.resolve(process.cwd(), '..', 'config', 'apps');

async function ensureDir() {
  await fs.mkdir(APPS_DIR, { recursive: true });
}

function toPublic(app: AppConfig): AppPublic {
  return {
    ...app,
    login: { path: app.login.path, username: app.login.username },
  };
}

export async function listApps(): Promise<AppPublic[]> {
  await ensureDir();
  const files = (await fs.readdir(APPS_DIR)).filter(
    (f) => f.endsWith('.json') && !f.endsWith('.example')
  );
  const apps = await Promise.all(
    files.map(async (f) => {
      const raw = await fs.readFile(path.join(APPS_DIR, f), 'utf8');
      return JSON.parse(raw) as AppConfig;
    })
  );
  return apps.map(toPublic);
}

export async function getApp(id: string): Promise<AppConfig> {
  await ensureDir();
  const raw = await fs.readFile(path.join(APPS_DIR, `${id}.json`), 'utf8');
  return JSON.parse(raw) as AppConfig;
}

export async function saveApp(app: AppConfig): Promise<void> {
  await ensureDir();
  const file = path.join(APPS_DIR, `${app.id}.json`);
  await fs.writeFile(file, JSON.stringify(app, null, 2), 'utf8');
  await fs.chmod(file, 0o600);
}

export async function deleteApp(id: string): Promise<void> {
  await fs.unlink(path.join(APPS_DIR, `${id}.json`)).catch(() => {});
}
