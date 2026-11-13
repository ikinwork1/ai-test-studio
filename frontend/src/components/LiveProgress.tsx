import { useEffect, useRef, useState } from 'react';

interface Event {
  type: string;
  [key: string]: any;
}

export default function LiveProgress({ onEnd }: { onEnd: () => void }) {
  const [events, setEvents] = useState<Event[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const proto = location.protocol === 'https:' ? 'wss' : 'ws';
    const ws = new WebSocket(`${proto}://${location.host}/ws`);
    wsRef.current = ws;

    ws.onmessage = (e) => {
      const evt = JSON.parse(e.data) as Event;
      setEvents((prev) => [...prev, evt]);
      if (evt.type === 'run:end') onEnd();
    };

    return () => ws.close();
  }, [onEnd]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [events]);

  const render = (e: Event, i: number) => {
    switch (e.type) {
      case 'run:start':
        return <div key={i} className="evt info">🚀 Запуск: {e.testFile}</div>;
      case 'run:tip':
        return <div key={i} className="evt tip">💡 {e.tip}</div>;
      case 'run:log':
        return <div key={i} className={`evt ${e.level}`}>{e.message}</div>;
      case 'run:case':
        return (
          <div key={i} className={`evt ${e.status === 'pass' ? 'ok' : 'fail'}`}>
            {e.status === 'pass' ? '✅' : '❌'} {e.caseName}
          </div>
        );
      case 'run:end':
        return (
          <div key={i} className={`evt ${e.status === 'passed' ? 'ok' : 'fail'}`}>
            {e.status === 'passed' ? '🏁 Тесты пройдены' : '🏁 Тесты завершились с ошибками'}
            {e.reportPath && <span className="muted"> — отчёт: {e.reportPath}</span>}
          </div>
        );
      case 'run:error':
        return <div key={i} className="evt fail">⚠ {e.message}</div>;
      default:
        return null;
    }
  };

  return (
    <div className="progress" ref={listRef}>
      {events.length === 0 && <p className="muted">События появятся после запуска тестов</p>}
      {events.map(render)}
    </div>
  );
}
