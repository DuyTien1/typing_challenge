import React from 'react';
import { PlayerSimpleProfileModal, PlayerSimpleProfileModalProps } from './PlayerSimpleProfileModal';
import { LeaderboardEntry, HighScoreRecord } from '../types';

export interface InspectPlayerModalProps {
  isOpen: boolean;
  player: LeaderboardEntry | HighScoreRecord | any | null;
  modeName?: string;
  onClose: () => void;
  onStartGhostChallenge?: (entry: any) => void;
  onOpenWhisper?: (username: string, userId?: string) => void;
  onAddFriend?: (userId: string, username?: string) => void;
  sectList?: any[];
  currentUser?: any;
  cultivationState?: any;
  highScores?: Record<string, HighScoreRecord | null>;
  isAdminUser?: boolean;
}

export const InspectPlayerModal: React.FC<InspectPlayerModalProps> = (props) => {
  return <PlayerSimpleProfileModal {...props} />;
};

export default InspectPlayerModal;
