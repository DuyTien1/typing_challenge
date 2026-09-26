import { useState, useCallback, useRef } from 'react';
import { ChatMessage, ChatChannel, ChatCardType, ChatCardData } from '../types';
import { soundFx } from '../utils/audio';
import { sendChatMessage } from '../utils/roomManager';

export interface UseChatEngineProps {
  currentUsername: string;
  currentUserAvatar?: string;
  currentUserFrame?: string;
  currentUserId: string;
  currentRealmName?: string;
  currentRealmIcon?: string;
  currentSectId?: string;
  currentSectTag?: string;
  currentRoomId?: string | null;
  isAdmin?: boolean;
}

export function useChatEngine({
  currentUsername,
  currentUserAvatar = '🦊',
  currentUserFrame = 'default',
  currentUserId,
  currentRealmName,
  currentRealmIcon,
  currentSectId,
  currentSectTag,
  currentRoomId,
  isAdmin = false,
}: UseChatEngineProps) {
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [activeChannel, setActiveChannel] = useState<ChatChannel>('global');
  const [whisperTargetUser, setWhisperTargetUser] = useState<{ username: string; userId: string } | null>(null);
  const [unreadChatCount, setUnreadChatCount] = useState<number>(0);

  const isChatOpenRef = useRef(isChatOpen);
  isChatOpenRef.current = isChatOpen;

  const currentRoomIdRef = useRef(currentRoomId);
  currentRoomIdRef.current = currentRoomId;

  // Deduplication helper to prevent double chat in all channels (Global & Room)
  const appendChatMessage = useCallback((newMsg: ChatMessage) => {
    setChatMessages((prev) => {
      // 1. Direct ID deduplication
      if (prev.some((m) => m.id === newMsg.id)) {
        return prev;
      }
      // 2. Strict content deduplication: same user, channel, message within 4 seconds window
      const isDuplicate = prev.some(
        (m) =>
          m.username === newMsg.username &&
          m.channel === newMsg.channel &&
          m.message.trim() === newMsg.message.trim() &&
          Math.abs(m.timestamp - newMsg.timestamp) < 4000
      );
      if (isDuplicate) {
        return prev;
      }

      // Phát âm thanh chuông ngọc thanh thoát khi có người gửi tin nhắn mật đàm riêng
      if (newMsg.channel === 'whisper' && newMsg.username !== currentUsername) {
        soundFx.playWhisperPing();
      }

      // Tăng số lượng tin chưa đọc nếu drawer đang đóng
      if (!isChatOpenRef.current) {
        setUnreadChatCount((c) => c + 1);
      }

      return [...prev, newMsg];
    });
  }, [currentUsername]);

  // Multi-channel & Rich Cards Chat message send
  const handleSendMessage = useCallback(async (params: {
    message: string;
    channel: ChatChannel;
    whisperTarget?: string;
    whisperTargetUserId?: string;
    cardType?: ChatCardType;
    cardData?: ChatCardData;
    roomId?: string | null;
  }) => {
    const effectiveRoomId = params.roomId !== undefined 
      ? (params.roomId || undefined) 
      : (params.channel === 'room' ? (currentRoomIdRef.current || undefined) : undefined);

    const msgId = `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const optimisticMsg: ChatMessage = {
      id: msgId,
      username: currentUsername,
      avatar: currentUserAvatar,
      frame: currentUserFrame,
      message: params.message,
      timestamp: Date.now(),
      channel: params.channel,
      roomId: effectiveRoomId,
      sectId: params.channel === 'sect' ? currentSectId : undefined,
      whisperTarget: params.whisperTarget,
      whisperTargetUserId: params.whisperTargetUserId,
      senderUserId: currentUserId,
      senderRealm: currentRealmName,
      senderRealmIcon: currentRealmIcon,
      senderSectTag: currentSectTag,
      cardType: params.cardType,
      cardData: params.cardData,
      isAdmin,
    };

    appendChatMessage(optimisticMsg);

    try {
      await sendChatMessage({
        id: msgId,
        username: currentUsername,
        avatar: currentUserAvatar,
        frame: currentUserFrame,
        message: params.message,
        channel: params.channel,
        roomId: effectiveRoomId,
        sectId: currentSectId,
        whisperTarget: params.whisperTarget,
        whisperTargetUserId: params.whisperTargetUserId,
        senderUserId: currentUserId,
        senderRealm: currentRealmName,
        senderRealmIcon: currentRealmIcon,
        senderSectTag: currentSectTag,
        cardType: params.cardType,
        cardData: params.cardData,
        isAdmin,
      });
    } catch (err) {
      console.error('Failed to send chat message:', err);
    }
  }, [
    currentUsername,
    currentUserAvatar,
    currentUserFrame,
    currentUserId,
    currentRealmName,
    currentRealmIcon,
    currentSectId,
    currentSectTag,
    isAdmin,
    appendChatMessage,
  ]);

  const openWhisperWith = useCallback((targetUsername: string, targetUserId: string) => {
    setWhisperTargetUser({ username: targetUsername, userId: targetUserId });
    setActiveChannel('whisper');
    setIsChatOpen(true);
    setUnreadChatCount(0);
    soundFx.playKeyClick();
  }, []);

  const openChat = useCallback((channel?: ChatChannel) => {
    if (channel) setActiveChannel(channel);
    setIsChatOpen(true);
    setUnreadChatCount(0);
    soundFx.playKeyClick();
  }, []);

  const closeChat = useCallback(() => {
    setIsChatOpen(false);
    soundFx.playKeyClick();
  }, []);

  const toggleChat = useCallback(() => {
    setIsChatOpen((prev) => {
      const next = !prev;
      if (next) setUnreadChatCount(0);
      return next;
    });
    soundFx.playKeyClick();
  }, []);

  return {
    chatMessages,
    setChatMessages,
    isChatOpen,
    setIsChatOpen,
    activeChannel,
    setActiveChannel,
    whisperTargetUser,
    setWhisperTargetUser,
    unreadChatCount,
    setUnreadChatCount,
    appendChatMessage,
    handleSendMessage,
    openWhisperWith,
    openChat,
    closeChat,
    toggleChat,
  };
}
