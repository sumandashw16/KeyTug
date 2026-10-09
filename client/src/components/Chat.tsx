import { useEffect, useRef, useState } from 'react';
import { ChatMessage } from '../types';

interface Props {
  messages: ChatMessage[];
  myId: string;
  onSend: (text: string) => void;
  collapsible?: boolean;
}

const QUICK = ['GG', 'GL HF', 'Nice pull!', 'Rematch?'];

export default function Chat({ messages, myId, onSend, collapsible = false }: Props) {
  const [text, setText] = useState('');
  const [open, setOpen] = useState(!collapsible);
  const lastId = messages.length ? messages[messages.length - 1].id : 0;
  const [seen, setSeen] = useState(lastId);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) setSeen(lastId);
  }, [open, lastId]);

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lastId, open]);

  const unread = open ? 0 : messages.filter((m) => m.kind === 'user' && m.id > seen).length;

  const send = (t: string) => {
    const v = t.trim();
    if (!v) return;
    onSend(v);
    setText('');
  };

  return (
    <div className="chat">
      <button
        className="chat-head"
        onClick={() => collapsible && setOpen((o) => !o)}
        style={{ cursor: collapsible ? 'pointer' : 'default' }}
      >
        <span>CHAT</span>
        {unread > 0 && <b className="chat-badge">{unread}</b>}
        {collapsible && <span className="chat-toggle">{open ? '▾' : '▸'}</span>}
      </button>

      {open && (
        <>
          <div className="chat-list" ref={listRef}>
            {messages.length === 0 && <div className="chat-empty">No messages yet. Say hi!</div>}
            {messages.map((m) =>
              m.kind === 'system' ? (
                <div key={m.id} className="chat-sys">{m.text}</div>
              ) : (
                <div key={m.id} className={`chat-msg ${m.playerId === myId ? 'mine' : ''}`}>
                  <span className={`chat-name t${m.team ?? 0}`}>{m.name}</span>
                  <span className="chat-text">{m.text}</span>
                </div>
              )
            )}
          </div>

          <div className="chat-quick">
            {QUICK.map((q) => (
              <button key={q} onClick={() => send(q)}>{q}</button>
            ))}
          </div>

          <div className="chat-input">
            <input
              value={text}
              maxLength={200}
              placeholder="Type a message and press Enter"
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && send(text)}
            />
            <button className="btn small" onClick={() => send(text)}>SEND</button>
          </div>
        </>
      )}
    </div>
  );
}