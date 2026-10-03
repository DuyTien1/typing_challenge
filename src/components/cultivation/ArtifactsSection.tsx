import React, { useState, useEffect } from 'react';
import {
  CultivationState,
  ARTIFACT_CONFIGS,
  TAM_PHAP_CONFIGS,
  equipArtifact,
  upgradeArtifact,
  equipTamPhap,
  interactWithArtifactSpirit,
  ArtifactType,
  TamPhapType,
} from '../../utils/cultivation';
import { soundFx } from '../../utils/audio';
import {
  Swords,
  Sparkles,
  Shield,
  Zap,
  Hammer,
  CheckCircle2,
  Coins,
  ArrowUpCircle,
  MessageCircle,
  Heart,
  Flame,
  Award,
  X,
} from 'lucide-react';

interface ArtifactsSectionProps {
  state: CultivationState;
  onUpdateState: (newState: CultivationState) => void;
}

export const ArtifactsSection: React.FC<ArtifactsSectionProps> = ({ state, onUpdateState }) => {
  const [activeSubTab, setActiveSubTab] = useState<'artifacts' | 'mantra'>('artifacts');
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [activeSpiritChat, setActiveSpiritChat] = useState<{
    artKey: ArtifactType;
    greeting: string;
  } | null>(null);

  // Listen to Escape key to quickly close Khí Linh dialog
  useEffect(() => {
    if (!activeSpiritChat) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        soundFx.playKeyClick();
        setActiveSpiritChat(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [activeSpiritChat]);

  const equippedArtifactKey = state.artifacts?.equipped;
  const artifactLevels = state.artifacts?.levels || {
    thanh_van_kiem: 1,
    hao_thien_kinh: 0,
    cuu_pham_lien: 0,
    ban_co_phu: 0,
  };
  const spiritAffection = state.artifacts?.spiritAffection || {
    thanh_van_kiem: 10,
    hao_thien_kinh: 0,
    cuu_pham_lien: 0,
    ban_co_phu: 0,
  };
  const equippedTamPhapKey = state.tamPhap?.equipped;
  const tamPhapLevels = state.tamPhap?.levels || { than_hanh: 1, bat_dong: 1, cuu_chuyen: 1 };
  const tamPhapExp = state.tamPhap?.exp || { than_hanh: 0, bat_dong: 0, cuu_chuyen: 0 };

  // Equip / Unequip Artifact
  const handleToggleArtifact = (artifactKey: ArtifactType) => {
    soundFx.playKeyClick();
    if (equippedArtifactKey === artifactKey) {
      const updated = equipArtifact(state, null);
      setActionNotice('Đã thu hồi bản mệnh pháp bảo về thức hải.');
      onUpdateState(updated);
    } else {
      const updated = equipArtifact(state, artifactKey);
      soundFx.playArtifactAura();
      setActionNotice(`Đã trang bị bản mệnh pháp bảo: ${ARTIFACT_CONFIGS[artifactKey].name}!`);
      onUpdateState(updated);
    }
  };

  // Upgrade Artifact
  const handleUpgradeArtifact = (artifactKey: ArtifactType) => {
    const res = upgradeArtifact(state, artifactKey);
    if (res.success) {
      soundFx.playArtifactAura();
      setActionNotice(res.message);
      onUpdateState(res.updatedState);
    } else {
      soundFx.playError();
      setActionNotice(res.message);
    }
  };

  // Interact with Spirit
  const handleSpiritInteraction = (artKey: ArtifactType) => {
    soundFx.playGuzhengNote(3);
    const res = interactWithArtifactSpirit(state, artKey);
    setActiveSpiritChat({
      artKey,
      greeting: res.message,
    });
    onUpdateState(res.updatedState);
  };

  // Equip Mantra
  const handleToggleMantra = (tamPhapKey: TamPhapType) => {
    soundFx.playKeyClick();
    if (equippedTamPhapKey === tamPhapKey) {
      const updated = equipTamPhap(state, null);
      setActionNotice('Đã thu hồi tâm pháp nội tại.');
      onUpdateState(updated);
    } else {
      const updated = equipTamPhap(state, tamPhapKey);
      soundFx.playGuzhengNote(1);
      setActionNotice(`Đã vận hành tâm pháp: ${TAM_PHAP_CONFIGS[tamPhapKey].name}!`);
      onUpdateState(updated);
    }
  };

  return (
    <div className="space-y-6">
      {/* Sub-tab Navigation */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              soundFx.playKeyClick();
              setActiveSubTab('artifacts');
              setActionNotice(null);
            }}
            className={`px-4 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === 'artifacts'
                ? 'bg-amber-400 text-slate-950 shadow-md'
                : 'bg-slate-900 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Swords className="w-3.5 h-3.5" />
            <span>Bản Mệnh Pháp Bảo & Khí Linh</span>
          </button>

          <button
            onClick={() => {
              soundFx.playKeyClick();
              setActiveSubTab('mantra');
              setActionNotice(null);
            }}
            className={`px-4 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === 'mantra'
                ? 'bg-cyan-400 text-slate-950 shadow-md'
                : 'bg-slate-900 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Tâm Pháp Nội Tại (Tầng 1 - 9)</span>
          </button>
        </div>

        {/* Resources Indicator */}
        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1 text-amber-300 font-mono font-bold bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/30">
            <Coins className="w-3.5 h-3.5 text-amber-400" />
            <span>{(state.linhThach || 0).toLocaleString()} Linh Thạch</span>
          </div>
          <div className="flex items-center gap-1 text-cyan-300 font-mono font-bold bg-cyan-500/10 px-2.5 py-1 rounded-lg border border-cyan-500/30">
            <span>💎</span>
            <span>{state.herbs?.huyenThiet || 0} Huyền Thiết</span>
          </div>
        </div>
      </div>

      {/* Action Notice Toast */}
      {actionNotice && (
        <div className="p-3 rounded-xl bg-amber-500/15 border border-amber-400/50 text-amber-300 text-xs font-bold flex items-center gap-2 animate-fadeIn">
          <Sparkles className="w-4 h-4 shrink-0 text-amber-400" />
          <span>{actionNotice}</span>
        </div>
      )}

      {/* 1. ARTIFACTS VIEW */}
      {activeSubTab === 'artifacts' && (
        <div className="space-y-4">
          <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-slate-300 flex items-center justify-between">
            <span>
              ⚔️ <strong>Bản Mệnh Pháp Bảo:</strong> Thay đổi hoàn toàn thị giác và âm thanh khi gõ phím. Đạt Cấp 10 thức tỉnh Khí Linh đồng hành!
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(Object.keys(ARTIFACT_CONFIGS) as ArtifactType[]).map((artKey) => {
              const art = ARTIFACT_CONFIGS[artKey];
              const isEquipped = equippedArtifactKey === artKey;
              const level = artifactLevels[artKey] || (artKey === 'thanh_van_kiem' ? 1 : 0);
              const isUnlocked = state.realmIndex >= art.unlockedRealmIndex;
              const isAwakened = level >= 10;
              const affection = spiritAffection[artKey] || 10;

              const nextCostLinhThach = (level + 1) * 80;
              const nextCostHuyenThiet = Math.max(1, Math.floor(level / 2));
              const canUpgrade =
                (state.linhThach || 0) >= nextCostLinhThach &&
                (state.herbs?.huyenThiet || 0) >= nextCostHuyenThiet;

              return (
                <div
                  key={artKey}
                  className={`p-5 rounded-2xl border transition-all flex flex-col justify-between relative overflow-hidden ${
                    isEquipped
                      ? 'bg-gradient-to-b from-amber-500/15 via-slate-900 to-slate-950 border-amber-400 shadow-[0_0_20px_rgba(251,191,36,0.25)]'
                      : 'bg-slate-900/80 border-slate-800'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex items-center gap-3">
                        <span className="text-3xl p-2 rounded-xl bg-slate-950 border border-slate-800 shadow-inner">
                          {art.icon}
                        </span>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-black text-white">{art.name}</h4>
                            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/40">
                              Cấp {level}/10
                            </span>
                            {isAwakened && (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-400/40">
                                🌟 Đã Thức Tỉnh Khí Linh
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block mt-0.5">
                            {art.title}
                          </span>
                        </div>
                      </div>

                      {isEquipped ? (
                        <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-black uppercase tracking-wider animate-pulse shrink-0">
                          Đang Trang Bị
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-500 font-bold shrink-0">
                          Yêu cầu: {art.unlockedRealmName}
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-300 leading-relaxed mt-2 mb-3 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80">
                      {art.desc}
                    </p>

                    {/* Hiệu Ứng Vệt Phím Khi Gõ */}
                    <div className="p-2.5 rounded-xl bg-amber-950/20 border border-amber-500/30 text-xs mb-3 space-y-1">
                      <div className="text-[10px] font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                        <Flame className="w-3 h-3 text-amber-400" />
                        <span>Hiệu Ứng Vệt Phím Kiếm Khí:</span>
                      </div>
                      <p className="text-[11px] text-amber-200/90 leading-tight">
                        {art.visualEffect}
                      </p>
                    </div>

                    {/* Artifact Spirit Info if high level */}
                    {level >= 5 && (
                      <div className="p-2.5 rounded-xl bg-purple-950/30 border border-purple-500/30 text-xs mb-3 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xl p-1 bg-slate-950 rounded-lg border border-purple-500/40">
                            {art.spiritIcon}
                          </span>
                          <div>
                            <span className="text-xs font-bold text-purple-200 block">
                              Khí Linh: {art.spiritName}
                            </span>
                            <span className="text-[10px] text-purple-300/80">
                              Độ Thân Mật: <strong>{affection}/100</strong>
                            </span>
                          </div>
                        </div>

                        <button
                          onClick={() => handleSpiritInteraction(artKey)}
                          className="px-2.5 py-1 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/40 text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer"
                        >
                          <MessageCircle className="w-3 h-3" />
                          <span>Trò Chuyện</span>
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="space-y-3 pt-3 border-t border-slate-800/80">
                    {/* Upgrade info */}
                    {level < 10 && (
                      <div className="flex items-center justify-between text-[11px] text-slate-400">
                        <span>Chi phí tôi luyện Cấp {level + 1}:</span>
                        <span className="font-mono font-bold text-amber-300">
                          {nextCostLinhThach} Linh Thạch • {nextCostHuyenThiet} Huyền Thiết
                        </span>
                      </div>
                    )}

                    {/* Buttons */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleToggleArtifact(artKey)}
                        disabled={!isUnlocked}
                        className={`flex-1 py-2 px-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-all cursor-pointer ${
                          !isUnlocked
                            ? 'bg-slate-800 text-slate-500 border border-slate-700 opacity-60 cursor-not-allowed'
                            : isEquipped
                            ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                            : 'bg-gradient-to-r from-amber-400 to-yellow-300 hover:brightness-110 text-slate-950 font-black shadow-md'
                        }`}
                      >
                        {!isUnlocked
                          ? `Cần ${art.unlockedRealmName}`
                          : isEquipped
                          ? 'Thu Hồi'
                          : 'Trang Bị Bản Mệnh'}
                      </button>

                      {level < 10 && (
                        <button
                          onClick={() => handleUpgradeArtifact(artKey)}
                          disabled={!canUpgrade}
                          title={`Tôi luyện tăng thêm chỉ số (Cần ${nextCostLinhThach} Linh Thạch & ${nextCostHuyenThiet} Huyền Thiết)`}
                          className={`py-2 px-3.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
                            canUpgrade
                              ? 'bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/50'
                              : 'bg-slate-800 text-slate-500 border border-slate-700 opacity-50 cursor-not-allowed'
                          }`}
                        >
                          <Hammer className="w-3.5 h-3.5" />
                          <span>Tôi Luyện</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Modal / Dialog Trò Chuyện Khí Linh */}
          {activeSpiritChat && (
            <div
              className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn"
              onClick={(e) => {
                if (e.target === e.currentTarget) {
                  soundFx.playKeyClick();
                  setActiveSpiritChat(null);
                }
              }}
            >
              <div className="relative w-full max-w-md bg-slate-900 border border-purple-500/40 rounded-3xl p-6 shadow-2xl space-y-4">
                <button
                  type="button"
                  onClick={() => {
                    soundFx.playKeyClick();
                    setActiveSpiritChat(null);
                  }}
                  className="absolute top-4 right-4 py-1 px-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer flex items-center gap-1 border border-slate-700/60 shadow-sm"
                  title="Bái biệt Khí Linh (phím Esc)"
                >
                  <X className="w-3.5 h-3.5" />
                  <kbd className="text-[9px] font-mono font-bold text-amber-300">Esc</kbd>
                </button>

                <div className="flex items-center gap-3 pr-14">
                  <span className="text-4xl p-2 bg-slate-950 rounded-2xl border border-purple-500/40 shadow-inner">
                    {ARTIFACT_CONFIGS[activeSpiritChat.artKey].spiritIcon}
                  </span>
                  <div>
                    <h4 className="text-base font-black text-purple-300">
                      Khí Linh: {ARTIFACT_CONFIGS[activeSpiritChat.artKey].spiritName}
                    </h4>
                    <span className="text-xs text-slate-400">
                      {ARTIFACT_CONFIGS[activeSpiritChat.artKey].name}
                    </span>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-purple-950/30 border border-purple-500/40 text-sm text-purple-200 leading-relaxed italic">
                  &ldquo;{activeSpiritChat.greeting}&rdquo;
                </div>

                <p className="text-xs text-slate-400">
                  ✨ Độ thân mật đã tăng +5! Khi vào trận thi đấu, Khí Linh sẽ cổ vũ và kích hoạt vệt phím hào quang!
                </p>

                <div className="flex justify-end pt-2">
                  <button
                    onClick={() => {
                      soundFx.playKeyClick();
                      setActiveSpiritChat(null);
                    }}
                    className="px-4 py-2 rounded-xl bg-purple-500 hover:bg-purple-400 text-slate-950 font-bold text-xs cursor-pointer flex items-center gap-1.5 shadow-md active:scale-95 transition-transform"
                  >
                    <span>Bái Biệt Khí Linh</span>
                    <kbd className="text-[9px] font-mono font-bold px-1 py-0.5 rounded bg-purple-900/40 text-slate-900">Esc</kbd>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 2. MANTRA VIEW (TÂM PHÁP NỘI TẠI TẦNG 1 - 9) */}
      {activeSubTab === 'mantra' && (
        <div className="space-y-4">
          <div className="p-3.5 rounded-xl bg-cyan-950/30 border border-cyan-500/30 text-xs text-cyan-200 flex items-center justify-between">
            <span>
              💡 <strong>Hệ Thống Công Pháp Nội Tại (Tầng 1 → Tầng 9):</strong> Tu vi và kinh nghiệm thi đấu sẽ bồi dưỡng tầng thứ tâm pháp, đạt Tầng 9 sẽ kích hoạt <strong>Kỹ Năng Đỉnh Cấp</strong>!
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {(Object.keys(TAM_PHAP_CONFIGS) as TamPhapType[]).map((mKey) => {
              const mantra = TAM_PHAP_CONFIGS[mKey];
              const isEquipped = equippedTamPhapKey === mKey;
              const tier = tamPhapLevels[mKey] || 1;
              const exp = tamPhapExp[mKey] || 0;
              const reqExp = tier * 130;
              const progressPct = tier >= 9 ? 100 : Math.min(100, Math.round((exp / reqExp) * 100));

              return (
                <div
                  key={mKey}
                  className={`p-5 rounded-2xl border transition-all flex flex-col justify-between ${
                    isEquipped
                      ? 'bg-gradient-to-b from-cyan-500/15 via-slate-900 to-slate-950 border-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.25)]'
                      : 'bg-slate-900/80 border-slate-800'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <span className="text-3xl p-2 rounded-xl bg-slate-950 border border-slate-800 shadow-inner">
                          {mantra.icon}
                        </span>
                        <div>
                          <h4 className="text-sm font-black text-white">{mantra.name}</h4>
                          <span className="text-[10px] font-semibold text-cyan-300 uppercase tracking-wider block mt-0.5">
                            {mantra.shortDesc}
                          </span>
                        </div>
                      </div>

                      <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-xs font-bold font-mono">
                        Tầng {tier}/9
                      </span>
                    </div>

                    {/* Progress Bar Tầng 1 -> 9 */}
                    <div className="space-y-1 mb-3">
                      <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                        <span>Tiến cảnh:</span>
                        <span>{tier >= 9 ? 'ĐỈNH CẤP' : `${exp}/${reqExp} EXP`}</span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-300"
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>
                    </div>

                    <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/70 p-3 rounded-xl border border-slate-800/80 mb-3">
                      {mantra.fullDesc}
                    </p>

                    {/* Hiệu Ứng Bị Động Theo Tầng */}
                    <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800/90 text-xs mb-2 space-y-1">
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Nội Tại Hiện Tại (Tầng {tier}):
                      </div>
                      <p className="text-[11px] text-emerald-400 leading-tight">
                        {mantra.tierEffects[tier - 1] || mantra.tierEffects[0]}
                      </p>
                    </div>

                    {/* Hiệu Ứng Đỉnh Cấp Tầng 9 */}
                    <div className={`p-2.5 rounded-xl border text-xs space-y-1 ${
                      tier >= 9
                        ? 'bg-amber-500/15 border-amber-400 text-amber-200'
                        : 'bg-slate-950/50 border-slate-800/60 text-slate-400'
                    }`}>
                      <div className="text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 text-amber-300">
                        <Award className="w-3 h-3 text-amber-400" />
                        <span>Kỹ Năng Đỉnh Cấp (Tầng 9):</span>
                      </div>
                      <p className="text-[11px] leading-tight">
                        {mantra.ultimateDesc}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-800/80">
                    <button
                      onClick={() => handleToggleMantra(mKey)}
                      className={`w-full py-2.5 px-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-all cursor-pointer ${
                        isEquipped
                          ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                          : 'bg-gradient-to-r from-cyan-400 to-blue-500 hover:brightness-110 text-slate-950 font-black shadow-md'
                      }`}
                    >
                      {isEquipped ? 'Thu Hồi Tâm Pháp' : 'Vận Hành Tâm Pháp'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

