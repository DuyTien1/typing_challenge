/**
 * Tiện ích kiểm tra & xác thực kết nối Cơ sở dữ liệu Supabase PostgreSQL trên Client
 * Hỗ trợ xác thực trạng thái trên Vercel Serverless Function hoặc Local Node
 */

export interface DatabaseHealthData {
  configured: boolean;
  connected: boolean;
  type: string;
  provider?: string;
  latencyMs?: number;
  tablesVerified?: boolean;
  databaseUrlConfigured?: boolean;
  serverless?: boolean;
  error?: string;
}

export interface HealthCheckResponse {
  status: 'healthy' | 'degraded' | 'unhealthy' | 'unconfigured' | 'ok';
  database: DatabaseHealthData;
  message?: string;
  activeRooms?: number;
  registeredUsers?: number;
  timestamp: number;
}

/**
 * Gọi API kiểm tra sức khỏe và độ trễ kết nối tới CSDL Supabase
 */
export async function checkDatabaseHealth(timeoutMs = 6000): Promise<HealthCheckResponse> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch('/api/db-health', {
      signal: controller.signal,
      headers: { 'Accept': 'application/json' },
      cache: 'no-store',
    });

    clearTimeout(timeoutId);

    if (res.ok || res.status === 503) {
      const data: HealthCheckResponse = await res.json();
      return data;
    }

    // Dự phòng gọi endpoint /api/health nếu /api/db-health không khả dụng
    const fallbackRes = await fetch('/api/health', {
      headers: { 'Accept': 'application/json' },
      cache: 'no-store',
    });
    if (fallbackRes.ok) {
      const fallbackData = await fallbackRes.json();
      return {
        status: fallbackData.database?.connected ? 'healthy' : 'unhealthy',
        database: fallbackData.database || { configured: false, connected: false, type: 'unknown' },
        activeRooms: fallbackData.activeRooms,
        registeredUsers: fallbackData.registeredUsers,
        timestamp: fallbackData.timestamp || Date.now(),
      };
    }

    throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  } catch (err: any) {
    clearTimeout(timeoutId);
    return {
      status: 'unhealthy',
      database: {
        configured: false,
        connected: false,
        type: 'error',
        error: err.name === 'AbortError' ? 'Quá thời gian kết nối (Timeout)' : (err.message || 'Lỗi mạng'),
      },
      message: 'Không thể kết nối tới máy chủ backend Vercel.',
      timestamp: Date.now(),
    };
  }
}

/**
 * Định dạng nhãn và màu sắc hiển thị cho trạng thái CSDL
 */
export function getDbStatusBadge(data?: DatabaseHealthData | null): {
  label: string;
  colorClass: string;
  badgeBg: string;
  iconColor: string;
} {
  if (!data) {
    return {
      label: 'Đang kiểm tra...',
      colorClass: 'text-amber-400',
      badgeBg: 'bg-amber-500/10 border-amber-500/30',
      iconColor: 'text-amber-400',
    };
  }

  if (data.connected) {
    return {
      label: 'Supabase PostgreSQL (Online)',
      colorClass: 'text-emerald-400',
      badgeBg: 'bg-emerald-500/10 border-emerald-500/30',
      iconColor: 'text-emerald-400',
    };
  }

  if (data.configured) {
    return {
      label: 'Lỗi Kết Nối Supabase',
      colorClass: 'text-rose-400',
      badgeBg: 'bg-rose-500/10 border-rose-500/30',
      iconColor: 'text-rose-400',
    };
  }

  return {
    label: 'Chưa Cấu Hình DATABASE_URL',
    colorClass: 'text-amber-400',
    badgeBg: 'bg-amber-500/10 border-amber-500/30',
    iconColor: 'text-amber-400',
  };
}
