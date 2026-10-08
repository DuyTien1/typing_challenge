/**
 * Real-time Admin Event Synchronization
 * Handles instant inter-tab and server-client sync for administrative actions:
 * - Rewards (Linh Thạch, Tu Vi, Đan Dược)
 * - Cảnh Giới / Cấp Độ (Set Level / Realm / Tier)
 * - Avatar Frames (Ban thưởng Khung Đại Diện)
 * - Ban / Unban (Bàn Cổ Thần Phạt / Hóa Giải)
 * - Admin Role (Cấp / Bỏ Quyền Quản Trị)
 * - Password Reset Notice
 */

export interface AdminSyncEvent {
  type:
    | 'cultivation_reward_received'
    | 'cultivation_level_updated'
    | 'frame_updated'
    | 'user_banned'
    | 'user_unbanned'
    | 'admin_role_updated'
    | 'password_reset_notice'
    | 'admin_reward_notification';
  userId?: string;
  username?: string;
  displayName?: string;
  cultivation?: any;
  reward?: any;
  level?: number;
  realmIndex?: number;
  tier?: number;
  realmName?: string;
  frame?: string;
  isBanned?: boolean;
  reason?: string;
  bannedUntil?: number;
  remainingMinutes?: number;
  durationMs?: number;
  isAdmin?: boolean;
  message?: string;
  title?: string;
  timestamp?: number;
}

export const adminBroadcastChannel =
  typeof window !== 'undefined' && 'BroadcastChannel' in window
    ? new BroadcastChannel('fasttyping_admin_sync_events')
    : null;

/**
 * Dispatches an admin sync event locally to window CustomEvents
 * and across browser tabs via BroadcastChannel.
 */
export function broadcastAdminEvent(event: AdminSyncEvent) {
  if (typeof window === 'undefined') return;

  const enrichedEvent: AdminSyncEvent = {
    ...event,
    timestamp: event.timestamp || Date.now(),
  };

  // 1. Dispatch custom event on current window
  try {
    window.dispatchEvent(new CustomEvent(enrichedEvent.type, { detail: enrichedEvent }));
    if (enrichedEvent.message) {
      window.dispatchEvent(
        new CustomEvent('admin_reward_notification', {
          detail: {
            title: enrichedEvent.title || 'THÔNG BÁO QUẢN TRỊ',
            message: enrichedEvent.message,
            timestamp: enrichedEvent.timestamp,
          },
        })
      );
    }
  } catch (err) {
    console.warn('[AdminSync] Error dispatching window event:', err);
  }

  // 2. Broadcast across tabs in the same browser
  if (adminBroadcastChannel) {
    try {
      adminBroadcastChannel.postMessage(enrichedEvent);
    } catch (err) {
      console.warn('[AdminSync] Error posting to BroadcastChannel:', err);
    }
  }
}

/**
 * Listen for events from other tabs and propagate them to window CustomEvents.
 */
if (adminBroadcastChannel) {
  adminBroadcastChannel.onmessage = (e) => {
    const data = e.data as AdminSyncEvent;
    if (!data || !data.type) return;

    if (typeof window !== 'undefined') {
      try {
        window.dispatchEvent(new CustomEvent(data.type, { detail: data }));
        if (data.message) {
          window.dispatchEvent(
            new CustomEvent('admin_reward_notification', {
              detail: {
                title: data.title || 'THÔNG BÁO QUẢN TRỊ',
                message: data.message,
                timestamp: data.timestamp || Date.now(),
              },
            })
          );
        }
      } catch (err) {
        console.warn('[AdminSync] Error in inter-tab onmessage:', err);
      }
    }
  };
}
