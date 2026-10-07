interface Props {
  slot: 1 | 2;
  isYou: boolean;
  connected: boolean;
  wpm: number;
  accuracy: number;
  correct: number;
}

export default function PlayerStats({ slot, isYou, connected, wpm, accuracy, correct }: Props) {
  return (
    <div className={`stats stats-${slot} ${slot === 2 ? 'right' : ''}`}>
      <div className="stats-name">
        PLAYER {slot}
        {isYou && <em>YOU</em>}
        {!connected && <b>OFFLINE</b>}
      </div>
      <div className="stats-wpm">
        <strong>{wpm}</strong> <span>WPM</span>
      </div>
      <div className="stats-sub">
        <span>ACCURACY {accuracy}%</span>
        <span>CORRECT {correct}</span>
      </div>
    </div>
  );
}