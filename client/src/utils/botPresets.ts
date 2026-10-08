export interface BotPreset {
  id: string;
  label: string;
  wpm: number;
  accuracy: number;
}

export const BOT_PRESETS: BotPreset[] = [
  { id: 'easy', label: 'EASY', wpm: 30, accuracy: 90 },
  { id: 'medium', label: 'MEDIUM', wpm: 55, accuracy: 95 },
  { id: 'hard', label: 'HARD', wpm: 80, accuracy: 97 },
  { id: 'expert', label: 'EXPERT', wpm: 110, accuracy: 98 },
];

export const DEFAULT_PRESET = BOT_PRESETS[1];