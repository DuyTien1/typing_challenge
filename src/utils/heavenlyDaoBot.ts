import { ChatMessage, HeavenlyDaoDecree, HeavenlyDaoEventType } from '../types';
import { sendChatMessage } from './roomManager';

export interface DaoBotPersona {
  id: string;
  name: string;
  title: string;
  avatar: string;
  frame: string;
  style: string;
  selfPronoun: string;
}

export const DAO_BOT_PERSONAS: Record<string, DaoBotPersona> = {
  huyen_thien: {
    id: 'huyen_thien',
    name: 'Huyền Thiên Khí Linh',
    title: 'Thiên Đạo Chấp Pháp Sứ',
    avatar: '☯️',
    frame: 'admin_gold',
    style: 'Nghiêm minh, thấu thị càn khôn, nói lời sấm truyền, bảo hộ quy củ giới gõ phím',
    selfPronoun: 'Bản Tòa',
  },
  linh_lung: {
    id: 'linh_lung',
    name: 'Linh Lung Tiên Đồng',
    title: 'Chưởng Quản Phong Thần Bảng',
    avatar: '🪷',
    frame: 'arcane_purple',
    style: 'Hoạt bát, tinh nghịch, thích bình phẩm các trận đấu đỉnh cao, hay trêu đùa kẻ gõ sai',
    selfPronoun: 'Tiên Đồng',
  },
  ban_co: {
    id: 'ban_co',
    name: 'Bàn Cổ Thần Thức',
    title: 'Giám Giới Thần Quân',
    avatar: '⚡',
    frame: 'dragon_dark_blood',
    style: 'Uy nghiêm, trầm mặc, chỉ xuất hiện khi có đại sự',
    selfPronoun: 'Bản Tôn',
  },
};

export const DAO_BOT_NAME = DAO_BOT_PERSONAS.huyen_thien.name;
export const DAO_BOT_TITLE = DAO_BOT_PERSONAS.huyen_thien.title;
export const DAO_BOT_AVATAR = DAO_BOT_PERSONAS.huyen_thien.avatar;
export const DAO_BOT_FRAME = DAO_BOT_PERSONAS.huyen_thien.frame;

const DECREES_STORAGE_KEY = 'fasttyping_heavenly_decrees_v1';
const DECREES_EVENT_NAME = 'fasttyping_heavenly_decree';

// In-memory cache of recent decrees
let cachedDecrees: HeavenlyDaoDecree[] = [];

// Seed default initial decrees
const DEFAULT_INITIAL_DECREES: HeavenlyDaoDecree[] = [
  {
    id: 'decree-init-1',
    title: 'THIÊN ĐẠO QUY CỦ',
    eventType: 'announcement',
    targetUser: 'Toàn Thể Tu Sĩ',
    content:
      'Huyền Thiên Khí Linh chính thức xuất quan giám giới! Mọi tà thuật gian lận (Auto, Macro, Paste) ắt chịu Cửu Trọng Thiên Lôi. Tu sĩ kiên trì khổ luyện sẽ được Thiên Đạo ban thưởng Đạo Hạnh vĩnh cửu.',
    timestamp: Date.now() - 3600000,
    highlightText: 'Huyền Thiên Khí Linh xuất quan',
  },
  {
    id: 'decree-init-2',
    title: 'THIÊN CƠ CHỈ ĐIỂM',
    eventType: 'guidance',
    targetUser: 'Chư Vị Đạo Hữu',
    content:
      'Ngón tay như ngọc kiếm, căng quá ắt gãy! Khí Linh nhắc nhở chư vị đạo hữu sau 5 ván thi đấu hãy buông lỏng cổ tay, nhấp ngụm tiên trà dưỡng thần để tránh tích tụ tâm ma.',
    timestamp: Date.now() - 1800000,
    highlightText: 'Tâm pháp gõ phím',
  },
];

/**
 * Load decrees from localStorage or return default
 */
export function getStoredDaoDecrees(): HeavenlyDaoDecree[] {
  if (cachedDecrees.length > 0) return cachedDecrees;
  try {
    const raw = localStorage.getItem(DECREES_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        cachedDecrees = parsed.slice(0, 50);
        return cachedDecrees;
      }
    }
  } catch {
    // fallback
  }
  cachedDecrees = [...DEFAULT_INITIAL_DECREES];
  return cachedDecrees;
}

/**
 * Save decree to local cache and trigger event
 */
export function saveDaoDecree(decree: HeavenlyDaoDecree) {
  const list = getStoredDaoDecrees();
  const next = [decree, ...list.filter((d) => d.id !== decree.id)].slice(0, 50);
  cachedDecrees = next;
  try {
    localStorage.setItem(DECREES_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // ignore
  }

  // Dispatch global window event for reactive UI updates asynchronously so it never triggers during React render
  if (typeof window !== 'undefined') {
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent(DECREES_EVENT_NAME, { detail: decree }));
    }, 0);
  }
}

/**
 * Subscribe to new Heavenly Dao Decrees
 */
export function subscribeToDaoDecrees(callback: (decree: HeavenlyDaoDecree) => void): () => void {
  const handler = (event: Event) => {
    const customEv = event as CustomEvent<HeavenlyDaoDecree>;
    if (customEv && customEv.detail) {
      callback(customEv.detail);
    }
  };
  window.addEventListener(DECREES_EVENT_NAME, handler);
  return () => {
    window.removeEventListener(DECREES_EVENT_NAME, handler);
  };
}

/**
 * Broadcast a new celestial decree across the server via Global Chat and local UI
 */
export async function broadcastDaoDecree(params: {
  title: string;
  eventType: HeavenlyDaoEventType;
  targetUser?: string;
  content: string;
  highlightText?: string;
  wpm?: number;
  accuracy?: number;
  realmName?: string;
  personaId?: string;
  generateAiPoem?: boolean;
}): Promise<HeavenlyDaoDecree> {
  const id = `decree-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const persona = (params.personaId && DAO_BOT_PERSONAS[params.personaId]) || DAO_BOT_PERSONAS.huyen_thien;

  const decree: HeavenlyDaoDecree = {
    id,
    title: params.title,
    eventType: params.eventType,
    targetUser: params.targetUser,
    content: params.content,
    timestamp: Date.now(),
    highlightText: params.highlightText,
    wpm: params.wpm,
    accuracy: params.accuracy,
    realmName: params.realmName,
    personaId: persona.id,
    personaName: persona.name,
    personaAvatar: persona.avatar,
  };

  saveDaoDecree(decree);

  // Sync to server dao decree endpoint
  try {
    fetch('/api/dao/decree', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...params,
        personaId: persona.id,
        generateAiPoem: params.generateAiPoem ?? (params.eventType === 'record' || params.eventType === 'breakthrough'),
      }),
    }).catch(() => {});
  } catch {
    // ignore
  }

  // Send message to global chat as Dao Bot
  const fullChatMessage = `[${decree.title}] ${decree.content}`;
  await sendChatMessage({
    id,
    username: persona.name,
    avatar: persona.avatar,
    frame: persona.frame,
    message: fullChatMessage,
    channel: 'global',
    isAdmin: true,
    isDaoBot: true,
    daoEventType: decree.eventType,
    daoTitle: decree.title,
  });

  return decree;
}

// =========================================================================
// SPECIFIC DAO BOT ACTIONS
// =========================================================================

/**
 * ⚡ 1. Thiên Lôi Phạt Tội (Bàn Cổ Thần Thức - Giám Giới Thần Quân trừng phạt vi phạm & cấm đấu 2 giờ)
 */
export async function announcePenalty(
  username: string,
  reason: string,
  penaltyDetail = 'Phế trừ 500 Tu Vi, tịch thu Đan Dược và đày vào U Minh Hàn Ngục (Cấm thi đấu 2 giờ) để tự hối lỗi!'
): Promise<HeavenlyDaoDecree> {
  const content = `Bàn Cổ Khí Tức chấn động! Nghịch đồ @${username} dám thi triển tà thuật 'Hư Không Thâu Phím' (${reason}) làm vấy bẩn Đạo Cơ! Bàn Cổ Thần Thức hạ lệnh giáng cửu trọng thiên lôi: ${penaltyDetail}`;

  return broadcastDaoDecree({
    title: 'BÀN CỔ TRỪNG PHẠT',
    eventType: 'penalty',
    targetUser: username,
    content,
    highlightText: `Bàn Cổ phạt ${username} (2 giờ)`,
    personaId: 'ban_co',
  });
}

/**
 * 🌟 2. Đột Phá Cảnh Giới & Độ Kiếp (Cultivation Breakthrough)
 */
export async function announceBreakthrough(
  username: string,
  realmName: string,
  subStage: string,
  tier: number
): Promise<HeavenlyDaoDecree> {
  const content = `Đạo khí ngút trời! Chúc mừng đạo hữu @${username} vừa vượt qua Tâm Ma Hỏa Kiếp, chính thức đột phá [${realmName.toUpperCase()} KỲ ĐỆ BÁT TẦNG - ${subStage}]! Tốc độ xuất chiêu đã đạt cảnh giới lô hỏa thuần thanh, danh chấn bát phương!`;

  return broadcastDaoDecree({
    title: 'THIÊN ĐỊA DỊ TƯỢNG',
    eventType: 'breakthrough',
    targetUser: username,
    realmName,
    content,
    highlightText: `${username} đột phá ${realmName}`,
    personaId: 'ban_co',
    generateAiPoem: true,
  });
}

/**
 * 👑 3. Kim Bảng Đề Danh / Thiên Bảng Đăng Đỉnh (High WPM Record / Top 1 Leaderboard)
 */
export async function announceRecord(
  username: string,
  wpm: number,
  accuracy: number,
  modeName: string,
  isTop1 = false
): Promise<HeavenlyDaoDecree> {
  const title = isTop1 ? 'THIÊN BẢNG ĐĂNG ĐỈNH' : 'KIM BẢNG ĐỀ DANH';
  const content = isTop1
    ? `Kiếm khí tung hoành tam thiên lý! Đạo hữu @${username} vừa xuất chiêu thần tốc đạt ${wpm} WPM (${accuracy}% Chuẩn Xác) tại chế độ ${modeName}, chính thức soán ngôi Đệ Nhất Kiếm Tôn trên Thiên Bảng!`
    : `Kiếm khí kinh thế hãi tục! Đạo hữu @${username} vừa xuất chiêu thần tốc đạt ${wpm} WPM (${accuracy}% Chuẩn Xác) tại chế độ ${modeName}, chính thức ghi danh Bảng Vàng!`;

  return broadcastDaoDecree({
    title,
    eventType: 'record',
    targetUser: username,
    wpm,
    accuracy,
    content,
    highlightText: `${username} đạt ${wpm} WPM`,
    personaId: isTop1 ? 'ban_co' : 'linh_lung',
    generateAiPoem: true,
  });
}

/**
 * 🐉 4. Ma Thần Quỵ Phục (Boss Defeated)
 */
export async function announceBossKill(
  slayerName: string,
  bossName = 'Hắc Long Ma Vương',
  damageDealt = 1850
): Promise<HeavenlyDaoDecree> {
  const content = `${bossName} gầm thét tan biến! Đại đạo hữu @${slayerName} đã tung nhát kiếm chí mạng kết liễu Ma Đầu (Gây ${damageDealt.toLocaleString()} sát thương). Toàn thể tu sĩ tham chiến được Thiên Đạo ban thưởng Đạo Hạnh phong phú!`;

  return broadcastDaoDecree({
    title: 'MA THẦN QUỴ PHỤC',
    eventType: 'boss_kill',
    targetUser: slayerName,
    content,
    highlightText: `Diệt ${bossName}`,
    personaId: 'ban_co',
    generateAiPoem: true,
  });
}

/**
 * 🧘 5. Thiên Cơ Chỉ Điểm (Periodic AI Wisdom & Guidance)
 */
export async function announceGuidance(customTip?: string): Promise<HeavenlyDaoDecree> {
  const wisdomPool = [
    'Ngón tay như ngọc kiếm, căng quá ắt gãy! Khí Linh nhắc nhở chư vị đạo hữu sau 5 ván thi đấu hãy buông lỏng cổ tay, nhấp ngụm tiên trà dưỡng thần để tránh tích tụ tâm ma.',
    'Dục tốc bất đạt, vạn pháp quy tâm. Giữ độ chính xác trên 96% sẽ giúp hình thành trí nhớ cơ bắp vững như bàn thạch.',
    'Lấy phím số 5 (có gờ) làm tâm định vị khi bấm Numpad, các ngón tay sẽ tự khắc vươn tới đúng phím mà không cần cúi đầu nhìn bàn phím.',
    'Khi gặp chuỗi nguyên âm dài (uyên, oang), hãy dùng lực xoay nhẹ của cổ tay thay vì gồng cứng cơ ngón út.',
    'Buông phím trước khi gõ phím kế tiếp để tránh nghẽn bộ đệm gõ Telex, dòng chảy WPM sẽ tự nhiên tuôn trào như thác lũ.',
  ];
  const tip = customTip || wisdomPool[Math.floor(Math.random() * wisdomPool.length)];

  return broadcastDaoDecree({
    title: 'THIÊN CƠ CHỈ ĐIỂM',
    eventType: 'guidance',
    content: tip,
    highlightText: 'Lời khuyên Khí Linh',
    personaId: 'linh_lung',
  });
}

/**
 * 🪷 6. Linh Lung Hoan Hô & Cổ Vũ Trận Đấu (Lively match cheer by Linh Lung Tiên Đồng)
 */
export async function announceLinhLungCheer(
  username: string,
  wpm: number,
  accuracy: number,
  modeName: string
): Promise<HeavenlyDaoDecree> {
  const cheers = [
    `Oa oa! Đạo hữu @${username} vừa xuất chiêu đẹp mắt tuyệt trần tại ${modeName}! Đạt ${wpm} WPM cùng ${accuracy}% chuẩn xác, kiếm khí tung hoành tựa tiên hạc lướt mây! 🪷`,
    `Hoan hô đạo hữu @${username}! Tốc độ ${wpm} WPM tại ${modeName} mượt mà như dòng suối tiên! Tiên Đồng nhìn mà mê tít mắt, các đạo hữu khác mau mau học hỏi nha! ✨`,
    `Kiếm pháp xuất thần! @${username} vừa hoàn thành ván đấu ${modeName} với phong độ đỉnh cao ${wpm} WPM (${accuracy}% chính xác)! Bảng Vàng lại sắp sửa đón thêm một bậc kỳ tài rồi nè! 🎉`,
    `Chuẩn xác tuyệt luân! @${username} xuất chiêu tại ${modeName} không hề gợn một nét ngập ngừng, đạt trọn vẹn ${wpm} WPM! Tiên Đồng tặng đạo hữu một đóa hoa sen tím cát tường! 🪷`,
  ];
  const content = cheers[Math.floor(Math.random() * cheers.length)];

  return broadcastDaoDecree({
    title: 'LINH LUNG HOAN HÔ',
    eventType: 'guidance',
    targetUser: username,
    wpm,
    accuracy,
    content,
    highlightText: `Linh Lung khen ngợi ${username}`,
    personaId: 'linh_lung',
    generateAiPoem: false,
  });
}

/**
 * 🪷 7. Linh Lung Bình Phẩm & Động Viên (Witty commentary & tips by Linh Lung Tiên Đồng)
 */
export async function announceLinhLungCommentary(params: {
  username: string;
  wpm: number;
  accuracy: number;
  modeName: string;
  errors?: number;
}): Promise<HeavenlyDaoDecree> {
  let content = '';
  const { username, wpm, accuracy, modeName, errors = 0 } = params;

  if (accuracy === 100) {
    content = `Tuyệt phẩm vô khuyết! @${username} gõ ${modeName} không sai một ly (${accuracy}% chuẩn xác, ${wpm} WPM)! Đạo tâm vững như bàn thạch, Tiên Đồng khâm phục vô cùng! 🪷✨`;
  } else if (errors > 8) {
    content = `Ái chà chà! Đạo hữu @${username} thi triển chiêu thức tại ${modeName} hăng hái quá nên ngón tay hơi vấp ${errors} lần rồi kìa! Đừng vội nản lòng, buông lỏng cổ tay uống ngụm tiên trà rồi vào ván mới phục thù nha! 🍵🪷`;
  } else if (wpm >= 90) {
    content = `Gió cuốn mây tan! @${username} lướt phím tại ${modeName} đạt tận ${wpm} WPM! Tốc độ này làm mặt gương Phong Thần Bảng sáng rực lên rồi kìa! ⚡🪷`;
  } else {
    content = `Trận đấu ${modeName} rất có khí thế! @${username} đạt ${wpm} WPM (${accuracy}%). Tiên Đồng mách nhỏ: cứ giữ nhịp thở đều thì ván sau chắc chắn sẽ bứt phá thêm 10 WPM nữa đó! 🪷`;
  }

  return broadcastDaoDecree({
    title: 'LINH LUNG BÌNH PHẨM',
    eventType: 'guidance',
    targetUser: username,
    wpm,
    accuracy,
    content,
    highlightText: `Linh Lung bình phẩm ${username}`,
    personaId: 'linh_lung',
    generateAiPoem: false,
  });
}


