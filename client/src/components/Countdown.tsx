import { useEffect } from 'react';
import { playGo, playTick } from '../utils/sound';

export default function Countdown({ msToGo }: { msToGo: number }) {
  const label = msToGo > 2000 ? '3' : msToGo > 1000 ? '2' : msToGo > 0 ? '1' : 'GO!';

  useEffect(() => {
    if (label === 'GO!') playGo();
    else playTick();
  }, [label]);

  return (
    <div className="countdown">
      <div key={label} className={`count ${label === 'GO!' ? 'go' : ''}`}>
        {label}
      </div>
    </div>
  );
}