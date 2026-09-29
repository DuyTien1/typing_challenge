import React, { useEffect, useRef, useState, useMemo } from 'react';
import { ArtifactType } from '../../types';
import { 
  ARTIFACT_CONFIGS, 
  loadStoredCultivationState, 
  CultivationState,
  XIANXIA_REALMS 
} from '../../utils/cultivation';
import { 
  getStoredFrame, 
  getFrameConfig, 
  AVATAR_FRAMES 
} from '../../utils/frames';
import { Sparkles, Shield, Eye, Flame, Swords } from 'lucide-react';

export interface ArtifactInputVfxFrameProps {
  artifact?: ArtifactType | null;
  userFrame?: string | null;
  cultivationState?: CultivationState | null;
  wpm?: number;
  combo?: number;
  isTyping?: boolean;
  isError?: boolean;
  lastKeystroke?: number;
  onSelectArtifact?: (art: ArtifactType | null) => void;
  showSelector?: boolean;
  children: React.ReactNode;
  className?: string;
}

// Particle interface with support for all 4 artifact visuals
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
    | 'sword_wisp'       // Thanh Vân Kiếm: Tia kiếm khí lam ngọc
    | 'solar_dust'       // Hạo Thiên Kính: Bụi kim quang thái dương
    | 'lotus_petal'      // Cửu Phẩm Hắc Liên: Cánh sen đen tím
    | 'lotus_dew'        // Cửu Phẩm Hắc Liên: Giọt sương u minh
    | 'primordial_ember' // Bàn Cổ Phủ: Tàn lửa hồng hoang
    | 'ambient_spark';   // Mặc định: Tinh hoa linh khí
  angle?: number;
  va?: number; // angular velocity (slow, constant)
  extra?: any;
}

// Fixed-speed perimeter point calculator for rounded rectangles
function getPerimeterPoint(
  padX: number,
  padY: number,
  boxW: number,
  boxH: number,
  r: number,
  distance: number
): { x: number; y: number; tangentAngle: number } {
  const straightTop = boxW - 2 * r;
  const straightRight = boxH - 2 * r;
  const straightBottom = boxW - 2 * r;
  const straightLeft = boxH - 2 * r;
  const cornerArc = (Math.PI * r) / 2;

  const totalPerimeter = 2 * straightTop + 2 * straightRight + 4 * cornerArc;
  let d = ((distance % totalPerimeter) + totalPerimeter) % totalPerimeter;

  // 1. Top straight (from left to right)
  if (d <= straightTop) {
    return {
      x: padX + r + d,
      y: padY,
      tangentAngle: 0,
    };
  }
  d -= straightTop;

  // 2. Top-right corner arc
  if (d <= cornerArc) {
    const theta = (d / cornerArc) * (Math.PI / 2);
    return {
      x: padX + boxW - r + Math.sin(theta) * r,
      y: padY + r - Math.cos(theta) * r,
      tangentAngle: theta,
    };
  }
  d -= cornerArc;

  // 3. Right straight (from top to bottom)
  if (d <= straightRight) {
    return {
      x: padX + boxW,
      y: padY + r + d,
      tangentAngle: Math.PI / 2,
    };
  }
  d -= straightRight;

  // 4. Bottom-right corner arc
  if (d <= cornerArc) {
    const theta = (d / cornerArc) * (Math.PI / 2);
    return {
      x: padX + boxW - r + Math.cos(theta) * r,
      y: padY + boxH - r + Math.sin(theta) * r,
      tangentAngle: Math.PI / 2 + theta,
    };
  }
  d -= cornerArc;

  // 5. Bottom straight (from right to left)
  if (d <= straightBottom) {
    return {
      x: padX + boxW - r - d,
      y: padY + boxH,
      tangentAngle: Math.PI,
    };
  }
  d -= straightBottom;

  // 6. Bottom-left corner arc
  if (d <= cornerArc) {
    const theta = (d / cornerArc) * (Math.PI / 2);
    return {
      x: padX + r - Math.sin(theta) * r,
      y: padY + boxH - r + Math.cos(theta) * r,
      tangentAngle: Math.PI + theta,
    };
  }
  d -= cornerArc;

  // 7. Left straight (from bottom to top)
  if (d <= straightLeft) {
    return {
      x: padX,
      y: padY + boxH - r - d,
      tangentAngle: (Math.PI * 3) / 2,
    };
  }
  d -= straightLeft;

  // 8. Top-left corner arc
  const theta = (d / cornerArc) * (Math.PI / 2);
  return {
    x: padX + r - Math.cos(theta) * r,
    y: padY + r - Math.sin(theta) * r,
    tangentAngle: (Math.PI * 3) / 2 + theta,
  };
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

  // Active Artifact resolution
  const [activeArtifact, setActiveArtifact] = useState<ArtifactType | null>(() => {
    if (artifact !== undefined && artifact !== null) return artifact;
    try {
      const state = loadStoredCultivationState();
      return state?.artifacts?.equipped || null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    if (artifact !== undefined) {
      setActiveArtifact(artifact);
    }
  }, [artifact]);

  // Master VFX Toggle
  const [vfxEnabled, setVfxEnabled] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('fasttyping_vfx_enabled');
      return saved !== null ? saved === 'true' : true;
    } catch {
      return true;
    }
  });

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
  const animFrameIdRef = useRef<number | null>(null);
  const prevTimeRef = useRef<number>(performance.now());
  const spawnTimerRef = useRef<number>(0);
  const lightningTimerRef = useRef<number>(0);
  const lightningActiveRef = useRef<{ points: { x: number; y: number }[]; life: number; maxLife: number } | null>(null);
  const swordPerimeterDist1Ref = useRef<number>(0);
  const swordPerimeterDist2Ref = useRef<number>(300);
  const swordTrail1Ref = useRef<{ x: number; y: number; angle: number }[]>([]);
  const swordTrail2Ref = useRef<{ x: number; y: number; angle: number }[]>([]);
  const scanPositionRef = useRef<number>(0);
  const errorFlashRef = useRef<number>(0);

  // Trigger error feedback
  useEffect(() => {
    if (!vfxEnabled || !isError) return;
    errorFlashRef.current = 1.0;
  }, [isError, vfxEnabled]);

  // =========================================================================
  // MAIN VFX RENDER LOOP (FIXED SPEED - STRICTLY INDEPENDENT OF TYPING SPEED)
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
      const targetW = Math.max(rect.width + 32, 280);
      const targetH = 48 + 32; // Exact 80px canvas (48px input + 16px padding on all sides)

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
      const dt = Math.min((time - prevTimeRef.current) / 1000, 0.05);
      prevTimeRef.current = time;

      const dpr = window.devicePixelRatio || 1;
      const w = canvas.width / dpr;
      const h = canvas.height / dpr;

      ctx.save();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      // Positioning box: 16px pad surrounding 48px input
      const padXVal = 16;
      const padYVal = 16;
      const boxW = Math.max(10, w - padXVal * 2);
      const boxH = 48;
      const radius = 12;

      const art = activeArtifact;

      // Helper for drawing rounded rect
      const drawRoundRectPath = (x: number, y: number, rw: number, rh: number, r: number) => {
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

      // Calculate total perimeter for orbit math
      const straightW = boxW - 2 * radius;
      const straightH = boxH - 2 * radius;
      const cornerArcLen = (Math.PI * radius) / 2;
      const totalPerimeter = 2 * straightW + 2 * straightH + 4 * cornerArcLen;

      // =======================================================================
      // PHÁP BẢO 1: THANH VÂN KIẾM (⚔️ - Lam Ngọc Kiếm Khí & Ngự Kiếm Phi Hành)
      // =======================================================================
      if (art === 'thanh_van_kiem') {
        // Slow fixed breathing pulse (~5.2s period)
        const breath = 0.8 + 0.2 * Math.sin(time * 0.0012);

        // 1. Subtle cyan sword qi perimeter glow
        ctx.save();
        ctx.shadowColor = '#06b6d4';
        ctx.shadowBlur = 10 * breath;
        ctx.strokeStyle = `rgba(34, 211, 238, ${0.45 * breath})`;
        ctx.lineWidth = 1.5;
        drawRoundRectPath(padXVal, padYVal, boxW, boxH, radius);
        ctx.stroke();

        // Inner fine sword blade edge
        ctx.strokeStyle = 'rgba(165, 243, 252, 0.35)';
        ctx.lineWidth = 0.75;
        drawRoundRectPath(padXVal + 1, padYVal + 1, boxW - 2, boxH - 2, radius - 1);
        ctx.stroke();
        ctx.restore();

        // 2. Corner Sword Hilts / Sword Points
        const cornerLen = 14;
        const drawSwordCorner = (cx: number, cy: number, dx: number, dy: number) => {
          ctx.save();
          ctx.strokeStyle = '#22d3ee';
          ctx.lineWidth = 2.0;
          ctx.lineCap = 'round';
          ctx.shadowColor = '#06b6d4';
          ctx.shadowBlur = 6;
          ctx.beginPath();
          ctx.moveTo(cx, cy + dy * cornerLen);
          ctx.lineTo(cx, cy);
          ctx.lineTo(cx + dx * cornerLen, cy);
          ctx.stroke();

          // Mini diamond sword guard accent at corner
          ctx.fillStyle = '#a5f3fc';
          ctx.beginPath();
          ctx.arc(cx + dx * 2, cy + dy * 2, 1.8, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        };

        drawSwordCorner(padXVal, padYVal, 1, 1);
        drawSwordCorner(padXVal + boxW, padYVal, -1, 1);
        drawSwordCorner(padXVal, padYVal + boxH, 1, -1);
        drawSwordCorner(padXVal + boxW, padYVal + boxH, -1, -1);

        // 3. Ngự Kiếm Phi Hành: Twin Flying Swords at constant fixed speed (35 px/sec)
        const swordSpeed = 38 * dt; // Slow, majestic constant speed
        swordPerimeterDist1Ref.current = (swordPerimeterDist1Ref.current + swordSpeed) % totalPerimeter;
        swordPerimeterDist2Ref.current = (swordPerimeterDist1Ref.current + totalPerimeter / 2) % totalPerimeter;

        const sword1 = getPerimeterPoint(padXVal, padYVal, boxW, boxH, radius, swordPerimeterDist1Ref.current);
        const sword2 = getPerimeterPoint(padXVal, padYVal, boxW, boxH, radius, swordPerimeterDist2Ref.current);

        // Update trails
        swordTrail1Ref.current.push({ x: sword1.x, y: sword1.y, angle: sword1.tangentAngle });
        if (swordTrail1Ref.current.length > 10) swordTrail1Ref.current.shift();

        swordTrail2Ref.current.push({ x: sword2.x, y: sword2.y, angle: sword2.tangentAngle });
        if (swordTrail2Ref.current.length > 10) swordTrail2Ref.current.shift();

        const renderSword = (
          swordPos: { x: number; y: number; tangentAngle: number },
          trail: { x: number; y: number; angle: number }[]
        ) => {
          // Sword Light Trail
          if (trail.length > 1) {
            ctx.save();
            ctx.beginPath();
            trail.forEach((pt, idx) => {
              if (idx === 0) ctx.moveTo(pt.x, pt.y);
              else ctx.lineTo(pt.x, pt.y);
            });
            ctx.strokeStyle = 'rgba(34, 211, 238, 0.4)';
            ctx.lineWidth = 1.6;
            ctx.lineCap = 'round';
            ctx.shadowColor = '#06b6d4';
            ctx.shadowBlur = 6;
            ctx.stroke();
            ctx.restore();
          }

          // Flying Sword Body
          ctx.save();
          ctx.translate(swordPos.x, swordPos.y);
          ctx.rotate(swordPos.tangentAngle);

          // Outer sword aura
          ctx.shadowColor = '#22d3ee';
          ctx.shadowBlur = 8;

          // Double-edged miniature blade (13px long, 4px wide)
          ctx.beginPath();
          ctx.moveTo(7, 0);       // Blade tip
          ctx.lineTo(1, -2.5);   // Upper blade edge
          ctx.lineTo(-4, -2);    // Guard
          ctx.lineTo(-4, -3.5);  // Guard wing
          ctx.lineTo(-5.5, -3.5);
          ctx.lineTo(-5.5, 3.5);
          ctx.lineTo(-4, 3.5);
          ctx.lineTo(-4, 2);
          ctx.lineTo(1, 2.5);    // Lower blade edge
          ctx.closePath();

          const bladeGrad = ctx.createLinearGradient(-6, 0, 7, 0);
          bladeGrad.addColorStop(0, '#0e7490');
          bladeGrad.addColorStop(0.4, '#22d3ee');
          bladeGrad.addColorStop(1, '#ffffff');
          ctx.fillStyle = bladeGrad;
          ctx.fill();

          // Central blade spine line
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 0.8;
          ctx.beginPath();
          ctx.moveTo(-3, 0);
          ctx.lineTo(6, 0);
          ctx.stroke();

          ctx.restore();
        };

        renderSword(sword1, swordTrail1Ref.current);
        renderSword(sword2, swordTrail2Ref.current);

        // 4. Ambient Sword Wisps (Kiếm Ý Tinh Hoa) - Spawns at constant cadence
        spawnTimerRef.current += 1;
        if (spawnTimerRef.current >= 40 && particlesRef.current.length < 7) {
          spawnTimerRef.current = 0;
          particlesRef.current.push({
            x: padXVal + 12 + Math.random() * (boxW - 24),
            y: padYVal + boxH - 4,
            vx: (Math.random() - 0.5) * 0.15,
            vy: -0.25 - Math.random() * 0.15, // Slow fixed float
            size: 8 + Math.random() * 4,
            maxLife: 75,
            life: 75,
            color: '#22d3ee',
            alpha: 0.75,
            type: 'sword_wisp',
            angle: -Math.PI / 4 + (Math.random() - 0.5) * 0.2,
          });
        }
      }

      // =======================================================================
      // PHÁP BẢO 2: HẠO THIÊN KÍNH (🪞 - Kim Quang Thấu Chiếu & Bát Quái Cổ Kính)
      // =======================================================================
      else if (art === 'hao_thien_kinh') {
        const breath = 0.85 + 0.15 * Math.sin(time * 0.001);

        // 1. Bronze & Solar Gold Border
        ctx.save();
        ctx.shadowColor = '#fbbf24';
        ctx.shadowBlur = 10 * breath;
        ctx.strokeStyle = `rgba(245, 158, 11, ${0.5 * breath})`;
        ctx.lineWidth = 1.6;
        drawRoundRectPath(padXVal, padYVal, boxW, boxH, radius);
        ctx.stroke();

        ctx.strokeStyle = 'rgba(254, 240, 138, 0.35)';
        ctx.lineWidth = 0.8;
        drawRoundRectPath(padXVal + 1.5, padYVal + 1.5, boxW - 3, boxH - 3, radius - 1.5);
        ctx.stroke();
        ctx.restore();

        // 2. Chiseled Bagua Mirror Corners
        const cornerSize = 13;
        const drawMirrorCorner = (cx: number, cy: number, dx: number, dy: number) => {
          ctx.save();
          ctx.strokeStyle = '#f59e0b';
          ctx.lineWidth = 2.0;
          ctx.lineCap = 'round';
          ctx.shadowColor = '#fbbf24';
          ctx.shadowBlur = 6;

          ctx.beginPath();
          ctx.moveTo(cx, cy + dy * cornerSize);
          ctx.lineTo(cx, cy);
          ctx.lineTo(cx + dx * cornerSize, cy);
          ctx.stroke();

          // Double concentric mirror arc
          ctx.beginPath();
          ctx.arc(cx + dx * 3, cy + dy * 3, 5, 0, Math.PI * 2);
          ctx.strokeStyle = 'rgba(254, 240, 138, 0.7)';
          ctx.lineWidth = 1.0;
          ctx.stroke();

          ctx.fillStyle = '#fbbf24';
          ctx.beginPath();
          ctx.arc(cx + dx * 3, cy + dy * 3, 1.8, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        };

        drawMirrorCorner(padXVal, padYVal, 1, 1);
        drawMirrorCorner(padXVal + boxW, padYVal, -1, 1);
        drawMirrorCorner(padXVal, padYVal + boxH, 1, -1);
        drawMirrorCorner(padXVal + boxW, padYVal + boxH, -1, -1);

        // 3. Divine Optical Scanning Beam (Kính Quang Thấu Chiếu - Constant Speed)
        // Cycles horizontally across the box once every ~6.8 seconds
        scanPositionRef.current = ((time * 0.00014) % 1.0) * (boxW + 80) - 40;
        const scanX = padXVal + scanPositionRef.current;

        ctx.save();
        // Clip to inside input rounded rect so light stays within bounds
        drawRoundRectPath(padXVal, padYVal, boxW, boxH, radius);
        ctx.clip();

        // Soft God-ray scanning band
        const beamW = 60;
        const beamGrad = ctx.createLinearGradient(scanX - beamW / 2, 0, scanX + beamW / 2, 0);
        beamGrad.addColorStop(0, 'rgba(251, 191, 36, 0)');
        beamGrad.addColorStop(0.35, 'rgba(251, 191, 36, 0.09)');
        beamGrad.addColorStop(0.5, 'rgba(254, 240, 138, 0.22)');
        beamGrad.addColorStop(0.65, 'rgba(56, 189, 248, 0.09)'); // Faint prismatic refraction
        beamGrad.addColorStop(1, 'rgba(251, 191, 36, 0)');

        ctx.fillStyle = beamGrad;
        ctx.fillRect(scanX - beamW / 2, padYVal, beamW, boxH);

        // Thin sharp central caustic glint
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
        ctx.lineWidth = 1.0;
        ctx.beginPath();
        ctx.moveTo(scanX, padYVal);
        ctx.lineTo(scanX, padYVal + boxH);
        ctx.stroke();

        ctx.restore();

        // 4. Micro Rotating Bagua Mirror (Top-right accent)
        ctx.save();
        const baguaX = padXVal + boxW - 8;
        const baguaY = padYVal + 8;
        const baguaAngle = time * 0.0006; // Ultra-slow fixed constant rotation
        ctx.translate(baguaX, baguaY);
        ctx.rotate(baguaAngle);

        ctx.strokeStyle = 'rgba(251, 191, 36, 0.6)';
        ctx.lineWidth = 1.0;
        ctx.beginPath();
        ctx.arc(0, 0, 6, 0, Math.PI * 2);
        ctx.stroke();

        // 8 trigram tick marks
        for (let ti = 0; ti < 8; ti++) {
          const a = (ti * Math.PI) / 4;
          ctx.beginPath();
          ctx.moveTo(Math.cos(a) * 4, Math.sin(a) * 4);
          ctx.lineTo(Math.cos(a) * 6, Math.sin(a) * 6);
          ctx.stroke();
        }
        ctx.restore();

        // 5. Ambient Solar Dust (Kim Quang Linh Điểm)
        spawnTimerRef.current += 1;
        if (spawnTimerRef.current >= 42 && particlesRef.current.length < 6) {
          spawnTimerRef.current = 0;
          particlesRef.current.push({
            x: padXVal + 16 + Math.random() * (boxW - 32),
            y: padYVal + boxH - 6,
            vx: (Math.random() - 0.5) * 0.12,
            vy: -0.22 - Math.random() * 0.12,
            size: 4 + Math.random() * 2.5,
            maxLife: 80,
            life: 80,
            color: Math.random() > 0.4 ? '#fde047' : '#ffffff',
            alpha: 0.8,
            type: 'solar_dust',
            angle: Math.random() * Math.PI,
            va: 0.008,
          });
        }
      }

      // =======================================================================
      // PHÁP BẢO 3: CỬU PHẨM HẮC LIÊN (🪷 - Hắc Liên Hộ Mạch & Tịnh Thế U Liên)
      // =======================================================================
      else if (art === 'cuu_pham_lien') {
        const breath = 0.85 + 0.15 * Math.sin(time * 0.0011);

        // 1. Mystic Purple Lotus Perimeter Aura
        ctx.save();
        ctx.shadowColor = '#c084fc';
        ctx.shadowBlur = 11 * breath;
        ctx.strokeStyle = `rgba(168, 85, 247, ${0.48 * breath})`;
        ctx.lineWidth = 1.6;
        drawRoundRectPath(padXVal, padYVal, boxW, boxH, radius);
        ctx.stroke();

        ctx.strokeStyle = 'rgba(232, 121, 249, 0.3)';
        ctx.lineWidth = 0.8;
        drawRoundRectPath(padXVal + 1.5, padYVal + 1.5, boxW - 3, boxH - 3, radius - 1.5);
        ctx.stroke();
        ctx.restore();

        // 2. Multi-layered Lotus Petal Corners
        const drawLotusCorner = (cx: number, cy: number, dx: number, dy: number) => {
          ctx.save();
          ctx.translate(cx, cy);
          ctx.shadowColor = '#c084fc';
          ctx.shadowBlur = 6;

          // 3-petal cluster blooming from corner
          const drawMiniPetal = (angle: number, scale: number, color: string) => {
            ctx.save();
            ctx.rotate(angle);
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.quadraticCurveTo(-3 * scale, 6 * scale, 0, 11 * scale);
            ctx.quadraticCurveTo(3 * scale, 6 * scale, 0, 0);
            ctx.closePath();
            ctx.fill();
            ctx.restore();
          };

          const baseAngle = dx > 0 ? (dy > 0 ? 0 : -Math.PI / 2) : (dy > 0 ? Math.PI / 2 : Math.PI);
          drawMiniPetal(baseAngle - 0.35, 0.8, '#7e22ce');
          drawMiniPetal(baseAngle + 0.35, 0.8, '#7e22ce');
          drawMiniPetal(baseAngle, 1.0, '#c084fc');

          ctx.restore();
        };

        drawLotusCorner(padXVal, padYVal, 1, 1);
        drawLotusCorner(padXVal + boxW, padYVal, -1, 1);
        drawLotusCorner(padXVal, padYVal + boxH, 1, -1);
        drawLotusCorner(padXVal + boxW, padYVal + boxH, -1, -1);

        // 3. Ambient Drifting Lotus Petals (Hắc Liên Hoa Biện) - Constant Slow Sway
        spawnTimerRef.current += 1;
        if (spawnTimerRef.current >= 48 && particlesRef.current.length < 6) {
          spawnTimerRef.current = 0;
          particlesRef.current.push({
            x: padXVal + 14 + Math.random() * (boxW - 28),
            y: padYVal + boxH - 4,
            vx: (Math.random() - 0.5) * 0.15,
            vy: -0.2 - Math.random() * 0.12, // Ultra slow, soothing upward drift
            size: 6.5 + Math.random() * 2.5,
            maxLife: 95,
            life: 95,
            color: '#c084fc',
            alpha: 0.82,
            type: 'lotus_petal',
            angle: Math.random() * Math.PI * 2,
            va: 0.007, // Slow constant rotation
            extra: { wavePhase: Math.random() * Math.PI * 2 },
          });
        }
      }

      // =======================================================================
      // PHÁP BẢO 4: BÀN CỔ KHAI THIÊN PHỦ (🪓 - Thái Sơ Thần Lôi & Liệt Ngấn Thái Cổ)
      // =======================================================================
      else if (art === 'ban_co_phu') {
        const breath = 0.85 + 0.15 * Math.sin(time * 0.0013);

        // 1. Primordial Molten Basalt Border
        ctx.save();
        ctx.shadowColor = '#ea580c';
        ctx.shadowBlur = 11 * breath;
        ctx.strokeStyle = `rgba(234, 88, 12, ${0.55 * breath})`;
        ctx.lineWidth = 1.8;
        drawRoundRectPath(padXVal, padYVal, boxW, boxH, radius);
        ctx.stroke();

        ctx.strokeStyle = 'rgba(251, 191, 36, 0.4)';
        ctx.lineWidth = 0.8;
        drawRoundRectPath(padXVal + 1.5, padYVal + 1.5, boxW - 3, boxH - 3, radius - 1.5);
        ctx.stroke();
        ctx.restore();

        // 2. Chiseled Primordial Axe Blade Corners
        const cornerSize = 14;
        const drawAxeCorner = (cx: number, cy: number, dx: number, dy: number) => {
          ctx.save();
          ctx.strokeStyle = '#f97316';
          ctx.lineWidth = 2.0;
          ctx.lineCap = 'round';
          ctx.shadowColor = '#ea580c';
          ctx.shadowBlur = 7;

          // Main heavy bracket
          ctx.beginPath();
          ctx.moveTo(cx, cy + dy * cornerSize);
          ctx.lineTo(cx, cy);
          ctx.lineTo(cx + dx * cornerSize, cy);
          ctx.stroke();

          // Axe blade bevel
          ctx.fillStyle = '#fde047';
          ctx.beginPath();
          ctx.moveTo(cx + dx * 2, cy + dy * 2);
          ctx.lineTo(cx + dx * 7, cy + dy * 2);
          ctx.lineTo(cx + dx * 2, cy + dy * 7);
          ctx.closePath();
          ctx.fill();

          ctx.restore();
        };

        drawAxeCorner(padXVal, padYVal, 1, 1);
        drawAxeCorner(padXVal + boxW, padYVal, -1, 1);
        drawAxeCorner(padXVal, padYVal + boxH, 1, -1);
        drawAxeCorner(padXVal + boxW, padYVal + boxH, -1, -1);

        // 3. Space Fissure Lines (Liệt Ngấn Thái Cổ - Fixed Rhythmic Magma Glow)
        ctx.save();
        const fissureAlpha = 0.35 + 0.25 * Math.sin(time * 0.001);
        ctx.strokeStyle = `rgba(251, 191, 36, ${fissureAlpha})`;
        ctx.lineWidth = 1.0;
        ctx.shadowColor = '#f97316';
        ctx.shadowBlur = 5;

        // Fissure 1 on top border
        const f1X = padXVal + boxW * 0.32;
        ctx.beginPath();
        ctx.moveTo(f1X - 15, padYVal);
        ctx.lineTo(f1X - 5, padYVal - 2);
        ctx.lineTo(f1X + 5, padYVal + 2);
        ctx.lineTo(f1X + 18, padYVal);
        ctx.stroke();

        // Fissure 2 on bottom border
        const f2X = padXVal + boxW * 0.68;
        ctx.beginPath();
        ctx.moveTo(f2X - 16, padYVal + boxH);
        ctx.lineTo(f2X - 4, padYVal + boxH + 2);
        ctx.lineTo(f2X + 6, padYVal + boxH - 2);
        ctx.lineTo(f2X + 18, padYVal + boxH);
        ctx.stroke();

        ctx.restore();

        // 4. Thái Sơ Thần Lôi: Graceful, slow-fading cosmic lightning arc
        // Triggered every 3.2 seconds at a regular, fixed cadence (no wild jitter)
        lightningTimerRef.current += dt;
        if (lightningTimerRef.current >= 3.2) {
          lightningTimerRef.current = 0;
          // Generate a smooth lightning segment along top or bottom
          const isTop = Math.random() > 0.5;
          const startX = padXVal + 25 + Math.random() * (boxW - 120);
          const endX = startX + 70 + Math.random() * 40;
          const arcY = isTop ? padYVal : padYVal + boxH;

          const pts = [{ x: startX, y: arcY }];
          const segs = 5;
          for (let si = 1; si < segs; si++) {
            pts.push({
              x: startX + ((endX - startX) * si) / segs,
              y: arcY + (Math.random() - 0.5) * 6,
            });
          }
          pts.push({ x: endX, y: arcY });

          lightningActiveRef.current = {
            points: pts,
            life: 50,
            maxLife: 50,
          };
        }

        // Draw active lightning arc smoothly over its lifecycle
        if (lightningActiveRef.current) {
          const l = lightningActiveRef.current;
          l.life -= 1;
          const lProgress = l.life / l.maxLife;

          if (lProgress > 0) {
            ctx.save();
            ctx.beginPath();
            l.points.forEach((pt, idx) => {
              if (idx === 0) ctx.moveTo(pt.x, pt.y);
              else ctx.lineTo(pt.x, pt.y);
            });
            ctx.strokeStyle = `rgba(254, 240, 138, ${lProgress * 0.9})`;
            ctx.lineWidth = 1.4;
            ctx.shadowColor = '#facc15';
            ctx.shadowBlur = 8;
            ctx.stroke();

            // White inner hot core
            ctx.strokeStyle = `rgba(255, 255, 255, ${lProgress * 0.95})`;
            ctx.lineWidth = 0.6;
            ctx.stroke();
            ctx.restore();
          }

          if (l.life <= 0) {
            lightningActiveRef.current = null;
          }
        }

        // 5. Primordial Embers (Tàn Lửa Hồng Hoang) - Slow Constant Float
        spawnTimerRef.current += 1;
        if (spawnTimerRef.current >= 45 && particlesRef.current.length < 6) {
          spawnTimerRef.current = 0;
          particlesRef.current.push({
            x: padXVal + 14 + Math.random() * (boxW - 28),
            y: padYVal + boxH - 4,
            vx: (Math.random() - 0.5) * 0.16,
            vy: -0.26 - Math.random() * 0.14,
            size: 3.5 + Math.random() * 2.0,
            maxLife: 75,
            life: 75,
            color: Math.random() > 0.4 ? '#f97316' : '#ea580c',
            alpha: 0.8,
            type: 'primordial_ember',
          });
        }
      }

      // =======================================================================
      // KHI CHƯA TRANG BỊ PHÁP BẢO (Default Spiritual Aura Frame)
      // =======================================================================
      else {
        const breath = 0.85 + 0.15 * Math.sin(time * 0.001);

        ctx.save();
        ctx.shadowColor = 'rgba(251, 191, 36, 0.4)';
        ctx.shadowBlur = 8 * breath;
        ctx.strokeStyle = `rgba(251, 191, 36, ${0.4 * breath})`;
        ctx.lineWidth = 1.4;
        drawRoundRectPath(padXVal, padYVal, boxW, boxH, radius);
        ctx.stroke();

        // 4 Simple Elegant Corners
        const cLen = 10;
        const drawDefaultCorner = (cx: number, cy: number, dx: number, dy: number) => {
          ctx.strokeStyle = '#f59e0b';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(cx, cy + dy * cLen);
          ctx.lineTo(cx, cy);
          ctx.lineTo(cx + dx * cLen, cy);
          ctx.stroke();
        };
        drawDefaultCorner(padXVal, padYVal, 1, 1);
        drawDefaultCorner(padXVal + boxW, padYVal, -1, 1);
        drawDefaultCorner(padXVal, padYVal + boxH, 1, -1);
        drawDefaultCorner(padXVal + boxW, padYVal + boxH, -1, -1);
        ctx.restore();

        // Gentle Ambient Stardust
        spawnTimerRef.current += 1;
        if (spawnTimerRef.current >= 55 && particlesRef.current.length < 5) {
          spawnTimerRef.current = 0;
          particlesRef.current.push({
            x: padXVal + 12 + Math.random() * (boxW - 24),
            y: padYVal + boxH - 4,
            vx: (Math.random() - 0.5) * 0.1,
            vy: -0.2 - Math.random() * 0.1,
            size: 2.5 + Math.random() * 1.5,
            maxLife: 75,
            life: 75,
            color: '#fbbf24',
            alpha: 0.7,
            type: 'ambient_spark',
          });
        }
      }

      // =======================================================================
      // DRAW & UPDATE ACTIVE PARTICLES (CONSTANT SLOW MOTION)
      // =======================================================================
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

        // --- 1. SWORD WISP (Thanh Vân Kiếm) ---
        if (p.type === 'sword_wisp') {
          ctx.translate(p.x, p.y);
          ctx.rotate(p.angle || 0);
          ctx.shadowColor = '#22d3ee';
          ctx.shadowBlur = 6;

          const wispGrad = ctx.createLinearGradient(0, -p.size, 0, p.size);
          wispGrad.addColorStop(0, '#ffffff');
          wispGrad.addColorStop(0.5, '#22d3ee');
          wispGrad.addColorStop(1, 'rgba(6, 182, 212, 0)');

          ctx.fillStyle = wispGrad;
          ctx.beginPath();
          ctx.ellipse(0, 0, 1.4, p.size, 0, 0, Math.PI * 2);
          ctx.fill();
        }

        // --- 2. SOLAR DUST / GLYPH (Hạo Thiên Kính) ---
        else if (p.type === 'solar_dust') {
          ctx.translate(p.x, p.y);
          ctx.rotate(p.angle || 0);
          ctx.shadowColor = '#facc15';
          ctx.shadowBlur = 5;
          ctx.fillStyle = p.color;

          // 4-pointed radiant star
          ctx.beginPath();
          for (let si = 0; si < 4; si++) {
            ctx.rotate(Math.PI / 2);
            ctx.lineTo(p.size, 0);
            ctx.lineTo(p.size * 0.28, p.size * 0.28);
          }
          ctx.closePath();
          ctx.fill();
        }

        // --- 3. LOTUS PETAL (Cửu Phẩm Hắc Liên) ---
        else if (p.type === 'lotus_petal') {
          if (p.extra?.wavePhase !== undefined) {
            p.extra.wavePhase += 0.025; // Gentle sinusoidal sway
          }
          const sway = Math.sin(p.extra?.wavePhase || 0) * 1.2;

          ctx.translate(p.x + sway, p.y);
          ctx.rotate(p.angle || 0);
          ctx.shadowColor = '#c084fc';
          ctx.shadowBlur = 6;

          // Detailed two-tone lotus petal
          const petalGrad = ctx.createLinearGradient(0, p.size * 0.6, 0, -p.size * 0.8);
          petalGrad.addColorStop(0, '#581c87');
          petalGrad.addColorStop(0.5, '#9333ea');
          petalGrad.addColorStop(1, '#f472b6');

          ctx.fillStyle = petalGrad;
          ctx.beginPath();
          ctx.moveTo(0, p.size * 0.6);
          ctx.quadraticCurveTo(-p.size * 0.6, 0, 0, -p.size * 0.8);
          ctx.quadraticCurveTo(p.size * 0.6, 0, 0, p.size * 0.6);
          ctx.closePath();
          ctx.fill();

          // Petal delicate central vein
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
          ctx.lineWidth = 0.6;
          ctx.beginPath();
          ctx.moveTo(0, p.size * 0.4);
          ctx.lineTo(0, -p.size * 0.6);
          ctx.stroke();
        }

        // --- 4. PRIMORDIAL EMBER (Bàn Cổ Phủ) ---
        else if (p.type === 'primordial_ember') {
          ctx.translate(p.x, p.y);
          ctx.shadowColor = '#ea580c';
          ctx.shadowBlur = 5;

          const emberGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, p.size);
          emberGrad.addColorStop(0, '#fef08a');
          emberGrad.addColorStop(0.4, p.color);
          emberGrad.addColorStop(1, 'rgba(234, 88, 12, 0)');

          ctx.fillStyle = emberGrad;
          ctx.beginPath();
          ctx.arc(0, 0, p.size, 0, Math.PI * 2);
          ctx.fill();
        }

        // --- 5. AMBIENT SPARK (Default) ---
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

      // =======================================================================
      // ERROR FEEDBACK (GENTLE TRANSLUCENT SHIELD DISRUPTION)
      // =======================================================================
      if (errorFlashRef.current > 0) {
        ctx.save();
        ctx.globalAlpha = errorFlashRef.current * 0.3;
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 2.0;
        drawRoundRectPath(padXVal - 1.5, padYVal - 1.5, boxW + 3, boxH + 3, radius);
        ctx.stroke();
        ctx.restore();
        errorFlashRef.current = Math.max(0, errorFlashRef.current - dt * 2.5);
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
  }, [vfxEnabled, activeArtifact]);

  // Current artifact information
  const currentArtConfig = activeArtifact ? ARTIFACT_CONFIGS[activeArtifact] : null;

  return (
    <div className={`relative w-full flex flex-col justify-center ${className}`}>
      {/* Optional Top Mini Artifact Switcher / Indicator */}
      {showSelector && (
        <div className="flex items-center justify-between pb-1 px-1 select-none text-[11px]">
          <div className="flex items-center gap-1.5 text-slate-300 font-medium">
            <span className="text-amber-400">Pháp Bảo:</span>
            {currentArtConfig ? (
              <span className="font-bold text-amber-300 flex items-center gap-1">
                <span>{currentArtConfig.icon}</span>
                <span>{currentArtConfig.name}</span>
              </span>
            ) : (
              <span className="text-slate-400 italic">Chưa trang bị</span>
            )}
          </div>

          <button
            type="button"
            onClick={handleToggleVfx}
            className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold flex items-center gap-1 transition-all cursor-pointer ${
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
            className="absolute -top-4 -left-4 pointer-events-none z-10 select-none"
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
