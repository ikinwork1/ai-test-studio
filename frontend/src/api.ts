const BASE = '/api';

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  return res.json() as Promise<T>;
}

export const api = {
  listApps: () => fetch(`${BASE}/apps`).then((r) => json<any[]>(r)),
  saveApp: (app: any) =>
    fetch(app.id ? `${BASE}/apps/${app.id}` : `${BASE}/apps`, {
      method: app.id ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(app),
    }).then((r) => json(r)),
  deleteApp: (id: string) =>
    fetch(`${BASE}/apps/${id}`, { method: 'DELETE' }).then((r) => json(r)),

  listTests: () => fetch(`${BASE}/tests`).then((r) => json<any[]>(r)),
  getTest: (filename: string) =>
    fetch(`${BASE}/tests/${encodeURIComponent(filename)}`).then((r) => r.text()),
  saveTest: (filename: string, content: string) =>
    fetch(`${BASE}/tests/${encodeURIComponent(filename)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    }).then((r) => json(r)),
  deleteTest: (filename: string) =>
    fetch(`${BASE}/tests/${encodeURIComponent(filename)}`, { method: 'DELETE' }).then((r) =>
      json(r)
    ),

  run: (appId: string, testFile: string) =>
    fetch(`${BASE}/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ appId, testFile }),
    }).then((r) => json(r)),
};