export interface Player {
  id: string;
  username: string;
  icon: string;
  frame?: string;
  bestWpm?: number;
  bestWpmRecord?: {
    wpm: number;
    mode: string;
    modeName: string;
    timestamp: number;
  };
  totalGames?: number;
  progress: number;
  wpm: number;
  score: number;
  errors: number;
  correctChars: number;
  isFinished: boolean;
  isSurrendered: boolean;
  isAFK: boolean;
  isBot?: boolean;
  botTargetWpm?: number;
  inMatch?: boolean;
}

export interface GameRoom {
  id: string; // e.g. "VN-5111"
  mode: string;
  hostId: string;
  hostName: string;
  isQuickRoom: boolean;
  status: 'waiting' | 'playing' | 'finished';
  matchId?: string;
  createdAt: number;
  lastActive: number;
  players: Player[];
  difficulty?: string;
  maxSlots: number;
  words?: string[];
  mysteryWords?: any[];
}

export interface ServerChatMessage {
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

export interface ServerHighScoreRecord {
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

export interface ServerUserRecord {
  id: string;
  email?: string;
  username: string;
  displayName?: string;
  avatar: string;
  frame: string;
  isAdmin?: boolean;
  showcaseAchievements?: string[];
  unlockedAchievements?: string[];
  authProvider: 'google' | 'email';
  passwordHash?: string;
  salt?: string;
  verifyCode?: string;
  verifyExpires?: number;
  isVerified: boolean;
  sessionTokens: string[];
  cultivation?: any;
  bestWpm?: number;
  bestWpmRecord?: any;
  totalGames?: number;
  matchHistory?: any[];
  createdAt: number;
  updatedAt: number;
}

export interface ActivePresenceSession {
  userId: string;
  tabId: string;
  username: string;
  avatar?: string;
  frame?: string;
  bestWpm?: number;
  bestWpmRecord?: any;
  totalGames?: number;
  currentRoomId?: string | null;
  currentMode?: string | null;
  status: 'idle' | 'in_room' | 'in_game';
  isAdmin?: boolean;
  ip?: string;
  browser?: string;
  device?: string;
  connectedAt: number;
  lastSeen: number;
}
