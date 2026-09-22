export interface MonkeyTheme {
  id: string;
  name: string;
  category: 'dark' | 'light' | 'colorful' | 'special';
  bg: string;
  cardBg: string;
  main: string;    // Màu accent, caret, chữ gõ đúng
  sub: string;     // Màu chữ chờ gõ, phụ chú
  text: string;    // Màu văn bản chính
  error: string;   // Màu gõ sai
  border: string;  // Màu viền
  desc: string;
}

export interface TypingFont {
  id: string;
  name: string;
  family: string;
  type: 'monospace' | 'sans';
  desc: string;
  sample: string;
}

export const MONKEY_THEMES: MonkeyTheme[] = [
  {
    id: 'serika_dark',
    name: 'Serika Dark',
    category: 'dark',
    bg: '#323437',
    cardBg: '#2c2e31',
    main: '#e2b714',
    sub: '#646669',
    text: '#d1d0c5',
    error: '#ca4754',
    border: '#45484c',
    desc: 'Theme huyền thoại mang tính biểu tượng số 1 của Monkeytype.',
  },
  {
    id: 'carbon',
    name: 'Carbon',
    category: 'dark',
    bg: '#313131',
    cardBg: '#282828',
    main: '#f66e0d',
    sub: '#616161',
    text: '#f5e6c8',
    error: '#e24747',
    border: '#444444',
    desc: 'Phối màu cam carbon công nghiệp sắc sảo và hiện đại.',
  },
  {
    id: 'dracula',
    name: 'Dracula',
    category: 'dark',
    bg: '#282a36',
    cardBg: '#21222c',
    main: '#bd93f9',
    sub: '#6272a4',
    text: '#f8f8f2',
    error: '#ff5555',
    border: '#44475a',
    desc: 'Tông tím ma cà rồng quyến rũ được các lập trình viên yêu thích.',
  },
  {
    id: 'nord',
    name: 'Nord',
    category: 'dark',
    bg: '#2e3440',
    cardBg: '#242933',
    main: '#88c0d0',
    sub: '#4c566a',
    text: '#d8dee9',
    error: '#bf616a',
    border: '#3b4252',
    desc: 'Sắc lam băng tuyết Bắc Âu thanh lịch, êm dịu cho đôi mắt.',
  },
  {
    id: 'botanical',
    name: 'Botanical',
    category: 'colorful',
    bg: '#7b9c98',
    cardBg: '#66827f',
    main: '#f5f7f7',
    sub: '#495e5b',
    text: '#ffffff',
    error: '#c95f5f',
    border: '#566e6b',
    desc: 'Lấy cảm hứng từ thực vật thảo mộc rừng ôn đới dịu lành.',
  },
  {
    id: 'cyberpunk',
    name: 'Cyberpunk',
    category: 'colorful',
    bg: '#000b1e',
    cardBg: '#051329',
    main: '#00ff9f',
    sub: '#005f73',
    text: '#00b8ff',
    error: '#ff0055',
    border: '#00ffff44',
    desc: 'Ánh đèn neon xanh ngọc & hồng rực rỡ thành phố tương lai.',
  },
  {
    id: 'matrix',
    name: 'Matrix',
    category: 'dark',
    bg: '#000000',
    cardBg: '#080d08',
    main: '#15ff00',
    sub: '#006600',
    text: '#d1ffd0',
    error: '#ff2200',
    border: '#003300',
    desc: 'Dòng mã nguồn rơi màu xanh lá kinh điển của Ma Trận.',
  },
  {
    id: 'monokai',
    name: 'Monokai',
    category: 'dark',
    bg: '#272822',
    cardBg: '#1e1f1c',
    main: '#a6e22e',
    sub: '#75715e',
    text: '#f8f8f2',
    error: '#f92672',
    border: '#3e3d32',
    desc: 'Bảng màu code huyền thoại từ Sublime Text và VSCode.',
  },
  {
    id: 'bento',
    name: 'Bento',
    category: 'dark',
    bg: '#2d394d',
    cardBg: '#232d3d',
    main: '#ff7a90',
    sub: '#4a5b78',
    text: '#fffaf8',
    error: '#ee2a44',
    border: '#3d4d68',
    desc: 'Tông màu hộp cơm Bento Nhật Bản ấm cúng và tinh tế.',
  },
  {
    id: 'gruvbox_dark',
    name: 'Gruvbox Dark',
    category: 'dark',
    bg: '#282828',
    cardBg: '#1d2021',
    main: '#fabd2f',
    sub: '#665c54',
    text: '#ebdbb2',
    error: '#fb4934',
    border: '#3c3836',
    desc: 'Màu vàng hoàng hôn pha nâu đất ấm áp phong cách cổ điển.',
  },
  {
    id: 'catppuccin_mocha',
    name: 'Catppuccin Mocha',
    category: 'dark',
    bg: '#1e1e2e',
    cardBg: '#181825',
    main: '#cba6f7',
    sub: '#6c7086',
    text: '#cdd6f4',
    error: '#f38ba8',
    border: '#313244',
    desc: 'Bộ màu pastel mượt mà đang dẫn đầu xu hướng thế giới.',
  },
  {
    id: 'taro',
    name: 'Taro',
    category: 'dark',
    bg: '#130f1a',
    cardBg: '#1a1524',
    main: '#b388ff',
    sub: '#554466',
    text: '#ede7f6',
    error: '#ff5252',
    border: '#2e253e',
    desc: 'Màu tím khoai môn thơm ngọt kết hợp hiệu ứng neon huyền ảo.',
  },
  {
    id: 'lavender',
    name: 'Lavender',
    category: 'colorful',
    bg: '#22223b',
    cardBg: '#1a1a2e',
    main: '#c9ada7',
    sub: '#4a4e69',
    text: '#f2e9e4',
    error: '#e63946',
    border: '#353554',
    desc: 'Hương hoa oải hương dịu nhẹ mang lại cảm giác thư thái.',
  },
  {
    id: 'midnight',
    name: 'Midnight',
    category: 'dark',
    bg: '#0b0e14',
    cardBg: '#10141d',
    main: '#59c2ff',
    sub: '#3e4b59',
    text: '#bfbab0',
    error: '#ff3333',
    border: '#1d2433',
    desc: 'Đêm khuya tĩnh mịch với ánh trăng xanh chiếu rọi.',
  },
  {
    id: 'laser',
    name: 'Laser',
    category: 'colorful',
    bg: '#221b44',
    cardBg: '#191333',
    main: '#00e8c6',
    sub: '#b8235a',
    text: '#dbeaff',
    error: '#ff0055',
    border: '#3d2e70',
    desc: 'Hơi thở Synthwave thập niên 80 với tia laser ngọc lam rực rỡ.',
  },
  {
    id: 'retro',
    name: 'Retro Paper',
    category: 'light',
    bg: '#dad3b8',
    cardBg: '#cfc6a8',
    main: '#925c40',
    sub: '#8a7e6b',
    text: '#222222',
    error: '#a83232',
    border: '#b8ad8f',
    desc: 'Trang giấy ố vàng cổ điển của những cỗ máy đánh chữ thập niên 70.',
  },
  {
    id: 'sunset',
    name: 'Sunset Glow',
    category: 'colorful',
    bg: '#1d192b',
    cardBg: '#161321',
    main: '#ff6e6c',
    sub: '#5b4b6b',
    text: '#ffe3e3',
    error: '#ff3b30',
    border: '#372d4d',
    desc: 'Ánh hoàng hôn đỏ tía huyền ảo buông xuống đường chân trời.',
  },
  {
    id: 'emerald',
    name: 'Emerald Forest',
    category: 'dark',
    bg: '#061a14',
    cardBg: '#09241c',
    main: '#10b981',
    sub: '#1e3a2f',
    text: '#a7f3d0',
    error: '#ef4444',
    border: '#134e3f',
    desc: 'Viên ngọc lục bảo phát sáng giữa khu rừng rậm nguyên sinh.',
  },
  {
    id: 'crimson',
    name: 'Crimson Blood',
    category: 'dark',
    bg: '#180909',
    cardBg: '#240d0d',
    main: '#ef4444',
    sub: '#581c1c',
    text: '#fee2e2',
    error: '#dc2626',
    border: '#451a1a',
    desc: 'Huyết thạch đỏ rực kiên cường dành cho những chiến binh tốc độ.',
  },
  {
    id: 'default_fasttyping',
    name: 'FastTyping Gold (Mặc Định)',
    category: 'dark',
    bg: '#0f1117',
    cardBg: '#131926',
    main: '#fbbf24',
    sub: '#475569',
    text: '#f1f5f9',
    error: '#f43f5e',
    border: '#1e293b',
    desc: 'Giao diện bóng đêm vàng kim chuẩn mực của đấu trường FastTyping.',
  },
  // === CÁC THEME NỀN TRẮNG TINH KHÔI & SÁNG (LIGHT THEMES) ===
  {
    id: 'paper_white',
    name: 'Paper White (Trắng Tinh Khôi)',
    category: 'light',
    bg: '#ffffff',
    cardBg: '#f8fafc',
    main: '#2563eb',
    sub: '#94a3b8',
    text: '#0f172a',
    error: '#ef4444',
    border: '#cbd5e1',
    desc: 'Nền trắng 100% tinh khiết với điểm nhấn xanh hoàng gia, tương phản tuyệt hảo và sắc nét.',
  },
  {
    id: 'milkshake',
    name: 'Milkshake (Trắng Kem Sữa)',
    category: 'light',
    bg: '#ffffff',
    cardBg: '#f5f8fc',
    main: '#212b43',
    sub: '#8f9ca8',
    text: '#1e293b',
    error: '#ef4444',
    border: '#e2e8f0',
    desc: 'Theme nền trắng tinh khôi kết hợp màu xanh hải quân trang nhã kinh điển của Monkeytype.',
  },
  {
    id: 'serika_light',
    name: 'Serika Light (Trắng Hoàng Kim)',
    category: 'light',
    bg: '#ffffff',
    cardBg: '#fafaf9',
    main: '#d97706',
    sub: '#a8a29e',
    text: '#292524',
    error: '#dc2626',
    border: '#e7e5e4',
    desc: 'Phiên bản nền trắng sáng của tượng đài Serika, điểm xuyết ánh vàng kim vương giả.',
  },
  {
    id: 'sakura_light',
    name: 'Sakura White (Trắng Hoa Anh Đào)',
    category: 'light',
    bg: '#ffffff',
    cardBg: '#fff1f2',
    main: '#e11d48',
    sub: '#fb7185',
    text: '#4c0519',
    error: '#be123c',
    border: '#fecdd3',
    desc: 'Nền trắng tinh khiết phối sắc hồng cánh hoa anh đào nở rộ thanh thoát và dịu dàng.',
  },
  {
    id: 'matcha_latte',
    name: 'Matcha Milk (Trắng Trà Xanh)',
    category: 'light',
    bg: '#fbfdfa',
    cardBg: '#f0fdf4',
    main: '#16a34a',
    sub: '#86efac',
    text: '#14532d',
    error: '#dc2626',
    border: '#bbf7d0',
    desc: 'Nền trắng thanh nhã kết hợp sắc trà xanh Matcha dịu mắt, xoa dịu mỏi mắt khi gõ lâu.',
  },
  {
    id: 'nord_light',
    name: 'Nord Frost (Trắng Băng Tuyết)',
    category: 'light',
    bg: '#ffffff',
    cardBg: '#f1f5f9',
    main: '#0284c7',
    sub: '#94a3b8',
    text: '#1e293b',
    error: '#e11d48',
    border: '#cbd5e1',
    desc: 'Sắc trắng tinh khôi của băng tuyết Bắc Cực với điểm nhấn xanh lam mát mẻ sảng khoái.',
  },
  {
    id: 'catppuccin_latte',
    name: 'Catppuccin Latte (Trắng Pastel)',
    category: 'light',
    bg: '#ffffff',
    cardBg: '#f8fafc',
    main: '#7c3aed',
    sub: '#94a3b8',
    text: '#334155',
    error: '#e11d48',
    border: '#e2e8f0',
    desc: 'Bộ màu pastel trắng sữa êm dịu dẫn đầu xu hướng thế giới của hệ sinh thái Catppuccin.',
  },
  {
    id: 'minimal_mono',
    name: 'Minimal Mono (Trắng Đen Tối Giản)',
    category: 'light',
    bg: '#ffffff',
    cardBg: '#f9fafb',
    main: '#0f172a',
    sub: '#9ca3af',
    text: '#0f172a',
    error: '#dc2626',
    border: '#e5e7eb',
    desc: 'Phong cách Monochrome tối giản tuyệt đối: nền trắng 100%, chữ đen tuyền tương phản sắc nét.',
  },
  {
    id: 'citrus_light',
    name: 'Citrus Light (Trắng Nắng Mai)',
    category: 'light',
    bg: '#ffffff',
    cardBg: '#fffbeb',
    main: '#ea580c',
    sub: '#fbbf24',
    text: '#451a03',
    error: '#dc2626',
    border: '#fde68a',
    desc: 'Nền trắng rạng rỡ hòa cùng sắc cam nắng mai ấm áp bừng sáng năng lượng phím gõ.',
  },
  {
    id: 'lavender_mist',
    name: 'Lavender Mist (Trắng Oải Hương)',
    category: 'light',
    bg: '#fdfcff',
    cardBg: '#f5f3ff',
    main: '#8b5cf6',
    sub: '#c4b5fd',
    text: '#2e1065',
    error: '#e11d48',
    border: '#ddd6fe',
    desc: 'Nền trắng vương sắc tím sương hoa oải hương thơ mộng, tao nhã và thanh bình.',
  },
];

export const TYPING_FONTS: TypingFont[] = [
  {
    id: 'jetbrains_mono',
    name: 'JetBrains Mono',
    family: "'JetBrains Mono', monospace",
    type: 'monospace',
    desc: 'Font monospace số 1 thế giới được các lập trình viên tin dùng',
    sample: 'const speed = 150; // WPM FastTyping',
  },
  {
    id: 'fira_code',
    name: 'Fira Code',
    family: "'Fira Code', monospace",
    type: 'monospace',
    desc: 'Font lập trình kinh điển với các ký tự ligatures liền mạch',
    sample: 'fn speed() -> bool { return true; }',
  },
  {
    id: 'roboto_mono',
    name: 'Roboto Mono',
    family: "'Roboto Mono', monospace",
    type: 'monospace',
    desc: 'Font mặc định nổi tiếng của Monkeytype, dễ đọc và cân bằng',
    sample: 'The quick brown fox jumps over dog',
  },
  {
    id: 'source_code_pro',
    name: 'Source Code Pro',
    family: "'Source Code Pro', monospace",
    type: 'monospace',
    desc: 'Kiệt tác đơn khoảng chuẩn mực từ Adobe Systems',
    sample: 'Adobe design for clean terminal typing',
  },
  {
    id: 'inconsolata',
    name: 'Inconsolata',
    family: "'Inconsolata', monospace",
    type: 'monospace',
    desc: 'Độ thanh mảnh tinh tế, tối ưu cho bài gõ văn bản dài',
    sample: 'Inconsolata provides clean readability',
  },
  {
    id: 'space_mono',
    name: 'Space Mono',
    family: "'Space Mono', monospace",
    type: 'monospace',
    desc: 'Hình học viễn tưởng ấn tượng mang đậm chất không gian',
    sample: 'NASA Apollo space telemetry 1969',
  },
  {
    id: 'ubuntu_mono',
    name: 'Ubuntu Mono',
    family: "'Ubuntu Mono', monospace",
    type: 'monospace',
    desc: 'Nét bo tròn đặc trưng mang lại sự ấm áp và thoải mái',
    sample: 'Linux terminal command sudo apt update',
  },
  {
    id: 'courier_prime',
    name: 'Courier Prime',
    family: "'Courier Prime', monospace",
    type: 'monospace',
    desc: 'Âm hưởng máy đánh chữ cơ khí của các nhà soạn thảo văn học',
    sample: 'Chapter 1: The typewriter mechanical clack',
  },
  {
    id: 'vt323',
    name: 'VT323 (Retro 8-Bit)',
    family: "'VT323', monospace",
    type: 'monospace',
    desc: 'Font pixel phong cách máy thùng arcade thập niên 80 hoài niệm',
    sample: 'READY PLAYER ONE? INSERT COIN TO PLAY',
  },
  {
    id: 'share_tech_mono',
    name: 'Share Tech Mono',
    family: "'Share Tech Mono', monospace",
    type: 'monospace',
    desc: 'Giao diện radar HUD máy bay tiêm kích và công nghệ số',
    sample: 'RADAR LOCK: TARGET SPEED 185 WPM',
  },
  {
    id: 'plus_jakarta_sans',
    name: 'Plus Jakarta Sans',
    family: "'Plus Jakarta Sans', sans-serif",
    type: 'sans',
    desc: 'Font sans-serif hiện đại với nét thanh tao và độ tương phản cao',
    sample: 'Tốc độ lướt phím đỉnh cao cùng FastTyping',
  },
  {
    id: 'inter',
    name: 'Inter',
    family: "'Inter', sans-serif",
    type: 'sans',
    desc: 'Chuẩn mực giao diện ứng dụng quốc tế siêu rõ nét',
    sample: 'Designed for computer screens everywhere',
  },
  {
    id: 'be_vietnam_pro',
    name: 'Be Vietnam Pro',
    family: "'Be Vietnam Pro', sans-serif",
    type: 'sans',
    desc: 'Thiết kế tối ưu thanh điệu Tiếng Việt sắc nét nhất',
    sample: 'Đường phượng bay rợp trời đất nước mến yêu',
  },
  {
    id: 'lexend_deca',
    name: 'Lexend Deca',
    family: "'Lexend Deca', sans-serif",
    type: 'sans',
    desc: 'Font được viện nghiên cứu chứng minh tăng tốc độ đọc của mắt',
    sample: 'Science says you read this much faster',
  },
  {
    id: 'overpass_mono',
    name: 'Overpass Mono',
    family: "'Overpass Mono', monospace",
    type: 'monospace',
    desc: 'Được lấy cảm hứng từ biển chỉ dẫn xa lộ quốc lộ Mỹ',
    sample: 'HIGHWAY TYPING SPEED LIMIT 200 WPM',
  },
  {
    id: 'anonymous_pro',
    name: 'Anonymous Pro',
    family: "'Anonymous Pro', monospace",
    type: 'monospace',
    desc: 'Font biểu tượng của cộng đồng hacker bảo mật mã nguồn',
    sample: '01000110 01100001 01110011 01110100',
  },
  {
    id: 'cutive_mono',
    name: 'Cutive Mono',
    family: "'Cutive Mono', monospace",
    type: 'monospace',
    desc: 'Dòng máy chữ cổ kính thanh tao như tiểu thuyết thời xưa',
    sample: 'A quiet evening with pen and paper',
  },
  {
    id: 'comfortaa',
    name: 'Comfortaa',
    family: "'Comfortaa', cursive",
    type: 'sans',
    desc: 'Đường nét cong tròn mềm mại giúp xua tan căng thẳng',
    sample: 'Thư giãn ngón tay lướt êm từng phím bấm',
  },
  {
    id: 'syne_mono',
    name: 'Syne Mono',
    family: "'Syne Mono', monospace",
    type: 'monospace',
    desc: 'Phong cách nghệ thuật typography Pháp đương đại phá cách',
    sample: 'Avant-garde artistic keyboard rhythm',
  },
  {
    id: 'major_mono_display',
    name: 'Major Mono Display',
    family: "'Major Mono Display', monospace",
    type: 'monospace',
    desc: 'Độc đáo với sự pha trộn chữ hoa chữ thường phá vỡ khuôn mẫu',
    sample: 'uNiquE aNd CrEaTiVe TyPinG StYlE',
  },
];

export const EXPANDED_AVATARS: { category: string; icons: string[] }[] = [
  {
    category: 'Vương Giả & Quyền Năng',
    icons: ['👑', '⚡', '🔥', '🌟', '💎', '🎯', '🚀', '🛸', '🏆', '⚔️', '🛡️', '🔱'],
  },
  {
    category: 'Chiến Binh & Nhân Vật',
    icons: ['🤖', '🥋', '🥷', '🧙‍♂️', '🧝', '🧛', '🦸', '👨‍💻', '👩‍💻', '🕵️', '🧑‍🚀', '👾'],
  },
  {
    category: 'Linh Vật & Động Vật',
    icons: ['🐉', '🦁', '🐯', '🐺', '🦊', '🐱', '🐶', '🐼', '🐨', '🦄', '🦅', '🦉', '🦈', '🐙', '🐵', '🐸', '🦖', '🐝'],
  },
  {
    category: 'Kỳ Ảo & Biểu Cảm',
    icons: ['🎭', '🎪', '🎲', '🪐', '🕹️', '👻', '💀', '👽', '🔮', '✨', '🌪️', '🌋'],
  },
];

// Flat array of all avatars
export const ALL_AVATARS: string[] = EXPANDED_AVATARS.flatMap((c) => c.icons);

const GOOGLE_FONT_URLS: Record<string, string> = {
  fira_code: 'https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;500;600&display=swap',
  roboto_mono: 'https://fonts.googleapis.com/css2?family=Roboto+Mono:wght@400;500;600&display=swap',
  source_code_pro: 'https://fonts.googleapis.com/css2?family=Source+Code+Pro:wght@400;500;600&display=swap',
  inconsolata: 'https://fonts.googleapis.com/css2?family=Inconsolata:wght@400;600;700&display=swap',
  space_mono: 'https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&display=swap',
  ubuntu_mono: 'https://fonts.googleapis.com/css2?family=Ubuntu+Mono:wght@400;700&display=swap',
  courier_prime: 'https://fonts.googleapis.com/css2?family=Courier+Prime&display=swap',
  cutive_mono: 'https://fonts.googleapis.com/css2?family=Cutive+Mono&display=swap',
  anonymous_pro: 'https://fonts.googleapis.com/css2?family=Anonymous+Pro&display=swap',
  major_mono_display: 'https://fonts.googleapis.com/css2?family=Major+Mono+Display&display=swap',
  overpass_mono: 'https://fonts.googleapis.com/css2?family=Overpass+Mono:wght@400;600&display=swap',
  share_tech_mono: 'https://fonts.googleapis.com/css2?family=Share+Tech+Mono&display=swap',
  syne_mono: 'https://fonts.googleapis.com/css2?family=Syne+Mono&display=swap',
  vt323: 'https://fonts.googleapis.com/css2?family=VT323&display=swap',
  inter: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
  be_vietnam_pro: 'https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;500;600;700&display=swap',
  lexend_deca: 'https://fonts.googleapis.com/css2?family=Lexend+Deca:wght@400;500;600&display=swap',
  comfortaa: 'https://fonts.googleapis.com/css2?family=Comfortaa:wght@400;600;700&display=swap',
};

const loadedFonts = new Set<string>(['jetbrains_mono']);

/**
 * Dynamically loads Google Font stylesheet on demand to avoid heavy initial bundle
 */
export function ensureFontLoaded(fontId: string) {
  if (typeof document === 'undefined') return;
  if (loadedFonts.has(fontId)) return;
  const url = GOOGLE_FONT_URLS[fontId];
  if (!url) return;

  const linkId = `font-dyn-${fontId}`;
  if (!document.getElementById(linkId)) {
    const link = document.createElement('link');
    link.id = linkId;
    link.rel = 'stylesheet';
    link.href = url;
    document.head.appendChild(link);
  }
  loadedFonts.add(fontId);
}

/**
 * Apply theme colors and font dynamically to root document element
 */
export function applyThemeAndFont(themeId: string, fontId: string) {
  const theme = MONKEY_THEMES.find((t) => t.id === themeId) || MONKEY_THEMES[0];
  const font = TYPING_FONTS.find((f) => f.id === fontId) || TYPING_FONTS[0];

  ensureFontLoaded(font.id);

  const root = document.documentElement;
  root.style.setProperty('--theme-bg', theme.bg);
  root.style.setProperty('--theme-card', theme.cardBg);
  root.style.setProperty('--theme-main', theme.main);
  root.style.setProperty('--theme-sub', theme.sub);
  root.style.setProperty('--theme-text', theme.text);
  root.style.setProperty('--theme-error', theme.error);
  root.style.setProperty('--theme-border', theme.border);
  root.style.setProperty('--typing-font', font.family);
  root.setAttribute('data-theme-id', theme.id);
  root.setAttribute('data-theme-category', theme.category);

  // Store in localStorage
  localStorage.setItem('fasttyping_theme', theme.id);
  localStorage.setItem('fasttyping_font', font.id);
}

export function getStoredTheme(): string {
  return localStorage.getItem('fasttyping_theme') || 'default_fasttyping';
}

export function getStoredFont(): string {
  return localStorage.getItem('fasttyping_font') || 'jetbrains_mono';
}

export function initThemeAndFont() {
  const themeId = getStoredTheme();
  const fontId = getStoredFont();
  applyThemeAndFont(themeId, fontId);
}
