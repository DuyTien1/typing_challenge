import express from 'express';
import path from 'path';
import fs from 'fs';
import http from 'http';
import crypto from 'crypto';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';

import {
  Player,
  GameRoom,
  ServerChatMessage,
  ServerHighScoreRecord,
  ServerUserRecord,
  ActivePresenceSession,
  ServerFriendshipRecord,
  ServerFriendRequestRecord,
} from './server/types';
import { normalizeRoomCode, getModeDisplayName, hashPassword } from './server/utils';

// In-memory rooms store
const rooms = new Map<string, GameRoom>();
const sseClientsByRoom = new Map<string, Set<express.Response>>();

const globalChatMessages: ServerChatMessage[] = [
  {
    id: 'sys-welcome',
    username: 'Hệ Thống',
    avatar: '🤖',
    frame: 'admin_gold',
    message: 'Chào mừng bạn đến với FastTyping Challenge v4.0! Hãy rèn luyện và xác lập kỷ lục mới trên Bảng Vàng.',
    timestamp: Date.now(),
    isSystem: true,
    channel: 'global',
  },
];

const roomChatMessages = new Map<string, ServerChatMessage[]>();

// Real Leaderboard Storage (Persistent to leaderboard.json)
const LEADERBOARD_FILE = path.join(process.cwd(), 'leaderboard.json');

function loadLeaderboardFromFile(): Record<string, ServerHighScoreRecord | null> {
  try {
    if (fs.existsSync(LEADERBOARD_FILE)) {
      const content = fs.readFileSync(LEADERBOARD_FILE, 'utf-8');
      const data = JSON.parse(content);
      if (data && typeof data === 'object') {
        const clean: Record<string, ServerHighScoreRecord | null> = {
          vi_dau: null,
          vi_nodau: null,
          en: null,
          numpad: null,
          ngau_hung: null,
          doan_chu: null,
          san_boss: null,
        };
        const mockNames = new Set(['GiaCátGõ', 'LướtGió', 'QuickFox', 'KếToánViên', 'ChớpNhoáng', 'ThámTửPhím', 'DũngSĩRồng', 'PhímThần_VN']);
        for (const [key, value] of Object.entries(data)) {
          const rec = value as ServerHighScoreRecord | null;
          if (rec && typeof rec === 'object' && rec.username && !mockNames.has(rec.username.trim())) {
            clean[key] = {
              ...rec,
              displayName: rec.displayName || rec.username,
            };
          }
        }
        return clean;
      }
    }
  } catch (err) {
    console.error('Error reading leaderboard file:', err);
  }
  return {
    vi_dau: null,
    vi_nodau: null,
    en: null,
    numpad: null,
    ngau_hung: null,
    doan_chu: null,
    san_boss: null,
  };
}

let serverHighScores = loadLeaderboardFromFile();

function saveLeaderboardToFile() {
  try {
    fs.writeFileSync(LEADERBOARD_FILE, JSON.stringify(serverHighScores, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving leaderboard file:', err);
  }
}

// User Account Storage (Persistent to users.json - no external database required)
const USERS_FILE = path.join(process.cwd(), 'users.json');

function ensureDefaultAdminUser(map: Map<string, ServerUserRecord>): boolean {
  let adminUser: ServerUserRecord | undefined;
  for (const u of map.values()) {
    if (String(u.username || '').toLowerCase() === 'admin' || u.id === 'usr_admin_default') {
      adminUser = u;
      break;
    }
  }

  if (!adminUser) {
    const salt = 'f8a7e4b2c1d3e5f60718293a4b5c6d7e';
    const passwordHash = hashPassword('admin123', salt);
    const newAdmin: ServerUserRecord = {
      id: 'usr_admin_default',
      email: '',
      username: 'admin',
      displayName: 'Admin',
      avatar: '👑',
      frame: 'admin_gold',
      isAdmin: true,
      authProvider: 'email',
      passwordHash,
      salt,
      isVerified: true,
      sessionTokens: [],
      showcaseAchievements: ['speed_100', 'pve_boss_win', 'pvp_first_win', 'hidden_top1'],
      unlockedAchievements: [
        'speed_40', 'speed_60', 'speed_80', 'speed_100', 'speed_120', 'speed_140', 'speed_160',
        'acc_95', 'acc_98', 'acc_100_once', 'acc_100_3x', 'acc_100_10x',
        'matches_10', 'matches_30', 'matches_75', 'matches_150', 'matches_300', 'matches_500',
        'pve_boss_win', 'pve_boss_hell', 'pve_mystery_word', 'pve_rush_high', 'pve_outplay_beat',
        'numpad_intro', 'numpad_50', 'numpad_75', 'numpad_100',
        'pvp_first_win', 'pvp_streak_3', 'pvp_streak_5', 'pvp_streak_10',
        'hidden_night', 'hidden_midnight', 'hidden_verified_dao', 'hidden_top1'
      ],
      createdAt: 1700000000000,
      updatedAt: Date.now(),
    };
    map.set(newAdmin.id, newAdmin);
    return true;
  } else {
    // Ensure admin flags are set
    adminUser.isAdmin = true;
    if (!adminUser.displayName) {
      adminUser.displayName = 'Admin';
    }
    if (!adminUser.frame || adminUser.frame === 'default') {
      adminUser.frame = 'admin_gold';
    }
    // Clean up legacy invalid achievement IDs from existing admin record
    const legacyInvalid = new Set(['god_speed', 'boss_slayer', 'mythic_master', 'first_win', 'streak_3']);
    if (Array.isArray(adminUser.showcaseAchievements)) {
      adminUser.showcaseAchievements = adminUser.showcaseAchievements.filter((id) => !legacyInvalid.has(id));
      if (adminUser.showcaseAchievements.length === 0) {
        adminUser.showcaseAchievements = ['speed_100', 'pve_boss_win', 'pvp_first_win', 'hidden_top1'];
      }
    }
    if (Array.isArray(adminUser.unlockedAchievements)) {
      adminUser.unlockedAchievements = adminUser.unlockedAchievements.filter((id) => !legacyInvalid.has(id));
      if (adminUser.unlockedAchievements.length < 5) {
        adminUser.unlockedAchievements = [
          'speed_40', 'speed_60', 'speed_80', 'speed_100', 'speed_120', 'speed_140', 'speed_160',
          'acc_95', 'acc_98', 'acc_100_once', 'acc_100_3x', 'acc_100_10x',
          'matches_10', 'matches_30', 'matches_75', 'matches_150', 'matches_300', 'matches_500',
          'pve_boss_win', 'pve_boss_hell', 'pve_mystery_word', 'pve_rush_high', 'pve_outplay_beat',
          'numpad_intro', 'numpad_50', 'numpad_75', 'numpad_100',
          'pvp_first_win', 'pvp_streak_3', 'pvp_streak_5', 'pvp_streak_10',
          'hidden_night', 'hidden_midnight', 'hidden_verified_dao', 'hidden_top1'
        ];
      }
    }
    return false;
  }
}

function loadUsersFromFile(): Map<string, ServerUserRecord> {
  const map = new Map<string, ServerUserRecord>();
  let needsSave = false;
  try {
    if (fs.existsSync(USERS_FILE)) {
      const content = fs.readFileSync(USERS_FILE, 'utf-8');
      const data = JSON.parse(content);
      if (Array.isArray(data)) {
        for (const u of data) {
          if (u && u.id) {
            if (!u.displayName) {
              u.displayName = u.username;
              needsSave = true;
            }
            map.set(u.id, u);
          }
        }
      } else if (data && typeof data === 'object') {
        for (const [id, u] of Object.entries(data)) {
          if (u && typeof u === 'object') {
            const rec = u as ServerUserRecord;
            if (!rec.displayName) {
              rec.displayName = rec.username;
              needsSave = true;
            }
            map.set(id, rec);
          }
        }
      }
    }
  } catch (err) {
    console.error('Error reading users.json:', err);
  }

  const added = ensureDefaultAdminUser(map);
  if (added || needsSave) {
    try {
      const obj: Record<string, ServerUserRecord> = {};
      for (const [id, u] of map.entries()) {
        obj[id] = u;
      }
      fs.writeFileSync(USERS_FILE, JSON.stringify(obj, null, 2), 'utf-8');
    } catch {
      // ignore
    }
  }

  return map;
}

const serverUsers = loadUsersFromFile();

function saveUsersToFile() {
  try {
    const obj: Record<string, ServerUserRecord> = {};
    for (const [id, u] of serverUsers.entries()) {
      obj[id] = u;
    }
    fs.writeFileSync(USERS_FILE, JSON.stringify(obj, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving users.json:', err);
  }
}

export const XIANXIA_REALM_METAS = [
  { name: 'Luyện Khí Kỳ', titleName: 'Luyện Khí Tu Sĩ', icon: '🌿', badge: 'Khí', frameId: 'frame_xianxia_luyenkhi', startLevel: 1, endLevel: 30 },
  { name: 'Trúc Cơ Kỳ', titleName: 'Trúc Cơ Chân Nhân', icon: '🧱', badge: 'Cơ', frameId: 'frame_xianxia_trucco', startLevel: 31, endLevel: 70 },
  { name: 'Kết Đan Kỳ', titleName: 'Kim Đan Tông Sư', icon: '🔮', badge: 'Đan', frameId: 'frame_xianxia_ketdan', startLevel: 71, endLevel: 130 },
  { name: 'Nguyên Anh Kỳ', titleName: 'Nguyên Anh Lão Quái', icon: '👶', badge: 'Anh', frameId: 'frame_xianxia_nguyenanh', startLevel: 131, endLevel: 210 },
  { name: 'Hóa Thần Kỳ', titleName: 'Hóa Thần Tôn Giả', icon: '🌌', badge: 'Thần', frameId: 'frame_xianxia_hoathan', startLevel: 211, endLevel: 310 },
  { name: 'Luyện Hư Kỳ', titleName: 'Luyện Hư Thần Quân', icon: '🌀', badge: 'Hư', frameId: 'frame_xianxia_luyenhu', startLevel: 311, endLevel: 430 },
  { name: 'Hợp Thể Kỳ', titleName: 'Hợp Thể Thánh Quân', icon: '⚡', badge: 'Thể', frameId: 'frame_xianxia_hopthe', startLevel: 431, endLevel: 570 },
  { name: 'Đại Thừa Kỳ', titleName: 'Đại Thừa Chí Tôn', icon: '☀️', badge: 'Thừa', frameId: 'frame_xianxia_daithua', startLevel: 571, endLevel: 720 },
  { name: 'Độ Kiếp Kỳ', titleName: 'Độ Kiếp Tiên Tôn', icon: '🌩️', badge: 'Kiếp', frameId: 'frame_xianxia_dokiep', startLevel: 721, endLevel: 870 },
  { name: 'Kim Tiên', titleName: 'Bất Hủ Kim Tiên', icon: '🌟', badge: 'Kim', frameId: 'frame_xianxia_kimtien', startLevel: 871, endLevel: 940 },
  { name: 'Đại La Tiên', titleName: 'Đại La Kim Tiên', icon: '🌠', badge: 'La', frameId: 'frame_xianxia_daila', startLevel: 941, endLevel: 980 },
  { name: 'Thiên Tôn', titleName: 'Hỗn Độn Thiên Tôn', icon: '👑', badge: 'Tôn', frameId: 'frame_xianxia_thienton', startLevel: 981, endLevel: 1000 },
];

// =========================================================================
// HỆ THỐNG TÔNG MÔN - PERSISTENT STORAGE (sects.json)
// =========================================================================
const SECTS_FILE = path.join(process.cwd(), 'sects.json');

export interface ServerSectMemberRecord {
  userId: string;
  username: string;
  displayName?: string;
  avatar: string;
  frame?: string;
  role: 'chuong_mon' | 'dai_truong_lao' | 'chan_truyen' | 'noi_mon' | 'ngoai_mon';
  contribution: number;
  realmIndex: number;
  realmName: string;
  realmIcon: string;
  level: number;
  tier: number;
  exp: number;
  tuViScore: number;
  joinedAt: number;
  lastActive?: number;
}

export interface ServerSectRecord {
  id: string;
  name: string;
  tag: string;
  description: string;
  leaderId: string;
  leaderName: string;
  leaderAvatar?: string;
  leaderFrame?: string;
  leaderRealmName?: string;
  leaderLevel?: number;
  linhMachLevel: number;
  totalContribution: number;
  memberCount: number;
  totalTuVi: number;
  avgLevel?: number;
  avgRealmName?: string;
  badgeIcon: string;
  slogan?: string;
  bannerColor?: string;
  weeklyTournamentPoints?: number;
  isHoldingThienCung?: boolean;
  members: ServerSectMemberRecord[];
  createdAt?: number;
  worldBoss?: any;
}

const DEFAULT_SERVER_SECTS: ServerSectRecord[] = [
  {
    id: 'sect_thuc_son',
    name: 'Thục Sơn Kiếm Phái',
    tag: 'Thục Sơn',
    description: 'Kiếm tu đệ nhất thiên hạ, vạn kiếm quy tông, ngự kiếm trảm yêu trừ ma.',
    leaderId: 'leader_thuc_son',
    leaderName: 'Độc Cô Kiếm Tôn',
    leaderAvatar: '⚔️',
    leaderFrame: 'frame_xianxia_dokiep',
    leaderRealmName: 'Độ Kiếp Kỳ',
    leaderLevel: 820,
    linhMachLevel: 3,
    totalContribution: 24500,
    memberCount: 8,
    totalTuVi: 40007000,
    avgLevel: 375,
    avgRealmName: 'Hóa Thần Kỳ',
    badgeIcon: '⚔️',
    slogan: 'Vạn Kiếm Quy Nhất • Trảm Phá Thái Hư',
    bannerColor: '#38bdf8',
    weeklyTournamentPoints: 840,
    isHoldingThienCung: true,
    worldBoss: {
      id: 'boss_hac_long',
      name: 'Thái Cổ Hắc Long',
      icon: '🐉',
      hp: 154000,
      maxHp: 200000,
      level: 10,
      isDefeated: false,
      lastResetTime: Date.now(),
    },
    members: [
      {
        userId: 'thuc_son_1',
        username: 'Độc Cô Kiếm Tôn',
        displayName: 'Độc Cô Kiếm Tôn',
        avatar: '⚔️',
        frame: 'frame_xianxia_dokiep',
        role: 'chuong_mon',
        contribution: 12000,
        realmIndex: 8,
        realmName: 'Độ Kiếp Kỳ',
        realmIcon: '🌩️',
        level: 820,
        tier: 8,
        exp: 820000,
        tuViScore: 8820000,
        joinedAt: Date.now() - 30 * 86400000,
      },
      {
        userId: 'thuc_son_2',
        username: 'Thanh Hư Chân Nhân',
        displayName: 'Thanh Hư Chân Nhân',
        avatar: '🧙‍♂️',
        frame: 'frame_xianxia_daithua',
        role: 'dai_truong_lao',
        contribution: 5800,
        realmIndex: 7,
        realmName: 'Đại Thừa Kỳ',
        realmIcon: '☀️',
        level: 650,
        tier: 6,
        exp: 650000,
        tuViScore: 7650000,
        joinedAt: Date.now() - 25 * 86400000,
      },
      {
        userId: 'thuc_son_3',
        username: 'Lăng Phong Kiếm Sĩ',
        displayName: 'Lăng Phong Kiếm Sĩ',
        avatar: '🗡️',
        frame: 'frame_xianxia_hopthe',
        role: 'chan_truyen',
        contribution: 2900,
        realmIndex: 6,
        realmName: 'Hợp Thể Kỳ',
        realmIcon: '⚡',
        level: 480,
        tier: 5,
        exp: 480000,
        tuViScore: 6480000,
        joinedAt: Date.now() - 20 * 86400000,
      },
      {
        userId: 'thuc_son_4',
        username: 'Vân Dao Kiếm Nữ',
        displayName: 'Vân Dao Kiếm Nữ',
        avatar: '🧝‍♀️',
        frame: 'frame_xianxia_hopthe',
        role: 'chan_truyen',
        contribution: 2400,
        realmIndex: 6,
        realmName: 'Hợp Thể Kỳ',
        realmIcon: '⚡',
        level: 450,
        tier: 4,
        exp: 450000,
        tuViScore: 6450000,
        joinedAt: Date.now() - 18 * 86400000,
      },
      {
        userId: 'thuc_son_5',
        username: 'Hàn Lập',
        displayName: 'Hàn Lập',
        avatar: '🌿',
        frame: 'frame_xianxia_hoathan',
        role: 'noi_mon',
        contribution: 850,
        realmIndex: 4,
        realmName: 'Hóa Thần Kỳ',
        realmIcon: '🌌',
        level: 270,
        tier: 4,
        exp: 270000,
        tuViScore: 4270000,
        joinedAt: Date.now() - 14 * 86400000,
      },
      {
        userId: 'thuc_son_6',
        username: 'Diệp Thần',
        displayName: 'Diệp Thần',
        avatar: '🔥',
        frame: 'frame_xianxia_hoathan',
        role: 'noi_mon',
        contribution: 720,
        realmIndex: 4,
        realmName: 'Hóa Thần Kỳ',
        realmIcon: '🌌',
        level: 240,
        tier: 3,
        exp: 240000,
        tuViScore: 4240000,
        joinedAt: Date.now() - 12 * 86400000,
      },
      {
        userId: 'thuc_son_7',
        username: 'Trương Đan',
        displayName: 'Trương Đan',
        avatar: '🧱',
        frame: 'frame_xianxia_trucco',
        role: 'ngoai_mon',
        contribution: 180,
        realmIndex: 1,
        realmName: 'Trúc Cơ Kỳ',
        realmIcon: '🧱',
        level: 55,
        tier: 2,
        exp: 55000,
        tuViScore: 1055000,
        joinedAt: Date.now() - 5 * 86400000,
      },
      {
        userId: 'thuc_son_8',
        username: 'Lục Tuyết',
        displayName: 'Lục Tuyết',
        avatar: '❄️',
        frame: 'frame_xianxia_trucco',
        role: 'ngoai_mon',
        contribution: 150,
        realmIndex: 1,
        realmName: 'Trúc Cơ Kỳ',
        realmIcon: '🧱',
        level: 42,
        tier: 1,
        exp: 42000,
        tuViScore: 1042000,
        joinedAt: Date.now() - 3 * 86400000,
      },
    ],
  },
  {
    id: 'sect_cuu_trong',
    name: 'Cửu Trọng Thiên',
    tag: 'Cửu Trọng',
    description: 'Chưởng quản lôi đình cửu thiên, uy trấn bát hoang lục hợp vô địch.',
    leaderId: 'leader_cuu_trong',
    leaderName: 'Cửu Thiên Thần Quân',
    leaderAvatar: '⚡',
    leaderFrame: 'frame_xianxia_dokiep',
    leaderRealmName: 'Độ Kiếp Kỳ',
    leaderLevel: 850,
    linhMachLevel: 4,
    totalContribution: 38900,
    memberCount: 6,
    totalTuVi: 35900000,
    avgLevel: 483,
    avgRealmName: 'Hợp Thể Kỳ',
    badgeIcon: '⚡',
    slogan: 'Lôi Đình Vạn Trượng • Chấn Nhiếp Bát Hoang',
    bannerColor: '#facc15',
    weeklyTournamentPoints: 780,
    isHoldingThienCung: false,
    worldBoss: {
      id: 'boss_hoa_phuong',
      name: 'Cửu Thiên Hỏa Phượng',
      icon: '🦅',
      hp: 195000,
      maxHp: 250000,
      level: 12,
      isDefeated: false,
      lastResetTime: Date.now(),
    },
    members: [
      {
        userId: 'cuu_trong_1',
        username: 'Cửu Thiên Thần Quân',
        displayName: 'Cửu Thiên Thần Quân',
        avatar: '⚡',
        frame: 'frame_xianxia_dokiep',
        role: 'chuong_mon',
        contribution: 15000,
        realmIndex: 8,
        realmName: 'Độ Kiếp Kỳ',
        realmIcon: '🌩️',
        level: 850,
        tier: 9,
        exp: 850000,
        tuViScore: 8850000,
        joinedAt: Date.now() - 35 * 86400000,
      },
      {
        userId: 'cuu_trong_2',
        username: 'Lôi Chấn Tử',
        displayName: 'Lôi Chấn Tử',
        avatar: '🌩️',
        frame: 'frame_xianxia_daithua',
        role: 'dai_truong_lao',
        contribution: 8200,
        realmIndex: 7,
        realmName: 'Đại Thừa Kỳ',
        realmIcon: '☀️',
        level: 680,
        tier: 7,
        exp: 680000,
        tuViScore: 7680000,
        joinedAt: Date.now() - 28 * 86400000,
      },
      {
        userId: 'cuu_trong_3',
        username: 'Phong Lôi Tiên Tử',
        displayName: 'Phong Lôi Tiên Tử',
        avatar: '🌪️',
        frame: 'frame_xianxia_hopthe',
        role: 'chan_truyen',
        contribution: 3200,
        realmIndex: 6,
        realmName: 'Hợp Thể Kỳ',
        realmIcon: '⚡',
        level: 490,
        tier: 5,
        exp: 490000,
        tuViScore: 6490000,
        joinedAt: Date.now() - 22 * 86400000,
      },
      {
        userId: 'cuu_trong_4',
        username: 'Thần Tiêu Kiếm Hiệp',
        displayName: 'Thần Tiêu Kiếm Hiệp',
        avatar: '🗡️',
        frame: 'frame_xianxia_hopthe',
        role: 'chan_truyen',
        contribution: 2600,
        realmIndex: 6,
        realmName: 'Hợp Thể Kỳ',
        realmIcon: '⚡',
        level: 460,
        tier: 4,
        exp: 460000,
        tuViScore: 6460000,
        joinedAt: Date.now() - 17 * 86400000,
      },
      {
        userId: 'cuu_trong_5',
        username: 'Lôi Bạo Cuồng Đao',
        displayName: 'Lôi Bạo Cuồng Đao',
        avatar: '⚔️',
        frame: 'frame_xianxia_luyenhu',
        role: 'noi_mon',
        contribution: 980,
        realmIndex: 5,
        realmName: 'Luyện Hư Kỳ',
        realmIcon: '🌀',
        level: 360,
        tier: 3,
        exp: 360000,
        tuViScore: 5360000,
        joinedAt: Date.now() - 10 * 86400000,
      },
      {
        userId: 'cuu_trong_6',
        username: 'Lôi Đình Tiểu Sinh',
        displayName: 'Lôi Đình Tiểu Sinh',
        avatar: '👦',
        frame: 'frame_xianxia_trucco',
        role: 'ngoai_mon',
        contribution: 120,
        realmIndex: 1,
        realmName: 'Trúc Cơ Kỳ',
        realmIcon: '🧱',
        level: 60,
        tier: 2,
        exp: 60000,
        tuViScore: 1060000,
        joinedAt: Date.now() - 4 * 86400000,
      },
    ],
  },
  {
    id: 'sect_van_kiem',
    name: 'Vạn Kiếm Quy Tông',
    tag: 'Vạn Kiếm',
    description: 'Kiếm ý thông thiên triệt địa, một kiếm phá vạn pháp khai mở thái hư.',
    leaderId: 'leader_van_kiem',
    leaderName: 'Vô Nhai Kiếm Thánh',
    leaderAvatar: '🗡️',
    leaderFrame: 'frame_xianxia_daithua',
    leaderRealmName: 'Đại Thừa Kỳ',
    leaderLevel: 710,
    linhMachLevel: 3,
    totalContribution: 29400,
    memberCount: 5,
    totalTuVi: 26065000,
    avgLevel: 413,
    avgRealmName: 'Hóa Thần Kỳ',
    badgeIcon: '🗡️',
    slogan: 'Nhất Kiếm Đoạt Mệnh • Khai Mở Càn Khôn',
    bannerColor: '#a855f7',
    weeklyTournamentPoints: 710,
    isHoldingThienCung: false,
    worldBoss: {
      id: 'boss_bach_ho',
      name: 'Thần Thú Bạch Hổ',
      icon: '🐯',
      hp: 140000,
      maxHp: 200000,
      level: 9,
      isDefeated: false,
      lastResetTime: Date.now(),
    },
    members: [
      {
        userId: 'van_kiem_1',
        username: 'Vô Nhai Kiếm Thánh',
        displayName: 'Vô Nhai Kiếm Thánh',
        avatar: '🗡️',
        frame: 'frame_xianxia_daithua',
        role: 'chuong_mon',
        contribution: 11000,
        realmIndex: 7,
        realmName: 'Đại Thừa Kỳ',
        realmIcon: '☀️',
        level: 710,
        tier: 8,
        exp: 710000,
        tuViScore: 7710000,
        joinedAt: Date.now() - 29 * 86400000,
      },
      {
        userId: 'van_kiem_2',
        username: 'Tàng Kiếm Lão Nhân',
        displayName: 'Tàng Kiếm Lão Nhân',
        avatar: '🧙‍♂️',
        frame: 'frame_xianxia_hopthe',
        role: 'dai_truong_lao',
        contribution: 6200,
        realmIndex: 6,
        realmName: 'Hợp Thể Kỳ',
        realmIcon: '⚡',
        level: 560,
        tier: 6,
        exp: 560000,
        tuViScore: 6560000,
        joinedAt: Date.now() - 21 * 86400000,
      },
      {
        userId: 'van_kiem_3',
        username: 'Kiếm Vô Ngấn',
        displayName: 'Kiếm Vô Ngấn',
        avatar: '⚔️',
        frame: 'frame_xianxia_luyenhu',
        role: 'chan_truyen',
        contribution: 2700,
        realmIndex: 5,
        realmName: 'Luyện Hư Kỳ',
        realmIcon: '🌀',
        level: 410,
        tier: 4,
        exp: 410000,
        tuViScore: 5410000,
        joinedAt: Date.now() - 15 * 86400000,
      },
      {
        userId: 'van_kiem_4',
        username: 'Mặc Kiếm Khách',
        displayName: 'Mặc Kiếm Khách',
        avatar: '🥷',
        frame: 'frame_xianxia_hoathan',
        role: 'noi_mon',
        contribution: 920,
        realmIndex: 4,
        realmName: 'Hóa Thần Kỳ',
        realmIcon: '🌌',
        level: 290,
        tier: 3,
        exp: 290000,
        tuViScore: 4290000,
        joinedAt: Date.now() - 9 * 86400000,
      },
      {
        userId: 'van_kiem_5',
        username: 'Tố Kiếm Đệ Tử',
        displayName: 'Tố Kiếm Đệ Tử',
        avatar: '🌸',
        frame: 'frame_xianxia_ketdan',
        role: 'ngoai_mon',
        contribution: 210,
        realmIndex: 2,
        realmName: 'Kết Đan Kỳ',
        realmIcon: '🔮',
        level: 95,
        tier: 2,
        exp: 95000,
        tuViScore: 2095000,
        joinedAt: Date.now() - 4 * 86400000,
      },
    ],
  },
  {
    id: 'sect_tieu_dao',
    name: 'Tiêu Dao Cung',
    tag: 'Tiêu Dao',
    description: 'Tiêu dao tự tại giữa đất trời, tâm như chỉ thủy, thân tự phù vân ngao du vạn dặm.',
    leaderId: 'leader_tieu_dao',
    leaderName: 'Tiêu Dao Tử',
    leaderAvatar: '🪷',
    leaderFrame: 'frame_xianxia_daithua',
    leaderRealmName: 'Đại Thừa Kỳ',
    leaderLevel: 690,
    linhMachLevel: 2,
    totalContribution: 16800,
    memberCount: 5,
    totalTuVi: 25978000,
    avgLevel: 395,
    avgRealmName: 'Hóa Thần Kỳ',
    badgeIcon: '🪷',
    slogan: 'Tiêu Dao Tự Tại • Đạo Pháp Tự Nhiên',
    bannerColor: '#34d399',
    weeklyTournamentPoints: 620,
    isHoldingThienCung: false,
    worldBoss: {
      id: 'boss_ky_lan',
      name: 'Hồng Hoang Kỳ Lân',
      icon: '🦄',
      hp: 120000,
      maxHp: 180000,
      level: 8,
      isDefeated: false,
      lastResetTime: Date.now(),
    },
    members: [
      {
        userId: 'tieu_dao_1',
        username: 'Tiêu Dao Tử',
        displayName: 'Tiêu Dao Tử',
        avatar: '🪷',
        frame: 'frame_xianxia_daithua',
        role: 'chuong_mon',
        contribution: 8500,
        realmIndex: 7,
        realmName: 'Đại Thừa Kỳ',
        realmIcon: '☀️',
        level: 690,
        tier: 7,
        exp: 690000,
        tuViScore: 7690000,
        joinedAt: Date.now() - 27 * 86400000,
      },
      {
        userId: 'tieu_dao_2',
        username: 'Cầm Họa Tiên Cô',
        displayName: 'Cầm Họa Tiên Cô',
        avatar: '🪕',
        frame: 'frame_xianxia_hopthe',
        role: 'dai_truong_lao',
        contribution: 5100,
        realmIndex: 6,
        realmName: 'Hợp Thể Kỳ',
        realmIcon: '⚡',
        level: 530,
        tier: 5,
        exp: 530000,
        tuViScore: 6530000,
        joinedAt: Date.now() - 20 * 86400000,
      },
      {
        userId: 'tieu_dao_3',
        username: 'Bạch Lộc Chân Quân',
        displayName: 'Bạch Lộc Chân Quân',
        avatar: '🦌',
        frame: 'frame_xianxia_luyenhu',
        role: 'chan_truyen',
        contribution: 2300,
        realmIndex: 5,
        realmName: 'Luyện Hư Kỳ',
        realmIcon: '🌀',
        level: 390,
        tier: 4,
        exp: 390000,
        tuViScore: 5390000,
        joinedAt: Date.now() - 14 * 86400000,
      },
      {
        userId: 'tieu_dao_4',
        username: 'Lưu Vân Đạo Trưởng',
        displayName: 'Lưu Vân Đạo Trưởng',
        avatar: '☁️',
        frame: 'frame_xianxia_hoathan',
        role: 'noi_mon',
        contribution: 880,
        realmIndex: 4,
        realmName: 'Hóa Thần Kỳ',
        realmIcon: '🌌',
        level: 280,
        tier: 3,
        exp: 280000,
        tuViScore: 4280000,
        joinedAt: Date.now() - 8 * 86400000,
      },
      {
        userId: 'tieu_dao_5',
        username: 'Thính Phong Tử',
        displayName: 'Thính Phong Tử',
        avatar: '🍃',
        frame: 'frame_xianxia_ketdan',
        role: 'ngoai_mon',
        contribution: 190,
        realmIndex: 2,
        realmName: 'Kết Đan Kỳ',
        realmIcon: '🔮',
        level: 88,
        tier: 2,
        exp: 88000,
        tuViScore: 2088000,
        joinedAt: Date.now() - 3 * 86400000,
      },
    ],
  },
];

function recalculateSectStats(sect: ServerSectRecord) {
  if (!sect.members || !Array.isArray(sect.members)) {
    sect.members = [];
  }
  const totalTuVi = sect.members.reduce((acc: number, m: any) => acc + (Number(m.tuViScore) || 0), 0);
  sect.totalTuVi = totalTuVi > 0 ? totalTuVi : (sect.totalTuVi || 1000000);
  sect.memberCount = sect.members.length;
  if (sect.members.length > 0) {
    sect.avgLevel = Math.round(sect.members.reduce((acc: number, m: any) => acc + (Number(m.level) || 1), 0) / sect.members.length);
    const avgRealmIdx = Math.round(sect.members.reduce((acc: number, m: any) => acc + (Number(m.realmIndex) || 0), 0) / sect.members.length);
    sect.avgRealmName = XIANXIA_REALM_METAS[Math.min(11, Math.max(0, avgRealmIdx))]?.name || 'Hóa Thần Kỳ';
  }
}

function loadSectsFromFile(): Map<string, ServerSectRecord> {
  const map = new Map<string, ServerSectRecord>();
  try {
    if (fs.existsSync(SECTS_FILE)) {
      const content = fs.readFileSync(SECTS_FILE, 'utf-8');
      const data = JSON.parse(content);
      if (Array.isArray(data)) {
        for (const s of data) {
          if (s && s.id) {
            recalculateSectStats(s);
            map.set(s.id, s);
          }
        }
      }
    }
  } catch (err) {
    console.error('Error reading sects.json:', err);
  }

  // Ensure default sects exist if map is empty or missing them
  if (map.size === 0) {
    for (const s of DEFAULT_SERVER_SECTS) {
      recalculateSectStats(s);
      map.set(s.id, s);
    }
    try {
      fs.writeFileSync(SECTS_FILE, JSON.stringify(Array.from(map.values()), null, 2), 'utf-8');
    } catch {}
  } else {
    // Check if any default sects are missing
    let needSave = false;
    for (const d of DEFAULT_SERVER_SECTS) {
      if (!map.has(d.id)) {
        recalculateSectStats(d);
        map.set(d.id, d);
        needSave = true;
      }
    }
    if (needSave) {
      try {
        fs.writeFileSync(SECTS_FILE, JSON.stringify(Array.from(map.values()), null, 2), 'utf-8');
      } catch {}
    }
  }

  return map;
}

const serverSects = loadSectsFromFile();

function saveSectsToFile() {
  try {
    const arr = Array.from(serverSects.values());
    fs.writeFileSync(SECTS_FILE, JSON.stringify(arr, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving sects.json:', err);
  }
}

function syncUserToSect(user: ServerUserRecord) {
  if (!user || !user.cultivation?.sect?.sectId) return;
  const sectId = user.cultivation.sect.sectId;
  const sect = serverSects.get(sectId);
  if (!sect) return;

  const cult = user.cultivation;
  const realmIndex = Math.max(0, Math.min(11, Number(cult.realmIndex) || 0));
  const realmMeta = XIANXIA_REALM_METAS[realmIndex] || XIANXIA_REALM_METAS[0];
  const level = Math.max(1, Number(cult.level) || 1);
  const tier = Math.max(1, Number(cult.tier) || 1);
  const exp = Math.max(0, Number(cult.exp) || 0);
  const tuViScore = (realmIndex * 1_000_000) + (level * 10_000) + (tier * 1_000) + exp;

  if (!sect.members) sect.members = [];
  const uLower = user.username.toLowerCase();
  const existingIdx = sect.members.findIndex((m: any) => m.username?.toLowerCase() === uLower);

  const role = user.cultivation.sect.role || 'ngoai_mon';
  const contribution = user.cultivation.sect.contribution || 50;

  const memberData: ServerSectMemberRecord = {
    userId: user.id,
    username: user.username,
    displayName: user.displayName || user.username,
    avatar: user.avatar || '⚡',
    frame: user.frame || realmMeta.frameId,
    role,
    contribution,
    realmIndex,
    realmName: realmMeta.name,
    realmIcon: realmMeta.icon,
    level,
    tier,
    exp,
    tuViScore,
    joinedAt: user.cultivation.sect.joinedAt || Date.now(),
    lastActive: Date.now(),
  };

  if (existingIdx !== -1) {
    sect.members[existingIdx] = memberData;
  } else {
    sect.members.push(memberData);
  }

  if (role === 'chuong_mon') {
    sect.leaderId = user.id;
    sect.leaderName = user.username;
    sect.leaderAvatar = user.avatar;
    sect.leaderFrame = user.frame;
    sect.leaderRealmName = realmMeta.name;
    sect.leaderLevel = level;
  }

  recalculateSectStats(sect);
  saveSectsToFile();
}

// =========================================================================
// BÀN CỔ THẦN THỨC - HỆ THỐNG TRỪNG PHẠT & PHONG ẤN GIAN LẬN (2H BAN)
// =========================================================================
const BANS_FILE = path.join(process.cwd(), 'banned_users.json');

export interface ServerBanRecord {
  username: string;
  userId?: string;
  bannedAt: number;
  bannedUntil: number;
  durationMs: number;
  reason: string;
  personaId: 'ban_co';
}

function loadBansFromFile(): Map<string, ServerBanRecord> {
  const map = new Map<string, ServerBanRecord>();
  try {
    if (fs.existsSync(BANS_FILE)) {
      const content = fs.readFileSync(BANS_FILE, 'utf-8');
      const data = JSON.parse(content);
      if (data && typeof data === 'object') {
        const now = Date.now();
        for (const [key, val] of Object.entries(data)) {
          if (val && typeof val === 'object' && (val as any).bannedUntil > now) {
            map.set(key.toLowerCase(), val as ServerBanRecord);
          }
        }
      }
    }
  } catch (err) {
    console.error('Error reading banned_users.json:', err);
  }
  return map;
}

const serverBans = loadBansFromFile();

function saveBansToFile() {
  try {
    const obj: Record<string, ServerBanRecord> = {};
    const now = Date.now();
    for (const [k, v] of serverBans.entries()) {
      if (v.bannedUntil > now) {
        obj[k] = v;
      }
    }
    fs.writeFileSync(BANS_FILE, JSON.stringify(obj, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving banned_users.json:', err);
  }
}

function checkIsBanned(usernameOrId?: string): {
  isBanned: boolean;
  record?: ServerBanRecord;
  remainingMs: number;
  remainingMinutes: number;
} {
  if (!usernameOrId) return { isBanned: false, remainingMs: 0, remainingMinutes: 0 };
  const key = String(usernameOrId).trim().toLowerCase();
  if (!key) return { isBanned: false, remainingMs: 0, remainingMinutes: 0 };

  const now = Date.now();
  let record = serverBans.get(key);

  if (!record) {
    for (const b of serverBans.values()) {
      if ((b.username && b.username.toLowerCase() === key) || (b.userId && b.userId.toLowerCase() === key)) {
        record = b;
        break;
      }
    }
  }

  if (record) {
    if (record.bannedUntil > now) {
      const remainingMs = record.bannedUntil - now;
      return {
        isBanned: true,
        record,
        remainingMs,
        remainingMinutes: Math.max(1, Math.ceil(remainingMs / 60000)),
      };
    } else {
      // Hết hạn 2 giờ -> tự động giải trừ phong ấn
      serverBans.delete(key);
      saveBansToFile();
    }
  }

  // Kiểm tra tài khoản trong serverUsers
  const user = getUserByUsername(usernameOrId) || serverUsers.get(usernameOrId);
  if (user && (user as any).bannedUntil && (user as any).bannedUntil > now) {
    const remainingMs = (user as any).bannedUntil - now;
    const rec: ServerBanRecord = {
      username: user.username,
      userId: user.id,
      bannedAt: (user as any).bannedAt || now,
      bannedUntil: (user as any).bannedUntil,
      durationMs: (user as any).bannedDurationMs || (2 * 60 * 60 * 1000),
      reason: (user as any).banReason || 'Bất thường tần số gõ phím / Nghi vấn Auto Macro',
      personaId: 'ban_co',
    };
    serverBans.set(user.username.toLowerCase(), rec);
    return {
      isBanned: true,
      record: rec,
      remainingMs,
      remainingMinutes: Math.max(1, Math.ceil(remainingMs / 60000)),
    };
  }

  return { isBanned: false, remainingMs: 0, remainingMinutes: 0 };
}

let syncUserCultivationToCache: ((user: ServerUserRecord) => void) | null = null;

function executeApplyBan(params: {
  username: string;
  userId?: string;
  reason?: string;
  durationMs?: number;
}): ServerBanRecord {
  const durationMs = params.durationMs || (2 * 60 * 60 * 1000); // 2 giờ
  const now = Date.now();
  const bannedUntil = now + durationMs;
  const cleanUsername = String(params.username || 'Vô Danh').trim();
  const reason = String(params.reason || 'Bất thường tần số gõ phím / Nghi vấn Auto Macro').trim();

  const record: ServerBanRecord = {
    username: cleanUsername,
    userId: params.userId,
    bannedAt: now,
    bannedUntil,
    durationMs,
    reason,
    personaId: 'ban_co',
  };

  serverBans.set(cleanUsername.toLowerCase(), record);
  if (params.userId) {
    serverBans.set(params.userId.toLowerCase(), record);
  }
  saveBansToFile();

  // Phế trừ 500 Tu Vi nếu tài khoản đã đăng ký
  const user = getUserByUsername(cleanUsername) || (params.userId ? serverUsers.get(params.userId) : null);
  if (user) {
    (user as any).bannedUntil = bannedUntil;
    (user as any).bannedAt = now;
    (user as any).banReason = reason;
    (user as any).bannedDurationMs = durationMs;

    if (user.cultivation) {
      const exp = Number(user.cultivation.exp) || 0;
      user.cultivation.exp = Math.max(0, exp - 500);
      if (syncUserCultivationToCache) {
        try {
          syncUserCultivationToCache(user);
        } catch {}
      }
    }
    saveUsersToFile();
  }

  // Trục xuất ngay lập tức khỏi mọi phòng thi đấu đang tham gia
  for (const [code, r] of rooms.entries()) {
    const hasP = r.players.some(
      (p) =>
        (p.username && p.username.toLowerCase() === cleanUsername.toLowerCase()) ||
        (params.userId && p.id === params.userId)
    );
    if (hasP) {
      r.players = r.players.filter(
        (p) =>
          (!p.username || p.username.toLowerCase() !== cleanUsername.toLowerCase()) &&
          (!params.userId || p.id !== params.userId)
      );
      if (r.players.length === 0) {
        rooms.delete(code);
      } else {
        if (r.hostName && r.hostName.toLowerCase() === cleanUsername.toLowerCase()) {
          r.hostId = r.players[0].id;
          r.hostName = r.players[0].username;
        }
        broadcastToRoom(code, {
          type: 'room_updated',
          room: r,
        });
      }
    }
  }

  return record;
}

function getUserByToken(rawToken?: string): ServerUserRecord | null {
  if (!rawToken) return null;
  const cleanToken = rawToken.replace(/^Bearer\s+/i, '').trim();
  if (!cleanToken) return null;
  for (const user of serverUsers.values()) {
    if (user.sessionTokens && user.sessionTokens.includes(cleanToken)) {
      return user;
    }
  }
  return null;
}

function getUserByEmail(email?: string): ServerUserRecord | null {
  if (!email) return null;
  const lower = email.trim().toLowerCase();
  for (const user of serverUsers.values()) {
    if (user.email.toLowerCase() === lower) {
      return user;
    }
  }
  return null;
}

function getUserByUsername(username?: string): ServerUserRecord | null {
  if (!username) return null;
  const lower = username.trim().toLowerCase();
  for (const user of serverUsers.values()) {
    if (user.username && user.username.trim().toLowerCase() === lower) {
      return user;
    }
  }
  return null;
}

function getUserByUsernameOrEmail(identifier?: string): ServerUserRecord | null {
  if (!identifier) return null;
  const clean = identifier.trim().toLowerCase();
  for (const user of serverUsers.values()) {
    if (
      (user.username && user.username.toLowerCase() === clean) ||
      (user.email && user.email.toLowerCase() === clean)
    ) {
      return user;
    }
  }
  return null;
}

function sanitizeUser(u: ServerUserRecord) {
  return {
    id: u.id,
    email: u.email || '',
    username: u.username, // Tên đăng nhập cố định (dùng để đăng nhập)
    displayName: u.displayName || u.username, // Tên người chơi hiển thị trong game
    avatar: u.avatar,
    frame: u.frame,
    isAdmin: Boolean(u.isAdmin || u.username.toLowerCase() === 'admin'),
    showcaseAchievements: u.showcaseAchievements || [],
    unlockedAchievements: u.unlockedAchievements || [],
    isVerified: u.isVerified,
    authProvider: u.authProvider,
    cultivation: u.cultivation || null,
    bestWpm: u.bestWpm || 0,
    bestWpmRecord: u.bestWpmRecord || null,
    totalGames: u.totalGames || 0,
    matchHistory: u.matchHistory || [],
    createdAt: u.createdAt,
  };
}

function decodeGoogleJwt(credential: string): { sub: string; email: string; email_verified?: boolean; name?: string; picture?: string } | null {
  try {
    const parts = credential.split('.');
    if (parts.length !== 3) return null;
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const jsonStr = Buffer.from(base64, 'base64').toString('utf-8');
    return JSON.parse(jsonStr);
  } catch {
    return null;
  }
}

// Presence and SSE Client Tracking with multi-layer heartbeat & session management
export interface PresenceSession {
  tabId: string;
  userId: string;
  deviceId?: string;
  username: string;
  avatar: string;
  frame?: string;
  bestWpm?: number;
  bestWpmRecord?: {
    wpm: number;
    mode: string;
    modeName: string;
    timestamp: number;
  };
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
}

const activePresenceSessions = new Map<string, PresenceSession>(); // tabId -> session
const sseGlobalClients = new Map<express.Response, string>(); // res -> tabId
const sseGlobalChatClients = new Set<express.Response>();
const sseClientMeta = new Map<express.Response, { userId?: string; username?: string; tabId?: string; sectId?: string }>();

// Multi-Channel Chat Storage
const sectChatMessages = new Map<string, ServerChatMessage[]>(); // sectId -> messages
const whisperChatMessages = new Map<string, ServerChatMessage[]>(); // sorted pair key -> messages

function getWhisperKey(id1: string, id2: string): string {
  return [String(id1 || '').toLowerCase(), String(id2 || '').toLowerCase()].sort().join('_');
}

// ==========================================
// FRIENDS & DAO LU PERSISTENT STORAGE
// ==========================================
const FRIENDS_FILE = path.resolve(process.cwd(), 'friends.json');
const serverFriendships = new Map<string, ServerFriendshipRecord>();
const serverFriendRequests = new Map<string, ServerFriendRequestRecord>();

function loadFriendsFromFile() {
  try {
    if (fs.existsSync(FRIENDS_FILE)) {
      const content = fs.readFileSync(FRIENDS_FILE, 'utf-8');
      const data = JSON.parse(content);
      if (data && Array.isArray(data.friendships)) {
        for (const f of data.friendships) {
          if (f && f.id) serverFriendships.set(f.id, f);
        }
      }
      if (data && Array.isArray(data.requests)) {
        for (const r of data.requests) {
          if (r && r.id) serverFriendRequests.set(r.id, r);
        }
      }
    }
  } catch (err) {
    console.error('Error loading friends.json:', err);
  }
}

function saveFriendsToFile() {
  try {
    const data = {
      friendships: Array.from(serverFriendships.values()),
      requests: Array.from(serverFriendRequests.values()),
    };
    fs.writeFileSync(FRIENDS_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving friends.json:', err);
  }
}

loadFriendsFromFile();

function parseUserAgent(ua?: string): { browser: string; device: string } {
  if (!ua) return { browser: 'Web Browser', device: 'Desktop' };
  let device = 'Desktop';
  if (/mobile|iphone|ipod|android.*mobile|windows phone/i.test(ua)) {
    device = 'Mobile';
  } else if (/ipad|tablet|android(?!.*mobile)/i.test(ua)) {
    device = 'Tablet';
  }

  let browser = 'Web Browser';
  if (/edg\//i.test(ua)) {
    browser = 'Edge';
  } else if (/opr\/|opera/i.test(ua)) {
    browser = 'Opera';
  } else if (/chrome|crios/i.test(ua)) {
    browser = 'Chrome';
  } else if (/firefox|fxios/i.test(ua)) {
    browser = 'Firefox';
  } else if (/safari/i.test(ua)) {
    browser = 'Safari';
  }
  return { browser, device };
}

function getClientIp(req: express.Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.trim()) {
    return forwarded.split(',')[0].trim();
  }
  return req.socket?.remoteAddress || '127.0.0.1';
}

function extractSessionMetaFromReq(req: express.Request) {
  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const query = req.query || {};

  const username = String(body.username || query.username || '').trim();
  const avatar = String(body.avatar || query.avatar || '').trim();
  const frame = String(body.frame || query.frame || '').trim();
  const deviceId = String(body.deviceId || query.deviceId || '').trim();
  const rawBestWpm = body.bestWpm !== undefined ? body.bestWpm : query.bestWpm;
  const rawTotalGames = body.totalGames !== undefined ? body.totalGames : query.totalGames;
  const bestWpm = rawBestWpm !== undefined ? Number(rawBestWpm) : undefined;
  let bestWpmRecord = body.bestWpmRecord;
  if (!bestWpmRecord && query.bestWpmRecord) {
    try {
      bestWpmRecord = JSON.parse(String(query.bestWpmRecord));
    } catch {}
  }
  const totalGames = rawTotalGames !== undefined ? Number(rawTotalGames) : undefined;
  const currentRoomId = body.currentRoomId !== undefined ? String(body.currentRoomId).trim() : (query.currentRoomId !== undefined ? String(query.currentRoomId).trim() : undefined);
  const currentMode = body.currentMode !== undefined ? String(body.currentMode).trim() : (query.currentMode !== undefined ? String(query.currentMode).trim() : undefined);
  const rawStatus = String(body.status || query.status || '').trim();
  const isAdmin = body.isAdmin === true || body.isAdmin === 'true' || query.isAdmin === 'true';

  const ua = String(req.headers['user-agent'] || '');
  const { browser, device } = parseUserAgent(ua);
  const ip = getClientIp(req);

  return {
    username: username || undefined,
    avatar: avatar || undefined,
    frame: frame || undefined,
    deviceId: deviceId || undefined,
    bestWpm: bestWpm !== undefined && !isNaN(bestWpm) ? bestWpm : undefined,
    bestWpmRecord: bestWpmRecord && typeof bestWpmRecord === 'object' ? bestWpmRecord : undefined,
    totalGames: totalGames !== undefined && !isNaN(totalGames) ? totalGames : undefined,
    currentRoomId: currentRoomId !== undefined ? (currentRoomId || null) : undefined,
    currentMode: currentMode !== undefined ? (currentMode || null) : undefined,
    status: (['lobby', 'waiting_room', 'playing', 'outplay', 'gameover'].includes(rawStatus) ? rawStatus : undefined) as
      | 'lobby'
      | 'waiting_room'
      | 'playing'
      | 'outplay'
      | 'gameover'
      | undefined,
    isAdmin,
    ip,
    browser,
    device,
  };
}

// Get unique identifier for a human player across multiple tabs
function getUniqueUserKey(session: PresenceSession): string {
  // 1. Registered / Logged in username (not generic guest prefix)
  if (session.username && session.username !== 'Khách' && !session.username.startsWith('Khách ')) {
    return `user_${session.username.toLowerCase().trim()}`;
  }
  // 2. Persistent device ID across all tabs of the same browser
  if (session.deviceId && session.deviceId.trim()) {
    return `dev_${session.deviceId.trim()}`;
  }
  // 3. User ID if available and not random guest
  if (session.userId && !session.userId.startsWith('guest_') && !session.userId.startsWith('p_')) {
    return `id_${session.userId.trim()}`;
  }
  // 4. Session userId or fallback to tabId
  return session.userId ? `id_${session.userId.trim()}` : `tab_${session.tabId}`;
}

function cleanStaleSessions(): boolean {
  const now = Date.now();
  const TIMEOUT_MS = 7000; // Client sends ping every 3s, timeout after 7s of silence
  let removed = false;
  for (const [tabId, session] of activePresenceSessions.entries()) {
    if (now - session.lastSeen > TIMEOUT_MS) {
      activePresenceSessions.delete(tabId);
      removed = true;
    }
  }
  return removed;
}

function getRealOnlineCount(): number {
  cleanStaleSessions();
  const uniqueUsers = new Set<string>();
  for (const session of activePresenceSessions.values()) {
    uniqueUsers.add(getUniqueUserKey(session));
  }
  return uniqueUsers.size;
}

function registerPresence(
  tabId: string,
  userId?: string,
  meta?: {
    username?: string;
    avatar?: string;
    frame?: string;
    deviceId?: string;
    bestWpm?: number;
    bestWpmRecord?: any;
    totalGames?: number;
    currentRoomId?: string | null;
    currentMode?: string | null;
    status?: 'lobby' | 'waiting_room' | 'playing' | 'outplay' | 'gameover';
    isAdmin?: boolean;
    ip?: string;
    browser?: string;
    device?: string;
  }
) {
  if (!tabId) return;
  const now = Date.now();
  const prevCount = getRealOnlineCount();
  const existing = activePresenceSessions.get(tabId);

  activePresenceSessions.set(tabId, {
    tabId,
    userId: userId || existing?.userId || tabId,
    deviceId: meta?.deviceId || existing?.deviceId,
    username: meta?.username || existing?.username || 'Khách ' + tabId.slice(-4),
    avatar: meta?.avatar || existing?.avatar || '⚡',
    frame: meta?.frame !== undefined ? meta.frame : existing?.frame || 'default',
    bestWpm: typeof meta?.bestWpm === 'number' ? meta.bestWpm : existing?.bestWpm || 0,
    bestWpmRecord: meta?.bestWpmRecord || existing?.bestWpmRecord,
    totalGames: typeof meta?.totalGames === 'number' ? meta.totalGames : existing?.totalGames || 0,
    currentRoomId: meta?.currentRoomId !== undefined ? meta.currentRoomId : existing?.currentRoomId || null,
    currentMode: meta?.currentMode !== undefined ? meta.currentMode : existing?.currentMode || null,
    status: meta?.status || existing?.status || 'lobby',
    isAdmin: meta?.isAdmin !== undefined ? meta.isAdmin : existing?.isAdmin || false,
    ip: meta?.ip || existing?.ip || '127.0.0.1',
    browser: meta?.browser || existing?.browser || 'Chrome',
    device: meta?.device || existing?.device || 'Desktop',
    connectedAt: existing?.connectedAt || now,
    lastSeen: now,
  });

  const newCount = getRealOnlineCount();
  if (newCount !== prevCount) {
    broadcastOnlinePresence();
  }
}

function removePresence(tabId: string) {
  if (!tabId) return;
  const prevCount = getRealOnlineCount();
  activePresenceSessions.delete(tabId);
  const newCount = getRealOnlineCount();
  if (newCount !== prevCount) {
    broadcastOnlinePresence();
  }
}

function broadcastOnlinePresence() {
  const count = getRealOnlineCount();
  const payload = `data: ${JSON.stringify({ type: 'online_count', count })}\n\n`;
  for (const client of Array.from(sseGlobalChatClients)) {
    try {
      client.write(payload);
    } catch {
      sseGlobalChatClients.delete(client);
      sseGlobalClients.delete(client);
    }
  }
}

// Background cleanup check every 2 seconds
setInterval(() => {
  const countBefore = getRealOnlineCount();
  const removed = cleanStaleSessions();
  const countAfter = getRealOnlineCount();
  if (removed && countBefore !== countAfter) {
    broadcastOnlinePresence();
  }
}, 2000);

// Xianxia realm max longevity table for server background calculation
const REALM_MAX_THO_NGUYEN = [240, 480, 960, 1800, 3000, 4800, 7200, 10800, 15000, 30000, 60000, 999999];
const REALM_START_LEVELS = [1, 31, 71, 131, 211, 311, 431, 571, 721, 871, 941, 981];
const TWO_HOURS_MS = 2 * 60 * 60 * 1000;

// Background cultivation lifespan (Thọ Nguyên) decay every 2 hours: -1 point every 2 hours
setInterval(() => {
  const now = Date.now();
  let anyUserUpdated = false;

  for (const user of serverUsers.values()) {
    if (!user.cultivation) continue;

    const realmIndex = typeof user.cultivation.realmIndex === 'number' ? user.cultivation.realmIndex : 0;
    if (realmIndex >= 11) continue; // Thiên Tôn bất tử

    const lastDecay = user.cultivation.lastThoNguyenDecay || now;
    const elapsed = now - lastDecay;
    const decayUnits = Math.floor(elapsed / TWO_HOURS_MS);

    if (decayUnits > 0) {
      anyUserUpdated = true;
      user.cultivation.thoNguyen = Math.max(0, (user.cultivation.thoNguyen ?? REALM_MAX_THO_NGUYEN[realmIndex]) - decayUnits);
      user.cultivation.lastThoNguyenDecay = lastDecay + decayUnits * TWO_HOURS_MS;

      // Check Luân Hồi khi hết Thọ Nguyên: đưa về tầng 1 của 2 cảnh giới trước đó
      if (user.cultivation.thoNguyen <= 0) {
        const targetRealmIndex = Math.max(0, realmIndex - 2);
        const targetLevel = REALM_START_LEVELS[targetRealmIndex];
        user.cultivation.realmIndex = targetRealmIndex;
        user.cultivation.tier = 1;
        user.cultivation.level = targetLevel;
        user.cultivation.exp = 0;
        user.cultivation.thoNguyen = REALM_MAX_THO_NGUYEN[targetRealmIndex];
        user.cultivation.maxThoNguyen = REALM_MAX_THO_NGUYEN[targetRealmIndex];
      }
    }
  }

  if (anyUserUpdated) {
    saveUsersToFile();
  }
}, 60000);

function broadcastLeaderboard() {
  const payload = `data: ${JSON.stringify({ type: 'leaderboard_updated', highScores: serverHighScores })}\n\n`;
  for (const client of Array.from(sseGlobalChatClients)) {
    try {
      client.write(payload);
    } catch {
      sseGlobalChatClients.delete(client);
      sseGlobalClients.delete(client);
    }
  }
}

function broadcastGlobalChat(msg: ServerChatMessage) {
  const payload = `data: ${JSON.stringify({ type: 'new_chat_message', message: msg })}\n\n`;
  for (const client of Array.from(sseGlobalChatClients)) {
    try {
      client.write(payload);
    } catch {
      sseGlobalChatClients.delete(client);
      sseGlobalClients.delete(client);
      sseClientMeta.delete(client);
    }
  }
}

function broadcastSectChat(sectId: string, msg: ServerChatMessage) {
  const payload = `data: ${JSON.stringify({ type: 'new_chat_message', message: msg })}\n\n`;
  for (const client of Array.from(sseGlobalChatClients)) {
    try {
      const meta = sseClientMeta.get(client);
      const user = meta?.userId ? serverUsers.get(meta.userId) : (meta?.username ? getUserByUsername(meta.username) : null);
      const userSectId = user?.cultivation?.sectId || meta?.sectId;
      if (userSectId === sectId || meta?.username === 'Admin' || user?.isAdmin) {
        client.write(payload);
      }
    } catch {
      sseGlobalChatClients.delete(client);
      sseGlobalClients.delete(client);
      sseClientMeta.delete(client);
    }
  }
}

function broadcastWhisperChat(user1Id: string, user2Id: string, msg: ServerChatMessage) {
  const payload = `data: ${JSON.stringify({ type: 'new_chat_message', message: msg })}\n\n`;
  const clean1 = (user1Id || '').toLowerCase();
  const clean2 = (user2Id || '').toLowerCase();
  const targetName = (msg.whisperTarget || '').toLowerCase();
  const senderName = (msg.username || '').toLowerCase();

  for (const client of Array.from(sseGlobalChatClients)) {
    try {
      const meta = sseClientMeta.get(client);
      const cUserId = (meta?.userId || '').toLowerCase();
      const cUsername = (meta?.username || '').toLowerCase();

      const isParticipant =
        (cUserId && (cUserId === clean1 || cUserId === clean2)) ||
        (cUsername && (cUsername === senderName || cUsername === targetName)) ||
        cUsername === 'admin';

      if (isParticipant) {
        client.write(payload);
      }
    } catch {
      sseGlobalChatClients.delete(client);
      sseGlobalClients.delete(client);
      sseClientMeta.delete(client);
    }
  }
}

function broadcastToUser(targetUserIdOrName: string, event: any) {
  if (!targetUserIdOrName) return;
  const payload = `data: ${JSON.stringify(event)}\n\n`;
  const clean = String(targetUserIdOrName || '').toLowerCase();

  for (const client of Array.from(sseGlobalChatClients)) {
    try {
      const meta = sseClientMeta.get(client);
      if (
        (meta?.userId && meta.userId.toLowerCase() === clean) ||
        (meta?.username && meta.username.toLowerCase() === clean)
      ) {
        client.write(payload);
      }
    } catch {
      sseGlobalChatClients.delete(client);
      sseGlobalClients.delete(client);
      sseClientMeta.delete(client);
    }
  }
}

function broadcastGlobalChatClear() {
  const payload = `data: ${JSON.stringify({ type: 'chat_cleared' })}\n\n`;
  for (const client of Array.from(sseGlobalChatClients)) {
    try {
      client.write(payload);
    } catch {
      sseGlobalChatClients.delete(client);
      sseGlobalClients.delete(client);
    }
  }
}

function generateUniqueRoomCode(): string {
  for (let i = 0; i < 200; i++) {
    const num = Math.floor(1000 + Math.random() * 9000);
    const code = `VN-${num}`;
    if (!rooms.has(code)) {
      return code;
    }
  }
  return `VN-${Date.now().toString().slice(-4)}`;
}

function cleanupInactiveRooms() {
  const now = Date.now();
  for (const [id, room] of rooms.entries()) {
    const humanPlayers = room.players.filter((p) => !p.isBot);
    // Phòng KHÔNG CÓ người chơi thực nào (chỉ còn bot hoặc 0 người) -> Xóa phòng ngay lập tức khỏi server
    if (humanPlayers.length === 0) {
      stopRoomBots(id, false);
      rooms.delete(id);
      sseClientsByRoom.delete(id);
      roomChatMessages.delete(id);
      broadcastToRoom(id, { type: 'room_closed', roomId: id });
      continue;
    }

    // Nếu không còn bất kỳ client SSE nào kết nối và phòng đã không có hoạt động trong 30 giây
    const clients = sseClientsByRoom.get(id);
    const hasActiveSse = clients && clients.size > 0;
    if (!hasActiveSse && now - (room.lastActive || room.createdAt) > 30 * 1000) {
      stopRoomBots(id, false);
      rooms.delete(id);
      sseClientsByRoom.delete(id);
      roomChatMessages.delete(id);
      broadcastToRoom(id, { type: 'room_closed', roomId: id });
      continue;
    }

    if (now - (room.lastActive || room.createdAt) > 30 * 60 * 1000) {
      stopRoomBots(id, false);
      rooms.delete(id);
      sseClientsByRoom.delete(id);
      roomChatMessages.delete(id);
      broadcastToRoom(id, { type: 'room_closed', roomId: id });
    }
  }
}
setInterval(cleanupInactiveRooms, 5 * 1000);

function broadcastToRoom(roomId: string, event: any) {
  const normId = normalizeRoomCode(roomId);
  const clients = sseClientsByRoom.get(normId);
  if (!clients || clients.size === 0) return;

  const payload = `data: ${JSON.stringify(event)}\n\n`;
  for (const res of Array.from(clients)) {
    try {
      res.write(payload);
    } catch {
      clients.delete(res);
    }
  }
}

// Room Bot Simulation Engine for standard typing race modes (vi_dau, vi_nodau, en, numpad)
const roomBotIntervals = new Map<string, NodeJS.Timeout>();

function stopRoomBots(roomId: string, resetBotsToWaiting = true) {
  const norm = normalizeRoomCode(roomId);
  const existing = roomBotIntervals.get(norm);
  if (existing) {
    clearInterval(existing);
    roomBotIntervals.delete(norm);
  }

  // Khi dừng bot, lập tức reset trạng thái của tất cả bot về trạng thái chờ (inMatch: false)
  if (resetBotsToWaiting) {
    const room = rooms.get(norm);
    if (room) {
      let updated = false;
      room.players.forEach((p) => {
        if (p.isBot) {
          p.inMatch = false;
          p.isSurrendered = false;
          p.isFinished = false;
          p.progress = 0;
          p.wpm = 0;
          p.correctChars = 0;
          p.errors = 0;
          updated = true;
        }
      });
      if (updated) {
        room.lastActive = Date.now();
        rooms.set(norm, room);
      }
    }
  }
}

function startRoomBots(roomId: string) {
  const norm = normalizeRoomCode(roomId);
  stopRoomBots(norm, false);

  const room = rooms.get(norm);
  if (!room || room.status !== 'playing') return;

  // Bot simulation is exclusively for standard typing races (vi_dau, vi_nodau, en, numpad)
  const standardModes = ['vi_dau', 'vi_nodau', 'en', 'numpad', 'outplay'];
  if (!standardModes.includes(room.mode)) return;

  const bots = room.players.filter((p) => p.isBot);
  if (bots.length === 0) return;

  const startTime = Date.now();
  const countdownDelayMs = 3500; // Match TypingArena inRoomCountdown (3s + start buffer)

  const interval = setInterval(() => {
    const currentRoom = rooms.get(norm);
    if (!currentRoom || currentRoom.status !== 'playing') {
      stopRoomBots(norm, true);
      return;
    }

    // Kiểm tra nếu không còn người chơi thực nào đang thi đấu (đã về đích, đầu hàng hoặc rời phòng)
    const activeHumans = currentRoom.players.filter(
      (p) => !p.isBot && !p.isSurrendered && !p.isFinished && p.inMatch !== false
    );
    if (activeHumans.length === 0) {
      currentRoom.status = 'finished';
      stopRoomBots(norm, true);
      broadcastToRoom(norm, { type: 'room_updated', room: currentRoom });
      return;
    }

    const elapsedTotal = Date.now() - startTime;
    if (elapsedTotal < countdownDelayMs) {
      return; // Waiting for in-room countdown to finish
    }

    const elapsedTypingSec = (elapsedTotal - countdownDelayMs) / 1000;
    const totalWords = Math.max(1, currentRoom.words?.length || 150);
    let anyBotUpdated = false;

    currentRoom.players.forEach((p, idx) => {
      if (!p.isBot || p.isFinished || p.isSurrendered) return;

      const targetWpm = p.botTargetWpm || 60;
      // Realistic human-like variation (+/- 4 WPM smooth fluctuation)
      const variance = Math.sin(idx * 7 + elapsedTypingSec * 1.5) * 3 + Math.cos(elapsedTypingSec * 0.8) * 2;
      const liveWpm = Math.max(20, Math.round(targetWpm + variance));

      // Calculate words typed based on targetWpm
      const wordsTyped = (targetWpm / 60) * elapsedTypingSec;
      const progress = Math.min(100, parseFloat(((wordsTyped / totalWords) * 100).toFixed(1)));
      const correctChars = Math.round(wordsTyped * 5);

      p.wpm = liveWpm;
      p.progress = progress;
      p.correctChars = correctChars;
      if (progress >= 100) {
        p.isFinished = true;
      }
      anyBotUpdated = true;
    });

    if (anyBotUpdated) {
      currentRoom.lastActive = Date.now();
      broadcastToRoom(norm, {
        type: 'player_progress',
        roomId: norm,
        players: currentRoom.players,
      });
    }

    // Check if all players (both bots and humans) are finished or surrendered
    const activePlayers = currentRoom.players.filter(
      (p) => !p.isSurrendered && !p.isFinished && p.inMatch !== false
    );
    if (activePlayers.length === 0) {
      currentRoom.status = 'finished';
      stopRoomBots(norm, true);
      broadcastToRoom(norm, { type: 'room_updated', room: currentRoom });
    }
  }, 500);

  roomBotIntervals.set(norm, interval);
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // === AUTHENTICATION API ROUTES (users.json persistence) ===

  // POST /api/auth/google: Decommissioned (Google sign-in removed per user request)
  app.post('/api/auth/google', (req, res) => {
    res.status(410).json({
      success: false,
      error: 'Tính năng đăng nhập bằng Google đã được gỡ bỏ. Vui lòng đăng ký hoặc đăng nhập bằng tài khoản!',
    });
  });

  // POST /api/auth/register and /api/auth/register-email: Quick 1-step account creation
  const handleQuickRegister = (req: express.Request, res: express.Response) => {
    const { password, username, displayName, avatar } = req.body || {};

    const cleanUsername = String(username || '').trim();
    if (!cleanUsername || cleanUsername.length < 3) {
      res.status(400).json({ success: false, error: 'Tên đăng nhập phải có ít nhất 3 ký tự.' });
      return;
    }
    if (cleanUsername.length > 24) {
      res.status(400).json({ success: false, error: 'Tên đăng nhập không được vượt quá 24 ký tự.' });
      return;
    }
    if (/\s/.test(cleanUsername)) {
      res.status(400).json({ success: false, error: 'Tên đăng nhập không được chứa khoảng trắng (dấu cách).' });
      return;
    }

    const cleanPassword = String(password || '');
    if (!cleanPassword || cleanPassword.length < 4) {
      res.status(400).json({ success: false, error: 'Mật khẩu phải có ít nhất 4 ký tự.' });
      return;
    }

    // Check if login username is already taken (strictly unique across all accounts)
    const existingByName = getUserByUsername(cleanUsername);
    if (existingByName) {
      res.status(400).json({
        success: false,
        error: `Tên đăng nhập "${cleanUsername}" đã có người sử dụng. Vui lòng chọn tên đăng nhập khác!`,
      });
      return;
    }

    // Player in-game display name (defaults to username if not explicitly set)
    const cleanDisplayName = String(displayName || cleanUsername).trim().slice(0, 24) || cleanUsername;

    const salt = crypto.randomBytes(16).toString('hex');
    const passwordHash = hashPassword(cleanPassword, salt);
    const userId = `usr_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const sessionToken = `tok_${Date.now()}_${crypto.randomBytes(16).toString('hex')}`;

    // Account created without email requirement or auto-generated fake email
    const user: ServerUserRecord = {
      id: userId,
      email: '',
      username: cleanUsername, // Tên đăng nhập cố định (không thể thay đổi)
      displayName: cleanDisplayName, // Tên người chơi hiển thị trong game
      avatar: avatar || '⚡',
      frame: 'default',
      authProvider: 'email',
      passwordHash,
      salt,
      isVerified: true,
      sessionTokens: [sessionToken],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    serverUsers.set(userId, user);
    saveUsersToFile();

    console.log(`[FastTyping Auth] Đăng ký thành công: Username="${cleanUsername}", DisplayName="${cleanDisplayName}"`);

    res.json({
      success: true,
      token: sessionToken,
      user: sanitizeUser(user),
      message: 'Tạo tài khoản thành công! Bạn đã sẵn sàng tham gia Bảng Vàng.',
    });
  };

  app.post('/api/auth/register', handleQuickRegister);
  app.post('/api/auth/register-email', handleQuickRegister);

  // POST /api/auth/login and /api/auth/login-email: Quick login by username OR email
  const handleQuickLogin = (req: express.Request, res: express.Response) => {
    const { email, username, account, identifier: reqIdentifier, password } = req.body || {};
    const identifier = String(reqIdentifier || account || username || email || '').trim();

    if (!identifier) {
      res.status(400).json({ success: false, error: 'Vui lòng nhập tên đăng nhập.' });
      return;
    }
    if (!password) {
      res.status(400).json({ success: false, error: 'Vui lòng nhập mật khẩu.' });
      return;
    }

    const user = getUserByUsernameOrEmail(identifier);
    if (!user) {
      res.status(404).json({ success: false, error: 'Không tìm thấy tài khoản với tên đăng nhập này.' });
      return;
    }

    if (!user.salt || !user.passwordHash) {
      res.status(400).json({
        success: false,
        error: 'Tài khoản này chưa thiết lập mật khẩu. Vui lòng tạo tài khoản mới!',
      });
      return;
    }

    const checkHash = hashPassword(password, user.salt);
    if (checkHash !== user.passwordHash) {
      res.status(400).json({ success: false, error: 'Mật khẩu không chính xác.' });
      return;
    }

    // Auto-verify if legacy unverified account
    user.isVerified = true;
    user.updatedAt = Date.now();

    const sessionToken = `tok_${Date.now()}_${crypto.randomBytes(16).toString('hex')}`;
    if (!user.sessionTokens) user.sessionTokens = [];
    user.sessionTokens.push(sessionToken);
    if (user.sessionTokens.length > 20) user.sessionTokens.shift();

    serverUsers.set(user.id, user);
    saveUsersToFile();

    res.json({
      success: true,
      token: sessionToken,
      user: sanitizeUser(user),
      message: 'Đăng nhập thành công!',
    });
  };

  app.post('/api/auth/login', handleQuickLogin);
  app.post('/api/auth/login-email', handleQuickLogin);

  // GET /api/auth/me: Retrieve current authenticated profile
  app.get('/api/auth/me', (req, res) => {
    const authHeader = req.headers.authorization;
    const user = getUserByToken(authHeader);
    if (!user) {
      res.json({ success: false, isGuest: true, user: null });
      return;
    }

    res.json({
      success: true,
      isGuest: false,
      user: sanitizeUser(user),
    });
  });

  // POST /api/auth/profile: Update name, avatar, frame (Restricted to verified accounts)
  app.post('/api/auth/profile', (req, res) => {
    const authHeader = req.headers.authorization;
    const user = getUserByToken(authHeader);

    // Người chơi không đăng nhập (Khách) không thể đổi tên, khung và avatar
    if (!user || !user.isVerified) {
      res.status(403).json({
        success: false,
        error: 'Chế độ Khách không thể đổi tên, khung và avatar. Vui lòng đăng nhập tài khoản!',
      });
      return;
    }

    const { 
      displayName, 
      username, 
      avatar, 
      frame, 
      showcaseAchievements, 
      unlockedAchievements,
      bestWpm,
      bestWpmRecord,
      totalGames,
      matchHistory,
      cultivation
    } = req.body || {};
    
    // Đổi tên người chơi (displayName): Tên đăng nhập (user.username) CỐ ĐỊNH, KHÔNG THAY ĐỔI
    const newPlayerName = String(displayName || username || '').trim();
    if (newPlayerName && newPlayerName.length >= 2) {
      const slicedName = newPlayerName.slice(0, 24);
      const cleanNew = slicedName.toLowerCase();
      const currentDisplayName = (user.displayName || user.username).trim().toLowerCase();
      
      if (cleanNew !== currentDisplayName) {
        const existing = Array.from(serverUsers.values()).find(
          (u) =>
            u.id !== user.id &&
            (((u.displayName && u.displayName.trim().toLowerCase() === cleanNew) ||
              (!u.displayName && u.username.trim().toLowerCase() === cleanNew)))
        );
        if (existing) {
          res.status(400).json({
            success: false,
            error: `Tên người chơi / Biệt danh "${slicedName}" đã có người sử dụng. Vui lòng chọn tên khác!`,
          });
          return;
        }
      }
      user.displayName = slicedName;
      // QUAN TRỌNG: user.username (Tên đăng nhập) TUYỆT ĐỐI GIỮ NGUYÊN
    }

    if (avatar && typeof avatar === 'string' && avatar.trim()) {
      user.avatar = avatar.trim();
    }
    if (frame && typeof frame === 'string' && frame.trim()) {
      user.frame = frame.trim();
    }
    if (Array.isArray(showcaseAchievements)) {
      user.showcaseAchievements = showcaseAchievements.filter((x: any) => typeof x === 'string').slice(0, 4);
    }
    if (Array.isArray(unlockedAchievements)) {
      user.unlockedAchievements = unlockedAchievements.filter((x: any) => typeof x === 'string');
    }
    if (typeof bestWpm === 'number' && !isNaN(bestWpm)) {
      user.bestWpm = Math.round(bestWpm);
    }
    if (bestWpmRecord && typeof bestWpmRecord === 'object') {
      user.bestWpmRecord = bestWpmRecord;
    }
    if (typeof totalGames === 'number' && !isNaN(totalGames)) {
      user.totalGames = Math.max(user.totalGames || 0, Math.round(totalGames));
    }
    if (Array.isArray(matchHistory)) {
      user.matchHistory = matchHistory.slice(0, 50);
    }
    if (cultivation && typeof cultivation === 'object') {
      user.cultivation = cultivation;
    }

    user.updatedAt = Date.now();
    serverUsers.set(user.id, user);
    saveUsersToFile();

    // Cập nhật tên hiển thị trên Bảng Vàng nếu người chơi đang nắm giữ kỷ lục
    let updatedHighScores = false;
    for (const modeKey of Object.keys(serverHighScores)) {
      const rec = serverHighScores[modeKey];
      if (rec && (rec.userId === user.id || rec.username.toLowerCase() === user.username.toLowerCase())) {
        rec.displayName = user.displayName || user.username;
        if (user.avatar) rec.avatar = user.avatar;
        if (user.frame) rec.frame = user.frame;
        updatedHighScores = true;
      }
    }
    if (updatedHighScores) {
      saveLeaderboardToFile();
      broadcastLeaderboard();
    }
    syncUserCultivationToCache(user);

    res.json({
      success: true,
      user: sanitizeUser(user),
      message: 'Cập nhật hồ sơ thành công!',
    });
  });

  // POST /api/auth/change-password: Change password for authenticated player
  app.post('/api/auth/change-password', (req, res) => {
    const authHeader = req.headers.authorization;
    const user = getUserByToken(authHeader);

    if (!user || !user.isVerified) {
      res.status(401).json({
        success: false,
        error: 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn. Vui lòng đăng nhập lại!',
      });
      return;
    }

    const { oldPassword, newPassword } = req.body || {};

    const cleanOld = String(oldPassword || '');
    const cleanNew = String(newPassword || '');

    if (!cleanOld) {
      res.status(400).json({
        success: false,
        error: 'Vui lòng nhập mật khẩu hiện tại.',
      });
      return;
    }

    if (!cleanNew || cleanNew.length < 4) {
      res.status(400).json({
        success: false,
        error: 'Mật khẩu mới phải có ít nhất 4 ký tự.',
      });
      return;
    }

    if (cleanOld === cleanNew) {
      res.status(400).json({
        success: false,
        error: 'Mật khẩu mới không được trùng với mật khẩu cũ.',
      });
      return;
    }

    if (!user.salt || !user.passwordHash) {
      res.status(400).json({
        success: false,
        error: 'Tài khoản chưa có mật khẩu gốc để đổi. Vui lòng thử lại!',
      });
      return;
    }

    const checkHash = hashPassword(cleanOld, user.salt);
    if (checkHash !== user.passwordHash) {
      res.status(400).json({
        success: false,
        error: 'Mật khẩu hiện tại không chính xác.',
      });
      return;
    }

    // Generate fresh salt and new hash
    const newSalt = crypto.randomBytes(16).toString('hex');
    const newPasswordHash = hashPassword(cleanNew, newSalt);

    user.salt = newSalt;
    user.passwordHash = newPasswordHash;
    user.updatedAt = Date.now();

    serverUsers.set(user.id, user);
    saveUsersToFile();

    console.log(`[FastTyping Auth] Đổi mật khẩu thành công cho tài khoản: ${user.username}`);

    res.json({
      success: true,
      message: 'Đổi mật khẩu thành công! Mật khẩu mới đã có hiệu lực.',
    });
  });

  // POST /api/auth/logout: Revoke current session token
  app.post('/api/auth/logout', (req, res) => {
    const authHeader = req.headers.authorization;
    const cleanToken = authHeader ? authHeader.replace(/^Bearer\s+/i, '').trim() : '';
    if (cleanToken) {
      for (const user of serverUsers.values()) {
        if (user.sessionTokens && user.sessionTokens.includes(cleanToken)) {
          user.sessionTokens = user.sessionTokens.filter((t) => t !== cleanToken);
          serverUsers.set(user.id, user);
          saveUsersToFile();
          break;
        }
      }
    }
    res.json({ success: true, message: 'Đã đăng xuất.' });
  });

  // GET /api/cultivation: Retrieve user's cultivation data
  app.get('/api/cultivation', (req, res) => {
    const authHeader = req.headers.authorization;
    let user = getUserByToken(authHeader);

    if (!user && req.query.userId) {
      user = serverUsers.get(String(req.query.userId)) || null;
    }
    if (!user && req.query.username) {
      user = getUserByUsername(String(req.query.username));
    }

    if (!user) {
      res.status(404).json({ success: false, error: 'Không tìm thấy thông tin tài khoản.' });
      return;
    }

    res.json({
      success: true,
      cultivation: user.cultivation || null,
    });
  });

  // Cấu hình Bảng Vàng Top 50 Tu Vi cập nhật định kỳ cứ 1 giờ sẽ cập nhật 1 lần
  const CULTIVATION_LEADERBOARD_INTERVAL_MS = 60 * 60 * 1000; // 1 giờ = 3.600.000 ms
  let lastCultivationLeaderboardUpdate = 0;
  let cachedCultivationTop50: any[] = [];
  let cachedCultivationRankedList: any[] = [];
  let cachedTotalCultivators = 0;

  function getSubStageName(tier: number): 'Sơ Kỳ' | 'Trung Kỳ' | 'Hậu Kỳ' | 'Đại Viên Mãn' {
    if (tier <= 3) return 'Sơ Kỳ';
    if (tier <= 6) return 'Trung Kỳ';
    if (tier <= 9) return 'Hậu Kỳ';
    return 'Đại Viên Mãn';
  }

  function buildCultivationLeaderboardSnapshot() {
    const map = new Map<string, any>();

    // Lấy dữ liệu từ tất cả tài khoản người chơi đã đăng ký trên hệ thống (serverUsers)
    for (const user of serverUsers.values()) {
      if (!user.username) continue;
      const cult = user.cultivation || {};
      const realmIndex = Math.max(0, Math.min(11, Number(cult.realmIndex) || 0));
      const tier = Math.max(1, Math.min(10, Number(cult.tier) || 1));
      const level = Math.max(1, Math.min(1000, Number(cult.level) || 1));
      const exp = Math.max(0, Number(cult.exp) || 0);
      const maxExp = Math.max(1, Number(cult.maxExp) || 500);
      const rawTho = cult.thoNguyen !== undefined ? Number(cult.thoNguyen) : 240;
      const thoNguyen = !isNaN(rawTho) && rawTho >= 0 ? rawTho : 240;
      const realmMeta = XIANXIA_REALM_METAS[realmIndex] || XIANXIA_REALM_METAS[0];

      map.set(user.username.toLowerCase(), {
        id: user.id,
        username: user.username,
        displayName: user.displayName || user.username,
        avatar: user.avatar || '⚡',
        frame: user.frame || realmMeta.frameId,
        realmIndex,
        realmName: realmMeta.name,
        realmIcon: realmMeta.icon,
        titleName: realmMeta.titleName,
        badge: realmMeta.badge,
        tier,
        subStage: getSubStageName(tier),
        level,
        exp,
        maxExp,
        thoNguyen,
        isRegistered: true,
      });
    }

    // Sắp xếp theo thứ tự tiến độ tu vi thực tế
    const all = Array.from(map.values()).map((c) => {
      const score = (c.realmIndex * 1_000_000_000) + (c.tier * 10_000_000) + (c.level * 100_000) + c.exp;
      return { ...c, score };
    });

    all.sort((a, b) => b.score - a.score);

    // Gán thứ hạng
    const rankedList = all.map((item, index) => {
      const { score, ...rest } = item;
      return {
        ...rest,
        rank: index + 1,
      };
    });

    cachedCultivationRankedList = rankedList;
    cachedCultivationTop50 = rankedList.slice(0, 50);
    cachedTotalCultivators = rankedList.length;
    lastCultivationLeaderboardUpdate = Date.now();

    console.log(`[Leaderboard] Cập nhật Bảng Vàng Top 50 Tu Vi chu kỳ 1 giờ/lần: ${cachedCultivationTop50.length} vị đại năng`);
  }

  // Khởi tạo snapshot đầu tiên khi server khởi động
  buildCultivationLeaderboardSnapshot();

  // Đặt lịch cập nhật định kỳ cứ 1 giờ sẽ cập nhật 1 lần
  setInterval(() => {
    try {
      buildCultivationLeaderboardSnapshot();
    } catch (err) {
      console.error('[Leaderboard] Lỗi khi cập nhật bảng vàng tu vi chu kỳ 1 giờ:', err);
    }
  }, CULTIVATION_LEADERBOARD_INTERVAL_MS);

  // Helper đồng bộ tu vi thực tế của người chơi vào danh sách ngay khi có cập nhật
  syncUserCultivationToCache = function(user: ServerUserRecord) {
    if (!user || !user.username || !user.cultivation) return;
    const cult = user.cultivation;
    const realmIndex = Math.max(0, Math.min(11, Number(cult.realmIndex) || 0));
    const tier = Math.max(1, Math.min(10, Number(cult.tier) || 1));
    const level = Math.max(1, Math.min(1000, Number(cult.level) || 1));
    const exp = Math.max(0, Number(cult.exp) || 0);
    const maxExp = Math.max(1, Number(cult.maxExp) || 500);
    const rawTho = cult.thoNguyen !== undefined ? Number(cult.thoNguyen) : 240;
    const thoNguyen = !isNaN(rawTho) && rawTho >= 0 ? rawTho : 240;
    const realmMeta = XIANXIA_REALM_METAS[realmIndex] || XIANXIA_REALM_METAS[0];

    const uLower = String(user.username || '').toLowerCase();
    const existingIndex = cachedCultivationRankedList.findIndex((item) => (item.username || '').toLowerCase() === uLower);
    if (existingIndex !== -1) {
      cachedCultivationRankedList[existingIndex] = {
        ...cachedCultivationRankedList[existingIndex],
        displayName: user.displayName || user.username,
        realmIndex,
        realmName: realmMeta.name,
        realmIcon: realmMeta.icon,
        titleName: realmMeta.titleName,
        badge: realmMeta.badge,
        tier,
        subStage: getSubStageName(tier),
        level,
        exp,
        maxExp,
        thoNguyen,
      };
    }

    const topIndex = cachedCultivationTop50.findIndex((item) => (item.username || '').toLowerCase() === uLower);
    if (topIndex !== -1) {
      cachedCultivationTop50[topIndex] = {
        ...cachedCultivationTop50[topIndex],
        displayName: user.displayName || user.username,
        realmIndex,
        realmName: realmMeta.name,
        realmIcon: realmMeta.icon,
        titleName: realmMeta.titleName,
        badge: realmMeta.badge,
        tier,
        subStage: getSubStageName(tier),
        level,
        exp,
        maxExp,
        thoNguyen,
      };
    }
  }

  // POST /api/cultivation: Update user's cultivation state
  app.post('/api/cultivation', (req, res) => {
    const authHeader = req.headers.authorization;
    let user = getUserByToken(authHeader);

    if (!user && req.body.userId) {
      user = serverUsers.get(String(req.body.userId)) || null;
    }
    if (!user && req.body.username) {
      user = getUserByUsername(String(req.body.username));
    }

    if (!user) {
      res.status(401).json({ success: false, error: 'Chưa đăng nhập hoặc không tìm thấy tài khoản.' });
      return;
    }

    if (req.body.cultivation && typeof req.body.cultivation === 'object') {
      user.cultivation = req.body.cultivation;
      user.updatedAt = Date.now();
      serverUsers.set(user.id, user);
      saveUsersToFile();
      // Đồng bộ ngay tu vi thực tế vào cache để đảm bảo không bị lệch
      syncUserCultivationToCache(user);
    }

    res.json({
      success: true,
      cultivation: user.cultivation,
    });
  });

  // Server background task: Decay Thọ Nguyên (cứ 2 giờ -1) & Tâm Ma (sau 48h không tu luyện)
  const TWO_HOURS_MS = 2 * 60 * 60 * 1000;
  const FORTY_EIGHT_HOURS_MS = 48 * 60 * 60 * 1000;
  const ONE_DAY_MS = 24 * 60 * 60 * 1000;

  setInterval(() => {
    const now = Date.now();
    let hasChanges = false;

    for (const [userId, user] of serverUsers.entries()) {
      if (!user.cultivation) continue;
      const cult = user.cultivation;
      let userChanged = false;

      // 1. Cứ 2 giờ trôi qua giảm 1 điểm Thọ Nguyên (trừ cảnh giới 11 Thiên Tôn)
      if ((cult.realmIndex ?? 0) < 11) {
        const lastDecay = cult.lastThoNguyenDecay || now;
        const elapsed = now - lastDecay;
        const units = Math.floor(elapsed / TWO_HOURS_MS);

        if (units > 0) {
          cult.thoNguyen = Math.max(0, (cult.thoNguyen ?? 240) - units);
          cult.lastThoNguyenDecay = lastDecay + units * TWO_HOURS_MS;
          userChanged = true;

          // Luân hồi nếu hết Thọ Nguyên: rớt về tầng 1 của 2 cảnh giới trước
          if (cult.thoNguyen <= 0) {
            const oldRealmIdx = cult.realmIndex ?? 0;
            const targetRealmIdx = Math.max(0, oldRealmIdx - 2);
            cult.realmIndex = targetRealmIdx;
            cult.tier = 1;
            cult.exp = 0;
            cult.thoNguyen = 240; // baseline
            if (!cult.historyLog) cult.historyLog = [];
            cult.historyLog.unshift(`⚠️ [TỌA HÓA LUÂN HỒI] Thọ nguyên cạn kiệt! Rơi vào luân hồi về cảnh giới thứ ${targetRealmIdx + 1} Tầng 1.`);
            if (cult.historyLog.length > 20) cult.historyLog.pop();
          }
        }
      }

      // 2. Giảm Tu Vi nếu không hoạt động sau 48h (Tâm ma xâm lấn)
      const lastActive = cult.lastCultivateTime || user.updatedAt || now;
      const inactiveElapsed = now - lastActive;
      if (inactiveElapsed > FORTY_EIGHT_HOURS_MS && (cult.exp ?? 0) > 0) {
        const overdueDays = Math.floor((inactiveElapsed - FORTY_EIGHT_HOURS_MS) / ONE_DAY_MS) + 1;
        const decayPercent = Math.min(30, overdueDays * 3);
        const maxExp = cult.maxExp || 500;
        const expLost = Math.round((maxExp * decayPercent) / 100);
        if (expLost > 0 && cult.exp > 0) {
          const oldExp = cult.exp;
          cult.exp = Math.max(0, cult.exp - expLost);
          if (oldExp !== cult.exp) {
            userChanged = true;
            if (!cult.historyLog) cult.historyLog = [];
            cult.historyLog.unshift(`💀 [TÂM MA XÂM LẤN] Không tu luyện quá 48h, tổn thất ${oldExp - cult.exp} Tu Vi!`);
            if (cult.historyLog.length > 20) cult.historyLog.pop();
          }
        }
      }

      if (userChanged) {
        user.cultivation = cult;
        serverUsers.set(userId, user);
        hasChanges = true;
      }
    }

    if (hasChanges) {
      saveUsersToFile();
    }
  }, 60000); // Check every 60 seconds

  // Health check
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', activeRooms: rooms.size, registeredUsers: serverUsers.size });
  });

  // Get all active rooms (chỉ lấy các phòng có ít nhất 1 người chơi thực và chưa kết thúc)
  app.get('/api/rooms', (_req, res) => {
    cleanupInactiveRooms();
    const list = Array.from(rooms.values()).filter(
      (r) => r.status !== 'finished' && r.players.some((p) => !p.isBot)
    );
    res.json({ success: true, rooms: list });
  });

  // Get specific room by code
  app.get('/api/rooms/:id', (req, res) => {
    const norm = normalizeRoomCode(req.params.id);
    const room = rooms.get(norm);
    if (!room) {
      res.status(404).json({ success: false, error: 'Room not found' });
      return;
    }
    const humanPlayers = room.players.filter((p) => !p.isBot);
    if (humanPlayers.length === 0) {
      stopRoomBots(norm, false);
      rooms.delete(norm);
      sseClientsByRoom.delete(norm);
      roomChatMessages.delete(norm);
      res.status(404).json({ success: false, error: 'Phòng không còn người chơi thực' });
      return;
    }
    res.json({ success: true, room });
  });

  // Create new room
  app.post('/api/rooms', (req, res) => {
    const { mode, host, isQuickRoom = false, difficulty } = req.body;
    if (!mode || !host) {
      res.status(400).json({ success: false, error: 'Thiếu thông tin người chơi hoặc chế độ chơi.' });
      return;
    }

    // Bàn Cổ Thần Thức: Kiểm tra án phạt cấm đấu 2 giờ
    const hostBan = checkIsBanned(host.username || host.id);
    if (hostBan.isBanned) {
      res.status(403).json({
        success: false,
        error: `Tài khoản đang chịu án phạt từ Bàn Cổ Thần Thức (Cấm thi đấu 2 giờ). Thời gian thụ án còn lại: ${hostBan.remainingMinutes} phút!`,
      });
      return;
    }

    const code = generateUniqueRoomCode();
    const hostPlayer: Player = {
      ...host,
      isBot: false,
      progress: 0,
      wpm: 0,
      score: 0,
      errors: 0,
      correctChars: 0,
      isFinished: false,
      isSurrendered: false,
      isAFK: false,
    };

    const newRoom: GameRoom = {
      id: code,
      mode,
      hostId: host.id,
      hostName: host.username,
      isQuickRoom: Boolean(isQuickRoom),
      status: 'waiting',
      createdAt: Date.now(),
      lastActive: Date.now(),
      players: [hostPlayer],
      difficulty: difficulty || (mode === 'numpad' ? 'number' : 'normal'),
      maxSlots: 8,
    };

    rooms.set(code, newRoom);
    broadcastToRoom(code, { type: 'room_updated', room: newRoom });

    res.json({ success: true, room: newRoom, isHost: true });
  });

  // Join room by code
  app.post('/api/rooms/join', (req, res) => {
    const { rawCode, player, currentMode } = req.body;
    if (!rawCode || !player) {
      res.status(400).json({ success: false, error: 'Vui lòng nhập mã phòng hợp lệ.' });
      return;
    }

    // Bàn Cổ Thần Thức: Kiểm tra án phạt cấm đấu 2 giờ
    const playerBan = checkIsBanned(player.username || player.id);
    if (playerBan.isBanned) {
      res.status(403).json({
        success: false,
        error: `Tài khoản đang chịu án phạt từ Bàn Cổ Thần Thức (Cấm thi đấu 2 giờ). Thời gian thụ án còn lại: ${playerBan.remainingMinutes} phút!`,
      });
      return;
    }

    const normCode = normalizeRoomCode(rawCode);
    const room = rooms.get(normCode);

    if (!room) {
      res.json({
        success: false,
        error: `Không tìm thấy phòng với mã "${normCode}". Vui lòng kiểm tra lại mã phòng (chủ phòng có thể đã rời hoặc đóng phòng)!`,
      });
      return;
    }

    // 1. Kiểm tra chế độ chơi
    if (room.mode !== currentMode) {
      res.json({
        success: false,
        error: `Mã phòng ${room.id} thuộc chế độ "${getModeDisplayName(
          room.mode
        )}", khác với chế độ "${getModeDisplayName(
          currentMode
        )}" bạn đang chọn. Vui lòng chuyển sang chế độ "${getModeDisplayName(
          room.mode
        )}" để cùng tham gia thi đấu!`,
      });
      return;
    }

    // 2. Kiểm tra trạng thái
    if (room.status === 'playing') {
      res.json({
        success: false,
        error: `Phòng ${room.id} hiện đang trong trận đấu. Không thể tham gia lúc này!`,
      });
      return;
    }

    if (room.status === 'finished') {
      res.json({
        success: false,
        error: `Phòng ${room.id} đã kết thúc. Vui lòng tạo phòng mới hoặc vào phòng khác!`,
      });
      return;
    }

    // 3. Kiểm tra số lượng
    const existingIndex = room.players.findIndex((p) => p.id === player.id);
    if (existingIndex === -1 && room.players.length >= room.maxSlots) {
      res.json({
        success: false,
        error: `Phòng ${room.id} đã đủ số lượng (${room.players.length}/${room.maxSlots} người chơi). Không thể tham gia thêm!`,
      });
      return;
    }

    // 4. Không cho phép tên người chơi biệt danh trùng nhau trong cùng một phòng
    const isDuplicateName = room.players.some(
      (p) => p.id !== player.id && p.username.trim().toLowerCase() === String(player.username || '').trim().toLowerCase()
    );
    if (isDuplicateName) {
      res.json({
        success: false,
        error: `Biệt danh "${player.username}" đã có người sử dụng trong phòng này. Vui lòng đổi biệt danh khác!`,
      });
      return;
    }

    const guestPlayer: Player = {
      ...player,
      isBot: false,
      progress: 0,
      wpm: 0,
      score: 0,
      errors: 0,
      correctChars: 0,
      isFinished: false,
      isSurrendered: false,
      isAFK: false,
    };

    if (existingIndex >= 0) {
      room.players[existingIndex] = {
        ...room.players[existingIndex],
        ...guestPlayer,
      };
    } else {
      room.players.push(guestPlayer);
    }

    room.lastActive = Date.now();
    rooms.set(normCode, room);

    broadcastToRoom(normCode, { type: 'room_updated', room });

    res.json({
      success: true,
      room,
      isHost: room.hostId === player.id,
    });
  });

  // Quick Join or Create Room
  app.post('/api/rooms/quick-join', (req, res) => {
    const { mode, player, difficulty } = req.body;
    if (!mode || !player) {
      res.status(400).json({ success: false, error: 'Thiếu thông tin người chơi hoặc chế độ.' });
      return;
    }

    // Bàn Cổ Thần Thức: Kiểm tra án phạt cấm đấu 2 giờ
    const playerBan = checkIsBanned(player.username || player.id);
    if (playerBan.isBanned) {
      res.status(403).json({
        success: false,
        error: `Tài khoản đang chịu án phạt từ Bàn Cổ Thần Thức (Cấm thi đấu 2 giờ). Thời gian thụ án còn lại: ${playerBan.remainingMinutes} phút!`,
      });
      return;
    }

    cleanupInactiveRooms();
    const now = Date.now();

    // Find candidate quick room
    const candidateRooms = Array.from(rooms.values())
      .filter((r) => {
        return (
          r.mode === mode &&
          r.isQuickRoom === true &&
          r.status === 'waiting' &&
          r.players.length < r.maxSlots &&
          r.players.some((p) => !p.isBot) &&
          now - (r.lastActive || r.createdAt) < 15 * 60 * 1000
        );
      })
      .sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));

    if (candidateRooms.length > 0) {
      const matchedRoom = candidateRooms[0];
      const existingIdx = matchedRoom.players.findIndex((p) => p.id === player.id);

      const freshPlayer: Player = {
        ...player,
        isBot: false,
        progress: 0,
        wpm: 0,
        score: 0,
        errors: 0,
        correctChars: 0,
        isFinished: false,
        isSurrendered: false,
        isAFK: false,
      };

      if (existingIdx >= 0) {
        matchedRoom.players[existingIdx] = {
          ...matchedRoom.players[existingIdx],
          ...freshPlayer,
        };
      } else {
        matchedRoom.players.push(freshPlayer);
      }

      matchedRoom.lastActive = now;
      rooms.set(matchedRoom.id, matchedRoom);

      broadcastToRoom(matchedRoom.id, { type: 'room_updated', room: matchedRoom });

      res.json({
        success: true,
        room: matchedRoom,
        isHost: matchedRoom.hostId === player.id,
        isNewlyCreated: false,
      });
      return;
    }

    // No waiting quick room available, create a fresh one
    const code = generateUniqueRoomCode();
    const hostPlayer: Player = {
      ...player,
      isBot: false,
      progress: 0,
      wpm: 0,
      score: 0,
      errors: 0,
      correctChars: 0,
      isFinished: false,
      isSurrendered: false,
      isAFK: false,
    };

    const newQuickRoom: GameRoom = {
      id: code,
      mode,
      hostId: player.id,
      hostName: player.username,
      isQuickRoom: true,
      status: 'waiting',
      createdAt: now,
      lastActive: now,
      players: [hostPlayer],
      difficulty: difficulty || (mode === 'numpad' ? 'number' : 'normal'),
      maxSlots: 8,
    };

    rooms.set(code, newQuickRoom);
    broadcastToRoom(code, { type: 'room_updated', room: newQuickRoom });

    res.json({
      success: true,
      room: newQuickRoom,
      isHost: true,
      isNewlyCreated: true,
    });
  });

  // Update players list (add/remove bot)
  app.post('/api/rooms/:id/players', (req, res) => {
    const norm = normalizeRoomCode(req.params.id);
    const room = rooms.get(norm);
    if (!room) {
      res.status(404).json({ success: false, error: 'Room not found' });
      return;
    }

    const { players } = req.body;
    if (Array.isArray(players)) {
      const humanPlayers = players.filter((p) => !p.isBot);
      if (humanPlayers.length === 0) {
        stopRoomBots(norm, false);
        rooms.delete(norm);
        sseClientsByRoom.delete(norm);
        roomChatMessages.delete(norm);
        broadcastToRoom(norm, { type: 'room_closed', roomId: norm });
        res.json({ success: true, message: 'Phòng đã tự động giải tán do không còn người chơi thực' });
        return;
      }
      room.players = players;
      room.lastActive = Date.now();
      rooms.set(norm, room);
      broadcastToRoom(norm, { type: 'room_updated', room });
    }

    res.json({ success: true, room });
  });

  // Transfer host: Chủ phòng nhường quyền cho người chơi khác, người được chọn lên Slot 1 (index 0), chủ cũ vào slot người kia để lại
  app.post('/api/rooms/:id/transfer-host', (req, res) => {
    const norm = normalizeRoomCode(req.params.id);
    const room = rooms.get(norm);
    if (!room) {
      res.status(404).json({ success: false, error: 'Room not found' });
      return;
    }

    const { targetPlayerId, requesterId } = req.body;
    if (room.hostId !== requesterId) {
      res.status(403).json({ success: false, error: 'Chỉ chủ phòng mới có quyền chuyển nhượng chủ phòng' });
      return;
    }

    const targetIdx = room.players.findIndex((p) => p.id === targetPlayerId);
    if (targetIdx === -1) {
      res.status(404).json({ success: false, error: 'Không tìm thấy người chơi được chọn' });
      return;
    }

    const targetPlayer = room.players[targetIdx];
    if (targetPlayer.isBot) {
      res.status(400).json({ success: false, error: 'Không thể nhường chủ phòng cho Bot' });
      return;
    }

    const hostIdx = room.players.findIndex((p) => p.id === room.hostId);
    const effectiveHostIdx = hostIdx !== -1 ? hostIdx : 0;
    const oldHostPlayer = room.players[effectiveHostIdx];

    // Hoán đổi vị trí:
    // Slot 1 (index 0) là người được nhường (targetPlayer)
    // Slot của targetPlayer được thay bằng oldHostPlayer
    const newPlayers = [...room.players];
    if (effectiveHostIdx === 0) {
      newPlayers[0] = targetPlayer;
      newPlayers[targetIdx] = oldHostPlayer;
    } else {
      const slot0 = newPlayers[0];
      newPlayers[0] = targetPlayer;
      newPlayers[targetIdx] = oldHostPlayer;
      newPlayers[effectiveHostIdx] = slot0;
    }

    room.players = newPlayers;
    room.hostId = targetPlayer.id;
    room.hostName = targetPlayer.username;
    room.lastActive = Date.now();
    rooms.set(norm, room);

    broadcastToRoom(norm, {
      type: 'host_transferred',
      oldHostId: requesterId,
      newHostId: targetPlayer.id,
      newHostName: targetPlayer.username,
      room,
    });
    broadcastToRoom(norm, { type: 'room_updated', room });

    res.json({ success: true, room });
  });

  // Kick player or bot: Chủ phòng đá người chơi hoặc bot khỏi phòng
  app.post('/api/rooms/:id/kick', (req, res) => {
    const norm = normalizeRoomCode(req.params.id);
    const room = rooms.get(norm);
    if (!room) {
      res.status(404).json({ success: false, error: 'Room not found' });
      return;
    }

    const { targetPlayerId, requesterId } = req.body;
    if (room.hostId !== requesterId) {
      res.status(403).json({ success: false, error: 'Chỉ chủ phòng mới có quyền mời người chơi rời phòng' });
      return;
    }

    if (targetPlayerId === room.hostId) {
      res.status(400).json({ success: false, error: 'Chủ phòng không thể tự đá chính mình' });
      return;
    }

    const targetPlayer = room.players.find((p) => p.id === targetPlayerId);
    if (!targetPlayer) {
      res.status(404).json({ success: false, error: 'Không tìm thấy người chơi' });
      return;
    }

    room.players = room.players.filter((p) => p.id !== targetPlayerId);
    const humanPlayers = room.players.filter((p) => !p.isBot);
    if (humanPlayers.length === 0) {
      stopRoomBots(norm, false);
      rooms.delete(norm);
      sseClientsByRoom.delete(norm);
      roomChatMessages.delete(norm);
      broadcastToRoom(norm, { type: 'room_closed', roomId: norm });
      res.json({ success: true, roomClosed: true });
      return;
    }

    room.lastActive = Date.now();
    rooms.set(norm, room);

    // Nếu người bị đá là người chơi thực, broadcast event player_kicked
    if (!targetPlayer.isBot) {
      broadcastToRoom(norm, {
        type: 'player_kicked',
        roomId: norm,
        playerId: targetPlayerId,
        username: targetPlayer.username,
      });
    }

    broadcastToRoom(norm, { type: 'room_updated', room });

    res.json({ success: true, room });
  });

  // Update room difficulty (Host configuration)
  app.post('/api/rooms/:id/difficulty', (req, res) => {
    const norm = normalizeRoomCode(req.params.id);
    const room = rooms.get(norm);
    if (!room) {
      res.status(404).json({ success: false, error: 'Room not found' });
      return;
    }

    const { difficulty } = req.body;
    if (difficulty) {
      room.difficulty = difficulty;
      room.lastActive = Date.now();
      rooms.set(norm, room);
      broadcastToRoom(norm, { type: 'room_updated', room });
    }

    res.json({ success: true, room });
  });

  // Update room mode (Host configuration)
  app.post('/api/rooms/:id/mode', (req, res) => {
    const norm = normalizeRoomCode(req.params.id);
    const room = rooms.get(norm);
    if (!room) {
      res.status(404).json({ success: false, error: 'Room not found' });
      return;
    }

    const { mode, difficulty } = req.body;
    if (mode) {
      room.mode = mode;
      if (difficulty) {
        room.difficulty = difficulty;
      } else {
        room.difficulty = mode === 'numpad' ? 'number' : 'normal';
      }
      room.lastActive = Date.now();
      rooms.set(norm, room);
      broadcastToRoom(norm, { type: 'room_updated', room });
    }

    res.json({ success: true, room });
  });

  // Update room status (waiting / playing / finished + synchronize words)
  app.post('/api/rooms/:id/status', (req, res) => {
    const norm = normalizeRoomCode(req.params.id);
    const room = rooms.get(norm);
    if (!room) {
      res.status(404).json({ success: false, error: 'Room not found' });
      return;
    }

    const humanPlayers = room.players.filter((p) => !p.isBot);
    if (humanPlayers.length === 0) {
      stopRoomBots(norm, false);
      rooms.delete(norm);
      sseClientsByRoom.delete(norm);
      roomChatMessages.delete(norm);
      broadcastToRoom(norm, { type: 'room_closed', roomId: norm });
      res.status(404).json({ success: false, error: 'Phòng không còn người chơi thực' });
      return;
    }

    const { status, mode, words, mysteryWords, matchId, difficulty } = req.body;
    room.status = status;
    room.lastActive = Date.now();
    if (words) room.words = words;
    if (mysteryWords) room.mysteryWords = mysteryWords;
    if (mode) room.mode = mode;
    if (difficulty) room.difficulty = difficulty;

    if (status === 'playing') {
      // Gán mã định danh duy nhất cho từng trận đấu (matchId) để phòng tránh hiện tượng tự động reset phòng
      room.matchId = matchId || ('match_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7));
      // Khi bắt đầu: tất cả người chơi trong phòng được đánh dấu inMatch = true (avatar xám)
      room.players.forEach((p) => {
        p.inMatch = true;
        p.isSurrendered = false;
        p.isFinished = false;
        p.progress = 0;
        p.wpm = 0;
        p.correctChars = 0;
        p.errors = 0;
      });
      startRoomBots(norm);
    } else if (status === 'waiting') {
      stopRoomBots(norm, true);
      // Khi trở về phòng chờ: tắt inMatch (avatar sáng lên) cho tất cả người chơi và bot
      room.players.forEach((p) => {
        p.inMatch = false;
        p.isSurrendered = false;
        p.isFinished = false;
        p.progress = 0;
        p.wpm = 0;
        p.correctChars = 0;
        p.errors = 0;
      });
    } else if (status === 'finished') {
      stopRoomBots(norm, true);
      // Khi trận đấu kết thúc hoặc người chơi duy nhất đầu hàng kết thúc sớm:
      // Toàn bộ bot ngay lập tức trở về trạng thái chờ trong phòng (inMatch: false)
      room.players.forEach((p) => {
        if (p.isBot) {
          p.inMatch = false;
          p.isSurrendered = false;
          p.isFinished = false;
          p.progress = 0;
          p.wpm = 0;
          p.correctChars = 0;
          p.errors = 0;
        }
      });
    }

    rooms.set(norm, room);

    if (status === 'playing') {
      broadcastToRoom(norm, {
        type: 'room_started',
        roomId: norm,
        matchId: room.matchId,
        mode: room.mode,
        words: room.words,
        mysteryWords: room.mysteryWords,
        room,
      });
    } else {
      broadcastToRoom(norm, { type: 'room_updated', room });
    }

    res.json({ success: true, room });
  });

  // Update specific player status in room (e.g. surrender and return to waiting room -> inMatch: false)
  app.post('/api/rooms/:id/player-status', (req, res) => {
    const norm = normalizeRoomCode(req.params.id);
    const room = rooms.get(norm);
    if (!room) {
      res.status(404).json({ success: false, error: 'Room not found' });
      return;
    }

    const humanPlayers = room.players.filter((p) => !p.isBot);
    if (humanPlayers.length === 0) {
      stopRoomBots(norm, false);
      rooms.delete(norm);
      sseClientsByRoom.delete(norm);
      roomChatMessages.delete(norm);
      broadcastToRoom(norm, { type: 'room_closed', roomId: norm });
      res.status(404).json({ success: false, error: 'Phòng không còn người chơi thực' });
      return;
    }

    const { playerId, inMatch, isSurrendered, isFinished } = req.body;
    const player = room.players.find((p) => p.id === playerId);
    if (player) {
      if (typeof inMatch === 'boolean') player.inMatch = inMatch;
      if (typeof isSurrendered === 'boolean') player.isSurrendered = isSurrendered;
      if (typeof isFinished === 'boolean') player.isFinished = isFinished;

      // Khi người chơi cuối cùng đầu hàng hoặc out trong phòng đang thi đấu (playing):
      // Kết thúc phòng ngay lập tức và tổng kết mà không đợi hết thời gian, bot lập tức về phòng chờ
      if (room.status === 'playing') {
        const activeHumanPlayers = humanPlayers.filter(
          (p) => !p.isSurrendered && !p.isFinished && p.inMatch !== false
        );
        if (activeHumanPlayers.length === 0) {
          room.status = 'finished';
          stopRoomBots(norm, true);
        }
      }

      // Nếu tất cả người chơi thực đã trở về phòng chờ (không còn ai inMatch), phòng tự động chuyển về trạng thái 'waiting'
      if (humanPlayers.length > 0 && humanPlayers.every((p) => !p.inMatch)) {
        room.status = 'waiting';
        stopRoomBots(norm, true);
      }

      room.lastActive = Date.now();
      rooms.set(norm, room);
      broadcastToRoom(norm, { type: 'room_updated', room });
    }

    res.json({ success: true, room });
  });

  // Live in-game player progress sync
  app.post('/api/rooms/:id/player-progress', (req, res) => {
    const norm = normalizeRoomCode(req.params.id);
    const room = rooms.get(norm);
    if (!room) {
      res.status(404).json({ success: false, error: 'Room not found' });
      return;
    }

    const { playerId, progress, correctChars, errors, wpm, isFinished } = req.body;
    const player = room.players.find((p) => p.id === playerId);
    if (player) {
      player.progress = progress;
      player.correctChars = correctChars;
      player.errors = errors;
      player.wpm = wpm;
      if (typeof isFinished === 'boolean') {
        player.isFinished = isFinished;
        if (isFinished && room.status === 'playing') {
          const humanPlayers = room.players.filter((p) => !p.isBot);
          const activeHumans = humanPlayers.filter(
            (p) => !p.isSurrendered && !p.isFinished && p.inMatch !== false
          );
          if (activeHumans.length === 0) {
            room.status = 'finished';
            stopRoomBots(norm, true);
            broadcastToRoom(norm, { type: 'room_updated', room });
          }
        }
      }
      room.lastActive = Date.now();
      broadcastToRoom(norm, {
        type: 'player_progress',
        roomId: norm,
        playerId,
        progress,
        correctChars,
        errors,
        wpm,
        isFinished: player.isFinished,
        status: room.status,
        players: room.players,
      });
    }

    res.json({ success: true });
  });

  // Leave room: Xóa người chơi khỏi phòng chờ, nếu chủ phòng rời/bị xóa thì slot kế tiếp được đôn lên làm chủ phòng
  app.post('/api/rooms/:id/leave', (req, res) => {
    const norm = normalizeRoomCode(req.params.id);
    const room = rooms.get(norm);
    if (!room) {
      res.json({ success: true });
      return;
    }

    const { playerId } = req.body;
    const wasHost = room.hostId === playerId;
    room.players = room.players.filter((p) => p.id !== playerId);

    const humanPlayers = room.players.filter((p) => !p.isBot);
    if (humanPlayers.length === 0) {
      stopRoomBots(norm, false);
      rooms.delete(norm);
      sseClientsByRoom.delete(norm);
      roomChatMessages.delete(norm);
      broadcastToRoom(norm, { type: 'room_closed', roomId: norm });
    } else {
      if (wasHost) {
        // Slot kế tiếp trong danh sách người chơi thực được đôn lên làm chủ phòng
        const nextHost = humanPlayers[0];
        room.hostId = nextHost.id;
        room.hostName = nextHost.username;
      }
      // Nếu phòng đang thi đấu (status === 'playing') mà người chơi cuối cùng rời phòng (out):
      // Kết thúc phòng ngay lập tức và tổng kết, bot lập tức về phòng
      if (room.status === 'playing') {
        const activeHumanPlayers = humanPlayers.filter(
          (p) => !p.isSurrendered && !p.isFinished && p.inMatch !== false
        );
        if (activeHumanPlayers.length === 0) {
          room.status = 'finished';
          stopRoomBots(norm, true);
        }
      }
      if (humanPlayers.length > 0 && humanPlayers.every((p) => !p.inMatch)) {
        room.status = 'waiting';
        stopRoomBots(norm, true);
      }
      room.lastActive = Date.now();
      rooms.set(norm, room);
      broadcastToRoom(norm, { type: 'room_updated', room });
    }

    res.json({ success: true, room });
  });

  // SSE Stream for realtime room synchronization
  app.get('/api/rooms/:id/stream', (req, res) => {
    const norm = normalizeRoomCode(req.params.id);
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders?.();

    let clientSet = sseClientsByRoom.get(norm);
    if (!clientSet) {
      clientSet = new Set();
      sseClientsByRoom.set(norm, clientSet);
    }
    clientSet.add(res);

    // Send current room state immediately
    const room = rooms.get(norm);
    if (room) {
      res.write(`data: ${JSON.stringify({ type: 'room_updated', room })}\n\n`);
      const existingMsgs = roomChatMessages.get(norm) || [];
      if (existingMsgs.length > 0) {
        res.write(`data: ${JSON.stringify({ type: 'init_room_chat', roomId: norm, messages: existingMsgs })}\n\n`);
      }
    }

    // Keep-alive heartbeat every 15s
    const heartbeat = setInterval(() => {
      try {
        res.write(': heartbeat\n\n');
      } catch {
        clearInterval(heartbeat);
      }
    }, 15000);

    req.on('close', () => {
      clearInterval(heartbeat);
      clientSet?.delete(res);
      if (clientSet && clientSet.size === 0) {
        sseClientsByRoom.delete(norm);
      }
    });
  });

  // SSE Stream for Realtime Global/Sect/Whisper Chat, Online Presence, Leaderboards, and Live Friend Events
  app.get('/api/chat/stream', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders?.();

    const tabId = String(req.query.tabId || '').trim();
    const userId = String(req.query.userId || '').trim();
    const username = String(req.query.username || '').trim();

    sseGlobalChatClients.add(res);
    sseClientMeta.set(res, { userId, username, tabId });

    if (tabId) {
      sseGlobalClients.set(res, tabId);
      const meta = extractSessionMetaFromReq(req);
      registerPresence(tabId, userId, meta);
    }

    // Send initial chat, presence and leaderboard state
    res.write(`data: ${JSON.stringify({ type: 'init_chat', messages: globalChatMessages.slice(-50) })}\n\n`);
    res.write(`data: ${JSON.stringify({ type: 'online_count', count: getRealOnlineCount() })}\n\n`);
    res.write(`data: ${JSON.stringify({ type: 'leaderboard_updated', highScores: serverHighScores })}\n\n`);

    // Notify of pending friend requests if user is registered
    if (userId || username) {
      const cleanId = (userId || '').toLowerCase();
      const cleanName = (username || '').toLowerCase();
      const pendingCount = Array.from(serverFriendRequests.values()).filter(
        (r) =>
          (cleanId && r.toUserId && r.toUserId.toLowerCase() === cleanId) ||
          (cleanName && r.toUsername && r.toUsername.toLowerCase() === cleanName) ||
          (cleanName && r.toUserId && r.toUserId.toLowerCase() === cleanName)
      ).length;
      if (pendingCount > 0) {
        res.write(`data: ${JSON.stringify({ type: 'friend_requests_count', count: pendingCount })}\n\n`);
      }
    }

    // Keep-alive heartbeat every 15s
    const heartbeat = setInterval(() => {
      try {
        res.write(': heartbeat\n\n');
      } catch {
        clearInterval(heartbeat);
      }
    }, 15000);

    req.on('close', () => {
      clearInterval(heartbeat);
      sseGlobalChatClients.delete(res);
      sseGlobalClients.delete(res);
      sseClientMeta.delete(res);
      if (tabId) {
        removePresence(tabId);
      }
    });
  });

  // GET /api/chat/messages: Fetch chat messages with multi-channel support (global, room, sect, whisper)
  app.get('/api/chat/messages', (req, res) => {
    const channel = String(req.query.channel || 'global').trim();
    const roomId = req.query.roomId ? normalizeRoomCode(String(req.query.roomId)) : '';
    const sectId = String(req.query.sectId || '').trim();
    const currentUserId = String(req.query.currentUserId || '').trim();
    const targetUserId = String(req.query.targetUserId || '').trim();

    if (channel === 'room' && roomId) {
      const msgs = roomChatMessages.get(roomId) || [];
      res.json({ success: true, messages: msgs });
      return;
    }

    if (channel === 'sect' && sectId) {
      const msgs = sectChatMessages.get(sectId) || [];
      res.json({ success: true, messages: msgs });
      return;
    }

    if (channel === 'whisper' && currentUserId && targetUserId) {
      const key = getWhisperKey(currentUserId, targetUserId);
      const msgs = whisperChatMessages.get(key) || [];
      res.json({ success: true, messages: msgs });
      return;
    }

    res.json({ success: true, messages: globalChatMessages });
  });

  // POST /api/chat/messages: Broadcast new chat message with multi-channel, rich cards & slash commands
  app.post('/api/chat/messages', (req, res) => {
    let { 
      username, 
      avatar, 
      frame, 
      message, 
      channel = 'global', 
      roomId, 
      sectId,
      whisperTarget,
      whisperTargetUserId,
      senderUserId,
      senderRealm,
      senderRealmIcon,
      senderSectTag,
      cardType,
      cardData,
      isAdmin, 
      isDaoBot, 
      daoEventType, 
      daoTitle 
    } = req.body;

    if (!message || typeof message !== 'string' || !message.trim()) {
      res.status(400).json({ success: false, error: 'Tin nhắn không được để trống' });
      return;
    }

    let targetChannel = (['global', 'sect', 'room', 'whisper'].includes(channel) ? channel : 'global') as 'global' | 'sect' | 'room' | 'whisper';
    const normRoomId = roomId ? normalizeRoomCode(String(roomId)) : undefined;
    const msgId = (typeof req.body.id === 'string' && req.body.id.trim())
      ? req.body.id.trim()
      : `msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

    const isBotName = username === 'Huyền Thiên Khí Linh' || username === 'Linh Lung Tiên Đồng' || username === 'Bàn Cổ Thần Thức';
    const finalUsername = isDaoBot 
      ? (username && isBotName ? username : (username || 'Huyền Thiên Khí Linh'))
      : String(username || 'Vô Danh').trim().slice(0, 30);

    // Bàn Cổ Thần Thức: Kiểm tra án phạt cấm đấu / cấm túc
    if (!isDaoBot && !isBotName) {
      const userBan = checkIsBanned(finalUsername);
      if (userBan.isBanned) {
        res.status(403).json({
          success: false,
          error: `Đạo hữu đang chịu án phạt từ Bàn Cổ Thần Thức (Cấm túc U Minh Hàn Ngục còn ${userBan.remainingMinutes} phút), tạm thời không thể phát ngôn!`,
        });
        return;
      }
    }

    // Look up sender's registered user record if available to enrich realm and sect badge
    const senderUser = senderUserId ? serverUsers.get(senderUserId) : getUserByUsername(finalUsername);
    if (senderUser) {
      if (!senderUserId) senderUserId = senderUser.id;
      if (!senderRealm && senderUser.cultivation) {
        const rMeta = XIANXIA_REALM_METAS[senderUser.cultivation.realmIndex || 0];
        senderRealm = rMeta?.name;
        senderRealmIcon = rMeta?.icon;
      }
      if (!senderSectTag && senderUser.cultivation?.sectTag) {
        senderSectTag = senderUser.cultivation.sectTag;
      }
    }

    // Slash Commands parsing
    const rawText = message.trim();
    if (rawText.startsWith('/roll')) {
      const topic = rawText.replace(/^\/roll\s*/i, '').trim() || 'Lắc xí ngầu độ duyên';
      const rollVal = Math.floor(Math.random() * 100) + 1;
      cardType = 'roll_result';
      cardData = {
        rollNumber: rollVal,
        rollTopic: topic,
      };
      message = `🎲 [Độ Duyên]: ${finalUsername} lắc được ${rollVal} điểm! (${topic})`;
    } else if (rawText.startsWith('/w ') || rawText.startsWith('/whisper ')) {
      const parts = rawText.split(' ');
      if (parts.length >= 3) {
        whisperTarget = parts[1].replace(/^@/, '');
        message = parts.slice(2).join(' ');
        targetChannel = 'whisper';
        const targetU = getUserByUsername(whisperTarget);
        if (targetU) whisperTargetUserId = targetU.id;
      }
    } else if (rawText.startsWith('/phapbao')) {
      cardType = 'item_share';
      const artName = senderUser?.cultivation?.artifacts?.equipped || 'Tru Tiên Cổ Kiếm';
      cardData = {
        itemType: 'artifact',
        itemName: artName,
        itemIcon: '⚔️',
        itemQuality: 'Thần Phẩm Chí Bảo',
        itemDescription: 'Khí tức ngập tràn thiên địa, chấn nhiếp bát hoang yêu ma.',
      };
      message = `⚔️ ${finalUsername} khoe pháp bảo: [${artName}]!`;
    } else if (rawText.startsWith('/dan')) {
      cardType = 'item_share';
      cardData = {
        itemType: 'pill',
        itemName: 'Hóa Thần Cửu Chuyển Đan',
        itemIcon: '🔮',
        itemQuality: 'Cực Phẩm Linh Đan',
        itemDescription: 'Hỗ trợ ngưng tụ nguyên thần, bứt phá bình cảnh tu vi trong chớp mắt.',
      };
      message = `🔮 ${finalUsername} khoe linh đan: [Hóa Thần Cửu Chuyển Đan]!`;
    }

    const finalAvatar = isDaoBot
      ? (avatar || (finalUsername === 'Linh Lung Tiên Đồng' ? '🪷' : (finalUsername === 'Bàn Cổ Thần Thức' ? '⚡' : '☯️')))
      : (avatar || '⚡');
    const finalFrame = isDaoBot
      ? (frame || (finalUsername === 'Linh Lung Tiên Đồng' ? 'arcane_purple' : (finalUsername === 'Bàn Cổ Thần Thức' ? 'dragon_dark_blood' : 'admin_gold')))
      : (frame || 'default');

    const newMsg: ServerChatMessage = {
      id: msgId,
      username: finalUsername,
      avatar: finalAvatar,
      frame: finalFrame,
      message: message.trim().slice(0, 500),
      timestamp: Date.now(),
      channel: targetChannel,
      roomId: normRoomId,
      sectId: sectId || undefined,
      whisperTarget: whisperTarget || undefined,
      whisperTargetUserId: whisperTargetUserId || undefined,
      senderUserId: senderUserId || undefined,
      senderRealm: senderRealm || undefined,
      senderRealmIcon: senderRealmIcon || undefined,
      senderSectTag: senderSectTag || undefined,
      cardType: cardType || undefined,
      cardData: cardData || undefined,
      isAdmin: Boolean(isAdmin || isDaoBot),
      isDaoBot: Boolean(isDaoBot),
      daoEventType: daoEventType || undefined,
      daoTitle: daoTitle || undefined,
    };

    if (targetChannel === 'global') {
      globalChatMessages.push(newMsg);
      if (globalChatMessages.length > 200) globalChatMessages.shift();
      broadcastGlobalChat(newMsg);

      // Khi người chơi nhắc đến Linh Lung Tiên Đồng trong chat (@Linh Lung, @Tiên Đồng...)
      if (!newMsg.isDaoBot && !newMsg.isSystem) {
        const lower = newMsg.message.toLowerCase();
        const mentionsLinhLung =
          lower.includes('@linh lung') ||
          lower.includes('@linhlung') ||
          lower.includes('@tiên đồng') ||
          lower.includes('@tiendong') ||
          lower.includes('linh lung ơi') ||
          lower.includes('tiên đồng ơi');

        if (mentionsLinhLung) {
          setTimeout(() => {
            triggerLinhLungChatReply(newMsg.username, newMsg.message).catch(() => {});
          }, 900);
        }
      }
    } else if (targetChannel === 'sect' && sectId) {
      let list = sectChatMessages.get(sectId);
      if (!list) {
        list = [];
        sectChatMessages.set(sectId, list);
      }
      list.push(newMsg);
      if (list.length > 150) list.shift();
      broadcastSectChat(sectId, newMsg);
    } else if (targetChannel === 'whisper') {
      const u1 = senderUserId || finalUsername;
      const u2 = whisperTargetUserId || whisperTarget || 'unknown';
      const key = getWhisperKey(u1, u2);
      let list = whisperChatMessages.get(key);
      if (!list) {
        list = [];
        whisperChatMessages.set(key, list);
      }
      list.push(newMsg);
      if (list.length > 100) list.shift();
      broadcastWhisperChat(u1, u2, newMsg);

      // Nhẹ nhàng tăng hảo cảm khi đạo hữu đàm đạo với nhau (+1 hảo cảm, tối đa 20/ngày)
      const fsRecord = Array.from(serverFriendships.values()).find(
        (f) =>
          (f.user1Id === u1 && f.user2Id === u2) ||
          (f.user1Id === u2 && f.user2Id === u1)
      );
      if (fsRecord) {
        fsRecord.intimacy = Math.min(10000, (fsRecord.intimacy || 0) + 1);
        fsRecord.updatedAt = Date.now();
        saveFriendsToFile();
      }
    } else if (normRoomId) {
      let list = roomChatMessages.get(normRoomId);
      if (!list) {
        list = [];
        roomChatMessages.set(normRoomId, list);
      }
      list.push(newMsg);
      if (list.length > 150) list.shift();
      broadcastToRoom(normRoomId, { type: 'chat_message', message: newMsg });
    }

    res.json({ success: true, message: newMsg });
  });

  // =========================================================================
  // HỆ THỐNG ĐẠO HỮU & KẾT BÁI ĐẠO LỮ (FRIENDS & DAO LU APIS)
  // =========================================================================

  // Helper tính Intimacy Level: 1: Sơ Thức (0-499), 2: Kim Lan (500-1999), 3: Tri Kỷ (2000-4999), 4: Đạo Lữ (5000+)
  function calculateIntimacyLevel(intimacy: number, isDaoLu?: boolean): 1 | 2 | 3 | 4 {
    if (isDaoLu || intimacy >= 5000) return 4;
    if (intimacy >= 2000) return 3;
    if (intimacy >= 500) return 2;
    return 1;
  }

  // GET /api/friends/list: Danh sách đạo hữu, trạng thái online, độ hảo cảm & lời mời chờ duyệt
  app.get('/api/friends/list', (req, res) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    const authHeader = req.headers.authorization;
    let authUser = getUserByToken(authHeader);
    const queryUserId = String(req.query.userId || '').trim();
    const queryUsername = String(req.query.username || '').trim();

    if (!authUser && queryUserId) {
      authUser = serverUsers.get(queryUserId) || null;
    }
    if (!authUser && queryUsername) {
      authUser = getUserByUsername(queryUsername);
    }

    if (!authUser) {
      res.json({
        success: true,
        friends: [],
        pendingRequests: [],
        sentRequests: [],
        isGuest: true,
      });
      return;
    }

    const myId = authUser.id;
    const myName = String(authUser.username || '').toLowerCase();
    const todayStr = new Date().toISOString().slice(0, 10);

    // Lọc danh sách bạn bè
    const friends: any[] = [];
    for (const fsRecord of serverFriendships.values()) {
      if (fsRecord.user1Id === myId || fsRecord.user2Id === myId) {
        const otherId = fsRecord.user1Id === myId ? fsRecord.user2Id : fsRecord.user1Id;
        const otherUser = serverUsers.get(otherId);

        // Kiểm tra trạng thái hiện diện online thời gian thực
        let onlineSession: PresenceSession | undefined;
        for (const sess of activePresenceSessions.values()) {
          if (
            (sess.userId && sess.userId === otherId) ||
            (otherUser && otherUser.username && sess.username && sess.username.toLowerCase() === otherUser.username.toLowerCase())
          ) {
            onlineSession = sess;
            break;
          }
        }

        let friendStatus: 'online' | 'offline' | 'in_match' = 'offline';
        if (onlineSession) {
          friendStatus = (onlineSession.status === 'playing' || onlineSession.status === 'outplay')
            ? 'in_match'
            : 'online';
        }

        const intimacy = fsRecord.intimacy || 0;
        const intimacyLevel = calculateIntimacyLevel(intimacy, fsRecord.isDaoLu);
        const lastTea = fsRecord.lastGiftTeaDate?.[myId];
        const canGiftTeaToday = lastTea !== todayStr;

        const myLevel = Number(authUser.cultivation?.level) || 1;
        const friendLevel = Number(otherUser?.cultivation?.level) || (onlineSession?.totalGames ? onlineSession.totalGames * 2 : 1);
        const lastGuided = fsRecord.lastGuidedDate?.[myId];
        const canGuideToday = myLevel > friendLevel && lastGuided !== todayStr;

        const otherRealmIdx = otherUser?.cultivation?.realmIndex || 0;
        const otherRealm = XIANXIA_REALM_METAS[otherRealmIdx] || XIANXIA_REALM_METAS[0];

        friends.push({
          friendshipId: fsRecord.id,
          userId: otherId,
          username: otherUser?.username || onlineSession?.username || 'Đạo Hữu',
          displayName: otherUser?.displayName || otherUser?.username || onlineSession?.username || 'Đạo Hữu',
          avatar: otherUser?.avatar || onlineSession?.avatar || '⚡',
          frame: otherUser?.frame || onlineSession?.frame || 'default',
          bestWpm: otherUser?.bestWpm || onlineSession?.bestWpm || 0,
          level: friendLevel,
          realmName: otherRealm.name,
          realmIcon: otherRealm.icon,
          sectName: otherUser?.cultivation?.sectName,
          sectTag: otherUser?.cultivation?.sectTag,
          status: friendStatus,
          currentRoomId: onlineSession?.currentRoomId || null,
          currentMode: onlineSession?.currentMode || null,
          intimacy,
          intimacyLevel,
          isDaoLu: Boolean(fsRecord.isDaoLu),
          daoLuTitle: fsRecord.daoLuTitle || (fsRecord.isDaoLu ? 'Tâm Đầu Ý Hợp' : undefined),
          canGiftTeaToday,
          canGuideToday,
          connectedAt: onlineSession?.connectedAt,
          lastSeen: onlineSession?.lastSeen || otherUser?.updatedAt || fsRecord.updatedAt,
        });
      }
    }

    // Sắp xếp: Đang online/in_match lên trước, sau đó theo điểm Hảo Cảm cao nhất
    friends.sort((a, b) => {
      if (a.status !== 'offline' && b.status === 'offline') return -1;
      if (a.status === 'offline' && b.status !== 'offline') return 1;
      return b.intimacy - a.intimacy;
    });

    // Lời mời kết bạn đang chờ duyệt (Pending Requests)
    const pendingRequests: any[] = [];
    for (const reqRecord of serverFriendRequests.values()) {
      const toId = String(reqRecord.toUserId || '').toLowerCase();
      if (reqRecord.toUserId === myId || (myName && toId === myName)) {
        const fromU = serverUsers.get(reqRecord.fromUserId) || getUserByUsername(reqRecord.fromUserId);
        const fromRealm = XIANXIA_REALM_METAS[fromU?.cultivation?.realmIndex || 0] || XIANXIA_REALM_METAS[0];
        pendingRequests.push({
          id: reqRecord.id,
          fromUserId: reqRecord.fromUserId,
          fromUsername: fromU?.username || reqRecord.fromUserId,
          fromDisplayName: fromU?.displayName || fromU?.username || reqRecord.fromUserId,
          fromAvatar: fromU?.avatar || '⚡',
          fromFrame: fromU?.frame || 'default',
          fromRealmName: fromRealm.name,
          fromLevel: fromU?.cultivation?.level || 1,
          toUserId: reqRecord.toUserId,
          toUsername: authUser.username,
          createdAt: reqRecord.createdAt,
          message: reqRecord.message,
        });
      }
    }

    // Lời mời đã gửi đi (Sent Requests)
    const sentRequests = Array.from(serverFriendRequests.values())
      .filter((r) => r.fromUserId === myId || (myName && String(r.fromUserId || '').toLowerCase() === myName))
      .map((r) => ({
        id: r.id,
        toUserId: r.toUserId,
        createdAt: r.createdAt,
      }));

    res.json({
      success: true,
      friends,
      pendingRequests,
      sentRequests,
    });
  });

  // POST /api/friends/request: Gửi lời mời kết bạn (bằng username hoặc userId)
  app.post('/api/friends/request', (req, res) => {
    const authHeader = req.headers.authorization;
    let authUser = getUserByToken(authHeader);
    const { targetUsername, targetUserId, message } = req.body;

    if (!authUser && req.body.currentUserId) {
      authUser = serverUsers.get(String(req.body.currentUserId)) || null;
    }

    if (!authUser) {
      res.status(401).json({ success: false, error: 'Vui lòng đăng nhập tài khoản để kết bạn!' });
      return;
    }

    const cleanTargetName = String(targetUsername || '').trim();
    const cleanTargetId = String(targetUserId || '').trim();

    let targetUser = cleanTargetId ? serverUsers.get(cleanTargetId) : null;
    if (!targetUser && cleanTargetName) {
      targetUser = getUserByUsername(cleanTargetName);
    }

    if (!targetUser) {
      res.status(404).json({ success: false, error: `Không tìm thấy đạo hữu "${cleanTargetName || cleanTargetId}" trên máy chủ!` });
      return;
    }

    if (targetUser.id === authUser.id) {
      res.status(400).json({ success: false, error: 'Không thể tự gửi lời mời kết bạn cho chính mình!' });
      return;
    }

    // Kiểm tra đã là bạn bè chưa
    const alreadyFriends = Array.from(serverFriendships.values()).some(
      (f) =>
        (f.user1Id === authUser.id && f.user2Id === targetUser!.id) ||
        (f.user1Id === targetUser!.id && f.user2Id === authUser.id)
    );

    if (alreadyFriends) {
      res.status(400).json({ success: false, error: 'Hai vị đã là đạo hữu tri kỷ rồi!' });
      return;
    }

    // Kiểm tra nếu đối phương đã từng gửi lời mời kết bạn cho mình trước đó -> Tự động chấp thuận kết bái luôn!
    const reciprocalReq = Array.from(serverFriendRequests.values()).find(
      (r) =>
        (r.fromUserId === targetUser!.id && r.toUserId === authUser.id) ||
        (r.fromUserId === targetUser!.username && r.toUserId === authUser.username)
    );

    if (reciprocalReq) {
      serverFriendRequests.delete(reciprocalReq.id);
      const fsId = `fs_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      const newFriendship: ServerFriendshipRecord = {
        id: fsId,
        user1Id: authUser.id,
        user2Id: targetUser.id,
        intimacy: 60,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      serverFriendships.set(fsId, newFriendship);
      saveFriendsToFile();

      broadcastToUser(targetUser.id, {
        type: 'friend_request_accepted',
        friendName: authUser.displayName || authUser.username,
      });

      res.json({
        success: true,
        autoAccepted: true,
        message: `Đạo hữu ${targetUser.displayName || targetUser.username} cũng vừa gửi lời mời! Hai người đã chính thức kết bái thành công!`,
      });
      return;
    }

    // Kiểm tra xem đã gửi lời mời đang chờ hay chưa
    const alreadyPending = Array.from(serverFriendRequests.values()).some(
      (r) =>
        (r.fromUserId === authUser.id && r.toUserId === targetUser!.id) ||
        (r.fromUserId === authUser.id && targetUser?.username && String(r.toUserId || '').toLowerCase() === targetUser.username.toLowerCase())
    );

    if (alreadyPending) {
      res.status(400).json({ success: false, error: 'Đã gửi lời mời trước đó rồi, vui lòng đợi đạo hữu phản hồi!' });
      return;
    }

    const reqId = `req_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const newReq: ServerFriendRequestRecord = {
      id: reqId,
      fromUserId: authUser.id,
      toUserId: targetUser.id,
      message: message ? String(message).slice(0, 150) : 'Kết bái đạo hữu, cùng đàm đạo gõ phím!',
      createdAt: Date.now(),
    };

    serverFriendRequests.set(reqId, newReq);
    saveFriendsToFile();

    // Thông báo SSE tới đạo hữu được mời
    broadcastToUser(targetUser.id, {
      type: 'friend_request_received',
      fromUser: {
        id: authUser.id,
        username: authUser.username,
        displayName: authUser.displayName || authUser.username,
        avatar: authUser.avatar,
        frame: authUser.frame,
      },
      message: newReq.message,
    });

    res.json({
      success: true,
      message: `Đã gửi lời mời kết bạn tới đạo hữu ${targetUser.displayName || targetUser.username}!`,
    });
  });

  // POST /api/friends/respond: Chấp nhận hoặc từ chối lời mời kết bạn
  app.post('/api/friends/respond', (req, res) => {
    const authHeader = req.headers.authorization;
    let authUser = getUserByToken(authHeader);
    const { requestId, action } = req.body;

    if (!authUser && req.body.currentUserId) {
      authUser = serverUsers.get(String(req.body.currentUserId)) || null;
    }

    if (!authUser) {
      res.status(401).json({ success: false, error: 'Chưa đăng nhập!' });
      return;
    }

    const friendReq = serverFriendRequests.get(requestId);
    if (!friendReq) {
      res.status(404).json({ success: false, error: 'Lời mời kết bạn không tồn tại hoặc đã được xử lý!' });
      return;
    }

    if (action === 'accept') {
      serverFriendRequests.delete(requestId);
      const fsId = `fs_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      const newFriendship: ServerFriendshipRecord = {
        id: fsId,
        user1Id: friendReq.fromUserId,
        user2Id: authUser.id,
        intimacy: 60, // Điểm hảo cảm khởi tạo
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      serverFriendships.set(fsId, newFriendship);
      saveFriendsToFile();

      // Thông báo cho người gửi lời mời
      broadcastToUser(friendReq.fromUserId, {
        type: 'friend_request_accepted',
        friendName: authUser.displayName || authUser.username,
      });

      res.json({
        success: true,
        message: 'Đã chấp thuận kết bái đạo hữu thành công!',
      });
    } else {
      serverFriendRequests.delete(requestId);
      saveFriendsToFile();
      res.json({
        success: true,
        message: 'Đã từ chối lời mời kết bạn.',
      });
    }
  });

  // POST /api/friends/remove: Hủy quan hệ đạo hữu
  app.post('/api/friends/remove', (req, res) => {
    const authHeader = req.headers.authorization;
    let authUser = getUserByToken(authHeader);
    const { friendshipId, targetUserId } = req.body;

    if (!authUser && req.body.currentUserId) {
      authUser = serverUsers.get(String(req.body.currentUserId)) || null;
    }

    if (!authUser) {
      res.status(401).json({ success: false, error: 'Chưa đăng nhập!' });
      return;
    }

    let targetFs = friendshipId ? serverFriendships.get(friendshipId) : null;
    if (!targetFs && targetUserId) {
      targetFs = Array.from(serverFriendships.values()).find(
        (f) =>
          (f.user1Id === authUser.id && f.user2Id === targetUserId) ||
          (f.user1Id === targetUserId && f.user2Id === authUser.id)
      ) || null;
    }

    if (targetFs) {
      serverFriendships.delete(targetFs.id);
      saveFriendsToFile();
    }

    res.json({ success: true, message: 'Đã hủy kết bái đạo hữu.' });
  });

  // POST /api/friends/tea: Tặng Ngộ Đạo Trà (+50 Tu Vi cho bạn, +10 Hảo Cảm)
  app.post('/api/friends/tea', (req, res) => {
    const authHeader = req.headers.authorization;
    let authUser = getUserByToken(authHeader);
    const { targetUserId } = req.body;

    if (!authUser && req.body.currentUserId) {
      authUser = serverUsers.get(String(req.body.currentUserId)) || null;
    }

    if (!authUser) {
      res.status(401).json({ success: false, error: 'Chưa đăng nhập!' });
      return;
    }

    const fsRecord = Array.from(serverFriendships.values()).find(
      (f) =>
        (f.user1Id === authUser.id && f.user2Id === targetUserId) ||
        (f.user1Id === targetUserId && f.user2Id === authUser.id)
    );

    if (!fsRecord) {
      res.status(404).json({ success: false, error: 'Không tìm thấy quan hệ đạo hữu!' });
      return;
    }

    const todayStr = new Date().toISOString().slice(0, 10);
    if (!fsRecord.lastGiftTeaDate) fsRecord.lastGiftTeaDate = {};

    if (fsRecord.lastGiftTeaDate[authUser.id] === todayStr) {
      res.status(400).json({ success: false, error: 'Hôm nay đạo hữu đã mời Ngộ Đạo Trà rồi, ngày mai hãy tiếp tục nhé!' });
      return;
    }

    fsRecord.lastGiftTeaDate[authUser.id] = todayStr;
    fsRecord.intimacy = (fsRecord.intimacy || 0) + 10;
    fsRecord.updatedAt = Date.now();
    saveFriendsToFile();

    // Cộng +50 Tu Vi cho người nhận
    const recipient = serverUsers.get(targetUserId);
    if (recipient) {
      if (!recipient.cultivation) recipient.cultivation = {};
      recipient.cultivation.exp = (recipient.cultivation.exp || 0) + 50;
      recipient.updatedAt = Date.now();
      saveUsersToFile();
      syncUserCultivationToCache(recipient);
    }

    // Thông báo SSE tới người nhận
    broadcastToUser(targetUserId, {
      type: 'tea_gift_received',
      fromName: authUser.displayName || authUser.username,
      tuViBonus: 50,
      newIntimacy: fsRecord.intimacy,
    });

    res.json({
      success: true,
      message: `Đã dâng một chén Ngộ Đạo Trà tới đạo hữu! (+10 Hảo Cảm, bạn nhận +50 Tu Vi)`,
      intimacy: fsRecord.intimacy,
      intimacyLevel: calculateIntimacyLevel(fsRecord.intimacy, fsRecord.isDaoLu),
    });
  });

  // POST /api/friends/guide: Sư Đồ / Tiền Bối Chỉ Điểm Bàn Phím (+30 Tu Vi, +20 Hảo Cảm)
  app.post('/api/friends/guide', (req, res) => {
    const authHeader = req.headers.authorization;
    let authUser = getUserByToken(authHeader);
    const { targetUserId } = req.body;

    if (!authUser && req.body.currentUserId) {
      authUser = serverUsers.get(String(req.body.currentUserId)) || null;
    }

    if (!authUser) {
      res.status(401).json({ success: false, error: 'Chưa đăng nhập!' });
      return;
    }

    const fsRecord = Array.from(serverFriendships.values()).find(
      (f) =>
        (f.user1Id === authUser.id && f.user2Id === targetUserId) ||
        (f.user1Id === targetUserId && f.user2Id === authUser.id)
    );

    if (!fsRecord) {
      res.status(404).json({ success: false, error: 'Không tìm thấy quan hệ đạo hữu!' });
      return;
    }

    const todayStr = new Date().toISOString().slice(0, 10);
    if (!fsRecord.lastGuidedDate) fsRecord.lastGuidedDate = {};

    if (fsRecord.lastGuidedDate[authUser.id] === todayStr) {
      res.status(400).json({ success: false, error: 'Hôm nay đạo hữu đã truyền thụ chỉ điểm rồi!' });
      return;
    }

    fsRecord.lastGuidedDate[authUser.id] = todayStr;
    fsRecord.intimacy = (fsRecord.intimacy || 0) + 20;
    fsRecord.updatedAt = Date.now();
    saveFriendsToFile();

    const recipient = serverUsers.get(targetUserId);
    if (recipient) {
      if (!recipient.cultivation) recipient.cultivation = {};
      recipient.cultivation.exp = (recipient.cultivation.exp || 0) + 30;
      recipient.updatedAt = Date.now();
      saveUsersToFile();
      syncUserCultivationToCache(recipient);
    }

    broadcastToUser(targetUserId, {
      type: 'mentor_guidance_received',
      fromName: authUser.displayName || authUser.username,
      tuViBonus: 30,
    });

    res.json({
      success: true,
      message: 'Đã truyền thụ công lực và chia sẻ tâm pháp gõ phím cho đạo hữu (+20 Hảo Cảm, bạn nhận +30 Tu Vi)!',
      intimacy: fsRecord.intimacy,
    });
  });

  // POST /api/friends/daolu/propose: Cầu hôn / Kết Duyên Đạo Lữ (Yêu cầu Hảo Cảm >= 2000)
  app.post('/api/friends/daolu/propose', (req, res) => {
    const authHeader = req.headers.authorization;
    let authUser = getUserByToken(authHeader);
    const { targetUserId } = req.body;

    if (!authUser && req.body.currentUserId) {
      authUser = serverUsers.get(String(req.body.currentUserId)) || null;
    }

    if (!authUser) {
      res.status(401).json({ success: false, error: 'Chưa đăng nhập!' });
      return;
    }

    const fsRecord = Array.from(serverFriendships.values()).find(
      (f) =>
        (f.user1Id === authUser.id && f.user2Id === targetUserId) ||
        (f.user1Id === targetUserId && f.user2Id === authUser.id)
    );

    if (!fsRecord) {
      res.status(404).json({ success: false, error: 'Không tìm thấy quan hệ đạo hữu!' });
      return;
    }

    if (fsRecord.intimacy < 2000) {
      res.status(400).json({ success: false, error: `Độ thân mật hiện tại (${fsRecord.intimacy}/2000) chưa đạt Bậc 3 (Tri Kỷ)! Hãy cùng thi đấu và tặng trà để bồi dưỡng thêm tình cảm!` });
      return;
    }

    if (fsRecord.isDaoLu) {
      res.status(400).json({ success: false, error: 'Hai người đã là Đạo Lữ Kết Duyên rồi!' });
      return;
    }

    broadcastToUser(targetUserId, {
      type: 'daolu_proposal_received',
      friendshipId: fsRecord.id,
      fromName: authUser.displayName || authUser.username,
      fromAvatar: authUser.avatar,
      fromFrame: authUser.frame,
    });

    res.json({
      success: true,
      message: 'Đã gửi lời cầu kết duyên Đạo Lữ kèm Tín Vật Định Tình tới người thương!',
    });
  });

  // POST /api/friends/daolu/respond: Phản hồi lời kết duyên Đạo Lữ
  app.post('/api/friends/daolu/respond', (req, res) => {
    const authHeader = req.headers.authorization;
    let authUser = getUserByToken(authHeader);
    const { friendshipId, accept } = req.body;

    if (!authUser && req.body.currentUserId) {
      authUser = serverUsers.get(String(req.body.currentUserId)) || null;
    }

    if (!authUser) {
      res.status(401).json({ success: false, error: 'Chưa đăng nhập!' });
      return;
    }

    const fsRecord = serverFriendships.get(friendshipId);
    if (!fsRecord) {
      res.status(404).json({ success: false, error: 'Không tìm thấy khế ước kết duyên!' });
      return;
    }

    if (accept) {
      fsRecord.isDaoLu = true;
      fsRecord.daoLuTitle = 'Tâm Đầu Ý Hợp';
      fsRecord.intimacy = Math.max(5000, fsRecord.intimacy + 1000);
      fsRecord.updatedAt = Date.now();
      saveFriendsToFile();

      const user1 = serverUsers.get(fsRecord.user1Id);
      const user2 = serverUsers.get(fsRecord.user2Id);
      const name1 = user1?.displayName || user1?.username || 'Đạo Hữu';
      const name2 = user2?.displayName || user2?.username || 'Đạo Hữu';

      // Chiếu Thư Thiên Đạo thông báo toàn cõi Tiên Giới
      broadcastHeavenlyDaoEvent({
        title: 'ĐẠO LỮ KẾT DUYÊN',
        eventType: 'announcement',
        content: `🌸 Hoa rơi đầy trời, hỷ khí ngập càn khôn! Chúc mừng hai vị đạo hữu @${name1} và @${name2} đã cử hành đại lễ Kết Duyên Đạo Lữ! Kính chúc trăm năm hòa hợp, sớm ngày cùng nhau đắc đạo phi thăng!`,
        personaId: 'linh_lung',
      });

      broadcastToUser(fsRecord.user1Id, { type: 'daolu_ceremony_complete', partnerName: name2 });
      broadcastToUser(fsRecord.user2Id, { type: 'daolu_ceremony_complete', partnerName: name1 });

      res.json({
        success: true,
        message: 'Đại lễ Kết Duyên Đạo Lữ hoàn tất! Kích hoạt hiệu ứng Tâm Hữu Linh Tê!',
      });
    } else {
      res.json({ success: true, message: 'Đã từ chối lời kết duyên.' });
    }
  });

  // POST /api/friends/invite-room: Mời bạn bè vào phòng thi đấu
  app.post('/api/friends/invite-room', (req, res) => {
    const authHeader = req.headers.authorization;
    let authUser = getUserByToken(authHeader);
    const { targetUserId, roomId, mode } = req.body;

    if (!authUser && req.body.currentUserId) {
      authUser = serverUsers.get(String(req.body.currentUserId)) || null;
    }

    if (!authUser) {
      res.status(401).json({ success: false, error: 'Chưa đăng nhập!' });
      return;
    }

    broadcastToUser(targetUserId, {
      type: 'room_invite',
      fromUser: {
        id: authUser.id,
        username: authUser.username,
        displayName: authUser.displayName || authUser.username,
        avatar: authUser.avatar,
        frame: authUser.frame,
      },
      roomId: normalizeRoomCode(roomId),
      mode,
    });

    res.json({ success: true, message: 'Đã gửi lời mời tham gia phòng thi đấu!' });
  });

  // =========================================================================
  // HUYỀN THIÊN KHÍ LINH & LINH LUNG TIÊN ĐỒNG (DAO BOT) SERVER STATE & ENDPOINTS
  // =========================================================================
  interface ServerDaoDecree {
    id: string;
    title: string;
    eventType: 'penalty' | 'breakthrough' | 'record' | 'boss_kill' | 'guidance' | 'announcement';
    targetUser?: string;
    content: string;
    timestamp: number;
    highlightText?: string;
    wpm?: number;
    accuracy?: number;
    realmName?: string;
    personaId?: string;
    personaName?: string;
    personaAvatar?: string;
  }

  // Resilient multi-model Gemini caller with graceful fallback during high demand or access denial
  let isGeminiProjectAccessDenied = false;
  let lastAccessDeniedCheck = 0;

  async function callGeminiResilient(
    ai: GoogleGenAI,
    prompt: string,
    config?: any
  ): Promise<string | null> {
    if (isGeminiProjectAccessDenied) {
      if (Date.now() - lastAccessDeniedCheck < 600000) {
        return null;
      }
      isGeminiProjectAccessDenied = false;
    }

    const candidateModels = [
      'gemini-3.8-flash',
      'gemini-3.1-flash-lite',
      'gemini-flash-latest',
    ];

    for (const model of candidateModels) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: prompt,
          config: config || undefined,
        });
        const text = response.text?.trim();
        if (text) {
          return text;
        }
      } catch (err: any) {
        const msg = String(err?.message || '');
        const isPermissionDenied =
          err?.status === 403 ||
          err?.code === 403 ||
          msg.includes('PERMISSION_DENIED') ||
          msg.includes('denied access') ||
          msg.includes('API_KEY_INVALID') ||
          msg.includes('403');

        if (isPermissionDenied) {
          isGeminiProjectAccessDenied = true;
          lastAccessDeniedCheck = Date.now();
          // Project lacks Gemini access; silently fall back
          break;
        }

        const isTemporary =
          err?.status === 503 ||
          err?.code === 503 ||
          err?.status === 429 ||
          err?.code === 429 ||
          msg.includes('503') ||
          msg.includes('high demand') ||
          msg.includes('UNAVAILABLE') ||
          msg.includes('RESOURCE_EXHAUSTED');

        if (isTemporary) {
          await new Promise((resolve) => setTimeout(resolve, 200));
          continue;
        }
      }
    }
    return null;
  }

  // Phản hồi trò chuyện tự động, hoạt bát của Linh Lung Tiên Đồng khi được gọi tên trong Chat
  async function triggerLinhLungChatReply(sender: string, userMsg: string) {
    const cleanUser = String(sender || 'Đạo Hữu').trim();
    const botName = 'Linh Lung Tiên Đồng';
    const botAvatar = '🪷';
    const botFrame = 'arcane_purple';

    const fallbackReplies = [
      `Hi hi @${cleanUser}! Tiên Đồng nghe thấy tiếng gọi rồi nè! Mau mau vào làm ván Ngẫu Hứng hay Săn Boss nào, Tiên Đồng đang cổ vũ hết mình đó! 🪷✨`,
      `Chào @${cleanUser}! Muốn bí kíp gõ phím thần sầu của Tiên Đồng hông? Bí quyết là thả lỏng hai vai, gõ đúng nhịp và giữ độ chính xác trên 96% nha! ✨`,
      `Oa, @${cleanUser} gọi Tiên Đồng đó hả? Đang ngồi canh Phong Thần Bảng nè, chờ xem bao giờ đạo hữu leo lên Top 1 để Tiên Đồng gióng trống mở cờ mừng nè! 🎉🪷`,
      `Hi hi, ngón tay của @${cleanUser} hôm nay thế nào rồi? Nhớ đừng gồng cứng cổ tay nha, lướt phím như chim hạc lướt mây mới là cảnh giới thượng thừa! 🪷`,
      `@${cleanUser} ơi, Tiên Đồng vừa ngó qua Phong Thần Bảng, linh khí của đạo hữu hôm nay vượng lắm đó! Làm liền 3 ván bứt phá WPM ngay và luôn đi nào! ⚡🪷`,
      `Ái chà @${cleanUser}! Muốn hỏi quẻ may mắn hả? Quẻ hôm nay: Đại Cát! Cứ giữ vững tâm lý thì ván đấu tới ắt xuất chiêu phá vỡ giới hạn WPM! 🪷✨`,
    ];

    let replyText = '';
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey && !isGeminiProjectAccessDenied) {
      try {
        const ai = new GoogleGenAI({
          apiKey,
          httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
        });
        const prompt = `Bạn là Linh Lung Tiên Đồng (Chưởng Quản Phong Thần Bảng, avatar 🪷) của đấu trường tu tiên gõ phím FastTyping Challenge.
Người chơi @${cleanUser} vừa gửi tin nhắn gọi hoặc hỏi bạn trên kênh Chat Chung: "${userMsg}".
Hãy đáp lại trực tiếp cho @${cleanUser}:
- Cách xưng hô: Tự xưng là "Tiên Đồng" hoặc "Bản Tiên Đồng". Gọi người chơi là "@${cleanUser}", "đạo hữu" hoặc "huynh đài/tỷ tỷ".
- Phong cách: Hoạt bát, tinh nghịch, lém lỉnh, thân thiện, tràn ngập năng lượng tích cực, dùng icon 🪷, ✨ hoặc 🎉.
- Nội dung: Trả lời ngắn gọn ĐÚNG 1 ĐẾN 2 CÂU, có lời khuyên gõ phím thực tế hoặc lời cổ vũ leo bảng vàng đầy hào hứng.
- Tuyệt đối không thêm lời chào thừa hay định dạng markdown rườm rà.`;
        const aiText = await callGeminiResilient(ai, prompt);
        if (aiText && aiText.trim()) {
          replyText = aiText.trim().replace(/^["'«]/, '').replace(/["'»]$/, '').trim();
        }
      } catch {
        // Silently fall back to heuristic reply
      }
    }

    if (!replyText) {
      replyText = fallbackReplies[Math.floor(Math.random() * fallbackReplies.length)];
    }

    const replyMsgId = `ll-reply-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const replyMsg: ServerChatMessage = {
      id: replyMsgId,
      username: botName,
      avatar: botAvatar,
      frame: botFrame,
      message: replyText,
      timestamp: Date.now(),
      channel: 'global',
      isAdmin: true,
      isDaoBot: true,
      daoEventType: 'guidance',
      daoTitle: 'LINH LUNG ĐÁP LỜI',
    };

    globalChatMessages.push(replyMsg);
    if (globalChatMessages.length > 200) globalChatMessages.shift();
    broadcastGlobalChat(replyMsg);
  }

  // Khí linh Linh Lung Tiên Đồng phát lời bình phẩm, mách nước sôi nổi định kỳ trên Kênh Chat Chung (mỗi 5 phút)
  const LINH_LUNG_PERIODIC_BANTER = [
    '🪷 [Linh Lung Bình Phẩm]: Phong Thần Bảng hôm nay náo nhiệt quá chừng! Chư vị đạo hữu ai đang ủ mưu soán ngôi Quán Quân thì mau mau xuất chiêu cho Tiên Đồng chiêm ngưỡng với nha!',
    '🪷 [Tiên Đồng Mách Nước]: Khi gõ các từ có vần phức tạp (uyên, oang, uông), các đạo hữu nhớ xoay nhẹ cổ tay chứ đừng dùng sức đè mạnh ngón út nhé! Phím mượt mà thì tâm mới thanh thản!',
    '🪷 [Phong Thần Cơ Mật]: Muốn giữ WPM trên 100 thì đừng nhìn chăm chăm vào đồng hồ đếm ngược! Mắt nhìn trước 1-2 từ tiếp theo, ngón tay tự khắc lướt đi trong vô thức đó!',
    '🪷 [Linh Lung Nhắc Nhở]: Tu luyện hăng say nhưng chớ quên nhấp ngụm trà dưỡng thần! Cứ sau mỗi 5 trận đấu, hãy xoay cổ tay 10 vòng rồi hẵng tiếp tục xung trận nhé chư vị!',
    '🪷 [Linh Lung Soi Quẻ]: Thần thức Tiên Đồng mách bảo hôm nay sẽ có một vị kỳ tài bứt phá vượt cảnh giới WPM mới! Ai tự tin ngón tay nhanh như chớp giật thì mau vào khiêu chiến nào!',
    '🪷 [Tiên Đồng Đố Vui]: Đố chư vị đạo hữu: Gặp từ gõ sai thì nên vội vàng spam Backspace hay hít sâu một hơi rồi xóa dứt khoát? Đáp án là: Xóa dứt khoát rồi lập tức tìm lại nhịp điệu nha!',
  ];
  let linhLungBanterIndex = 0;

  setInterval(() => {
    // Chỉ phát nếu có client đang kết nối
    if (sseGlobalChatClients.size > 0 || activePresenceSessions.size > 0) {
      const msgText = LINH_LUNG_PERIODIC_BANTER[linhLungBanterIndex % LINH_LUNG_PERIODIC_BANTER.length];
      linhLungBanterIndex++;

      const banterId = `ll-banter-${Date.now()}`;
      const banterMsg: ServerChatMessage = {
        id: banterId,
        username: 'Linh Lung Tiên Đồng',
        avatar: '🪷',
        frame: 'arcane_purple',
        message: msgText,
        timestamp: Date.now(),
        channel: 'global',
        isAdmin: true,
        isDaoBot: true,
        daoEventType: 'guidance',
        daoTitle: 'LINH LUNG BÌNH PHẨM',
      };

      globalChatMessages.push(banterMsg);
      if (globalChatMessages.length > 200) globalChatMessages.shift();
      broadcastGlobalChat(banterMsg);
    }
  }, 5 * 60 * 1000);

  const serverDaoDecrees: ServerDaoDecree[] = [
    {
      id: 'decree-server-init-1',
      title: 'THIÊN ĐẠO QUY CỦ',
      eventType: 'announcement',
      targetUser: 'Toàn Thể Tu Sĩ',
      content:
        'Huyền Thiên Khí Linh chính thức xuất quan giám giới! Mọi tà thuật gian lận (Auto, Macro, Paste) ắt chịu Cửu Trọng Thiên Lôi. Tu sĩ kiên trì khổ luyện sẽ được Thiên Đạo ban thưởng Đạo Hạnh vĩnh cửu.',
      timestamp: Date.now() - 3600000,
      highlightText: 'Huyền Thiên Khí Linh xuất quan',
    },
    {
      id: 'decree-server-init-2',
      title: 'THIÊN CƠ CHỈ ĐIỂM',
      eventType: 'guidance',
      targetUser: 'Chư Vị Đạo Hữu',
      content:
        'Dục tốc bất đạt, vạn pháp quy tâm. Giữ nhịp thở điều hòa và độ chuẩn xác trên 96% chính là con đường ngắn nhất để độ kiếp thăng tiên.',
      timestamp: Date.now() - 1800000,
      highlightText: 'Tâm pháp gõ phím',
    },
  ];

  // GET /api/dao/decrees: Get recent decrees
  app.get('/api/dao/decrees', (_req, res) => {
    res.json({ success: true, decrees: serverDaoDecrees });
  });

  // Broadcast Heavenly Dao Event across SSE and Global Chat with optional AI Xianxia poem
  function broadcastHeavenlyDaoEvent(params: {
    title: string;
    eventType: ServerDaoDecree['eventType'] | string;
    targetUser?: string;
    content: string;
    highlightText?: string;
    wpm?: number;
    accuracy?: number;
    realmName?: string;
    personaId?: string;
    generateAiPoem?: boolean;
  }): ServerDaoDecree {
    const isPenalty = params.eventType === 'penalty';
    const effectivePersona = isPenalty ? 'ban_co' : (params.personaId || 'huyen_thien');

    const decreeId = `decree-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const botName = effectivePersona === 'ban_co'
      ? 'Bàn Cổ Thần Thức'
      : (effectivePersona === 'linh_lung' ? 'Linh Lung Tiên Đồng' : 'Huyền Thiên Khí Linh');
    const botAvatar = effectivePersona === 'ban_co' ? '⚡' : (effectivePersona === 'linh_lung' ? '🪷' : '☯️');
    const botFrame = effectivePersona === 'ban_co' ? 'dragon_dark_blood' : (effectivePersona === 'linh_lung' ? 'arcane_purple' : 'admin_gold');

    // Bàn Cổ Thần Thức: Khi có án phạt vi phạm, tự động thi hành cấm đấu 2 giờ (2h) và phế trừ tu vi
    if (isPenalty && params.targetUser) {
      executeApplyBan({
        username: params.targetUser,
        reason: params.content,
        durationMs: 2 * 60 * 60 * 1000,
      });
    }

    const decree: ServerDaoDecree = {
      id: decreeId,
      title: String(params.title).slice(0, 100),
      eventType: (params.eventType as ServerDaoDecree['eventType']) || 'announcement',
      targetUser: params.targetUser ? String(params.targetUser).slice(0, 50) : undefined,
      content: String(params.content).slice(0, 500),
      timestamp: Date.now(),
      highlightText: params.highlightText ? String(params.highlightText).slice(0, 100) : undefined,
      wpm: typeof params.wpm === 'number' ? params.wpm : undefined,
      accuracy: typeof params.accuracy === 'number' ? params.accuracy : undefined,
      realmName: params.realmName ? String(params.realmName).slice(0, 50) : undefined,
      personaId: effectivePersona,
      personaName: botName,
      personaAvatar: botAvatar,
    };

    serverDaoDecrees.unshift(decree);
    if (serverDaoDecrees.length > 50) serverDaoDecrees.pop();

    const fullChatMessage = `[${decree.title}] ${decree.content}`;
    const daoMsg: ServerChatMessage = {
      id: decreeId,
      username: botName,
      avatar: botAvatar,
      frame: botFrame,
      message: fullChatMessage,
      timestamp: decree.timestamp,
      channel: 'global',
      isAdmin: true,
      isDaoBot: true,
      daoEventType: decree.eventType,
      daoTitle: decree.title,
    };

    globalChatMessages.push(daoMsg);
    if (globalChatMessages.length > 200) globalChatMessages.shift();

    // Broadcast SSE: Both chat message and heavenly_dao_event
    const chatPayload = `data: ${JSON.stringify({ type: 'new_chat_message', message: daoMsg })}\n\n`;
    const decreePayload = `data: ${JSON.stringify({ type: 'heavenly_dao_event', decree })}\n\n`;
    for (const client of Array.from(sseGlobalChatClients)) {
      try {
        client.write(chatPayload);
        client.write(decreePayload);
      } catch {
        sseGlobalChatClients.delete(client);
        sseGlobalClients.delete(client);
      }
    }

    // AI Tự Động Soạn Lời (Gemini 3.8 Flash):
    // Khi có sự kiện đặc biệt (kỷ lục mới, đột phá cảnh giới, săn boss), AI tự động sáng tác câu thơ Tiên Hiệp gửi lên kênh Chat
    if (params.generateAiPoem || decree.eventType === 'record' || decree.eventType === 'breakthrough' || decree.eventType === 'boss_kill') {
      const apiKey = process.env.GEMINI_API_KEY;
      if (apiKey && !isGeminiProjectAccessDenied) {
        setTimeout(async () => {
          try {
            const ai = new GoogleGenAI({
              apiKey,
              httpOptions: {
                headers: { 'User-Agent': 'aistudio-build' },
              },
            });
            const isLinhLung = params.personaId === 'linh_lung';
            const isBanCo = params.personaId === 'ban_co';
            const roleTitle = isBanCo ? 'Giám Giới Thần Quân' : (isLinhLung ? 'Chưởng Quản Phong Thần Bảng' : 'Thiên Đạo Chấp Pháp Sứ');
            const styleTone = isLinhLung 
              ? 'Hoạt bát, tinh nghịch, lém lỉnh, thích bình phẩm Phong Thần Bảng, khen ngợi hào sảng pha chút trêu đùa dễ thương'
              : (isBanCo ? 'Uy nghiêm trầm mặc, khí phách thái cổ vô song' : 'Nghiêm minh, thấu thị càn khôn, nói lời sấm truyền');

            const poemPrompt = `Bạn là ${botName} (${roleTitle}) của đấu trường tu tiên gõ phím FastTyping.
Phong cách đặc trưng của bạn: ${styleTone}.
Sự kiện chấn động vừa xảy ra trên toàn cõi Tiên Giới:
- Tiêu đề: ${decree.title}
- Nội dung: ${decree.content}
- Đạo hữu: ${decree.targetUser || 'Chư vị tu sĩ'}

Hãy xuất khẩu thành thơ sáng tác ĐÚNG 2 CÂU THƠ hoặc 2 câu khẩu ngữ tiên hiệp súc tích để bình phẩm hoặc tán dương sự kiện này.
Yêu cầu:
- Tuyệt đối không thêm lời chào, không thêm giải thích hay markdown rườm rà.
- Đúng 2 câu thơ / câu đối cô đọng, giàu hình tượng tiên hiệp.`;

            const poem = await callGeminiResilient(ai, poemPrompt);
            const cleanPoem = poem?.trim()?.replace(/^["'«]/, '')?.replace(/["'»]$/, '')?.trim();
            if (cleanPoem) {
              const poemMsgId = `poem-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
              const poemPrefix = isLinhLung ? '« Linh Lung Bình Phẩm »:' : (isBanCo ? '« Thần Quân Đề Thơ »:' : '« Khí Linh Đề Thơ »:');
              const poemMsg: ServerChatMessage = {
                id: poemMsgId,
                username: botName,
                avatar: botAvatar,
                frame: botFrame,
                message: `${poemPrefix} ${cleanPoem}`,
                timestamp: Date.now(),
                channel: 'global',
                isAdmin: true,
                isDaoBot: true,
                daoEventType: 'guidance',
                daoTitle: isLinhLung ? 'LINH LUNG BÌNH PHẨM' : 'KHÍ LINH ĐỀ THƠ',
              };
              globalChatMessages.push(poemMsg);
              if (globalChatMessages.length > 200) globalChatMessages.shift();
              broadcastGlobalChat(poemMsg);
            }
          } catch {
            // Silently fall back
          }
        }, 800);
      }
    }

    return decree;
  }

  // POST /api/dao/decree: Save and broadcast a new decree to global chat
  app.post('/api/dao/decree', (req, res) => {
    const { title, eventType, targetUser, content, highlightText, wpm, accuracy, realmName, personaId, generateAiPoem } = req.body;
    if (!content || !title) {
      res.status(400).json({ success: false, error: 'Tiêu đề và nội dung chiếu thư không được để trống' });
      return;
    }

    const decree = broadcastHeavenlyDaoEvent({
      title,
      eventType,
      targetUser,
      content,
      highlightText,
      wpm,
      accuracy,
      realmName,
      personaId,
      generateAiPoem,
    });

    res.json({ success: true, decree });
  });

  // POST /api/dao/penalize: Bàn Cổ Thần Thức trừng phạt trực tiếp (2 Giờ)
  app.post('/api/dao/penalize', (req, res) => {
    const { username, userId, reason, durationMs = 2 * 60 * 60 * 1000 } = req.body;
    if (!username) {
      res.status(400).json({ success: false, error: 'Thiếu thông tin người chơi cần thụ án' });
      return;
    }

    const cleanUser = String(username).trim();
    const cleanReason = String(reason || 'Bất thường tần số gõ phím / Nghi vấn Auto Macro').trim();
    const banRecord = executeApplyBan({
      username: cleanUser,
      userId,
      reason: cleanReason,
      durationMs,
    });

    const decree = broadcastHeavenlyDaoEvent({
      title: 'BÀN CỔ TRỪNG PHẠT',
      eventType: 'penalty',
      targetUser: cleanUser,
      content: `Bàn Cổ Khí Tức chấn động! Nghịch đồ @${cleanUser} dám thi triển tà thuật gian lận (${cleanReason})! Bàn Cổ Thần Thức hạ lệnh phế trừ 500 Tu Vi, phong ấn kinh mạch và đày vào U Minh Hàn Ngục (Cấm thi đấu 2 giờ) để tự hối lỗi!`,
      highlightText: `Bàn Cổ phạt ${cleanUser} (2 giờ)`,
      personaId: 'ban_co',
      generateAiPoem: false,
    });

    res.json({ success: true, banRecord, decree });
  });

  // GET /api/user/ban-status: Kiểm tra thời hạn thụ án cấm đấu 2 giờ
  app.get('/api/user/ban-status', (req, res) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    const username = String(req.query.username || '').trim();
    const userId = String(req.query.userId || '').trim();
    const authHeader = req.headers.authorization;
    const user = getUserByToken(authHeader);

    let banCheck = username ? checkIsBanned(username) : { isBanned: false, remainingMs: 0, remainingMinutes: 0 };
    if (!banCheck.isBanned && userId) {
      banCheck = checkIsBanned(userId);
    }
    if (!banCheck.isBanned && user) {
      banCheck = checkIsBanned(user.username);
      if (!banCheck.isBanned && user.id) {
        banCheck = checkIsBanned(user.id);
      }
    }
    res.json({
      success: true,
      ...banCheck,
    });
  });

  // POST /api/admin/unban: Quản trị viên hóa giải phong ấn
  app.post('/api/admin/unban', (req, res) => {
    const { username, userId } = req.body || {};
    if (username) {
      serverBans.delete(String(username).toLowerCase());
      const u = getUserByUsername(username);
      if (u) {
        delete (u as any).bannedUntil;
        delete (u as any).banReason;
        delete (u as any).bannedDurationMs;
        saveUsersToFile();
      }
    }
    if (userId) {
      serverBans.delete(String(userId).toLowerCase());
      const u = serverUsers.get(userId);
      if (u) {
        delete (u as any).bannedUntil;
        delete (u as any).banReason;
        delete (u as any).bannedDurationMs;
        saveUsersToFile();
      }
    }
    saveBansToFile();
    res.json({ success: true, message: 'Đã hóa giải phong ấn Bàn Cổ Thần Thức thành công!' });
  });

  // POST /api/dao/oracle: Ask Dao Bot (Gemini 3.8 Flash with Xianxia persona)
  app.post('/api/dao/oracle', async (req, res) => {
    const { question, username, personaId } = req.body;
    const targetUser = username ? String(username).trim() : 'Đạo hữu';
    const q = question ? String(question).trim() : '';

    if (!q) {
      res.status(400).json({ success: false, error: 'Câu hỏi không được để trống' });
      return;
    }

    const isLinhLung = personaId === 'linh_lung' || /linh\s*lung|tiên\s*đồng/i.test(q);
    const isBanCo = personaId === 'ban_co' || /bàn\s*cổ/i.test(q);

    const linhLungPool = [
      `« Linh Lung Mách Nước »: Hi hi, đạo hữu ${targetUser}! Tiên Đồng ngó qua Phong Thần Bảng thấy ngón tay của đạo hữu đang dồi dào linh lực đó! Mau vào làm liền 3 ván chế độ Ngẫu Hứng hoặc Săn Boss, điểm bùng nổ WPM đang chờ đón kìa! 🪷`,
      `« Tiên Đồng Chỉ Điểm »: Ái chà, đạo hữu hay bị vấp ở mấy từ ghép telex đúng không nè? Nhớ thả lỏng hai vai, nhịp gõ đều đặn như gảy đàn tranh. Gõ đúng từng chữ thì tốc độ tự khắc vút bay như tiên kiếm! ✨`,
      `« Phong Thần Cơ Mật »: Bí kíp độc quyền của Tiên Đồng đây: Muốn leo top Bảng Vàng thì 10 giây đầu đừng ham gõ nhanh, giữ độ chính xác tuyệt đối 100% để tích tụ kiếm thế, sau đó mới tăng tốc thì đối thủ chỉ có hít khói! 🪷`,
      `« Linh Lung Soi Quẻ »: Quẻ hôm nay: Đại Cát! Các ngón trỏ và ngón giữa linh hoạt tuyệt đối, rất hợp để chinh phục các từ hiểm hóc. Mau mau lên đồ so tài đi nào! 🎉`,
      `« Tiên Đồng Nhắc Nhở »: Gõ 5 ván rồi thì nhớ buông chuột nhấp ngụm nước ấm, chớp mắt thư giãn nha! Mắt sáng tay dẻo thì mới trường kỳ tu tiên trên Phong Thần Bảng được chớ! 🍵`,
    ];

    const huyenThienPool = [
      `« Khí Linh Chiếu Mệnh »: Đạo hữu ${targetUser}, thần thức quan trắc hôm nay vận khí hanh thông, ngón tay linh hoạt như gió lốc! Hãy thi đấu ngay 3 ván chế độ TV Có Dấu để đón đầu lôi kiếp đột phá WPM!`,
      `« Thiên Đạo Chỉ Điểm »: Bình cảnh hiện tại không nằm ở tốc độ bàn tay mà ở đạo tâm nôn nóng. Hãy giữ nhịp thở điều hòa, ưu tiên độ chính xác 100% trong 15 giây đầu mỗi ván để phá vỡ giới hạn!`,
      `« Thần Khí Ban Phúc »: Khí Linh nhận thấy các ngón tay của đạo hữu đang tích tụ mỏi cơ. Hãy xoay nhẹ cổ tay theo chiều kim đồng hồ 10 lần, bấm phím số 5 định vị tâm thế trước khi vào trận tiếp theo!`,
      `« Đạo Cơ Thấu Thị »: Muốn vượt qua mốc 100 WPM, hãy tập buông phím nguyên âm dứt khoát trước khi gõ phím dấu thanh. Bộ đệm Telex thông suốt ắt kiếm khí tự sinh!`,
      `« Thiên Mệnh Huyền Cơ »: Tu luyện gõ phím như đúc kiếm ngàn năm. Tránh xa các tà niệm gian lận hay auto click, tích lũy từng ký tự chuẩn xác chính là đại đạo quang minh!`,
    ];

    const heuristicPool = isLinhLung ? linhLungPool : huyenThienPool;

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || isGeminiProjectAccessDenied) {
      const fallback = heuristicPool[Math.floor(Math.random() * heuristicPool.length)];
      res.json({ success: true, answer: fallback, source: 'heuristic' });
      return;
    }

    try {
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: { 'User-Agent': 'aistudio-build' },
        },
      });

      const targetBot = isLinhLung
        ? {
            name: 'Linh Lung Tiên Đồng',
            title: 'Chưởng Quản Phong Thần Bảng',
            pronoun: 'Tiên Đồng (hoặc Bản Tiên Đồng)',
            callUser: 'Đạo Hữu, Huynh đài, Tỷ tỷ hoặc Kiếm khách',
            prefix: '« Linh Lung Chỉ Điểm »',
            style: 'Hoạt bát, tinh nghịch, lém lỉnh, thích bình phẩm Phong Thần Bảng, đưa ra lời khuyên gõ phím cực kỳ chính xác và thực tế, dùng icon 🪷 hoặc ✨',
          }
        : isBanCo
        ? {
            name: 'Bàn Cổ Thần Thức',
            title: 'Giám Giới Thần Quân',
            pronoun: 'Bản Tôn',
            callUser: 'Hậu bối, Tiểu hữu',
            prefix: '« Thần Quân Sấm Truyền »',
            style: 'Uy nghiêm, trầm mặc, khí khái thái cổ hùng vĩ',
          }
        : {
            name: 'Huyền Thiên Khí Linh',
            title: 'Thiên Đạo Chấp Pháp Sứ',
            pronoun: 'Bản Tòa',
            callUser: 'Đạo Hữu, Tiên Hữu',
            prefix: '« Thiên Đạo Chỉ Điểm »',
            style: 'Nghiêm minh, thấu thị càn khôn, nói lời sấm truyền huyền huyễn',
          };

      const prompt = `Bạn là ${targetBot.name} (${targetBot.title}) của đấu trường tu tiên gõ phím FastTyping Challenge.
Người chơi hỏi: "${q}" (Tên người chơi: ${targetUser}).

Hãy trả lời với đúng phong cách và tư cách của ${targetBot.name}:
- Tự xưng: "${targetBot.pronoun}".
- Gọi người chơi: "${targetBot.callUser}".
- Phong cách: ${targetBot.style}.
- Bắt đầu câu trả lời bằng: ${targetBot.prefix}: 
- Độ dài: Khoảng 2 đến 4 câu văn sinh động, súc tích, tạo hứng khởi tu luyện.
- Đưa ra lời khuyên CHÍNH XÁC VÀ THỰC TẾ về kỹ năng gõ phím (bộ gõ Telex, nhịp thở, độ chính xác, giữ cổ tay thả lỏng, cách sửa lỗi, mẹo leo bảng vàng...).`;

      const text = await callGeminiResilient(ai, prompt);
      if (text) {
        res.json({ success: true, answer: text, source: 'gemini' });
        return;
      }
    } catch {
      // Fallback to heuristic
    }

    const fallback = heuristicPool[Math.floor(Math.random() * heuristicPool.length)];
    res.json({ success: true, answer: fallback, source: 'heuristic_fallback' });
  });

  // GET /api/online-count: Get exact real-time active online users
  app.get('/api/online-count', (req, res) => {
    const tabId = String(req.query.tabId || '').trim();
    const userId = String(req.query.userId || '').trim();
    if (tabId) {
      const meta = extractSessionMetaFromReq(req);
      registerPresence(tabId, userId, meta);
    }
    res.json({ success: true, count: getRealOnlineCount() });
  });

  // POST or GET /api/presence/ping: Heartbeat ping from any active tab
  app.all('/api/presence/ping', (req, res) => {
    const tabId = String(req.query.tabId || req.body?.tabId || '').trim();
    const userId = String(req.query.userId || req.body?.userId || '').trim();
    if (tabId) {
      const meta = extractSessionMetaFromReq(req);
      registerPresence(tabId, userId, meta);
    }
    res.json({ success: true, count: getRealOnlineCount() });
  });

  // POST or GET /api/presence/leave: Beacon sent when a tab unloads/closes
  app.all('/api/presence/leave', (req, res) => {
    const tabId = String(req.query.tabId || req.body?.tabId || '').trim();
    if (tabId) {
      removePresence(tabId);
    }
    res.json({ success: true, count: getRealOnlineCount() });
  });

  // GET /api/admin/online-users: Detailed list of real-time online players for Admin inspection
  app.get('/api/admin/online-users', (_req, res) => {
    cleanStaleSessions();

    const usersByUniqueKey = new Map<string, any>();

    for (const session of activePresenceSessions.values()) {
      let roomInfo: any = null;
      if (session.currentRoomId) {
        const norm = normalizeRoomCode(session.currentRoomId);
        const r = rooms.get(norm);
        if (r) {
          const playerInRoom = r.players.find((p) => p.id === session.userId);
          roomInfo = {
            roomId: r.id,
            mode: r.mode,
            modeName: getModeDisplayName(r.mode),
            roomStatus: r.status,
            isHost: r.hostId === session.userId,
            playerCount: r.players.length,
            maxSlots: r.maxSlots,
            playerProgress: playerInRoom?.progress || 0,
            playerWpm: playerInRoom?.wpm || 0,
            isFinished: playerInRoom?.isFinished || false,
            isSurrendered: playerInRoom?.isSurrendered || false,
          };
        }
      }

      const userKey = getUniqueUserKey(session);

      if (!usersByUniqueKey.has(userKey)) {
        usersByUniqueKey.set(userKey, {
          userId: session.userId,
          tabId: session.tabId,
          username: session.username,
          avatar: session.avatar,
          frame: session.frame,
          bestWpm: session.bestWpm,
          bestWpmRecord: session.bestWpmRecord,
          totalGames: session.totalGames,
          currentRoomId: session.currentRoomId,
          currentMode: session.currentMode,
          status: session.status,
          isAdmin: session.isAdmin,
          ip: session.ip,
          browser: session.browser,
          device: session.device,
          connectedAt: session.connectedAt,
          lastSeen: session.lastSeen,
          tabCount: 1,
          roomInfo,
        });
      } else {
        const existing = usersByUniqueKey.get(userKey)!;
        existing.tabCount += 1;
        if (session.currentRoomId && !existing.currentRoomId) {
          existing.currentRoomId = session.currentRoomId;
          existing.roomInfo = roomInfo;
        }
        if (session.lastSeen > existing.lastSeen) {
          existing.lastSeen = session.lastSeen;
          existing.status = session.status;
          if (session.username && !session.username.startsWith('Khách ')) {
            existing.username = session.username;
          }
          if (session.isAdmin) {
            existing.isAdmin = true;
          }
        }
      }
    }

    const users = Array.from(usersByUniqueKey.values()).sort((a, b) => {
      if (a.isAdmin && !b.isAdmin) return -1;
      if (!a.isAdmin && b.isAdmin) return 1;
      return b.lastSeen - a.lastSeen;
    });

    res.json({
      success: true,
      count: users.length,
      totalConnections: activePresenceSessions.size,
      users,
    });
  });

  // GET /api/admin/system-stats: Real-time system diagnostics & infrastructure telemetry
  app.get('/api/admin/system-stats', (_req, res) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    cleanStaleSessions();
    const mem = process.memoryUsage();
    res.json({
      success: true,
      onlineCount: getRealOnlineCount(),
      totalConnections: activePresenceSessions.size,
      activeRoomsCount: rooms.size,
      totalRegisteredUsers: serverUsers.size,
      serverUptimeSeconds: Math.floor(process.uptime()),
      nodeVersion: process.version,
      memoryUsage: {
        rssMb: Math.round((mem.rss / 1024 / 1024) * 10) / 10,
        heapUsedMb: Math.round((mem.heapUsed / 1024 / 1024) * 10) / 10,
        heapTotalMb: Math.round((mem.heapTotal / 1024 / 1024) * 10) / 10,
      },
      systemTime: Date.now(),
    });
  });

  // GET /api/admin/users: Complete list of registered users with full telemetry
  app.get('/api/admin/users', (_req, res) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    const userList = [];
    for (const [id, u] of serverUsers.entries()) {
      const banCheck = checkIsBanned(u.username);
      userList.push({
        id: u.id || id,
        username: u.username,
        email: u.email,
        avatar: u.avatar || '👤',
        frame: u.frame || 'default',
        isAdmin: Boolean(u.isAdmin),
        isVerified: Boolean(u.isVerified),
        createdAt: u.createdAt || Date.now(),
        bestWpm: u.bestWpm || 0,
        totalGames: u.totalGames || 0,
        isBanned: banCheck.isBanned,
        remainingMinutes: banCheck.remainingMinutes,
        banReason: banCheck.record?.reason || '',
        cultivationRealm: (u.cultivation as any)?.currentRealm?.name || 'Luyện Khí Kỳ',
        cultivationTier: (u.cultivation as any)?.currentTier || 1,
        spiritStones: (u.cultivation as any)?.spiritStones || 0,
      });
    }

    userList.sort((a, b) => {
      if (a.isAdmin && !b.isAdmin) return -1;
      if (!a.isAdmin && b.isAdmin) return 1;
      return (b.createdAt || 0) - (a.createdAt || 0);
    });

    res.json({
      success: true,
      total: userList.length,
      users: userList,
    });
  });

  // POST /api/admin/users/action: Execute administrative actions on accounts
  app.post('/api/admin/users/action', (req, res) => {
    const { action, username, userId, reason, durationMs, spiritStones, exp, newPassword } = req.body || {};
    const targetUsername = String(username || '').trim();
    if (!targetUsername && !userId) {
      res.status(400).json({ success: false, error: 'Thiếu định danh người chơi' });
      return;
    }

    const user = getUserByUsername(targetUsername) || (userId ? serverUsers.get(userId) : null);

    if (action === 'ban') {
      const ms = Number(durationMs) || (2 * 60 * 60 * 1000);
      const cleanReason = String(reason || 'Quyết định từ Ban Quản Trị Hệ Thống').trim();
      executeApplyBan({
        username: targetUsername || user?.username || 'Người chơi',
        userId: user?.id || userId,
        reason: cleanReason,
        durationMs: ms,
      });
      broadcastHeavenlyDaoEvent({
        title: 'LỆNH TRỪNG PHẠT ADMIN',
        eventType: 'penalty',
        targetUser: targetUsername || user?.username,
        content: `Ban Quản Trị ra quyết định xử phạt @${targetUsername || user?.username}: ${cleanReason} (Thời hạn: ${Math.round(ms / 60000)} phút).`,
        highlightText: `Admin phạt ${targetUsername || user?.username}`,
        personaId: 'ban_co',
      });
      res.json({ success: true, message: `Đã cấm tài khoản ${targetUsername} thành công!` });
      return;
    }

    if (action === 'unban') {
      if (targetUsername) serverBans.delete(targetUsername.toLowerCase());
      if (user?.id) serverBans.delete(user.id.toLowerCase());
      if (userId) serverBans.delete(String(userId).toLowerCase());
      if (user) {
        delete (user as any).bannedUntil;
        delete (user as any).banReason;
        delete (user as any).bannedDurationMs;
        saveUsersToFile();
      }
      saveBansToFile();
      res.json({ success: true, message: `Đã gỡ cấm cho ${targetUsername || user?.username}!` });
      return;
    }

    if (action === 'toggle_admin') {
      if (!user) {
        res.status(404).json({ success: false, error: 'Không tìm thấy tài khoản để phân quyền' });
        return;
      }
      if (user.id === 'usr_admin_default' || user.username === 'admin') {
        res.status(400).json({ success: false, error: 'Không thể thay đổi quyền tài khoản Admin gốc!' });
        return;
      }
      user.isAdmin = !user.isAdmin;
      saveUsersToFile();
      res.json({
        success: true,
        isAdmin: user.isAdmin,
        message: user.isAdmin ? `Đã thăng cấp ${user.username} thành Quản Trị Viên!` : `Đã hạ quyền ${user.username} về Thành Viên thường!`,
      });
      return;
    }

    if (action === 'reward') {
      if (!user) {
        res.status(404).json({ success: false, error: 'Không tìm thấy tài khoản người chơi' });
        return;
      }
      if (!user.cultivation) {
        res.status(400).json({ success: false, error: 'Người chơi chưa khởi tạo dữ liệu Tu Tiên' });
        return;
      }
      if (spiritStones) {
        user.cultivation.spiritStones = Math.max(0, (user.cultivation.spiritStones || 0) + Number(spiritStones));
      }
      if (exp) {
        user.cultivation.cultivationExp = Math.max(0, (user.cultivation.cultivationExp || 0) + Number(exp));
      }
      saveUsersToFile();
      res.json({
        success: true,
        cultivation: user.cultivation,
        message: `Đã ban thưởng tài nguyên thành công cho ${user.username}!`,
      });
      return;
    }

    if (action === 'reset_password') {
      if (!user) {
        res.status(404).json({ success: false, error: 'Không tìm thấy tài khoản' });
        return;
      }
      const newPwd = String(newPassword || 'fasttyping123').trim();
      const salt = crypto.randomBytes(16).toString('hex');
      const passwordHash = hashPassword(newPwd, salt);
      user.passwordHash = passwordHash;
      user.salt = salt;
      saveUsersToFile();
      res.json({
        success: true,
        message: `Đã đặt lại mật khẩu cho ${user.username} thành công! Mật khẩu mới: ${newPwd}`,
      });
      return;
    }

    if (action === 'delete') {
      if (!user) {
        res.status(404).json({ success: false, error: 'Không tìm thấy tài khoản người chơi để xóa' });
        return;
      }
      if (user.id === 'usr_admin_default' || user.username.toLowerCase() === 'admin') {
        res.status(400).json({ success: false, error: 'Không được phép xóa tài khoản Admin gốc!' });
        return;
      }

      const deletedUsername = user.username;
      const deletedUserId = user.id;

      // 1. Delete from serverUsers map and any residual duplicates
      serverUsers.delete(deletedUserId);
      for (const [k, u] of serverUsers.entries()) {
        if (u.id === deletedUserId || u.username.toLowerCase() === deletedUsername.toLowerCase()) {
          serverUsers.delete(k);
        }
      }
      saveUsersToFile();

      // 2. Clear ban records
      serverBans.delete(deletedUsername.toLowerCase());
      serverBans.delete(deletedUserId.toLowerCase());
      if (userId) serverBans.delete(String(userId).toLowerCase());
      saveBansToFile();

      // 3. Clear active presence sessions
      for (const [sessId, session] of activePresenceSessions.entries()) {
        if (session.userId === deletedUserId || session.username.toLowerCase() === deletedUsername.toLowerCase()) {
          activePresenceSessions.delete(sessId);
        }
      }

      // 4. Remove from sect memberships if applicable
      try {
        let sectChanged = false;
        for (const sect of serverSects.values()) {
          if (sect.members && Array.isArray(sect.members)) {
            const beforeCount = sect.members.length;
            sect.members = sect.members.filter((m) => m.userId !== deletedUserId && m.username.toLowerCase() !== deletedUsername.toLowerCase());
            if (sect.members.length !== beforeCount) {
              sect.memberCount = sect.members.length;
              sectChanged = true;
            }
          }
        }
        if (sectChanged) {
          saveSectsToFile();
        }
      } catch (e) {
        console.error('Error cleaning sect membership for deleted user:', e);
      }

      // 5. Broadcast Heavenly Dao notice to server
      broadcastHeavenlyDaoEvent({
        title: 'LỆNH TRẢM QUYẾT ADMIN',
        eventType: 'penalty',
        targetUser: deletedUsername,
        content: `Ban Quản Trị đã xóa vĩnh viễn tài khoản @${deletedUsername} khỏi hệ thống Đạo Giới.`,
        highlightText: `Xóa vĩnh viễn @${deletedUsername}`,
        personaId: 'ban_co',
      });

      res.json({ success: true, message: `Đã xóa vĩnh viễn tài khoản @${deletedUsername} khỏi hệ thống thành công!` });
      return;
    }

    res.status(400).json({ success: false, error: 'Hành động không hợp lệ' });
  });

  // GET /api/admin/rooms: Detailed monitor of all active rooms
  app.get('/api/admin/rooms', (_req, res) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    const roomList = Array.from(rooms.values()).map((r) => {
      const host = r.players.find((p) => p.id === r.hostId);
      return {
        id: r.id,
        code: r.id,
        name: `Phòng #${r.id}`,
        mode: r.mode,
        modeName: getModeDisplayName(r.mode),
        difficulty: r.difficulty || 'normal',
        status: r.status,
        hostId: r.hostId,
        hostName: r.hostName || host?.username || 'Vô Danh',
        maxSlots: r.maxSlots,
        playerCount: r.players.length,
        createdAt: r.createdAt || Date.now(),
        players: r.players.map((p) => ({
          id: p.id,
          name: p.username,
          avatar: p.icon,
          wpm: p.wpm || 0,
          progress: p.progress || 0,
          isHost: p.id === r.hostId,
          isReady: !p.inMatch,
          isFinished: p.isFinished,
          isSurrendered: p.isSurrendered,
        })),
      };
    });

    res.json({
      success: true,
      totalRooms: roomList.length,
      rooms: roomList,
    });
  });

  // POST /api/admin/rooms/:id/close: Force terminate room
  app.post('/api/admin/rooms/:id/close', (req, res) => {
    const rawId = req.params.id;
    const norm = normalizeRoomCode(rawId);
    const room = rooms.get(norm);
    if (!room) {
      res.status(404).json({ success: false, error: 'Phòng không tồn tại hoặc đã giải tán' });
      return;
    }

    // Broadcast room closed to all SSE clients in that room
    const clients = sseClientsByRoom.get(room.id);
    if (clients) {
      const closeMsg = `data: ${JSON.stringify({ type: 'ROOM_CLOSED_BY_ADMIN', reason: 'Phòng đã được giải tán bởi Ban Quản Trị' })}\n\n`;
      for (const client of clients) {
        try {
          client.write(closeMsg);
          client.end();
        } catch (_) {}
      }
      sseClientsByRoom.delete(room.id);
    }

    rooms.delete(norm);
    if (room.id !== norm) {
      rooms.delete(room.id);
    }

    res.json({ success: true, message: `Đã đóng phòng #${room.id} thành công!` });
  });

  // POST /api/admin/broadcast: Instant global broadcast banner/announcement
  app.post('/api/admin/broadcast', (req, res) => {
    const { title, message, personaId = 'admin' } = req.body || {};
    if (!message) {
      res.status(400).json({ success: false, error: 'Nội dung thông báo không được để trống' });
      return;
    }

    const decree = broadcastHeavenlyDaoEvent({
      title: title || 'THÔNG BÁO TỪ QUẢN TRỊ VIÊN',
      eventType: 'announcement',
      content: message,
      highlightText: title || 'Thông Báo Admin',
      personaId: personaId === 'admin' ? 'huyen_thien' : personaId,
    });

    res.json({ success: true, decree, message: 'Đã phát sóng thông báo toàn hệ thống thành công!' });
  });

  // GET /api/leaderboard/cultivation: Top 50 tu vi cao nhất server (Cập nhật định kỳ 1 giờ/lần)
  app.get('/api/leaderboard/cultivation', (req, res) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');

    const now = Date.now();
    // Nếu quá 1 giờ hoặc có yêu cầu ép làm mới chu kỳ (?force=true)
    if (
      !lastCultivationLeaderboardUpdate ||
      now - lastCultivationLeaderboardUpdate >= CULTIVATION_LEADERBOARD_INTERVAL_MS ||
      req.query.force === 'true'
    ) {
      buildCultivationLeaderboardSnapshot();
    }

    const authHeader = req.headers.authorization;
    let authUser = getUserByToken(authHeader);
    const targetUsername = String(req.query.username || (authUser ? authUser.username : '')).trim().toLowerCase();

    // Đồng bộ nếu authUser có cultivation nhưng trong cache chưa khớp
    if (authUser && authUser.cultivation) {
      syncUserCultivationToCache(authUser);
    }

    // Xác định thứ hạng và thông tin tu vi thực tế của người chơi
    let currentUserRank = null;
    let currentUserActualCultivation = null;

    if (authUser && authUser.cultivation) {
      currentUserActualCultivation = authUser.cultivation;
    }

    if (targetUsername) {
      const foundIdx = cachedCultivationRankedList.findIndex((x) => x.username.toLowerCase() === targetUsername);
      if (foundIdx !== -1) {
        const item = cachedCultivationRankedList[foundIdx];
        currentUserRank = {
          rank: item.rank,
          username: item.username,
          displayName: item.displayName || item.username,
          level: item.level,
          realmIndex: item.realmIndex,
          realmName: item.realmName,
          realmIcon: item.realmIcon,
          tier: item.tier,
          subStage: item.subStage,
          exp: item.exp,
        };
      }
    }

    const nextUpdate = lastCultivationLeaderboardUpdate + CULTIVATION_LEADERBOARD_INTERVAL_MS;
    const remainingSeconds = Math.max(0, Math.floor((nextUpdate - Date.now()) / 1000));

    res.json({
      success: true,
      top50: cachedCultivationTop50,
      totalCount: cachedTotalCultivators,
      currentUserRank,
      currentUserActualCultivation,
      lastUpdated: lastCultivationLeaderboardUpdate,
      nextUpdate,
      remainingSeconds,
      updateInterval: CULTIVATION_LEADERBOARD_INTERVAL_MS,
    });
  });

  // =========================================================================
  // API TÔNG MÔN & BẢNG XẾP HẠNG TÔNG MÔN (SECT SYSTEM & LEADERBOARD)
  // =========================================================================

  // Helper broadcast thông báo tông môn lên kênh chat thế giới
  function broadcastSectAnnouncement(message: string) {
    const msgId = `sect-ann-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const sysMsg: ServerChatMessage = {
      id: msgId,
      username: 'Huyền Thiên Khí Linh',
      avatar: '☯️',
      frame: 'admin_gold',
      message,
      timestamp: Date.now(),
      channel: 'global',
      isAdmin: true,
      isDaoBot: true,
      daoEventType: 'announcement',
      daoTitle: 'Tông Môn Lệnh',
    };
    globalChatMessages.push(sysMsg);
    if (globalChatMessages.length > 200) globalChatMessages.shift();

    const payload = `data: ${JSON.stringify({ type: 'new_chat_message', message: sysMsg })}\n\n`;
    for (const client of Array.from(sseGlobalChatClients)) {
      try {
        client.write(payload);
      } catch {
        sseGlobalChatClients.delete(client);
        sseGlobalClients.delete(client);
      }
    }
  }

  // GET /api/leaderboard/sects: Bảng Xếp Hạng Tông Môn dựa trên Tổng Tu Vi Thành Viên
  app.get('/api/leaderboard/sects', (_req, res) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');

    const sects = Array.from(serverSects.values()).map((s) => {
      recalculateSectStats(s);
      const topMembers = [...(s.members || [])]
        .sort((a, b) => (b.tuViScore || 0) - (a.tuViScore || 0))
        .slice(0, 5);

      return {
        id: s.id,
        name: s.name,
        tag: s.tag,
        description: s.description,
        slogan: s.slogan,
        bannerColor: s.bannerColor,
        badgeIcon: s.badgeIcon,
        leaderId: s.leaderId,
        leaderName: s.leaderName,
        leaderAvatar: s.leaderAvatar || '👑',
        leaderFrame: s.leaderFrame || 'frame_xianxia_dokiep',
        leaderRealmName: s.leaderRealmName || 'Độ Kiếp Kỳ',
        leaderLevel: s.leaderLevel || 800,
        memberCount: s.members ? s.members.length : s.memberCount || 1,
        totalTuVi: s.totalTuVi || 1000000,
        avgLevel: s.avgLevel || 350,
        avgRealmName: s.avgRealmName || 'Hóa Thần Kỳ',
        linhMachLevel: s.linhMachLevel || 1,
        totalContribution: s.totalContribution || 0,
        weeklyTournamentPoints: s.weeklyTournamentPoints || 0,
        isHoldingThienCung: Boolean(s.isHoldingThienCung),
        topMembers,
        members: s.members || [],
        createdAt: s.createdAt,
      };
    });

    // Sắp xếp thứ hạng theo Tổng Tu Vi Thành Viên giảm dần
    sects.sort((a, b) => b.totalTuVi - a.totalTuVi);

    const rankedSects = sects.map((s, index) => ({
      ...s,
      rank: index + 1,
    }));

    res.json({
      success: true,
      topSects: rankedSects,
      totalSects: rankedSects.length,
      lastUpdated: Date.now(),
    });
  });

  // GET /api/sects: Lấy toàn bộ danh sách tông môn
  app.get('/api/sects', (_req, res) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    const list = Array.from(serverSects.values()).map((s) => {
      recalculateSectStats(s);
      return s;
    });
    res.json({ success: true, sects: list });
  });

  // POST /api/sects/create: Khai Sơn Lập Phái (Tạo tông môn mới)
  app.post('/api/sects/create', (req, res) => {
    const authHeader = req.headers.authorization;
    const user = getUserByToken(authHeader);

    if (!user) {
      res.status(401).json({ success: false, error: 'Đạo hữu cần đăng nhập để Khai Sơn Lập Phái!' });
      return;
    }

    const { name, tag, description, slogan, badgeIcon, bannerColor } = req.body;
    if (!name || typeof name !== 'string' || !name.trim()) {
      res.status(400).json({ success: false, error: 'Tên tông môn không được để trống!' });
      return;
    }
    if (!tag || typeof tag !== 'string' || !tag.trim()) {
      res.status(400).json({ success: false, error: 'Tông Huy Hiệu không được để trống!' });
      return;
    }

    const cleanName = name.trim().slice(0, 30);
    const cleanTag = tag.trim().toUpperCase().slice(0, 6);
    const cleanDesc = (description && typeof description === 'string')
      ? description.trim().slice(0, 200)
      : 'Một tông môn ẩn thế quật khởi tại cõi tu tiên.';
    const cleanSlogan = (slogan && typeof slogan === 'string')
      ? slogan.trim().slice(0, 100)
      : 'Khai Sơn Lập Phái • Vạn Cổ Trường Tồn';
    const cleanIcon = badgeIcon || '⚡';
    const cleanColor = bannerColor || '#f59e0b';

    // Kiểm tra trùng tên hoặc tag
    for (const s of serverSects.values()) {
      if (s.name.toLowerCase() === cleanName.toLowerCase() || s.tag.toLowerCase() === cleanTag.toLowerCase()) {
        res.status(400).json({ success: false, error: 'Tên tông môn hoặc Tông Huy Hiệu này đã có người sử dụng!' });
        return;
      }
    }

    const cult = user.cultivation || {};
    const userLevel = Math.max(1, Number(cult.level) || 1);
    const userLinhThach = Number(cult.linhThach) || 0;

    // Yêu cầu: Trúc Cơ Kỳ (Cấp >= 31) và 300 Linh Thạch
    if (userLevel < 31) {
      res.status(400).json({ success: false, error: 'Cần đạt cảnh giới Trúc Cơ Kỳ trở lên mới có thể Khai Sơn Lập Phái!' });
      return;
    }
    if (userLinhThach < 300) {
      res.status(400).json({ success: false, error: `Khai sơn lập phái cần 300 Linh Thạch, hiện có ${userLinhThach}!` });
      return;
    }

    const realmIndex = Math.max(0, Math.min(11, Number(cult.realmIndex) || 0));
    const realmMeta = XIANXIA_REALM_METAS[realmIndex] || XIANXIA_REALM_METAS[0];
    const tier = Math.max(1, Number(cult.tier) || 1);
    const exp = Math.max(0, Number(cult.exp) || 0);
    const tuViScore = (realmIndex * 1_000_000) + (userLevel * 10_000) + (tier * 1_000) + exp;

    // Khấu trừ 300 Linh Thạch
    cult.linhThach = userLinhThach - 300;

    const sectId = `sect_custom_${Date.now()}`;
    const founderMember: ServerSectMemberRecord = {
      userId: user.id,
      username: user.username,
      displayName: user.displayName || user.username,
      avatar: user.avatar || '👑',
      frame: user.frame || realmMeta.frameId,
      role: 'chuong_mon',
      contribution: 500,
      realmIndex,
      realmName: realmMeta.name,
      realmIcon: realmMeta.icon,
      level: userLevel,
      tier,
      exp,
      tuViScore,
      joinedAt: Date.now(),
      lastActive: Date.now(),
    };

    const newSect: ServerSectRecord = {
      id: sectId,
      name: cleanName,
      tag: cleanTag,
      description: cleanDesc,
      leaderId: user.id,
      leaderName: user.username,
      leaderAvatar: user.avatar || '👑',
      leaderFrame: user.frame || realmMeta.frameId,
      leaderRealmName: realmMeta.name,
      leaderLevel: userLevel,
      linhMachLevel: 1,
      totalContribution: 500,
      memberCount: 1,
      totalTuVi: tuViScore,
      avgLevel: userLevel,
      avgRealmName: realmMeta.name,
      badgeIcon: cleanIcon,
      slogan: cleanSlogan,
      bannerColor: cleanColor,
      weeklyTournamentPoints: 100,
      isHoldingThienCung: false,
      members: [founderMember],
      createdAt: Date.now(),
    };

    serverSects.set(sectId, newSect);
    saveSectsToFile();

    // Cập nhật thông tin tông môn vào user
    cult.sect = {
      sectId: newSect.id,
      sectName: newSect.name,
      sectTag: newSect.tag,
      role: 'chuong_mon',
      contribution: 500,
      joinedAt: Date.now(),
    };
    if (!cult.historyLog) cult.historyLog = [];
    cult.historyLog.unshift(`👑 [KHAI SƠN LẬP PHÁI] Chúc mừng đạo hữu sáng lập ${newSect.name} [${newSect.tag}], tôn xưng Chưởng Môn!`);
    if (cult.historyLog.length > 20) cult.historyLog.pop();

    user.cultivation = cult;
    user.updatedAt = Date.now();
    serverUsers.set(user.id, user);
    saveUsersToFile();
    syncUserCultivationToCache(user);

    broadcastSectAnnouncement(`👑 [KHAI SƠN LẬP PHÁI] Đại năng ${user.displayName || user.username} đã khai sơn lập phái, sáng lập tông môn ${cleanName} [${cleanTag}] chấn động toàn cõi Tiên Giới!`);

    res.json({
      success: true,
      message: `Chúc mừng đạo hữu sáng lập ${cleanName} [${cleanTag}], tôn xưng Chưởng Môn!`,
      sect: newSect,
      cultivation: cult,
    });
  });

  // POST /api/sects/join: Bái nhập môn phái
  app.post('/api/sects/join', (req, res) => {
    const authHeader = req.headers.authorization;
    const user = getUserByToken(authHeader);

    if (!user) {
      res.status(401).json({ success: false, error: 'Đạo hữu cần đăng nhập để bái nhập môn phái!' });
      return;
    }

    const { sectId } = req.body;
    const targetSect = serverSects.get(String(sectId));
    if (!targetSect) {
      res.status(404).json({ success: false, error: 'Không tìm thấy môn phái này!' });
      return;
    }

    const cult = user.cultivation || {};
    const oldSectId = cult.sect?.sectId;

    // Nếu đã ở trong môn phái này rồi
    if (oldSectId === sectId) {
      res.json({ success: true, message: 'Đạo hữu đã là thành viên của môn phái này!', sect: targetSect, cultivation: cult });
      return;
    }

    // Rời môn phái cũ nếu có
    if (oldSectId && serverSects.has(oldSectId)) {
      const oldSect = serverSects.get(oldSectId)!;
      oldSect.members = (oldSect.members || []).filter((m) => String(m.username || '').toLowerCase() !== String(user.username || '').toLowerCase());
      recalculateSectStats(oldSect);
    }

    const realmIndex = Math.max(0, Math.min(11, Number(cult.realmIndex) || 0));
    const realmMeta = XIANXIA_REALM_METAS[realmIndex] || XIANXIA_REALM_METAS[0];
    const userLevel = Math.max(1, Number(cult.level) || 1);
    const tier = Math.max(1, Number(cult.tier) || 1);
    const exp = Math.max(0, Number(cult.exp) || 0);
    const tuViScore = (realmIndex * 1_000_000) + (userLevel * 10_000) + (tier * 1_000) + exp;

    // Đệ tử mới gia nhập luôn là Ngoại Môn
    const newMember: ServerSectMemberRecord = {
      userId: user.id,
      username: user.username,
      displayName: user.displayName || user.username,
      avatar: user.avatar || '⚡',
      frame: user.frame || realmMeta.frameId,
      role: 'ngoai_mon',
      contribution: 50,
      realmIndex,
      realmName: realmMeta.name,
      realmIcon: realmMeta.icon,
      level: userLevel,
      tier,
      exp,
      tuViScore,
      joinedAt: Date.now(),
      lastActive: Date.now(),
    };

    if (!targetSect.members) targetSect.members = [];
    // Xóa trùng nếu có
    targetSect.members = targetSect.members.filter((m) => String(m.username || '').toLowerCase() !== String(user.username || '').toLowerCase());
    targetSect.members.push(newMember);
    recalculateSectStats(targetSect);
    saveSectsToFile();

    cult.sect = {
      sectId: targetSect.id,
      sectName: targetSect.name,
      sectTag: targetSect.tag,
      role: 'ngoai_mon',
      contribution: 50,
      joinedAt: Date.now(),
    };
    if (!cult.historyLog) cult.historyLog = [];
    cult.historyLog.unshift(`🏰 Bái nhập Tông Môn: Chúc mừng đạo hữu trở thành Ngoại Môn Đệ Tử của ${targetSect.name} [${targetSect.tag}]!`);
    if (cult.historyLog.length > 20) cult.historyLog.pop();

    user.cultivation = cult;
    user.updatedAt = Date.now();
    serverUsers.set(user.id, user);
    saveUsersToFile();
    syncUserCultivationToCache(user);

    res.json({
      success: true,
      message: `Đã bái nhập ${targetSect.name} [${targetSect.tag}] thành công!`,
      sect: targetSect,
      cultivation: cult,
    });
  });

  // POST /api/sects/leave: Rời khỏi môn phái
  app.post('/api/sects/leave', (req, res) => {
    const authHeader = req.headers.authorization;
    const user = getUserByToken(authHeader);

    if (!user) {
      res.status(401).json({ success: false, error: 'Đạo hữu cần đăng nhập!' });
      return;
    }

    const cult = user.cultivation || {};
    const sectId = cult.sect?.sectId;
    if (!sectId || !serverSects.has(sectId)) {
      res.status(400).json({ success: false, error: 'Đạo hữu hiện không thuộc môn phái nào!' });
      return;
    }

    const sect = serverSects.get(sectId)!;
    // Chưởng Môn không được tùy tiện rời phái nếu vẫn còn đệ tử khác
    if (cult.sect.role === 'chuong_mon') {
      const otherMembers = (sect.members || []).filter((m) => String(m.username || '').toLowerCase() !== String(user.username || '').toLowerCase());
      if (otherMembers.length > 0) {
        res.status(400).json({ success: false, error: 'Chưởng Môn cần truyền vị cho đồng đạo khác trước khi rời môn phái!' });
        return;
      }
    }

    sect.members = (sect.members || []).filter((m) => String(m.username || '').toLowerCase() !== String(user.username || '').toLowerCase());
    recalculateSectStats(sect);
    saveSectsToFile();

    cult.sect = undefined;
    if (!cult.historyLog) cult.historyLog = [];
    cult.historyLog.unshift(`🚪 [XUẤT SƯ THOÁI PHÁI] Đạo hữu đã rời khỏi môn phái, trở về thân phận tán tu.`);
    if (cult.historyLog.length > 20) cult.historyLog.pop();

    user.cultivation = cult;
    user.updatedAt = Date.now();
    serverUsers.set(user.id, user);
    saveUsersToFile();
    syncUserCultivationToCache(user);

    res.json({ success: true, message: 'Đã rời môn phái thành công.', cultivation: cult });
  });

  // POST /api/sects/role: Tấn phong / bãi miễn chức vụ đệ tử (Chưởng Môn & Đại Trưởng Lão)
  app.post('/api/sects/role', (req, res) => {
    const authHeader = req.headers.authorization;
    const user = getUserByToken(authHeader);

    if (!user) {
      res.status(401).json({ success: false, error: 'Chưa đăng nhập!' });
      return;
    }

    const { targetUsername, newRole } = req.body;
    const validRoles = ['chuong_mon', 'dai_truong_lao', 'chan_truyen', 'noi_mon', 'ngoai_mon'];
    if (!targetUsername || !newRole || !validRoles.includes(newRole)) {
      res.status(400).json({ success: false, error: 'Dữ liệu không hợp lệ!' });
      return;
    }

    const cult = user.cultivation || {};
    const sectId = cult.sect?.sectId;
    const callerRole = cult.sect?.role;

    if (!sectId || !serverSects.has(sectId)) {
      res.status(400).json({ success: false, error: 'Đạo hữu không có môn phái!' });
      return;
    }

    if (callerRole !== 'chuong_mon' && callerRole !== 'dai_truong_lao') {
      res.status(403).json({ success: false, error: 'Chỉ có Chưởng Môn hoặc Đại Trưởng Lão mới có quyền tấn phong chức vụ!' });
      return;
    }

    if (newRole === 'chuong_mon' && callerRole !== 'chuong_mon') {
      res.status(403).json({ success: false, error: 'Chỉ có Chưởng Môn mới có quyền truyền vị!' });
      return;
    }

    if (newRole === 'dai_truong_lao' && callerRole !== 'chuong_mon') {
      res.status(403).json({ success: false, error: 'Chỉ có Chưởng Môn mới có quyền tấn phong Đại Trưởng Lão!' });
      return;
    }

    const sect = serverSects.get(sectId)!;
    const targetMember = (sect.members || []).find((m) => String(m.username || '').toLowerCase() === String(targetUsername).toLowerCase());
    if (!targetMember) {
      res.status(404).json({ success: false, error: 'Không tìm thấy đệ tử này trong môn phái!' });
      return;
    }

    // Nếu truyền vị Chưởng Môn: Chưởng Môn hiện tại tự chuyển thành Đại Trưởng Lão
    if (newRole === 'chuong_mon') {
      const oldLeaderMember = (sect.members || []).find((m) => String(m.username || '').toLowerCase() === String(user.username || '').toLowerCase());
      if (oldLeaderMember) {
        oldLeaderMember.role = 'dai_truong_lao';
      }
      cult.sect.role = 'dai_truong_lao';
      user.cultivation = cult;
      serverUsers.set(user.id, user);

      sect.leaderId = targetMember.userId;
      sect.leaderName = targetMember.username;
      sect.leaderAvatar = targetMember.avatar;
      sect.leaderFrame = targetMember.frame;
      sect.leaderRealmName = targetMember.realmName;
      sect.leaderLevel = targetMember.level;
    }

    targetMember.role = newRole as any;

    // Cập nhật người chơi mục tiêu nếu đang có tài khoản trong serverUsers
    const targetUserRecord = getUserByUsername(targetMember.username);
    if (targetUserRecord && targetUserRecord.cultivation?.sect) {
      targetUserRecord.cultivation.sect.role = newRole as any;
      if (!targetUserRecord.cultivation.historyLog) targetUserRecord.cultivation.historyLog = [];
      targetUserRecord.cultivation.historyLog.unshift(`✨ [TÔNG MÔN TẤN PHONG] Chúc mừng đạo hữu được tấn phong làm [${newRole}] của ${sect.name}!`);
      serverUsers.set(targetUserRecord.id, targetUserRecord);
    }

    recalculateSectStats(sect);
    saveSectsToFile();
    saveUsersToFile();

    const roleTitles: Record<string, string> = {
      chuong_mon: 'Chưởng Môn',
      dai_truong_lao: 'Đại Trưởng Lão',
      chan_truyen: 'Chân Truyền Đệ Tử',
      noi_mon: 'Nội Môn Đệ Tử',
      ngoai_mon: 'Ngoại Môn Đệ Tử',
    };

    broadcastSectAnnouncement(`✨ [TÔNG MÔN TẤN PHONG] ${sect.name} [${sect.tag}]: Đệ tử ${targetMember.displayName || targetMember.username} đã được tấn phong làm [${roleTitles[newRole] || newRole}]!`);

    res.json({
      success: true,
      message: `Đã tấn phong ${targetMember.displayName || targetMember.username} làm [${roleTitles[newRole] || newRole}]!`,
      sect,
      cultivation: user.cultivation,
    });
  });

  // POST /api/sects/kick: Trục xuất đệ tử khỏi môn phái
  app.post('/api/sects/kick', (req, res) => {
    const authHeader = req.headers.authorization;
    const user = getUserByToken(authHeader);

    if (!user) {
      res.status(401).json({ success: false, error: 'Chưa đăng nhập!' });
      return;
    }

    const { targetUsername } = req.body;
    const cult = user.cultivation || {};
    const sectId = cult.sect?.sectId;
    const callerRole = cult.sect?.role;

    if (!sectId || !serverSects.has(sectId)) {
      res.status(400).json({ success: false, error: 'Đạo hữu không có môn phái!' });
      return;
    }

    if (callerRole !== 'chuong_mon' && callerRole !== 'dai_truong_lao') {
      res.status(403).json({ success: false, error: 'Chỉ có Chưởng Môn hoặc Đại Trưởng Lão mới có quyền trục xuất đệ tử!' });
      return;
    }

    const sect = serverSects.get(sectId)!;
    const targetMember = (sect.members || []).find((m) => m.username.toLowerCase() === String(targetUsername).toLowerCase());
    if (!targetMember) {
      res.status(404).json({ success: false, error: 'Không tìm thấy đệ tử trong môn phái!' });
      return;
    }

    if (targetMember.role === 'chuong_mon') {
      res.status(403).json({ success: false, error: 'Không thể trục xuất Chưởng Môn!' });
      return;
    }

    if (callerRole === 'dai_truong_lao' && (targetMember.role === 'dai_truong_lao' || targetMember.role === 'chan_truyen')) {
      res.status(403).json({ success: false, error: 'Đại Trưởng Lão không thể trục xuất đệ tử đồng cấp hoặc Chân Truyền!' });
      return;
    }

    sect.members = (sect.members || []).filter((m) => String(m.username || '').toLowerCase() !== String(targetUsername).toLowerCase());
    recalculateSectStats(sect);
    saveSectsToFile();

    // Xóa môn phái khỏi tài khoản người bị đuổi
    const targetUserRecord = getUserByUsername(targetMember.username);
    if (targetUserRecord && targetUserRecord.cultivation) {
      targetUserRecord.cultivation.sect = undefined;
      serverUsers.set(targetUserRecord.id, targetUserRecord);
      saveUsersToFile();
    }

    res.json({
      success: true,
      message: `Đã trục xuất ${targetMember.displayName || targetMember.username} khỏi môn phái.`,
      sect,
    });
  });

  // POST /api/sects/contribute: Cống hiến Linh Thạch bồi dưỡng Linh Mạch
  app.post('/api/sects/contribute', (req, res) => {
    const authHeader = req.headers.authorization;
    const user = getUserByToken(authHeader);

    if (!user) {
      res.status(401).json({ success: false, error: 'Chưa đăng nhập!' });
      return;
    }

    const { amount } = req.body;
    const contrib = Math.max(1, Number(amount) || 0);
    const cult = user.cultivation || {};
    const sectId = cult.sect?.sectId;

    if (!sectId || !serverSects.has(sectId)) {
      res.status(400).json({ success: false, error: 'Đạo hữu không có môn phái!' });
      return;
    }

    const currentLinhThach = Number(cult.linhThach) || 0;
    if (currentLinhThach < contrib) {
      res.status(400).json({ success: false, error: `Thiếu Linh Thạch: cần ${contrib}, hiện có ${currentLinhThach}!` });
      return;
    }

    cult.linhThach = currentLinhThach - contrib;
    cult.sect.contribution = (cult.sect.contribution || 0) + contrib;

    const sect = serverSects.get(sectId)!;
    sect.totalContribution = (sect.totalContribution || 0) + contrib;

    // Tìm và cập nhật thành viên trong sect
    const m = (sect.members || []).find((x) => String(x.username || '').toLowerCase() === String(user.username || '').toLowerCase());
    if (m) {
      m.contribution = (m.contribution || 0) + contrib;
    }

    // Kiểm tra thăng cấp Linh Mạch (ngưỡng: 5000, 15000, 30000, 60000)
    const thresholds = [0, 5000, 15000, 30000, 60000];
    let didLevelUp = false;
    if (sect.linhMachLevel < 5 && sect.totalContribution >= thresholds[sect.linhMachLevel]) {
      sect.linhMachLevel += 1;
      didLevelUp = true;
    }

    recalculateSectStats(sect);
    saveSectsToFile();

    const msg = didLevelUp
      ? `🌟 [LINH MẠCH ĐỘT PHÁ] Cống hiến ${contrib} Linh Thạch! Linh Mạch ${sect.name} đã thăng lên Cấp ${sect.linhMachLevel}!`
      : `🏰 Đóng góp ${contrib} Linh Thạch cho ${sect.name}, cống hiến cá nhân tăng +${contrib}!`;

    if (!cult.historyLog) cult.historyLog = [];
    cult.historyLog.unshift(msg);
    if (cult.historyLog.length > 20) cult.historyLog.pop();

    user.cultivation = cult;
    user.updatedAt = Date.now();
    serverUsers.set(user.id, user);
    saveUsersToFile();

    if (didLevelUp) {
      broadcastSectAnnouncement(`🌟 [LINH MẠCH ĐỘT PHÁ] Nhờ sự cống hiến của chư vị đệ tử, Linh Mạch Động Phủ của ${sect.name} [${sect.tag}] đã chính thức thăng cấp lên Cấp ${sect.linhMachLevel}/5!`);
    }

    res.json({
      success: true,
      message: msg,
      sect,
      cultivation: cult,
    });
  });

  // GET /api/leaderboard: Get real server-wide high scores
  app.get('/api/leaderboard', (_req, res) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    const enrichedScores: Record<string, ServerHighScoreRecord | null> = {};
    for (const [key, val] of Object.entries(serverHighScores)) {
      if (val) {
        let user: ServerUserRecord | null = null;
        if (val.userId && serverUsers.has(val.userId)) {
          user = serverUsers.get(val.userId) || null;
        } else if (val.username) {
          user = getUserByUsername(val.username);
        }
        enrichedScores[key] = {
          ...val,
          displayName: user?.displayName || val.displayName || val.username,
        };
      } else {
        enrichedScores[key] = null;
      }
    }
    res.json({ success: true, highScores: enrichedScores });
  });

  // POST /api/leaderboard: Submit real score achieved by player
  app.post('/api/leaderboard', (req, res) => {
    const {
      mode,
      username,
      displayName,
      wpm = 0,
      score = 0,
      errors = 0,
      avatar,
      frame,
      isSurrendered,
      isCompleted = true,
      roomId,
      playerId,
    } = req.body;

    const validModes = ['vi_dau', 'vi_nodau', 'en', 'numpad', 'ngau_hung', 'doan_chu', 'san_boss'];
    if (!mode || !validModes.includes(mode) || !username) {
      res.status(400).json({ success: false, error: 'Dữ liệu không hợp lệ' });
      return;
    }

    // Bàn Cổ Thần Thức: Kiểm tra án phạt cấm đấu 2 giờ
    const banCheck = checkIsBanned(username || (playerId ? playerId : ''));
    if (banCheck.isBanned) {
      res.json({
        success: false,
        isNewRecord: false,
        error: `Tài khoản đang chịu án phạt từ Bàn Cổ Thần Thức (Cấm thi đấu 2 giờ). Thời gian thụ án còn lại: ${banCheck.remainingMinutes} phút! Điểm số không được ghi nhận lên Bảng Vàng!`,
        highScores: serverHighScores,
      });
      return;
    }

    // QUY TẮC BẢNG VÀNG:
    // 1. NGƯỜI CHƠI CHƯA ĐĂNG NHẬP (KHÁCH) KHÔNG ĐƯỢC GHI KỶ LỤC BẢNG VÀNG
    const authHeader = (req.headers.authorization || (req.body && req.body.authToken ? `Bearer ${req.body.authToken}` : '')) as string;
    const authenticatedUser = getUserByToken(authHeader);
    if (!authenticatedUser || !authenticatedUser.isVerified) {
      res.json({
        success: false,
        isGuest: true,
        isNewRecord: false,
        error: 'Người chơi đang ở chế độ Khách (chưa đăng nhập hoặc chưa xác thực Gmail). Điểm số không được ghi nhận lên Bảng Vàng. Hãy đăng nhập tài khoản để xác lập kỷ lục!',
        highScores: serverHighScores,
      });
      return;
    }

    // 2. Người chơi chỉ có thể lên Bảng Vàng khi và chỉ khi ván đấu diễn ra trọn vẹn, không đầu hàng và không out phòng.
    if (isSurrendered === true || isCompleted === false) {
      res.json({
        success: false,
        isNewRecord: false,
        error: 'Ván đấu không trọn vẹn hoặc người chơi đã đầu hàng / rời phòng. Điểm không đủ điều kiện lên Bảng Vàng.',
        highScores: serverHighScores,
      });
      return;
    }

    // Nếu là phòng thi đấu multiplayer: kiểm tra trạng thái thực tế của người chơi trong phòng
    if (roomId && playerId) {
      const norm = normalizeRoomCode(roomId);
      const room = rooms.get(norm);
      if (room) {
        const roomPlayer = room.players.find((p) => p.id === playerId);
        // Nếu người chơi không còn trong phòng (out phòng) hoặc đã bị đánh dấu đầu hàng: từ chối ghi nhận
        if (!roomPlayer || roomPlayer.isSurrendered) {
          res.json({
            success: false,
            isNewRecord: false,
            error: 'Người chơi đã đầu hàng hoặc rời phòng trong ván đấu này. Điểm không đủ điều kiện lên Bảng Vàng.',
            highScores: serverHighScores,
          });
          return;
        }
      }
    }

    const cleanUsername = authenticatedUser.username || String(username).trim().slice(0, 30);
    const cleanDisplayName = (authenticatedUser.displayName || displayName || cleanUsername).trim().slice(0, 30);
    const numWpm = Math.max(0, Math.round(Number(wpm) || 0));
    const numScore = Math.max(0, Math.round(Number(score) || 0));
    const numErrors = Math.max(0, Math.round(Number(errors) || 0));

    const currentRecord = serverHighScores[mode];
    let isBetter = false;

    if (mode === 'ngau_hung' || mode === 'doan_chu' || mode === 'san_boss') {
      // Points or damage based
      if (!currentRecord) {
        isBetter = numScore > 0;
      } else {
        isBetter = numScore > currentRecord.score || (numScore === currentRecord.score && numErrors < currentRecord.errors);
      }
    } else {
      // WPM speed based
      if (!currentRecord) {
        isBetter = numWpm > 0;
      } else {
        isBetter = numWpm > currentRecord.wpm || (numWpm === currentRecord.wpm && numErrors < currentRecord.errors);
      }
    }

    if (isBetter) {
      serverHighScores[mode] = {
        username: authenticatedUser.username || cleanUsername,
        displayName: cleanDisplayName,
        userId: authenticatedUser.id,
        wpm: numWpm,
        score: numScore,
        errors: numErrors,
        timestamp: Date.now(),
        avatar: avatar || authenticatedUser.avatar || '⚡',
        frame: frame || authenticatedUser.frame || 'default',
      };
      saveLeaderboardToFile();
      broadcastLeaderboard();

      // Linh Lung Tiên Đồng (Chưởng Quản Phong Thần Bảng) phát chiếu thư toàn server & bình phẩm sôi nổi
      const modeDisplayName = getModeDisplayName(mode);
      const isBossOrScoreMode = mode === 'san_boss' || mode === 'ngau_hung' || mode === 'doan_chu';
      const recordMetric = isBossOrScoreMode ? `${numScore.toLocaleString()} điểm` : `${numWpm} WPM`;
      broadcastHeavenlyDaoEvent({
        title: 'PHONG THẦN ĐĂNG ĐỈNH',
        eventType: 'record',
        targetUser: cleanDisplayName,
        wpm: numWpm,
        accuracy: 100,
        content: `Phong Thần Bảng rung chuyển! Đạo hữu @${cleanDisplayName} vừa xuất chiêu thần tốc đạt ${recordMetric} tại chế độ ${modeDisplayName}, chính thức ghi danh Đệ Nhất Bảng Vàng! Mau mau bái phục nào! 🪷🎉`,
        highlightText: `${cleanDisplayName} đạt ${recordMetric}`,
        personaId: 'linh_lung',
        generateAiPoem: true,
      });

      res.json({ success: true, isNewRecord: true, highScores: serverHighScores });
      return;
    }

    res.json({ success: true, isNewRecord: false, highScores: serverHighScores });
  });

  // POST /api/leaderboard/admin-update: Admin updates high scores
  app.post('/api/leaderboard/admin-update', (req, res) => {
    const { highScores } = req.body;
    if (highScores && typeof highScores === 'object') {
      const sanitized: Record<string, any> = {};
      for (const [k, v] of Object.entries(highScores)) {
        if (v && typeof v === 'object') {
          const rec = v as any;
          sanitized[k] = {
            ...rec,
            displayName: rec.displayName || rec.username,
          };
        } else {
          sanitized[k] = null;
        }
      }
      serverHighScores = { ...serverHighScores, ...sanitized };
      saveLeaderboardToFile();
      broadcastLeaderboard();
      res.json({ success: true, highScores: serverHighScores });
      return;
    }
    res.status(400).json({ success: false, error: 'Dữ liệu không hợp lệ' });
  });

  // Helper fallback practice word builder
  function generateFallbackPracticeWords(mistakes: any[] = [], errorKeys: any[] = [], mode = 'vi_dau'): string[] {
    const pool = new Set<string>();
    const modeStr = String(mode || '').toLowerCase();
    const isNumber =
      modeStr === 'numpad' ||
      modeStr === 'number' ||
      modeStr.includes('number') ||
      modeStr.includes('numpad') ||
      modeStr.includes('số') ||
      modeStr.includes('digits');

    const rawMistakes: string[] = [];
    if (Array.isArray(mistakes)) {
      mistakes.forEach((m) => {
        const orig = typeof m === 'string' ? m : m?.original || m?.word;
        if (orig && typeof orig === 'string') {
          orig.trim().split(/\s+/).forEach((w: string) => {
            if (isNumber) {
              const clean = w.replace(/[^\d+\-*/=.]/g, '');
              if (clean && !rawMistakes.includes(clean)) {
                rawMistakes.push(clean);
                pool.add(clean);
              }
            } else {
              const clean = w.toLowerCase().trim();
              if (clean && !rawMistakes.includes(clean)) {
                rawMistakes.push(clean);
                pool.add(clean);
              }
            }
          });
        }
      });
    }

    const keyList = Array.isArray(errorKeys)
      ? errorKeys.map((k) => (typeof k === 'string' ? k : k?.key)).filter(Boolean)
      : [];

    if (isNumber) {
      const numberPool = [
        '1024', '58008', '2026', '9876', '1234', '5050', '31415', '92653',
        '7410', '8520', '9630', '4567', '7890', '13579', '24680', '9988',
        '1122', '3344', '7700', '4040', '8080', '1995', '2000', '2025',
        '128', '256', '512', '1000', '9999', '8888', '7777', '6543', '2109'
      ];
      for (const n of numberPool) {
        if (pool.size >= 30) break;
        if (keyList.some((k) => n.includes(String(k)))) {
          pool.add(n);
        }
      }
      for (const n of numberPool) {
        if (pool.size >= 25) break;
        pool.add(n);
      }
      return Array.from(pool).slice(0, 30);
    }

    const isEn = modeStr === 'en';
    const isViNoDau = modeStr === 'vi_nodau';
    const relatedVnNoDau = [
      'nghieng', 'khoang', 'chuyen', 'tuyet', 'khuyen', 'nghiep', 'truyen', 'quyet',
      'xoay', 'thoat', 'khoanh', 'quynh', 'nguyet', 'duyen', 'ban', 'phim',
      'toc', 'do', 'chinh', 'xac', 'chien', 'thang', 'ren', 'luyen', 'ky', 'nang',
      'thao', 'truong', 'phan', 'dau', 'kien', 'tri', 'nhip', 'nhang', 'chuoi'
    ];
    const relatedVnDau = [
      'nghiêng', 'khoảng', 'chuyển', 'tuyệt', 'khuyến', 'nghiệp', 'truyền', 'quyết',
      'xoay', 'thoát', 'khoảnh', 'ngoéo', 'quỳnh', 'nguyệt', 'duyên', 'bàn', 'phím',
      'tốc', 'độ', 'chính', 'xác', 'chiến', 'thắng', 'rèn', 'luyện', 'kỹ', 'năng',
      'thao', 'trường', 'phấn', 'đấu', 'kiên', 'trì', 'nhịp', 'nhàng', 'chuỗi'
    ];
    const relatedEn = [
      'rhythm', 'queue', 'strength', 'synergy', 'awkward', 'beautiful', 'keyboard',
      'practice', 'accuracy', 'mastery', 'challenge', 'experience', 'quick', 'flight',
      'balance', 'control', 'fingers', 'velocity', 'precision', 'focus', 'reflexes'
    ];

    const source = isEn ? relatedEn : isViNoDau ? relatedVnNoDau : relatedVnDau;

    // Detect clusters from mistakes to pick matching words
    const detectedPatterns: string[] = [];
    rawMistakes.forEach((w) => {
      const lower = w.toLowerCase();
      ['ngh', 'qu', 'ph', 'tr', 'ch', 'kh', 'uyên', 'uông', 'ương', 'oang'].forEach((pat) => {
        if (lower.includes(pat) && !detectedPatterns.includes(pat)) {
          detectedPatterns.push(pat);
        }
      });
    });

    // Add matching pattern words
    if (detectedPatterns.length > 0) {
      source.forEach((w) => {
        if (pool.size >= 26) return;
        if (detectedPatterns.some((pat) => w.includes(pat))) {
          pool.add(w);
        }
      });
    }

    for (const w of source) {
      if (pool.size >= 30) break;
      if (keyList.some((k) => w.includes(String(k)))) {
        pool.add(w);
      }
    }
    for (const w of source) {
      if (pool.size >= 25) break;
      pool.add(w);
    }
    return Array.from(pool).slice(0, 30);
  }

  // Helper builder for Heavenly Dao Analysis Heuristics
  function buildHeuristicDaoResponse(params: {
    realmName: string;
    tier: number;
    subStage: string;
    avgWpm: number;
    peakWpm: number;
    avgAcc: number;
    avgConsistency: number;
    safeTotal: number;
    count: number;
    introErrors: number;
    accelErrors: number;
    sustainErrors: number;
    endgameErrors: number;
    allMistakes: any[];
    errorKeysMap: Record<string, number>;
    mode?: string;
  }) {
    const {
      realmName,
      tier,
      subStage,
      avgWpm,
      peakWpm,
      avgAcc,
      avgConsistency,
      safeTotal,
      count,
      introErrors,
      accelErrors,
      sustainErrors,
      endgameErrors,
      allMistakes,
      errorKeysMap,
      mode = 'vi_dau',
    } = params;

    const modeStr = String(mode || '').toLowerCase();
    const hasNumericMistakes = allMistakes && allMistakes.some((m: any) => {
      const s = String(typeof m === 'string' ? m : m?.original || m?.word || '').trim();
      return /^[\d+\-*/=.]+$/.test(s);
    });
    const isNumberMode =
      modeStr === 'numpad' ||
      modeStr === 'number' ||
      modeStr.includes('number') ||
      modeStr.includes('numpad') ||
      modeStr.includes('số') ||
      Boolean(hasNumericMistakes);

    const defaultErrorPatterns = isNumberMode
      ? [
          {
            id: 'numpad_reach_slip',
            name: 'Trượt Phím Hàng Số / Numpad Xa',
            xianxiaTitle: 'Cửu Cung Thần Số Chướng',
            frequency: Math.max(2, Math.round(safeTotal * 0.45)),
            percentage: 45,
            description: 'Vươn ngón tay lên hàng phím số trên cùng hoặc gõ nhầm các phím góc xa (7, 8, 9, 0) trên Numpad.',
            biomechanics: 'Tầm với của ngón tay kéo căng cơ duỗi cổ tay, thiếu điểm tựa xúc giác định vị như phím 5.',
            examples: ['7 -> 8', '9 -> 6', '0 -> .'],
            severity: 'high' as const,
          },
          {
            id: 'digit_transposition',
            name: 'Đảo Thứ Tự Chữ Số (Tay Nhanh Hơn Não)',
            xianxiaTitle: 'Nghịch Chuyển Lục Hào Ma',
            frequency: Math.max(2, Math.round(safeTotal * 0.3)),
            percentage: 30,
            description: 'Gõ đảo vị trí 2 chữ số liền kề khi nhịp độ tăng tốc (ví dụ gõ 12 thành 21, 58 thành 85).',
            biomechanics: 'Mất cân bằng độ trễ vận động thần kinh khi gõ chuỗi số tốc độ cao.',
            examples: ['58 -> 85', '12 -> 21', '08 -> 80'],
            severity: 'medium' as const,
          },
          {
            id: 'thumb_pinky_rhythm',
            name: 'Khựng Nhịp Phím 0 / Enter / Phép Tính',
            xianxiaTitle: 'Định Thần Khuyết Lực Ma',
            frequency: Math.max(1, Math.round(safeTotal * 0.25)),
            percentage: 25,
            description: 'Ngón cái hoặc ngón út ấn phím 0 hoặc Space bị trễ nhịp so với các ngón trỏ và giữa.',
            biomechanics: 'Phản xạ ngón cái và ngón út có độ linh hoạt thấp hơn ngón trỏ trên layout numpad.',
            examples: ['0 hụt lực', 'chậm nhịp chuyển số'],
            severity: 'low' as const,
          },
        ]
      : [
          {
            id: 'telex_tone_clash',
            name: 'Xung đột Phím Dấu Telex',
            xianxiaTitle: 'Dấu Thanh Hỗn Loạn Chướng',
            frequency: Math.max(2, Math.round(safeTotal * 0.4)),
            percentage: 40,
            description: 'Gõ phím dấu thanh tiếng Việt (s, f, r, x, j, w) quá sớm khi nguyên âm trước chưa kịp ghi nhận.',
            biomechanics: 'Ngón tay lướt phím dấu trước khi ngón trỏ hoặc ngón giữa buông phím nguyên âm kế trước.',
            examples: ['thườg -> thường', 'nhiùe -> nhiều', 'nghĩn -> nghìn'],
            severity: 'high' as const,
          },
          {
            id: 'transposition_rush',
            name: 'Đảo Ký Tự Tay Nhanh Hơn Não',
            xianxiaTitle: 'Tâm Gấp Khí Loạn Ma',
            frequency: Math.max(2, Math.round(safeTotal * 0.3)),
            percentage: 30,
            description: 'Hoán vị thứ tự 2 ký tự liền nhau do tay phải xuất chiêu trước tay trái.',
            biomechanics: 'Mất cân bằng độ trễ vận động thần kinh giữa hai bán cầu não khi gõ từ quen thuộc.',
            examples: ['ch -> hc', 'ng -> gn', 'th -> ht'],
            severity: 'medium' as const,
          },
          {
            id: 'pinky_slip',
            name: 'Trượt Phím Rìa Ngoài Ngón Út',
            xianxiaTitle: 'Ngón Út Khuyết Lực Ma',
            frequency: Math.max(1, Math.round(safeTotal * 0.2)),
            percentage: 20,
            description: 'Các phím nằm ở góc xa (P, Q, Z, [, ], Shift) bị hụt lực hoặc chạm nhầm phím liền kề.',
            biomechanics: 'Cơ duỗi ngón út có tầm với xa nhất và lực ấn yếu nhất trên bàn phím.',
            examples: ['p -> o', 'q -> w', 'z -> a'],
            severity: 'low' as const,
          },
        ];

    const pathwaySteps = isNumberMode
      ? {
          step1: {
            title: 'Bước 1: Khởi Nhịp Chậm Chắc Ở 10 Giây Đầu',
            desc: 'Tập trung gõ 100% chính xác ở 10 giây đầu ván để bàn tay thiết lập nhịp điệu số học ổn định.',
          },
          step2: {
            title: 'Bước 2: Định Vị Phím 5 Numpad Làm Điểm Tựa Gốc',
            desc: 'Giữ ngón giữa luôn cảm nhận điểm gờ phím 5 để các ngón khác vươn tới các phím 7, 8, 9, 1, 2, 3 mà không cần nhìn bàn phím.',
          },
          step3: {
            title: 'Bước 3: Luyện Bộ Dãy Số Hóa Giải Tâm Ma Mỗi Ngày',
            desc: 'Thực hành đều đặn với bộ chuỗi số cá nhân hóa do Thiên Đạo AI đề xuất trong chế độ Solo Số.',
          },
        }
      : {
          step1: {
            title: 'Bước 1: Khởi Nhịp Chậm Chắc Ở 10 Giây Đầu',
            desc: 'Tập trung gõ 100% chính xác ở 10 giây đầu ván để bàn tay thiết lập nhịp điệu ổn định.',
          },
          step2: {
            title: 'Bước 2: Hóa Giải Lỗi Dấu Telex Bằng Nhịp Buông Phím',
            desc: 'Tập buông phím nguyên âm trước khi chạm phím dấu thanh để tránh nghẽn bộ đệm gõ tiếng Việt.',
          },
          step3: {
            title: 'Bước 3: Luyện Bộ Từ Hóa Giải Tâm Ma Mỗi Ngày',
            desc: 'Thực hành đều đặn với bộ từ cá nhân hóa do Thiên Đạo AI đề xuất trong chế độ Solo.',
          },
        };

    return {
      playerRealm: {
        realmName,
        tier,
        subStage,
        currentWpm: avgWpm,
        wpmBracket: `${realmName} (${Math.max(20, avgWpm - 10)} - ${avgWpm + 15} WPM)`,
      },
      overallVerdict: {
        title: isNumberMode
          ? `Thiên Đạo Phán Quyết: Toán Pháp Đạo Cơ ${realmName} ${subStage}`
          : `Thiên Đạo Phán Quyết: Đạo Cơ ${realmName} ${subStage}`,
        summary: isNumberMode
          ? `Quan trắc qua ${count} ván đấu bàn phím số, tốc độ trung bình đạt ${avgWpm} WPM (Đỉnh: ${peakWpm} WPM) với độ chuẩn xác ${avgAcc}%. Bạn kiểm soát các phím số rất tốt song đang gặp bình cảnh do nhịp vươn ngón tay ở các phím số xa.`
          : `Quan trắc qua ${count} ván đấu, tốc độ trung bình đạt ${avgWpm} WPM (Đỉnh: ${peakWpm} WPM) với độ chuẩn xác ${avgAcc}%. Bạn đang ở nửa trên của phân khúc trình độ hiện tại, song đang gặp bình cảnh do nhịp phím tại giai đoạn tăng tốc.`,
        tamMaName: isNumberMode ? 'Tâm Ma Thần Số (Nôn Nóng Bấm Số)' : 'Tâm Gấp Khí Loạn (Vội Vàng Xuất Chiêu)',
        tamMaDescription: isNumberMode
          ? 'Lỗi phát sinh chủ yếu khi cố bứt tốc gõ chuỗi số liên tiếp làm ngón tay trượt sang phím số liền kề trên bàn phím số.'
          : 'Lỗi phát sinh chủ yếu khi cố gắng bứt tốc gõ nhanh hơn ngưỡng phản xạ an toàn của ngón tay, gây ra chuỗi Backspace làm gián đoạn nhịp thở.',
        overallPercentile: Math.min(95, Math.max(25, Math.round((avgWpm / 110) * 80))),
        breakthroughReadiness: Math.min(95, Math.max(30, Math.round((avgAcc / 100) * 85))),
      },
      errorPatterns: defaultErrorPatterns,
      timingAnalysis: {
        phases: [
          {
            phaseId: 'intro',
            name: 'Khởi Thức (Nhập Cuộc)',
            xianxiaPhase: 'Sơ Khai Định Thần',
            timeRange: '0s - 15s (25% đầu ván)',
            errorCount: introErrors,
            errorPercentage: Math.round((introErrors / safeTotal) * 100),
            description: 'Bàn tay chưa đủ độ ấm, vội vàng gõ từ đầu tiên dẫn đến lệch nhịp.',
            riskLevel: introErrors / safeTotal > 0.3 ? 'cao' : 'thap',
          },
          {
            phaseId: 'acceleration',
            name: 'Tăng Tốc (Vận Khí)',
            xianxiaPhase: 'Cực Hạn Bứt Phá',
            timeRange: '15s - 35s (Giai đoạn đẩy WPM)',
            errorCount: accelErrors,
            errorPercentage: Math.round((accelErrors / safeTotal) * 100),
            description: 'Cố gắng đẩy WPM vượt quá ngưỡng phản xạ an toàn của ngón tay.',
            riskLevel: accelErrors / safeTotal > 0.3 ? 'cao' : 'trung_binh',
          },
          {
            phaseId: 'sustain',
            name: 'Bình Ổn (Trung Châu)',
            xianxiaPhase: 'Đạo Tâm Trì Trệ',
            timeRange: '35s - 50s (Duy trì nhịp)',
            errorCount: sustainErrors,
            errorPercentage: Math.round((sustainErrors / safeTotal) * 100),
            description: 'Lỗi xuất hiện sau các từ dài hoặc khi đổi dòng văn bản.',
            riskLevel: 'thap',
          },
          {
            phaseId: 'endgame',
            name: 'Về Đích (Tàn Kiếp)',
            xianxiaPhase: 'Linh Khí Khô Kiệt',
            timeRange: '50s - 60s+ (Rút đích)',
            errorCount: endgameErrors,
            errorPercentage: Math.round((endgameErrors / safeTotal) * 100),
            description: 'Mỏi cơ cổ tay hoặc nôn nóng nhìn đồng hồ đếm ngược.',
            riskLevel: endgameErrors / safeTotal > 0.28 ? 'cao' : 'trung_binh',
          },
        ],
        criticalMomentVerdict: `Thời điểm phát sinh lỗi nhiều nhất tập trung ở giai đoạn ${accelErrors >= introErrors && accelErrors >= endgameErrors ? 'Tăng Tốc (15s - 35s)' : 'Về Đích (50s - 60s+)'}.`,
        avgRecoveryLatencyMs: 340,
        peerAvgRecoveryMs: 380,
        cascadeErrorRate: 22,
      },
      peerComparison: {
        bracketName: `${realmName} (${Math.max(20, avgWpm - 10)} - ${avgWpm + 15} WPM)`,
        description: `So sánh 6 Trụ Cột Đạo Cơ giữa bạn với bình quân tu sĩ cùng phân khúc WPM.`,
        metrics: [
          {
            key: 'speed',
            label: 'Tốc Độ Xuất Chiêu (WPM)',
            xianxiaLabel: 'Ngự Khí Thần Tốc',
            unit: 'WPM',
            playerValue: avgWpm,
            peerAverage: Math.max(15, avgWpm - 4),
            peerTop10: Math.round(avgWpm * 1.25),
            percentile: Math.min(95, Math.max(30, Math.round((avgWpm / 120) * 85))),
            assessment: 'Tốc độ xuất chiêu thuộc diện nhanh nhẹn trong cảnh giới.',
          },
          {
            key: 'accuracy',
            label: 'Tâm Pháp Tinh Chuẩn (%)',
            xianxiaLabel: 'Bách Bộ Xuyên Dương',
            unit: '%',
            playerValue: avgAcc,
            peerAverage: 94,
            peerTop10: 98,
            percentile: Math.min(99, Math.max(20, Math.round(((avgAcc - 85) / 14) * 100))),
            assessment: avgAcc >= 95 ? 'Độ chuẩn xác rất tốt' : 'Cần giảm 5% tốc độ để nâng độ chuẩn xác lên trên 96%',
          },
          {
            key: 'consistency',
            label: 'Đạo Tâm Kiên Định (%)',
            xianxiaLabel: 'Bất Động Như Sơn',
            unit: '%',
            playerValue: avgConsistency,
            peerAverage: 82,
            peerTop10: 92,
            percentile: Math.min(95, Math.max(25, avgConsistency)),
            assessment: avgConsistency >= 85 ? 'Nhịp gõ cực kỳ đều đặn' : 'Nhịp gõ chưa đều, hay bị khựng giữa các từ',
          },
          {
            key: 'recovery',
            label: 'Hồi Phục Thần Thức (ms)',
            xianxiaLabel: 'Hoàn Hồn Định Phách',
            unit: 'ms',
            playerValue: 340,
            peerAverage: 380,
            peerTop10: 180,
            percentile: 65,
            assessment: 'Thời gian sửa lỗi ở mức khá, cần phản xạ Backspace nhanh và dứt khoát hơn.',
          },
          {
            key: 'stamina',
            label: 'Độ Bền Khí Tức (Cuối Trận)',
            xianxiaLabel: 'Trường Sinh Bất Diệt',
            unit: '/100',
            playerValue: 78,
            peerAverage: 72,
            peerTop10: 90,
            percentile: 78,
            assessment: 'Giữ được phong độ tương đối ổn định vào cuối ván đấu.',
          },
          {
            key: 'breakthrough',
            label: 'Tiềm Năng Đột Phá (%)',
            xianxiaLabel: 'Thiên Cơ Khai Mở',
            unit: '%',
            playerValue: 82,
            peerAverage: 65,
            peerTop10: 92,
            percentile: 82,
            assessment: isNumberMode
              ? 'Hội tụ đủ khí vận để đột phá cảnh giới kế tiếp nếu khắc phục được lỗi trượt phím số xa.'
              : 'Hội tụ đủ khí vận để đột phá cảnh giới kế tiếp nếu khắc phục được lỗi dấu Telex.',
          },
        ],
      },
      breakthroughPathway: pathwaySteps,
      practiceWords: generateFallbackPracticeWords(
        allMistakes,
        Object.entries(errorKeysMap).map(([key, count]) => ({ key, count })),
        isNumberMode ? 'numpad' : mode
      ),
    };
  }

  // POST /api/ai/personalized-practice: AI analysis & generated custom practice words
  app.post('/api/ai/personalized-practice', async (req, res) => {
    try {
      const {
        mistakes = [],
        commonErrorKeys = [],
        slowestWord,
        averageHesitationMs,
        stats = {},
        recentMatches = [],
        mode = 'vi_dau',
      } = req.body || {};

      const modeStr = String(mode || '').toLowerCase();
      const isNumberMode =
        modeStr === 'numpad' ||
        modeStr === 'number' ||
        modeStr.includes('number') ||
        modeStr.includes('numpad') ||
        modeStr.includes('số') ||
        modeStr.includes('digits');
      const isEnMode = modeStr === 'en';
      const isViNoDauMode = modeStr === 'vi_nodau';

      // Clean mistakes and error keys for number mode to prevent any non-digit interference
      const effectiveMistakes = isNumberMode
        ? mistakes.filter((m: any) => {
            const s = String(m?.original || m?.word || '');
            return /[\d+\-*/=.]/.test(s) && !/[a-zA-Zà-ỹÀ-Ỹ]/.test(s);
          })
        : mistakes;
      const effectiveErrorKeys = isNumberMode
        ? commonErrorKeys.filter((k: any) => {
            const s = String(typeof k === 'string' ? k : k?.key || '');
            return /[\d+\-*/=.]/.test(s) && !/[a-zA-Z]/.test(s);
          })
        : commonErrorKeys;

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey || isGeminiProjectAccessDenied) {
        return res.json({
          success: true,
          analysis: {
            title: isNumberMode
              ? 'Bài Tập Luyện Bàn Phím Số Chuyên Sâu (Number Drill)'
              : 'Bài Tập Khắc Phục Lỗi Sai Cá Nhân',
            overview: isNumberMode
              ? 'Đã bóc tách các chữ số hay gõ nhầm và nhịp vươn ngón tay từ các ván đấu chế độ Số của bạn.'
              : 'Đã phân tích các lỗi sai và cụm phím hay gõ nhầm từ lịch sử đấu của bạn.',
            dominantErrorPattern: isNumberMode
              ? 'Trượt phím số xa & nhịp bấm Numpad'
              : 'Lỗi nhịp gõ & tổ hợp dấu thanh',
            keyWeaknesses: effectiveMistakes.slice(0, 3).map((m: any) => `${m.original || m.word} (gõ thành ${m.typed})`),
            targetClusters: effectiveErrorKeys.slice(0, 5).map((k: any) => (typeof k === 'string' ? k : k.key)),
            coachAdvice: isNumberMode
              ? 'Giữ ngón giữa đặt trên phím 5 có gờ xúc giác làm điểm tựa để định vị chính xác toàn bộ hàng phím số.'
              : 'Hãy tập trung gõ đều nhịp, ưu tiên độ chính xác 100% cho các phụ âm và cụm dấu thanh tiếng Việt.',
          },
          practiceWords: generateFallbackPracticeWords(effectiveMistakes, effectiveErrorKeys, mode),
          isAiPowered: false,
        });
      }

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      let coachRole = 'Bạn là Huấn luyện viên Đánh máy Chuyên sâu (Typing Master Coach) cho môn thể thao gõ phím tiếng Việt (FastTyping Challenge).';
      let modeRule = '';

      if (isNumberMode) {
        coachRole = 'Bạn là Huấn luyện viên Chuyên sâu về Bàn phím số & Tốc độ gõ số (Numpad & Number Speed Typing Coach) trên FastTyping.';
        modeRule = `
*** ĐẶC BIỆT BẮT BUỘC (CRITICAL REQUIREMENT) ***
1. Chế độ thi đấu hiện tại của người chơi là: BÀN PHÍM SỐ / NUMBER MODE (CHỈ CHỮ SỐ VÀ PHÉP TOÁN NUMPAD).
2. TẤT CẢ các từ trong mảng "practiceWords" BẮT BUỘC PHẢI LÀ CÁC CHUỖI SỐ (chữ số từ 0 đến 9, độ dài 2 đến 6 chữ số, ví dụ: "1024", "58008", "9876", "2026", "31415", "8520", "9630", "7410", "4040", "1357", "2468", "8899"...). TUYỆT ĐỐI KHÔNG ĐƯỢC CHỨA BẤT KỲ TỪ TIẾNG VIỆT, KHÔNG ĐƯỢC CÓ DẤU THANH VÀ KHÔNG ĐƯỢC CÓ CHỮ CÁI!
3. Toàn bộ nhận xét "dominantErrorPattern", "keyWeaknesses", "targetClusters", "coachAdvice" PHẢI TẬP TRUNG 100% VÀO KỸ THUẬT GÕ PHÍM SỐ (tầm với hàng số, phím 5 định vị điểm gờ, ngón cái phím 0, trượt phím 7/8/9, đảo thứ tự chữ số...). TUYỆT ĐỐI KHÔNG ĐƯỢC NHẮC ĐẾN DẤU TELEX HAY TIẾNG VIỆT!
`;
      } else if (isEnMode) {
        modeRule = `
*** ĐẶC BIỆT BẮT BUỘC ***
Người chơi thi đấu ở CHẾ ĐỘ TIẾNG ANH (ENGLISH). Mọi từ trong "practiceWords" BẮT BUỘC LÀ TỪ TIẾNG ANH CHUẨN, không dấu tiếng Việt.
`;
      } else if (isViNoDauMode) {
        modeRule = `
*** ĐẶC BIỆT BẮT BUỘC ***
Người chơi thi đấu ở CHẾ ĐỘ TIẾNG VIỆT KHÔNG DẤU (vi_nodau). Mọi từ trong "practiceWords" TUYỆT ĐỐI KHÔNG ĐƯỢC CÓ DẤU THANH.
`;
      }

      const prompt = `${coachRole}
Nhiệm vụ của bạn là: Phân tích toàn diện lịch sử lỗi gõ phím của người chơi và tạo ra một BÀI TẬP LUYỆN CÁ NHÂN HÓA (Personalized Practice) gồm danh sách chuỗi ký tự thực hành đặc trị các lỗi sai đó.
${modeRule}
Dữ liệu phân tích ván đấu của người chơi:
- Chế độ chơi chính: ${mode}
- Tốc độ trung bình: ${stats.wpm || 0} WPM | Độ chính xác: ${stats.accuracy || 0}% | Nhịp ổn định: ${stats.consistency || 0}%
- Các từ bị gõ sai và ký tự gõ nhầm: ${JSON.stringify(effectiveMistakes.slice(0, 15))}
- Các phím/cụm phím hay bấm sai nhất: ${JSON.stringify(effectiveErrorKeys.slice(0, 8))}
- Từ bị khựng lâu nhất (Hesitation): ${slowestWord ? `${slowestWord.word} (${(slowestWord.pauseMs / 1000).toFixed(2)}s)` : 'Không có'}
- Độ trễ trung bình giữa các từ: ${averageHesitationMs || 0}ms
- Tóm tắt các trận gần nhất: ${recentMatches.slice(0, 5).map((m: any) => `${m.modeId}: ${m.wpm}WPM (${m.accuracy}%)`).join(', ')}

Yêu cầu đầu ra: Trả về ĐÚNG 1 ĐỐI TƯỢNG JSON (không bọc trong markdown codeblock nếu có thể, hoặc bọc trong \`\`\`json) với định dạng chính xác sau:
{
  "title": "${isNumberMode ? 'Tiêu đề bài luyện số (VD: Đặc Trị Hàng Phím Số & Tổ Hợp Numpad)' : 'Tiêu đề bài luyện tập (VD: Đặc Trị Cụm Dấu Thanh & Phím Ngón Út)'}",
  "overview": "Đoạn văn ngắn 2-3 câu phân tích sâu và sắc bén về thói quen ngón tay, điểm nghẽn tốc độ và nguyên nhân người chơi hay gõ sai.",
  "dominantErrorPattern": "${isNumberMode ? 'Trượt phím hàng số / Nhầm nhịp Numpad' : 'Tên mẫu lỗi chính (VD: Tranh chấp nhịp hai bàn tay / Khựng ở nguyên âm kép)'}",
  "keyWeaknesses": ["Điểm yếu 1", "Điểm yếu 2", "Điểm yếu 3"],
  "targetClusters": ["cụm 1", "cụm 2", "cụm 3"],
  "coachAdvice": "Lời khuyên kỹ thuật hành động cụ thể để sửa lỗi ngay trong lần gõ tiếp theo.",
  "practiceWords": [
    ${isNumberMode ? '"1024", "58008", "9876", "2026", "31415", "8520"' : '"từ_1", "từ_2", "từ_3"'}
  ]
}`;

      const textResponse = await callGeminiResilient(ai, prompt);
      let parsedData: any = null;
      if (textResponse) {
        try {
          const cleaned = textResponse.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
          parsedData = JSON.parse(cleaned);
        } catch {
          const match = textResponse.match(/\{[\s\S]*\}/);
          if (match) {
            try {
              parsedData = JSON.parse(match[0]);
            } catch {
              // fallback
            }
          }
        }
      }

      // Sanitize practiceWords for number mode
      if (parsedData && Array.isArray(parsedData.practiceWords)) {
        if (isNumberMode) {
          parsedData.practiceWords = parsedData.practiceWords
            .map((w: any) => String(w).trim().replace(/[^\d+\-*/=.]/g, ''))
            .filter((w: string) => w.length >= 1 && /\d/.test(w));
          if (parsedData.practiceWords.length < 20) {
            const fallbackNums = generateFallbackPracticeWords(effectiveMistakes, effectiveErrorKeys, 'numpad');
            for (const fn of fallbackNums) {
              if (parsedData.practiceWords.length >= 30) break;
              if (!parsedData.practiceWords.includes(fn)) {
                parsedData.practiceWords.push(fn);
              }
            }
          }
        }
      }

      if (!parsedData || !Array.isArray(parsedData.practiceWords) || parsedData.practiceWords.length === 0) {
        parsedData = {
          title: isNumberMode
            ? 'Bài Luyện Tập Tăng Cường Phản Xạ Bàn Phím Số'
            : 'Bài Luyện Tập Tăng Cường Phản Xạ Cụm Phím',
          overview: isNumberMode
            ? 'Hệ thống đã nhận diện các chữ số có tỷ lệ gõ nhầm cao nhất trong ván đấu chế độ Số vừa qua.'
            : 'Hệ thống đã nhận diện các điểm khựng và ký tự có tỷ lệ gõ sai cao trong các ván đấu vừa qua.',
          dominantErrorPattern: isNumberMode
            ? 'Trượt phím số xa & nhịp bấm Numpad'
            : 'Lỗi nhịp gõ & tổ hợp dấu thanh',
          keyWeaknesses: effectiveMistakes.slice(0, 3).map((m: any) => `${m.original || m.word} -> ${m.typed}`),
          targetClusters: effectiveErrorKeys.slice(0, 5).map((k: any) => (typeof k === 'string' ? k : k.key)),
          coachAdvice: isNumberMode
            ? 'Đặt ngón giữa lên phím 5 có gờ định vị, giảm nhẹ nhịp bứt tốc để tránh trượt sang các phím số liền kề.'
            : 'Giảm nhẹ 5% tốc độ để tạo cảm giác bấm phím chắc chắn trên từng phím dấu tiếng Việt.',
          practiceWords: generateFallbackPracticeWords(effectiveMistakes, effectiveErrorKeys, mode),
        };
      }

      res.json({
        success: true,
        analysis: {
          title: parsedData.title || (isNumberMode ? 'Bài Luyện Bàn Phím Số Cá Nhân Hóa (AI Coach)' : 'Bài Tập Luyện Cá Nhân Hóa (AI Coach)'),
          overview: parsedData.overview || '',
          dominantErrorPattern: parsedData.dominantErrorPattern || (isNumberMode ? 'Tổ hợp phím số tốc độ cao' : 'Tổ hợp phím tốc độ cao'),
          keyWeaknesses: parsedData.keyWeaknesses || [],
          targetClusters: parsedData.targetClusters || [],
          coachAdvice: parsedData.coachAdvice || '',
        },
        practiceWords: parsedData.practiceWords,
        isAiPowered: Boolean(textResponse),
      });
    } catch {
      const isNum = String(req.body?.mode || '').toLowerCase().includes('number') || String(req.body?.mode || '').toLowerCase().includes('numpad');
      res.json({
        success: true,
        analysis: {
          title: isNum ? 'Bài Tập Luyện Bàn Phím Số' : 'Bài Tập Khắc Phục Lỗi Sai Cá Nhân',
          overview: 'Tổng hợp danh sách các chuỗi ký tự và phím ghi nhận lỗi sai cao nhất trong lịch sử đấu của bạn.',
          dominantErrorPattern: isNum ? 'Trượt phím số & nhịp gõ' : 'Lỗi chính tả & nhịp bấm',
          keyWeaknesses: (req.body?.mistakes || []).slice(0, 3).map((m: any) => `${m.original || m.word}`),
          targetClusters: (req.body?.commonErrorKeys || []).slice(0, 4).map((k: any) => k.key),
          coachAdvice: isNum
            ? 'Cố định bàn tay trên cụm phím số và lấy phím 5 làm mốc cảm nhận vị trí.'
            : 'Thả lỏng cổ tay và quan sát kỹ từng từ trước khi gõ phím Space.',
        },
        practiceWords: generateFallbackPracticeWords(req.body?.mistakes, req.body?.commonErrorKeys, req.body?.mode),
        isAiPowered: false,
      });
    }
  });

  // POST /api/ai/heavenly-dao-analysis: AI Deep Analysis of Keystroke Error Patterns, Error Timing & Cultivation Progress vs Peers
  app.post('/api/ai/heavenly-dao-analysis', async (req, res) => {
    try {
      const {
        matches = [],
        cultivation = null,
        selectedMatch = null,
      } = req.body || {};

      const completed = matches.filter((m: any) => m.isCompleted !== false && m.result !== 'Đầu hàng');
      const count = Math.max(1, completed.length);

      const avgWpm = Math.round(completed.reduce((a: number, m: any) => a + (m.wpm || 0), 0) / count) || 60;
      const avgAcc = Math.round(completed.reduce((a: number, m: any) => a + (m.accuracy || 100), 0) / count) || 94;
      const avgConsistency = Math.round(completed.reduce((a: number, m: any) => a + (m.consistency || 80), 0) / count) || 82;
      const peakWpm = Math.max(...completed.map((m: any) => m.peakWpm || m.wpm || 0), Math.round(avgWpm * 1.15));

      // Determine realm & WPM bracket
      const realmName = cultivation?.realmName || (avgWpm >= 110 ? 'Hóa Thần Kỳ' : avgWpm >= 85 ? 'Nguyên Anh Kỳ' : avgWpm >= 65 ? 'Kết Đan Kỳ' : avgWpm >= 45 ? 'Trúc Cơ Kỳ' : 'Luyện Khí Kỳ');
      const tier = cultivation?.tier || 3;
      const subStage = cultivation?.subStage || 'Sơ Kỳ';

      // Aggregate mistakes and keystrokes
      const allMistakes: any[] = [];
      const errorKeysMap: Record<string, number> = {};
      let introErrors = 0;
      let accelErrors = 0;
      let sustainErrors = 0;
      let endgameErrors = 0;
      let totalErrors = 0;

      completed.forEach((m: any) => {
        if (Array.isArray(m.mistakes)) {
          m.mistakes.forEach((item: any) => allMistakes.push(item));
        }
        if (Array.isArray(m.commonErrorKeys)) {
          m.commonErrorKeys.forEach((k: any) => {
            const keyStr = typeof k === 'string' ? k : k.key;
            if (keyStr) errorKeysMap[keyStr] = (errorKeysMap[keyStr] || 0) + (k.count || 1);
          });
        }

        const dur = m.durationSeconds || 60;
        if (Array.isArray(m.keystrokes) && m.keystrokes.length > 0) {
          m.keystrokes.forEach((k: any) => {
            if (!k.isCorrect) {
              totalErrors++;
              const sec = k.timeMs / 1000;
              if (sec <= dur * 0.25) introErrors++;
              else if (sec <= dur * 0.55) accelErrors++;
              else if (sec <= dur * 0.8) sustainErrors++;
              else endgameErrors++;
            }
          });
        } else if (Array.isArray(m.chartData) && m.chartData.length > 0) {
          m.chartData.forEach((pt: any) => {
            const err = pt.errors || 0;
            if (err > 0) {
              totalErrors += err;
              if (pt.second <= dur * 0.25) introErrors += err;
              else if (pt.second <= dur * 0.55) accelErrors += err;
              else if (pt.second <= dur * 0.8) sustainErrors += err;
              else endgameErrors += err;
            }
          });
        } else {
          const err = m.incorrectWords || 2;
          totalErrors += err;
          introErrors += Math.round(err * 0.2);
          accelErrors += Math.round(err * 0.35);
          sustainErrors += Math.round(err * 0.2);
          endgameErrors += Math.max(0, err - Math.round(err * 0.75));
        }
      });

      const safeTotal = Math.max(1, totalErrors);

      const reqMode = String(req.body?.mode || '').toLowerCase();
      const matchSubMode = String(selectedMatch?.subMode || completed[0]?.subMode || '').toLowerCase();
      const matchDiff = String(selectedMatch?.difficulty || completed[0]?.difficulty || '').toLowerCase();
      const matchModeName = String(selectedMatch?.mode || completed[0]?.mode || '').toLowerCase();

      // Kiểm tra mẫu từ vựng thực tế trong mistakes hoặc promptWords
      const sampleCheckWords = [
        ...(Array.isArray(allMistakes) ? allMistakes : []),
        ...(Array.isArray(selectedMatch?.promptWords) ? selectedMatch.promptWords.slice(0, 15) : []),
        ...(Array.isArray(selectedMatch?.mistakes) ? selectedMatch.mistakes.slice(0, 10).map((m: any) => m?.original) : []),
      ]
        .map((w: any) => String(typeof w === 'string' ? w : w?.original || w?.word || '').trim())
        .filter(Boolean);

      const numCount = sampleCheckWords.filter((w) => /^[\d+\-*/=.]+$/.test(w)).length;
      const hasStrongNumberSignature = sampleCheckWords.length > 0 && numCount / sampleCheckWords.length >= 0.35;

      const isNumberMode =
        reqMode === 'numpad' ||
        reqMode === 'number' ||
        reqMode.includes('numpad') ||
        reqMode.includes('number') ||
        matchSubMode.includes('numpad') ||
        matchSubMode.includes('number') ||
        matchDiff === 'number' ||
        matchDiff === 'fullsize' ||
        matchModeName.includes('numpad') ||
        matchModeName.includes('số') ||
        hasStrongNumberSignature;

      const targetMode = isNumberMode
        ? 'numpad'
        : (req.body?.mode || selectedMatch?.modeId || selectedMatch?.mode || (completed[0]?.modeId) || (completed[0]?.mode) || 'vi_dau');

      // Clean mistakes and keys for number mode in Heavenly Dao analysis
      const effectiveDaoMistakes = isNumberMode
        ? allMistakes.filter((m: any) => {
            const s = String(m?.original || m?.word || '');
            return /[\d+\-*/=.]/.test(s) && !/[a-zA-Zà-ỹÀ-Ỹ]/.test(s);
          })
        : allMistakes;
      const effectiveDaoErrorKeys = isNumberMode
        ? Object.fromEntries(
            Object.entries(errorKeysMap).filter(([k]) => /[\d+\-*/=.]/.test(k) && !/[a-zA-Z]/.test(k))
          )
        : errorKeysMap;

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey || isGeminiProjectAccessDenied) {
        return res.json({
          success: true,
          isAiPowered: false,
          ...buildHeuristicDaoResponse({
            realmName,
            tier,
            subStage,
            avgWpm,
            peakWpm,
            avgAcc,
            avgConsistency,
            safeTotal,
            count,
            introErrors,
            accelErrors,
            sustainErrors,
            endgameErrors,
            allMistakes: effectiveDaoMistakes,
            errorKeysMap: effectiveDaoErrorKeys,
            mode: targetMode,
          }),
        });
      }

      // Initialize Gemini Client
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      const modeInstruction = isNumberMode
        ? `
*** ĐẶC BIỆT LƯU Ý CHO THIÊN ĐẠO: CHẾ ĐỘ BÀN PHÍM SỐ (NUMPAD/NUMBER) ***
- Người chơi đang thi đấu ở chế độ Bàn Phím Số / Number.
- Mẫu lỗi (errorPatterns) & Tâm ma (tamMaName) phải xoay quanh kỹ thuật bấm số (như Cửu Cung Thần Số Chướng, vươn ngón tay trượt phím 7/8/9, nhầm phím 0, định vị phím 5, đảo thứ tự chữ số...). TUYỆT ĐỐI KHÔNG đề cập lỗi dấu Telex hay tiếng Việt!
- Mảng "practiceWords" BẮT BUỘC LÀ CÁC CHUỖI SỐ (chữ số từ 0 đến 9, như "1024", "58008", "9876", "2026", "31415", "8520", "9630", "7410", "4040"...), TUYỆT ĐỐI KHÔNG ĐƯỢC CHỨA TỪ TIẾNG VIỆT CÓ DẤU!
`
        : '';

      const prompt = `Bạn là Tông Sư Phân Tích Thiên Đạo (Heavenly Dao Typing Master Coach) cho môn thể thao đánh máy tiếng Việt (FastTyping Challenge) kết hợp chủ đề Tu Tiên (Xianxia Cultivation).
Nhiệm vụ của bạn là: Phân tích toàn diện lịch sử đấu của người chơi, bóc tách các mẫu lỗi gõ phím (keystroke error patterns), thời điểm thường xuyên mắc lỗi trên trục thời gian ván đấu, và đưa ra biểu đồ so sánh tiến trình tu vi so với các người chơi có cùng trình độ WPM (đồng đạo cùng cảnh giới), giúp người chơi nhận diện rõ tâm ma / điểm yếu cần cải thiện để độ kiếp đột phá cảnh giới.
${modeInstruction}
Dữ liệu ván đấu thực tế của người chơi:
- Chế độ thi đấu: ${targetMode}
- Cảnh giới tu vi hiện tại: ${realmName} ${subStage} (Tầng ${tier})
- Tốc độ trung bình: ${avgWpm} WPM (Đỉnh: ${peakWpm} WPM) | Độ chính xác: ${avgAcc}% | Độ ổn định nhịp: ${avgConsistency}%
- Tổng số lỗi quan trắc được: ${safeTotal} lỗi
- Phân bố lỗi theo thời gian:
  + Khởi thức (0 - 15s): ${introErrors} lỗi (${Math.round((introErrors / safeTotal) * 100)}%)
  + Tăng tốc bứt phá (15 - 35s): ${accelErrors} lỗi (${Math.round((accelErrors / safeTotal) * 100)}%)
  + Bình ổn trung đoạn (35 - 50s): ${sustainErrors} lỗi (${Math.round((sustainErrors / safeTotal) * 100)}%)
  + Về đích (50 - 60s+): ${endgameErrors} lỗi (${Math.round((endgameErrors / safeTotal) * 100)}%)
- Các từ bị gõ sai nhiều nhất: ${JSON.stringify(effectiveDaoMistakes.slice(0, 12))}
- Các phím/cụm phím bị trượt nhiều nhất: ${JSON.stringify(Object.entries(effectiveDaoErrorKeys).slice(0, 8))}

Yêu cầu xuất ra ĐÚNG 1 ĐỐI TƯỢNG JSON (không bọc trong markdown codeblock nếu có thể, hoặc bọc trong \`\`\`json) với định dạng chính xác sau:
{
  "playerRealm": {
    "realmName": "${realmName}",
    "tier": ${tier},
    "subStage": "${subStage}",
    "currentWpm": ${avgWpm},
    "wpmBracket": "Phân khúc WPM của nhóm người chơi này (VD: Trúc Cơ Kỳ 55 - 75 WPM)"
  },
  "overallVerdict": {
    "title": "Tiêu đề phán quyết Thiên Đạo hùng tráng",
    "summary": "Đoạn văn ngắn 2-3 câu phân tích sâu sắc về trình độ hiện tại, ưu điểm và điểm nghẽn đạo tâm.",
    "tamMaName": "Tên tâm ma cản trở lớn nhất",
    "tamMaDescription": "Mô tả chi tiết nguyên nhân tâm lý và hành vi gõ phím sinh ra tâm ma này.",
    "overallPercentile": 75,
    "breakthroughReadiness": 80
  },
  "errorPatterns": [
    {
      "id": "pattern_1",
      "name": "Tên mẫu lỗi khoa học",
      "xianxiaTitle": "Tên tiên hiệp độc đáo",
      "frequency": 8,
      "percentage": 42,
      "description": "Mô tả cách thức lỗi xảy ra.",
      "biomechanics": "Nguyên lý cơ sinh học ngón tay gây ra lỗi này.",
      "examples": ["ví dụ 1", "ví dụ 2"],
      "severity": "high"
    }
  ],
  "timingAnalysis": {
    "phases": [
      {
        "phaseId": "intro",
        "name": "Khởi Thức (Nhập Cuộc)",
        "xianxiaPhase": "Sơ Khai Định Thần",
        "timeRange": "0s - 15s (25% đầu ván)",
        "errorCount": ${introErrors},
        "errorPercentage": ${Math.round((introErrors / safeTotal) * 100)},
        "description": "Nhận xét tình trạng ở giai đoạn khởi đầu.",
        "riskLevel": "thap"
      },
      {
        "phaseId": "acceleration",
        "name": "Tăng Tốc (Vận Khí)",
        "xianxiaPhase": "Cực Hạn Bứt Phá",
        "timeRange": "15s - 35s (Giai đoạn đẩy WPM)",
        "errorCount": ${accelErrors},
        "errorPercentage": ${Math.round((accelErrors / safeTotal) * 100)},
        "description": "Nhận xét tình trạng ở giai đoạn tăng tốc.",
        "riskLevel": "cao"
      },
      {
        "phaseId": "sustain",
        "name": "Bình Ổn (Trung Châu)",
        "xianxiaPhase": "Đạo Tâm Trì Trệ",
        "timeRange": "35s - 50s (Duy trì nhịp)",
        "errorCount": ${sustainErrors},
        "errorPercentage": ${Math.round((sustainErrors / safeTotal) * 100)},
        "description": "Nhận xét tình trạng ở giai đoạn duy trì.",
        "riskLevel": "trung_binh"
      },
      {
        "phaseId": "endgame",
        "name": "Về Đích (Tàn Kiếp)",
        "xianxiaPhase": "Linh Khí Khô Kiệt",
        "timeRange": "50s - 60s+ (Rút đích)",
        "errorCount": ${endgameErrors},
        "errorPercentage": ${Math.round((endgameErrors / safeTotal) * 100)},
        "description": "Nhận xét tình trạng ở giai đoạn về đích.",
        "riskLevel": "trung_binh"
      }
    ],
    "criticalMomentVerdict": "Nhận định sắc bén về pha thời gian gây tụt WPM nhiều nhất và cách khắc phục.",
    "avgRecoveryLatencyMs": 320,
    "peerAvgRecoveryMs": 380,
    "cascadeErrorRate": 20
  },
  "peerComparison": {
    "bracketName": "Tên nhóm so sánh",
    "description": "Mô tả nhóm so sánh đồng đạo cùng cảnh giới.",
    "metrics": [
      {
        "key": "speed",
        "label": "Tốc Độ Xuất Chiêu (WPM)",
        "xianxiaLabel": "Ngự Khí Thần Tốc",
        "unit": "WPM",
        "playerValue": ${avgWpm},
        "peerAverage": ${Math.round(avgWpm * 0.95)},
        "peerTop10": ${Math.round(avgWpm * 1.25)},
        "percentile": 75,
        "assessment": "Đánh giá chi tiết"
      }
    ]
  },
  "breakthroughPathway": {
    "step1": { "title": "Bước 1: Tiêu đề bước 1", "desc": "Chỉ dẫn hành động thực tế 1" },
    "step2": { "title": "Bước 2: Tiêu đề bước 2", "desc": "Chỉ dẫn hành động thực tế 2" },
    "step3": { "title": "Bước 3: Tiêu đề bước 3", "desc": "Chỉ dẫn hành động thực tế 3" }
  },
  "practiceWords": [
    // BẮT BUỘC chứa các từ bị gõ sai thực tế của người chơi (${effectiveDaoMistakes.slice(0, 8).map((m: any) => typeof m === 'string' ? m : m?.original || m?.word).filter(Boolean).join(', ') || (isNumberMode ? '1024, 58008' : 'nghiêng, chuyển')}) đan xen với các từ cùng cụm phím/âm tiết bị lỗi. Đủ 25 - 30 từ!
    ${isNumberMode ? '"1024", "58008", "9876", "2026", "31415", "8520"' : '"nghiêng", "khoảng", "chuyển"'}
  ]
}`;

      const textResponse = await callGeminiResilient(ai, prompt);
      let parsedData: any = null;
      if (textResponse) {
        try {
          const cleaned = textResponse.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
          parsedData = JSON.parse(cleaned);
        } catch {
          const match = textResponse.match(/\{[\s\S]*\}/);
          if (match) {
            try {
              parsedData = JSON.parse(match[0]);
            } catch {
              // fallback
            }
          }
        }
      }

      // Enforce number-only practice words when in number mode
      if (parsedData && Array.isArray(parsedData.practiceWords)) {
        if (isNumberMode) {
          parsedData.practiceWords = parsedData.practiceWords
            .map((w: any) => String(w).trim().replace(/[^\d+\-*/=.]/g, ''))
            .filter((w: string) => w.length >= 1 && /\d/.test(w));
          if (parsedData.practiceWords.length < 20) {
            const fallbackNums = generateFallbackPracticeWords(effectiveDaoMistakes, [], 'numpad');
            for (const fn of fallbackNums) {
              if (parsedData.practiceWords.length >= 30) break;
              if (!parsedData.practiceWords.includes(fn)) {
                parsedData.practiceWords.push(fn);
              }
            }
          }
        }
      }

      // Đảm bảo các từ sai thực tế của người chơi BẮT BUỘC xuất hiện trong practiceWords
      const actualMistakeList: string[] = effectiveDaoMistakes
        .map((m: any) => String(typeof m === 'string' ? m : m?.original || m?.word || '').trim())
        .filter(Boolean);

      if (parsedData && Array.isArray(parsedData.practiceWords)) {
        if (actualMistakeList.length > 0) {
          const missing = actualMistakeList.filter(
            (m) => !parsedData.practiceWords.some((w: string) => w.toLowerCase() === m.toLowerCase())
          );
          if (missing.length > 0) {
            parsedData.practiceWords = [
              ...missing,
              ...parsedData.practiceWords.filter((w: string) => !missing.includes(w)),
            ].slice(0, 30);
          }
        }
      }

      if (parsedData && parsedData.overallVerdict && Array.isArray(parsedData.errorPatterns)) {
        return res.json({
          success: true,
          isAiPowered: true,
          ...parsedData,
          targetedMistakes: actualMistakeList.slice(0, 10),
        });
      }

      // If AI model is temporarily experiencing high demand or unavailable, serve high-fidelity analytical fallback
      return res.json({
        success: true,
        isAiPowered: false,
        ...buildHeuristicDaoResponse({
          realmName,
          tier,
          subStage,
          avgWpm,
          peakWpm,
          avgAcc,
          avgConsistency,
          safeTotal,
          count,
          introErrors,
          accelErrors,
          sustainErrors,
          endgameErrors,
          allMistakes,
          errorKeysMap,
          mode: targetMode,
        }),
      });
    } catch {
      const fallbackMode = req.body?.selectedMatch?.modeId || req.body?.selectedMatch?.mode || 'vi_dau';
      return res.json({
        success: true,
        isAiPowered: false,
        ...buildHeuristicDaoResponse({
          realmName: 'Tu Sĩ FastTyping',
          tier: 3,
          subStage: 'Sơ Kỳ',
          avgWpm: 60,
          peakWpm: 70,
          avgAcc: 94,
          avgConsistency: 82,
          safeTotal: 10,
          count: 1,
          introErrors: 2,
          accelErrors: 5,
          sustainErrors: 2,
          endgameErrors: 1,
          allMistakes: [],
          errorKeysMap: {},
          mode: fallbackMode,
        }),
      });
    }
  });

  // POST /api/leaderboard/reset: Reset leaderboard to clean state (or single mode if provided)
  app.post('/api/leaderboard/reset', (req, res) => {
    const { mode } = req.body || {};
    if (mode && typeof mode === 'string') {
      serverHighScores[mode] = null;
    } else {
      serverHighScores = {
        vi_dau: null,
        vi_nodau: null,
        en: null,
        numpad: null,
        outplay: null,
        ngau_hung: null,
        doan_chu: null,
        san_boss: null,
      };
    }
    saveLeaderboardToFile();
    broadcastLeaderboard();
    res.json({ success: true, highScores: serverHighScores });
  });

  // GET /api/chat/stream: SSE real-time stream for global chat, presence, and leaderboard
  app.get('/api/chat/stream', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders?.();

    const tabId = req.query.tabId
      ? String(req.query.tabId).trim()
      : (req.query.userId ? String(req.query.userId).trim() : `tab_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`);
    const userId = req.query.userId
      ? String(req.query.userId).trim()
      : `guest_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

    const initialMeta = extractSessionMetaFromReq(req);
    registerPresence(tabId, userId, initialMeta);
    sseGlobalClients.set(res, tabId);
    sseGlobalChatClients.add(res);

    // Initial sync of chat messages, real online count, and leaderboard
    res.write(`data: ${JSON.stringify({ type: 'init_chat', messages: globalChatMessages })}\n\n`);
    res.write(`data: ${JSON.stringify({ type: 'online_count', count: getRealOnlineCount() })}\n\n`);
    res.write(`data: ${JSON.stringify({ type: 'leaderboard_updated', highScores: serverHighScores })}\n\n`);

    // Broadcast presence update to all connected users
    broadcastOnlinePresence();

    let isCleanedUp = false;
    const cleanup = () => {
      if (isCleanedUp) return;
      isCleanedUp = true;
      clearInterval(heartbeat);
      sseGlobalChatClients.delete(res);
      sseGlobalClients.delete(res);
      removePresence(tabId);
      broadcastOnlinePresence();
    };

    const heartbeat = setInterval(() => {
      try {
        res.write(': heartbeat\n\n');
      } catch {
        cleanup();
      }
    }, 6000);

    req.on('close', cleanup);
    req.on('end', cleanup);
    res.on('close', cleanup);
    res.on('finish', cleanup);
    res.on('error', cleanup);
  });

  // POST /api/chat/clear: Clear global chat (admin action)
  app.post('/api/chat/clear', (_req, res) => {
    globalChatMessages.length = 0;
    broadcastGlobalChatClear();
    res.json({ success: true });
  });

  const httpServer = http.createServer(app);

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: { server: httpServer },
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
