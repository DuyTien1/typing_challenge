import React, { useState, useRef } from 'react';
import { 
  FileDown, 
  FileUp, 
  RotateCcw, 
  Check, 
  AlertTriangle, 
  CheckCircle2, 
  ShieldCheck, 
  Database,
  Layers,
  Sparkles
} from 'lucide-react';
import { soundFx } from '../../utils/audio';
import { GameConfig, HighScoreRecord } from '../../types';

interface AdminBackupTabProps {
  config: GameConfig;
  defaultConfig: GameConfig;
  onUpdateConfig: (newCfg: GameConfig) => void;
  onResetLeaderboard: (modeKey?: string) => void;
  highScores?: Record<string, HighScoreRecord | null>;
  showToast: (msg: string) => void;
}

export const AdminBackupTab: React.FC<AdminBackupTabProps> = ({
  config,
  defaultConfig,
  onUpdateConfig,
  onResetLeaderboard,
  highScores,
  showToast,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importPreview, setImportPreview] = useState<any | null>(null);

  // Export JSON file
  const handleExportConfig = () => {
    soundFx.playKeyClick();
    const backupData = {
      version: '4.0.0',
      exportedAt: new Date().toISOString(),
      config,
      highScores: highScores || {},
    };

    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(backupData, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `fasttyping-backup-${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();

    showToast('Đã xuất file sao lưu cấu hình thành công!');
  };

  // Select file to import
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed && (parsed.config || parsed.modeDurations)) {
          setImportPreview(parsed.config || parsed);
          showToast('Đã đọc file sao lưu hợp lệ. Hãy xem lại trước khi áp dụng.');
        } else {
          showToast('File JSON không đúng định dạng cấu hình FastTyping');
        }
      } catch {
        showToast('Lỗi đọc cú pháp file JSON');
      }
    };
    reader.readAsText(file);
  };

  // Apply imported config
  const handleApplyImport = () => {
    if (!importPreview) return;
    soundFx.playKeyClick();
    onUpdateConfig({
      ...defaultConfig,
      ...importPreview,
    });
    setImportPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    showToast('Đã áp dụng toàn bộ cấu hình từ file sao lưu!');
  };

  return (
    <div className="space-y-6">
      {/* Export / Import Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Card 1: Export Config */}
        <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-4 shadow-md flex flex-col justify-between">
          <div>
            <h4 className="text-xs font-black uppercase text-amber-400 tracking-wide flex items-center gap-2">
              <FileDown className="w-4 h-4 text-amber-400" />
              <span>Xuất Tệp Sao Lưu (Export Backup)</span>
            </h4>
            <p className="text-[11px] text-slate-400 mt-1">
              Tải xuống tệp tin định dạng JSON chứa toàn bộ thiết lập thời gian, danh sách từ vựng, thông số Boss và Bảng vàng hiện tại để lưu trữ dự phòng.
            </p>
          </div>

          <button
            type="button"
            onClick={handleExportConfig}
            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-black text-xs uppercase tracking-wider shadow-md shadow-amber-500/20 transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <FileDown className="w-4 h-4" />
            <span>Tải Xuống Tệp JSON (.json)</span>
          </button>
        </div>

        {/* Card 2: Import Config */}
        <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-4 shadow-md flex flex-col justify-between">
          <div>
            <h4 className="text-xs font-black uppercase text-sky-400 tracking-wide flex items-center gap-2">
              <FileUp className="w-4 h-4 text-sky-400" />
              <span>Nhập Tệp Phục Hồi (Import Backup)</span>
            </h4>
            <p className="text-[11px] text-slate-400 mt-1">
              Phục hồi cấu hình toàn hệ thống từ tệp tin JSON đã sao lưu trước đó. Hệ thống sẽ kiểm tra tính toàn vẹn trước khi áp dụng.
            </p>
          </div>

          <input
            type="file"
            ref={fileInputRef}
            accept=".json,application/json"
            onChange={handleFileChange}
            className="hidden"
          />

          <button
            type="button"
            onClick={() => {
              soundFx.playKeyClick();
              fileInputRef.current?.click();
            }}
            className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-sky-500/40 hover:border-sky-400 text-sky-300 font-bold text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <FileUp className="w-4 h-4" />
            <span>Chọn Tệp JSON Để Phục Hồi</span>
          </button>
        </div>
      </div>

      {/* Import Preview Banner if ready */}
      {importPreview && (
        <div className="p-4 rounded-2xl bg-sky-950/40 border border-sky-500/50 space-y-3 animate-in fade-in">
          <div className="flex items-center justify-between">
            <div className="font-bold text-xs text-sky-300 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-sky-400" />
              <span>Đã kiểm tra tệp sao lưu thành công! Sẵn sàng áp dụng:</span>
            </div>
            <button
              type="button"
              onClick={() => setImportPreview(null)}
              className="text-xs text-slate-400 hover:text-white"
            >
              Hủy bỏ
            </button>
          </div>

          <div className="text-[11px] text-slate-300 bg-slate-900/80 p-3 rounded-xl border border-slate-800 max-h-32 overflow-y-auto font-mono">
            {JSON.stringify(importPreview, null, 2)}
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleApplyImport}
              className="px-5 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-black text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 shadow-md shadow-sky-500/30"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              <span>Ghi Đè & Áp Dụng Cấu Hình Này</span>
            </button>
          </div>
        </div>
      )}

      {/* Reset Operations Section */}
      <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-4">
        <h4 className="text-xs font-black uppercase text-slate-300 tracking-wide flex items-center gap-2">
          <RotateCcw className="w-4 h-4 text-rose-400" />
          <span>Đặt Lại Từng Phân Hệ Về Cài Đặt Gốc (Modular Reset)</span>
        </h4>
        <p className="text-[11px] text-slate-400">
          Khôi phục nhanh từng chế độ chơi về giá trị chuẩn của hệ thống mà không ảnh hưởng tới các cấu hình khác.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {/* Reset 4 basic modes */}
          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex flex-col justify-between gap-2">
            <div>
              <div className="font-bold text-xs text-white">4 Màn Cơ Bản</div>
              <div className="text-[10px] text-slate-400">Thời gian 60s, từ khó 30%, 150 chữ</div>
            </div>
            <button
              type="button"
              onClick={() => {
                soundFx.playKeyClick();
                onUpdateConfig({
                  ...config,
                  modeDurations: {
                    ...config.modeDurations,
                    vi_dau: defaultConfig.modeDurations.vi_dau,
                    vi_nodau: defaultConfig.modeDurations.vi_nodau,
                    en: defaultConfig.modeDurations.en,
                    numpad: defaultConfig.modeDurations.numpad,
                  },
                  modeHardWordRates: {
                    ...config.modeHardWordRates,
                    vi_dau: 30,
                    vi_nodau: 25,
                    en: 30,
                    numpad: 20,
                  },
                });
                showToast('Đã khôi phục 4 màn cơ bản về mặc định!');
              }}
              className="py-1.5 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-bold transition-all cursor-pointer self-start"
            >
              Khôi Phục Cơ Bản
            </button>
          </div>

          {/* Reset Boss Raid */}
          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex flex-col justify-between gap-2">
            <div>
              <div className="font-bold text-xs text-white">Săn Boss (Raid)</div>
              <div className="text-[10px] text-slate-400">Boss HP, Giáp, WPM, Kỹ năng gốc</div>
            </div>
            <button
              type="button"
              onClick={() => {
                soundFx.playKeyClick();
                onUpdateConfig({
                  ...config,
                  bossConfig: defaultConfig.bossConfig,
                });
                showToast('Đã khôi phục cài đặt Săn Boss về mặc định!');
              }}
              className="py-1.5 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-bold transition-all cursor-pointer self-start"
            >
              Khôi Phục Boss
            </button>
          </div>

          {/* Reset All Leaderboards */}
          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex flex-col justify-between gap-2">
            <div>
              <div className="font-bold text-xs text-rose-400">Toàn Bộ Bảng Vàng</div>
              <div className="text-[10px] text-slate-400">Xóa sạch toàn bộ kỷ lục Bảng Xếp Hạng</div>
            </div>
            <button
              type="button"
              onClick={() => {
                if (window.confirm('CẢNH BÁO NGUY HIỂM: Bạn có chắc chắn muốn ĐẶT LẠI TOÀN BỘ BẢNG VÀNG KỶ LỤC? Mọi kỷ lục của tất cả các chế độ sẽ trở về trống!')) {
                  soundFx.playKeyClick();
                  onResetLeaderboard();
                  showToast('Đã đặt lại toàn bộ Bảng Vàng kỷ lục!');
                }
              }}
              className="py-1.5 px-3 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[11px] font-bold transition-all cursor-pointer self-start"
            >
              Đặt Lại Bảng Vàng
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
