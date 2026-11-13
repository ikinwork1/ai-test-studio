export default function AppList({
  apps,
  onEdit,
  onDelete,
}: {
  apps: any[];
  onEdit: (app: any) => void;
  onDelete: (id: string) => void;
}) {
  if (!apps.length) return <p className="muted">Нет сохранённых приложений</p>;
  return (
    <ul className="list">
      {apps.map((a) => (
        <li key={a.id}>
          <div>
            <strong>{a.name}</strong>
            <span className="muted"> — {a.baseUrl}</span>
            <div className="muted small">Логин: {a.login.username}</div>
          </div>
          <div className="actions">
            <button onClick={() => onEdit(a)}>✎</button>
            <button onClick={() => onDelete(a.id)}>✕</button>
          </div>
        </li>
      ))}
    </ul>
  );
}
