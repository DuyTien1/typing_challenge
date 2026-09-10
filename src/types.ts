export type GameMode =
  | 'vi_dau'
  | 'vi_nodau'
  | 'en'
  | 'numpad'
  | 'ngau_hung'
  | 'doan_chu'
  | 'san_boss'
  | 'outplay';

export type DifficultyLevel = 'normal' | 'hard' | 'legendary' | 'hell' | 'custom' | 'number' | 'fullsize';

export interface Player {
  id: string;
  username: string;
  icon: string;
  progress: number;
  wpm: number;
  score: number;
  errors: number;
  correctChars: number;
  consistency?: number;
  accuracy?: number;
  lastWpm?: number;
  sessionBestWpm?: number;
  ghostDiff?: {
    ghostWpm: number;
    wpmDiff: number;
    leadChars: number;
    paceLabel: string;
  };
  chartData?: PerformanceChartPoint[];
  isFinished: boolean;
  isSurrendered: boolean;
  isAFK: boolean;
  isBot?: boolean;
  botTargetWpm?: number;
}

export interface PerformanceChartPoint {
  second: number;
  playerWpm: number;
  rawWpm?: number;
  ghostWpm?: number;
  sessionBestWpm?: number;
  errors: number;
  errorPlot?: number | null;
}

export interface PlayerTitle {
  id: string;
  name: string;
  badge: string;
  type: 'admin' | 'champion';
  mode?: string;
  modeName: string;
  colorClass: string;
  borderClass: string;
  glowClass: string;
  description: string;
  statLabel: string;
  statValue: string;
  tag: string;
}

export interface BossSkillRates {
  shield: number;
  shake: number;
  smoke: number;
  reverse: number;
  capslock: number;
}

export interface BossState {
  name: string;
  icon: string;
  hp: number;
  maxHp: number;
  shield: number;
  maxShield: number;
  isShieldActive: boolean;
  isStunned: boolean;
  isCapsLockActive: boolean;
  duration: number;
  shieldDuration: number;
  stunDuration: number;
  shakeDuration: number;
  smokeDuration: number;
  reverseDuration: number;
  capslockDuration: number;
  activeSkill: 'shield' | 'capslock' | 'shake' | 'smoke' | 'reverse' | null;
  skillWarning: { skill: string; countdown: number } | null;
  selfDestructTarget: number;
  skillInterval: number;
  skillWarningDuration: number;
  shieldHpPerPlayer: number;
  skillRates?: BossSkillRates;
}

export interface HighScoreRecord {
  username: string;
  wpm: number;
  score: number;
  errors: number;
  timestamp: number;
}

export interface ChatMessage {
  id: string;
  username: string;
  message: string;
  timestamp: number;
  isSystem?: boolean;
  channel: 'global' | 'room';
}

export interface MysteryWordItem {
  word: string;
  hint: string;
}

export interface KeystrokeEvent {
  key: string;
  time: number;
}

export interface ModeDurationsConfig {
  vi_dau: number;
  vi_nodau: number;
  en: number;
  numpad: number;
  outplay: number;
}

export interface BossDifficultyConfig {
  name: string;
  icon: string;
  color: string;
  duration: number;
  baseHp: number;
  hpPerPlayer: number;
  selfDestructTarget: number;
  skillInterval: number;
  skillWarningDuration: number;
  shieldDuration: number;
  shieldHpPerPlayer: number;
  stunDuration: number;
  shakeDuration: number;
  smokeDuration: number;
  reverseDuration: number;
  capslockDuration: number;
  skillRates: BossSkillRates;
}

export interface ModeHardWordRates {
  vi_dau: number;     // 0 - 100%
  vi_nodau: number;   // 0 - 100%
  en: number;         // 0 - 100%
  ngau_hung: number;  // 0 - 100%
  san_boss: number;   // 0 - 100%
  outplay: number;    // 0 - 100%
  numpad: number;     // 0 - 100%
}

export interface GameConfig {
  hardWordRate?: number; // legacy fallback
  modeHardWordRates: ModeHardWordRates;
  modeDurations: ModeDurationsConfig;
  normalRace: {
    duration: number;
    wordCount: number;
  };
  numpad: {
    duration: number;
    wordCount: number;
  };
  ngauHung: {
    difficulties: Record<string, {
      name: string;
      icon: string;
      color: string;
      roundDuration: number;
      intermissionDuration: number;
      totalRounds: number;
    }>;
  };
  doanChu: {
    difficulties: Record<string, {
      name: string;
      icon: string;
      color: string;
      roundDuration: number;
      revealInterval: number;
      intermissionDuration: number;
      totalRounds: number;
      showHint: boolean;
    }>;
  };
  sanBoss: {
    difficulties: Record<string, BossDifficultyConfig>;
  };
}
