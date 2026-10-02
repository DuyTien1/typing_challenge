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
  isLoggedIn?: boolean;
  cultivation?: any;
  botTargetWpm?: number;
  inMatch?: boolean;
}

export interface GameRoom {
  id: string; // e.g. "VN-5111"
  mode: string;
  hostId: string;
  hostName: string;
  isQuickRoom: boolean;
  isWorldRoom?: boolean;
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
  channel: 'global' | 'sect' | 'room' | 'whisper';
  roomId?: string;
  sectId?: string;
  whisperTarget?: string;
  whisperTargetUserId?: string;
  senderUserId?: string;
  senderRealm?: string;
  senderRealmIcon?: string;
  senderSectTag?: string;
  isAdmin?: boolean;
  isDaoBot?: boolean;
  daoEventType?: 'penalty' | 'record' | 'breakthrough' | 'boss_kill' | 'guidance' | 'announcement';
  daoTitle?: string;
  cardType?: 'battle_challenge' | 'record_share' | 'item_share' | 'roll_result' | 'tea_gift';
  cardData?: any;
}

export interface ServerFriendshipRecord {
  id: string;
  user1Id: string;
  user2Id: string;
  intimacy: number; // 0 - 5000+
  isDaoLu?: boolean;
  daoLuTitle?: string;
  lastGiftTeaDate?: { [userId: string]: string }; // userId -> YYYY-MM-DD
  lastGuidedDate?: { [userId: string]: string }; // userId -> YYYY-MM-DD
  createdAt: number;
  updatedAt: number;
}

export interface ServerFriendRequestRecord {
  id: string;
  fromUserId: string;
  fromUsername?: string;
  toUserId: string;
  toUsername?: string;
  message?: string;
  createdAt: number;
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
  accuracy?: number;
  isVerified?: boolean;
  sectName?: string;
  sectTag?: string;
  sectRole?: string;
  realmName?: string;
  realmIcon?: string;
  level?: number;
}

export interface ServerLeaderboardEntry {
  rank: number;
  userId?: string;
  username: string;
  displayName?: string;
  avatar?: string;
  frame?: string;
  wpm: number;
  score: number;
  errors: number;
  accuracy: number;
  consistency?: number;
  timestamp: number;
  isVerified?: boolean;
  realmName?: string;
  realmIcon?: string;
  level?: number;
  sectName?: string;
  sectTag?: string;
  sectRole?: string;
  keyboardSwitch?: string;
}

export interface ServerMultiLeaderboard {
  highScores: Record<string, ServerHighScoreRecord | null>;
  rankings: Record<
    string,
    {
      daily: ServerLeaderboardEntry[];
      weekly: ServerLeaderboardEntry[];
      all_time: ServerLeaderboardEntry[];
    }
  >;
  lastResetDate: string; // YYYY-MM-DD
  lastResetWeek: string; // YYYY-Wxx
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

export interface ShopItem {
  id: string;
  category: 'herbs' | 'pills' | 'friendship' | 'customization';
  name: string;
  desc: string;
  icon: string;
  itemType: 'herb' | 'pill' | 'tea' | 'frame';
  targetKey: string;
  price: number;
  dailyLimit: number;
  discountPercent: number;
  enabled: boolean;
}

export interface MarketListing {
  id: string;
  sellerId: string;
  sellerUsername: string;
  sellerAvatar: string;
  sellerFrame: string;
  itemType: 'herb' | 'pill' | 'tea' | 'artifact_fragment';
  itemId: string;
  itemName: string;
  itemIcon: string;
  quality: 'ha_pham' | 'trung_pham' | 'thuong_pham' | 'cuc_pham';
  quantity: number;
  pricePerUnit: number;
  totalPrice: number;
  listedAt: number;
  expiresAt: number;
  status: 'active' | 'sold' | 'cancelled' | 'takedown_by_admin';
  buyerId?: string;
  buyerUsername?: string;
  soldAt?: number;
}

export interface MarketLog {
  id: string;
  type: 'buy' | 'list' | 'cancel' | 'admin_takedown' | 'admin_grant' | 'admin_deduct';
  details: string;
  timestamp: number;
  actorUsername: string;
  targetUsername?: string;
  amount?: number;
}
