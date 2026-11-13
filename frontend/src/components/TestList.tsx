import { useEffect, useState } from 'react';
import { api } from '../api';

export default function TestList({
  tests,
  onRefresh,
  selected,
  onSelect,
}: {
  tests: any[];
  onRefresh: () => void;
  selected: string;
  onSelect: (filename: string) => void;
}) {
  const [editing, setEditing] = useState<{ filename: string; content: string } | null>(null);

  const openEditor = async (filename: string) => {
    const content = await api.getTest(filename);
    setEditing({ filename, content });
  };

  const newTest = () =>
    setEditing({
      filename: `test-${Date.now()}.yaml`,
      content: `cases:\n  - name: "Новый тест"\n    steps:\n      - aiAssert: 'Страница загружена'\n`,
    });

  const save = async () => {
    if (!editing) return;
    await api.saveTest(editing.filename, editing.content);
    setEditing(null);
    onRefresh();
  };

  return (
    <div>
      <button onClick={newTest}>+ Новый тест</button>
      <ul className="list">
        {tests.map((t) => (
          <li key={t.filename}>
            <label>
              <input
                type="radio"
                name="test"
                checked={selected === t.filename}
                onChange={() => onSelect(t.filename)}
              />
              <strong>{t.name}</strong> <span className="muted">({t.caseCount} кейсов)</span>
            </label>
            <div className="actions">
              <button onClick={() => openEditor(t.filename)}>✎</button>
              <button
                onClick={async () => {
                  if (confirm(`Удалить ${t.filename}?`)) {
                    await api.deleteTest(t.filename);
                    onRefresh();
                  }
                }}
              >
                ✕
              </button>
            </div>
          </li>
        ))}
      </ul>

      {editing && (
        <div className="editor">
          <h3>Редактор: {editing.filename}</h3>
          <textarea
            value={editing.content}
            onChange={(e) => setEditing({ ...editing, content: e.target.value })}
            rows={16}
          />
          <div className="actions">
            <button onClick={save}>Сохранить</button>
            <button onClick={() => setEditing(null)}>Отмена</button>
          </div>
        </div>
      )}
    </div>
  );
}
