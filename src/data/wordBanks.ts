import { MysteryWordItem, WordPoolType } from '../types';

export function removeVietnameseTones(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
}

export const BIG_WORD_BANKS = {
  vi_dau: {
    easy: [
      'ngày', 'đêm', 'mưa', 'nắng', 'gió', 'mây', 'sông', 'núi', 'biển', 'rừng',
      'trời', 'đất', 'lửa', 'nước', 'cát', 'đá', 'sỏi', 'bùn', 'tro', 'khói',
      'bụi', 'sao', 'trăng', 'sáng', 'trưa', 'chiều', 'tối', 'khuya', 'hôm', 'mai',
      'nay', 'sớm', 'muộn', 'lúc', 'giờ', 'phút', 'giây', 'tuần', 'tháng', 'năm',
      'mùa', 'xuân', 'hè', 'thu', 'đông', 'bão', 'giông', 'sấm', 'chớp', 'sương',
      'tuyết', 'rét', 'lạnh', 'nóng', 'ấm', 'mát', 'ẩm', 'khô', 'hanh', 'nguồn',
      'suối', 'thác', 'khe', 'lạch', 'ao', 'hồ', 'đầm', 'vực', 'cồn', 'bãi',
      'bờ', 'đảo', 'vịnh', 'hang', 'động', 'rãnh', 'kênh', 'mương', 'đồi', 'dốc',
      'ông', 'bà', 'cha', 'mẹ', 'ba', 'má', 'anh', 'chị', 'em', 'con',
      'cháu', 'chắt', 'chú', 'bác', 'cô', 'dì', 'thím', 'cậu', 'mợ', 'dượng',
      'thầy', 'bạn', 'trò', 'khách', 'chủ', 'người', 'trai', 'gái', 'nam', 'nữ',
      'già', 'trẻ', 'bé', 'cụ', 'chàng', 'nàng', 'tôi', 'ta', 'mình', 'tớ',
      'họ', 'chúng', 'ai', 'kẻ', 'hàng', 'xóm', 'làng', 'phố', 'thôn', 'ấp',
      'bản', 'quê', 'quán', 'nhà', 'dân', 'tộc', 'đầu', 'tóc', 'tai', 'mắt',
      'mũi', 'miệng', 'môi', 'răng', 'lưỡi', 'cằm', 'trán', 'cổ', 'gáy', 'vai',
      'ngực', 'lưng', 'bụng', 'rốn', 'eo', 'hông', 'tay', 'chân', 'ngón', 'móng',
      'nách', 'khớp', 'gối', 'gót', 'da', 'thịt', 'xương', 'máu', 'tim', 'gan',
      'phổi', 'thận', 'ruột', 'não', 'mày', 'mi', 'râu', 'lông', 'gân', 'bắp',
      'mặt', 'thân', 'vóc', 'dáng', 'tiếng', 'chó', 'mèo', 'gà', 'vịt', 'ngan',
      'ngỗng', 'bồ', 'câu', 'chim', 'cá', 'tôm', 'cua', 'ốc', 'nghêu', 'sò',
      'hến', 'mực', 'lươn', 'trạch', 'ếch', 'nhái', 'cóc', 'heo', 'lợn', 'bò',
      'trâu', 'ngựa', 'dê', 'cừu', 'hươu', 'nai', 'voi', 'hổ', 'cọp', 'báo',
      'gấu', 'khỉ', 'vượn', 'sói', 'cáo', 'chồn', 'thỏ', 'chuột', 'sóc', 'nhím',
      'rắn', 'trăn', 'rùa', 'ong', 'bướm', 'kiến', 'gián', 'muỗi', 'ruồi', 'nhện'
    ],
    hard: [
      'khoảnh', 'nghiêng', 'khuếch', 'khuỵu', 'ngoéo', 'thuở', 'ngoằn', 'ngoèo', 'nghiến', 'nguyện',
      'truyền', 'khuyến', 'chuyện', 'quyển', 'nghễu', 'nghiễu', 'soạn', 'duyệt', 'chuộng', 'hoảng',
      'khoảng', 'nghèo', 'xoắn', 'ngoắc', 'khoác', 'hoắt', 'hoẵng', 'thuần', 'khuần', 'ngoài',
      'quệt', 'nghiêm', 'nghiệm', 'nghiệp', 'nguyễn', 'quyết', 'quyền', 'quýnh', 'quỳnh', 'quyến',
      'quyện', 'uyển', 'uyết', 'huyễn', 'huyền', 'huyện', 'chuyển', 'chuyến', 'chuyễn', 'tuyển',
      'tuyến', 'tuyệt', 'tuyên', 'duyên', 'khuyết', 'khuyen', 'khuyển', 'khuya', 'khuây', 'khuất',
      'khuẩn', 'khuôn', 'nguệch', 'nguẩy', 'nguyệt', 'nguyền', 'nghịch', 'nghiệt', 'nghiễm', 'nghĩa',
      'nghễnh', 'nghệch', 'nghênh', 'ngoảnh', 'ngoặt', 'ngoẵng', 'ngoẹo', 'ngoét', 'xoẹt', 'xoạc',
      'xoạch', 'quạnh', 'quẫy', 'khuỷu', 'khuynh', 'khuấy', 'khoắng', 'khỏe', 'loãng', 'ngoạm',
      'loạng', 'choạng', 'loằng', 'khoẵng', 'toác', 'thoảng', 'xoang', 'quăng', 'quắc', 'xoặc',
      'toát', 'thoát', 'thoắt', 'khoắt', 'choắt', 'nhuộm', 'suộm', 'nguấy', 'quấy', 'loay',
      'hoay', 'ngoáy', 'khoáy', 'xoay', 'toay', 'khoeo', 'khoèo', 'quỵt', 'trĩu', 'suyễn',
      'hoạnh', 'quánh', 'chễm', 'chệ', 'nghẽn', 'ngẫm', 'nghĩ', 'bẽn', 'lẽn', 'nũng',
      'nịu', 'nguội', 'chuỗi', 'nguẩn', 'quẩn', 'huých', 'uỵch', 'huỵch', 'nghẹn', 'xòe',
      'ngoe', 'xuệ', 'lũy', 'thủy'
    ]
  },
  en: {
    easy: [
      'cat', 'dog', 'sun', 'moon', 'star', 'tree', 'book', 'pen', 'desk', 'fish',
      'fast', 'good', 'apple', 'orange', 'grape', 'peach', 'pear', 'lemon', 'melon', 'berry',
      'bread', 'rice', 'cake', 'soup', 'milk', 'water', 'juice', 'coffee', 'tea', 'sugar',
      'salt', 'egg', 'meat', 'beef', 'pork', 'chicken', 'duck', 'horse', 'sheep', 'goat',
      'mouse', 'house', 'home', 'room', 'door', 'wall', 'floor', 'roof', 'bed', 'chair',
      'table', 'school', 'class', 'teacher', 'student', 'friend', 'family', 'mother', 'father', 'sister',
      'brother', 'baby', 'child', 'boy', 'girl', 'man', 'woman', 'king', 'queen', 'name',
      'face', 'hand', 'head', 'hair', 'eye', 'ear', 'nose', 'mouth', 'foot', 'leg',
      'arm', 'car', 'bus', 'train', 'boat', 'road', 'street', 'park', 'shop', 'store',
      'farm', 'red', 'blue', 'green', 'white', 'black', 'brown', 'pink', 'gray', 'round'
    ],
    hard: [
      'rhythm', 'queue', 'knapsack', 'quizzical', 'puzzling', 'knowledge', 'strength', 'synergy', 'awkward', 'beautiful',
      'bizarre', 'brilliant', 'cautious', 'curious', 'dangerous', 'delicate', 'difficult', 'efficient', 'enormous', 'excellent',
      'fascinating', 'fortunate', 'generous', 'gorgeous', 'grateful', 'harmonious', 'impressive', 'incredible', 'independent', 'intelligent',
      'mysterious', 'necessary', 'obvious', 'optimistic', 'particular', 'powerful', 'precious', 'previous', 'reasonable', 'remarkable',
      'significant', 'spectacular', 'successful', 'surprising', 'technical', 'thoughtful', 'traditional', 'unusual', 'valuable', 'wonderful',
      'adventure', 'challenge', 'experience', 'language', 'question', 'throughout'
    ]
  }
};

export const BIG_WORD_BANKS_VI_NODAU = {
  easy: BIG_WORD_BANKS.vi_dau.easy.map(removeVietnameseTones),
  hard: BIG_WORD_BANKS.vi_dau.hard.map(removeVietnameseTones)
};

export const MYSTERY_WORD_BANKS = {
  vi_dau: [
    { word: 'mặt trời', hint: 'Thiên văn học / Vũ trụ' },
    { word: 'bàn phím', hint: 'Công nghệ / Tin học' },
    { word: 'lập trình viên', hint: 'Nghề nghiệp công nghệ' },
    { word: 'con sư tử', hint: 'Động vật ăn thịt hoang dã' },
    { word: 'hoa hướng dương', hint: 'Thực vật / Loài hoa luôn hướng về ánh nắng' },
    { word: 'nước giải khát', hint: 'Ẩm thực / Đồ uống giải nhiệt' },
    { word: 'bánh chưng', hint: 'Món ăn truyền thống ngày Tết' },
    { word: 'thành phố', hint: 'Địa lý / Đô thị sầm uất' },
    { word: 'máy vi tính', hint: 'Thiết bị điện tử bàn làm việc' },
    { word: 'uống nước nhớ nguồn', hint: 'Thành ngữ / Đạo lý tri ân' },
    { word: 'kiên trì bền bỉ', hint: 'Phẩm chất quý báu của con người' },
    { word: 'bách chiến bách thắng', hint: 'Thành ngữ quân sự / Chiến thắng vang dội' },
    { word: 'thao trường rèn luyện', hint: 'Quân sự / Nơi luyện binh' },
    { word: 'chuột túi', hint: 'Động vật đặc trưng châu Úc' },
    { word: 'vịnh hạ long', hint: 'Danh lam thắng cảnh kỳ quan thế giới' },
    { word: 'bác sĩ nha khoa', hint: 'Y tế / Chăm sóc răng miệng' },
    { word: 'núi fansipan', hint: 'Nóc nhà Đông Dương tại Việt Nam' },
    { word: 'điện thoại thông minh', hint: 'Công nghệ số / Vật bất ly thân' },
    { word: 'trí tuệ nhân tạo', hint: 'Khoa học công nghệ thế hệ mới' },
    { word: 'hồ hoàn kiếm', hint: 'Địa danh lịch sử giữa lòng Thủ đô' },
    { word: 'chim cánh cụt', hint: 'Động vật sống tại Nam Cực lạnh giá' },
    { word: 'khủng long bạo chúa', hint: 'Động vật thời tiền sử T-Rex' }
  ],
  vi_nodau: [
    { word: 'mat troi', hint: 'Thiên văn học / Vũ trụ (không dấu)' },
    { word: 'ban phim', hint: 'Công nghệ / Tin học (không dấu)' },
    { word: 'lap trinh vien', hint: 'Nghề nghiệp công nghệ (không dấu)' },
    { word: 'con su tu', hint: 'Động vật ăn thịt hoang dã (không dấu)' },
    { word: 'hoa huong duong', hint: 'Thực vật / Loài hoa hướng nắng (không dấu)' },
    { word: 'banh chung', hint: 'Món ăn truyền thống ngày Tết (không dấu)' },
    { word: 'thanh pho', hint: 'Địa lý / Đô thị sầm uất (không dấu)' },
    { word: 'may vi tinh', hint: 'Thiết bị điện tử bàn làm việc (không dấu)' },
    { word: 'vinh ha long', hint: 'Kỳ quan thiên nhiên thế giới (không dấu)' },
    { word: 'nui fansipan', hint: 'Nóc nhà Đông Dương (không dấu)' },
    { word: 'ho hoan kiem', hint: 'Thắng cảnh lịch sử Hà Nội (không dấu)' },
    { word: 'tri tue nhan tao', hint: 'Trí tuệ máy tính tương lai (không dấu)' }
  ],
  en: [
    { word: 'sunflower', hint: 'Nature / Beautiful yellow flower' },
    { word: 'keyboard', hint: 'Computer Hardware' },
    { word: 'software developer', hint: 'Career / Technology coder' },
    { word: 'artificial intelligence', hint: 'Modern Computer Science' },
    { word: 'smartphone', hint: 'Pocket electronic device' },
    { word: 'waterfall', hint: 'Landscape / Flowing water from high cliff' },
    { word: 'refrigerator', hint: 'Home appliance cooling food' },
    { word: 'golden bridge', hint: 'Famous bridge held by giant hands in Da Nang' },
    { word: 'cheetah', hint: 'Fastest land animal on Earth' },
    { word: 'chocolate cake', hint: 'Sweet dessert / Bakery treat' }
  ],
  numbers: [
    { word: '1945', hint: 'Mốc son lịch sử / Cách mạng Tháng Tám' },
    { word: '314159', hint: 'Hằng số Pi trong toán học (3.14159)' },
    { word: '88888', hint: 'Dãy số ngũ quý đại cát tài lộc' },
    { word: '2026', hint: 'Năm dương lịch hiện tại' },
    { word: '9999', hint: 'Tứ quý phong thủy may mắn trường tồn' },
    { word: '1024', hint: 'Số Bytes trong một Kilobyte' },
    { word: '365', hint: 'Số ngày trong một năm dương lịch thường' },
    { word: '86400', hint: 'Tổng số giây trong 24 giờ' },
    { word: '1000000', hint: 'Một triệu / Mốc số tròn chục sáu số 0' },
    { word: '114', hint: 'Tổng đài cứu hỏa cứu nạn Việt Nam' },
    { word: '115', hint: 'Tổng đài cấp cứu y tế khẩn cấp' },
    { word: '113', hint: 'Tổng đài lực lượng cảnh sát phản ứng nhanh' }
  ],
  fullsize: [
    { word: '58008', hint: 'Mật mã máy tính bỏ túi cổ điển (BOOBS xoay ngược)' },
    { word: '80085', hint: 'Easter egg huyền thoại trên máy tính Casio' },
    { word: '1+2+3=6', hint: 'Biểu thức số học cộng liên tiếp' },
    { word: '100*2=200', hint: 'Phép tính nhân cơ bản hai trăm' },
    { word: '3.1416', hint: 'Số thập phân xấp xỉ hằng số Pi' },
    { word: '777-999', hint: 'Dãy số ghép phép trừ đặc biệt' },
    { word: '10/2=5', hint: 'Phép tính chia nguyên mười chia hai' },
    { word: '07734', hint: 'Mã số máy tính ngược chữ HELLO' },
    { word: '5318008', hint: 'Mã số đảo ngược nổi tiếng trên màn hình Numpad' },
    { word: '99*9=891', hint: 'Phép nhân hai chữ số ra 891' }
  ]
};

export function generate58008Word(subMode: 'number' | 'fullsize' = 'fullsize', longNumberRatePercent?: number): string {
  // If longNumberRatePercent is specified, roll probability to produce a 5 or 6 digit string
  if (longNumberRatePercent !== undefined && Math.random() < longNumberRatePercent / 100) {
    const len = Math.random() < 0.5 ? 5 : 6;
    let numStr = (Math.floor(Math.random() * 9) + 1).toString();
    for (let i = 1; i < len; i++) {
      numStr += Math.floor(Math.random() * 10).toString();
    }
    return numStr;
  }

  if (subMode === 'number') {
    const lengths = [1, 2, 2, 3, 3, 4, 4, 5, 6];
    const len = lengths[Math.floor(Math.random() * lengths.length)];
    let numStr = '';
    for (let i = 0; i < len; i++) {
      numStr += Math.floor(Math.random() * 10).toString();
    }
    if (numStr.length > 1 && numStr.startsWith('0')) {
      numStr = (Math.floor(Math.random() * 9) + 1).toString() + numStr.slice(1);
    }
    return numStr;
  }

  const rand = Math.random();
  if (rand < 0.12) {
    const operators = ['+', '-', '*', '/'];
    return operators[Math.floor(Math.random() * operators.length)];
  }
  if (rand < 0.18) {
    const easterEggs = ['58008', '80085', '07734', '376007', '71077345', '5318008'];
    return easterEggs[Math.floor(Math.random() * easterEggs.length)];
  }
  if (rand < 0.35) {
    const intPart = Math.floor(Math.random() * 999);
    const decPart = Math.floor(Math.random() * 99);
    return `${intPart}.${decPart < 10 ? '0' + decPart : decPart}`;
  }

  const lengths = [1, 2, 2, 3, 3, 4, 4, 5, 6];
  const len = lengths[Math.floor(Math.random() * lengths.length)];
  let numStr = '';
  for (let i = 0; i < len; i++) {
    numStr += Math.floor(Math.random() * 10).toString();
  }
  if (numStr.length > 1 && numStr.startsWith('0')) {
    numStr = (Math.floor(Math.random() * 9) + 1).toString() + numStr.slice(1);
  }
  return numStr;
}

function getRandomWordFromBank(bankEasy: string[], bankHard: string[], hardRatePercent: number): string {
  const isHard = Math.random() < hardRatePercent / 100;
  const pool = isHard ? bankHard : bankEasy;
  return pool[Math.floor(Math.random() * pool.length)];
}

export function generateWords(
  mode: string,
  count: number = 150,
  difficulty: string = 'normal',
  customHardRate?: number,
  allowedPools?: WordPoolType[]
): string[] {
  if (mode === 'numpad') {
    const subMode = difficulty === 'number' ? 'number' : 'fullsize';
    return Array.from({ length: count }, () => generate58008Word(subMode, customHardRate));
  }

  const hardRate = customHardRate !== undefined
    ? customHardRate
    : (difficulty === 'legendary' || difficulty === 'hell' ? 70 : difficulty === 'hard' ? 45 : 25);

  if (mode === 'san_boss' || mode === 'ngau_hung') {
    const activePools: WordPoolType[] = (allowedPools && allowedPools.length > 0)
      ? allowedPools
      : ['vi_dau', 'vi_nodau', 'en', 'numbers'];

    return Array.from({ length: count }, () => {
      const chosenPool = activePools[Math.floor(Math.random() * activePools.length)];
      switch (chosenPool) {
        case 'vi_dau':
          return getRandomWordFromBank(BIG_WORD_BANKS.vi_dau.easy, BIG_WORD_BANKS.vi_dau.hard, hardRate);
        case 'vi_nodau':
          return getRandomWordFromBank(BIG_WORD_BANKS_VI_NODAU.easy, BIG_WORD_BANKS_VI_NODAU.hard, hardRate);
        case 'en':
          return getRandomWordFromBank(BIG_WORD_BANKS.en.easy, BIG_WORD_BANKS.en.hard, hardRate);
        case 'numbers':
          return generate58008Word('number');
        case 'fullsize':
          return generate58008Word('fullsize');
        default:
          return getRandomWordFromBank(BIG_WORD_BANKS.vi_dau.easy, BIG_WORD_BANKS.vi_dau.hard, hardRate);
      }
    });
  }

  if (mode === 'vi_nodau') {
    return Array.from({ length: count }, () =>
      getRandomWordFromBank(BIG_WORD_BANKS_VI_NODAU.easy, BIG_WORD_BANKS_VI_NODAU.hard, hardRate)
    );
  }

  if (mode === 'en') {
    return Array.from({ length: count }, () =>
      getRandomWordFromBank(BIG_WORD_BANKS.en.easy, BIG_WORD_BANKS.en.hard, hardRate)
    );
  }

  // Default vi_dau
  return Array.from({ length: count }, () =>
    getRandomWordFromBank(BIG_WORD_BANKS.vi_dau.easy, BIG_WORD_BANKS.vi_dau.hard, hardRate)
  );
}

export function generateDoanChuWords(
  difficulty: string = 'normal',
  count: number = 10,
  allowedPools?: WordPoolType[]
): MysteryWordItem[] {
  let activePools: WordPoolType[];
  if (allowedPools && allowedPools.length > 0) {
    activePools = allowedPools;
  } else {
    if (difficulty === 'legendary') {
      activePools = ['vi_dau', 'en'];
    } else if (difficulty === 'hard') {
      activePools = ['vi_dau', 'vi_nodau', 'en'];
    } else {
      activePools = ['vi_dau', 'vi_nodau'];
    }
  }

  const combinedBank: MysteryWordItem[] = [];
  activePools.forEach((pool) => {
    const bank = MYSTERY_WORD_BANKS[pool];
    if (bank && bank.length > 0) {
      combinedBank.push(...bank);
    }
  });

  const sourceBank = combinedBank.length > 0 ? combinedBank : MYSTERY_WORD_BANKS.vi_dau;
  const shuffled = [...sourceBank].sort(() => 0.5 - Math.random());
  
  const result: MysteryWordItem[] = [];
  let index = 0;
  while (result.length < count) {
    result.push(shuffled[index % shuffled.length]);
    index++;
  }
  return result;
}

export interface OutplayWordOptions {
  punctuation?: boolean;
  numbers?: boolean;
}

export function generateOutplayWords(
  subMode: 'numpad_number' | 'numpad_fullsize' | 'vi_nodau' | 'vi_dau' | 'en',
  count: number = 200,
  options?: OutplayWordOptions
): string[] {
  if (subMode === 'numpad_number') {
    return Array.from({ length: count }, () => generate58008Word('number'));
  }
  if (subMode === 'numpad_fullsize') {
    return Array.from({ length: count }, () => generate58008Word('fullsize'));
  }

  let rawWords: string[] = [];
  if (subMode === 'vi_nodau') {
    rawWords = Array.from({ length: count }, () =>
      getRandomWordFromBank(BIG_WORD_BANKS_VI_NODAU.easy, BIG_WORD_BANKS_VI_NODAU.hard, 30)
    );
  } else if (subMode === 'en') {
    rawWords = Array.from({ length: count }, () =>
      getRandomWordFromBank(BIG_WORD_BANKS.en.easy, BIG_WORD_BANKS.en.hard, 30)
    );
  } else {
    rawWords = Array.from({ length: count }, () =>
      getRandomWordFromBank(BIG_WORD_BANKS.vi_dau.easy, BIG_WORD_BANKS.vi_dau.hard, 35)
    );
  }

  if (!options?.punctuation && !options?.numbers) {
    return rawWords;
  }

  const punctuations = ['.', ',', '!', '?', ';', ':', '-'];
  return rawWords.map((word, idx) => {
    // 1. Check numbers insertion (approx 10% chance)
    if (options.numbers && Math.random() < 0.1) {
      const numType = Math.random();
      if (numType < 0.4) return Math.floor(Math.random() * 90 + 10).toString(); // 10-99
      if (numType < 0.7) return Math.floor(Math.random() * 900 + 100).toString(); // 100-999
      if (numType < 0.9) return (1980 + Math.floor(Math.random() * 50)).toString(); // Year
      return Math.floor(Math.random() * 10).toString(); // 0-9
    }

    // 2. Check punctuation insertion (approx 20% chance)
    if (options.punctuation) {
      const randPunc = Math.random();
      if (randPunc < 0.22) {
        // Capitalize first letter (if sentence start or proper)
        const capitalized = word.charAt(0).toUpperCase() + word.slice(1);
        if (randPunc < 0.08) {
          // Period or comma
          const p = punctuations[Math.floor(Math.random() * 2)];
          return `${capitalized}${p}`;
        }
        if (randPunc < 0.12) {
          // Exclamation or question mark
          const p = Math.random() < 0.5 ? '!' : '?';
          return `${capitalized}${p}`;
        }
        if (randPunc < 0.16) {
          // In quotes
          return `"${word}"`;
        }
        return capitalized;
      } else if (randPunc < 0.35) {
        // Trailing comma or period
        const p = Math.random() < 0.6 ? ',' : '.';
        return `${word}${p}`;
      }
    }

    return word;
  });
}
