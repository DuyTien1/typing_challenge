import React, { useEffect, useRef, useState } from 'react';
import { ArtifactType } from '../../types';
import { 
  ARTIFACT_CONFIGS, 
  loadStoredCultivationState, 
  equipArtifact, 
  saveStoredCultivationState,
  CultivationState,
  XIANXIA_REALMS 
} from '../../utils/cultivation';
import { 
  getStoredFrame, 
  getFrameConfig, 
  AVATAR_FRAMES 
} from '../../utils/frames';
import { Sparkles } from 'lucide-react';

export interface ArtifactInputVfxFrameProps {
  artifact?: ArtifactType | null;
  userFrame?: string | null;
  cultivationState?: CultivationState | null;
  wpm?: number;
  combo?: number;
  isTyping?: boolean;
  isError?: boolean;
  lastKeystroke?: number; // timestamp of keystroke
  onSelectArtifact?: (art: ArtifactType | null) => void;
  showSelector?: boolean;
  children: React.ReactNode;
  className?: string;
}

// Particle interface for the VFX Engine
interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  maxLife: number;
  life: number;
  color: string;
  alpha: number;
  type: 
    | 'spark' 
    | 'blade' 
    | 'petal' 
    | 'lightning' 
    | 'rune' 
    | 'orb' 
    | 'flame' 
    | 'electric_arc' 
    | 'matrix_code' 
    | 'star' 
    | 'dragon_flame' 
    | 'leaf' 
    | 'crystal';
  angle?: number;
  va?: number; // angular velocity
  extra?: any;
}

// Lightning arc interface
interface LightningArc {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  life: number;
  maxLife: number;
  branches: { x: number; y: number }[];
  color: string;
  width?: number;
}

// Flying sword interface for Thanh Vân Kiếm
interface OrbitSword {
  angle: number;
  speed: number;
  distX: number;
  distY: number;
  trail: { x: number; y: number }[];
}

/**
 * Helper to compute cultivation scaling for particle count, size, and spiritual aura
 */
function getCultivationVfxScaling(cultivation: CultivationState | null) {
  if (!cultivation) {
    return {
      realmIdx: 0,
      realmName: 'Phàm Nhân',
      subStage: 'Sơ Kỳ',
      intensity: 1.0,
      particleMultiplier: 1.0,
      sizeMultiplier: 1.0,
      speedMultiplier: 1.0,
      isHighRealm: false,
      isSupremeRealm: false,
    };
  }

  const realmIdx = Math.max(0, Math.min(11, cultivation.realmIndex ?? 0));
  const level = cultivation.level ?? 1;
  const tier = cultivation.tier ?? 1;

  // Scaling progression:
  // Realm 0 (Luyện Khí): 1.0x
  // Realm 3 (Nguyên Anh): 1.35x
  // Realm 6 (Hợp Thể): 1.7x
  // Realm 8 (Độ Kiếp): 2.0x
  // Realm 11 (Thiên Tôn): 2.4x
  const realmBonus = realmIdx * 0.12;
  const levelBonus = Math.min(level / 1000, 0.25);
  const intensity = 1.0 + realmBonus + levelBonus;

  return {
    realmIdx,
    realmName: cultivation.realmName || XIANXIA_REALMS[realmIdx]?.name || 'Tu Tiên Giả',
    subStage: cultivation.subStage || `${tier} Tầng`,
    intensity,
    particleMultiplier: 1.0 + realmIdx * 0.14,
    sizeMultiplier: 1.0 + realmIdx * 0.08,
    speedMultiplier: 1.0 + realmIdx * 0.05,
    isHighRealm: realmIdx >= 4,      // Hóa Thần trở lên
    isSupremeRealm: realmIdx >= 8,   // Độ Kiếp, Kim Tiên, Đại La, Thiên Tôn
  };
}

/**
 * Determine the visual elemental theme of a userFrame
 */
function resolveFrameElementalType(frameId: string | null | undefined): 
  | 'flame' 
  | 'lightning' 
  | 'matrix' 
  | 'cosmic' 
  | 'arcane' 
  | 'dragon' 
  | 'admin_gold' 
  | 'wood_leaf' 
  | 'crystal' 
  | 'golden_core' 
  | 'chrono' 
  | 'default' {
  if (!frameId) return 'default';
  const fid = frameId.toLowerCase();

  if (fid === 'flame' || fid === 'top_vi_dau' || fid === 'top_ngau_hung' || fid === 'frame_xianxia_daithua') {
    return 'flame';
  }
  if (fid === 'lightning' || fid === 'top_vi_nodau' || fid === 'frame_xianxia_hopthe' || fid === 'frame_xianxia_dokiep') {
    return 'lightning';
  }
  if (fid === 'matrix' || fid === 'top_numpad') {
    return 'matrix';
  }
  if (fid === 'cosmic' || fid === 'top_en' || fid === 'frame_xianxia_hoathan' || fid === 'frame_xianxia_luyenhu') {
    return 'cosmic';
  }
  if (fid === 'arcane' || fid === 'top_doan_chu' || fid === 'frame_xianxia_nguyenanh') {
    return 'arcane';
  }
  if (fid === 'dragon' || fid === 'top_san_boss') {
    return 'dragon';
  }
  if (
    fid === 'admin_gold' || 
    fid === 'frame_xianxia_thienton' || 
    fid === 'frame_xianxia_kimtien' || 
    fid === 'frame_xianxia_daila'
  ) {
    return 'admin_gold';
  }
  if (fid === 'frame_xianxia_luyenkhi') {
    return 'wood_leaf';
  }
  if (fid === 'frame_xianxia_trucco') {
    return 'crystal';
  }
  if (fid === 'frame_xianxia_ketdan') {
    return 'golden_core';
  }
  if (fid === 'top_outplay') {
    return 'chrono';
  }

  return 'default';
}

export const ArtifactInputVfxFrame: React.FC<ArtifactInputVfxFrameProps> = ({
  artifact = null,
  userFrame: propUserFrame,
  cultivationState: propCultivationState,
  wpm = 0,
  combo = 0,
  isTyping = false,
  isError = false,
  lastKeystroke = 0,
  onSelectArtifact,
  showSelector = false,
  children,
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Active Artifact state
  const [activeArtifact, setActiveArtifact] = useState<ArtifactType | null>(() => {
    if (artifact !== undefined) return artifact;
    try {
      const state = loadStoredCultivationState();
      return state?.artifacts?.equipped || null;
    } catch {
      return null;
    }
  });

  // Active User Frame
  const activeFrameId = propUserFrame !== undefined && propUserFrame !== null 
    ? propUserFrame 
    : getStoredFrame();

  // Active Cultivation State
  const activeCultivation = propCultivationState !== undefined && propCultivationState !== null
    ? propCultivationState
    : loadStoredCultivationState();

  const cultScale = getCultivationVfxScaling(activeCultivation);
  const frameElementalType = resolveFrameElementalType(activeFrameId);

  // VFX Master Toggle
  const [vfxEnabled, setVfxEnabled] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('fasttyping_vfx_enabled');
      return saved !== null ? saved === 'true' : true;
    } catch {
      return true;
    }
  });

  // Sync VFX toggle changes across instances
  useEffect(() => {
    const handleSync = () => {
      try {
        const saved = localStorage.getItem('fasttyping_vfx_enabled');
        setVfxEnabled(saved !== null ? saved === 'true' : true);
      } catch {}
    };
    window.addEventListener('fasttyping_vfx_changed', handleSync);
    window.addEventListener('storage', handleSync);
    return () => {
      window.removeEventListener('fasttyping_vfx_changed', handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, []);

  // Sync artifact prop if changes
  useEffect(() => {
    if (artifact !== undefined) {
      setActiveArtifact(artifact);
    }
  }, [artifact]);

  const handleToggleVfx = () => {
    const next = !vfxEnabled;
    setVfxEnabled(next);
    try {
      localStorage.setItem('fasttyping_vfx_enabled', String(next));
      window.dispatchEvent(new Event('fasttyping_vfx_changed'));
    } catch {}
  };

  // State refs for animation loop
  const particlesRef = useRef<Particle[]>([]);
  const lightningsRef = useRef<LightningArc[]>([]);
  const orbitSwordsRef = useRef<OrbitSword[]>([
    { angle: 0, speed: 0.008, distX: 0, distY: 0, trail: [] },
    { angle: Math.PI, speed: 0.008, distX: 0, distY: 0, trail: [] },
  ]);
  const spawnTimerRef = useRef<number>(0);
  const animFrameIdRef = useRef<number | null>(null);
  const prevTimeRef = useRef<number>(performance.now());
  const errorFlashRef = useRef<number>(0);

  // Helper to pad coordinates
  const padX = (w: number, ratio: number) => 12 + ratio * (w - 24);

  // Trigger error feedback
  useEffect(() => {
    if (!vfxEnabled || !isError) return;
    errorFlashRef.current = 1.0;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.width / dpr;
    const h = canvas.height / dpr;

    // Lotus error absorption if equipped
    if (activeArtifact === 'cuu_pham_lien') {
      for (let i = 0; i < 4; i++) {
        particlesRef.current.push({
          x: w / 2 + (Math.random() - 0.5) * 30,
          y: h / 2 + (Math.random() - 0.5) * 15,
          vx: (Math.random() - 0.5) * 0.6,
          vy: (Math.random() - 0.5) * 0.6,
          size: 5 + Math.random() * 3,
          maxLife: 40,
          life: 40,
          color: '#e879f9',
          alpha: 0.9,
          type: 'petal',
          angle: Math.random() * Math.PI * 2,
          va: 0.02,
          extra: { wavePhase: 0 },
        });
      }
    }
  }, [isError, activeArtifact, vfxEnabled]);

  // =========================================================================
  // MAIN CANVAS ANIMATION LOOP (RUNS SLOWLY AT A FIXED CONSTANT SPEED)
  // Completely decoupled from typing/keystrokes for zero visual distraction
  // =========================================================================
  useEffect(() => {
    if (!vfxEnabled) return;

    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const updateSize = () => {
      const rect = container.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const targetW = Math.max(rect.width + 24, 280);
      const targetH = 48 + 24; // Strict 72px canvas height (48px input + 12px padding top/bottom)

      if (canvas.width !== targetW * dpr || canvas.height !== targetH * dpr) {
        canvas.width = targetW * dpr;
        canvas.height = targetH * dpr;
        canvas.style.width = `${targetW}px`;
        canvas.style.height = `${targetH}px`;
      }
    };

    updateSize();
    const resizeObserver = new ResizeObserver(updateSize);
    resizeObserver.observe(container);

    let isRunning = true;

    const render = (time: number) => {
      if (!isRunning) return;
      const dt = Math.min((time - prevTimeRef.current) / 1000, 0.1);
      prevTimeRef.current = time;

      const dpr = window.devicePixelRatio || 1;
      const w = canvas.width / dpr;
      const h = canvas.height / dpr;

      ctx.save();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      // Bounds of the inner input box - exactly 48px height matching h-12 input
      const padXVal = 12;
      const padYVal = 12;
      const boxW = w - padXVal * 2;
      const boxH = 48;
      const radius = 12;

      const art = activeArtifact;

      // Helper for drawing rounded rect
      const drawRoundRect = (x: number, y: number, rw: number, rh: number, r: number) => {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + rw - r, y);
        ctx.quadraticCurveTo(x + rw, y, x + rw, y + r);
        ctx.lineTo(x + rw, y + rh - r);
        ctx.quadraticCurveTo(x + rw, y + rh, x + rw - r, y + rh);
        ctx.lineTo(x + r, y + rh);
        ctx.quadraticCurveTo(x, y + rh, x, y + rh - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
      };

      // Helper for corner bracket accents
      const drawCornerBracket = (cx: number, cy: number, dx: number, dy: number, len: number, color: string) => {
        ctx.strokeStyle = color;
        ctx.lineWidth = 2.0;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(cx, cy + dy * len);
        ctx.lineTo(cx, cy);
        ctx.lineTo(cx + dx * len, cy);
        ctx.stroke();
      };

      // ========================================================
      // 1. BASE AURA GLOW LAYER (FIXED ELEGANT SPEED & INTENSITY)
      // ========================================================
      ctx.save();
      let borderColor = 'rgba(251, 191, 36, 0.5)';
      let cornerColor = '#fbbf24';

      // Map border/corner colors to userFrame elemental type with calm, steady opacity
      if (frameElementalType === 'flame') {
        borderColor = 'rgba(244, 63, 94, 0.65)';
        cornerColor = cultScale.isSupremeRealm ? '#fb923c' : '#f43f5e';
      } else if (frameElementalType === 'lightning') {
        borderColor = 'rgba(250, 204, 21, 0.7)';
        cornerColor = cultScale.isSupremeRealm ? '#ffffff' : '#facc15';
      } else if (frameElementalType === 'matrix') {
        borderColor = 'rgba(52, 211, 153, 0.65)';
        cornerColor = '#34d399';
      } else if (frameElementalType === 'cosmic') {
        borderColor = 'rgba(56, 189, 248, 0.65)';
        cornerColor = '#38bdf8';
      } else if (frameElementalType === 'arcane') {
        borderColor = 'rgba(192, 132, 252, 0.65)';
        cornerColor = '#c084fc';
      } else if (frameElementalType === 'dragon') {
        borderColor = 'rgba(220, 38, 38, 0.7)';
        cornerColor = '#dc2626';
      } else if (frameElementalType === 'admin_gold') {
        borderColor = 'rgba(251, 191, 36, 0.8)';
        cornerColor = '#fbbf24';
      } else if (frameElementalType === 'wood_leaf') {
        borderColor = 'rgba(16, 185, 129, 0.65)';
        cornerColor = '#10b981';
      } else if (frameElementalType === 'crystal') {
        borderColor = 'rgba(6, 182, 212, 0.65)';
        cornerColor = '#06b6d4';
      } else if (frameElementalType === 'chrono') {
        borderColor = 'rgba(34, 211, 238, 0.7)';
        cornerColor = '#22d3ee';
      }

      // If active artifact is equipped, blend artifact accents
      if (art === 'thanh_van_kiem') {
        cornerColor = '#22d3ee';
      } else if (art === 'hao_thien_kinh') {
        cornerColor = '#facc15';
      } else if (art === 'cuu_pham_lien') {
        cornerColor = '#c084fc';
      } else if (art === 'ban_co_phu') {
        cornerColor = '#f97316';
      }

      // Fixed calm aura glow - constant blur and width
      ctx.shadowColor = cornerColor;
      ctx.shadowBlur = 9;
      drawRoundRect(padXVal, padYVal, boxW, boxH, radius);
      ctx.strokeStyle = borderColor;
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.restore();

      // ========================================================
      // 2. CORNER ACCENTS & RUNIC MOTIFS
      // ========================================================
      const cornerSize = 12;
      drawCornerBracket(padXVal, padYVal, 1, 1, cornerSize, cornerColor);
      drawCornerBracket(padXVal + boxW, padYVal, -1, 1, cornerSize, cornerColor);
      drawCornerBracket(padXVal, padYVal + boxH, 1, -1, cornerSize, cornerColor);
      drawCornerBracket(padXVal + boxW, padYVal + boxH, -1, -1, cornerSize, cornerColor);

      // Rotating Conic Ring for Admin Gold or Supreme Realm at a slow, fixed constant speed
      if (frameElementalType === 'admin_gold' || cultScale.isSupremeRealm) {
        ctx.save();
        const angle = time * 0.0006; // Slow fixed constant rotation
        const grad = ctx.createConicGradient(angle, w / 2, h / 2);
        grad.addColorStop(0, 'rgba(251, 191, 36, 0.45)');
        grad.addColorStop(0.25, 'rgba(244, 63, 94, 0.45)');
        grad.addColorStop(0.5, 'rgba(56, 189, 248, 0.45)');
        grad.addColorStop(0.75, 'rgba(192, 132, 252, 0.45)');
        grad.addColorStop(1, 'rgba(251, 191, 36, 0.45)');

        ctx.strokeStyle = grad;
        ctx.lineWidth = 1.5;
        drawRoundRect(padXVal - 1, padYVal - 1, boxW + 2, boxH + 2, radius + 1);
        ctx.stroke();
        ctx.restore();
      }

      // Thanh Vân Kiếm: Orbiting Flying Swords at a slow, fixed constant speed
      if (art === 'thanh_van_kiem') {
        orbitSwordsRef.current.forEach((os) => {
          os.angle += 0.008; // Slow fixed constant orbit speed
          const rx = boxW / 2 + 8;
          const ry = boxH / 2 + 8;
          const sx = w / 2 + Math.cos(os.angle) * rx;
          const sy = h / 2 + Math.sin(os.angle) * ry;

          os.trail.push({ x: sx, y: sy });
          if (os.trail.length > 6) os.trail.shift();

          ctx.strokeStyle = 'rgba(34, 211, 238, 0.3)';
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          os.trail.forEach((pt, ti) => {
            if (ti === 0) ctx.moveTo(pt.x, pt.y);
            else ctx.lineTo(pt.x, pt.y);
          });
          ctx.stroke();

          ctx.save();
          ctx.translate(sx, sy);
          ctx.rotate(os.angle + Math.PI / 2);
          ctx.fillStyle = '#22d3ee';
          ctx.shadowColor = '#22d3ee';
          ctx.shadowBlur = 6;
          ctx.beginPath();
          ctx.moveTo(0, -6);
          ctx.lineTo(2, 2.5);
          ctx.lineTo(-2, 2.5);
          ctx.closePath();
          ctx.fill();
          ctx.restore();
        });
      }

      // ========================================================
      // 3. FIXED SLOW-PACED AMBIENT PARTICLE SPAWNER
      // Completely independent of player keystrokes
      // ========================================================
      spawnTimerRef.current += 1;
      if (spawnTimerRef.current >= 24 && particlesRef.current.length < 12) {
        spawnTimerRef.current = 0;

        // Spawn a gentle, slow-floating ambient particle
        const spawnX = Math.random() * (boxW - 16) + padXVal + 8;
        const spawnY = padYVal + boxH - 6;

        if (frameElementalType === 'flame') {
          particlesRef.current.push({
            x: spawnX,
            y: spawnY,
            vx: (Math.random() - 0.5) * 0.25,
            vy: -0.35 - Math.random() * 0.25,
            size: 5 + Math.random() * 3,
            maxLife: 80,
            life: 80,
            color: Math.random() > 0.4 ? '#f97316' : '#f59e0b',
            alpha: 0.8,
            type: 'flame',
            angle: 0,
            extra: { wavePhase: Math.random() * Math.PI * 2 },
          });
        } else if (frameElementalType === 'lightning') {
          particlesRef.current.push({
            x: spawnX,
            y: Math.random() > 0.5 ? padYVal + 6 : padYVal + boxH - 6,
            vx: (Math.random() - 0.5) * 0.3,
            vy: (Math.random() - 0.5) * 0.3,
            size: 2.2 + Math.random() * 1.5,
            maxLife: 65,
            life: 65,
            color: '#facc15',
            alpha: 0.85,
            type: 'spark',
          });
        } else if (frameElementalType === 'matrix') {
          const glyphs = ['1', '0', '⚡', 'λ', '0x'];
          particlesRef.current.push({
            x: spawnX,
            y: padYVal + 8,
            vx: 0,
            vy: 0.3 + Math.random() * 0.2,
            size: 9,
            maxLife: 80,
            life: 80,
            color: '#34d399',
            alpha: 0.8,
            type: 'matrix_code',
            extra: { glyph: glyphs[Math.floor(Math.random() * glyphs.length)] },
          });
        } else if (frameElementalType === 'cosmic') {
          particlesRef.current.push({
            x: spawnX,
            y: padYVal + Math.random() * boxH,
            vx: (Math.random() - 0.5) * 0.2,
            vy: (Math.random() - 0.5) * 0.2,
            size: 4 + Math.random() * 2.5,
            maxLife: 90,
            life: 90,
            color: Math.random() > 0.5 ? '#38bdf8' : '#818cf8',
            alpha: 0.8,
            type: 'star',
            angle: Math.random() * Math.PI,
            va: 0.01,
          });
        } else if (frameElementalType === 'arcane') {
          particlesRef.current.push({
            x: spawnX,
            y: spawnY,
            vx: (Math.random() - 0.5) * 0.2,
            vy: -0.3 - Math.random() * 0.2,
            size: 4 + Math.random() * 2,
            maxLife: 85,
            life: 85,
            color: '#c084fc',
            alpha: 0.8,
            type: 'rune',
            angle: Math.random() * Math.PI,
            va: 0.015,
          });
        } else if (frameElementalType === 'dragon') {
          particlesRef.current.push({
            x: spawnX,
            y: spawnY,
            vx: (Math.random() - 0.5) * 0.25,
            vy: -0.35 - Math.random() * 0.2,
            size: 5 + Math.random() * 3,
            maxLife: 80,
            life: 80,
            color: '#ef4444',
            alpha: 0.8,
            type: 'dragon_flame',
            angle: 0,
            va: 0.01,
          });
        } else if (frameElementalType === 'admin_gold') {
          particlesRef.current.push({
            x: spawnX,
            y: padYVal + Math.random() * boxH,
            vx: (Math.random() - 0.5) * 0.25,
            vy: (Math.random() - 0.5) * 0.25,
            size: 4 + Math.random() * 2.5,
            maxLife: 80,
            life: 80,
            color: Math.random() > 0.4 ? '#fbbf24' : '#ffffff',
            alpha: 0.85,
            type: 'star',
            angle: Math.random() * Math.PI,
            va: 0.015,
          });
        } else if (frameElementalType === 'wood_leaf') {
          particlesRef.current.push({
            x: spawnX,
            y: padYVal + 6,
            vx: 0.2 + Math.random() * 0.2,
            vy: 0.25 + Math.random() * 0.2,
            size: 5 + Math.random() * 2.5,
            maxLife: 95,
            life: 95,
            color: '#10b981',
            alpha: 0.8,
            type: 'leaf',
            angle: Math.random() * Math.PI * 2,
            va: 0.015,
            extra: { wavePhase: Math.random() * Math.PI * 2 },
          });
        } else if (frameElementalType === 'crystal') {
          particlesRef.current.push({
            x: spawnX,
            y: padYVal + Math.random() * boxH,
            vx: (Math.random() - 0.5) * 0.2,
            vy: (Math.random() - 0.5) * 0.2,
            size: 4 + Math.random() * 2,
            maxLife: 80,
            life: 80,
            color: '#06b6d4',
            alpha: 0.8,
            type: 'crystal',
            angle: Math.random() * Math.PI,
            va: 0.015,
          });
        } else if (frameElementalType === 'chrono') {
          particlesRef.current.push({
            x: spawnX,
            y: padYVal + Math.random() * boxH,
            vx: (Math.random() > 0.5 ? 0.5 : -0.5),
            vy: (Math.random() - 0.5) * 0.15,
            size: 7 + Math.random() * 3,
            maxLife: 50,
            life: 50,
            color: '#22d3ee',
            alpha: 0.8,
            type: 'blade',
            angle: 0,
          });
        } else {
          // Default / Golden Core ambient stardust
          particlesRef.current.push({
            x: spawnX,
            y: spawnY,
            vx: (Math.random() - 0.5) * 0.2,
            vy: -0.3 - Math.random() * 0.2,
            size: 2.5 + Math.random() * 1.5,
            maxLife: 75,
            life: 75,
            color: '#fbbf24',
            alpha: 0.8,
            type: 'spark',
          });
        }
      }

      // Draw and update active particles with slow, fixed motion
      for (let i = particlesRef.current.length - 1; i >= 0; i--) {
        const p = particlesRef.current[i];
        p.life -= 1;
        if (p.life <= 0) {
          particlesRef.current.splice(i, 1);
          continue;
        }

        const progress = p.life / p.maxLife;
        p.x += p.vx;
        p.y += p.vy;

        if (p.angle !== undefined && p.va !== undefined) {
          p.angle += p.va;
        }

        ctx.save();
        ctx.globalAlpha = p.alpha * progress;

        // --- A. FLAME SHAPE ---
        if (p.type === 'flame') {
          ctx.translate(p.x, p.y);
          if (p.extra?.wavePhase !== undefined) {
            p.extra.wavePhase += 0.04;
            ctx.rotate((p.angle || 0) + Math.sin(p.extra.wavePhase) * 0.08);
          } else {
            ctx.rotate(p.angle || 0);
          }

          ctx.shadowColor = p.color;
          ctx.shadowBlur = 6;

          const flameGrad = ctx.createRadialGradient(0, p.size * 0.3, 0, 0, 0, p.size);
          flameGrad.addColorStop(0, '#ffffff');
          flameGrad.addColorStop(0.35, p.color);
          flameGrad.addColorStop(1, 'rgba(239, 68, 68, 0)');
          ctx.fillStyle = flameGrad;

          ctx.beginPath();
          ctx.moveTo(0, p.size);
          ctx.bezierCurveTo(-p.size * 0.7, p.size * 0.3, -p.size * 0.7, -p.size * 0.3, 0, -p.size * 1.3);
          ctx.bezierCurveTo(p.size * 0.7, -p.size * 0.3, p.size * 0.7, p.size * 0.3, 0, p.size);
          ctx.closePath();
          ctx.fill();
        }

        // --- B. MATRIX DIGITAL CODE GLYPH ---
        else if (p.type === 'matrix_code') {
          ctx.translate(p.x, p.y);
          ctx.fillStyle = p.color;
          ctx.shadowColor = '#10b981';
          ctx.shadowBlur = 5;
          ctx.font = `bold ${Math.round(p.size)}px monospace`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(p.extra?.glyph || '1', 0, 0);
        }

        // --- C. COSMIC TWINKLING STAR ---
        else if (p.type === 'star') {
          ctx.translate(p.x, p.y);
          ctx.rotate(p.angle || 0);
          ctx.fillStyle = p.color;
          ctx.shadowColor = p.color;
          ctx.shadowBlur = 6;
          ctx.beginPath();
          for (let si = 0; si < 4; si++) {
            ctx.rotate(Math.PI / 2);
            ctx.lineTo(p.size, 0);
            ctx.lineTo(p.size * 0.28, p.size * 0.28);
          }
          ctx.closePath();
          ctx.fill();
        }

        // --- D. DRAGON BLOOD FLAME ---
        else if (p.type === 'dragon_flame') {
          ctx.translate(p.x, p.y);
          ctx.rotate(p.angle || 0);
          ctx.fillStyle = p.color;
          ctx.shadowColor = '#dc2626';
          ctx.shadowBlur = 7;
          ctx.beginPath();
          ctx.moveTo(-p.size * 0.4, p.size);
          ctx.quadraticCurveTo(-p.size * 0.8, 0, 0, -p.size * 1.4);
          ctx.quadraticCurveTo(p.size * 0.4, -p.size * 0.4, 0, p.size * 0.5);
          ctx.closePath();
          ctx.fill();
        }

        // --- E. EMERALD WOOD LEAF ---
        else if (p.type === 'leaf') {
          if (p.extra?.wavePhase !== undefined) p.extra.wavePhase += 0.03;
          const sway = Math.sin(p.extra?.wavePhase || 0) * 1.0;
          ctx.translate(p.x + sway, p.y);
          ctx.rotate(p.angle || 0);
          ctx.fillStyle = p.color;
          ctx.shadowColor = p.color;
          ctx.shadowBlur = 4;
          ctx.beginPath();
          ctx.ellipse(0, 0, p.size, p.size * 0.45, 0, 0, Math.PI * 2);
          ctx.fill();
        }

        // --- F. AZURE CRYSTAL SHARD ---
        else if (p.type === 'crystal') {
          ctx.translate(p.x, p.y);
          ctx.rotate(p.angle || 0);
          ctx.fillStyle = p.color;
          ctx.shadowColor = p.color;
          ctx.shadowBlur = 5;
          ctx.beginPath();
          ctx.moveTo(0, -p.size);
          ctx.lineTo(p.size * 0.6, 0);
          ctx.lineTo(0, p.size);
          ctx.lineTo(-p.size * 0.6, 0);
          ctx.closePath();
          ctx.fill();
        }

        // --- G. SWORD BLADE SLASH ---
        else if (p.type === 'blade') {
          ctx.translate(p.x, p.y);
          ctx.rotate(p.angle || 0);
          ctx.fillStyle = p.color;
          ctx.shadowColor = p.color;
          ctx.shadowBlur = 6;
          ctx.beginPath();
          ctx.ellipse(0, 0, p.size, 1.6, 0, 0, Math.PI * 2);
          ctx.fill();
        }

        // --- H. LOTUS PETAL ---
        else if (p.type === 'petal') {
          if (p.extra?.wavePhase !== undefined) p.extra.wavePhase += 0.03;
          const sway = Math.sin(p.extra?.wavePhase || 0) * 1.0;
          ctx.translate(p.x + sway, p.y);
          ctx.rotate(p.angle || 0);
          ctx.fillStyle = p.color;
          ctx.shadowColor = p.color;
          ctx.shadowBlur = 5;
          ctx.beginPath();
          ctx.ellipse(0, 0, p.size, p.size * 0.45, 0, 0, Math.PI * 2);
          ctx.fill();
        }

        // --- I. RUNIC GLYPH ---
        else if (p.type === 'rune') {
          ctx.translate(p.x, p.y);
          ctx.rotate(p.angle || 0);
          ctx.fillStyle = p.color;
          ctx.shadowColor = p.color;
          ctx.shadowBlur = 5;
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        }

        // --- J. STANDARD GLOWING SPARK ---
        else {
          ctx.fillStyle = p.color;
          ctx.shadowColor = p.color;
          ctx.shadowBlur = 5;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * progress, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.restore();
      }

      // ========================================================
      // 4. ERROR FLASH DISRUPTION OVERLAY
      // ========================================================
      if (errorFlashRef.current > 0) {
        ctx.save();
        ctx.globalAlpha = errorFlashRef.current * 0.35;
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 2.5;
        drawRoundRect(padXVal - 2, padYVal - 2, boxW + 4, boxH + 4, radius);
        ctx.stroke();
        ctx.restore();
        errorFlashRef.current = Math.max(0, errorFlashRef.current - dt * 3.5);
      }

      ctx.restore();
      animFrameIdRef.current = requestAnimationFrame(render);
    };

    animFrameIdRef.current = requestAnimationFrame(render);

    return () => {
      isRunning = false;
      if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
      resizeObserver.disconnect();
    };
  }, [vfxEnabled, activeArtifact, frameElementalType, cultScale]);

  return (
    <div className={`relative w-full flex items-center ${className}`}>
      {/* Top Bar: Only VFX Master Toggle Button */}
      {showSelector && (
        <div className="flex items-center justify-end pb-1.5 px-1 select-none">
          <button
            type="button"
            onClick={handleToggleVfx}
            className={`px-2.5 py-0.5 rounded-lg text-[10px] font-semibold flex items-center gap-1 transition-all cursor-pointer ${
              vfxEnabled
                ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/25 shadow-sm'
                : 'bg-slate-800 border border-slate-700 text-slate-400 hover:text-slate-300'
            }`}
            title="Bật/Tắt hiệu ứng Canvas VFX"
          >
            <Sparkles className="w-3 h-3" />
            <span>VFX: {vfxEnabled ? 'BẬT' : 'TẮT'}</span>
          </button>
        </div>
      )}

      {/* Main Canvas VFX Wrapping Frame */}
      <div ref={containerRef} className="relative w-full h-12 flex items-center">
        {/* Hardware-Accelerated 60FPS Canvas Layer */}
        {vfxEnabled && (
          <canvas
            ref={canvasRef}
            className="absolute -top-3 -left-3 pointer-events-none z-10 select-none"
            aria-hidden="true"
          />
        )}

        {/* Inner Input Element (Player typing box) */}
        <div className="relative z-20 w-full h-12 flex items-center">
          {children}
        </div>
      </div>
    </div>
  );
};

// Aliases for convenient importing as VFXEngine
export const VFXEngine = ArtifactInputVfxFrame;
export type VFXEngineProps = ArtifactInputVfxFrameProps;
