import { useRoom } from './hooks/useRoom';
import { useAuth } from './hooks/useAuth';
import AccountBar from './components/AccountBar';
import Home from './pages/Home';
import Lobby from './pages/Lobby';
import Game from './pages/Game';

export default function App() {
  const room = useRoom();
  const auth = useAuth();

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
        <>
          <AccountBar
            user={auth.user}
            enabled={auth.enabled}
            onLogin={auth.login}
            onSignup={auth.signup}
            onLogout={auth.logout}
          />
          <Home
            onCreate={room.createRoom}
            onJoin={room.joinRoom}
            error={room.error}
            loggedIn={!!auth.user}
          />
        </>
      ) : room.state.status === 'lobby' ? (
        <Lobby
          state={room.state}
          onSettings={room.updateSettings}
          onTeam={room.setTeam}
          onWeight={room.setWeight}
          onAddBot={room.addBot}
          onUpdateBot={room.updateBot}
          onRemoveBot={room.removeBot}
          onStart={room.startGame}
          onLeave={room.leave}
          chat={room.chat}
          onChat={room.sendChat}
        />
      ) : (
        <Game
          key={room.state.round}
          state={room.state}
          text={room.text}
          onProgress={room.sendProgress}
          onPlayAgain={room.playAgain}
          onLobby={room.backToLobby}
          onLeave={room.leave}
          chat={room.chat}
          onChat={room.sendChat}
        />
      )}
    </>
  );
}