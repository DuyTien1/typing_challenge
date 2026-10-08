import React, { Suspense, useState, useEffect } from 'react';
import {
  HighScoreRecord,
  UserAccount,
  BestWpmRecord,
  GameConfig,
  GameMode,
} from '../types';
import { CultivationState, saveStoredCultivationState } from '../utils/cultivation';
import { XIANXIA_ACHIEVEMENTS } from '../utils/achievements';
import { updateUserProfile, getStoredAuthToken } from '../utils/auth';
import { soundFx } from '../utils/audio';
import { Sparkles, CheckCircle2, Gift, X } from 'lucide-react';
import { LeaderboardModal } from './LeaderboardModal';
import { AdminModal } from './AdminModal';
import { ProfileModal } from './ProfileModal';
import { AppearanceModal } from './AppearanceModal';
import { CultivationModal } from './CultivationModal';
import { AuthModal } from './AuthModal';
import { JoinRoomModal } from './JoinRoomModal';
import { OnlineUsersModal } from './OnlineUsersModal';

export interface ModalContainerProps {
  // Modal visibility states
  isLeaderboardOpen: boolean;
  setIsLeaderboardOpen: (open: boolean) => void;
  isAdminOpen: boolean;
  setIsAdminOpen: (open: boolean) => void;
  isProfileOpen: boolean;
  setIsProfileOpen: (open: boolean) => void;
  profileInitialTab: 'profile' | 'history' | 'achievements' | 'leaderboard';
  setProfileInitialTab: (tab: 'profile' | 'history' | 'achievements' | 'leaderboard') => void;
  isAppearanceOpen: boolean;
  setIsAppearanceOpen: (open: boolean) => void;
  isCultivationOpen: boolean;
  setIsCultivationOpen: (open: boolean) => void;
  cultivationInitialTab?: 'overview' | 'alchemy' | 'artifacts' | 'sects' | 'van_bao_cac' | 'phuong_thi' | 'checkin' | 'quests' | 'realms' | 'history';
  isAuthModalOpen: boolean;
  setIsAuthModalOpen: (open: boolean) => void;
  authModalInitialTab: 'login' | 'register';
  setAuthModalInitialTab: (tab: 'login' | 'register') => void;
  isJoinModalOpen: boolean;
  setIsJoinModalOpen: (open: boolean) => void;
  targetJoinMode: GameMode;
  isOnlineUsersOpen: boolean;
  setIsOnlineUsersOpen: (open: boolean) => void;
  onOpenMatchHistory?: () => void;

  // Data & State
  highScores: Record<string, HighScoreRecord | null>;
  username: string;
  avatar: string;
  userFrame: string;
  bestWpm: number;
  bestWpmRecord: BestWpmRecord | null;
  totalGames: number;
  isAdmin: boolean;
  setIsAdmin: (val: boolean) => void;
  setAdminStatus: (val: boolean) => void;
  currentUser: UserAccount | null;
  setCurrentUser: React.Dispatch<React.SetStateAction<UserAccount | null>>;
  matchHistory: any[];
  cultivationState: CultivationState;
  setCultivationState: (state: CultivationState) => void;
  currentUserId: string;
  gameMode: GameMode;
  config: GameConfig;
  setConfig: (config: GameConfig) => void;
  defaultConfig: GameConfig;

  // Handlers
  onRefreshLeaderboard: () => Promise<void>;
  onAdminLogin: (pass: string) => boolean;
  onChangeAdminPassword: (oldP: string, newP: string) => boolean;
  onClearChat: () => void;
  onResetLeaderboard: () => void;
  onUpdateHighScores: (scores: Record<string, HighScoreRecord | null>) => void;
  onLogout: () => void;
  onChangeUsername: (newName: string) => void;
  onChangeAvatar: (newAv: string) => void;
  onChangeFrame: (newFrame: string) => void;
  showcaseAchievements: string[];
  onChangeShowcaseAchievements: (ids: string[]) => void;
  friendsList?: any[];
  onlineSeconds?: number;
  onAuthSuccess: (user: UserAccount) => void;
  onModalCreateNewRoom: (mode: GameMode, difficulty: any) => Promise<void>;
  onModalJoinExistingRoom: (roomId: string, mode: GameMode) => Promise<boolean>;
  onModalQuickJoinRoom: (mode: GameMode) => Promise<void>;
  onOpenChat: () => void;
  setNewlyUnlockedAchievements: React.Dispatch<React.SetStateAction<any[]>>;
  onStartGhostChallenge?: (entry: any) => void;
  onStartSectBoss?: (sectId: string, sectName: string) => void;
  onStartSectTournament?: (sectId: string, sectName: string) => void;
  onOpenWhisper?: (username: string, userId?: string) => void;
  onAddFriend?: (userId: string, username?: string) => void;
}

export const ModalContainer: React.FC<ModalContainerProps> = ({
  isLeaderboardOpen,
  setIsLeaderboardOpen,
  isAdminOpen,
  setIsAdminOpen,
  isProfileOpen,
  setIsProfileOpen,
  profileInitialTab,
  setProfileInitialTab,
  isAppearanceOpen,
  setIsAppearanceOpen,
  isCultivationOpen,
  setIsCultivationOpen,
  cultivationInitialTab,
  isAuthModalOpen,
  setIsAuthModalOpen,
  authModalInitialTab,
  setAuthModalInitialTab,
  isJoinModalOpen,
  setIsJoinModalOpen,
  targetJoinMode,
  isOnlineUsersOpen,
  setIsOnlineUsersOpen,
  onOpenMatchHistory,
  highScores,
  username,
  avatar,
  userFrame,
  bestWpm,
  bestWpmRecord,
  totalGames,
  isAdmin,
  setIsAdmin,
  setAdminStatus,
  currentUser,
  setCurrentUser,
  matchHistory,
  cultivationState,
  setCultivationState,
  currentUserId,
  gameMode,
  config,
  setConfig,
  defaultConfig,
  onRefreshLeaderboard,
  onAdminLogin,
  onChangeAdminPassword,
  onClearChat,
  onResetLeaderboard,
  onUpdateHighScores,
  onLogout,
  onChangeUsername,
  onChangeAvatar,
  onChangeFrame,
  showcaseAchievements,
  onChangeShowcaseAchievements,
  friendsList,
  onlineSeconds,
  onAuthSuccess,
  onModalCreateNewRoom,
  onModalJoinExistingRoom,
  onModalQuickJoinRoom,
  onOpenChat,
  setNewlyUnlockedAchievements,
  onStartGhostChallenge,
  onStartSectBoss,
  onStartSectTournament,
  onOpenWhisper,
  onAddFriend,
}) => {
  // Toast thông báo dành riêng cho Admin Dashboard khi thực thi ban thưởng
  const [adminRewardToast, setAdminRewardToast] = useState<{
    id: string;
    title: string;
    message: string;
    timestamp: number;
  } | null>(null);

  const triggerAdminRewardToast = (message: string, title = 'BAN THƯỞNG THÀNH CÔNG') => {
    setAdminRewardToast({
      id: 'admin_toast_' + Date.now(),
      title,
      message,
      timestamp: Date.now(),
    });
    soundFx.playSuccess();
  };

  useEffect(() => {
    if (!adminRewardToast) return;
    const timer = setTimeout(() => {
      setAdminRewardToast(null);
    }, 4500);
    return () => clearTimeout(timer);
  }, [adminRewardToast]);

  // Lắng nghe thông báo ban thưởng / trừng phạt từ Ban Quản Trị thời gian thực
  useEffect(() => {
    const handleNotification = (e: any) => {
      const detail = e.detail;
      if (detail?.message) {
        triggerAdminRewardToast(detail.message, detail.title || 'BAN THƯỞNG THÀNH CÔNG');
      }
    };
    window.addEventListener('admin_reward_notification', handleNotification);
    return () => {
      window.removeEventListener('admin_reward_notification', handleNotification);
    };
  }, []);

  // Master Escape handler: Closes whichever modal is currently active
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;

      // Close the topmost modal in logical stack order
      if (isJoinModalOpen) {
        e.preventDefault();
        soundFx.playKeyClick();
        setIsJoinModalOpen(false);
      } else if (isAuthModalOpen) {
        e.preventDefault();
        soundFx.playKeyClick();
        setIsAuthModalOpen(false);
      } else if (isOnlineUsersOpen) {
        e.preventDefault();
        soundFx.playKeyClick();
        setIsOnlineUsersOpen(false);
      } else if (isAppearanceOpen) {
        e.preventDefault();
        soundFx.playKeyClick();
        setIsAppearanceOpen(false);
      } else if (isCultivationOpen) {
        e.preventDefault();
        soundFx.playKeyClick();
        setIsCultivationOpen(false);
      } else if (isLeaderboardOpen) {
        e.preventDefault();
        soundFx.playKeyClick();
        setIsLeaderboardOpen(false);
      } else if (isAdminOpen) {
        e.preventDefault();
        soundFx.playKeyClick();
        setIsAdminOpen(false);
      } else if (isProfileOpen) {
        e.preventDefault();
        soundFx.playKeyClick();
        setIsProfileOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [
    isJoinModalOpen,
    isAuthModalOpen,
    isOnlineUsersOpen,
    isAppearanceOpen,
    isCultivationOpen,
    isLeaderboardOpen,
    isAdminOpen,
    isProfileOpen,
    setIsJoinModalOpen,
    setIsAuthModalOpen,
    setIsOnlineUsersOpen,
    setIsAppearanceOpen,
    setIsCultivationOpen,
    setIsLeaderboardOpen,
    setIsAdminOpen,
    setIsProfileOpen,
  ]);

  return (
    <Suspense fallback={null}>
      {/* 1. Leaderboard Modal */}
      {isLeaderboardOpen && (
        <LeaderboardModal
          highScores={highScores}
          onClose={() => setIsLeaderboardOpen(false)}
          currentUsername={username}
          currentUser={currentUser}
          cultivationState={cultivationState}
          isAdmin={isAdmin}
          onRefreshLeaderboard={onRefreshLeaderboard}
          onOpenAuthModal={() => {
            setAuthModalInitialTab('login');
            setIsAuthModalOpen(true);
          }}
          onStartGhostChallenge={onStartGhostChallenge}
          onOpenWhisper={onOpenWhisper}
          onAddFriend={onAddFriend}
        />
      )}

      {/* 2. Admin Panel Modal */}
      {isAdminOpen && (
        <AdminModal
          isAdmin={isAdmin}
          onLogin={onAdminLogin}
          onChangePassword={onChangeAdminPassword}
          onLogout={() => {
            setIsAdmin(false);
            setAdminStatus(false);
          }}
          config={config}
          onUpdateConfig={setConfig}
          onClearChat={onClearChat}
          onResetLeaderboard={onResetLeaderboard}
          onClose={() => setIsAdminOpen(false)}
          highScores={highScores}
          onUpdateHighScores={onUpdateHighScores}
          currentUsername={username}
          currentUser={currentUser}
          defaultConfig={defaultConfig}
          cultivationState={cultivationState}
          onChangeFrame={onChangeFrame}
          onRewardSuccess={(msg) => {
            triggerAdminRewardToast(msg, 'BAN THƯỞNG THÀNH CÔNG');
          }}
          onUpdateCultivationState={(next) => {
            setCultivationState(next);
            saveStoredCultivationState(next);
            triggerAdminRewardToast(
              `Đã cập nhật cảnh giới & tài nguyên Tu Tiên cho @${username}!`,
              'ĐỒNG BỘ TU TIÊN'
            );
            if (currentUser) {
              setCurrentUser((prev) => (prev ? { ...prev, cultivation: next } : prev));
              const token = getStoredAuthToken();
              const headers: Record<string, string> = { 'Content-Type': 'application/json' };
              if (token) headers['Authorization'] = `Bearer ${token}`;
              if (currentUser.username) headers['x-username'] = currentUser.username;
              fetch('/api/cultivation', {
                method: 'POST',
                headers,
                body: JSON.stringify({ cultivation: next, username: currentUser.username, userId: currentUser.id }),
              }).catch(() => {});
            }
          }}
          onSyncAchievements={(unlockedIds) => {
            const list = XIANXIA_ACHIEVEMENTS.filter((a) => unlockedIds.includes(a.id));
            setNewlyUnlockedAchievements(list);
            if (currentUser) {
              const allUnlocked = Array.from(
                new Set([...(currentUser.unlockedAchievements || []), ...unlockedIds])
              );
              setCurrentUser((prev) => (prev ? { ...prev, unlockedAchievements: allUnlocked } : prev));
              updateUserProfile({ unlockedAchievements: allUnlocked }).catch(() => {});
            }
          }}
        />
      )}

      {/* 3. Profile Modal */}
      {isProfileOpen && (
        <ProfileModal
          username={username}
          avatar={avatar}
          frame={userFrame}
          bestWpm={bestWpm}
          bestWpmRecord={bestWpmRecord}
          totalGames={totalGames}
          isAdmin={isAdmin}
          highScores={highScores}
          matchHistory={matchHistory}
          isLoggedIn={!!currentUser}
          currentUser={currentUser}
          cultivationLevel={cultivationState?.level}
          cultivationRealmIndex={cultivationState?.realmIndex}
          cultivationState={cultivationState}
          onlineSeconds={onlineSeconds}
          friendsList={friendsList}
          onOpenAuthModal={(mode) => {
            setAuthModalInitialTab(mode || 'login');
            setIsAuthModalOpen(true);
          }}
          onLogout={onLogout}
          onChangeUsername={onChangeUsername}
          onChangeAvatar={onChangeAvatar}
          onChangeFrame={onChangeFrame}
          showcaseAchievements={showcaseAchievements}
          onUpdateShowcaseAchievements={onChangeShowcaseAchievements}
          onOpenMatchHistory={onOpenMatchHistory}
          onClose={() => setIsProfileOpen(false)}
          initialTab={profileInitialTab}
        />
      )}

      {/* 4. Appearance Modal */}
      <AppearanceModal
        isOpen={isAppearanceOpen}
        onClose={() => setIsAppearanceOpen(false)}
      />

      {/* 5. Cultivation / Linh Đài Tu Tiên Modal */}
      <CultivationModal
        isOpen={isCultivationOpen}
        onClose={() => setIsCultivationOpen(false)}
        initialTab={cultivationInitialTab}
        state={cultivationState}
        username={currentUser?.username || username}
        displayName={currentUser?.displayName}
        userAvatar={avatar}
        userFrame={userFrame}
        onSelectFrame={onChangeFrame}
        isLoggedIn={Boolean(currentUser || getStoredAuthToken())}
        onOpenAuthModal={() => {
          setIsCultivationOpen(false);
          setAuthModalInitialTab('login');
          setIsAuthModalOpen(true);
        }}
        onStartSectBoss={onStartSectBoss}
        onStartSectTournament={onStartSectTournament}
        onUpdateState={(next) => {
          setCultivationState(next);
          saveStoredCultivationState(next);
          if (currentUser) {
            setCurrentUser((prev) => (prev ? { ...prev, cultivation: next } : prev));
          }
          const token = getStoredAuthToken();
          const targetUsername = currentUser?.username || username;
          if (token || currentUser) {
            const headers: Record<string, string> = { 'Content-Type': 'application/json' };
            if (token) headers['Authorization'] = `Bearer ${token}`;
            if (targetUsername) headers['x-username'] = targetUsername;
            if (currentUser?.id) headers['x-user-id'] = currentUser.id;
            fetch('/api/cultivation', {
              method: 'POST',
              headers,
              body: JSON.stringify({
                cultivation: next,
                username: targetUsername,
                userId: currentUser?.id,
              }),
            }).catch(() => {});
          }
        }}
      />

      {/* 6. Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={onAuthSuccess}
        currentUser={currentUser}
        onLogout={onLogout}
        initialTab={authModalInitialTab}
      />

      {/* 7. Join Room Selection Modal */}
      <JoinRoomModal
        isOpen={isJoinModalOpen}
        onClose={() => setIsJoinModalOpen(false)}
        mode={targetJoinMode}
        onCreateNewRoom={onModalCreateNewRoom}
        onJoinExistingRoom={onModalJoinExistingRoom}
        onQuickJoinRoom={onModalQuickJoinRoom}
      />

      {/* 8. Admin Online Users List & Details Modal */}
      {isOnlineUsersOpen && isAdmin && (
        <OnlineUsersModal
          isOpen={isOnlineUsersOpen}
          onClose={() => setIsOnlineUsersOpen(false)}
          currentUserId={currentUserId}
          onJoinRoom={async (roomId) => {
            await onModalJoinExistingRoom(roomId, gameMode);
            setIsOnlineUsersOpen(false);
          }}
          onOpenChat={() => {
            onOpenChat();
            setIsOnlineUsersOpen(false);
          }}
          highScores={highScores}
        />
      )}

      {/* 9. Floating Admin Reward Success Toast / Notification */}
      {adminRewardToast && (
        <div className="fixed top-5 right-5 z-[999999] max-w-md w-[92vw] sm:w-[420px] animate-in slide-in-from-top-4 fade-in duration-300 pointer-events-auto">
          <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-950/95 border-2 border-emerald-500/70 shadow-2xl shadow-emerald-950/80 backdrop-blur-xl flex items-start gap-3 text-slate-100 ring-2 ring-emerald-500/20">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/25 to-teal-500/35 border border-emerald-500/50 flex items-center justify-center shrink-0 shadow-inner">
              <Gift className="w-5 h-5 text-emerald-400 animate-bounce" />
            </div>

            <div className="flex-1 min-w-0 pr-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-emerald-400" />
                  <span>{adminRewardToast.title}</span>
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  {new Date(adminRewardToast.timestamp).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
              </div>

              <p className="text-xs font-bold text-white mt-1.5 leading-snug">
                {adminRewardToast.message}
              </p>

              <div className="text-[10px] text-emerald-300/80 mt-1 flex items-center gap-1 font-medium">
                <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                <span>Dữ liệu đã được lưu vĩnh viễn & phát sóng Chiếu Thư toàn hệ thống.</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setAdminRewardToast(null)}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors cursor-pointer shrink-0"
              title="Đóng thông báo"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </Suspense>
  );
};
