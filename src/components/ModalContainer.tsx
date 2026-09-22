import React, { Suspense } from 'react';
import {
  HighScoreRecord,
  UserAccount,
  BestWpmRecord,
  GameConfig,
  GameMode,
} from '../types';
import { CultivationState, saveStoredCultivationState } from '../utils/cultivation';
import { XIANXIA_ACHIEVEMENTS } from '../utils/achievements';
import { updateUserProfile } from '../utils/auth';
import { soundFx } from '../utils/audio';

// Lazy-loaded modal components for performance and code splitting
const LeaderboardModal = React.lazy(() =>
  import('./LeaderboardModal').then((m) => ({ default: m.LeaderboardModal }))
);
const AdminModal = React.lazy(() =>
  import('./AdminModal').then((m) => ({ default: m.AdminModal }))
);
const ProfileModal = React.lazy(() =>
  import('./ProfileModal').then((m) => ({ default: m.ProfileModal }))
);
const AppearanceModal = React.lazy(() =>
  import('./AppearanceModal').then((m) => ({ default: m.AppearanceModal }))
);
const CultivationModal = React.lazy(() =>
  import('./CultivationModal').then((m) => ({ default: m.CultivationModal }))
);
const AuthModal = React.lazy(() =>
  import('./AuthModal').then((m) => ({ default: m.AuthModal }))
);
const JoinRoomModal = React.lazy(() =>
  import('./JoinRoomModal').then((m) => ({ default: m.JoinRoomModal }))
);
const OnlineUsersModal = React.lazy(() =>
  import('./OnlineUsersModal').then((m) => ({ default: m.OnlineUsersModal }))
);

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
  isAuthModalOpen: boolean;
  setIsAuthModalOpen: (open: boolean) => void;
  authModalInitialTab: 'login' | 'register';
  setAuthModalInitialTab: (tab: 'login' | 'register') => void;
  isJoinModalOpen: boolean;
  setIsJoinModalOpen: (open: boolean) => void;
  targetJoinMode: GameMode;
  isOnlineUsersOpen: boolean;
  setIsOnlineUsersOpen: (open: boolean) => void;

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
  onAuthSuccess: (user: UserAccount) => void;
  onModalCreateNewRoom: (mode: GameMode, difficulty: any) => Promise<void>;
  onModalJoinExistingRoom: (roomId: string, mode: GameMode) => Promise<boolean>;
  onModalQuickJoinRoom: (mode: GameMode) => Promise<void>;
  onOpenChat: () => void;
  setNewlyUnlockedAchievements: React.Dispatch<React.SetStateAction<any[]>>;
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
  isAuthModalOpen,
  setIsAuthModalOpen,
  authModalInitialTab,
  setAuthModalInitialTab,
  isJoinModalOpen,
  setIsJoinModalOpen,
  targetJoinMode,
  isOnlineUsersOpen,
  setIsOnlineUsersOpen,
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
  onAuthSuccess,
  onModalCreateNewRoom,
  onModalJoinExistingRoom,
  onModalQuickJoinRoom,
  onOpenChat,
  setNewlyUnlockedAchievements,
}) => {
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
          onUpdateCultivationState={(next) => {
            setCultivationState(next);
            saveStoredCultivationState(next);
            if (currentUser) {
              setCurrentUser((prev) => (prev ? { ...prev, cultivation: next } : prev));
              fetch('/api/cultivation', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ cultivation: next }),
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
        state={cultivationState}
        userAvatar={avatar}
        userFrame={userFrame}
        onSelectFrame={onChangeFrame}
        isLoggedIn={Boolean(currentUser)}
        onOpenAuthModal={() => {
          setIsCultivationOpen(false);
          setAuthModalInitialTab('login');
          setIsAuthModalOpen(true);
        }}
        onUpdateState={(next) => {
          if (!currentUser) return;
          setCultivationState(next);
          saveStoredCultivationState(next);
          const token = sessionStorage.getItem('fasttyping_token');
          if (token) {
            fetch('/api/cultivation', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({ cultivation: next }),
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
    </Suspense>
  );
};
