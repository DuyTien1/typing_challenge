import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  XIANXIA_REALMS,
  CultivationState,
  attemptRealmBreakthrough,
  getSubStage,
} from '../utils/cultivation';
import { soundFx } from '../utils/audio';
import { AvatarWithFrame, setStoredFrame } from '../utils/frames';
import { announceBreakthrough } from '../utils/heavenlyDaoBot';
import { Shield, Zap, Sparkles, AlertTriangle, CheckCircle2, Flame, Award, Swords, ArrowRight, RotateCcw } from 'lucide-react';

interface TribulationModalProps {
  isOpen: boolean;
  onClose: () => void;
  cultivationState: CultivationState;
  usePhaCanh: boolean;
  useHoTam: boolean;
  onBreakthroughComplete: (result: {
    success: boolean;
    updatedState: CultivationState;
    message: string;
    unlockedFrameId?: string;
    unlockedTitleId?: string;
  }) => void;
  userAvatar: string;
  userFrame: string;
  username: string;
  onSelectFrame?: (frameId: string) => void;
}

interface TribulationWave {
  waveNum: number;
  mantra: string;
  meaning: string;
  timeLimit: number;
  isInnerDemon?: boolean;
}

// Bộ khẩu quyết cổ phong Tiên Hiệp theo cảnh giới - Toàn bộ chuyển thành Thiên Lôi Thần Số (Numbers only)
const MANTRA_DATABASE: Record<number, { title: string; waves: { mantra: string; meaning: string; time: number; isInnerDemon?: boolean }[] }> = {
  0: {
    title: 'Tam Cửu Lôi Kiếp (3 Đợt Sấm)',
    waves: [
      { mantra: '39281', meaning: 'Thiên lôi thối thể', time: 7.5 },
      { mantra: '84019', meaning: 'Đạo cốt sơ thành', time: 7.5 },
      { mantra: '725193', meaning: 'Đúc vững đạo cơ', time: 8.0 },
    ],
  },
  1: {
    title: 'Tứ Cửu Lôi Kiếp (4 Đợt Sấm)',
    waves: [
      { mantra: '482019', meaning: 'Tam muội chân hỏa', time: 7.5 },
      { mantra: '739105', meaning: 'Khí tụ đan điền', time: 7.5 },
      { mantra: '2948103', meaning: 'Đan đạo cửu chuyển', time: 8.0 },
      { mantra: '8501924', meaning: 'Nghịch thiên kết đan', time: 8.0 },
    ],
  },
  2: {
    title: 'Lục Cửu Lôi Kiếp & Tâm Ma Khảo Nghiệm (6 Đợt Sấm)',
    waves: [
      { mantra: '6294017', meaning: 'Phá toái kim đan', time: 7.0 },
      { mantra: '8401925', meaning: 'Hóa sinh nguyên anh', time: 7.0 },
      { mantra: '3918204', meaning: 'Tử khí đông lai', time: 7.5 },
      { mantra: '7401928', meaning: 'Nguyên thần xuất khiếu', time: 7.5, isInnerDemon: true },
      { mantra: '9284017', meaning: 'Tâm ma huyễn cảnh viễn ly', time: 8.0, isInnerDemon: true },
      { mantra: '8392017', meaning: 'Đạo tâm bất diệt vĩnh tồn', time: 8.0, isInnerDemon: true },
    ],
  },
  3: {
    title: 'Thất Cửu Lôi Kiếp & Hóa Thần Ý Cảnh (7 Đợt Sấm)',
    waves: [
      { mantra: '8392017', meaning: 'Hóa thực vi hư', time: 7.0 },
      { mantra: '4910283', meaning: 'Lĩnh ngộ ý cảnh', time: 7.0 },
      { mantra: '73928104', meaning: 'Thiên địa đồng thọ', time: 7.5 },
      { mantra: '62910842', meaning: 'Chưởng khống pháp tắc', time: 7.5 },
      { mantra: '84019273', meaning: 'Ma do tâm sinh ma diệt', time: 7.5, isInnerDemon: true },
      { mantra: '92837401', meaning: 'Vạn niệm quy chân bất hoại', time: 7.5, isInnerDemon: true },
      { mantra: '74910283', meaning: 'Ngưng tụ hóa thần chí tôn', time: 8.0, isInnerDemon: true },
    ],
  },
  4: {
    title: 'Bát Cửu Lôi Kiếp (8 Đợt Sấm)',
    waves: [
      { mantra: '8492017', meaning: 'Hư không vô cực', time: 6.8 },
      { mantra: '9381027', meaning: 'Phá toái hư không', time: 6.8 },
      { mantra: '7491028', meaning: 'Chân ngã duy nhất', time: 7.0 },
      { mantra: '8392017', meaning: 'Luyện khí hóa hư', time: 7.0 },
      { mantra: '95820174', meaning: 'Thái hư vô ngã vạn pháp', time: 7.2, isInnerDemon: true },
      { mantra: '84910283', meaning: 'Đại đạo độc hành tuyệt thế', time: 7.2, isInnerDemon: true },
      { mantra: '93820174', meaning: 'Vạn kiếp bất ma trường sinh', time: 7.5, isInnerDemon: true },
      { mantra: '82049173', meaning: 'Đăng phong tạo cực hư không', time: 7.5, isInnerDemon: true },
    ],
  },
  5: {
    title: 'Hợp Thể Thiên Kiếp (8 Đợt Sấm)',
    waves: [
      { mantra: '49102837', meaning: 'Nhục thân dung hợp', time: 7.0 },
      { mantra: '73928105', meaning: 'Nguyên thần quy nhất', time: 7.0 },
      { mantra: '82049173', meaning: 'Thần thông đại thành', time: 7.2 },
      { mantra: '93820174', meaning: 'Đại đạo dung hợp', time: 7.2 },
      { mantra: '84910283', meaning: 'Chém tan tâm ma', time: 7.5, isInnerDemon: true },
      { mantra: '73928104', meaning: 'Thiên địa bất diệt', time: 7.5, isInnerDemon: true },
      { mantra: '92837401', meaning: 'Hợp thể quy chân', time: 7.5, isInnerDemon: true },
      { mantra: '85019284', meaning: 'Đăng phong tuyệt đỉnh', time: 8.0, isInnerDemon: true },
    ],
  },
  6: {
    title: 'Đại Thừa Thiên Kiếp (9 Đợt Sấm)',
    waves: [
      { mantra: '93820174', meaning: 'Thiên đạo cảm ứng', time: 7.0 },
      { mantra: '84910273', meaning: 'Đại thừa viên mãn', time: 7.0 },
      { mantra: '73928104', meaning: 'Khai sơn phá hải', time: 7.2 },
      { mantra: '62910842', meaning: 'Vạn pháp quy tông', time: 7.2 },
      { mantra: '95820173', meaning: 'Đạo tâm vững như bàn thạch', time: 7.5, isInnerDemon: true },
      { mantra: '84019273', meaning: 'Trảm phá huyễn niệm', time: 7.5, isInnerDemon: true },
      { mantra: '74910283', meaning: 'Thiên nhân tương ứng', time: 7.5, isInnerDemon: true },
      { mantra: '82049173', meaning: 'Đại đạo quang minh', time: 7.8, isInnerDemon: true },
      { mantra: '93810274', meaning: 'Đại thừa viên mãn', time: 8.0, isInnerDemon: true },
    ],
  },
  7: {
    title: 'Cửu Cửu Đại Kiếp (9 Đợt Sấm)',
    waves: [
      { mantra: '94820173', meaning: 'Nghịch thiên cải mệnh', time: 7.0 },
      { mantra: '83920174', meaning: 'Chấn nhiếp càn khôn', time: 7.0 },
      { mantra: '72910482', meaning: 'Đạo thể kim cương', time: 7.2 },
      { mantra: '84920173', meaning: 'Vạn lôi thối hồn', time: 7.2 },
      { mantra: '93820174', meaning: 'Bất hủ thần hồn', time: 7.5, isInnerDemon: true },
      { mantra: '82049173', meaning: 'Tử lôi bất hoại', time: 7.5, isInnerDemon: true },
      { mantra: '95820174', meaning: 'Thần niệm thông thiên', time: 7.5, isInnerDemon: true },
      { mantra: '74910283', meaning: 'Đạo quả ngưng tụ', time: 7.8, isInnerDemon: true },
      { mantra: '839102745', meaning: 'Vô thượng cảnh giới', time: 8.0, isInnerDemon: true },
    ],
  },
};

export const TribulationModal: React.FC<TribulationModalProps> = ({
  isOpen,
  onClose,
  cultivationState,
  usePhaCanh,
  useHoTam,
  onBreakthroughComplete,
  userAvatar,
  userFrame,
  username,
  onSelectFrame,
}) => {
  const currentRealm = XIANXIA_REALMS[cultivationState.realmIndex] || XIANXIA_REALMS[0];
  const nextRealm = XIANXIA_REALMS[cultivationState.realmIndex + 1];

  // Lấy dữ liệu đợt sấm kiếp
  const tribulationConfig = useMemo(() => {
    const config = MANTRA_DATABASE[cultivationState.realmIndex] || {
      title: 'Cửu Cửu Thiên Kiếp',
      waves: [
        { mantra: '98401928', meaning: 'Bàn Cổ khai thiên', time: 6.8 },
        { mantra: '83920174', meaning: 'Hỗn độn sơ khai', time: 6.8 },
        { mantra: '94820173', meaning: 'Âm dương quy nhất', time: 7.0 },
        { mantra: '73928104', meaning: 'Vạn đạo thần phục', time: 7.0 },
        { mantra: '84920183', meaning: 'Siêu thoát luân hồi', time: 7.2 },
        { mantra: '95820174', meaning: 'Đăng phong chí tôn', time: 7.5 },
      ],
    };
    return config;
  }, [cultivationState.realmIndex]);

  const [phase, setPhase] = useState<'intro' | 'active' | 'wave_result' | 'victory' | 'defeat'>('intro');
  const [currentWaveIndex, setCurrentWaveIndex] = useState(0);
  const [passedWaves, setPassedWaves] = useState<number[]>([]);
  const [failedWaves, setFailedWaves] = useState<number[]>([]);
  const [typedInput, setTypedInput] = useState('');
  const [timeLeft, setTimeLeft] = useState(8);
  const [shieldHp, setShieldHp] = useState(100);
  const [isScreenFlashing, setIsScreenFlashing] = useState(false);
  const [swordSlashActive, setSwordSlashActive] = useState(false);
  const [resultNotice, setResultNotice] = useState<string | null>(null);
  const [screenShakeEnabled, setScreenShakeEnabled] = useState<boolean>(() => {
    return localStorage.getItem('fasttyping_screenshake') !== 'false';
  });
  const [isScreenShaking, setIsScreenShaking] = useState<boolean>(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const triggerScreenShake = () => {
    if (!screenShakeEnabled) return;
    setIsScreenShaking(true);
    setTimeout(() => setIsScreenShaking(false), 360);
  };

  const triggerLightningParticles = (isVictory: boolean = false) => {
    const cvs = canvasRef.current;
    if (!cvs) return;
    const ctx = cvs.getContext('2d');
    if (!ctx) return;
    cvs.width = cvs.offsetWidth || 500;
    cvs.height = cvs.offsetHeight || 500;

    interface Particle {
      x: number;
      y: number;
      vx: number;
      vy: number;
      color: string;
      life: number;
      maxLife: number;
      size: number;
    }
    const particles: Particle[] = [];
    const colors = isVictory
      ? ['#fbbf24', '#facc15', '#fde047', '#ffffff', '#38bdf8']
      : ['#38bdf8', '#0ea5e9', '#fde047', '#ffffff', '#a855f7'];

    const count = isVictory ? 60 : 35;
    for (let i = 0; i < count; i++) {
      particles.push({
        x: cvs.width / 2 + (Math.random() - 0.5) * 60,
        y: cvs.height * 0.35 + (Math.random() - 0.5) * 60,
        vx: (Math.random() - 0.5) * 10,
        vy: (Math.random() - 0.5) * 10 - 2,
        color: colors[Math.floor(Math.random() * colors.length)],
        life: 1,
        maxLife: 25 + Math.random() * 20,
        size: 2 + Math.random() * 3,
      });
    }

    let frame = 0;
    const render = () => {
      ctx.clearRect(0, 0, cvs.width, cvs.height);

      // Arc Lightning Bolt
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      let curX = cvs.width / 2;
      let curY = 0;
      ctx.moveTo(curX, curY);
      while (curY < cvs.height * 0.75) {
        curX += (Math.random() - 0.5) * 40;
        curY += 15 + Math.random() * 20;
        ctx.lineTo(curX, curY);
      }
      ctx.stroke();

      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 1 / p.maxLife;
        if (p.life > 0) {
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * Math.max(0, p.life), 0, Math.PI * 2);
          ctx.fill();
        }
      });

      frame++;
      if (frame < 30) {
        requestAnimationFrame(render);
      } else {
        ctx.clearRect(0, 0, cvs.width, cvs.height);
      }
    };
    render();
  };

  const currentWave = tribulationConfig.waves[currentWaveIndex] || tribulationConfig.waves[0];
  const totalWaves = tribulationConfig.waves.length;

  // Auto focus input and ensure clean slate on each wave
  useEffect(() => {
    if (isOpen && phase === 'active') {
      setTypedInput('');
      if (inputRef.current) {
        inputRef.current.value = '';
      }
      const focusTimeout = setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.value = '';
          inputRef.current.focus();
        }
        setTypedInput('');
      }, 50);
      return () => clearTimeout(focusTimeout);
    }
  }, [isOpen, phase, currentWaveIndex]);

  // Reset state when opening modal
  useEffect(() => {
    if (isOpen) {
      setPhase('intro');
      setCurrentWaveIndex(0);
      setPassedWaves([]);
      setFailedWaves([]);
      setTypedInput('');
      if (inputRef.current) {
        inputRef.current.value = '';
      }
      setShieldHp(100);
      setIsScreenFlashing(false);
      setSwordSlashActive(false);
      setResultNotice(null);
    }
  }, [isOpen]);

  // Intro countdown 2.5s then start first wave
  useEffect(() => {
    if (isOpen && phase === 'intro') {
      soundFx.playThunderStrike();
      const t = setTimeout(() => {
        setTypedInput('');
        if (inputRef.current) {
          inputRef.current.value = '';
        }
        setPhase('active');
        setTimeLeft(tribulationConfig.waves[0].time);
      }, 2400);
      return () => clearTimeout(t);
    }
  }, [isOpen, phase, tribulationConfig]);

  // Wave Timer countdown
  useEffect(() => {
    if (phase !== 'active') return;

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 0.1) {
          clearInterval(timerRef.current!);
          handleWaveTimeout();
          return 0;
        }
        return Math.max(0, +(prev - 0.1).toFixed(1));
      });
    }, 100);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [phase, currentWaveIndex]);

  // Handle typing input (Chỉ chấp nhận chữ số, loại bỏ hoàn toàn ký tự lạ)
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (phase !== 'active') {
      e.target.value = '';
      setTypedInput('');
      return;
    }

    const rawValue = e.target.value;
    // Lọc duy nhất chữ số 0-9
    const numericValue = rawValue.replace(/\D/g, '');
    setTypedInput(numericValue);
    if (e.target.value !== numericValue) {
      e.target.value = numericValue;
    }
    soundFx.playKeyClickSound();

    const targetMantra = currentWave.mantra;
    // So sánh chuẩn xác dãy số thiên lôi
    if (numericValue === targetMantra) {
      handleWaveSuccess();
    }
  };

  // Wave Succeeded: Slashed through lightning
  const handleWaveSuccess = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    soundFx.playSwordClash();
    soundFx.playTribulationPassWave();
    setSwordSlashActive(true);
    triggerLightningParticles(false);

    // Xóa NGAY LẬP TỨC toàn bộ giá trị ô input và blur để chống dính ký tự sang đợt tiếp theo
    setTypedInput('');
    if (inputRef.current) {
      inputRef.current.value = '';
      inputRef.current.blur();
    }

    const nextPassed = [...passedWaves, currentWaveIndex];
    setPassedWaves(nextPassed);
    setPhase('wave_result');

    setTimeout(() => {
      setSwordSlashActive(false);
      // Xóa triệt để lại một lần nữa trước khi chuyển đợt
      setTypedInput('');
      if (inputRef.current) {
        inputRef.current.value = '';
      }

      if (currentWaveIndex + 1 < totalWaves) {
        setCurrentWaveIndex((prev) => prev + 1);
        setTimeLeft(tribulationConfig.waves[currentWaveIndex + 1].time);
        setPhase('active');
      } else {
        // All waves finished!
        finalizeTribulation(nextPassed, failedWaves);
      }
    }, 1100);
  };

  // Wave Failed: Struck by lightning
  const handleWaveTimeout = () => {
    soundFx.playThunderStrike();
    setIsScreenFlashing(true);
    triggerScreenShake();
    triggerLightningParticles(false);
    setTimeout(() => setIsScreenFlashing(false), 600);

    // Xóa ngay giá trị input khi hết giờ
    setTypedInput('');
    if (inputRef.current) {
      inputRef.current.value = '';
      inputRef.current.blur();
    }

    const damagePerWave = Math.round(100 / totalWaves);
    setShieldHp((prev) => Math.max(0, prev - damagePerWave));

    const nextFailed = [...failedWaves, currentWaveIndex];
    setFailedWaves(nextFailed);
    setPhase('wave_result');

    setTimeout(() => {
      setTypedInput('');
      if (inputRef.current) {
        inputRef.current.value = '';
      }
      if (currentWaveIndex + 1 < totalWaves) {
        setCurrentWaveIndex((prev) => prev + 1);
        setTimeLeft(tribulationConfig.waves[currentWaveIndex + 1].time);
        setPhase('active');
      } else {
        // All waves finished!
        finalizeTribulation(passedWaves, nextFailed);
      }
    }, 1100);
  };

  // Finalize Tribulation Outcome
  const finalizeTribulation = (passed: number[], failed: number[]) => {
    // If all waves passed OR at least 60% passed + bonus from Phá Cảnh Đan
    const passRatio = passed.length / totalWaves;
    const isMastered = passRatio >= 0.6 || passed.length >= Math.ceil(totalWaves * 0.5);

    if (isMastered) {
      // 100% Guaranteed Success!
      soundFx.playVictory();
      triggerScreenShake();
      triggerLightningParticles(true);
      setPhase('victory');
      const res = attemptRealmBreakthrough(cultivationState, usePhaCanh, useHoTam, true);
      setResultNotice(res.message);

      if (nextRealm) {
        announceBreakthrough(
          username || 'Đạo Hữu',
          nextRealm.name,
          'Sơ Kỳ',
          1,
          true
        ).catch(() => {});
        if (res.unlockedFrameId && onSelectFrame) {
          onSelectFrame(res.unlockedFrameId);
          setStoredFrame(res.unlockedFrameId);
        }
      }
      onBreakthroughComplete(res);
    } else {
      // Failed tribulation
      soundFx.playError();
      setPhase('defeat');
      const res = attemptRealmBreakthrough(cultivationState, usePhaCanh, useHoTam, false);
      setResultNotice(res.message);
      onBreakthroughComplete(res);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/85 backdrop-blur-md animate-fadeIn select-none">
      {/* Dynamic Lightning Screen Flash Effect */}
      {isScreenFlashing && (
        <div className="fixed inset-0 z-50 pointer-events-none tribulation-flash-screen" />
      )}

      {/* Sword Beam Flash Effect */}
      {swordSlashActive && (
        <div className="fixed inset-0 z-40 pointer-events-none flex items-center justify-center">
          <div className="w-[140%] h-3 bg-gradient-to-r from-transparent via-amber-300 to-transparent shadow-[0_0_30px_#fde047] rotate-45 animate-pulse" />
        </div>
      )}

      <div className={`relative w-full max-w-2xl rounded-3xl bg-gradient-to-b from-[#131926] via-slate-900 to-slate-950 border-2 border-amber-500/40 shadow-2xl shadow-amber-950/60 overflow-hidden flex flex-col transition-transform ${isScreenShaking ? 'animate-tribulation-shake' : ''}`}>
        {/* Thunderstorm Cloud Ambient Glow Top */}
        <div className="absolute top-0 left-0 right-0 h-40 bg-gradient-to-b from-amber-500/15 via-rose-500/10 to-transparent pointer-events-none" />

        {/* High-Voltage Particle Lightning Canvas */}
        <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none z-30 w-full h-full" />

        {/* Top Header */}
        <div className="relative z-10 p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-300 text-xl font-bold shadow-lg shadow-amber-500/20">
              ⚡
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-wider text-amber-400">
                  {tribulationConfig.title}
                </span>
                <span className="text-[10px] font-mono font-bold text-slate-400 px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700">
                  Đợt {Math.min(currentWaveIndex + 1, totalWaves)} / {totalWaves}
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-black text-white">
                Độ Kiếp Đột Phá: {currentRealm.name} ➔ {nextRealm?.name || 'Tiên Giới'}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                const next = !screenShakeEnabled;
                setScreenShakeEnabled(next);
                try {
                  localStorage.setItem('fasttyping_screenshake', next.toString());
                } catch {}
                soundFx.playKeyClick();
              }}
              className={`px-2.5 py-1.5 rounded-xl text-[10px] font-bold border transition-colors flex items-center gap-1 cursor-pointer ${
                screenShakeEnabled
                  ? 'bg-amber-500/20 text-amber-300 border-amber-400/50 shadow-sm'
                  : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
              }`}
              title="Bật/Tắt hiệu ứng rung màn hình khi sấm sét giáng lâm"
            >
              <span>⚡ Rung: {screenShakeEnabled ? 'Bật' : 'Tắt'}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                soundFx.playKeyClick();
                onClose();
              }}
              className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
              title="Tạm hoãn độ kiếp"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Wave Progress Bar */}
        <div className="relative z-10 px-5 pt-3 pb-1 flex items-center justify-between gap-2">
          {tribulationConfig.waves.map((w, idx) => {
            const isDone = passedWaves.includes(idx);
            const isFailed = failedWaves.includes(idx);
            const isCurrent = idx === currentWaveIndex;

            return (
              <div
                key={idx}
                className="flex-1 flex flex-col items-center gap-1.5"
              >
                <div
                  className={`w-full h-2 rounded-full transition-all duration-300 ${
                    isDone
                      ? 'bg-gradient-to-r from-emerald-500 to-teal-400 shadow-[0_0_8px_rgba(16,185,129,0.8)]'
                      : isFailed
                      ? 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.8)]'
                      : isCurrent
                      ? 'bg-amber-400 animate-pulse shadow-[0_0_10px_rgba(251,191,36,0.9)]'
                      : 'bg-slate-800'
                  }`}
                />
                <span className={`text-[10px] font-bold ${isCurrent ? 'text-amber-300' : isDone ? 'text-emerald-400' : isFailed ? 'text-rose-400' : 'text-slate-600'}`}>
                  Đợt {idx + 1}
                </span>
              </div>
            );
          })}
        </div>

        {/* Center Arena Stage */}
        <div className="relative z-10 p-5 sm:p-7 flex flex-col items-center text-center">
          {/* Cultivator Avatar with Grand Realm Aura */}
          <div className="relative mb-5 flex items-center justify-center">
            {/* Protective Shield Barrier */}
            <div
              className={`absolute -inset-4 rounded-3xl border-2 transition-all duration-300 pointer-events-none ${
                shieldHp > 50
                  ? 'border-cyan-400/60 shadow-[0_0_20px_rgba(6,182,212,0.4)] animate-pulse'
                  : shieldHp > 20
                  ? 'border-amber-400/70 shadow-[0_0_20px_rgba(251,191,36,0.4)] animate-bounce'
                  : 'border-rose-500/80 shadow-[0_0_25px_rgba(244,63,94,0.6)]'
              }`}
            />

            {/* Avatar Component with Realm Aura */}
            <AvatarWithFrame
              icon={userAvatar}
              frameId={userFrame}
              size="lg"
              realmIndex={cultivationState.realmIndex}
              showRealmAura={true}
            />

            {/* Flying Lightning Spark */}
            <div className="absolute -top-3 -right-3 w-6 h-6 rounded-full bg-amber-400/20 border border-amber-300/80 flex items-center justify-center text-xs animate-ping pointer-events-none">
              ⚡
            </div>
          </div>

          {/* Phase 1: Intro */}
          {phase === 'intro' && (
            <div className="py-6 space-y-3 animate-fadeIn">
              <span className="text-2xl animate-bounce inline-block">🌩️</span>
              <h3 className="text-lg sm:text-xl font-black text-amber-300 uppercase tracking-wide">
                Lôi Vân Tụ Đỉnh • Khởi Sự Nghênh Kiếp
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 max-w-md mx-auto leading-relaxed">
                Thiên kiếp cuộn trào sấm sét giáng xuống! Hãy nhập chuẩn xác các dãy số thiên lôi trong thời gian quy định để chém rách thiên lôi, chắc chắn 100% phi thăng!
              </p>
              <div className="pt-2 text-xs font-mono font-bold text-amber-400 animate-pulse">
                Chuẩn bị sẵn sàng... Lôi kiếp đang hình thành!
              </div>
            </div>
          )}

          {/* Phase 2: Active Typing or Wave Result */}
          {(phase === 'active' || phase === 'wave_result') && (
            <div className="w-full space-y-4 animate-fadeIn">
              {/* Inner Demon Alert Banner */}
              {currentWave.isInnerDemon && (
                <div className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-950/80 via-rose-950/80 to-purple-950/80 border border-purple-500/60 shadow-[0_0_20px_rgba(168,85,247,0.4)] animate-pulse flex items-center justify-center gap-2 text-xs sm:text-sm font-black text-purple-200">
                  <span className="text-base">👿</span>
                  <span>TÂM MA KHẢO NGHIỆM ĐÃ GIÁNG LÂM • HÃY GIỮ VỮNG ĐẠO TÂM!</span>
                  <span className="text-base">💀</span>
                </div>
              )}

              {/* Meaning & Target */}
              <div className="text-center">
                <span className={`text-xs font-semibold uppercase tracking-wider block mb-1 ${currentWave.isInnerDemon ? 'text-purple-300' : 'text-slate-400'}`}>
                  {currentWave.isInnerDemon ? '⚡ Thiên Lôi Số • Tâm Ma Khảo Nghiệm' : '⚡ Thiên Lôi Thần Số'} ({currentWave.meaning})
                </span>
                <div className={`text-2xl sm:text-3xl md:text-4xl font-black text-white tracking-widest font-mono flex items-center justify-center flex-wrap gap-2 py-3.5 px-5 rounded-2xl border transition-all duration-300 ${
                  currentWave.isInnerDemon
                    ? 'bg-purple-950/40 border-purple-500/60 shadow-[0_0_25px_rgba(147,51,234,0.3)] animate-[pulse_2s_infinite]'
                    : 'bg-black/50 border-amber-500/40 shadow-[0_0_20px_rgba(251,191,36,0.15)]'
                }`}>
                  {currentWave.mantra.split('').map((char, cIdx) => {
                    const typedChar = typedInput[cIdx];
                    const isMatched = typedChar === char;
                    const isCurrentCaret = typedInput.length === cIdx;
                    const isError = typedChar && typedChar !== char;

                    return (
                      <span
                        key={cIdx}
                        className={`inline-block px-2 py-1 rounded-lg transition-all ${
                          isMatched
                            ? currentWave.isInnerDemon
                              ? 'text-fuchsia-300 bg-fuchsia-950/40 drop-shadow-[0_0_10px_rgba(217,70,239,0.9)] font-bold scale-105'
                              : 'text-amber-400 bg-amber-950/40 drop-shadow-[0_0_8px_rgba(251,191,36,0.9)] font-bold scale-105'
                            : isError
                            ? 'text-rose-400 bg-rose-950/80 border border-rose-500/50 scale-105'
                            : isCurrentCaret
                            ? `text-white border-b-2 ${currentWave.isInnerDemon ? 'border-fuchsia-400' : 'border-amber-400'} animate-pulse bg-white/10`
                            : currentWave.isInnerDemon
                            ? 'text-purple-400/80'
                            : 'text-slate-400'
                        }`}
                      >
                        {char}
                      </span>
                    );
                  })}
                </div>
              </div>

              {/* Time Remaining Bar */}
              <div className="w-full max-w-md mx-auto space-y-1.5">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-400 flex items-center gap-1">
                    <Zap className="w-3.5 h-3.5 text-amber-400" /> Thời gian lôi đình:
                  </span>
                  <span className={`font-black ${timeLeft <= 2.5 ? 'text-rose-400 animate-ping' : 'text-amber-300'}`}>
                    {timeLeft.toFixed(1)}s
                  </span>
                </div>
                <div className="w-full h-2.5 rounded-full bg-slate-950 border border-slate-800 overflow-hidden">
                  <div
                    className={`h-full transition-all duration-100 ${
                      timeLeft <= 2.5
                        ? 'bg-rose-500'
                        : 'bg-gradient-to-r from-amber-400 to-yellow-300 shadow-[0_0_12px_#fbbf24]'
                    }`}
                    style={{
                      width: `${(timeLeft / currentWave.time) * 100}%`,
                    }}
                  />
                </div>
              </div>

              {/* Input Box */}
              <div className="w-full max-w-md mx-auto pt-2">
                <input
                  ref={inputRef}
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={typedInput}
                  onChange={handleInputChange}
                  onKeyDown={(e) => {
                    if (phase !== 'active') {
                      e.preventDefault();
                      return;
                    }
                    if (['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab', 'Escape'].includes(e.key)) {
                      return;
                    }
                    if (e.ctrlKey || e.metaKey) {
                      return;
                    }
                    if (!/^[0-9]$/.test(e.key)) {
                      e.preventDefault();
                    }
                  }}
                  onPaste={(e) => {
                    if (phase !== 'active') {
                      e.preventDefault();
                      return;
                    }
                    const paste = e.clipboardData.getData('text');
                    const filtered = paste.replace(/\D/g, '');
                    if (filtered !== paste) {
                      e.preventDefault();
                      const current = typedInput;
                      const next = (current + filtered).slice(0, currentWave.mantra.length);
                      setTypedInput(next);
                      if (next === currentWave.mantra) {
                        handleWaveSuccess();
                      }
                    }
                  }}
                  placeholder="Nhập dãy thiên lôi số..."
                  disabled={phase !== 'active'}
                  readOnly={phase !== 'active'}
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck="false"
                  className="w-full px-4 py-3 rounded-xl bg-slate-900/90 border-2 border-amber-500/60 focus:border-amber-400 text-amber-300 font-mono text-center text-xl sm:text-2xl tracking-widest placeholder:text-slate-500 placeholder:text-sm placeholder:tracking-normal outline-none shadow-lg shadow-amber-950/50 transition-all disabled:opacity-60"
                />
              </div>

              {/* Protection notice */}
              <div className="flex items-center justify-center gap-4 text-xs text-slate-400 pt-1">
                <span className="flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-sky-400" />
                  Hộ Thể Thuẫn: <strong className="text-sky-300">{shieldHp}%</strong>
                </span>
                {useHoTam && (
                  <span className="flex items-center gap-1 text-emerald-300 font-bold">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Hộ Tâm Đan bảo hộ
                  </span>
                )}
                {usePhaCanh && (
                  <span className="flex items-center gap-1 text-amber-300 font-bold">
                    <Sparkles className="w-3.5 h-3.5" /> Phá Cảnh Đan trợ lực
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Phase 3: Victory */}
          {phase === 'victory' && (
            <div className="py-4 space-y-4 animate-fadeIn">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center text-3xl mx-auto shadow-[0_0_30px_rgba(16,185,129,0.8)] animate-bounce">
                🌟
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-400 uppercase tracking-wide">
                Độ Kiếp Đại Thành Công!
              </h3>
              <p className="text-xs sm:text-sm text-emerald-200 max-w-md mx-auto leading-relaxed">
                Đạo hữu đã dũng mãnh trảm phá toàn bộ lôi kiếp! Thần hồn thoát thai hoán cốt, đăng tiên nhập cảnh thành công lên <strong>{nextRealm?.name || 'Tiên Cảnh'}</strong>!
              </p>
              {resultNotice && (
                <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-xs text-emerald-300 font-medium">
                  {resultNotice}
                </div>
              )}
              <button
                type="button"
                onClick={() => {
                  soundFx.playKeyClick();
                  onClose();
                }}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg shadow-amber-500/30 transition-all cursor-pointer"
              >
                Nhận Lãnh Đạo Quả & Đóng
              </button>
            </div>
          )}

          {/* Phase 4: Defeat */}
          {phase === 'defeat' && (
            <div className="py-4 space-y-4 animate-fadeIn">
              <div className="w-16 h-16 rounded-full bg-rose-500/20 border-2 border-rose-500 flex items-center justify-center text-3xl mx-auto shadow-[0_0_30px_rgba(244,63,94,0.8)]">
                ⚡
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-rose-400 uppercase tracking-wide">
                Độ Kiếp Bất Thành!
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 max-w-md mx-auto leading-relaxed">
                {useHoTam
                  ? 'Kiếp lôi cuồng bạo đánh nát hộ thân thuẫn! Nhờ có Hộ Tâm Đan vỡ vụn bảo hộ căn cơ, giữ nguyên Tầng 10 không bị rớt tầng.'
                  : 'Kiếp lôi phản phệ làm tổn hại kinh mạch! Đạo hữu bị đánh bật về Tầng 7 (Hậu Kỳ). Hãy bồi bổ khí huyết và quay lại phục thù!'}
              </p>
              {resultNotice && (
                <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-500/40 text-xs text-rose-300 font-medium">
                  {resultNotice}
                </div>
              )}
              <button
                type="button"
                onClick={() => {
                  soundFx.playKeyClick();
                  onClose();
                }}
                className="px-6 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs uppercase tracking-wider transition-all cursor-pointer"
              >
                Lui Về Động Phủ Tĩnh Dưỡng
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
