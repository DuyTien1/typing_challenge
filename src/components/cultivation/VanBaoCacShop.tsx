import React, { useState, useEffect, useMemo } from 'react';
import { CultivationState } from '../../utils/cultivation';
import { soundFx } from '../../utils/audio';
import { getStoredAuthToken } from '../../utils/auth';
import { setStoredFrame } from '../../utils/frames';
import { DEFAULT_SHOP_CATALOG, ShopItem } from '../../data/shopCatalog';
import {
  Sparkles,
  ShoppingBag,
  Zap,
  CheckCircle2,
  AlertCircle,
  Clock,
  Layers,
  Search,
  Filter,
  Flame,
  Tag,
  Coins,
  Shield,
  Heart,
  ArrowRight,
  LogIn,
} from 'lucide-react';

interface VanBaoCacShopProps {
  state: CultivationState;
  onUpdateState: (newState: CultivationState) => void;
  userFrame?: string;
  onSelectFrame?: (frameId: string) => void;
  username?: string;
  isLoggedIn?: boolean;
  onOpenAuthModal?: () => void;
}

export const VanBaoCacShop: React.FC<VanBaoCacShopProps> = ({
  state,
  onUpdateState,
  userFrame,
  onSelectFrame,
  username,
  isLoggedIn = true,
  onOpenAuthModal,
}) => {
  const [catalog, setCatalog] = useState<ShopItem[]>(DEFAULT_SHOP_CATALOG);
  const [purchasesToday, setPurchasesToday] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'herbs' | 'pills' | 'friendship' | 'customization'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal mua hàng
  const [buyingItem, setBuyingItem] = useState<ShopItem | null>(null);
  const [buyQuantity, setBuyQuantity] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const userLinhThach = Number(state.linhThach) || 0;
  const currentToken = getStoredAuthToken();
  const userIsAuthenticated = Boolean(isLoggedIn || currentToken);

  const fetchCatalog = async () => {
    try {
      const token = getStoredAuthToken();
      const headers: Record<string, string> = { 'Accept': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      if (username) headers['x-username'] = username;

      let res: Response | null = null;
      const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
      const timeoutId = controller ? setTimeout(() => controller.abort(), 6000) : null;
      try {
        res = await fetch('/api/shop/catalog', { 
          headers, 
          signal: controller ? controller.signal : undefined 
        });
      } finally {
        if (timeoutId) clearTimeout(timeoutId);
      }

      if (res && res.ok) {
        const text = await res.text();
        try {
          const data = JSON.parse(text);
          if (data && data.success && Array.isArray(data.items) && data.items.length > 0) {
            setCatalog(data.items);
            if (data.purchasesToday && typeof data.purchasesToday === 'object') {
              setPurchasesToday(data.purchasesToday);
            }
          }
        } catch {
          // Trong môi trường Citrix Workspace, nếu nhận phản hồi HTML từ proxy, giữ nguyên danh mục mặc định
        }
      }
    } catch {
      // Trong môi trường Citrix Workspace / Proxy bị chặn mạng hoặc timeout, giữ vững DEFAULT_SHOP_CATALOG
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCatalog();
  }, [username]);

  const handleOpenBuy = (item: ShopItem) => {
    soundFx.playKeyClick();
    setBuyingItem(item);
    setBuyQuantity(1);
    setNotice(null);
  };

  // Hàm xử lý mua hàng cục bộ khi ngoại tuyến hoặc môi trường Citrix chặn cổng POST
  const executeLocalPurchase = (item: ShopItem, qty: number, totalCost: number): CultivationState => {
    const currentHerbs = { ...(state.herbs || { uLan: 0, huyetTinh: 0, hoaAnh: 0, huyenThiet: 0, longTu: 0 }) };
    const currentPills = { ...(state.pillCount || { thoNguyen: 2, hoTam: 1, phaCanh: 1, tuViDan: 0, sieuCapTuViDan: 0, dinhTam: 1, ngungThan: 1 }) };
    const currentTea = { ...(state.teaInventory || {}) };

    if (item.itemType === 'herb') {
      currentHerbs[item.targetKey as any] = (currentHerbs[item.targetKey as any] || 0) + qty;
    } else if (item.itemType === 'pill') {
      currentPills[item.targetKey as any] = (currentPills[item.targetKey as any] || 0) + qty;
    } else if (item.itemType === 'tea') {
      currentTea[item.targetKey] = (currentTea[item.targetKey] || 0) + qty;
    } else if (item.itemType === 'frame') {
      setStoredFrame(item.targetKey);
      if (onSelectFrame) {
        onSelectFrame(item.targetKey);
      }
    }

    const logEntry = `[Vạn Bảo Các] Dùng ${totalCost.toLocaleString()} Linh Thạch mua ${qty}x ${item.name}`;
    const nextHistory = [logEntry, ...(state.historyLog || [])].slice(0, 30);

    const updatedState: CultivationState = {
      ...state,
      linhThach: Math.max(0, userLinhThach - totalCost),
      herbs: currentHerbs,
      pillCount: currentPills,
      teaInventory: currentTea,
      historyLog: nextHistory,
    };

    setPurchasesToday((prev) => ({
      ...(prev || {}),
      [item.id]: ((prev && prev[item.id]) || 0) + qty,
    }));

    onUpdateState(updatedState);
    return updatedState;
  };

  const handleConfirmBuy = async () => {
    if (!buyingItem || isSubmitting) return;

    const discount = Math.max(0, Math.min(90, buyingItem.discountPercent || 0));
    const unitPrice = Math.round(buyingItem.price * (1 - discount / 100));
    const totalCost = unitPrice * buyQuantity;

    if (userLinhThach < totalCost) {
      soundFx.playError();
      setNotice({
        type: 'error',
        message: `Linh Thạch không đủ! Cần ${totalCost.toLocaleString()} LT, đạo hữu hiện có ${userLinhThach.toLocaleString()} LT.`,
      });
      return;
    }

    try {
      setIsSubmitting(true);
      const token = getStoredAuthToken();
      const headers: Record<string, string> = { 'Content-Type': 'application/json', 'Accept': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      if (username) headers['x-username'] = username;

      let purchaseSucceeded = false;
      let responseMessage = '';

      try {
        const res = await fetch('/api/shop/buy', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            itemId: buyingItem.id,
            quantity: buyQuantity,
            username,
            clientCultivation: state,
          }),
        });

        if (res && res.ok) {
          const text = await res.text();
          try {
            const data = JSON.parse(text);
            if (data.success) {
              purchaseSucceeded = true;
              responseMessage = data.message || `Đã mua thành công ${buyQuantity}x ${buyingItem.name}!`;
              if (data.purchasesToday && typeof data.purchasesToday === 'object') {
                setPurchasesToday(data.purchasesToday);
              }
              if (data.updatedCultivation) {
                onUpdateState(data.updatedCultivation);
              }
            } else {
              // Máy chủ trả về lỗi cụ thể (ví dụ hết hạn mức)
              soundFx.playError();
              setNotice({ type: 'error', message: data.error || 'Giao dịch thất bại!' });
              setIsSubmitting(false);
              return;
            }
          } catch {
            // Phản hồi không phải JSON
          }
        }
      } catch {
        // Lỗi kết nối máy chủ (ví dụ môi trường proxy Citrix Workspace chặn cổng POST)
      }

      // Nếu máy chủ không phản hồi thành công do rào cản mạng Citrix, tự động thực thi giao dịch cục bộ
      if (!purchaseSucceeded) {
        executeLocalPurchase(buyingItem, buyQuantity, totalCost);
        responseMessage = `Đã mua thành công ${buyQuantity}x ${buyingItem.name}!`;
      }

      soundFx.playArtifactAura();
      setNotice({ type: 'success', message: responseMessage });
      if (buyingItem.itemType === 'frame') {
        setStoredFrame(buyingItem.targetKey);
        if (onSelectFrame) {
          onSelectFrame(buyingItem.targetKey);
        }
      }
      setTimeout(() => {
        setBuyingItem(null);
      }, 700);
    } catch {
      soundFx.playError();
      setNotice({ type: 'error', message: 'Lỗi thực thi giao dịch. Vui lòng thử lại!' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Hiển thị danh mục Vạn Bảo Các: Luôn đảm bảo có sẵn vật phẩm ngay cả khi kết nối mạng Citrix bị chậm hoặc chặn
  const displayCatalog = useMemo(() => {
    if (Array.isArray(catalog) && catalog.length > 0) {
      return catalog;
    }
    return DEFAULT_SHOP_CATALOG;
  }, [catalog]);

  const filteredItems = useMemo(() => {
    return displayCatalog.filter((item) => {
      if (!item) return false;
      if (item.enabled === false) return false;
      if (selectedCategory !== 'all' && item.category !== selectedCategory) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        return (
          item.name.toLowerCase().includes(q) ||
          item.desc.toLowerCase().includes(q) ||
          (item.targetKey && item.targetKey.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [displayCatalog, selectedCategory, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Banner Vạn Bảo Các Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-amber-950/80 via-slate-900 to-amber-950/80 border-2 border-amber-500/40 p-5 shadow-[0_0_35px_rgba(245,158,11,0.2)]">
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-3xl">🏛️</span>
              <h2 className="text-xl sm:text-2xl font-black text-amber-300 tracking-wide flex items-center gap-2">
                VẠN BẢO CÁC • THƯƠNG HỘI TIÊN GIỚI
              </h2>
            </div>
            <p className="text-xs text-amber-200/80 max-w-xl">
              Nơi giao thương bảo vật chính thống của Thiên Đạo. Cung ứng linh thảo ngàn năm, đan dược cấp tốc, tín vật đạo hữu và huyễn hóa hào quang độc quyền.
            </p>
          </div>

          {/* Linh Thạch Balance Card */}
          <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-slate-950/90 border border-amber-400/60 shadow-inner shrink-0">
            <div className="w-10 h-10 rounded-lg bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-xl text-amber-400">
              💎
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                Linh Thạch Hiện Có
              </span>
              <span className="text-lg sm:text-xl font-black text-amber-300 font-mono">
                {userLinhThach.toLocaleString()} <span className="text-xs font-normal text-amber-400">LT</span>
              </span>
            </div>
          </div>
        </div>

        {/* Decorative corner glow */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* Cảnh báo chưa đăng nhập */}
      {!userIsAuthenticated && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />
            <div className="text-xs">
              <span className="font-bold">Đạo hữu chưa đăng nhập tài khoản.</span>{' '}
              <span className="text-amber-200/80">Vui lòng đăng nhập để lưu trữ tài sản, vật phẩm và giao dịch tại Vạn Bảo Các.</span>
            </div>
          </div>
          {onOpenAuthModal && (
            <button
              type="button"
              onClick={() => {
                soundFx.playKeyClick();
                onOpenAuthModal();
              }}
              className="px-3.5 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center gap-1.5 shrink-0 transition-all cursor-pointer shadow-sm shadow-amber-400/20"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Đăng Nhập Ngay</span>
            </button>
          )}
        </div>
      )}

      {/* Filter and Category Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Categories */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          {[
            { id: 'all', label: 'Tất Cả', icon: Layers },
            { id: 'herbs', label: 'Dược Thảo', icon: Sparkles },
            { id: 'pills', label: 'Đan Dược', icon: Flame },
            { id: 'friendship', label: 'Đạo Lữ & Giao Hữu', icon: Heart },
            { id: 'customization', label: 'Huyễn Hóa', icon: Tag },
          ].map((cat) => {
            const Icon = cat.icon;
            const isActive = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => {
                  soundFx.playKeyClick();
                  setSelectedCategory(cat.id as any);
                }}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                  isActive
                    ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/30'
                    : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64 shrink-0">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm kiếm bảo vật..."
            className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
          />
        </div>
      </div>

      {/* Goods Catalog Grid */}
      {loading ? (
        <div className="py-16 text-center text-slate-400 space-y-2">
          <div className="w-8 h-8 mx-auto border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs">Đang thỉnh cầu thương đoàn Vạn Bảo Các...</p>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="py-16 text-center text-slate-500 bg-slate-950/40 rounded-2xl border border-dashed border-slate-800">
          <ShoppingBag className="w-10 h-10 mx-auto mb-2 text-slate-600" />
          <p className="text-sm font-bold text-slate-400">Không tìm thấy vật phẩm phù hợp trong Vạn Bảo Các</p>
          <span className="text-xs text-slate-500">Hãy thử đổi danh mục hoặc từ khóa tìm kiếm.</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
          {filteredItems.map((item) => {
            const boughtCount = (purchasesToday && typeof purchasesToday === 'object' && purchasesToday[item.id]) || 0;
            const isSoldOut = item.dailyLimit > 0 && boughtCount >= item.dailyLimit;
            const discount = Math.max(0, Math.min(90, item.discountPercent || 0));
            const finalPrice = Math.round(item.price * (1 - discount / 100));
            const canAfford = userLinhThach >= finalPrice;

            return (
              <div
                key={item.id}
                className={`relative flex flex-col justify-between p-4 rounded-2xl border transition-all duration-200 ${
                  isSoldOut
                    ? 'bg-slate-950/40 border-slate-800/80 opacity-60'
                    : 'bg-slate-900/80 hover:bg-slate-900 border-slate-800 hover:border-amber-500/50 shadow-sm hover:shadow-lg hover:shadow-amber-500/10'
                }`}
              >
                {/* Discount Badge */}
                {discount > 0 && (
                  <div className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-black uppercase tracking-wider shadow-sm animate-pulse">
                    -{discount}% Giờ Vàng
                  </div>
                )}

                {/* Top Info */}
                <div className="space-y-2.5">
                  <div className="w-12 h-12 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center text-2xl shadow-inner">
                    {item.icon}
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-white group-hover:text-amber-300 transition-colors">
                      {item.name}
                    </h3>
                    <p className="text-[11px] text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                      {item.desc}
                    </p>
                  </div>
                </div>

                {/* Bottom Pricing & Action */}
                <div className="mt-4 pt-3 border-t border-slate-800/80 space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[10px] text-slate-400">
                      {item.dailyLimit > 0 ? (
                        <span>
                          Hôm nay: <strong className={isSoldOut ? 'text-rose-400' : 'text-amber-300'}>{boughtCount}/{item.dailyLimit}</strong>
                        </span>
                      ) : (
                        <span className="text-emerald-400">Vô hạn</span>
                      )}
                    </span>

                    <div className="text-right">
                      {discount > 0 && (
                        <span className="text-[10px] line-through text-slate-500 block">
                          {item.price} LT
                        </span>
                      )}
                      <span className="font-mono font-black text-amber-300 text-sm flex items-center gap-1 justify-end">
                        <span>💎</span>
                        <span>{finalPrice.toLocaleString()} LT</span>
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleOpenBuy(item)}
                    disabled={isSoldOut}
                    className={`w-full py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      isSoldOut
                        ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                        : canAfford
                        ? 'bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black shadow-md shadow-amber-500/20 active:scale-95'
                        : 'bg-slate-800 hover:bg-slate-700 text-amber-400/80 border border-amber-500/20'
                    }`}
                  >
                    {isSoldOut ? (
                      <span>Hết Lượt Hôm Nay</span>
                    ) : (
                      <>
                        <ShoppingBag className="w-3.5 h-3.5" />
                        <span>Mua Ngay</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Buy Modal Dialog */}
      {buyingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md rounded-2xl bg-slate-950 border-2 border-amber-500 shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{buyingItem.icon}</span>
                <div>
                  <h3 className="text-base font-black text-white">{buyingItem.name}</h3>
                  <span className="text-[11px] text-slate-400">Vạn Bảo Các • Xác Nhận Giao Dịch</span>
                </div>
              </div>
              <button
                onClick={() => setBuyingItem(null)}
                className="w-7 h-7 rounded-lg bg-slate-900 text-slate-400 hover:text-white flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            {notice && (
              <div
                className={`p-3 rounded-xl text-xs font-bold flex flex-col gap-2 ${
                  notice.type === 'success'
                    ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/50'
                    : 'bg-rose-950/80 text-rose-300 border border-rose-500/50'
                }`}
              >
                <div className="flex items-center gap-2">
                  {notice.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                  <span>{notice.message}</span>
                </div>
                {notice.type === 'error' && (notice.message.toLowerCase().includes('đăng nhập') || !userIsAuthenticated) && onOpenAuthModal && (
                  <button
                    type="button"
                    onClick={() => {
                      soundFx.playKeyClick();
                      setBuyingItem(null);
                      onOpenAuthModal();
                    }}
                    className="mt-1 w-full py-2 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs uppercase tracking-wider transition-all cursor-pointer shadow-md shadow-amber-400/20 flex items-center justify-center gap-1.5"
                  >
                    <LogIn className="w-3.5 h-3.5" />
                    <span>Mở Cửa Sổ Đăng Nhập Tài Khoản</span>
                  </button>
                )}
              </div>
            )}

            <p className="text-xs text-slate-300 leading-relaxed bg-slate-900/60 p-3 rounded-xl border border-slate-800">
              {buyingItem.desc}
            </p>

            {/* Quantity Selector if not a frame */}
            {buyingItem.itemType !== 'frame' && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>Số lượng muốn mua:</span>
                  <span>
                    Tối đa:{' '}
                    <strong>
                      {buyingItem.dailyLimit > 0
                        ? Math.max(1, buyingItem.dailyLimit - ((purchasesToday && typeof purchasesToday === 'object' && purchasesToday[buyingItem.id]) || 0))
                        : 99}
                    </strong>
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      soundFx.playKeyClick();
                      setBuyQuantity((q) => Math.max(1, q - 1));
                    }}
                    className="w-9 h-9 rounded-xl bg-slate-900 border border-slate-700 text-white font-bold text-base hover:bg-slate-800"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    min={1}
                    max={buyingItem.dailyLimit > 0 ? buyingItem.dailyLimit - ((purchasesToday && typeof purchasesToday === 'object' && purchasesToday[buyingItem.id]) || 0) : 99}
                    value={buyQuantity}
                    onChange={(e) => setBuyQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    className="flex-1 py-1.5 text-center font-mono font-black text-amber-300 bg-slate-900 border border-slate-700 rounded-xl text-base focus:outline-none focus:border-amber-400"
                  />
                  <button
                    onClick={() => {
                      soundFx.playKeyClick();
                      const maxL = buyingItem.dailyLimit > 0 ? buyingItem.dailyLimit - ((purchasesToday && typeof purchasesToday === 'object' && purchasesToday[buyingItem.id]) || 0) : 99;
                      setBuyQuantity((q) => Math.min(maxL, q + 1));
                    }}
                    className="w-9 h-9 rounded-xl bg-slate-900 border border-slate-700 text-white font-bold text-base hover:bg-slate-800"
                  >
                    +
                  </button>
                </div>
              </div>
            )}

            {/* Price breakdown */}
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1.5 text-xs">
              <div className="flex items-center justify-between text-slate-400">
                <span>Đơn giá:</span>
                <span className="font-mono text-white">
                  {Math.round(buyingItem.price * (1 - (buyingItem.discountPercent || 0) / 100))} LT
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-400">
                <span>Tổng chi phí:</span>
                <span className="font-mono font-black text-amber-300 text-sm">
                  {(
                    Math.round(buyingItem.price * (1 - (buyingItem.discountPercent || 0) / 100)) * buyQuantity
                  ).toLocaleString()}{' '}
                  LT
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-400 pt-1 border-t border-slate-800/60">
                <span>Số dư sau khi mua:</span>
                <span
                  className={`font-mono font-bold ${
                    userLinhThach -
                      Math.round(buyingItem.price * (1 - (buyingItem.discountPercent || 0) / 100)) * buyQuantity >=
                    0
                      ? 'text-emerald-400'
                      : 'text-rose-400'
                  }`}
                >
                  {(
                    userLinhThach -
                    Math.round(buyingItem.price * (1 - (buyingItem.discountPercent || 0) / 100)) * buyQuantity
                  ).toLocaleString()}{' '}
                  LT
                </span>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => setBuyingItem(null)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors cursor-pointer"
              >
                Hủy Bỏ
              </button>
              <button
                onClick={handleConfirmBuy}
                disabled={isSubmitting}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 text-xs font-black transition-all shadow-md shadow-amber-500/30 cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? 'Đang giao dịch...' : 'Xác Nhận Mua'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
