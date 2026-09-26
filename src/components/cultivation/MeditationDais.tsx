import React from 'react';
import { CultivationState, XIANXIA_REALMS, getSubStage, TAM_PHAP_CONFIGS, ARTIFACT_CONFIGS } from '../../utils/cultivation';
import { AvatarWithFrame } from '../../utils/frames';
import { Sparkles, Shield, Zap, Flame, Compass, Coins, Swords } from 'lucide-react';

interface MeditationDaisProps {
  state: CultivationState;
  username?: string;
  userAvatar?: string;
  userFrame?: string;
  onOpenTribulation?: () => void;
  onEquipFrame?: () => void;
}

export const MeditationDais: React.FC<MeditationDaisProps> = ({
  state,
  username = 'Đạo Hữu',
  userAvatar = '⚡',
  userFrame = 'default',
  onOpenTribulation,
  onEquipFrame,
}) => {
  const currentRealm = XIANXIA_REALMS[state.realmIndex] || XIANXIA_REALMS[0];
  const subStage = getSubStage(state.tier);
  const isReadyBreakthrough = state.tier === 10 && state.exp >= state.maxExp && state.realmIndex < 11;
  const equippedArtifact = state.artifacts?.equipped ? ARTIFACT_CONFIGS[state.artifacts.equipped] : null;
  const equippedTamPhap = state.tamPhap?.equipped ? TAM_PHAP_CONFIGS[state.tamPhap.equipped] : null;

  // Realm aura glow colors
  const realmAuraColors = [
    'from-emerald-500/30 via-teal-500/20 to-transparent', // Luyện Khí
    'from-cyan-500/35 via-blue-500/20 to-transparent',   // Trúc Cơ
    'from-amber-500/40 via-yellow-500/20 to-transparent', // Kết Đan
    'from-purple-500/45 via-fuchsia-500/25 to-transparent', // Nguyên Anh
    'from-indigo-500/50 via-sky-500/30 to-transparent',  // Hóa Thần
    'from-blue-500/50 via-teal-500/30 to-transparent',   // Luyện Hư
    'from-yellow-400/50 via-amber-600/30 to-transparent', // Hợp Thể
    'from-red-500/55 via-orange-600/30 to-transparent',  // Đại Thừa
    'from-rose-500/60 via-purple-600/35 to-transparent', // Độ Kiếp
    'from-yellow-300/70 via-amber-400/40 to-white/20',   // Kim Tiên
    'from-fuchsia-400/70 via-pink-500/45 to-indigo-500/30', // Đại La
    'from-amber-300/80 via-red-500/50 to-yellow-400/60', // Thiên Tôn
  ];
  const currentAuraGradient = realmAuraColors[state.realmIndex] || realmAuraColors[0];

  return (
    <div className="relative p-6 sm:p-8 rounded-3xl bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 border border-amber-500/40 shadow-2xl overflow-hidden text-center select-none">
      {/* Dynamic Realm Mist Particles Background */}
      <div className={`absolute inset-0 bg-gradient-radial ${currentAuraGradient} pointer-events-none opacity-70 blur-xl animate-pulse`} />
      
      {/* Spinning Bát Quái Trigram Dais Circle */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 sm:w-80 h-72 sm:h-80 pointer-events-none opacity-20">
        <svg viewBox="0 0 100 100" className="w-full h-full animate-[spin_50s_linear_infinite]">
          <circle cx="50" cy="50" r="46" fill="none" stroke="#fbbf24" strokeWidth="0.8" strokeDasharray="3 3" />
          <circle cx="50" cy="50" r="38" fill="none" stroke="#fbbf24" strokeWidth="0.5" />
          <path d="M50 4 A46 46 0 0 1 50 96 A23 23 0 0 1 50 50 A23 23 0 0 0 50 4 Z" fill="none" stroke="#fbbf24" strokeWidth="0.8" />
          <circle cx="50" cy="27" r="4" fill="#fbbf24" opacity="0.6" />
          <circle cx="50" cy="73" r="4" fill="#fbbf24" opacity="0.6" />
        </svg>
      </div>

      {/* Floating Header Badges */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-2 mb-6">
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-full bg-slate-900/90 border border-amber-500/40 text-amber-300 font-bold text-xs flex items-center gap-1.5 shadow-sm">
            <span>{currentRealm.icon}</span>
            <span>{currentRealm.name} Tầng {state.tier} ({subStage})</span>
          </span>
          {state.sect?.sectName && (
            <span className="px-2.5 py-1 rounded-full bg-slate-900/90 border border-slate-700 text-slate-300 font-semibold text-xs flex items-center gap-1">
              <span>🏰</span>
              <span>[{state.sect.sectTag || 'Tông Môn'}] {state.sect.sectName}</span>
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <div className="px-3 py-1 rounded-full bg-amber-500/10 border border-amber-400/40 text-amber-300 font-mono font-bold text-xs flex items-center gap-1">
            <Coins className="w-3.5 h-3.5 text-amber-400" />
            <span>{(state.linhThach || 0).toLocaleString()} Linh Thạch</span>
          </div>
        </div>
      </div>

      {/* Central Meditation Dais: Avatar in Lotus Posture & Grand Halos */}
      <div className="relative z-10 flex flex-col items-center justify-center my-4">
        {/* Layered Sacred Lotus & Halo Rings */}
        <div className="relative flex items-center justify-center">
          {/* Pulsing Spirit Aura Ring */}
          <div className="absolute -inset-6 rounded-full border border-amber-400/30 animate-[spin_20s_linear_infinite] pointer-events-none" />
          <div className="absolute -inset-10 rounded-full border border-dashed border-amber-500/20 animate-[spin_35s_linear_infinite_reverse] pointer-events-none" />
          <div className="absolute -inset-3 rounded-full bg-gradient-to-t from-amber-500/20 via-yellow-400/10 to-transparent blur-md pointer-events-none" />

          {/* Avatar Component */}
          <div className="relative transform hover:scale-105 transition-transform duration-300">
            <AvatarWithFrame
              icon={userAvatar}
              frameId={userFrame}
              size="xl"
              realmIndex={state.realmIndex}
              showRealmAura={true}
            />
            {/* Meditating Lotus Base Platform Icon */}
            <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-slate-950/90 border border-amber-400 text-xs font-bold text-amber-300 shadow-lg flex items-center gap-1">
              <span>🪷</span>
              <span className="text-[10px] uppercase font-mono tracking-wider">Tọa Thiền</span>
            </div>
          </div>
        </div>

        {/* Name & Title */}
        <h3 className="mt-5 text-xl sm:text-2xl font-black text-amber-200 tracking-wide flex items-center gap-2">
          <span>{username}</span>
          <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/40">
            {currentRealm.titleName}
          </span>
        </h3>
        <p className="text-xs text-slate-300 max-w-md mx-auto mt-1 italic leading-relaxed">
          &ldquo;{currentRealm.desc}&rdquo;
        </p>
      </div>

      {/* Equipped Artifact & Active Mantra Mini Bar */}
      <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl mx-auto mt-5">
        {/* Bản Mệnh Pháp Bảo */}
        <div className="p-2.5 rounded-2xl bg-slate-950/70 border border-slate-800 text-left flex items-center gap-2.5 shadow-inner">
          <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-lg shrink-0">
            {equippedArtifact ? equippedArtifact.icon : '⚔️'}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold flex items-center justify-between">
              <span>Bản Mệnh Pháp Bảo</span>
              {equippedArtifact && (
                <span className="text-purple-300 font-normal">
                  {equippedArtifact.spiritIcon} {equippedArtifact.spiritName}
                </span>
              )}
            </div>
            <div className="text-xs font-bold text-amber-300 truncate">
              {equippedArtifact ? `${equippedArtifact.name} (Cấp ${state.artifacts?.levels[state.artifacts.equipped!] || 1})` : 'Chưa luyện hóa'}
            </div>
          </div>
        </div>

        {/* Tâm Pháp Chủ Đạo */}
        <div className="p-2.5 rounded-2xl bg-slate-950/70 border border-slate-800 text-left flex items-center gap-2.5 shadow-inner">
          <div className="w-8 h-8 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-lg shrink-0">
            {equippedTamPhap ? equippedTamPhap.icon : '📖'}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold flex items-center justify-between">
              <span>Tâm Pháp Chủ Đạo</span>
              {state.tamPhap?.equipped && (
                <span className="text-cyan-400 font-mono">
                  Tầng {state.tamPhap.levels?.[state.tamPhap.equipped] || 1}/9
                </span>
              )}
            </div>
            <div className="text-xs font-bold text-cyan-300 truncate">
              {equippedTamPhap ? equippedTamPhap.name : 'Chưa vận hành'}
            </div>
          </div>
        </div>
      </div>

      {/* Active Pill Buffs & Immunties */}
      {Boolean(
        (state.activeBuffs?.dinhTamMatchesRemaining || 0) > 0 ||
        (state.activeBuffs?.ngungThanMatchesRemaining || 0) > 0 ||
        (state.activeBuffs?.kimCangImmunityUntil || 0) > Date.now()
      ) && (
        <div className="relative z-10 flex flex-wrap items-center justify-center gap-2 max-w-xl mx-auto mt-3">
          {(state.activeBuffs?.dinhTamMatchesRemaining || 0) > 0 && (
            <span className="px-2.5 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 text-[11px] font-bold flex items-center gap-1.5 shadow-sm">
              <span>🧘</span>
              <span>Định Tâm Đan ({state.activeBuffs?.dinhTamMatchesRemaining} ván)</span>
            </span>
          )}
          {(state.activeBuffs?.ngungThanMatchesRemaining || 0) > 0 && (
            <span className="px-2.5 py-1 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-[11px] font-bold flex items-center gap-1.5 shadow-sm">
              <span>👁️</span>
              <span>Ngưng Thần Đan ({state.activeBuffs?.ngungThanMatchesRemaining} ván)</span>
            </span>
          )}
          {Boolean(state.activeBuffs?.kimCangImmunityUntil && state.activeBuffs.kimCangImmunityUntil > Date.now()) && (
            <span className="px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[11px] font-bold flex items-center gap-1.5 shadow-sm animate-pulse">
              <span>🛡️</span>
              <span>Kim Cang Bất Hoại (Miễn Giảm Thọ Nguyên)</span>
            </span>
          )}
        </div>
      )}

      {/* Ready for Tribulation Banner */}
      {isReadyBreakthrough && (
        <div className="relative z-10 mt-6 max-w-xl mx-auto p-4 rounded-2xl bg-gradient-to-r from-amber-500/25 via-yellow-400/25 to-red-500/25 border-2 border-amber-400 shadow-[0_0_30px_rgba(251,191,36,0.4)] animate-bounce flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-left flex items-center gap-3">
            <span className="text-3xl">🌩️</span>
            <div>
              <h4 className="text-sm font-black text-amber-300 uppercase tracking-wide">
                Thiên Kiếp Đã Đến • Khởi Sự Nghênh Lôi!
              </h4>
              <p className="text-xs text-slate-200">
                Tu vi đã đạt Cực Hạn Tầng 10! Hãy bước vào Lôi Kiếp Trận để phá vỡ bình cảnh phi thăng!
              </p>
            </div>
          </div>
          <button
            onClick={onOpenTribulation}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-300 text-slate-950 font-black text-xs uppercase tracking-wider hover:brightness-110 shadow-lg shrink-0 cursor-pointer"
          >
            Độ Kiếp Ngay
          </button>
        </div>
      )}
    </div>
  );
};
