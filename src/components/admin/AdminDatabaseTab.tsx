import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Database, 
  Search, 
  Plus, 
  Trash2, 
  Edit3, 
  Eye, 
  RefreshCw, 
  Terminal, 
  Download, 
  Copy, 
  Check, 
  X, 
  AlertTriangle, 
  Shield, 
  Users, 
  ShoppingBag, 
  Scroll, 
  Ban, 
  Trophy, 
  Swords, 
  MessageSquare, 
  ChevronLeft, 
  ChevronRight, 
  ArrowUpDown, 
  Sparkles, 
  Play,
  Layers,
  Key,
  ExternalLink,
  Code2,
  FileJson
} from 'lucide-react';
import { soundFx } from '../../utils/audio';
import { getStoredAuthToken } from '../../utils/auth';

export interface TableColumnDef {
  name: string;
  type: string;
  isNullable: boolean;
  isPrimary: boolean;
  defaultValue?: string | null;
}

export interface TableMeta {
  name: string;
  displayName: string;
  description: string;
  primaryKey: string;
  icon: string;
  count: number;
  columns: TableColumnDef[];
}

export interface DatabaseStatus {
  isConfigured: boolean;
  isConnected: boolean;
  serverMode: 'postgresql' | 'memory';
  provider: string;
  latencyMs: number;
  executionTimeMs: number;
}

interface AdminDatabaseTabProps {
  showToast: (msg: string) => void;
}

const TABLE_ICON_MAP: Record<string, React.ReactNode> = {
  Users: <Users className="w-4 h-4 text-amber-400" />,
  Shield: <Shield className="w-4 h-4 text-emerald-400" />,
  ShoppingBag: <ShoppingBag className="w-4 h-4 text-cyan-400" />,
  Scroll: <Scroll className="w-4 h-4 text-yellow-400" />,
  Ban: <Ban className="w-4 h-4 text-rose-400" />,
  Trophy: <Trophy className="w-4 h-4 text-amber-300" />,
  Swords: <Swords className="w-4 h-4 text-purple-400" />,
  MessageSquare: <MessageSquare className="w-4 h-4 text-sky-400" />,
  Database: <Database className="w-4 h-4 text-blue-400" />,
};

export const AdminDatabaseTab: React.FC<AdminDatabaseTabProps> = ({ showToast }) => {
  // State: Overview & Tables
  const [dbStatus, setDbStatus] = useState<DatabaseStatus | null>(null);
  const [tables, setTables] = useState<TableMeta[]>([]);
  const [selectedTable, setSelectedTable] = useState<string>('app_users');
  const [isLoadingOverview, setIsLoadingOverview] = useState<boolean>(true);

  // State: Table Data & Query
  const [tableRows, setTableRows] = useState<any[]>([]);
  const [columns, setColumns] = useState<TableColumnDef[]>([]);
  const [primaryKey, setPrimaryKey] = useState<string>('id');
  const [totalRows, setTotalRows] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(20);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [isLoadingData, setIsLoadingData] = useState<boolean>(false);

  // State: Modals & Drawers
  const [detailRow, setDetailRow] = useState<any | null>(null);
  const [editRow, setEditRow] = useState<any | null>(null);
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [formValues, setFormValues] = useState<Record<string, any>>({});
  const [jsonInput, setJsonInput] = useState<string>('');
  const [editMode, setEditMode] = useState<'form' | 'json'>('form');
  const [formError, setFormError] = useState<string>('');

  // State: SQL Terminal Console
  const [isConsoleOpen, setIsConsoleOpen] = useState<boolean>(false);
  const [sqlQuery, setSqlQuery] = useState<string>('SELECT * FROM app_users ORDER BY best_wpm DESC LIMIT 10;');
  const [sqlResult, setSqlResult] = useState<any | null>(null);
  const [isExecutingSql, setIsExecutingSql] = useState<boolean>(false);
  const [sqlError, setSqlError] = useState<string>('');

  // State: Copy feedback
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const getHeaders = useCallback((): Record<string, string> => {
    const token = getStoredAuthToken();
    const h: Record<string, string> = {
      'Content-Type': 'application/json',
      'x-admin-key': 'fasttyping-admin',
    };
    if (token) h['Authorization'] = `Bearer ${token}`;
    return h;
  }, []);

  // Fetch Database Overview
  const fetchOverview = useCallback(async () => {
    setIsLoadingOverview(true);
    try {
      const res = await fetch('/api/admin/database/overview', {
        headers: getHeaders(),
      });
      const data = await res.json();
      if (data.success) {
        setDbStatus(data.status);
        setTables(data.tables || []);
        if (data.tables?.length > 0 && !data.tables.some((t: TableMeta) => t.name === selectedTable)) {
          setSelectedTable(data.tables[0].name);
        }
      } else {
        showToast(data.error || 'Không thể tải thông tin Cơ Sở Dữ Liệu');
      }
    } catch (err: any) {
      console.error('Error fetching db overview:', err);
      showToast('Lỗi kết nối tới máy chủ API');
    } finally {
      setIsLoadingOverview(false);
    }
  }, [getHeaders, selectedTable, showToast]);

  // Fetch Table Data
  const fetchTableData = useCallback(async () => {
    if (!selectedTable) return;
    setIsLoadingData(true);
    try {
      const params = new URLSearchParams({
        page: String(currentPage),
        limit: String(pageSize),
        search: searchQuery.trim(),
        sortBy: sortBy || '',
        sortOrder,
      });

      const res = await fetch(`/api/admin/database/table/${selectedTable}?${params.toString()}`, {
        headers: getHeaders(),
      });
      const data = await res.json();
      if (data.success) {
        setTableRows(data.rows || []);
        setColumns(data.columns || []);
        setPrimaryKey(data.primaryKey || 'id');
        setTotalRows(data.total || 0);
      } else {
        showToast(data.error || 'Lỗi khi nạp dữ liệu bảng');
      }
    } catch (err: any) {
      console.error('Error loading table data:', err);
      showToast('Không thể kết nối máy chủ để tải dữ liệu bảng');
    } finally {
      setIsLoadingData(false);
    }
  }, [selectedTable, currentPage, pageSize, searchQuery, sortBy, sortOrder, getHeaders, showToast]);

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  useEffect(() => {
    fetchTableData();
  }, [fetchTableData]);

  // Handle table select
  const handleSelectTable = (tblName: string) => {
    soundFx.playKeyClick();
    setSelectedTable(tblName);
    setCurrentPage(1);
    setSearchQuery('');
    setSortBy('');
    setSortOrder('desc');
  };

  // Open Create Record Modal
  const handleOpenCreate = () => {
    soundFx.playKeyClick();
    const defaults: Record<string, any> = {};
    columns.forEach((col) => {
      if (col.isPrimary) {
        if (col.name === 'id') defaults[col.name] = `${selectedTable.replace('app_', '')}_${Date.now()}`;
        else if (col.name === 'identifier') defaults[col.name] = `ban_${Date.now()}`;
        else defaults[col.name] = '';
      } else if (col.type === 'boolean') {
        defaults[col.name] = false;
      } else if (col.type === 'integer' || col.type === 'bigint' || col.type === 'numeric') {
        defaults[col.name] = 0;
      } else if (col.type === 'jsonb' || col.type === 'json') {
        defaults[col.name] = {};
      } else {
        defaults[col.name] = '';
      }
    });

    setFormValues(defaults);
    setJsonInput(JSON.stringify(defaults, null, 2));
    setEditMode('form');
    setFormError('');
    setIsCreating(true);
  };

  // Open Edit Record Modal
  const handleOpenEdit = (row: any) => {
    soundFx.playKeyClick();
    setEditRow(row);
    setFormValues({ ...row });
    setJsonInput(JSON.stringify(row, null, 2));
    setEditMode('form');
    setFormError('');
  };

  // Save Create / Edit
  const handleSaveRecord = async () => {
    soundFx.playKeyClick();
    setIsSubmitting(true);
    setFormError('');

    let payload: Record<string, any> = {};
    if (editMode === 'json') {
      try {
        payload = JSON.parse(jsonInput);
      } catch (err: any) {
        setFormError(`Cú pháp JSON không hợp lệ: ${err?.message}`);
        setIsSubmitting(false);
        return;
      }
    } else {
      payload = { ...formValues };
      // Parse JSON columns if any are strings
      columns.forEach((col) => {
        if ((col.type === 'jsonb' || col.type === 'json') && typeof payload[col.name] === 'string') {
          try {
            payload[col.name] = JSON.parse(payload[col.name]);
          } catch {
            // Keep as string if invalid or empty
          }
        }
      });
    }

    try {
      if (isCreating) {
        // Create new
        const res = await fetch(`/api/admin/database/table/${selectedTable}/create`, {
          method: 'POST',
          headers: getHeaders(),
          body: JSON.stringify({ record: payload }),
        });
        const data = await res.json();
        if (data.success) {
          soundFx.playSuccess();
          showToast(data.message || 'Đã thêm bản ghi mới thành công!');
          setIsCreating(false);
          fetchTableData();
          fetchOverview();
        } else {
          setFormError(data.error || 'Lỗi khi thêm mới');
        }
      } else if (editRow) {
        // Update existing
        const pkVal = editRow[primaryKey];
        const res = await fetch(`/api/admin/database/table/${selectedTable}/update`, {
          method: 'PUT',
          headers: getHeaders(),
          body: JSON.stringify({
            primaryKey,
            primaryKeyValue: pkVal,
            updates: payload,
          }),
        });
        const data = await res.json();
        if (data.success) {
          soundFx.playKeyClick();
          showToast(data.message || 'Đã cập nhật bản ghi thành công!');
          setEditRow(null);
          fetchTableData();
        } else {
          setFormError(data.error || 'Lỗi khi cập nhật bản ghi');
        }
      }
    } catch (err: any) {
      setFormError(`Lỗi kết nối máy chủ: ${err?.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete Record
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    soundFx.playKeyClick();
    setIsSubmitting(true);
    const pkVal = deleteTarget[primaryKey];

    try {
      const res = await fetch(`/api/admin/database/table/${selectedTable}/delete`, {
        method: 'DELETE',
        headers: getHeaders(),
        body: JSON.stringify({
          primaryKey,
          primaryKeyValue: pkVal,
        }),
      });
      const data = await res.json();
      if (data.success) {
        soundFx.playKeyClick();
        showToast(data.message || 'Đã xóa bản ghi thành công!');
        setDeleteTarget(null);
        fetchTableData();
        fetchOverview();
      } else {
        showToast(data.error || 'Lỗi khi xóa bản ghi');
      }
    } catch (err: any) {
      showToast('Lỗi máy chủ khi xóa bản ghi');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Run Custom SQL Query
  const handleExecuteSql = async () => {
    if (!sqlQuery.trim()) return;
    soundFx.playKeyClick();
    setIsExecutingSql(true);
    setSqlError('');
    setSqlResult(null);

    try {
      const res = await fetch('/api/admin/database/query', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ sql: sqlQuery.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        soundFx.playKeyClick();
        setSqlResult(data);
        showToast(`Truy vấn SQL thực thi thành công trong ${data.executionTimeMs}ms!`);
        // If it was an insert/update/delete, refresh tables
        if (['INSERT', 'UPDATE', 'DELETE', 'DROP', 'ALTER', 'CREATE'].includes(data.command)) {
          fetchTableData();
          fetchOverview();
        }
      } else {
        setSqlError(data.error || 'Lỗi khi thực thi SQL');
      }
    } catch (err: any) {
      setSqlError(`Lỗi kết nối máy chủ: ${err?.message}`);
    } finally {
      setIsExecutingSql(false);
    }
  };

  // Export JSON
  const handleExportJson = () => {
    soundFx.playKeyClick();
    window.open(`/api/admin/database/table/${selectedTable}/export`, '_blank');
    showToast(`Đang tải file sao lưu JSON của bảng ${selectedTable}...`);
  };

  // Copy to clipboard helper
  const handleCopyText = (text: string, id: string) => {
    soundFx.playKeyClick();
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
    showToast('Đã sao chép vào bộ nhớ đệm!');
  };

  const currentTableMeta = useMemo(() => {
    return tables.find((t) => t.name === selectedTable) || null;
  }, [tables, selectedTable]);

  const totalPages = Math.ceil(totalRows / pageSize) || 1;

  // Format value for display in table
  const formatCellValue = (val: any, colType: string) => {
    if (val === null || val === undefined) {
      return <span className="text-slate-600 italic">null</span>;
    }
    if (typeof val === 'boolean') {
      return val ? (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 inline-flex items-center gap-1">
          <Check className="w-3 h-3" /> true
        </span>
      ) : (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700 inline-flex items-center gap-1">
          <X className="w-3 h-3" /> false
        </span>
      );
    }
    if (typeof val === 'object') {
      const isArr = Array.isArray(val);
      const str = JSON.stringify(val);
      return (
        <button
          type="button"
          onClick={() => {
            soundFx.playKeyClick();
            setDetailRow({ [colType]: val });
          }}
          className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-slate-900 hover:bg-slate-800 text-cyan-400 border border-slate-800 transition-colors cursor-pointer flex items-center gap-1"
          title="Bấm để xem chi tiết JSON"
        >
          <FileJson className="w-3 h-3 text-cyan-500 shrink-0" />
          <span className="truncate max-w-[120px]">{isArr ? `Array(${val.length})` : str.slice(0, 30)}</span>
        </button>
      );
    }
    if (typeof val === 'number') {
      // Check if it's a unix epoch timestamp (> 1500000000000 for ms or > 1500000000 for sec)
      if (val > 1500000000000 && val < 2500000000000) {
        const d = new Date(val);
        return (
          <span className="font-mono text-xs text-amber-300/90" title={d.toISOString()}>
            {d.toLocaleString('vi-VN', { hour12: false, month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
          </span>
        );
      }
      return <span className="font-mono text-xs text-emerald-400">{val.toLocaleString('vi-VN')}</span>;
    }
    const str = String(val);
    if (str.length > 35) {
      return (
        <span className="truncate max-w-[160px] inline-block text-xs text-slate-300" title={str}>
          {str.slice(0, 35)}...
        </span>
      );
    }
    return <span className="text-xs text-slate-200">{str}</span>;
  };

  return (
    <div className="space-y-6">
      {/* 1. Header & Database Status Overview Bar */}
      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-950 to-slate-900 border border-slate-800/80 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-600/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-lg shadow-cyan-500/10 shrink-0">
            <Database className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base sm:text-lg font-black text-white tracking-wide flex items-center gap-2">
                HỆ THỐNG CƠ SỞ DỮ LIỆU & CRUD
              </h3>
              {dbStatus?.isConnected ? (
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5 shadow-sm">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  PostgreSQL Online ({dbStatus.latencyMs}ms)
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center gap-1.5 shadow-sm">
                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                  Local In-Memory Mode
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {dbStatus?.provider || 'Đang kết nối...'} • Quản trị dữ liệu 8 bảng thực tế theo tiêu chuẩn Thiên Đạo
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap self-end md:self-auto">
          {/* SQL Console Toggle Button */}
          <button
            type="button"
            onClick={() => {
              soundFx.playKeyClick();
              setIsConsoleOpen(!isConsoleOpen);
            }}
            className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              isConsoleOpen
                ? 'bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/20 font-black'
                : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/60'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>SQL Console</span>
          </button>

          {/* Export JSON Button */}
          <button
            type="button"
            onClick={handleExportJson}
            className="px-3 py-2 rounded-xl text-xs font-bold bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/60 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-sky-400" />
            <span>Xuất JSON</span>
          </button>

          {/* Refresh Data Button */}
          <button
            type="button"
            onClick={() => {
              soundFx.playKeyClick();
              fetchOverview();
              fetchTableData();
              showToast('Đang làm mới dữ liệu...');
            }}
            disabled={isLoadingOverview || isLoadingData}
            className="px-3 py-2 rounded-xl text-xs font-bold bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/60 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-emerald-400 ${isLoadingData || isLoadingOverview ? 'animate-spin' : ''}`} />
            <span>Làm Mới</span>
          </button>
        </div>
      </div>

      {/* 2. SQL Interactive Console Terminal (Collapsible) */}
      {isConsoleOpen && (
        <div className="p-4 sm:p-5 rounded-2xl bg-slate-950 border border-cyan-500/30 shadow-2xl space-y-3 animate-fadeIn">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Code2 className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-black uppercase text-cyan-400 tracking-wider">
                SQL Interactive Executor (PostgreSQL Cloud Supabase)
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-500">Mẫu nhanh:</span>
              <button
                type="button"
                onClick={() => setSqlQuery('SELECT id, username, best_wpm, total_games FROM app_users ORDER BY best_wpm DESC LIMIT 10;')}
                className="text-[10px] px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-800 text-cyan-400 border border-slate-800 cursor-pointer"
              >
                Top 10 WPM
              </button>
              <button
                type="button"
                onClick={() => setSqlQuery('SELECT id, name, tag, level, exp, leader_name FROM app_sects ORDER BY level DESC;')}
                className="text-[10px] px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-800 text-cyan-400 border border-slate-800 cursor-pointer"
              >
                Tông Môn
              </button>
              <button
                type="button"
                onClick={() => setSqlQuery('SELECT id, item_name, quantity, price_per_unit, status FROM app_market_listings WHERE status = \'active\';')}
                className="text-[10px] px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-800 text-cyan-400 border border-slate-800 cursor-pointer"
              >
                Chợ Phường Thị
              </button>
            </div>
          </div>

          <div className="relative">
            <textarea
              value={sqlQuery}
              onChange={(e) => setSqlQuery(e.target.value)}
              rows={3}
              placeholder="Nhập câu lệnh SQL (vd: SELECT * FROM app_users WHERE is_admin = true;)"
              className="w-full font-mono text-xs px-3.5 py-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-emerald-300 focus:outline-none focus:border-cyan-500/60 focus:ring-1 focus:ring-cyan-500/40 resize-y"
            />
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[11px] text-slate-500 italic">
              * Lệnh an toàn: DROP DATABASE và ALTER SYSTEM bị chặn tự động vì lý do bảo mật.
            </span>
            <button
              type="button"
              onClick={handleExecuteSql}
              disabled={isExecutingSql || !sqlQuery.trim()}
              className="px-4 py-2 rounded-xl text-xs font-black bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 flex items-center gap-1.5 transition-all shadow-md shadow-cyan-500/20 cursor-pointer disabled:opacity-50"
            >
              {isExecutingSql ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Play className="w-3.5 h-3.5 fill-current" />
              )}
              <span>Chạy Truy Vấn (Execute)</span>
            </button>
          </div>

          {sqlError && (
            <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{sqlError}</span>
            </div>
          )}

          {sqlResult && (
            <div className="mt-3 p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="font-bold text-emerald-400">
                  Lệnh: {sqlResult.command} • Kết quả: {sqlResult.rowCount} bản ghi
                </span>
                <span className="font-mono text-slate-500">{sqlResult.executionTimeMs}ms</span>
              </div>
              {sqlResult.rows && sqlResult.rows.length > 0 ? (
                <div className="overflow-x-auto max-h-60 rounded-lg border border-slate-800">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-slate-950 font-bold uppercase text-[10px] text-slate-400 border-b border-slate-800">
                      <tr>
                        {Object.keys(sqlResult.rows[0]).map((k) => (
                          <th key={k} className="px-3 py-2">{k}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                      {sqlResult.rows.map((row: any, idx: number) => (
                        <tr key={idx} className="hover:bg-slate-800/40">
                          {Object.values(row).map((v: any, cIdx: number) => (
                            <td key={cIdx} className="px-3 py-1.5 whitespace-nowrap">
                              {typeof v === 'object' && v !== null ? JSON.stringify(v) : String(v ?? '')}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-xs text-slate-500 italic py-1">Không có hàng dữ liệu trả về</div>
              )}
            </div>
          )}
        </div>
      )}

      {/* 3. Table Navigation Selector Pills */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-black uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-cyan-400" />
            <span>Chọn Bảng Dữ Liệu ({tables.length} bảng):</span>
          </label>
          {currentTableMeta && (
            <span className="text-xs text-slate-400 font-medium">
              Khóa chính: <code className="font-mono text-cyan-400 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">{currentTableMeta.primaryKey}</code> • Tổng: <strong className="text-white">{currentTableMeta.count}</strong> dòng
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 gap-2.5">
          {tables.map((t) => {
            const isSelected = t.name === selectedTable;
            const icon = TABLE_ICON_MAP[t.icon] || <Database className="w-4 h-4 text-cyan-400" />;

            return (
              <button
                key={t.name}
                type="button"
                onClick={() => handleSelectTable(t.name)}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-1.5 ${
                  isSelected
                    ? 'bg-gradient-to-br from-cyan-950/80 via-slate-900 to-slate-950 border-cyan-500/50 shadow-lg shadow-cyan-500/10 ring-1 ring-cyan-400/40'
                    : 'bg-slate-950/80 hover:bg-slate-900 border-slate-800 text-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {icon}
                    <span className={`text-xs font-black tracking-wide ${isSelected ? 'text-cyan-300' : 'text-slate-200'}`}>
                      {t.displayName}
                    </span>
                  </div>
                  <span
                    className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                      isSelected
                        ? 'bg-cyan-500 text-slate-950'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {t.count}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                  <span>{t.name}</span>
                  <span>{t.columns.length} cột</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. Controls Bar: Search, Pagination Size, Sort & Create Button */}
      <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shadow-md">
        <div className="flex items-center gap-2 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder={`Tìm kiếm trong ${selectedTable}...`}
              className="w-full text-xs pl-8 pr-8 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/60"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Sort By Column */}
          {columns.length > 0 && (
            <div className="flex items-center gap-1.5 shrink-0">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="text-xs px-2.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 focus:outline-none focus:border-cyan-500/60"
              >
                <option value="">Sắp xếp: Mặc định</option>
                {columns.map((c) => (
                  <option key={c.name} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={() => {
                  soundFx.playKeyClick();
                  setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                }}
                className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white cursor-pointer"
                title={`Thứ tự: ${sortOrder.toUpperCase()}`}
              >
                <ArrowUpDown className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2.5 shrink-0 justify-end">
          {/* Page size */}
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <span>Dòng/trang:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="text-xs px-2 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 focus:outline-none"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>

          {/* + Thêm bản ghi mới */}
          <button
            type="button"
            onClick={handleOpenCreate}
            className="px-4 py-2 rounded-xl text-xs font-black bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 flex items-center gap-1.5 transition-all shadow-md shadow-emerald-500/20 cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Thêm Bản Ghi Mới</span>
          </button>
        </div>
      </div>

      {/* 5. Main Data Grid Table View */}
      <div className="rounded-2xl border border-slate-800 bg-slate-950 shadow-xl overflow-hidden">
        <div className="overflow-x-auto max-h-[520px]">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="sticky top-0 bg-slate-900/95 backdrop-blur-md text-slate-400 uppercase text-[10px] font-black tracking-wider border-b border-slate-800 z-10">
              <tr>
                <th className="px-3 py-3 w-12 text-center text-slate-500">#</th>
                {columns.map((col) => (
                  <th key={col.name} className="px-3 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-1">
                      <span className={col.isPrimary ? 'text-cyan-400 font-bold' : 'text-slate-300'}>
                        {col.name}
                      </span>
                      {col.isPrimary && (
                        <Key className="w-3 h-3 text-cyan-400" title="Khóa chính (Primary Key)" />
                      )}
                      <span className="text-[9px] font-mono text-slate-600 lowercase font-normal">
                        ({col.type})
                      </span>
                    </div>
                  </th>
                ))}
                <th className="px-3 py-3 text-right whitespace-nowrap sticky right-0 bg-slate-900/95">
                  Thao Tác
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-800/60">
              {isLoadingData ? (
                <tr>
                  <td colSpan={columns.length + 2} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-cyan-400" />
                    <span>Đang nạp dữ liệu từ bảng {selectedTable}...</span>
                  </td>
                </tr>
              ) : tableRows.length === 0 ? (
                <tr>
                  <td colSpan={columns.length + 2} className="py-12 text-center text-slate-400">
                    <Database className="w-8 h-8 mx-auto mb-2 text-slate-600" />
                    <p className="text-sm font-bold text-slate-300">Không có dữ liệu trong bảng {selectedTable}</p>
                    <p className="text-xs text-slate-500 mt-1">
                      {searchQuery ? 'Không tìm thấy dòng nào khớp từ khóa tìm kiếm' : 'Bảng hiện chưa có bản ghi nào. Bấm nút Thêm Mới để tạo bản ghi đầu tiên!'}
                    </p>
                  </td>
                </tr>
              ) : (
                tableRows.map((row, rowIdx) => {
                  const pkVal = row[primaryKey];
                  const rowNum = (currentPage - 1) * pageSize + rowIdx + 1;

                  return (
                    <tr
                      key={pkVal ?? rowIdx}
                      className="hover:bg-slate-900/60 transition-colors group"
                    >
                      {/* Row index */}
                      <td className="px-3 py-2.5 text-center text-[10px] font-mono text-slate-600">
                        {rowNum}
                      </td>

                      {/* Columns */}
                      {columns.map((col) => {
                        const cellVal = row[col.name];
                        const isPk = col.isPrimary;

                        return (
                          <td
                            key={col.name}
                            className={`px-3 py-2.5 whitespace-nowrap ${
                              isPk ? 'font-mono text-cyan-400 font-bold' : ''
                            }`}
                          >
                            {isPk ? (
                              <button
                                type="button"
                                onClick={() => handleCopyText(String(cellVal), `${rowIdx}_${col.name}`)}
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-cyan-950/60 hover:bg-cyan-900/80 text-cyan-300 border border-cyan-800/40 text-[11px] font-mono cursor-pointer transition-colors"
                                title="Bấm để sao chép khóa chính"
                              >
                                <span>{String(cellVal)}</span>
                                {copiedId === `${rowIdx}_${col.name}` ? (
                                  <Check className="w-3 h-3 text-emerald-400" />
                                ) : (
                                  <Copy className="w-2.5 h-2.5 opacity-60 group-hover:opacity-100" />
                                )}
                              </button>
                            ) : (
                              formatCellValue(cellVal, col.type)
                            )}
                          </td>
                        );
                      })}

                      {/* Action buttons */}
                      <td className="px-3 py-2.5 text-right whitespace-nowrap sticky right-0 bg-slate-950 group-hover:bg-slate-900/90 transition-colors">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Xem chi tiết */}
                          <button
                            type="button"
                            onClick={() => {
                              soundFx.playKeyClick();
                              setDetailRow(row);
                            }}
                            className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                            title="Xem toàn bộ bản ghi"
                          >
                            <Eye className="w-3.5 h-3.5 text-sky-400" />
                          </button>

                          {/* Sửa bản ghi */}
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(row)}
                            className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-amber-500/20 text-slate-300 hover:text-amber-300 border border-transparent hover:border-amber-500/30 transition-colors cursor-pointer"
                            title="Chỉnh sửa bản ghi này"
                          >
                            <Edit3 className="w-3.5 h-3.5 text-amber-400" />
                          </button>

                          {/* Xóa bản ghi */}
                          <button
                            type="button"
                            onClick={() => {
                              soundFx.playKeyClick();
                              setDeleteTarget(row);
                            }}
                            className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-rose-500/20 text-slate-300 hover:text-rose-300 border border-transparent hover:border-rose-500/30 transition-colors cursor-pointer"
                            title="Xóa bản ghi khỏi cơ sở dữ liệu"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* 6. Pagination Footer */}
        <div className="p-3.5 bg-slate-950 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
          <div>
            Hiển thị{' '}
            <strong className="text-white">
              {totalRows === 0 ? 0 : (currentPage - 1) * pageSize + 1} -{' '}
              {Math.min(currentPage * pageSize, totalRows)}
            </strong>{' '}
            trên tổng <strong className="text-cyan-400">{totalRows}</strong> bản ghi
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                soundFx.playKeyClick();
                setCurrentPage((p) => Math.max(1, p - 1));
              }}
              disabled={currentPage <= 1 || isLoadingData}
              className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 disabled:opacity-40 disabled:pointer-events-none flex items-center gap-1 cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Trước</span>
            </button>

            <span className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 font-mono">
              Trang {currentPage} / {totalPages}
            </span>

            <button
              type="button"
              onClick={() => {
                soundFx.playKeyClick();
                setCurrentPage((p) => Math.min(totalPages, p + 1));
              }}
              disabled={currentPage >= totalPages || isLoadingData}
              className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 disabled:opacity-40 disabled:pointer-events-none flex items-center gap-1 cursor-pointer"
            >
              <span>Sau</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* 7. Modal: Create / Edit Record Modal */}
      {(isCreating || editRow) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-2xl max-h-[90vh] bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-scaleUp">
            {/* Modal Header */}
            <div className="px-5 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className={`p-2 rounded-xl ${isCreating ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
                  {isCreating ? <Plus className="w-5 h-5 stroke-[2.5]" /> : <Edit3 className="w-5 h-5" />}
                </div>
                <div>
                  <h4 className="text-sm font-black text-white uppercase tracking-wider">
                    {isCreating ? `Thêm Bản Ghi Mới Vào ${selectedTable}` : `Chỉnh Sửa Bản Ghi [${editRow[primaryKey]}]`}
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    Cập nhật trực tiếp vào cơ sở dữ liệu PostgreSQL / Cloud Supabase
                  </p>
                </div>
              </div>

              {/* View Switch: Form vs JSON */}
              <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    soundFx.playKeyClick();
                    if (editMode === 'json') {
                      try {
                        const parsed = JSON.parse(jsonInput);
                        setFormValues(parsed);
                        setEditMode('form');
                        setFormError('');
                      } catch (err: any) {
                        setFormError('Không thể chuyển qua Form vì JSON chưa đúng cú pháp!');
                      }
                    } else {
                      setEditMode('form');
                    }
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    editMode === 'form' ? 'bg-cyan-500 text-slate-950' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Biểu Mẫu
                </button>
                <button
                  type="button"
                  onClick={() => {
                    soundFx.playKeyClick();
                    setJsonInput(JSON.stringify(formValues, null, 2));
                    setEditMode('json');
                    setFormError('');
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    editMode === 'json' ? 'bg-cyan-500 text-slate-950' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Raw JSON
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-4 flex-1">
              {formError && (
                <div className="p-3 rounded-xl bg-rose-950/70 border border-rose-500/50 text-rose-300 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {editMode === 'json' ? (
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
                    <span>Soạn thảo dữ liệu JSON:</span>
                    <span className="text-[10px] text-slate-500 font-mono">UTF-8 JSON Validated</span>
                  </label>
                  <textarea
                    value={jsonInput}
                    onChange={(e) => setJsonInput(e.target.value)}
                    rows={15}
                    className="w-full font-mono text-xs p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-emerald-300 focus:outline-none focus:border-cyan-500 resize-y"
                  />
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {columns.map((col) => {
                    const val = formValues[col.name];
                    const isPk = col.isPrimary;
                    const isJson = col.type === 'jsonb' || col.type === 'json';
                    const isBool = col.type === 'boolean';
                    const isNum = col.type === 'integer' || col.type === 'bigint' || col.type === 'numeric';

                    return (
                      <div
                        key={col.name}
                        className={`space-y-1.5 ${isJson ? 'sm:col-span-2' : ''}`}
                      >
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-bold text-slate-300 flex items-center gap-1">
                            <span>{col.name}</span>
                            {isPk && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                                PK
                              </span>
                            )}
                          </label>
                          <span className="text-[10px] font-mono text-slate-500">{col.type}</span>
                        </div>

                        {isBool ? (
                          <div className="flex items-center gap-3 pt-1">
                            <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                              <input
                                type="radio"
                                name={`bool_${col.name}`}
                                checked={val === true}
                                onChange={() => setFormValues({ ...formValues, [col.name]: true })}
                                className="accent-emerald-500 w-4 h-4"
                              />
                              <span>True</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                              <input
                                type="radio"
                                name={`bool_${col.name}`}
                                checked={val === false || val === null || val === undefined}
                                onChange={() => setFormValues({ ...formValues, [col.name]: false })}
                                className="accent-rose-500 w-4 h-4"
                              />
                              <span>False</span>
                            </label>
                          </div>
                        ) : isJson ? (
                          <textarea
                            value={typeof val === 'object' ? JSON.stringify(val, null, 2) : String(val ?? '')}
                            onChange={(e) => {
                              try {
                                const parsed = JSON.parse(e.target.value);
                                setFormValues({ ...formValues, [col.name]: parsed });
                              } catch {
                                setFormValues({ ...formValues, [col.name]: e.target.value });
                              }
                            }}
                            rows={4}
                            placeholder="{}"
                            className="w-full font-mono text-xs px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-cyan-300 focus:outline-none focus:border-cyan-500"
                          />
                        ) : (
                          <input
                            type={isNum ? 'number' : 'text'}
                            value={val ?? ''}
                            disabled={isPk && !isCreating}
                            onChange={(e) => {
                              const v = isNum ? (e.target.value === '' ? null : Number(e.target.value)) : e.target.value;
                              setFormValues({ ...formValues, [col.name]: v });
                            }}
                            className={`w-full text-xs px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-cyan-500 ${
                              isPk && !isCreating ? 'opacity-60 cursor-not-allowed bg-slate-950/50' : ''
                            }`}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3.5 bg-slate-950 border-t border-slate-800 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => {
                  soundFx.playKeyClick();
                  setIsCreating(false);
                  setEditRow(null);
                }}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
              >
                Hủy Bỏ
              </button>

              <button
                type="button"
                onClick={handleSaveRecord}
                disabled={isSubmitting}
                className="px-5 py-2 rounded-xl text-xs font-black bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 flex items-center gap-1.5 shadow-lg shadow-cyan-500/20 cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Check className="w-4 h-4 stroke-[3]" />
                )}
                <span>{isCreating ? 'Xác Nhận Thêm Mới' : 'Lưu Thay Đổi'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 8. Modal: View Detail Record Drawer/Modal */}
      {detailRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-2xl max-h-[90vh] bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-scaleUp">
            <div className="px-5 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-sky-400" />
                <h4 className="text-sm font-black text-white uppercase tracking-wider">
                  Chi Tiết Bản Ghi
                </h4>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleCopyText(JSON.stringify(detailRow, null, 2), 'detail_modal')}
                  className="px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center gap-1 cursor-pointer"
                >
                  <Copy className="w-3 h-3" />
                  <span>Sao chép JSON</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDetailRow(null)}
                  className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="p-5 overflow-y-auto space-y-3 flex-1 font-mono text-xs">
              <div className="space-y-2">
                {Object.entries(detailRow).map(([key, val]) => (
                  <div key={key} className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                    <div className="flex items-center justify-between text-slate-400 font-bold text-[11px]">
                      <span className="text-cyan-400">{key}</span>
                      <span className="text-[10px] text-slate-500 font-normal">
                        {typeof val === 'object' && val !== null ? (Array.isArray(val) ? 'array' : 'object') : typeof val}
                      </span>
                    </div>
                    <div className="text-slate-200 break-all select-text">
                      {typeof val === 'object' && val !== null ? (
                        <pre className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-emerald-300 text-[11px] overflow-x-auto whitespace-pre-wrap">
                          {JSON.stringify(val, null, 2)}
                        </pre>
                      ) : (
                        <span>{String(val ?? 'null')}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="px-5 py-3.5 bg-slate-950 border-t border-slate-800 flex items-center justify-end">
              <button
                type="button"
                onClick={() => setDetailRow(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 9. Modal: Confirm Delete */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-md bg-slate-900 border border-rose-500/40 rounded-2xl shadow-2xl p-5 space-y-4 animate-scaleUp">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-black text-white uppercase tracking-wider">
                  Xác Nhận Xóa Vĩnh Viễn
                </h4>
                <p className="text-xs text-slate-400">
                  Hành động này không thể hoàn tác trong cơ sở dữ liệu!
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 space-y-1">
              <div>Bảng: <strong className="text-cyan-400 font-mono">{selectedTable}</strong></div>
              <div>Khóa chính: <strong className="text-amber-400 font-mono">{deleteTarget[primaryKey]}</strong></div>
              {deleteTarget.username && <div>Tài khoản: <strong>@{deleteTarget.username}</strong></div>}
              {deleteTarget.name && <div>Tên: <strong>{deleteTarget.name}</strong></div>}
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
              >
                Hủy Bỏ
              </button>

              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-xl text-xs font-black bg-rose-600 hover:bg-rose-500 text-white flex items-center gap-1.5 shadow-lg shadow-rose-600/30 cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
                <span>Xóa Vĩnh Viễn</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
