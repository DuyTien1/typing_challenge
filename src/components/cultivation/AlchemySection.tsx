import React, { useState, useEffect, useRef } from 'react';
import {
  CultivationState,
  HERBS_CONFIGS,
  ALCHEMY_RECIPES,
  craftAlchemyInteractive,
  useThoNguyenPill,
  useDinhTamPill,
  useNgungThanPill,
  useTuViPill,
  useSieuCapTuViPill,
  HerbType,
} from '../../utils/cultivation';
import { soundFx } from '../../utils/audio';
import {
  Flame,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  RefreshCw,
  Zap,
  Bomb,
  ShieldAlert,
  Clock,
  Heart,
  Eye,
  Activity,
} from 'lucide-react';

interface AlchemySectionProps {
  state: CultivationState;
  onUpdateState: (newState: CultivationState) => void;
}

// Danh sách chân ngôn ấn chú điều tiết chân hỏa lò đan bát quái
const ALCHEMY_INCANTATIONS = [
  'chân hỏa quy nhất',
  'bát quái càn khôn',
  'đan điền tĩnh lặng',
  'dược lực thăng hoa',
  'ngũ hành tương sinh',
  'thiên địa giao hòa',
  'thuần dương chân khí',
  'tâm viên ý mã',
];

export const AlchemySection: React.FC<AlchemySectionProps> = ({ state, onUpdateState }) => {
  const [selectedRecipeId, setSelectedRecipeId] = useState<
    'thoNguyen' | 'hoTam' | 'phaCanh' | 'dinhTam' | 'ngungThan' | 'vanNienTuVi'
  >('thoNguyen');
  const [isForging, setIsForging] = useState(false);
  const [craftNotice, setCraftNotice] = useState<{
    isSuper: boolean;
    isExploded?: boolean;
    message: string;
  } | null>(null);

  // Chế độ Luyện Đan Tương Tác: Điều Tiết Chân Hỏa
  const [isInteractiveMode, setIsInteractiveMode] = useState(true);
  const [incantationPrompt, setIncantationPrompt] = useState<string>('');
  const [typedIncantation, setTypedIncantation] = useState('');
  const [incantationStartTime, setIncantationStartTime] = useState<number | null>(null);
  const [incantationErrorCount, setIncantationErrorCount] = useState(0);
  const [heatLevel, setHeatLevel] = useState<number>(50); // 0 (lạnh) -> 50 (hài hòa) -> 100 (quá nhiệt)
  const incantationInputRef = useRef<HTMLInputElement>(null);

  const currentHerbs = state.herbs || { uLan: 0, huyetTinh: 0, hoaAnh: 0, huyenThiet: 0, longTu: 0 };
  const selectedRecipe = ALCHEMY_RECIPES.find((r) => r.id === selectedRecipeId) || ALCHEMY_RECIPES[0];

  // Check if enough herbs
  const canCraft = Object.entries(selectedRecipe.ingredients).every(([k, count]) => {
    return (currentHerbs[k as HerbType] || 0) >= (count || 0);
  });

  // Bắt đầu mở lò luyện đan
  const startFurnaceRitual = () => {
    if (!canCraft || isForging) return;
    setCraftNotice(null);

    if (!isInteractiveMode) {
      // Auto craft fallback
      performDirectCraft(false, false);
      return;
    }

    // Chọn ngẫu nhiên ấn chú
    const randomInc = ALCHEMY_INCANTATIONS[Math.floor(Math.random() * ALCHEMY_INCANTATIONS.length)];
    setIncantationPrompt(randomInc);
    setTypedIncantation('');
    setIncantationErrorCount(0);
    setHeatLevel(50);
    setIncantationStartTime(Date.now());
    setIsForging(true);
    soundFx.playGuzhengNote(1);

    setTimeout(() => {
      incantationInputRef.current?.focus();
    }, 100);
  };

  // Thực hiện chế tạo sau khi kết thúc chuỗi ấn chú
  const performDirectCraft = (isGoodRhythm: boolean, isOverheatFail: boolean) => {
    setIsForging(true);
    soundFx.playGuzhengNote(2);

    setTimeout(() => {
      const res = craftAlchemyInteractive(state, selectedRecipeId, {
        isGoodRhythm,
        isOverheatFail,
      });
      setIsForging(false);
      setIncantationPrompt('');
      setTypedIncantation('');

      if (res.exploded) {
        soundFx.playFurnaceExplode();
        setCraftNotice({
          isSuper: false,
          isExploded: true,
          message: res.message,
        });
        onUpdateState(res.updatedState);
      } else if (res.success) {
        soundFx.playAlchemySuccess(res.isSuperTier);
        setCraftNotice({
          isSuper: res.isSuperTier,
          message: res.message,
        });
        onUpdateState(res.updatedState);
      } else {
        soundFx.playError();
        setCraftNotice({
          isSuper: false,
          message: res.message,
        });
      }
    }, 900);
  };

  // Lắng nghe người chơi gõ ấn chú điều tiết chân hỏa
  const handleIncantationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.toLowerCase();
    setTypedIncantation(val);
    soundFx.playKeyClick(false);

    // Tính toán độ chính xác và nhiệt độ
    let mismatches = 0;
    for (let i = 0; i < val.length; i++) {
      if (val[i] !== incantationPrompt[i]) {
        mismatches++;
      }
    }
    setIncantationErrorCount(mismatches);

    // Quá nhiệt nếu gõ sai nhiều
    if (mismatches >= 3) {
      setHeatLevel(95);
    } else if (mismatches > 0) {
      setHeatLevel(75);
    } else {
      setHeatLevel(50);
    }

    // Hoàn thành gõ ấn chú
    if (val === incantationPrompt) {
      const elapsed = Date.now() - (incantationStartTime || Date.now());
      // Gõ nhanh dưới 3.5s và 0 lỗi -> Hỏa hầu cực phẩm (isGoodRhythm = true)
      const isGoodRhythm = mismatches === 0 && elapsed <= 4500;
      performDirectCraft(isGoodRhythm, false);
    }
  };

  // Nếu người chơi gõ Enter hoặc hết thời gian
  const handleIncantationKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      if (typedIncantation === incantationPrompt) {
        const isGoodRhythm = incantationErrorCount === 0;
        performDirectCraft(isGoodRhythm, false);
      } else {
        // Cố tình nộp ấn chú sai -> Nguy cơ nổ lò
        performDirectCraft(false, incantationErrorCount >= 2);
      }
    } else if (e.key === 'Escape') {
      // Hủy mở lò
      setIsForging(false);
      setIncantationPrompt('');
      setTypedIncantation('');
    }
  };

  // Uống đan dược trực tiếp từ túi
  const handleUsePill = (type: 'thoNguyen' | 'dinhTam' | 'ngungThan' | 'tuVi' | 'sieuCap') => {
    soundFx.playKeyClick();
    let res;
    if (type === 'thoNguyen') res = useThoNguyenPill(state);
    else if (type === 'dinhTam') res = useDinhTamPill(state);
    else if (type === 'ngungThan') res = useNgungThanPill(state);
    else if (type === 'tuVi') res = useTuViPill(state);
    else if (type === 'sieuCap') res = useSieuCapTuViPill(state);

    if (res && res.success) {
      soundFx.playArtifactAura();
      setCraftNotice({ isSuper: true, message: res.message });
      onUpdateState(res.updatedState);
    } else if (res) {
      soundFx.playError();
      setCraftNotice({ isSuper: false, message: res.message });
    }
  };

  const activeBuffs = state.activeBuffs || {
    dinhTamMatchesRemaining: 0,
    ngungThanMatchesRemaining: 0,
    kimCangImmunityUntil: 0,
  };

  return (
    <div className="space-y-6">
      {/* Herb Inventory Bar */}
      <div className="p-4 sm:p-5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3 shadow-lg">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h4 className="text-xs sm:text-sm font-black text-amber-300 uppercase tracking-wider flex items-center gap-2">
            <span>🌿</span>
            <span>Dược Điển Kỳ Hoa Dị Thảo • Rơi Theo Chuyên Môn Trận Đấu</span>
          </h4>
          <span className="text-[11px] text-slate-400">
            TV có dấu: U Lan & Long Tu • Tốc độ cao: Huyết Tinh • Numpad/Đoán chữ: Huyền Thiết & Hóa Anh
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
          {(Object.keys(HERBS_CONFIGS) as HerbType[]).map((hKey) => {
            const hInfo = HERBS_CONFIGS[hKey];
            const qty = currentHerbs[hKey] || 0;
            return (
              <div
                key={hKey}
                className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 transition-colors flex flex-col items-center text-center shadow-inner group"
              >
                <span className="text-2xl mb-1 group-hover:scale-110 transition-transform">{hInfo.icon}</span>
                <span className="text-xs font-bold text-slate-200 truncate w-full">{hInfo.name}</span>
                <span className={`text-[10px] font-semibold ${hInfo.colorClass} mb-1`}>{hInfo.rarity}</span>
                <span className="px-2 py-0.5 rounded-full bg-slate-950 border border-slate-800 text-xs font-mono font-bold text-amber-400">
                  {qty}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Đan Dược Đang Có & Trạng Thái Dược Lực (Active Buffs) */}
      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border border-cyan-500/30 shadow-lg space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs sm:text-sm font-black text-cyan-300 uppercase tracking-wider flex items-center gap-2">
            <span>🧪</span>
            <span>Túi Đan Dược & Hiệu Lực Đang Tác Động</span>
          </h4>
          <span className="text-[11px] text-slate-400">Uống đan dược để kích hoạt bùa hỗ trợ trước khi xuất chiến</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* Định Tâm Đan */}
          <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-indigo-300 flex items-center gap-1">
                  <span>🧘</span> Định Tâm Đan
                </span>
                <span className="text-xs font-mono font-bold text-amber-400">
                  x{state.pillCount.dinhTam || 0}
                </span>
              </div>
              <p className="text-[10px] text-slate-400 leading-tight">
                Giảm 50% ảnh hưởng từ gõ sai vào WPM trong 3 ván
              </p>
              {activeBuffs.dinhTamMatchesRemaining > 0 && (
                <div className="mt-2 text-[10px] font-bold text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-500/30 flex items-center gap-1">
                  <Activity className="w-3 h-3 animate-pulse text-emerald-400" />
                  <span>Hiệu lực: Còn {activeBuffs.dinhTamMatchesRemaining} ván</span>
                </div>
              )}
            </div>
            <button
              onClick={() => handleUsePill('dinhTam')}
              disabled={(state.pillCount.dinhTam || 0) <= 0}
              className="mt-2 w-full py-1 rounded-lg bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/40 text-[11px] font-bold disabled:opacity-40 cursor-pointer"
            >
              Uống Đan
            </button>
          </div>

          {/* Ngưng Thần Đan */}
          <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-cyan-300 flex items-center gap-1">
                  <span>👁️</span> Ngưng Thần Đan
                </span>
                <span className="text-xs font-mono font-bold text-amber-400">
                  x{state.pillCount.ngungThan || 0}
                </span>
              </div>
              <p className="text-[10px] text-slate-400 leading-tight">
                Tăng 20% khả năng rơi thảo dược quý trong 3 ván
              </p>
              {activeBuffs.ngungThanMatchesRemaining > 0 && (
                <div className="mt-2 text-[10px] font-bold text-cyan-400 bg-cyan-950/40 px-2 py-0.5 rounded border border-cyan-500/30 flex items-center gap-1">
                  <Eye className="w-3 h-3 animate-pulse text-cyan-400" />
                  <span>Hiệu lực: Còn {activeBuffs.ngungThanMatchesRemaining} ván</span>
                </div>
              )}
            </div>
            <button
              onClick={() => handleUsePill('ngungThan')}
              disabled={(state.pillCount.ngungThan || 0) <= 0}
              className="mt-2 w-full py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-[11px] font-bold disabled:opacity-40 cursor-pointer"
            >
              Uống Đan
            </button>
          </div>

          {/* Thọ Nguyên Đan */}
          <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-emerald-300 flex items-center gap-1">
                  <span>💚</span> Thọ Nguyên Đan
                </span>
                <span className="text-xs font-mono font-bold text-amber-400">
                  x{state.pillCount.thoNguyen || 0}
                </span>
              </div>
              <p className="text-[10px] text-slate-400 leading-tight">
                Hồi phục +5 Thọ Nguyên, bảo tồn sinh mệnh tránh Luân Hồi
              </p>
            </div>
            <button
              onClick={() => handleUsePill('thoNguyen')}
              disabled={(state.pillCount.thoNguyen || 0) <= 0}
              className="mt-2 w-full py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-[11px] font-bold disabled:opacity-40 cursor-pointer"
            >
              Uống (+5 Thọ Nguyên)
            </button>
          </div>

          {/* Hộ Tâm & Phá Cảnh Đan */}
          <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-amber-300 flex items-center gap-1">
                  <span>🛡️</span> Hộ Tâm & Phá Cảnh
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-300">
                <span>Hộ Tâm Đan:</span>
                <span className="font-mono font-bold text-amber-400">x{state.pillCount.hoTam || 0}</span>
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-300 mt-1">
                <span>Phá Cảnh Đan:</span>
                <span className="font-mono font-bold text-purple-400">x{state.pillCount.phaCanh || 0}</span>
              </div>
              <p className="text-[10px] text-slate-400 leading-tight mt-1">
                Tự động kích hoạt khi Độ Kiếp Phá Cảnh Giới
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Alchemy Furnace Cauldron */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Left: Recipe List */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between mb-1">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Đan Phương Cổ Truyền
            </h4>
            <div className="flex items-center gap-1 text-[11px]">
              <span className="text-slate-400">Điều tiết:</span>
              <button
                onClick={() => setIsInteractiveMode(!isInteractiveMode)}
                className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-colors cursor-pointer ${
                  isInteractiveMode
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}
              >
                {isInteractiveMode ? 'Ấn Chú' : 'Tự Động'}
              </button>
            </div>
          </div>

          {ALCHEMY_RECIPES.map((recipe) => {
            const isSelected = selectedRecipeId === recipe.id;
            const hasIngredients = Object.entries(recipe.ingredients).every(
              ([k, c]) => (currentHerbs[k as HerbType] || 0) >= (c || 0)
            );

            return (
              <button
                key={recipe.id}
                onClick={() => {
                  soundFx.playKeyClick();
                  setSelectedRecipeId(recipe.id);
                  setCraftNotice(null);
                  setIncantationPrompt('');
                }}
                className={`w-full p-3 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                  isSelected
                    ? 'bg-amber-500/15 border-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.3)]'
                    : 'bg-slate-900/80 border-slate-800 hover:border-slate-700 text-slate-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{recipe.icon}</span>
                  <div>
                    <div className="text-xs sm:text-sm font-bold text-slate-100 flex items-center gap-1.5">
                      <span>{recipe.name}</span>
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      {hasIngredients ? (
                        <span className="text-emerald-400 font-semibold">Đủ dược liệu</span>
                      ) : (
                        <span className="text-rose-400/80">Thiếu thảo dược</span>
                      )}
                    </div>
                  </div>
                </div>
                <ChevronRight className={`w-4 h-4 ${isSelected ? 'text-amber-400' : 'text-slate-600'}`} />
              </button>
            );
          })}
        </div>

        {/* Right: Bát Quái Furnace Stage */}
        <div className="md:col-span-2 p-5 sm:p-6 rounded-2xl bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 border border-amber-500/40 shadow-xl flex flex-col justify-between relative overflow-hidden">
          {/* Animated Tam Muội Chân Hỏa Backdrop */}
          <div
            className={`absolute inset-0 bg-gradient-radial ${
              heatLevel > 80
                ? 'from-red-600/35 via-rose-600/20 to-transparent'
                : 'from-orange-500/20 via-amber-500/15 to-transparent'
            } pointer-events-none opacity-70 blur-xl transition-colors duration-500`}
          />

          <div>
            {/* Furnace Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{heatLevel > 80 ? '🌋' : '🔥'}</span>
                <div>
                  <h3 className="text-base font-black text-amber-300 uppercase tracking-wide">
                    Lò Luyện Đan Bát Quái • Điều Tiết Chân Hỏa
                  </h3>
                  <span className="text-[11px] text-slate-400">
                    Gõ đúng ấn chú nhịp độ cao: tỷ lệ <strong>Cực Phẩm Đan Dược</strong> (Đan Văn Ngũ Sắc x3 hiệu quả)! Gõ lỗi quá nhiều: nguy cơ <strong>Nổ Lò</strong>!
                  </span>
                </div>
              </div>
            </div>

            {/* Central Cauldron Animation */}
            <div className="my-4 flex flex-col items-center justify-center text-center">
              <div className="relative w-28 h-28 flex items-center justify-center">
                {/* Spinning Trigram Ring */}
                <div
                  className={`absolute inset-0 rounded-full border-2 border-dashed ${
                    heatLevel > 80
                      ? 'border-red-500 animate-[spin_1s_linear_infinite] shadow-[0_0_25px_#ef4444]'
                      : isForging
                      ? 'border-orange-400 animate-[spin_2s_linear_infinite] shadow-[0_0_20px_#f97316]'
                      : 'border-amber-400/40 animate-[spin_30s_linear_infinite]'
                  } pointer-events-none`}
                />
                <div className="text-5xl">{heatLevel > 80 ? '💥' : isForging ? '🌋' : selectedRecipe.icon}</div>
                {/* Fire particles */}
                <div className="absolute -bottom-2 text-xl animate-bounce">🔥</div>
              </div>

              <h4 className="mt-3 text-lg font-black text-white">{selectedRecipe.name}</h4>
              <p className="text-xs text-amber-200/90 mt-1 max-w-sm">{selectedRecipe.desc}</p>
              <div className="mt-2 text-[11px] text-emerald-400 font-semibold bg-emerald-950/40 border border-emerald-500/30 px-3 py-1 rounded-full">
                Hiệu lực: {selectedRecipe.effectText}
              </div>
            </div>

            {/* Interactive Incantation Ritual Box */}
            {isForging && incantationPrompt && (
              <div className="my-4 p-4 rounded-2xl bg-slate-950/95 border-2 border-amber-400 shadow-[0_0_25px_rgba(251,191,36,0.35)] space-y-3 animate-fadeIn">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-amber-300 flex items-center gap-1.5 uppercase tracking-wide">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <span>Ấn Chú Điều Tiết Chân Hỏa:</span>
                  </span>
                  <span
                    className={`font-mono font-bold text-xs ${
                      heatLevel > 80 ? 'text-rose-400' : 'text-emerald-400'
                    }`}
                  >
                    Hỏa Hầu: {heatLevel > 80 ? '⚠️ QUÁ NHIỆT (Nguy Cơ Nổ Lò)' : '✨ Hài Hòa Thuần Khiết'}
                  </span>
                </div>

                {/* Prompt target word sequence */}
                <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-center">
                  <span className="text-base sm:text-lg font-black tracking-widest text-amber-200 font-mono">
                    {incantationPrompt}
                  </span>
                </div>

                {/* Typing Input for ritual */}
                <input
                  ref={incantationInputRef}
                  type="text"
                  value={typedIncantation}
                  onChange={handleIncantationChange}
                  onKeyDown={handleIncantationKeyDown}
                  placeholder="Gõ chính xác ấn chú ở trên..."
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border-2 border-amber-400/80 text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 text-center"
                />

                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>Gõ nhanh dưới 4 giây để luyện Cực Phẩm (x3 số lượng)</span>
                  <span>Nhấn Enter khi hoàn thành (Esc để hủy)</span>
                </div>
              </div>
            )}

            {/* Required Ingredients Breakdown */}
            <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2 mb-4">
              <span className="text-xs font-bold text-slate-400 block uppercase tracking-wider">
                Dược Liệu Cần Thiết:
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {Object.entries(selectedRecipe.ingredients).map(([k, count]) => {
                  const hKey = k as HerbType;
                  const hInfo = HERBS_CONFIGS[hKey];
                  const currentQty = currentHerbs[hKey] || 0;
                  const isEnough = currentQty >= (count || 0);

                  return (
                    <div
                      key={hKey}
                      className={`p-2 rounded-lg border text-xs flex items-center justify-between ${
                        isEnough ? 'bg-slate-900 border-slate-700' : 'bg-rose-950/20 border-rose-900/60'
                      }`}
                    >
                      <span className="flex items-center gap-1.5 font-medium">
                        <span>{hInfo?.icon}</span>
                        <span className="truncate">{hInfo?.name}</span>
                      </span>
                      <span className={`font-mono font-bold ${isEnough ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {currentQty}/{count}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Craft Notice Toast */}
            {craftNotice && (
              <div
                className={`p-3 rounded-xl border text-xs font-bold flex items-center gap-2 mb-3 animate-fadeIn ${
                  craftNotice.isExploded
                    ? 'bg-rose-950/40 border-rose-500 text-rose-300 shadow-[0_0_20px_rgba(239,68,68,0.4)]'
                    : craftNotice.isSuper
                    ? 'bg-gradient-to-r from-amber-500/20 via-yellow-400/20 to-orange-500/20 border-amber-400 text-amber-300 shadow-[0_0_15px_rgba(251,191,36,0.4)]'
                    : 'bg-emerald-950/30 border-emerald-500/50 text-emerald-300'
                }`}
              >
                {craftNotice.isExploded ? (
                  <Bomb className="w-4 h-4 shrink-0 text-rose-400 animate-bounce" />
                ) : (
                  <Sparkles className="w-4 h-4 shrink-0 text-amber-400" />
                )}
                <span>{craftNotice.message}</span>
              </div>
            )}
          </div>

          {/* Action Button */}
          {!incantationPrompt && (
            <button
              onClick={startFurnaceRitual}
              disabled={!canCraft || isForging}
              className={`w-full py-3 px-4 rounded-xl font-black text-xs uppercase tracking-wider transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer ${
                canCraft && !isForging
                  ? 'bg-gradient-to-r from-amber-400 via-orange-500 to-yellow-400 text-slate-950 hover:brightness-110 shadow-orange-500/30 active:scale-98'
                  : 'bg-slate-800 text-slate-500 border border-slate-700 opacity-60 cursor-not-allowed'
              }`}
            >
              {isForging ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                  <span>Chân Hỏa Thiêu Đốt... Khai Lò...</span>
                </>
              ) : canCraft ? (
                <>
                  <Flame className="w-4 h-4" />
                  <span>
                    {isInteractiveMode ? 'Khai Lò • Điều Tiết Chân Hỏa' : 'Khai Lò Luyện Đan Tự Động'}
                  </span>
                </>
              ) : (
                <span>Chưa Đủ Dược Liệu</span>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

