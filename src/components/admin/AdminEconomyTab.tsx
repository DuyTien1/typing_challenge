import React, { useState, useEffect } from 'react';
import { soundFx } from '../../utils/audio';
import { getStoredAuthToken } from '../../utils/auth';
import {
  Coins,
  Scale,
  ShoppingBag,
  TrendingUp,
  Flame,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  Edit2,
  Save,
  Search,
  RefreshCw,
  PlusCircle,
  MinusCircle,
  FileText,
  User,
  ShieldAlert,
} from 'lucide-react';

interface MacroEconomyData {
  totalCirculatingLinhThach: number;
  topRichest: {
    userId: string;
    username: string;
    avatar: string;
    frame: string;
    linhThach: number;
    realmName?: string;
  }[];
  stats: {
    totalVolume: number;
    totalTaxBurned: number;
    totalTradesCount: number;
  };
  taxRate: number;
  activeListingsCount: number;
  totalListingsCount: number;
}

interface ShopItemAdmin {
  id: string;
  category: string;
  name: string;
  desc: string;
  icon: string;
  price: number;
  dailyLimit: number;
  discountPercent: number;
  enabled: boolean;
}

interface MarketListingAdmin {
  id: string;
  sellerId: string;
  sellerUsername: string;
  itemName: string;
  itemIcon: string;
  quantity: number;
  pricePerUnit: number;
  totalPrice: number;
  listedAt: number;
  expiresAt: number;
  status: string;
}

interface MarketLogAdmin {
  id: string;
  type: string;
  details: string;
  timestamp: number;
  actorUsername: string;
  targetUsername?: string;
  amount?: number;
}

export const AdminEconomyTab: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'macro' | 'shop' | 'market' | 'grant_logs'>('macro');
  const [macroData, setMacroData] = useState<MacroEconomyData | null>(null);
  const [shopItems, setShopItems] = useState<ShopItemAdmin[]>([]);
  const [marketListings, setMarketListings] = useState<MarketListingAdmin[]>([]);
  const [logs, setLogs] = useState<MarketLogAdmin[]>([]);
  const [loading, setLoading] = useState(true);

  // Điều chỉnh thuế
  const [taxRateInput, setTaxRateInput] = useState<number>(5);
  const [isUpdatingTax, setIsUpdatingTax] = useState(false);

  // Cấp phát / Thu hồi Linh Thạch
  const [targetUsername, setTargetUsername] = useState('');
  const [adjustAmount, setAdjustAmount] = useState<string>('');
  const [adjustReason, setAdjustReason] = useState('Đền bù sự kiện / Thưởng đặc biệt');
  const [isAdjusting, setIsAdjusting] = useState(false);

  // Chỉnh sửa item Vạn Bảo Các
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editPrice, setEditPrice] = useState<number>(0);
  const [editLimit, setEditLimit] = useState<number>(0);
  const [editDiscount, setEditDiscount] = useState<number>(0);
  const [editEnabled, setEditEnabled] = useState<boolean>(true);

  // Takedown Modal
  const [takedownListingId, setTakedownListingId] = useState<string | null>(null);
  const [takedownReason, setTakedownReason] = useState('Phá giá thị trường / Nghi vấn trục lợi');

  const [notice, setNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const getAdminHeaders = (includeJson = false): Record<string, string> => {
    const token = getStoredAuthToken();
    const headers: Record<string, string> = {};
    if (includeJson) headers['Content-Type'] = 'application/json';
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return headers;
  };

  const fetchEconomyOverview = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/economy/overview', { headers: getAdminHeaders() });
      const data = await res.json();
      if (data.success) {
        setMacroData(data);
        setTaxRateInput(Math.round(data.taxRate * 100));
      }
    } catch (err) {
      console.error('Failed to fetch economy overview:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchShopCatalog = async () => {
    try {
      const res = await fetch('/api/shop/catalog', { headers: getAdminHeaders() });
      const data = await res.json();
      if (data.success) {
        setShopItems(data.items || []);
      }
    } catch (err) {
      console.error('Failed to fetch shop catalog:', err);
    }
  };

  const fetchMarketListings = async () => {
    try {
      const res = await fetch('/api/market/listings', { headers: getAdminHeaders() });
      const data = await res.json();
      if (data.success) {
        setMarketListings(data.listings || []);
      }
    } catch (err) {
      console.error('Failed to fetch market listings:', err);
    }
  };

  const fetchLogs = async () => {
    try {
      const res = await fetch('/api/admin/economy/logs', { headers: getAdminHeaders() });
      const data = await res.json();
      if (data.success) {
        setLogs(data.logs || []);
      }
    } catch (err) {
      console.error('Failed to fetch economy logs:', err);
    }
  };

  useEffect(() => {
    fetchEconomyOverview();
    fetchShopCatalog();
    fetchMarketListings();
    fetchLogs();
  }, []);

  // Cập nhật thuế sàn
  const handleUpdateTaxRate = async () => {
    try {
      setIsUpdatingTax(true);
      const res = await fetch('/api/admin/economy/tax-rate', {
        method: 'POST',
        headers: getAdminHeaders(true),
        body: JSON.stringify({ taxRate: taxRateInput / 100 }),
      });
      const data = await res.json();
      if (data.success) {
        soundFx.playArtifactAura();
        setNotice({ type: 'success', message: `Đã cập nhật thuế sàn thành ${taxRateInput}%!` });
        fetchEconomyOverview();
      } else {
        soundFx.playError();
        setNotice({ type: 'error', message: data.error || 'Cập nhật thất bại!' });
      }
    } catch {
      soundFx.playError();
      setNotice({ type: 'error', message: 'Lỗi kết nối máy chủ!' });
    } finally {
      setIsUpdatingTax(false);
    }
  };

  // Cấp phát / thu hồi Linh Thạch
  const handleAdjustLinhThach = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetUsername.trim() || !adjustAmount.trim() || isAdjusting) return;

    try {
      setIsAdjusting(true);
      const res = await fetch('/api/admin/economy/adjust-linh-thach', {
        method: 'POST',
        headers: getAdminHeaders(true),
        body: JSON.stringify({
          targetUsername: targetUsername.trim(),
          amount: parseInt(adjustAmount, 10),
          reason: adjustReason.trim(),
        }),
      });
      const data = await res.json();

      if (data.success) {
        soundFx.playVictory();
        setNotice({ type: 'success', message: data.message });
        setAdjustAmount('');
        fetchEconomyOverview();
        fetchLogs();
      } else {
        soundFx.playError();
        setNotice({ type: 'error', message: data.error || 'Thao tác thất bại!' });
      }
    } catch {
      soundFx.playError();
      setNotice({ type: 'error', message: 'Lỗi kết nối máy chủ!' });
    } finally {
      setIsAdjusting(false);
    }
  };

  // Cưỡng chế gỡ sạp
  const handleTakedown = async () => {
    if (!takedownListingId) return;

    try {
      const res = await fetch('/api/admin/market/takedown', {
        method: 'POST',
        headers: getAdminHeaders(true),
        body: JSON.stringify({ listingId: takedownListingId, reason: takedownReason }),
      });
      const data = await res.json();
      if (data.success) {
        soundFx.playGuzhengNote();
        setNotice({ type: 'success', message: data.message });
        setTakedownListingId(null);
        fetchMarketListings();
        fetchEconomyOverview();
        fetchLogs();
      } else {
        soundFx.playError();
        setNotice({ type: 'error', message: data.error || 'Thu hồi thất bại!' });
      }
    } catch {
      soundFx.playError();
      setNotice({ type: 'error', message: 'Lỗi kết nối!' });
    }
  };

  // Cập nhật cấu hình vật phẩm Vạn Bảo Các
  const handleSaveShopItem = async (itemId: string) => {
    try {
      const res = await fetch('/api/admin/shop/update-item', {
        method: 'POST',
        headers: getAdminHeaders(true),
        body: JSON.stringify({
          itemId,
          price: editPrice,
          dailyLimit: editLimit,
          discountPercent: editDiscount,
          enabled: editEnabled,
        }),
      });
      const data = await res.json();
      if (data.success) {
        soundFx.playKeyClick();
        setNotice({ type: 'success', message: data.message });
        setEditingItemId(null);
        fetchShopCatalog();
      } else {
        soundFx.playError();
        setNotice({ type: 'error', message: data.error });
      }
    } catch {
      soundFx.playError();
      setNotice({ type: 'error', message: 'Lỗi kết nối!' });
    }
  };

  return (
    <div className="space-y-5">
      {/* Tab Navigation */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          {[
            { id: 'macro', label: 'Thần Thức Kinh Tế', icon: TrendingUp },
            { id: 'shop', label: 'Quản Lý Vạn Bảo Các', icon: ShoppingBag },
            { id: 'market', label: 'Kiểm Soát Phường Thị', icon: Scale },
            { id: 'grant_logs', label: 'Cấp Phát & Sổ Cái', icon: Coins },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeSubTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  soundFx.playKeyClick();
                  setActiveSubTab(tab.id as any);
                  setNotice(null);
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/20'
                    : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        <button
          onClick={() => {
            fetchEconomyOverview();
            fetchShopCatalog();
            fetchMarketListings();
            fetchLogs();
            soundFx.playKeyClick();
          }}
          className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 cursor-pointer"
          title="Làm mới dữ liệu kinh tế"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Global Notice */}
      {notice && (
        <div
          className={`p-3 rounded-xl text-xs font-bold flex items-center justify-between gap-2 animate-fadeIn ${
            notice.type === 'success'
              ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/50'
              : 'bg-rose-950/80 text-rose-300 border border-rose-500/50'
          }`}
        >
          <div className="flex items-center gap-2">
            {notice.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
            <span>{notice.message}</span>
          </div>
          <button onClick={() => setNotice(null)} className="text-slate-400 hover:text-white">✕</button>
        </div>
      )}

      {/* SUB-VIEW 1: MACRO ECONOMY */}
      {activeSubTab === 'macro' && macroData && (
        <div className="space-y-5">
          {/* Key Stat Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                Tổng Linh Thạch Lưu Thông
              </span>
              <span className="text-xl sm:text-2xl font-black text-amber-300 font-mono">
                {macroData.totalCirculatingLinhThach.toLocaleString()} LT
              </span>
            </div>

            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                Khối Lượng Giao Dịch Chợ
              </span>
              <span className="text-xl sm:text-2xl font-black text-emerald-400 font-mono">
                {macroData.stats.totalVolume.toLocaleString()} LT
              </span>
            </div>

            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                Linh Thạch Thiêu Hủy (Thuế)
              </span>
              <span className="text-xl sm:text-2xl font-black text-rose-400 font-mono flex items-center gap-1">
                <Flame className="w-5 h-5 text-rose-500" />
                {macroData.stats.totalTaxBurned.toLocaleString()} LT
              </span>
            </div>

            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                Sạp Hàng Đang Mở
              </span>
              <span className="text-xl sm:text-2xl font-black text-sky-400 font-mono">
                {macroData.activeListingsCount} / {macroData.totalListingsCount}
              </span>
            </div>
          </div>

          {/* Tax Rate Control Panel */}
          <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Scale className="w-4 h-4 text-emerald-400" />
                <span>Biểu Thuế Sàn Phường Thị Tự Do</span>
              </h4>
              <p className="text-xs text-slate-400">
                Mức thuế khấu trừ khi đạo hữu bán thành công vật phẩm trên Phường Thị. Toàn bộ thuế này bị thiêu hủy khỏi hệ thống.
              </p>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  min={0}
                  max={25}
                  value={taxRateInput}
                  onChange={(e) => setTaxRateInput(Math.max(0, Math.min(25, parseInt(e.target.value, 10) || 0)))}
                  className="w-16 p-2 rounded-xl bg-slate-950 border border-slate-700 font-mono font-black text-center text-emerald-300 text-sm focus:outline-none focus:border-emerald-400"
                />
                <span className="text-sm font-bold text-slate-400">%</span>
              </div>
              <button
                onClick={handleUpdateTaxRate}
                disabled={isUpdatingTax}
                className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                {isUpdatingTax ? 'Đang Lưu...' : 'Cập Nhật Thuế'}
              </button>
            </div>
          </div>

          {/* Top 10 Phú Hộ Tu Tiên */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <span>👑</span>
              <span>Bảng Vàng Phú Hộ Tu Tiên (Top 10 Nắm Giữ Linh Thạch)</span>
            </h4>
            <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/80 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="py-2.5 px-3">Hạng</th>
                    <th className="py-2.5 px-3">Đạo Hữu</th>
                    <th className="py-2.5 px-3">Cảnh Giới</th>
                    <th className="py-2.5 px-3 text-right">Linh Thạch</th>
                    <th className="py-2.5 px-3 text-right">Thao Tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {macroData.topRichest.map((user, idx) => (
                    <tr key={user.userId} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-400">
                        {idx === 0 ? '🥇 1' : idx === 1 ? '🥈 2' : idx === 2 ? '🥉 3' : `#${idx + 1}`}
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-2">
                          <span className="text-sm">{user.avatar}</span>
                          <span className="font-bold text-white">@{user.username}</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-slate-400">{user.realmName || 'Luyện Khí Kỳ'}</td>
                      <td className="py-2.5 px-3 text-right font-mono font-black text-amber-300">
                        {user.linhThach.toLocaleString()} LT
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <button
                          onClick={() => {
                            setTargetUsername(user.username);
                            setActiveSubTab('grant_logs');
                          }}
                          className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-amber-400 text-[11px] font-bold cursor-pointer"
                        >
                          Cấp / Thu Hồi
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUB-VIEW 2: SHOP MANAGEMENT */}
      {activeSubTab === 'shop' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-amber-400" />
              <span>Quản Lý Danh Mục Vật Phẩm Vạn Bảo Các ({shopItems.length} món)</span>
            </h4>
          </div>

          <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">Vật Phẩm</th>
                  <th className="py-2.5 px-3">Danh Mục</th>
                  <th className="py-2.5 px-3">Giá Gốc (LT)</th>
                  <th className="py-2.5 px-3">Giới Hạn/Ngày</th>
                  <th className="py-2.5 px-3">Giảm Giá (%)</th>
                  <th className="py-2.5 px-3">Trạng Thái</th>
                  <th className="py-2.5 px-3 text-right">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {shopItems.map((item) => {
                  const isEditing = editingItemId === item.id;
                  return (
                    <tr key={item.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{item.icon}</span>
                          <div>
                            <span className="font-bold text-white block">{item.name}</span>
                            <span className="text-[10px] text-slate-500">{item.id}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-slate-400 uppercase text-[10px]">{item.category}</td>
                      <td className="py-2.5 px-3 font-mono font-bold text-amber-300">
                        {isEditing ? (
                          <input
                            type="number"
                            value={editPrice}
                            onChange={(e) => setEditPrice(parseInt(e.target.value, 10) || 0)}
                            className="w-20 p-1 rounded bg-slate-950 border border-slate-700 text-xs font-mono text-amber-300"
                          />
                        ) : (
                          `${item.price} LT`
                        )}
                      </td>
                      <td className="py-2.5 px-3 font-mono">
                        {isEditing ? (
                          <input
                            type="number"
                            value={editLimit}
                            onChange={(e) => setEditLimit(parseInt(e.target.value, 10) || 0)}
                            className="w-16 p-1 rounded bg-slate-950 border border-slate-700 text-xs font-mono text-white"
                          />
                        ) : (
                          item.dailyLimit > 0 ? `${item.dailyLimit}/ngày` : 'Vô hạn'
                        )}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-rose-400 font-bold">
                        {isEditing ? (
                          <input
                            type="number"
                            min={0}
                            max={90}
                            value={editDiscount}
                            onChange={(e) => setEditDiscount(parseInt(e.target.value, 10) || 0)}
                            className="w-14 p-1 rounded bg-slate-950 border border-slate-700 text-xs font-mono text-rose-300"
                          />
                        ) : (
                          item.discountPercent > 0 ? `-${item.discountPercent}%` : '0%'
                        )}
                      </td>
                      <td className="py-2.5 px-3">
                        {isEditing ? (
                          <input
                            type="checkbox"
                            checked={editEnabled}
                            onChange={(e) => setEditEnabled(e.target.checked)}
                            className="w-4 h-4 accent-amber-400"
                          />
                        ) : (
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              item.enabled ? 'bg-emerald-950 text-emerald-400' : 'bg-slate-800 text-slate-500'
                            }`}
                          >
                            {item.enabled ? 'Đang Bán' : 'Tạm Ẩn'}
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        {isEditing ? (
                          <div className="flex items-center gap-1 justify-end">
                            <button
                              onClick={() => handleSaveShopItem(item.id)}
                              className="px-2.5 py-1 rounded bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black cursor-pointer flex items-center gap-1"
                            >
                              <Save className="w-3 h-3" />
                              <span>Lưu</span>
                            </button>
                            <button
                              onClick={() => setEditingItemId(null)}
                              className="px-2 py-1 rounded bg-slate-800 text-slate-400 text-xs cursor-pointer"
                            >
                              Hủy
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              setEditingItemId(item.id);
                              setEditPrice(item.price);
                              setEditLimit(item.dailyLimit);
                              setEditDiscount(item.discountPercent);
                              setEditEnabled(item.enabled);
                            }}
                            className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold cursor-pointer flex items-center gap-1 ml-auto"
                          >
                            <Edit2 className="w-3 h-3 text-amber-400" />
                            <span>Sửa</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUB-VIEW 3: MARKETPLACE MODERATION */}
      {activeSubTab === 'market' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <Scale className="w-4 h-4 text-emerald-400" />
              <span>Toàn Bộ Gian Hàng P2P Đang Mở Trên Server ({marketListings.length} sạp)</span>
            </h4>
          </div>

          <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">Mã Sạp</th>
                  <th className="py-2.5 px-3">Chủ Sạp</th>
                  <th className="py-2.5 px-3">Vật Phẩm</th>
                  <th className="py-2.5 px-3 font-mono">Số Lượng</th>
                  <th className="py-2.5 px-3 font-mono">Đơn Giá</th>
                  <th className="py-2.5 px-3 font-mono">Tổng Thu</th>
                  <th className="py-2.5 px-3 text-right">Cưỡng Chế</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {marketListings.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-500">
                      Hiện không có gian hàng nào đang ký gửi trên Phường Thị.
                    </td>
                  </tr>
                ) : (
                  marketListings.map((l) => (
                    <tr key={l.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-2.5 px-3 font-mono text-[10px] text-slate-500">{l.id}</td>
                      <td className="py-2.5 px-3 font-bold text-white">@{l.sellerUsername}</td>
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-1.5 font-bold text-white">
                          <span>{l.itemIcon}</span>
                          <span>{l.itemName}</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 font-mono font-bold text-emerald-400">x{l.quantity}</td>
                      <td className="py-2.5 px-3 font-mono text-slate-300">{l.pricePerUnit} LT</td>
                      <td className="py-2.5 px-3 font-mono font-black text-amber-300">{l.totalPrice} LT</td>
                      <td className="py-2.5 px-3 text-right">
                        <button
                          onClick={() => setTakedownListingId(l.id)}
                          className="px-2.5 py-1 rounded bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-500/40 text-xs font-bold cursor-pointer"
                        >
                          Thu Hồi
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Modal Takedown */}
          {takedownListingId && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
              <div className="w-full max-w-md rounded-2xl bg-slate-950 border-2 border-rose-500 p-5 space-y-4 shadow-2xl">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <h3 className="font-black text-white text-base flex items-center gap-2">
                    <ShieldAlert className="w-5 h-5 text-rose-400" />
                    <span>Cưỡng Chế Thu Hồi Gian Hàng</span>
                  </h3>
                  <button onClick={() => setTakedownListingId(null)} className="text-slate-400 hover:text-white">✕</button>
                </div>
                <p className="text-xs text-slate-300">
                  Gian hàng <strong className="text-amber-300 font-mono">#{takedownListingId}</strong> sẽ bị gỡ bỏ ngay lập tức và vật phẩm được hoàn trả về túi đồ của người bán.
                </p>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-400">Lý do thu hồi (Gửi đến người bán):</label>
                  <input
                    type="text"
                    value={takedownReason}
                    onChange={(e) => setTakedownReason(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-rose-400"
                  />
                </div>
                <div className="flex items-center gap-2 pt-2">
                  <button
                    onClick={() => setTakedownListingId(null)}
                    className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold"
                  >
                    Hủy
                  </button>
                  <button
                    onClick={handleTakedown}
                    className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black text-xs shadow-lg shadow-rose-600/30"
                  >
                    Xác Nhận Thu Hồi
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SUB-VIEW 4: GRANT / DEDUCT & AUDIT LOGS */}
      {activeSubTab === 'grant_logs' && (
        <div className="space-y-6">
          {/* Form Cấp Phát / Thu Hồi */}
          <form onSubmit={handleAdjustLinhThach} className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3 max-w-xl">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <Coins className="w-4 h-4 text-amber-400" />
              <span>Cấp Phát (+) Hoặc Thu Hồi (-) Linh Thạch Cho Người Chơi</span>
            </h4>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400 block">Tên người chơi (Username):</label>
                <input
                  type="text"
                  value={targetUsername}
                  onChange={(e) => setTargetUsername(e.target.value)}
                  placeholder="Ví dụ: nite"
                  required
                  className="w-full p-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-amber-400 font-bold"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400 block">Số lượng (+ thêm, - trừ):</label>
                <input
                  type="number"
                  value={adjustAmount}
                  onChange={(e) => setAdjustAmount(e.target.value)}
                  placeholder="+500 hoặc -200"
                  required
                  className="w-full p-2 rounded-xl bg-slate-950 border border-slate-700 text-xs font-mono font-black text-amber-300 focus:outline-none focus:border-amber-400"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 block">Lý do ghi vào Ký Sự Đạo Lộ:</label>
              <input
                type="text"
                value={adjustReason}
                onChange={(e) => setAdjustReason(e.target.value)}
                placeholder="Đền bù bảo trì / Thưởng sự kiện / Xử phạt vi phạm"
                required
                className="w-full p-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-amber-400"
              />
            </div>

            <button
              type="submit"
              disabled={isAdjusting}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-xs transition-all shadow-md shadow-amber-500/20 cursor-pointer disabled:opacity-50"
            >
              {isAdjusting ? 'Đang Xử Lý...' : 'Xác Nhận Thực Hiện Điều Chỉnh'}
            </button>
          </form>

          {/* Audit Logs */}
          <div className="space-y-2">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <FileText className="w-4 h-4 text-sky-400" />
              <span>Sổ Cái Kiểm Toán Giao Dịch & Quản Trị ({logs.length} bản ghi gần nhất)</span>
            </h4>

            <div className="rounded-2xl bg-slate-900 border border-slate-800 p-3 max-h-80 overflow-y-auto space-y-2">
              {logs.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-6">Chưa có giao dịch nào được ghi lại.</p>
              ) : (
                logs.map((log) => (
                  <div
                    key={log.id}
                    className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800/80 flex items-center justify-between text-xs gap-3"
                  >
                    <div className="space-y-0.5 min-w-0">
                      <p className="text-slate-200 font-medium leading-relaxed truncate">{log.details}</p>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {new Date(log.timestamp).toLocaleString('vi-VN')} • Tác nhân: @{log.actorUsername}
                      </span>
                    </div>

                    {log.amount && (
                      <span className="font-mono font-black text-amber-300 shrink-0 text-xs">
                        {log.amount.toLocaleString()} LT
                      </span>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
