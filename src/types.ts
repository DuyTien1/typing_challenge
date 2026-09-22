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

export interface BestWpmRecord {
  wpm: number;
  mode: string;
  modeName: string;
  timestamp: number;
}

export interface PlayerCultivationInfo {
  level: number;
  realmIndex: number;
  tier: number;
  realmName: string;
  subStage: string;
  thoNguyen: number;
  maxThoNguyen: number;
}

export interface Player {
  id: string;
  username: string;
  icon: string;
  frame?: string;
  showcaseAchievements?: string[];
  cultivation?: PlayerCultivationInfo;
  isLoggedIn?: boolean;
  bestWpm?: number;
  bestWpmRecord?: BestWpmRecord;
  totalGames?: number;
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
  inMatch?: boolean; // true if player is currently in active gameplay; false/undefined if back in waiting room
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

export interface ConditionStatRecord {
  lastWpm: number;
  bestWpm: number;
}

export interface PlayerTitle {
  id: string;
  name: string;
  badge: string;
  type: 'admin' | 'champion' | 'xianxia';
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
  username: string; // Tên đăng nhập
  displayName?: string; // Tên người chơi hiển thị
  userId?: string;
  wpm: number;
  score: number;
  errors: number;
  timestamp: number;
  avatar?: string;
  frame?: string;
}

export interface ChatMessage {
  id: string;
  username: string;
  avatar?: string;
  frame?: string;
  message: string;
  timestamp: number;
  isSystem?: boolean;
  channel: 'global' | 'room';
  roomId?: string;
  isAdmin?: boolean;
}

export interface MysteryWordItem {
  word: string;
  hint: string;
}

export interface KeystrokeEvent {
  key: string;
  time: number;
}

export type WordPoolType = 'vi_dau' | 'vi_nodau' | 'en' | 'numbers' | 'fullsize';

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
  allowedPools?: WordPoolType[];
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

export interface ModeWordCountsConfig {
  vi_dau: number;
  vi_nodau: number;
  en: number;
  numpad: number;
  outplay: number;
}

export interface GameConfig {
  hardWordRate?: number; // legacy fallback
  modeHardWordRates: ModeHardWordRates;
  modeDurations: ModeDurationsConfig;
  modeWordCounts?: ModeWordCountsConfig;
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
      allowedPools?: WordPoolType[];
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
      allowedPools?: WordPoolType[];
    }>;
  };
  sanBoss: {
    difficulties: Record<string, BossDifficultyConfig>;
  };
  _migratedNoDiacriticsDefault_v1?: boolean;
}

export interface GameRoom {
  id: string; // e.g. "VN-4921"
  mode: GameMode;
  hostId: string;
  hostName: string;
  isQuickRoom: boolean;
  status: 'waiting' | 'playing' | 'finished';
  matchId?: string;
  createdAt: number;
  lastActive: number;
  players: Player[];
  difficulty?: DifficultyLevel;
  maxSlots: number;
  words?: string[];
  mysteryWords?: MysteryWordItem[];
}

export interface OnlineUserDetail {
  userId: string;
  tabId: string;
  username: string;
  avatar: string;
  frame?: string;
  bestWpm?: number;
  bestWpmRecord?: BestWpmRecord;
  totalGames?: number;
  currentRoomId?: string | null;
  currentMode?: string | null;
  status: 'lobby' | 'waiting_room' | 'playing' | 'outplay' | 'gameover';
  isAdmin?: boolean;
  ip?: string;
  browser?: string;
  device?: string;
  connectedAt: number;
  lastSeen: number;
  tabCount?: number;
  roomInfo?: {
    roomId: string;
    mode: string;
    modeName: string;
    roomStatus: 'waiting' | 'playing' | 'finished';
    isHost: boolean;
    playerCount: number;
    maxSlots: number;
    playerProgress?: number;
    playerWpm?: number;
    isFinished?: boolean;
    isSurrendered?: boolean;
  } | null;
}

// Chi tiết thống kê cho Chế độ Ngẫu Hứng
export interface NgauHungRoundResult {
  round: number;
  word: string;
  placement: number | null; // 1, 2, 3, or null
  pts: number;
  timeSec: number;
  isPerfect?: boolean;
}

export interface NgauHungGameStats {
  totalRounds: number;
  completedRounds: number;
  top1Count: number;
  top2Count: number;
  top3Count: number;
  bestTimeSec: number | null;
  avgTimeSec: number;
  totalScore: number;
  perfectRounds: number;
  roundHistory: NgauHungRoundResult[];
}

// Chi tiết thống kê cho Chế độ Đoán Chữ
export interface MysteryWordRoundResult {
  round: number;
  word: string;
  category?: string;
  isCorrect: boolean;
  solverName: string;
  pts: number;
  hiddenCount: number;
  solveTimeSec?: number;
}

export interface MysteryWordGameStats {
  totalRounds: number;
  correctGuesses: number;
  accuracyRate: number;
  totalScore: number;
  totalBonusLetters: number;
  fastestGuessSec?: number | null;
  roundHistory: MysteryWordRoundResult[];
}

// Chi tiết thống kê cho Chế độ Săn Boss
export interface BossBattleStats {
  isVictory: boolean;
  totalDamage: number;
  bossMaxHp: number;
  bossRemainingHp: number;
  battleDurationSec: number;
  dps: number;
  maxCombo: number;
  critCount: number;
  critRate: number;
  shieldBreaks: number;
  totalErrors: number;
  chartData?: PerformanceChartPoint[];
}

export interface UserAccount {
  id: string;
  email?: string;
  username: string; // Tên đăng nhập cố định (không thể thay đổi)
  displayName?: string; // Tên người chơi hiển thị trong game
  avatar: string;
  frame: string;
  isAdmin?: boolean;
  showcaseAchievements?: string[];
  unlockedAchievements?: string[];
  isVerified: boolean;
  authProvider: 'google' | 'email';
  createdAt: number;
  cultivationLevel?: number;
  cultivationRealmIndex?: number;
  cultivationTier?: number;
  cultivationThoNguyen?: number;
  cultivationExp?: number;
  cultivationState?: any;
  cultivation?: any;
  bestWpm?: number;
  bestWpmRecord?: any;
  totalGames?: number;
  matchHistory?: any[];
}

export interface AuthResponse {
  success: boolean;
  user?: UserAccount;
  token?: string;
  error?: string;
  needVerify?: boolean;
  devCode?: string;
  message?: string;
}

export interface CultivationLeaderboardEntry {
  rank: number;
  id: string;
  username: string; // Tên đăng nhập
  displayName?: string; // Tên người chơi hiển thị
  avatar: string;
  frame: string;
  level: number;
  realmIndex: number;
  realmName: string;
  realmIcon: string;
  titleName?: string;
  badge: string;
  tier: number;
  subStage: string;
  exp: number;
  maxExp: number;
  thoNguyen: number;
  isRegistered?: boolean;
}
