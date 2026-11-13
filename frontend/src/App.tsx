import { useEffect, useState } from 'react';
import { api } from './api';
import AppList from './components/AppList';
import AppForm from './components/AppForm';
import TestList from './components/TestList';
import LiveProgress from './components/LiveProgress';
export default function App() {
  const [apps, setApps] = useState<any[]>([]);
  const [tests, setTests] = useState<any[]>([]);
  const [editingApp, setEditingApp] = useState<any | null>(null);
  const [selectedAppId, setSelectedAppId] = useState<string>('');
  const [selectedTest, setSelectedTest] = useState<string>('');
  const [running, setRunning] = useState(false);
  const refresh = async () => {
    setApps(await api.listApps());
    setTests(await api.listTests());
  };
  useEffect(() => {
    refresh().catch(console.error);
  }, []);
  const handleSaveApp = async (app: any) => {
    await api.saveApp(app);
    setEditingApp(null);
    await refresh();
  };
  const handleRun = async () => {
    if (!selectedAppId || !selectedTest) return;
    setRunning(true);
    try {
      await api.run(selectedAppId, selectedTest);
    } finally {
      // running сбрасывается по событию run:end из LiveProgress через колбэк
    }
  };
  return (
    <div className="layout">
      <header>
        <h1>AI Test Studio</h1>
        <span className="subtitle">Offline · Midscene + Qwen2.5-VL</span>
      </header>
      <main>
        <section className="panel">
          <h2>Приложения</h2>
          <AppList
            apps={apps}
            onEdit={setEditingApp}
            onDelete={async (id) => {
              await api.deleteApp(id);
              await refresh();
            }}
          />
          <AppForm initial={editingApp} onSave={handleSaveApp} onCancel={() => setEditingApp(null)} />
        </section>
        <section className="panel">
          <h2>Тесты</h2>
          <TestList
            tests={tests}
            onRefresh={refresh}
            selected={selectedTest}
            onSelect={setSelectedTest}
          />
        </section>
        <section className="panel">
          <h2>Запуск</h2>
          <div className="run-controls">
            <label>
              Приложение:
              <select value={selectedAppId} onChange={(e) => setSelectedAppId(e.target.value)}>
                <option value="">— выберите —</option>
                {apps.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Тест:
              <select value={selectedTest} onChange={(e) => setSelectedTest(e.target.value)}>
                <option value="">— выберите —</option>
                {tests.map((t) => (
                  <option key={t.filename} value={t.filename}>
                    {t.name} ({t.caseCount} кейсов)
                  </option>
                ))}
              </select>
            </label>
            <button disabled={!selectedAppId || !selectedTest || running} onClick={handleRun}>
              ▶ Запустить
            </button>
          </div>
          <LiveProgress onEnd={() => setRunning(false)} />
        </section>
      </main>
    </div>
  );
}