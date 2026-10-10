import fs from 'fs';
import path from 'path';

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

// ---------- sentence generator (thousands of unique combinations) ----------
const SUBJECTS = [
  'The old fisherman', 'A curious child', 'Our neighbor', 'The quiet librarian', 'A tired traveler',
  'The young chef', 'My grandmother', 'The village doctor', 'A stubborn mule', 'The night watchman',
  'Two clever sparrows', 'The new teacher', 'An honest merchant', 'The lonely lighthouse keeper',
  'A group of hikers', 'The famous painter', 'Our captain', 'A sleepy cat', 'The tall stranger', 'The mayor',
];
const ACTIONS = [
  'carried a heavy basket of apples', 'forgot the name of the street', 'repaired the broken clock',
  'followed the winding river', 'wrote a long letter to an old friend', 'climbed the steep stone stairs',
  'baked a loaf of dark bread', 'counted the stars from the roof', 'argued about the price of fish',
  'collected smooth stones from the beach', 'opened the window to let in the breeze',
  'painted the fence a bright shade of blue', 'practiced the same song all afternoon',
  'searched every shelf for a missing book', 'watched the storm roll over the hills',
  'planted seeds along the garden wall', 'sharpened every pencil on the desk', 'told a story nobody believed',
  'crossed the bridge before the rain began', 'waited patiently for the last bus',
];
const PLACES = [
  'near the old harbor', 'behind the town hall', 'beside a quiet pond', 'on the edge of the forest',
  'inside the crowded station', 'under a pale winter sky', 'across the empty square',
  'at the top of the hill', 'along the dusty road', 'in the middle of the night',
  'before the market opened', 'while the village slept', 'as the sun went down',
  'after a long day of work', 'during the first snow of the year', 'just as the bells began to ring',
];
const ENDINGS = [
  'and nobody asked why', 'and the whole town noticed', 'without saying a single word',
  'with more care than usual', 'just like every other day', 'though the weather said otherwise',
  'and then went home smiling', 'while the lamps flickered on', 'and the work was finally done',
  'as if time had all the patience in the world', 'and felt strangely proud',
];

const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

function makeSentence(): string {
  const r = Math.random();
  const core = `${pick(SUBJECTS)} ${pick(ACTIONS)} ${pick(PLACES)}`;
  if (r < 0.4) return `${core}.`;
  if (r < 0.8) return `${core}, ${pick(ENDINGS)}.`;
  return `${pick(PLACES).replace(/^./, (c) => c.toUpperCase())}, ${pick(SUBJECTS).toLowerCase()} ${pick(ACTIONS)} ${pick(ENDINGS)}.`;
}

// ---------- optional corpus file: server/src/game/corpus.txt (one sentence per line) ----------
let corpus: string[] | null = null;
function loadCorpus(): string[] {
  if (corpus) return corpus;
  corpus = [];
  try {
    // works from both src/ (dev) and dist/ (production): both resolve to server/src/game/corpus.txt
    const file = path.resolve(__dirname, '../../src/game/corpus.txt');
    if (fs.existsSync(file)) {
      corpus = fs
        .readFileSync(file, 'utf8')
        .split(/\r?\n/)
        .map((l) => l.replace(/\s+/g, ' ').trim())
        .filter((l) => l.length >= 30 && l.length <= 160 && /^[\x20-\x7e]+$/.test(l));
    }
  } catch {
    corpus = [];
  }
  return corpus;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** One shared text per round; both players always get this exact string. No sentence repeats within a round. */
export function generateText(minLength = 14000): string {
  const base = [...SENTENCES, ...loadCorpus()];
  const used = new Set<string>();
  const out: string[] = [];
  let length = 0;

  const add = (s: string) => {
    if (used.has(s)) return false;
    used.add(s);
    out.push(s);
    length += s.length + 1;
    return true;
  };

  // Mix real sentences and generated ones, using each only once.
  const deck = shuffle(base);
  let i = 0;
  while (length < minLength) {
    const useBase = i < deck.length && Math.random() < 0.35;
    if (useBase) add(deck[i++]);
    else {
      let tries = 0;
      while (!add(makeSentence()) && tries++ < 20);
    }
  }
  return out.join(' ');
}