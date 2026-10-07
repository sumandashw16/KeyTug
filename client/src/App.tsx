import { useRoom } from './hooks/useRoom';
import Home from './pages/Home';
import Lobby from './pages/Lobby';
import Game from './pages/Game';

export default function App() {
  const room = useRoom();

  if (!room.ready) {
    return (
      <div className="screen splash">
        <div className="muted">Connecting to server…</div>
      </div>
    );
  }

  return (
    <>
      {!room.connected && <div className="banner">Connection lost — reconnecting…</div>}
      {!room.state ? (
        <Home onCreate={room.createRoom} onJoin={room.joinRoom} error={room.error} />
      ) : room.state.status === 'lobby' ? (
        <Lobby
          state={room.state}
          onSettings={room.updateSettings}
          onStart={room.startGame}
          onLeave={room.leave}
        />
      ) : (
        <Game
          key={room.state.round}
          state={room.state}
          text={room.text}
          onProgress={room.sendProgress}
          onRematch={room.rematch}
          onLobby={room.backToLobby}
          onLeave={room.leave}
        />
      )}
    </>
  );
}