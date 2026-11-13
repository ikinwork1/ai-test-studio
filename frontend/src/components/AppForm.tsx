import { useEffect, useState } from 'react';

const empty = {
  id: '',
  name: '',
  baseUrl: '',
  login: { path: '/login', username: '', password: '' },
};

export default function AppForm({
  initial,
  onSave,
  onCancel,
}: {
  initial: any | null;
  onSave: (app: any) => void;
  onCancel: () => void;
}) {
  const [app, setApp] = useState(initial ?? empty);

  useEffect(() => setApp(initial ?? empty), [initial]);

  return (
    <form
      className="form"
      onSubmit={(e) => {
        e.preventDefault();
        onSave(app);
      }}
    >
      <h3>{initial ? 'Редактировать приложение' : 'Новое приложение'}</h3>
      <label>
        ID (латиница, без пробелов)
        <input
          value={app.id}
          disabled={!!initial}
          onChange={(e) => setApp({ ...app, id: e.target.value })}
          required
        />
      </label>
      <label>
        Название
        <input value={app.name} onChange={(e) => setApp({ ...app, name: e.target.value })} required />
      </label>
      <label>
        Базовый URL (IP или домен)
        <input
          value={app.baseUrl}
          onChange={(e) => setApp({ ...app, baseUrl: e.target.value })}
          placeholder="http://10.0.1.15:8080"
          required
        />
      </label>
      <label>
        Путь страницы входа
        <input
          value={app.login.path}
          onChange={(e) => setApp({ ...app, login: { ...app.login, path: e.target.value } })}
        />
      </label>
      <label>
        Логин
        <input
          value={app.login.username}
          onChange={(e) => setApp({ ...app, login: { ...app.login, username: e.target.value } })}
          required
        />
      </label>
      <label>
        Пароль
        <input
          type="password"
          value={app.login.password}
          onChange={(e) => setApp({ ...app, login: { ...app.login, password: e.target.value } })}
        />
      </label>
      <div className="actions">
        <button type="submit">Сохранить</button>
        <button type="button" onClick={onCancel}>
          Отмена
        </button>
      </div>
    </form>
  );
}
