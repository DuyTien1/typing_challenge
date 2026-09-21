import React, { useState, useEffect } from 'react';
import {
  X,
  Lock,
  User,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  RefreshCw,
  LogOut,
  Sparkles,
  Mail,
  KeyRound,
  Eye,
  EyeOff,
} from 'lucide-react';
import { UserAccount } from '../types';
import {
  registerWithEmail,
  loginWithEmail,
  logoutUser,
  changeUserPassword,
} from '../utils/auth';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserAccount | null;
  onAuthSuccess?: (user: UserAccount) => void;
  onSuccess?: (user: UserAccount) => void;
  onLogout: () => void;
  initialMode?: 'login' | 'register' | 'password';
  initialTab?: 'login' | 'register' | 'password';
}

const AVATAR_PRESETS = ['⚡', '🔥', '👑', '🐉', '🎯', '🚀', '🦊', '🐱', '🦁', '🐺'];

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onAuthSuccess,
  onSuccess,
  onLogout,
  initialMode,
  initialTab,
}) => {
  const effectiveInitial = initialTab || initialMode || 'register';
  const [activeTab, setActiveTab] = useState<'register' | 'login'>(
    effectiveInitial === 'login' ? 'login' : 'register'
  );

  // Sub-tab for logged in user: 'info' vs 'change_pwd'
  const [userTab, setUserTab] = useState<'info' | 'change_pwd'>(
    effectiveInitial === 'password' ? 'change_pwd' : 'info'
  );

  // Form states for Registration (Username + Password, DisplayName optional)
  const [regUsername, setRegUsername] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regDisplayName, setRegDisplayName] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState('⚡');

  // Form states for Login
  const [loginAccount, setLoginAccount] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Form states for Change Password
  const [changeOldPwd, setChangeOldPwd] = useState('');
  const [changeNewPwd, setChangeNewPwd] = useState('');
  const [changeConfirmPwd, setChangeConfirmPwd] = useState('');
  const [showOldPwd, setShowOldPwd] = useState(false);
  const [showNewPwd, setShowNewPwd] = useState(false);
  const [showConfirmPwd, setShowConfirmPwd] = useState(false);

  // Loading & notification states
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const resetAllFormInputs = () => {
    setRegUsername('');
    setRegPassword('');
    setRegDisplayName('');
    setLoginAccount('');
    setLoginPassword('');
    setChangeOldPwd('');
    setChangeNewPwd('');
    setChangeConfirmPwd('');
    setErrorMsg(null);
    setSuccessMsg(null);
  };

  const triggerSuccess = (user: UserAccount) => {
    if (onAuthSuccess) onAuthSuccess(user);
    if (onSuccess) onSuccess(user);
  };

  useEffect(() => {
    if (isOpen) {
      setErrorMsg(null);
      setSuccessMsg(null);
      // Always reset passwords on modal open
      setRegPassword('');
      setLoginPassword('');
      setChangeOldPwd('');
      setChangeNewPwd('');
      setChangeConfirmPwd('');
      const tab = initialTab || initialMode || 'register';
      if (tab === 'login') {
        setActiveTab('login');
        setUserTab('info');
      } else if (tab === 'password') {
        setUserTab('change_pwd');
      } else {
        setActiveTab('register');
        setUserTab('info');
      }
    } else {
      resetAllFormInputs();
    }
  }, [isOpen, initialMode, initialTab]);

  useEffect(() => {
    if (!currentUser) {
      // Clear password and account inputs when logged out
      setRegPassword('');
      setLoginPassword('');
      setLoginAccount('');
      setChangeOldPwd('');
      setChangeNewPwd('');
      setChangeConfirmPwd('');
      setUserTab('info');
    }
  }, [currentUser]);

  if (!isOpen) return null;

  const handleChangePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!changeOldPwd) {
      setErrorMsg('Vui lòng nhập mật khẩu hiện tại.');
      return;
    }

    if (!changeNewPwd || changeNewPwd.length < 4) {
      setErrorMsg('Mật khẩu mới phải có ít nhất 4 ký tự.');
      return;
    }

    if (changeNewPwd === changeOldPwd) {
      setErrorMsg('Mật khẩu mới không được trùng với mật khẩu cũ.');
      return;
    }

    if (changeNewPwd !== changeConfirmPwd) {
      setErrorMsg('Mật khẩu xác nhận không khớp.');
      return;
    }

    setLoading(true);
    try {
      const res = await changeUserPassword(changeOldPwd, changeNewPwd);
      if (res.success) {
        setSuccessMsg('Đổi mật khẩu thành công! Mật khẩu mới đã có hiệu lực.');
        setChangeOldPwd('');
        setChangeNewPwd('');
        setChangeConfirmPwd('');
        if (currentUser?.isAdmin || currentUser?.username.toLowerCase() === 'admin') {
          try {
            localStorage.setItem('fasttyping_admin_pwd', changeNewPwd);
          } catch {
            // ignore
          }
        }
      } else {
        setErrorMsg(res.error || 'Đổi mật khẩu thất bại. Vui lòng kiểm tra lại!');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Lỗi kết nối khi đổi mật khẩu.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Simple Quick Registration (1-Step: Username + Password, DisplayName optional)
  const handleSimpleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const cleanUsername = regUsername.trim();
    if (!cleanUsername || cleanUsername.length < 3) {
      setErrorMsg('Tên đăng nhập phải có ít nhất 3 ký tự.');
      return;
    }
    if (cleanUsername.length > 24) {
      setErrorMsg('Tên đăng nhập tối đa 24 ký tự.');
      return;
    }
    if (/\s/.test(cleanUsername)) {
      setErrorMsg('Tên đăng nhập không được chứa khoảng trắng (dấu cách).');
      return;
    }

    if (!regPassword || regPassword.length < 4) {
      setErrorMsg('Mật khẩu tối thiểu 4 ký tự.');
      return;
    }

    const cleanDisplayName = regDisplayName.trim() || cleanUsername;
    if (cleanDisplayName.length > 24) {
      setErrorMsg('Tên người chơi tối đa 24 ký tự.');
      return;
    }

    setLoading(true);
    try {
      const res = await registerWithEmail({
        username: cleanUsername,
        password: regPassword,
        displayName: cleanDisplayName,
        avatar: selectedAvatar,
      });

      if (res.success && res.user) {
        setSuccessMsg('Tạo tài khoản thành công! Đang vào trò chơi...');
        setRegPassword('');
        setLoginPassword('');
        triggerSuccess(res.user);
        setTimeout(() => {
          onClose();
        }, 500);
      } else {
        setErrorMsg(res.error || 'Không thể tạo tài khoản. Vui lòng thử lại.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Lỗi kết nối khi tạo tài khoản');
    } finally {
      setLoading(false);
    }
  };

  // Handle Quick Login by Username (or legacy account)
  const handleQuickLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const identifier = loginAccount.trim();
    if (!identifier) {
      setErrorMsg('Vui lòng nhập tên đăng nhập.');
      return;
    }
    if (!loginPassword) {
      setErrorMsg('Vui lòng nhập mật khẩu.');
      return;
    }

    setLoading(true);
    try {
      const res = await loginWithEmail(identifier, loginPassword);
      if (res.success && res.user) {
        setSuccessMsg('Đăng nhập thành công!');
        setRegPassword('');
        setLoginPassword('');
        triggerSuccess(res.user);
        setTimeout(() => {
          onClose();
        }, 500);
      } else {
        setErrorMsg(res.error || 'Đăng nhập không thành công. Kiểm tra lại thông tin.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Lỗi kết nối khi đăng nhập');
    } finally {
      setLoading(false);
    }
  };

  // Handle Logout
  const handleLogoutClick = async () => {
    setLoading(true);
    await logoutUser();
    // Fully reset input fields including passwords
    resetAllFormInputs();
    onLogout();
    setLoading(false);
    onClose();
  };

  return (
    <div
      id="auth_modal_backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        id="auth_modal_container"
        className="relative w-full max-w-md bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden text-slate-100"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-100 text-sm leading-tight">
                {currentUser ? 'Hồ sơ tài khoản' : 'Tài khoản FastTyping'}
              </h3>
              <p className="text-[11px] text-slate-400">
                {currentUser ? 'Đã kích hoạt & sẵn sàng đua Top' : 'Lưu kỷ lục Bảng Vàng & Tùy biến diện mạo'}
              </p>
            </div>
          </div>
          <button
            id="close_auth_modal_btn"
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 space-y-4">
          {/* Error Message */}
          {errorMsg && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center gap-2 animate-fadeIn">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <div className="flex-1 font-medium">{errorMsg}</div>
            </div>
          )}

          {/* Success Message */}
          {successMsg && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2 animate-fadeIn">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <div className="flex-1 font-medium">{successMsg}</div>
            </div>
          )}

          {/* If already logged in */}
          {currentUser ? (
            <div className="space-y-4">
              {/* Logged-in Sub tabs */}
              <div className="grid grid-cols-2 p-1 rounded-xl bg-slate-950/60 border border-slate-800 text-xs font-bold">
                <button
                  id="tab_logged_in_info"
                  type="button"
                  onClick={() => {
                    setUserTab('info');
                    setErrorMsg(null);
                    setSuccessMsg(null);
                  }}
                  className={`py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    userTab === 'info'
                      ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <User className="w-3.5 h-3.5" />
                  Hồ sơ tài khoản
                </button>
                <button
                  id="tab_logged_in_password"
                  type="button"
                  onClick={() => {
                    setUserTab('change_pwd');
                    setErrorMsg(null);
                    setSuccessMsg(null);
                  }}
                  className={`py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    userTab === 'change_pwd'
                      ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  Đổi mật khẩu
                </button>
              </div>

              {userTab === 'info' ? (
                <>
                  <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-700/60 flex items-center gap-3.5">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/40 flex items-center justify-center text-2xl shrink-0">
                      {currentUser.avatar || '⚡'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-base truncate">{currentUser.displayName || currentUser.username}</span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          Đã kích hoạt
                        </span>
                        {currentUser.isAdmin && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                            Quản Trị Viên
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 mt-1 text-xs">
                        <span className="text-slate-400">Tên đăng nhập:</span>
                        <span className="font-mono text-amber-300 font-bold bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/20">
                          {currentUser.username}
                        </span>
                        <span className="text-[10px] text-slate-500">(Cố định)</span>
                      </div>
                      <p className="text-[11px] text-amber-400 font-medium mt-1.5 flex items-center gap-1">
                        <Sparkles className="w-3 h-3" />
                        Đủ điều kiện ghi danh Bảng Vàng
                      </p>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-950/40 border border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs text-slate-300">
                      <KeyRound className="w-4 h-4 text-amber-400" />
                      <span>Bảo mật tài khoản & mật khẩu</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setUserTab('change_pwd');
                        setErrorMsg(null);
                        setSuccessMsg(null);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold transition-colors cursor-pointer"
                    >
                      Đổi mật khẩu
                    </button>
                  </div>

                  <div className="pt-2 flex items-center gap-3">
                    <button
                      id="logout_account_btn"
                      type="button"
                      onClick={handleLogoutClick}
                      disabled={loading}
                      className="flex-1 py-2.5 px-4 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 hover:text-red-300 font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
                    >
                      <LogOut className="w-4 h-4" />
                      Đăng xuất
                    </button>
                    <button
                      id="close_logged_in_modal_btn"
                      type="button"
                      onClick={onClose}
                      className="py-2.5 px-5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition-colors cursor-pointer"
                    >
                      Đóng
                    </button>
                  </div>
                </>
              ) : (
                /* Change Password Form */
                <form onSubmit={handleChangePasswordSubmit} className="space-y-3.5">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                      Mật khẩu hiện tại
                    </label>
                    <div className="relative">
                      <input
                        type={showOldPwd ? 'text' : 'password'}
                        value={changeOldPwd}
                        onChange={(e) => setChangeOldPwd(e.target.value)}
                        placeholder="Nhập mật khẩu đang dùng..."
                        autoFocus
                        className="w-full pl-3.5 pr-10 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono text-sm outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400"
                      />
                      <button
                        type="button"
                        onClick={() => setShowOldPwd(!showOldPwd)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                      >
                        {showOldPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                      Mật khẩu mới
                    </label>
                    <div className="relative">
                      <input
                        type={showNewPwd ? 'text' : 'password'}
                        value={changeNewPwd}
                        onChange={(e) => setChangeNewPwd(e.target.value)}
                        placeholder="Mật khẩu mới (tối thiểu 4 ký tự)..."
                        className="w-full pl-3.5 pr-10 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono text-sm outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPwd(!showNewPwd)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                      >
                        {showNewPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                      Xác nhận mật khẩu mới
                    </label>
                    <div className="relative">
                      <input
                        type={showConfirmPwd ? 'text' : 'password'}
                        value={changeConfirmPwd}
                        onChange={(e) => setChangeConfirmPwd(e.target.value)}
                        placeholder="Nhập lại mật khẩu mới..."
                        className="w-full pl-3.5 pr-10 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono text-sm outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPwd(!showConfirmPwd)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                      >
                        {showConfirmPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="pt-2 flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setUserTab('info');
                        setErrorMsg(null);
                      }}
                      className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-colors cursor-pointer"
                    >
                      Quay lại
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition-all cursor-pointer disabled:opacity-50"
                    >
                      {loading ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          Đang cập nhật...
                        </>
                      ) : (
                        <>
                          <KeyRound className="w-4 h-4" />
                          Cập nhật mật khẩu
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          ) : (
            <>
              {/* Tab Selector: Tạo tài khoản vs Đăng nhập */}
              <div className="grid grid-cols-2 p-1 rounded-xl bg-slate-950/60 border border-slate-800 text-xs font-bold">
                <button
                  id="tab_register_auth"
                  type="button"
                  onClick={() => {
                    setActiveTab('register');
                    setRegPassword('');
                    setLoginPassword('');
                    setErrorMsg(null);
                  }}
                  className={`py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    activeTab === 'register'
                      ? 'bg-amber-400 text-black shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <User className="w-3.5 h-3.5" />
                  Tạo tài khoản
                </button>
                <button
                  id="tab_login_auth"
                  type="button"
                  onClick={() => {
                    setActiveTab('login');
                    setRegPassword('');
                    setLoginPassword('');
                    setErrorMsg(null);
                  }}
                  className={`py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    activeTab === 'login'
                      ? 'bg-amber-400 text-black shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Lock className="w-3.5 h-3.5" />
                  Đăng nhập
                </button>
              </div>

              {/* TAB: TẠO TÀI KHOẢN (ĐƠN GIẢN & NGẮN GỌN) */}
              {activeTab === 'register' && (
                <form onSubmit={handleSimpleRegister} className="space-y-3.5 pt-1 animate-fadeIn">
                  {/* Field 1: Tên đăng nhập */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-bold text-slate-300">
                        Tên đăng nhập
                      </label>
                      <span className="text-[10px] text-amber-400 font-semibold bg-amber-400/10 px-1.5 py-0.5 rounded border border-amber-400/20">
                        Cố định - Không thể thay đổi
                      </span>
                    </div>
                    <div className="relative">
                      <User className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        id="register_username_input"
                        type="text"
                        required
                        autoFocus
                        autoComplete="username"
                        value={regUsername}
                        onChange={(e) => setRegUsername(e.target.value.replace(/\s+/g, ''))}
                        placeholder="Nhập tên đăng nhập (viết liền, không dấu cách)"
                        maxLength={24}
                        className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-slate-950/80 border border-slate-700 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-400 transition-colors font-mono"
                      />
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1">Dùng để đăng nhập vào tài khoản, tối thiểu 3 ký tự.</p>
                  </div>

                  {/* Field 2: Mật khẩu */}
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      Mật khẩu
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        id="register_password_input"
                        type="password"
                        required
                        autoComplete="new-password"
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                        placeholder="Tối thiểu 4 ký tự"
                        minLength={4}
                        className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-slate-950/80 border border-slate-700 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-400 transition-colors"
                      />
                    </div>
                  </div>

                  {/* Field 3: Tên người chơi trong game (Tùy chọn) */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-bold text-slate-300">
                        Tên người chơi / Biệt danh
                      </label>
                      <span className="text-[10px] text-slate-500">Có thể đổi trong Hồ sơ</span>
                    </div>
                    <div className="relative">
                      <Sparkles className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        id="register_displayname_input"
                        type="text"
                        autoComplete="off"
                        value={regDisplayName}
                        onChange={(e) => setRegDisplayName(e.target.value)}
                        placeholder={regUsername ? regUsername : 'Tên hiển thị khi đua phím (mặc định theo tên đăng nhập)'}
                        maxLength={24}
                        className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-slate-950/80 border border-slate-700 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-400 transition-colors"
                      />
                    </div>
                  </div>

                  {/* Chọn Avatar nhanh */}
                  <div>
                    <span className="block text-xs font-semibold text-slate-400 mb-1.5">
                      Chọn biểu tượng:
                    </span>
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                      {AVATAR_PRESETS.map((av) => (
                        <button
                          key={av}
                          type="button"
                          onClick={() => setSelectedAvatar(av)}
                          className={`w-8 h-8 rounded-lg flex items-center justify-center text-base transition-all shrink-0 cursor-pointer ${
                            selectedAvatar === av
                              ? 'bg-amber-400/20 border-2 border-amber-400 scale-105'
                              : 'bg-slate-800/80 border border-slate-700/50 hover:bg-slate-700'
                          }`}
                        >
                          {av}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Nút Tạo Tài Khoản Ngay */}
                  <button
                    id="submit_register_btn"
                    type="submit"
                    disabled={loading}
                    className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-black font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-400/20 transition-all active:scale-98 cursor-pointer disabled:opacity-50"
                  >
                    {loading ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <span>Tạo tài khoản & Bắt đầu ngay</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>

                  {/* Switch to Login */}
                  <div className="text-center pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab('login');
                        setRegPassword('');
                        setLoginPassword('');
                        setErrorMsg(null);
                      }}
                      className="text-xs text-slate-400 hover:text-amber-400 transition-colors cursor-pointer"
                    >
                      Đã có tài khoản? <span className="font-bold underline">Đăng nhập</span>
                    </button>
                  </div>
                </form>
              )}

              {/* TAB: ĐĂNG NHẬP */}
              {activeTab === 'login' && (
                <form onSubmit={handleQuickLogin} className="space-y-3.5 pt-1 animate-fadeIn">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      Tên đăng nhập
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        id="login_account_input"
                        type="text"
                        required
                        autoFocus
                        autoComplete="username"
                        value={loginAccount}
                        onChange={(e) => setLoginAccount(e.target.value)}
                        placeholder="Nhập tên đăng nhập của bạn"
                        className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-slate-950/80 border border-slate-700 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-400 transition-colors"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      Mật khẩu
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        id="login_password_input"
                        type="password"
                        required
                        autoComplete="current-password"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        placeholder="Nhập mật khẩu"
                        className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-slate-950/80 border border-slate-700 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-400 transition-colors"
                      />
                    </div>
                  </div>

                  <button
                    id="submit_login_btn"
                    type="submit"
                    disabled={loading}
                    className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-black font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-400/20 transition-all active:scale-98 cursor-pointer disabled:opacity-50"
                  >
                    {loading ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <span>Đăng nhập</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>

                  {/* Switch to Register */}
                  <div className="text-center pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab('register');
                        setRegPassword('');
                        setLoginPassword('');
                        setErrorMsg(null);
                      }}
                      className="text-xs text-slate-400 hover:text-amber-400 transition-colors cursor-pointer"
                    >
                      Chưa có tài khoản? <span className="font-bold underline">Tạo tài khoản nhanh (5s)</span>
                    </button>
                  </div>
                </form>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
