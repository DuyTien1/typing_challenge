import { useState, useCallback, useRef, useEffect } from 'react';
import { ChatMessage, ChatChannel, ChatCardType, ChatCardData } from '../types';
import { soundFx } from '../utils/audio';
import { sendChatMessage, fetchChatMessages } from '../utils/roomManager';

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

  const currentSectIdRef = useRef(currentSectId);
  currentSectIdRef.current = currentSectId;

  const activeChannelRef = useRef(activeChannel);
  activeChannelRef.current = activeChannel;

  const whisperTargetUserRef = useRef(whisperTargetUser);
  whisperTargetUserRef.current = whisperTargetUser;

  // Deduplication helper to prevent double chat in all channels (Global, Room, Sect, Whisper)
  const appendChatMessage = useCallback((newMsg: ChatMessage) => {
    if (!newMsg || !newMsg.message) return;
    setChatMessages((prev) => {
      // 1. Direct ID deduplication
      if (newMsg.id && prev.some((m) => m.id === newMsg.id)) {
        return prev;
      }
      // 2. Strict content deduplication: same user, channel, message within 2.5 seconds window
      const isDuplicate = prev.some(
        (m) =>
          m.username === newMsg.username &&
          m.channel === newMsg.channel &&
          m.message.trim() === newMsg.message.trim() &&
          Math.abs(m.timestamp - newMsg.timestamp) < 2500
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

  // Fetch messages from server for specific channel
  const fetchChannelMessages = useCallback(async (
    channel: ChatChannel,
    targetUser?: { username: string; userId: string } | null
  ) => {
    try {
      const effTarget = targetUser !== undefined ? targetUser : whisperTargetUserRef.current;
      const msgs = await fetchChatMessages({
        channel,
        roomId: currentRoomIdRef.current || undefined,
        sectId: currentSectIdRef.current || undefined,
        currentUserId,
        targetUserId: effTarget?.userId,
        currentUsername,
        targetUsername: effTarget?.username,
      });

      if (Array.isArray(msgs) && msgs.length > 0) {
        msgs.forEach((m) => appendChatMessage(m));
      }
    } catch {
      // Ignore
    }
  }, [currentUserId, currentUsername, appendChatMessage]);

  // Auto fetch channel messages when channel or targets change, or when drawer opens
  useEffect(() => {
    fetchChannelMessages(activeChannel, whisperTargetUser);
  }, [activeChannel, whisperTargetUser, currentRoomId, currentSectId, isChatOpen, fetchChannelMessages]);

  // Periodic polling interval while chat drawer is open to guarantee 100% realtime sync
  useEffect(() => {
    const timer = setInterval(() => {
      if (isChatOpenRef.current) {
        fetchChannelMessages(activeChannelRef.current);
        if (activeChannelRef.current !== 'global') {
          fetchChannelMessages('global');
        }
      }
    }, 2500);

    return () => clearInterval(timer);
  }, [fetchChannelMessages]);

  // Listen to window chat events (such as room chat received from subscribeToRoom)
  useEffect(() => {
    const handleWindowChat = (e: any) => {
      const msg = e?.detail;
      if (msg) appendChatMessage(msg);
    };

    window.addEventListener('room_chat_received', handleWindowChat);
    window.addEventListener('new_chat_message', handleWindowChat);
    return () => {
      window.removeEventListener('room_chat_received', handleWindowChat);
      window.removeEventListener('new_chat_message', handleWindowChat);
    };
  }, [appendChatMessage]);

  // Real-time friend event notification messages in chat
  const handleFriendRequestReceived = useCallback((fromUser: any, message?: string) => {
    if (!fromUser) return;
    const msgId = `fr-sys-${Date.now()}-${fromUser.id || fromUser.username}`;
    const name = fromUser.displayName || fromUser.username || 'Đạo Hữu';
    const notifMsg: ChatMessage = {
      id: msgId,
      username: 'Hệ Thống Đạo Hữu',
      avatar: '💌',
      frame: 'admin_gold',
      message: `Đạo hữu "${name}" đã gửi lời mời kết bái đạo hữu: "${message || 'Kết bái đạo hữu, cùng đàm đạo gõ phím!'}"`,
      timestamp: Date.now(),
      channel: 'global',
      isSystem: true,
      cardType: 'friend_request',
      cardData: {
        friendUser: fromUser,
        friendMessage: message,
        friendStatus: 'pending',
      },
    };
    appendChatMessage(notifMsg);
  }, [appendChatMessage]);

  const handleFriendRequestAccepted = useCallback((friendName: string, targetUserId?: string) => {
    if (!friendName) return;
    const msgId = `fa-sys-${Date.now()}-${friendName}`;
    const notifMsg: ChatMessage = {
      id: msgId,
      username: 'Hệ Thống Đạo Hữu',
      avatar: '✨',
      frame: 'admin_gold',
      message: `Chúc mừng đạo hữu và "${friendName}" đã chính thức kết bái thành công! Giờ đây hai vị có thể Mật Đàm riêng tư.`,
      timestamp: Date.now(),
      channel: 'global',
      isSystem: true,
      cardType: 'friend_accepted',
      cardData: {
        friendName,
        friendUserId: targetUserId,
        friendStatus: 'accepted',
      },
    };
    appendChatMessage(notifMsg);
  }, [appendChatMessage]);

  // Listen to window real-time friend events across all SSE/WebSocket/BroadcastChannel streams
  useEffect(() => {
    const onReceived = (e: any) => {
      const detail = e?.detail;
      if (detail && detail.fromUser) {
        handleFriendRequestReceived(detail.fromUser, detail.message);
      }
    };

    const onAccepted = (e: any) => {
      const detail = e?.detail;
      if (detail && (detail.friendName || detail.fromName)) {
        handleFriendRequestAccepted(detail.friendName || detail.fromName, detail.fromUserId || detail.targetUserId);
      }
    };

    window.addEventListener('friend_request_received', onReceived);
    window.addEventListener('friend_request_accepted', onAccepted);
    return () => {
      window.removeEventListener('friend_request_received', onReceived);
      window.removeEventListener('friend_request_accepted', onAccepted);
    };
  }, [handleFriendRequestReceived, handleFriendRequestAccepted]);

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
      const serverMsg = await sendChatMessage({
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

      if (serverMsg) {
        appendChatMessage(serverMsg);
      }
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
    const targetObj = { username: targetUsername, userId: targetUserId };
    setWhisperTargetUser(targetObj);
    setActiveChannel('whisper');
    setIsChatOpen(true);
    setUnreadChatCount(0);
    soundFx.playKeyClick();
    fetchChannelMessages('whisper', targetObj);
  }, [fetchChannelMessages]);

  const openChat = useCallback((channel?: ChatChannel) => {
    if (channel) {
      setActiveChannel(channel);
      fetchChannelMessages(channel);
    }
    setIsChatOpen(true);
    setUnreadChatCount(0);
    soundFx.playKeyClick();
  }, [fetchChannelMessages]);

  const closeChat = useCallback(() => {
    setIsChatOpen(false);
    soundFx.playKeyClick();
  }, []);

  const toggleChat = useCallback(() => {
    setIsChatOpen((prev) => {
      const next = !prev;
      if (next) {
        setUnreadChatCount(0);
        fetchChannelMessages(activeChannelRef.current);
      }
      return next;
    });
    soundFx.playKeyClick();
  }, [fetchChannelMessages]);

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
    handleFriendRequestReceived,
    handleFriendRequestAccepted,
    fetchChannelMessages,
    openWhisperWith,
    openChat,
    closeChat,
    toggleChat,
  };
}
