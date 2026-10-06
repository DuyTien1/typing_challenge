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

export const DEFAULT_MARKET_LISTINGS: MarketListing[] = [
  {
    id: 'lst_npc_ulan',
    sellerId: 'npc_bachhac',
    sellerUsername: 'Bạch Hạc Chân Nhân',
    sellerAvatar: '🕊️',
    sellerFrame: 'admin_gold',
    itemType: 'herb',
    itemId: 'uLan',
    itemName: 'U Lan Thảo',
    itemIcon: '🌱',
    quality: 'trung_pham',
    quantity: 5,
    pricePerUnit: 25,
    totalPrice: 125,
    listedAt: Date.now() - 3600000,
    expiresAt: Date.now() + 86400000,
    status: 'active',
  },
  {
    id: 'lst_npc_huyettinh',
    sellerId: 'npc_thanhphong',
    sellerUsername: 'Thanh Phong Đạo Trưởng',
    sellerAvatar: '🍃',
    sellerFrame: 'emerald_dragon',
    itemType: 'herb',
    itemId: 'huyetTinh',
    itemName: 'Huyết Tinh Thảo',
    itemIcon: '🌿',
    quality: 'thuong_pham',
    quantity: 3,
    pricePerUnit: 40,
    totalPrice: 120,
    listedAt: Date.now() - 7200000,
    expiresAt: Date.now() + 86400000,
    status: 'active',
  },
  {
    id: 'lst_npc_linhtra',
    sellerId: 'npc_linhlung',
    sellerUsername: 'Linh Lung Tiên Tử',
    sellerAvatar: '🌸',
    sellerFrame: 'cosmic_cyan',
    itemType: 'tea',
    itemId: 'linhTra',
    itemName: 'Bát Trảm Linh Trà',
    itemIcon: '🍵',
    quality: 'cuc_pham',
    quantity: 2,
    pricePerUnit: 140,
    totalPrice: 280,
    listedAt: Date.now() - 10800000,
    expiresAt: Date.now() + 86400000,
    status: 'active',
  },
  {
    id: 'lst_npc_thonguyen',
    sellerId: 'npc_vocuc',
    sellerUsername: 'Vô Cực Tán Nhân',
    sellerAvatar: '⚡',
    sellerFrame: 'thunder_lord',
    itemType: 'pill',
    itemId: 'thoNguyen',
    itemName: 'Thọ Nguyên Đan',
    itemIcon: '💊',
    quality: 'trung_pham',
    quantity: 2,
    pricePerUnit: 80,
    totalPrice: 160,
    listedAt: Date.now() - 14400000,
    expiresAt: Date.now() + 86400000,
    status: 'active',
  },
  {
    id: 'lst_npc_dinhtam',
    sellerId: 'npc_huyenco',
    sellerUsername: 'Huyền Cơ Tử',
    sellerAvatar: '🔮',
    sellerFrame: 'ruby_fire',
    itemType: 'pill',
    itemId: 'dinhTam',
    itemName: 'Định Tâm Đan',
    itemIcon: '🧘',
    quality: 'thuong_pham',
    quantity: 1,
    pricePerUnit: 95,
    totalPrice: 95,
    listedAt: Date.now() - 18000000,
    expiresAt: Date.now() + 86400000,
    status: 'active',
  },
  {
    id: 'lst_npc_hotam',
    sellerId: 'npc_danha',
    sellerUsername: 'Đan Hà Trưởng Lão',
    sellerAvatar: '🔥',
    sellerFrame: 'fire_emperor',
    itemType: 'pill',
    itemId: 'hoTam',
    itemName: 'Hộ Tâm Đan',
    itemIcon: '🛡️',
    quality: 'cuc_pham',
    quantity: 1,
    pricePerUnit: 350,
    totalPrice: 350,
    listedAt: Date.now() - 21600000,
    expiresAt: Date.now() + 86400000,
    status: 'active',
  },
  {
    id: 'lst_npc_longtu',
    sellerId: 'npc_bacminh',
    sellerUsername: 'Bắc Minh Dị Nhân',
    sellerAvatar: '🐉',
    sellerFrame: 'admin_gold',
    itemType: 'herb',
    itemId: 'longTu',
    itemName: 'Long Tu Thảo',
    itemIcon: '🐉',
    quality: 'cuc_pham',
    quantity: 1,
    pricePerUnit: 250,
    totalPrice: 250,
    listedAt: Date.now() - 25200000,
    expiresAt: Date.now() + 86400000,
    status: 'active',
  },
];
