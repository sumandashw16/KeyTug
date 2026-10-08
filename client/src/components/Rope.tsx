import { round1 } from '../utils/ropeMath';

interface Props {
  position: number; // percent from the left
  lead: number; // weighted score A - B
  showLead?: boolean;
  compact?: boolean;
}

export default function Rope({ position, lead, showLead = true, compact = false }: Props) {
  const glow1 = Math.pow(1 - position / 100, 2);
  const glow2 = Math.pow(position / 100, 2);
  const leader = lead > 0 ? 1 : lead < 0 ? 2 : 0;

  return (
    <div className={`rope-wrap ${compact ? 'compact' : ''}`}>
      <div className="zone zone-1" style={{ opacity: 0.4 + 0.6 * glow1 }}>
        <span>A</span>
      </div>
      <div className="zone zone-2" style={{ opacity: 0.4 + 0.6 * glow2 }}>
        <span>B</span>
      </div>

      <div className="rope" />
      <div className="start-line" style={{ left: '50%' }}>
        <i>START</i>
      </div>

      <div className="knot" style={{ left: `${position}%` }} data-leader={leader}>
        {showLead && lead !== 0 && <div className="lead-tag">+{round1(Math.abs(lead))}</div>}
        <div className="flag" />
        <div className="knot-body" />
      </div>
    </div>
  );
}