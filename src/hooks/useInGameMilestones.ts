import { useState, useRef, useCallback } from 'react';
import { MilestoneToastItem } from '../components/InGameMilestoneToast';
import { soundFx } from '../utils/audio';

export function useInGameMilestones() {
  const [toasts, setToasts] = useState<MilestoneToastItem[]>([]);
  const achievedWpmTiersRef = useRef<Set<number>>(new Set());
  const achievedComboTiersRef = useRef<Set<number>>(new Set());
  const lastComboRef = useRef<number>(0);

  const resetMilestones = useCallback(() => {
    achievedWpmTiersRef.current.clear();
    achievedComboTiersRef.current.clear();
    lastComboRef.current = 0;
    setToasts([]);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((toast: Omit<MilestoneToastItem, 'id'>) => {
    const id = `milestone-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const newToast: MilestoneToastItem = { ...toast, id };
    setToasts((prev) => {
      // Keep up to 2 active toasts so screen is not overcrowded
      const updated = [newToast, ...prev.slice(0, 1)];
      return updated;
    });
  }, []);

  // Check WPM milestones
  const checkWpmMilestone = useCallback(
    (liveWpm: number, elapsedSeconds: number, completedWordsCount: number) => {
      if (elapsedSeconds < 2.5 || completedWordsCount < 2 || liveWpm <= 0) return;

      const WPM_TIERS: {
        wpm: number;
        badge: string;
        title: string;
        subtitle: string;
        color: 'cyan' | 'emerald' | 'amber' | 'purple' | 'rose';
      }[] = [
        { wpm: 40, badge: '40+ WPM', title: 'Khởi Động Tốc Độ', subtitle: 'Nhịp gõ mượt mà, sẵn sàng bứt phá!', color: 'cyan' },
        { wpm: 60, badge: '60+ WPM', title: 'Tốc Độ Vượt Trội', subtitle: 'Lướt phím thanh thoát và chính xác!', color: 'emerald' },
        { wpm: 80, badge: '80+ WPM', title: 'Siêu Tốc Đột Phá', subtitle: 'Tốc độ phản xạ phi thường!', color: 'amber' },
        { wpm: 100, badge: '100+ WPM', title: 'Thần Tốc Bứt Phá', subtitle: 'Chinh phục cột mốc ba chữ số huyền thoại!', color: 'purple' },
        { wpm: 120, badge: '120+ WPM', title: 'Cao Thủ Thượng Thừa', subtitle: 'Tốc độ đỉnh cao của tay phím vàng!', color: 'rose' },
        { wpm: 140, badge: '140+ WPM', title: 'Huyền Thoại Bàn Phím', subtitle: 'Tốc độ ánh sáng không đối thủ!', color: 'amber' },
        { wpm: 160, badge: '160+ WPM', title: 'Vượt Mọi Giới Hạn', subtitle: 'Kỷ lục gia siêu đẳng cấp thế giới!', color: 'purple' },
      ];

      for (const tier of WPM_TIERS) {
        if (liveWpm >= tier.wpm && !achievedWpmTiersRef.current.has(tier.wpm)) {
          achievedWpmTiersRef.current.add(tier.wpm);
          soundFx.playMilestone('wpm');
          addToast({
            type: 'wpm',
            value: tier.wpm,
            badge: tier.badge,
            title: tier.title,
            subtitle: tier.subtitle,
            accentColor: tier.color,
            durationMs: 2500,
          });
          break;
        }
      }
    },
    [addToast]
  );

  // Check Combo (chuỗi gõ đúng liên tiếp) milestones
  const checkComboMilestone = useCallback(
    (currentCombo: number) => {
      // If combo drops to 0, reset so player can climb again
      if (currentCombo === 0) {
        if (achievedComboTiersRef.current.size > 0) {
          achievedComboTiersRef.current.clear();
        }
        lastComboRef.current = 0;
        return;
      }

      const COMBO_TIERS: {
        combo: number;
        badge: string;
        title: string;
        subtitle: string;
        color: 'amber' | 'cyan' | 'emerald' | 'purple' | 'rose';
      }[] = [
        { combo: 10, badge: 'COMBO x10', title: 'Vào Cữ Chuẩn Xác', subtitle: '10 từ liên tiếp chuẩn không tì vết!', color: 'amber' },
        { combo: 20, badge: 'COMBO x20', title: 'Tay Lái Vững Vàng', subtitle: 'Chuỗi 20 từ xuất sắc, giữ vững phong độ!', color: 'cyan' },
        { combo: 30, badge: 'COMBO x30', title: 'Nhịp Gõ Thần Sầu', subtitle: 'Không thể ngăn cản, chuỗi 30 từ hoàn mỹ!', color: 'emerald' },
        { combo: 50, badge: 'COMBO x50', title: 'Bất Khả Xâm Phạm', subtitle: 'Nửa trăm từ chính xác tuyệt đối!', color: 'purple' },
        { combo: 75, badge: 'COMBO x75', title: 'Đẳng Cấp Thượng Thừa', subtitle: 'Chuỗi 75 từ đỉnh cao nghệ thuật gõ phím!', color: 'rose' },
        { combo: 100, badge: 'COMBO x100', title: 'Thần Gõ Xuất Thế', subtitle: '100 từ liên tục hoàn hảo vô song!', color: 'amber' },
      ];

      for (const tier of COMBO_TIERS) {
        if (currentCombo >= tier.combo && !achievedComboTiersRef.current.has(tier.combo)) {
          achievedComboTiersRef.current.add(tier.combo);
          soundFx.playMilestone('combo');
          addToast({
            type: 'combo',
            value: tier.combo,
            badge: tier.badge,
            title: tier.title,
            subtitle: tier.subtitle,
            accentColor: tier.color,
            durationMs: 2500,
          });
          break;
        }
      }

      // Dynamic milestones beyond 100
      if (currentCombo > 100 && currentCombo % 50 === 0 && !achievedComboTiersRef.current.has(currentCombo)) {
        achievedComboTiersRef.current.add(currentCombo);
        soundFx.playMilestone('combo');
        addToast({
          type: 'combo',
          value: currentCombo,
          badge: `COMBO x${currentCombo}`,
          title: 'Kỷ Lục Vô Song',
          subtitle: `${currentCombo} từ liên tiếp không một lỗi sai!`,
          accentColor: 'rose',
          durationMs: 2800,
        });
      }

      lastComboRef.current = currentCombo;
    },
    [addToast]
  );

  return {
    toasts,
    dismissToast,
    checkWpmMilestone,
    checkComboMilestone,
    resetMilestones,
  };
}
