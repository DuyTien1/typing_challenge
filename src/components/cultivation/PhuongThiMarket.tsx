import React, { useState, useEffect } from 'react';
import { CultivationState } from '../../utils/cultivation';
import { soundFx } from '../../utils/audio';
import { getStoredAuthToken } from '../../utils/auth';
import {
  Scale,
  Store,
  PlusCircle,
  Clock,
  Sparkles,
  Search,
  Filter,
  ArrowUpDown,
  Coins,
  CheckCircle2,
  AlertCircle,
  ShoppingBag,
  Trash2,
  Tag,
  Flame,
  ShieldCheck,
  User,
} from 'lucide-react';

interface MarketListing {
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

interface PhuongThiMarketProps {
  state: CultivationState;
  onUpdateState: (newState: CultivationState) => void;
  username?: string;
}

export const PhuongThiMarket: React.FC<PhuongThiMarketProps> = ({
  state,
  onUpdateState,
  username,
}) => {
  const [subTab, setSubTab] = useState<'browse' | 'my_listings' | 'create_listing'>('browse');
  const [listings, setListings] = useState<MarketListing[]>([]);
  const [myListings, setMyListings] = useState<MarketListing[]>([]);
  const [taxRate, setTaxRate] = useState<number>(0.05);
  const [loading, setLoading] = useState(true);

  // Filters
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'herb' | 'pill' | 'tea'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'latest' | 'price_asc' | 'price_desc'>('latest');

  // Modal Mua Hàng
  const [selectedListing, setSelectedListing] = useState<MarketListing | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Form Đăng Bán
  const [sellItemType, setSellItemType] = useState<'herb' | 'pill' | 'tea'>('herb');
  const [sellItemId, setSellItemId] = useState<string>('uLan');
  const [sellQuantity, setSellQuantity] = useState<number>(1);
  const [sellPricePerUnit, setSellPricePerUnit] = useState<number>(50);

  const userLinhThach = Number(state.linhThach) || 0;

  // Lấy danh sách hàng hóa
  const fetchMarketListings = async () => {
    try {
      setLoading(true);
      const query = new URLSearchParams();
      if (categoryFilter !== 'all') query.append('category', categoryFilter);
      if (searchQuery.trim()) query.append('search', searchQuery.trim());
      query.append('sortBy', sortBy);

      const res = await fetch(`/api/market/listings?${query.toString()}`);
      const data = await res.json();
      if (data.success) {
        setListings(data.listings || []);
        if (typeof data.taxRate === 'number') setTaxRate(data.taxRate);
      }
    } catch (err) {
      console.error('Failed to load market listings:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMyListings = async () => {
    try {
      const token = getStoredAuthToken();
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      if (username) headers['x-username'] = username;

      const res = await fetch('/api/market/my-listings', { headers });
      const data = await res.json();
      if (data.success) {
        setMyListings(data.listings || []);
      }
    } catch (err) {
      console.error('Failed to load my listings:', err);
    }
  };

  useEffect(() => {
    if (subTab === 'browse') {
      fetchMarketListings();
    } else if (subTab === 'my_listings') {
      fetchMyListings();
    }
  }, [subTab, categoryFilter, sortBy, username]);

  // Xử lý Mua hàng
  const handleConfirmBuy = async () => {
    if (!selectedListing || isProcessing) return;

    if (userLinhThach < selectedListing.totalPrice) {
      soundFx.playError();
      setNotice({
        type: 'error',
        message: `Linh Thạch không đủ! Cần ${selectedListing.totalPrice.toLocaleString()} LT, hiện có ${userLinhThach.toLocaleString()} LT.`,
      });
      return;
    }

    try {
      setIsProcessing(true);
      const token = getStoredAuthToken();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      if (username) headers['x-username'] = username;

      const res = await fetch('/api/market/buy', {
        method: 'POST',
        headers,
        body: JSON.stringify({ listingId: selectedListing.id, username }),
      });
      const data = await res.json();

      if (data.success) {
        soundFx.playVictory();
        setNotice({ type: 'success', message: data.message });
        if (data.updatedCultivation) {
          onUpdateState(data.updatedCultivation);
        }
        fetchMarketListings();
        setTimeout(() => {
          setSelectedListing(null);
        }, 1200);
      } else {
        soundFx.playError();
        setNotice({ type: 'error', message: data.error || 'Giao dịch thất bại!' });
      }
    } catch (err) {
      soundFx.playError();
      setNotice({ type: 'error', message: 'Lỗi kết nối tới máy chủ Phường Thị!' });
    } finally {
      setIsProcessing(false);
    }
  };

  // Xử lý Hủy sạp
  const handleCancelListing = async (listingId: string) => {
    soundFx.playKeyClick();
    if (!confirm('Đạo hữu có chắc chắn muốn thu hồi sạp hàng này không? Vật phẩm sẽ được hoàn trả về túi đồ.')) {
      return;
    }

    try {
      const token = getStoredAuthToken();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      if (username) headers['x-username'] = username;

      const res = await fetch('/api/market/cancel', {
        method: 'POST',
        headers,
        body: JSON.stringify({ listingId, username }),
      });
      const data = await res.json();
      if (data.success) {
        soundFx.playGuzhengNote();
        if (data.updatedCultivation) {
          onUpdateState(data.updatedCultivation);
        }
        fetchMyListings();
      } else {
        alert(data.error || 'Thu hồi thất bại!');
      }
    } catch (err) {
      alert('Lỗi kết nối máy chủ!');
    }
  };

  // Xử lý Đăng bán
  const handleCreateListing = async (e: React.FormEvent) => {
    e.preventDefault();
    if (sellQuantity <= 0 || sellPricePerUnit <= 0 || isProcessing) return;

    try {
      setIsProcessing(true);
      const token = getStoredAuthToken();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      if (username) headers['x-username'] = username;

      const res = await fetch('/api/market/list', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          itemType: sellItemType,
          itemId: sellItemId,
          quantity: sellQuantity,
          pricePerUnit: sellPricePerUnit,
          username,
        }),
      });
      const data = await res.json();

      if (data.success) {
        soundFx.playArtifactAura();
        alert(data.message);
        if (data.updatedCultivation) {
          onUpdateState(data.updatedCultivation);
        }
        setSubTab('my_listings');
      } else {
        soundFx.playError();
        alert(data.error || 'Ký gửi thất bại!');
      }
    } catch (err) {
      soundFx.playError();
      alert('Lỗi kết nối máy chủ!');
    } finally {
      setIsProcessing(false);
    }
  };

  // Lấy tồn kho hiện tại cho form đăng bán
  const currentAvailableInBag = (() => {
    if (sellItemType === 'herb') return state.herbs?.[sellItemId as keyof typeof state.herbs] || 0;
    if (sellItemType === 'pill') return state.pillCount?.[sellItemId as keyof typeof state.pillCount] || 0;
    if (sellItemType === 'tea') return (state as any).teaInventory?.[sellItemId] || 0;
    return 0;
  })();

  const estimatedTax = Math.round(sellQuantity * sellPricePerUnit * taxRate);
  const estimatedPayout = Math.max(0, sellQuantity * sellPricePerUnit - estimatedTax);

  return (
    <div className="space-y-6">
      {/* Phường Thị Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-950/80 via-slate-900 to-teal-950/80 border-2 border-emerald-500/40 p-5 shadow-[0_0_35px_rgba(16,185,129,0.2)]">
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-3xl">⚖️</span>
              <h2 className="text-xl sm:text-2xl font-black text-emerald-300 tracking-wide flex items-center gap-2">
                PHƯỜNG THỊ TU TIÊN • CHỢ TỰ DO P2P
              </h2>
            </div>
            <p className="text-xs text-emerald-200/80 max-w-xl">
              Nơi các bậc Đạo Hữu tự do mở sạp, ký gửi linh thảo, đan dược cực phẩm và giao thương bằng Linh Thạch. Thuế sàn {(taxRate * 100).toFixed(0)}% tự động thiêu hủy để bảo toàn giá trị tiền tệ.
            </p>
          </div>

          {/* User Linh Thạch Card */}
          <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-slate-950/90 border border-emerald-400/60 shadow-inner shrink-0">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-xl text-emerald-400">
              💎
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                Linh Thạch Khả Dụng
              </span>
              <span className="text-lg sm:text-xl font-black text-emerald-300 font-mono">
                {userLinhThach.toLocaleString()} <span className="text-xs font-normal text-emerald-400">LT</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Sub Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        {[
          { id: 'browse', label: 'Gian Hàng Phường Thị', icon: Store, count: listings.length },
          { id: 'my_listings', label: 'Sạp Hàng Của Ta', icon: Tag, count: myListings.length },
          { id: 'create_listing', label: 'Mở Sạp Ký Gửi', icon: PlusCircle },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = subTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                soundFx.playKeyClick();
                setSubTab(tab.id as any);
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                isActive
                  ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                  : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {tab.count !== undefined && tab.count > 0 && (
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                  isActive ? 'bg-slate-950 text-emerald-400 font-bold' : 'bg-slate-800 text-slate-400'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* VIEW 1: BROWSE LISTINGS */}
      {subTab === 'browse' && (
        <div className="space-y-4">
          {/* Controls Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            {/* Category filter */}
            <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
              {[
                { id: 'all', label: 'Tất Cả' },
                { id: 'herb', label: 'Dược Thảo' },
                { id: 'pill', label: 'Đan Dược' },
                { id: 'tea', label: 'Linh Trà & Vật Phẩm' },
              ].map((c) => (
                <button
                  key={c.id}
                  onClick={() => {
                    soundFx.playKeyClick();
                    setCategoryFilter(c.id as any);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                    categoryFilter === c.id
                      ? 'bg-slate-800 text-emerald-400 border border-emerald-500/40'
                      : 'bg-slate-900/60 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>

            {/* Search and Sort */}
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-56">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && fetchMarketListings()}
                  placeholder="Tìm kiếm vật phẩm..."
                  className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400"
                />
              </div>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="py-1.5 px-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 focus:outline-none focus:border-emerald-400"
              >
                <option value="latest">Mới nhất</option>
                <option value="price_asc">Giá rẻ nhất</option>
                <option value="price_desc">Giá cao nhất</option>
              </select>
            </div>
          </div>

          {/* Grid of Listings */}
          {loading ? (
            <div className="py-16 text-center text-slate-400 space-y-2">
              <div className="w-8 h-8 mx-auto border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs">Đang dò tìm các sạp hàng trong Phường Thị...</p>
            </div>
          ) : listings.length === 0 ? (
            <div className="py-16 text-center text-slate-500 bg-slate-950/40 rounded-2xl border border-dashed border-slate-800">
              <Scale className="w-10 h-10 mx-auto mb-2 text-slate-600" />
              <p className="text-sm font-bold text-slate-400">Hiện chưa có gian hàng nào đang mở</p>
              <span className="text-xs text-slate-500">Đạo hữu hãy là người đầu tiên ký gửi bán linh thảo hoặc đan dược!</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
              {listings.map((item) => {
                const isMyOwn = item.sellerUsername === username;
                const canAfford = userLinhThach >= item.totalPrice;

                return (
                  <div
                    key={item.id}
                    className="flex flex-col justify-between p-4 rounded-2xl bg-slate-900/80 hover:bg-slate-900 border border-slate-800 hover:border-emerald-500/40 transition-all shadow-sm hover:shadow-lg hover:shadow-emerald-500/10"
                  >
                    {/* Seller Banner */}
                    <div className="flex items-center justify-between pb-2.5 border-b border-slate-800/80 text-[11px]">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-sm">{item.sellerAvatar || '⚡'}</span>
                        <span className="font-bold text-slate-300 truncate max-w-[120px]">
                          @{item.sellerUsername}
                        </span>
                      </div>
                      {isMyOwn ? (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold">
                          Sạp của bạn
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-500">Ký gửi</span>
                      )}
                    </div>

                    {/* Item Info */}
                    <div className="my-3 space-y-2">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center text-2xl shadow-inner">
                          {item.itemIcon}
                        </div>
                        <div>
                          <h4 className="font-black text-sm text-white">{item.itemName}</h4>
                          <span className="text-xs font-bold text-emerald-400 block font-mono">
                            Số lượng: x{item.quantity}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Pricing & Buy Button */}
                    <div className="pt-2.5 border-t border-slate-800/80 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-[10px] text-slate-400">
                          Đơn giá: <strong className="text-slate-300 font-mono">{item.pricePerUnit} LT</strong>
                        </span>
                        <div className="text-right">
                          <span className="font-mono font-black text-emerald-300 text-sm flex items-center gap-1">
                            <span>💎</span>
                            <span>{item.totalPrice.toLocaleString()} LT</span>
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          soundFx.playKeyClick();
                          setSelectedListing(item);
                          setNotice(null);
                        }}
                        disabled={isMyOwn}
                        className={`w-full py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                          isMyOwn
                            ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                            : canAfford
                            ? 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black shadow-md shadow-emerald-500/20 active:scale-95'
                            : 'bg-slate-800 hover:bg-slate-700 text-emerald-400/80 border border-emerald-500/20'
                        }`}
                      >
                        {isMyOwn ? (
                          <span>Sạp Của Đạo Hữu</span>
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
        </div>
      )}

      {/* VIEW 2: MY LISTINGS */}
      {subTab === 'my_listings' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
              <span>Danh Sách Gian Hàng Của Bản Thân</span>
              <span className="text-xs text-slate-400 font-normal">({myListings.length} sạp)</span>
            </h3>
            <button
              onClick={() => setSubTab('create_listing')}
              className="px-3 py-1.5 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs flex items-center gap-1.5 hover:bg-emerald-400 cursor-pointer"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Mở Sạp Ký Gửi Mới</span>
            </button>
          </div>

          {myListings.length === 0 ? (
            <div className="py-16 text-center text-slate-500 bg-slate-950/40 rounded-2xl border border-dashed border-slate-800">
              <Tag className="w-10 h-10 mx-auto mb-2 text-slate-600" />
              <p className="text-sm font-bold text-slate-400">Đạo hữu chưa ký gửi vật phẩm nào</p>
              <span className="text-xs text-slate-500">Hãy chọn các dược thảo hoặc đan dược dư thừa để bán kiếm Linh Thạch!</span>
            </div>
          ) : (
            <div className="space-y-2.5">
              {myListings.map((l) => (
                <div
                  key={l.id}
                  className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3.5 rounded-xl bg-slate-900 border border-slate-800 gap-3"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{l.itemIcon}</span>
                    <div>
                      <h4 className="font-bold text-sm text-white">{l.itemName}</h4>
                      <div className="flex items-center gap-2 text-xs text-slate-400 font-mono mt-0.5">
                        <span>Số lượng: x{l.quantity}</span>
                        <span>•</span>
                        <span>Đơn giá: {l.pricePerUnit} LT</span>
                        <span>•</span>
                        <span className="text-emerald-400 font-bold">Tổng: {l.totalPrice} LT</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        l.status === 'active'
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/40'
                          : l.status === 'sold'
                          ? 'bg-sky-950 text-sky-400 border border-sky-500/40'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {l.status === 'active'
                        ? 'Đang Bán'
                        : l.status === 'sold'
                        ? `Đã Bán (@${l.buyerUsername || 'Đạo Hữu'})`
                        : 'Đã Thu Hồi'}
                    </span>

                    {l.status === 'active' && (
                      <button
                        onClick={() => handleCancelListing(l.id)}
                        className="px-2.5 py-1 rounded-lg bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 border border-rose-500/40 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Thu Hồi</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* VIEW 3: CREATE LISTING */}
      {subTab === 'create_listing' && (
        <form onSubmit={handleCreateListing} className="max-w-xl mx-auto p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="border-b border-slate-800 pb-3">
            <h3 className="font-black text-base text-white flex items-center gap-2">
              <PlusCircle className="w-4 h-4 text-emerald-400" />
              <span>Ký Gửi Vật Phẩm Lên Phường Thị</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Vật phẩm sẽ được ký gửi trong 48h. Người mua trả đủ Linh Thạch sẽ chuyển thẳng về túi đồ của đạo hữu.
            </p>
          </div>

          {/* Chọn Loại Vật Phẩm */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300 block">1. Loại Vật Phẩm Muốn Bán:</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'herb', label: 'Dược Thảo' },
                { id: 'pill', label: 'Đan Dược' },
                { id: 'tea', label: 'Linh Trà' },
              ].map((t) => (
                <button
                  type="button"
                  key={t.id}
                  onClick={() => {
                    setSellItemType(t.id as any);
                    if (t.id === 'herb') setSellItemId('uLan');
                    else if (t.id === 'pill') setSellItemId('thoNguyen');
                    else setSellItemId('linhTra');
                    setSellQuantity(1);
                  }}
                  className={`py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                    sellItemType === t.id
                      ? 'bg-emerald-500 text-slate-950 font-black'
                      : 'bg-slate-950 text-slate-400 border border-slate-800'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Chọn Cụ Thể Vật Phẩm */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300 block">2. Chọn Vật Phẩm:</label>
            <select
              value={sellItemId}
              onChange={(e) => {
                setSellItemId(e.target.value);
                setSellQuantity(1);
              }}
              className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-emerald-400"
            >
              {sellItemType === 'herb' && (
                <>
                  <option value="uLan">🌱 U Lan Thảo (Hiện có: {state.herbs?.uLan || 0})</option>
                  <option value="huyetTinh">🌿 Huyết Tinh Thảo (Hiện có: {state.herbs?.huyetTinh || 0})</option>
                  <option value="hoaAnh">🔥 Hỏa Anh Thảo (Hiện có: {state.herbs?.hoaAnh || 0})</option>
                  <option value="huyenThiet">🍄 Huyền Thiết Chi (Hiện có: {state.herbs?.huyenThiet || 0})</option>
                  <option value="longTu">🐉 Long Tu Thảo (Hiện có: {state.herbs?.longTu || 0})</option>
                </>
              )}
              {sellItemType === 'pill' && (
                <>
                  <option value="thoNguyen">💊 Thọ Nguyên Đan (Hiện có: {state.pillCount?.thoNguyen || 0})</option>
                  <option value="dinhTam">🧘 Định Tâm Đan (Hiện có: {state.pillCount?.dinhTam || 0})</option>
                  <option value="ngungThan">👁️ Ngưng Thần Đan (Hiện có: {state.pillCount?.ngungThan || 0})</option>
                  <option value="hoTam">🛡️ Hộ Tâm Đan (Hiện có: {state.pillCount?.hoTam || 0})</option>
                  <option value="phaCanh">⚡ Phá Cảnh Đan (Hiện có: {state.pillCount?.phaCanh || 0})</option>
                  <option value="tuViDan">🔮 Tu Vi Đan (Hiện có: {state.pillCount?.tuViDan || 0})</option>
                  <option value="sieuCapTuViDan">🔮 Siêu Cấp Tu Vi Đan (Hiện có: {state.pillCount?.sieuCapTuViDan || 0})</option>
                </>
              )}
              {sellItemType === 'tea' && (
                <>
                  <option value="linhTra">🍵 Bát Trảm Linh Trà (Hiện có: {(state as any).teaInventory?.linhTra || 0})</option>
                  <option value="dongTamToa">🔐 Đồng Tâm Tỏa (Hiện có: {(state as any).teaInventory?.dongTamToa || 0})</option>
                </>
              )}
            </select>
          </div>

          {/* Số Lượng & Đơn Giá */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 block">
                3. Số Lượng (Tối đa: {currentAvailableInBag}):
              </label>
              <input
                type="number"
                min={1}
                max={Math.max(1, currentAvailableInBag)}
                value={sellQuantity}
                onChange={(e) => setSellQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))}
                className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs font-mono font-bold text-emerald-300 focus:outline-none focus:border-emerald-400"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 block">4. Đơn Giá (LT/món):</label>
              <input
                type="number"
                min={1}
                value={sellPricePerUnit}
                onChange={(e) => setSellPricePerUnit(Math.max(1, parseInt(e.target.value, 10) || 1))}
                className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs font-mono font-bold text-amber-300 focus:outline-none focus:border-emerald-400"
              />
            </div>
          </div>

          {/* Tóm tắt giao dịch */}
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1 text-xs">
            <div className="flex justify-between text-slate-400">
              <span>Tổng giá bán niêm yết:</span>
              <span className="font-mono text-white font-bold">{(sellQuantity * sellPricePerUnit).toLocaleString()} LT</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Thuế sàn thiêu hủy ({(taxRate * 100).toFixed(0)}%):</span>
              <span className="font-mono text-rose-400">-{estimatedTax.toLocaleString()} LT</span>
            </div>
            <div className="flex justify-between text-slate-300 pt-1 border-t border-slate-800 font-bold">
              <span>Thực nhận khi bán hết:</span>
              <span className="font-mono text-emerald-300 text-sm">+{estimatedPayout.toLocaleString()} LT</span>
            </div>
          </div>

          <button
            type="submit"
            disabled={currentAvailableInBag < sellQuantity || isProcessing}
            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs transition-all shadow-md shadow-emerald-500/30 cursor-pointer disabled:opacity-50"
          >
            {isProcessing ? 'Đang Ký Gửi...' : 'Xác Nhận Mở Sạp Ký Gửi'}
          </button>
        </form>
      )}

      {/* Buy Confirmation Modal */}
      {selectedListing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md rounded-2xl bg-slate-950 border-2 border-emerald-500 shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{selectedListing.itemIcon}</span>
                <div>
                  <h3 className="text-base font-black text-white">{selectedListing.itemName}</h3>
                  <span className="text-[11px] text-slate-400">Sạp của @{selectedListing.sellerUsername}</span>
                </div>
              </div>
              <button
                onClick={() => setSelectedListing(null)}
                className="w-7 h-7 rounded-lg bg-slate-900 text-slate-400 hover:text-white flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            {notice && (
              <div
                className={`p-3 rounded-xl text-xs font-bold flex items-center gap-2 ${
                  notice.type === 'success'
                    ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/50'
                    : 'bg-rose-950/80 text-rose-300 border border-rose-500/50'
                }`}
              >
                {notice.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                <span>{notice.message}</span>
              </div>
            )}

            <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-2 text-xs">
              <div className="flex justify-between text-slate-400">
                <span>Số lượng món hàng:</span>
                <span className="font-mono text-white font-bold">x{selectedListing.quantity}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Đơn giá:</span>
                <span className="font-mono text-white font-bold">{selectedListing.pricePerUnit} LT</span>
              </div>
              <div className="flex justify-between text-slate-300 pt-1 border-t border-slate-800">
                <span>Tổng chi phí cần thanh toán:</span>
                <span className="font-mono font-black text-emerald-300 text-sm">
                  {selectedListing.totalPrice.toLocaleString()} LT
                </span>
              </div>
              <div className="flex justify-between text-slate-400 text-[11px]">
                <span>Linh Thạch sau giao dịch:</span>
                <span className={`font-mono font-bold ${userLinhThach >= selectedListing.totalPrice ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {(userLinhThach - selectedListing.totalPrice).toLocaleString()} LT
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => setSelectedListing(null)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors cursor-pointer"
              >
                Hủy
              </button>
              <button
                onClick={handleConfirmBuy}
                disabled={isProcessing || userLinhThach < selectedListing.totalPrice}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 text-xs font-black transition-all shadow-md shadow-emerald-500/30 cursor-pointer disabled:opacity-50"
              >
                {isProcessing ? 'Đang Chuyển Linh Thạch...' : 'Xác Nhận Mua'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
