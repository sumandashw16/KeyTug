// ASCII only, so every character is typeable on a normal keyboard.
const SENTENCES = [
  'The quick brown fox jumps over the lazy dog while the world continues to move forward.',
  'Technology changes the way people communicate, but a good conversation still starts with listening.',
  'A steady rhythm beats a frantic sprint when the finish line is a long way off.',
  'Every morning the baker opens the shop before sunrise and the whole street smells like warm bread.',
  'Rivers carve valleys slowly, patiently, and without any hurry at all.',
  'If you want to get faster, first learn to be accurate, then let the speed arrive on its own.',
  'The old lighthouse stood at the edge of the cliff, guiding ships through the fog for a hundred years.',
  'Clouds drifted across the mountain while the hikers shared tea and quiet stories at the summit.',
  'A good rope is made of many small fibers, each one weak alone and strong together.',
  'She packed a notebook, two pencils, and a map that had been folded and unfolded a thousand times.',
  'Keep your eyes on the next word, not the last one, and your fingers will find their way.',
  'The city never really sleeps; it only lowers its voice for a few hours before dawn.',
  'Strong winds bend the tallest trees, but the ones with deep roots always stand back up.',
  'Patience is a skill, and like any skill it grows with practice, repetition, and a little stubbornness.',
  'In the garden, the tomatoes ripened one by one, turning from green to gold to deep red.',
  'The train rattled through the valley, past farms and rivers, toward a town nobody had visited in years.',
  'When the music stopped, the room held its breath for one long, perfect second.',
  'A small mistake corrected quickly costs far less than a big mistake ignored for too long.',
  'The scientist adjusted the lens, held her breath, and watched the tiny world come into focus.',
  'Winter arrived overnight, painting every window with frost and every rooftop with silver light.',
  'They argued about the best route, then took the long way home and enjoyed the scenery anyway.',
  'Good habits are built from boring days, repeated until they stop feeling like effort.',
  'The market was loud with voices, bright with fruit, and thick with the smell of fresh spices.',
  'Somewhere beyond the hills, a storm was gathering its strength and waiting for the right moment.',
  'He tightened his grip, leaned back, and pulled with everything he had left in his arms.',
  'Numbers, letters, commas, and quiet pauses all fit together to make a sentence worth reading.',
  'The library was silent except for the soft turning of pages and the hum of an old radiator.',
  'Courage is not the absence of fear; it is moving forward while your hands are still shaking.',
  'On the far shore, small lights flickered on, one after another, as evening settled over the bay.',
  'Focus on the rhythm of your breathing and the rhythm of your typing will follow.',
];

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** One shared text per round; both players always get this exact string. */
export function generateText(minLength = 14000): string {
  let out = '';
  while (out.length < minLength) {
    for (const s of shuffle(SENTENCES)) out += s + ' ';
  }
  return out.trimEnd();
}