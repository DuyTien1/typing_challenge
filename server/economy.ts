import fs from 'fs';
import path from 'path';
import express from 'express';
import { ShopItem, MarketListing, MarketLog, ServerUserRecord } from './types';
import { getSafeStoragePath } from './utils';
import { isDatabaseConfigured, dbLoadMarket, dbSaveMarketListing, dbSaveMarketLog } from './db';

const SHOP_CONFIG_FILE = getSafeStoragePath('shop_config.json');
const MARKET_FILE = getSafeStoragePath('market.json');

// Memory Stores
let shopCatalog: ShopItem[] = [];
const marketListings = new Map<string, MarketListing>();
let marketTaxRate = 0.05; // 5% default
let marketStats = {
  totalVolume: 0,
  totalTaxBurned: 0,
  totalTradesCount: 0,
};
const marketLogs: MarketLog[] = [];

// Helper get item display info
const ITEM_META: Record<string, { name: string; icon: string; category: 'herb' | 'pill' | 'tea' }> = {
  uLan: { name: 'U Lan Thảo', icon: '🌱', category: 'herb' },
  huyetTinh: { name: 'Huyết Tinh Thảo', icon: '🌿', category: 'herb' },
  hoaAnh: { name: 'Hỏa Anh Thảo', icon: '🔥', category: 'herb' },
  huyenThiet: { name: 'Huyền Thiết Chi', icon: '🍄', category: 'herb' },
  longTu: { name: 'Long Tu Thảo', icon: '🐉', category: 'herb' },
  thoNguyen: { name: 'Thọ Nguyên Đan', icon: '💊', category: 'pill' },
  dinhTam: { name: 'Định Tâm Đan', icon: '🧘', category: 'pill' },
  ngungThan: { name: 'Ngưng Thần Đan', icon: '👁️', category: 'pill' },
  hoTam: { name: 'Hộ Tâm Đan', icon: '🛡️', category: 'pill' },
  phaCanh: { name: 'Phá Cảnh Đan', icon: '⚡', category: 'pill' },
  tuViDan: { name: 'Tu Vi Đan', icon: '🔮', category: 'pill' },
  sieuCapTuViDan: { name: 'Siêu Cấp Tu Vi Đan', icon: '🔮', category: 'pill' },
  linhTra: { name: 'Bát Trảm Linh Trà', icon: '🍵', category: 'tea' },
  dongTamToa: { name: 'Đồng Tâm Tỏa', icon: '🔐', category: 'tea' },
};

export function loadEconomyData() {
  try {
    if (fs.existsSync(SHOP_CONFIG_FILE)) {
      const data = JSON.parse(fs.readFileSync(SHOP_CONFIG_FILE, 'utf-8'));
      if (Array.isArray(data)) {
        shopCatalog = data;
      }
    }
  } catch (err) {
    console.error('Error loading shop_config.json:', err);
  }

  try {
    if (fs.existsSync(MARKET_FILE)) {
      const data = JSON.parse(fs.readFileSync(MARKET_FILE, 'utf-8'));
      if (data && typeof data === 'object') {
        if (Array.isArray(data.listings)) {
          marketListings.clear();
          for (const item of data.listings) {
            if (item && item.id) {
              marketListings.set(item.id, item);
            }
          }
        }
        if (typeof data.taxRate === 'number') {
          marketTaxRate = data.taxRate;
        }
        if (data.stats && typeof data.stats === 'object') {
          marketStats = {
            totalVolume: Number(data.stats.totalVolume) || 0,
            totalTaxBurned: Number(data.stats.totalTaxBurned) || 0,
            totalTradesCount: Number(data.stats.totalTradesCount) || 0,
          };
        }
        if (Array.isArray(data.logs)) {
          marketLogs.length = 0;
          marketLogs.push(...data.logs.slice(-100));
        }
      }
    }
  } catch (err) {
    console.error('Error loading market.json:', err);
  }

  // Hydrate from PostgreSQL if DATABASE_URL is configured
  if (isDatabaseConfigured()) {
    dbLoadMarket().then((dbData) => {
      if (dbData && dbData.listings && dbData.listings.length > 0) {
        marketListings.clear();
        for (const item of dbData.listings) {
          if (item && item.id) {
            marketListings.set(item.id, item);
          }
        }
        if (dbData.logs && dbData.logs.length > 0) {
          marketLogs.length = 0;
          marketLogs.push(...dbData.logs);
        }
        console.log(`[Database] Hydrated ${marketListings.size} market listings from PostgreSQL.`);
      }
    }).catch((err) => {
      console.error('[Database] Failed to hydrate market from PostgreSQL:', err);
    });
  }
}

export function saveMarketData() {
  try {
    const payload = {
      listings: Array.from(marketListings.values()),
      taxRate: marketTaxRate,
      stats: marketStats,
      logs: marketLogs.slice(-100),
    };
    fs.writeFileSync(MARKET_FILE, JSON.stringify(payload, null, 2), 'utf-8');
    if (isDatabaseConfigured()) {
      for (const item of marketListings.values()) {
        dbSaveMarketListing(item).catch(() => {});
      }
    }
  } catch (err) {
    console.error('Error saving market.json:', err);
  }
}

export function saveShopConfigData() {
  try {
    fs.writeFileSync(SHOP_CONFIG_FILE, JSON.stringify(shopCatalog, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving shop_config.json:', err);
  }
}

function addMarketLog(log: Omit<MarketLog, 'id' | 'timestamp'>) {
  const entry: MarketLog = {
    ...log,
    id: 'log_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
    timestamp: Date.now(),
  };
  marketLogs.unshift(entry);
  if (marketLogs.length > 100) marketLogs.pop();
  saveMarketData();
  if (isDatabaseConfigured()) {
    dbSaveMarketLog(entry).catch(() => {});
  }
}

// Return items to seller inventory when listing is cancelled/expired/taken down
function returnItemsToSeller(seller: ServerUserRecord, listing: MarketListing) {
  if (!seller.cultivation) {
    seller.cultivation = {};
  }
  const cult = seller.cultivation;
  if (listing.itemType === 'herb') {
    if (!cult.herbs) cult.herbs = { uLan: 0, huyetTinh: 0, hoaAnh: 0, huyenThiet: 0, longTu: 0 };
    cult.herbs[listing.itemId] = (cult.herbs[listing.itemId] || 0) + listing.quantity;
  } else if (listing.itemType === 'pill') {
    if (!cult.pillCount) cult.pillCount = { thoNguyen: 0, hoTam: 0, phaCanh: 0 };
    cult.pillCount[listing.itemId] = (cult.pillCount[listing.itemId] || 0) + listing.quantity;
  } else if (listing.itemType === 'tea') {
    if (!cult.teaInventory) cult.teaInventory = {};
    cult.teaInventory[listing.itemId] = (cult.teaInventory[listing.itemId] || 0) + listing.quantity;
  }
}

export function registerEconomyRoutes(
  app: express.Express,
  serverUsers: Map<string, ServerUserRecord>,
  getUserByToken: (authHeader?: string) => ServerUserRecord | null,
  saveUsersToFile: () => void
) {
  loadEconomyData();

  function resolveUserFromReq(req: express.Request): ServerUserRecord | null {
    // 1. Authorization header (Bearer token)
    const authHeader = req.headers.authorization;
    let user = getUserByToken(authHeader);
    if (user) return user;

    // 2. Custom header x-auth-token or x-access-token
    const customToken = (req.headers['x-auth-token'] || req.headers['x-access-token']) as string;
    if (customToken) {
      user = getUserByToken(customToken);
      if (user) return user;
    }

    // 3. Body / query token
    const payloadToken = (req.body?.token || req.body?.authToken || req.query?.token) as string;
    if (payloadToken) {
      user = getUserByToken(payloadToken);
      if (user) return user;
    }

    // 4. Fallback by username
    const usernameHeader = (req.headers['x-username'] || req.body?.username || req.query?.username) as string;
    if (usernameHeader && typeof usernameHeader === 'string') {
      const clean = usernameHeader.trim().toLowerCase();
      for (const u of serverUsers.values()) {
        if (u.username && u.username.trim().toLowerCase() === clean) {
          return u;
        }
      }
    }

    // 5. Fallback by userId
    const userIdHeader = (req.headers['x-user-id'] || req.body?.userId || req.query?.userId) as string;
    if (userIdHeader && typeof userIdHeader === 'string' && serverUsers.has(userIdHeader)) {
      return serverUsers.get(userIdHeader) || null;
    }

    return null;
  }

  function isUserAdmin(user: ServerUserRecord | null): boolean {
    if (!user) return false;
    return Boolean(user.isAdmin || (user.username && user.username.trim().toLowerCase() === 'admin'));
  }

  // Helper check user daily purchases date reset
  function ensureUserShopPurchases(user: ServerUserRecord): Record<string, number> {
    if (!user.cultivation) user.cultivation = {};
    const today = new Date().toISOString().slice(0, 10);
    if (user.cultivation.shopPurchasesDate !== today) {
      user.cultivation.shopPurchasesDate = today;
      user.cultivation.shopPurchasesToday = {};
      saveUsersToFile();
    }
    return user.cultivation.shopPurchasesToday || {};
  }

  // 1. GET /api/shop/catalog: Danh mục hàng hóa Vạn Bảo Các
  app.get('/api/shop/catalog', (req, res) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    const user = resolveUserFromReq(req);
    const purchasesToday = user ? ensureUserShopPurchases(user) : {};

    res.json({
      success: true,
      items: shopCatalog.filter((it) => it.enabled),
      purchasesToday,
      userLinhThach: user ? Number(user.cultivation?.linhThach) || 0 : 0,
    });
  });

  // 2. POST /api/shop/buy: Mua vật phẩm tại Vạn Bảo Các
  app.post('/api/shop/buy', (req, res) => {
    const user = resolveUserFromReq(req);
    if (!user) {
      res.status(401).json({ success: false, error: 'Vui lòng đăng nhập để vào Vạn Bảo Các!' });
      return;
    }

    const { itemId, quantity = 1, clientCultivation } = req.body;
    const qty = Math.max(1, parseInt(quantity, 10) || 1);

    const item = shopCatalog.find((it) => it.id === itemId && it.enabled);
    if (!item) {
      res.status(404).json({ success: false, error: 'Vật phẩm không tồn tại hoặc đã ngừng cung ứng!' });
      return;
    }

    if (!user.cultivation) {
      user.cultivation = {};
    }

    // Đồng bộ Linh Thạch và tài sản từ client nếu client vừa thu hoạch được nhiều hơn máy chủ
    if (clientCultivation && typeof clientCultivation === 'object') {
      const clientLt = Number(clientCultivation.linhThach) || 0;
      const serverLt = Number(user.cultivation.linhThach) || 0;
      if (clientLt > serverLt) {
        user.cultivation.linhThach = clientLt;
      }
      if (clientCultivation.herbs && !user.cultivation.herbs) {
        user.cultivation.herbs = { ...clientCultivation.herbs };
      }
      if (clientCultivation.pillCount && !user.cultivation.pillCount) {
        user.cultivation.pillCount = { ...clientCultivation.pillCount };
      }
    }

    const purchasesToday = ensureUserShopPurchases(user);
    const currentBought = purchasesToday[itemId] || 0;
    if (item.dailyLimit > 0 && currentBought + qty > item.dailyLimit) {
      res.status(400).json({
        success: false,
        error: `Đã vượt quá giới hạn mua trong ngày (${currentBought}/${item.dailyLimit})!`,
      });
      return;
    }

    const discount = Math.max(0, Math.min(90, item.discountPercent || 0));
    const unitPrice = Math.round(item.price * (1 - discount / 100));
    const totalCost = unitPrice * qty;

    const currentLinhThach = Number(user.cultivation?.linhThach) || 0;
    if (currentLinhThach < totalCost) {
      res.status(400).json({
        success: false,
        error: `Linh Thạch không đủ! Cần ${totalCost.toLocaleString()} LT, hiện có ${currentLinhThach.toLocaleString()} LT.`,
      });
      return;
    }

    // Khấu trừ Linh Thạch
    user.cultivation.linhThach = currentLinhThach - totalCost;

    // Trao vật phẩm vào túi đồ
    if (item.itemType === 'herb') {
      if (!user.cultivation.herbs) {
        user.cultivation.herbs = { uLan: 0, huyetTinh: 0, hoaAnh: 0, huyenThiet: 0, longTu: 0 };
      }
      user.cultivation.herbs[item.targetKey] = (user.cultivation.herbs[item.targetKey] || 0) + qty;
    } else if (item.itemType === 'pill') {
      if (!user.cultivation.pillCount) {
        user.cultivation.pillCount = { thoNguyen: 0, hoTam: 0, phaCanh: 0 };
      }
      user.cultivation.pillCount[item.targetKey] = (user.cultivation.pillCount[item.targetKey] || 0) + qty;
    } else if (item.itemType === 'tea') {
      if (!user.cultivation.teaInventory) user.cultivation.teaInventory = {};
      user.cultivation.teaInventory[item.targetKey] = (user.cultivation.teaInventory[item.targetKey] || 0) + qty;
    } else if (item.itemType === 'frame') {
      user.frame = item.targetKey;
    }

    // Cập nhật số lần mua hôm nay
    purchasesToday[itemId] = currentBought + qty;
    user.cultivation.shopPurchasesToday = purchasesToday;

    // Lịch sử ký sự tu tiên
    if (!Array.isArray(user.cultivation.historyLog)) {
      user.cultivation.historyLog = [];
    }
    user.cultivation.historyLog.unshift(
      `Đến Vạn Bảo Các dùng ${totalCost.toLocaleString()} Linh Thạch mua ${qty}x ${item.name}`
    );
    if (user.cultivation.historyLog.length > 50) user.cultivation.historyLog.pop();

    saveUsersToFile();

    addMarketLog({
      type: 'buy',
      actorUsername: user.username,
      details: `Mua ${qty}x ${item.name} tại Vạn Bảo Các giá ${totalCost} LT.`,
      amount: totalCost,
    });

    res.json({
      success: true,
      message: `Đã mua thành công ${qty}x ${item.name}!`,
      updatedCultivation: user.cultivation,
      purchasesToday,
    });
  });

  // 3. GET /api/market/listings: Duyệt danh sách hàng P2P Phường Thị
  app.get('/api/market/listings', (req, res) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    const { category, search, sortBy } = req.query;

    const now = Date.now();
    // Auto-expire listings older than 48 hours
    for (const [id, listing] of marketListings.entries()) {
      if (listing.status === 'active' && listing.expiresAt <= now) {
        listing.status = 'cancelled';
        const seller = serverUsers.get(listing.sellerId) || Array.from(serverUsers.values()).find(u => u.username === listing.sellerUsername);
        if (seller) {
          returnItemsToSeller(seller, listing);
          saveUsersToFile();
        }
      }
    }
    saveMarketData();

    let list = Array.from(marketListings.values()).filter((l) => l.status === 'active');

    // Filter
    if (category && category !== 'all') {
      list = list.filter((l) => l.itemType === category);
    }
    if (search && typeof search === 'string' && search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (l) => l.itemName.toLowerCase().includes(q) || l.sellerUsername.toLowerCase().includes(q)
      );
    }

    // Sort
    if (sortBy === 'price_asc') {
      list.sort((a, b) => a.pricePerUnit - b.pricePerUnit);
    } else if (sortBy === 'price_desc') {
      list.sort((a, b) => b.pricePerUnit - a.pricePerUnit);
    } else {
      // Latest
      list.sort((a, b) => b.listedAt - a.listedAt);
    }

    res.json({
      success: true,
      listings: list,
      taxRate: marketTaxRate,
      stats: marketStats,
    });
  });

  // 4. GET /api/market/my-listings: Danh sách hàng ký gửi của bản thân
  app.get('/api/market/my-listings', (req, res) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    const user = resolveUserFromReq(req);
    if (!user) {
      res.status(401).json({ success: false, error: 'Chưa đăng nhập!' });
      return;
    }

    const myListings = Array.from(marketListings.values())
      .filter((l) => l.sellerId === user.id || l.sellerUsername === user.username)
      .sort((a, b) => b.listedAt - a.listedAt);

    res.json({
      success: true,
      listings: myListings,
    });
  });

  // 5. POST /api/market/list: Ký gửi vật phẩm lên Phường Thị
  app.post('/api/market/list', (req, res) => {
    const user = resolveUserFromReq(req);
    if (!user) {
      res.status(401).json({ success: false, error: 'Vui lòng đăng nhập để mở sạp hàng!' });
      return;
    }

    const { itemType, itemId, quantity = 1, pricePerUnit } = req.body;
    const qty = Math.max(1, parseInt(quantity, 10) || 1);
    const unitPrice = Math.max(1, parseInt(pricePerUnit, 10) || 1);

    // Limit active listings
    const userActiveCount = Array.from(marketListings.values()).filter(
      (l) => (l.sellerId === user.id || l.sellerUsername === user.username) && l.status === 'active'
    ).length;
    if (userActiveCount >= 8) {
      res.status(400).json({
        success: false,
        error: 'Đạo hữu đã mở tối đa 8 gian hàng ký gửi cùng lúc! Hãy chờ bán bớt hoặc thu hồi sạp.',
      });
      return;
    }

    // Check item in inventory
    const cult = user.cultivation || {};
    let itemMeta = ITEM_META[itemId];
    if (!itemMeta) {
      itemMeta = { name: itemId, icon: '📦', category: itemType as any };
    }

    if (itemType === 'herb') {
      const currentQty = cult.herbs?.[itemId] || 0;
      if (currentQty < qty) {
        res.status(400).json({ success: false, error: `Số lượng ${itemMeta.name} trong túi không đủ (${currentQty}/${qty})!` });
        return;
      }
      cult.herbs[itemId] -= qty;
    } else if (itemType === 'pill') {
      const currentQty = cult.pillCount?.[itemId] || 0;
      if (currentQty < qty) {
        res.status(400).json({ success: false, error: `Số lượng ${itemMeta.name} trong túi không đủ (${currentQty}/${qty})!` });
        return;
      }
      cult.pillCount[itemId] -= qty;
    } else if (itemType === 'tea') {
      const currentQty = cult.teaInventory?.[itemId] || 0;
      if (currentQty < qty) {
        res.status(400).json({ success: false, error: `Số lượng ${itemMeta.name} trong túi không đủ (${currentQty}/${qty})!` });
        return;
      }
      cult.teaInventory[itemId] -= qty;
    } else {
      res.status(400).json({ success: false, error: 'Chủng loại vật phẩm không hợp lệ!' });
      return;
    }

    const listingId = 'lst_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
    const newListing: MarketListing = {
      id: listingId,
      sellerId: user.id,
      sellerUsername: user.username,
      sellerAvatar: user.avatar || '⚡',
      sellerFrame: user.frame || 'default',
      itemType: itemType as any,
      itemId,
      itemName: itemMeta.name,
      itemIcon: itemMeta.icon,
      quality: 'trung_pham',
      quantity: qty,
      pricePerUnit: unitPrice,
      totalPrice: unitPrice * qty,
      listedAt: Date.now(),
      expiresAt: Date.now() + 48 * 3600 * 1000, // 48h
      status: 'active',
    };

    marketListings.set(listingId, newListing);
    saveMarketData();
    saveUsersToFile();

    addMarketLog({
      type: 'list',
      actorUsername: user.username,
      details: `Ký gửi ${qty}x ${itemMeta.name} với giá ${unitPrice} LT/món (Tổng: ${newListing.totalPrice} LT).`,
      amount: newListing.totalPrice,
    });

    res.json({
      success: true,
      message: `Đã ký gửi thành công ${qty}x ${itemMeta.name} lên Phường Thị!`,
      listing: newListing,
      updatedCultivation: user.cultivation,
    });
  });

  // 6. POST /api/market/buy: Mua vật phẩm từ sạp của Đạo Hữu khác
  app.post('/api/market/buy', (req, res) => {
    const buyer = resolveUserFromReq(req);
    if (!buyer) {
      res.status(401).json({ success: false, error: 'Vui lòng đăng nhập để mua sắm trên Phường Thị!' });
      return;
    }

    const { listingId } = req.body;
    const listing = marketListings.get(listingId);
    if (!listing || listing.status !== 'active') {
      res.status(404).json({ success: false, error: 'Gian hàng này không còn tồn tại hoặc đã được bán!' });
      return;
    }

    if (listing.sellerId === buyer.id || listing.sellerUsername === buyer.username) {
      res.status(400).json({ success: false, error: 'Đạo hữu không thể tự mua vật phẩm do chính mình đăng bán!' });
      return;
    }

    const totalCost = listing.totalPrice;
    const buyerLinhThach = Number(buyer.cultivation?.linhThach) || 0;
    if (buyerLinhThach < totalCost) {
      res.status(400).json({
        success: false,
        error: `Linh Thạch không đủ! Cần ${totalCost.toLocaleString()} LT, đạo hữu hiện có ${buyerLinhThach.toLocaleString()} LT.`,
      });
      return;
    }

    // Calculate tax & seller payout
    const tax = Math.round(totalCost * marketTaxRate);
    const sellerPayout = totalCost - tax;

    // Deduct buyer
    buyer.cultivation.linhThach = buyerLinhThach - totalCost;

    // Credit buyer with item
    if (listing.itemType === 'herb') {
      if (!buyer.cultivation.herbs) buyer.cultivation.herbs = { uLan: 0, huyetTinh: 0, hoaAnh: 0, huyenThiet: 0, longTu: 0 };
      buyer.cultivation.herbs[listing.itemId] = (buyer.cultivation.herbs[listing.itemId] || 0) + listing.quantity;
    } else if (listing.itemType === 'pill') {
      if (!buyer.cultivation.pillCount) buyer.cultivation.pillCount = { thoNguyen: 0, hoTam: 0, phaCanh: 0 };
      buyer.cultivation.pillCount[listing.itemId] = (buyer.cultivation.pillCount[listing.itemId] || 0) + listing.quantity;
    } else if (listing.itemType === 'tea') {
      if (!buyer.cultivation.teaInventory) buyer.cultivation.teaInventory = {};
      buyer.cultivation.teaInventory[listing.itemId] = (buyer.cultivation.teaInventory[listing.itemId] || 0) + listing.quantity;
    }

    // Credit seller
    let seller = serverUsers.get(listing.sellerId);
    if (!seller) {
      seller = Array.from(serverUsers.values()).find((u) => u.username === listing.sellerUsername);
    }
    if (seller) {
      if (!seller.cultivation) seller.cultivation = {};
      seller.cultivation.linhThach = (Number(seller.cultivation.linhThach) || 0) + sellerPayout;
      if (!Array.isArray(seller.cultivation.historyLog)) seller.cultivation.historyLog = [];
      seller.cultivation.historyLog.unshift(
        `[Phường Thị] Đạo hữu @${buyer.username} đã mua ${listing.quantity}x ${listing.itemName}. Thu về +${sellerPayout.toLocaleString()} Linh Thạch (Thuế 5%: ${tax} LT).`
      );
      if (seller.cultivation.historyLog.length > 50) seller.cultivation.historyLog.pop();
    }

    // Update listing
    listing.status = 'sold';
    listing.buyerId = buyer.id;
    listing.buyerUsername = buyer.username;
    listing.soldAt = Date.now();

    // Stats
    marketStats.totalVolume += totalCost;
    marketStats.totalTaxBurned += tax;
    marketStats.totalTradesCount += 1;

    saveMarketData();
    saveUsersToFile();

    addMarketLog({
      type: 'buy',
      actorUsername: buyer.username,
      targetUsername: listing.sellerUsername,
      details: `@${buyer.username} đã mua ${listing.quantity}x ${listing.itemName} từ @${listing.sellerUsername} giá ${totalCost} LT (Thuế sàn thiêu hủy: ${tax} LT).`,
      amount: totalCost,
    });

    res.json({
      success: true,
      message: `Đã mua thành công ${listing.quantity}x ${listing.itemName} từ @${listing.sellerUsername}!`,
      updatedCultivation: buyer.cultivation,
    });
  });

  // 7. POST /api/market/cancel: Thu hồi sạp hàng
  app.post('/api/market/cancel', (req, res) => {
    const user = resolveUserFromReq(req);
    if (!user) {
      res.status(401).json({ success: false, error: 'Chưa đăng nhập!' });
      return;
    }

    const { listingId } = req.body;
    const listing = marketListings.get(listingId);
    if (!listing || listing.status !== 'active') {
      res.status(404).json({ success: false, error: 'Gian hàng không tồn tại hoặc đã giao dịch xong!' });
      return;
    }

    if (listing.sellerId !== user.id && listing.sellerUsername !== user.username) {
      res.status(403).json({ success: false, error: 'Đạo hữu không thể hủy gian hàng của người khác!' });
      return;
    }

    returnItemsToSeller(user, listing);
    listing.status = 'cancelled';

    saveMarketData();
    saveUsersToFile();

    addMarketLog({
      type: 'cancel',
      actorUsername: user.username,
      details: `Hủy gian hàng ký gửi ${listing.quantity}x ${listing.itemName}. Đã hoàn trả vào túi đồ.`,
    });

    res.json({
      success: true,
      message: `Đã thu hồi sạp hàng và nhận lại ${listing.quantity}x ${listing.itemName}!`,
      updatedCultivation: user.cultivation,
    });
  });

  // ==========================================
  // ADMIN CONTROL ENDPOINTS (ĐẠI ĐIỆN QUẢN TRỊ)
  // ==========================================

  // 8. GET /api/admin/economy/overview: Bảng điều hành kinh tế vĩ mô
  app.get('/api/admin/economy/overview', (req, res) => {
    const adminUser = resolveUserFromReq(req);
    if (!isUserAdmin(adminUser)) {
      res.status(403).json({ success: false, error: 'Chỉ Quản Trị Viên mới có quyền xem!' });
      return;
    }

    let totalCirculatingLinhThach = 0;
    const userRankings: {
      userId: string;
      username: string;
      avatar: string;
      frame: string;
      linhThach: number;
      realmName?: string;
    }[] = [];

    for (const u of serverUsers.values()) {
      const lt = Number(u.cultivation?.linhThach) || 0;
      totalCirculatingLinhThach += lt;
      userRankings.push({
        userId: u.id,
        username: u.username,
        avatar: u.avatar || '⚡',
        frame: u.frame || 'default',
        linhThach: lt,
        realmName: u.cultivation?.realmName || 'Luyện Khí Kỳ',
      });
    }

    userRankings.sort((a, b) => b.linhThach - a.linhThach);

    const activeListingsCount = Array.from(marketListings.values()).filter(
      (l) => l.status === 'active'
    ).length;

    res.json({
      success: true,
      totalCirculatingLinhThach,
      topRichest: userRankings.slice(0, 10),
      stats: marketStats,
      taxRate: marketTaxRate,
      activeListingsCount,
      totalListingsCount: marketListings.size,
    });
  });

  // 9. POST /api/admin/economy/adjust-linh-thach: Cấp phát (+) hoặc Thu hồi (-) Linh Thạch
  app.post('/api/admin/economy/adjust-linh-thach', (req, res) => {
    const adminUser = resolveUserFromReq(req);
    if (!isUserAdmin(adminUser) || !adminUser) {
      res.status(403).json({ success: false, error: 'Chỉ Quản Trị Viên mới có quyền thực hiện!' });
      return;
    }

    const { targetUsername, amount, reason } = req.body;
    const delta = parseInt(amount, 10);
    if (isNaN(delta) || delta === 0) {
      res.status(400).json({ success: false, error: 'Số lượng Linh Thạch không hợp lệ!' });
      return;
    }

    const searchKey = String(targetUsername || '').trim().toLowerCase();
    const target = Array.from(serverUsers.values()).find(
      (u) =>
        u.username.toLowerCase() === searchKey ||
        (u.displayName && u.displayName.toLowerCase() === searchKey) ||
        u.id.toLowerCase() === searchKey
    );
    if (!target) {
      res.status(404).json({ success: false, error: `Không tìm thấy đạo hữu có tên @${targetUsername}!` });
      return;
    }

    if (!target.cultivation) target.cultivation = {};
    const oldBalance = Number(target.cultivation.linhThach) || 0;
    const newBalance = Math.max(0, oldBalance + delta);
    target.cultivation.linhThach = newBalance;

    const targetDisplayName = target.displayName || target.username;
    const adminDisplayName = adminUser.displayName || adminUser.username;

    if (!Array.isArray(target.cultivation.historyLog)) target.cultivation.historyLog = [];
    target.cultivation.historyLog.unshift(
      `[Thiên Đạo Ban Thưởng/Thu Hồi] Quản Trị Viên đã ${delta > 0 ? 'cấp phát +' : 'thu hồi '}${Math.abs(delta).toLocaleString()} Linh Thạch. Lý do: ${reason || 'Điều chỉnh hệ thống'}. Số dư mới: ${newBalance.toLocaleString()} LT.`
    );
    if (target.cultivation.historyLog.length > 50) target.cultivation.historyLog.pop();

    saveUsersToFile();

    addMarketLog({
      type: delta > 0 ? 'admin_grant' : 'admin_deduct',
      actorUsername: adminDisplayName,
      targetUsername: targetDisplayName,
      details: `Admin @${adminDisplayName} đã ${delta > 0 ? 'cấp +' : 'thu hồi '}${Math.abs(delta)} LT của @${targetDisplayName}. Lý do: ${reason || 'N/A'}.`,
      amount: Math.abs(delta),
    });

    res.json({
      success: true,
      message: `Đã ${delta > 0 ? 'cấp phát' : 'thu hồi'} thành công ${Math.abs(delta).toLocaleString()} Linh Thạch của @${targetDisplayName}!`,
      newBalance,
    });
  });

  // 10. POST /api/admin/economy/tax-rate: Thay đổi thuế sàn Phường Thị
  app.post('/api/admin/economy/tax-rate', (req, res) => {
    const adminUser = resolveUserFromReq(req);
    if (!isUserAdmin(adminUser) || !adminUser) {
      res.status(403).json({ success: false, error: 'Chỉ Quản Trị Viên mới có quyền thực hiện!' });
      return;
    }

    const { taxRate } = req.body;
    const rate = parseFloat(taxRate);
    if (isNaN(rate) || rate < 0 || rate > 0.25) {
      res.status(400).json({ success: false, error: 'Mức thuế không hợp lệ (Phải từ 0% đến 25%)!' });
      return;
    }

    marketTaxRate = rate;
    saveMarketData();

    addMarketLog({
      type: 'admin_takedown',
      actorUsername: adminUser.username,
      details: `Admin @${adminUser.username} đã điều chỉnh mức thuế sàn Phường Thị thành ${(rate * 100).toFixed(1)}%.`,
    });

    res.json({
      success: true,
      message: `Đã cập nhật thuế sàn thành ${(rate * 100).toFixed(1)}%!`,
      taxRate: marketTaxRate,
    });
  });

  // 11. POST /api/admin/market/takedown: Admin cưỡng chế gỡ bỏ gian hàng gian lận
  app.post('/api/admin/market/takedown', (req, res) => {
    const adminUser = resolveUserFromReq(req);
    if (!isUserAdmin(adminUser) || !adminUser) {
      res.status(403).json({ success: false, error: 'Chỉ Quản Trị Viên mới có quyền thực hiện!' });
      return;
    }

    const { listingId, reason = 'Vi phạm quy tắc Phường Thị' } = req.body;
    const listing = marketListings.get(listingId);
    if (!listing) {
      res.status(404).json({ success: false, error: 'Không tìm thấy gian hàng!' });
      return;
    }

    const seller = serverUsers.get(listing.sellerId) || Array.from(serverUsers.values()).find(u => u.username === listing.sellerUsername);
    if (seller) {
      returnItemsToSeller(seller, listing);
      if (!Array.isArray(seller.cultivation?.historyLog)) seller.cultivation.historyLog = [];
      seller.cultivation.historyLog.unshift(
        `[Cảnh Báo Admin] Gian hàng #${listing.id} (${listing.quantity}x ${listing.itemName}) đã bị cưỡng chế thu hồi. Lý do: ${reason}. Vật phẩm đã được hoàn trả.`
      );
      saveUsersToFile();
    }

    listing.status = 'takedown_by_admin';
    saveMarketData();

    addMarketLog({
      type: 'admin_takedown',
      actorUsername: adminUser.username,
      targetUsername: listing.sellerUsername,
      details: `Admin cưỡng chế gỡ bỏ sạp #${listing.id} của @${listing.sellerUsername}. Lý do: ${reason}.`,
    });

    res.json({
      success: true,
      message: `Đã cưỡng chế gỡ bỏ sạp hàng và hoàn trả vật phẩm về cho @${listing.sellerUsername}!`,
    });
  });

  // 12. POST /api/admin/shop/update-item: Chỉnh sửa giá, giới hạn, bật/tắt vật phẩm Vạn Bảo Các
  app.post('/api/admin/shop/update-item', (req, res) => {
    const adminUser = resolveUserFromReq(req);
    if (!isUserAdmin(adminUser)) {
      res.status(403).json({ success: false, error: 'Chỉ Quản Trị Viên mới có quyền thực hiện!' });
      return;
    }

    const { itemId, price, dailyLimit, discountPercent, enabled } = req.body;
    const item = shopCatalog.find((it) => it.id === itemId);
    if (!item) {
      res.status(404).json({ success: false, error: 'Không tìm thấy vật phẩm trong Vạn Bảo Các!' });
      return;
    }

    if (price !== undefined) item.price = Math.max(1, parseInt(price, 10) || 1);
    if (dailyLimit !== undefined) item.dailyLimit = Math.max(0, parseInt(dailyLimit, 10) || 0);
    if (discountPercent !== undefined) {
      item.discountPercent = Math.max(0, Math.min(90, parseInt(discountPercent, 10) || 0));
    }
    if (enabled !== undefined) item.enabled = Boolean(enabled);

    saveShopConfigData();

    res.json({
      success: true,
      message: `Đã cập nhật cấu hình cho ${item.name}!`,
      item,
    });
  });

  // 13. GET /api/admin/economy/logs: Sổ cái kiểm toán giao dịch
  app.get('/api/admin/economy/logs', (req, res) => {
    const adminUser = resolveUserFromReq(req);
    if (!isUserAdmin(adminUser)) {
      res.status(403).json({ success: false, error: 'Chỉ Quản Trị Viên mới có quyền xem sổ cái!' });
      return;
    }

    res.json({
      success: true,
      logs: marketLogs,
    });
  });
}
