import { UserAccount, AuthResponse } from '../types';

export function getApiBase(): string {
  // Always use relative path '' so requests go to the internal Express server directly without CORS or mixed-content issues.
  return '';
}

export const API_BASE = '';

/**
 * Smart fetch helper that routes requests directly to relative endpoints.
 */
export async function smartAuthFetch(endpoint: string, init?: RequestInit): Promise<Response> {
  return await fetch(endpoint, init);
}

async function parseAuthResponse(res: Response, defaultErrMsg: string): Promise<AuthResponse> {
  const text = await res.text();
  try {
    return JSON.parse(text) as AuthResponse;
  } catch {
    if (res.status === 404) {
      return {
        success: false,
        error: 'Máy chủ API không phản hồi (404 Not Found). Vui lòng thử lại sau!',
      };
    }
    if (res.status >= 500) {
      return {
        success: false,
        error: `Máy chủ gặp sự cố (${res.status}). Vui lòng thử lại sau!`,
      };
    }
    return {
      success: false,
      error: text.length > 0 && text.length < 150 ? text : defaultErrMsg,
    };
  }
}

const AUTH_TOKEN_KEY = 'fasttyping_auth_token_v1';
const AUTH_USER_KEY = 'fasttyping_auth_user_v1';

export function getStoredAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return (
      localStorage.getItem(AUTH_TOKEN_KEY) ||
      sessionStorage.getItem('fasttyping_token') ||
      sessionStorage.getItem(AUTH_TOKEN_KEY) ||
      localStorage.getItem('fasttyping_token') ||
      null
    );
  } catch {
    return null;
  }
}

export function setStoredAuthToken(token: string | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (token) {
      localStorage.setItem(AUTH_TOKEN_KEY, token);
      sessionStorage.setItem('fasttyping_token', token);
      sessionStorage.setItem(AUTH_TOKEN_KEY, token);
    } else {
      localStorage.removeItem(AUTH_TOKEN_KEY);
      localStorage.removeItem(AUTH_USER_KEY);
      sessionStorage.removeItem('fasttyping_token');
      sessionStorage.removeItem(AUTH_TOKEN_KEY);
      localStorage.removeItem('fasttyping_token');
    }
  } catch {
    // ignore
  }
}

export function getStoredCachedUser(): UserAccount | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(AUTH_USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setStoredCachedUser(user: UserAccount | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (user) {
      localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(AUTH_USER_KEY);
    }
  } catch {
    // ignore
  }
}

/**
 * Fetch current user from server using stored token
 */
export async function fetchCurrentUser(): Promise<UserAccount | null> {
  const token = getStoredAuthToken();
  if (!token) return null;

  try {
    const res = await smartAuthFetch('/api/auth/me', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    const data = await parseAuthResponse(res, 'Không thể lấy thông tin người dùng');
    if (data.success && data.user) {
      setStoredCachedUser(data.user);
      return data.user;
    } else if (res.status === 401 || res.status === 403) {
      setStoredAuthToken(null);
      setStoredCachedUser(null);
      return null;
    } else {
      return getStoredCachedUser();
    }
  } catch {
    return getStoredCachedUser();
  }
}

/**
 * Sign in / Register with Google credential
 */
export async function loginWithGoogle(credential: string, profileHint?: { email?: string; name?: string; picture?: string }): Promise<AuthResponse> {
  try {
    const res = await smartAuthFetch('/api/auth/google', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ credential, ...profileHint }),
    });
    const data = await parseAuthResponse(res, 'Lỗi kết nối khi đăng nhập Google');
    if (data.success && data.token && data.user) {
      setStoredAuthToken(data.token);
      setStoredCachedUser(data.user);
    }
    return data;
  } catch (err: any) {
    const isFetchErr = err?.name === 'TypeError' || String(err?.message || '').toLowerCase().includes('failed to fetch');
    return {
      success: false,
      error: isFetchErr ? 'Không thể kết nối đến máy chủ. Vui lòng thử lại!' : (err.message || 'Lỗi kết nối khi đăng nhập Google'),
    };
  }
}

/**
 * Register account quickly (1-step, simple & concise: username + password)
 */
export async function registerWithEmail(data: {
  username: string;
  password?: string;
  displayName?: string;
  avatar?: string;
  email?: string;
}): Promise<AuthResponse> {
  try {
    const res = await smartAuthFetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const result = await parseAuthResponse(res, 'Lỗi kết nối khi tạo tài khoản');
    if (result.success && result.token && result.user) {
      setStoredAuthToken(result.token);
      setStoredCachedUser(result.user);
    }
    return result;
  } catch (err: any) {
    const isFetchErr = err?.name === 'TypeError' || String(err?.message || '').toLowerCase().includes('failed to fetch');
    return {
      success: false,
      error: isFetchErr ? 'Không thể kết nối đến máy chủ. Vui lòng thử lại!' : (err.message || 'Lỗi kết nối khi tạo tài khoản'),
    };
  }
}

export const registerAccount = registerWithEmail;

/**
 * Verify real Gmail with 6-digit code (if needed)
 */
export async function verifyEmailCode(email: string, code: string): Promise<AuthResponse> {
  try {
    const res = await smartAuthFetch('/api/auth/verify-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, code }),
    });
    const data = await parseAuthResponse(res, 'Lỗi kết nối khi xác nhận mã');
    if (data.success && data.token && data.user) {
      setStoredAuthToken(data.token);
      setStoredCachedUser(data.user);
    }
    return data;
  } catch (err: any) {
    const isFetchErr = err?.name === 'TypeError' || String(err?.message || '').toLowerCase().includes('failed to fetch');
    return {
      success: false,
      error: isFetchErr ? 'Không thể kết nối đến máy chủ. Vui lòng thử lại!' : (err.message || 'Lỗi kết nối khi xác nhận mã'),
    };
  }
}

/**
 * Resend verification code
 */
export async function resendVerifyCode(email: string): Promise<AuthResponse> {
  try {
    const res = await smartAuthFetch('/api/auth/resend-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    return await parseAuthResponse(res, 'Lỗi kết nối khi gửi lại mã');
  } catch (err: any) {
    const isFetchErr = err?.name === 'TypeError' || String(err?.message || '').toLowerCase().includes('failed to fetch');
    return {
      success: false,
      error: isFetchErr ? 'Không thể kết nối đến máy chủ. Vui lòng thử lại!' : (err.message || 'Lỗi kết nối khi gửi lại mã'),
    };
  }
}

/**
 * Login with username or email and password
 */
export async function loginWithEmail(identifier: string, password?: string): Promise<AuthResponse> {
  try {
    const res = await smartAuthFetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ account: identifier, password }),
    });
    const data = await parseAuthResponse(res, 'Lỗi kết nối khi đăng nhập');
    if (data.success && data.token && data.user) {
      setStoredAuthToken(data.token);
      setStoredCachedUser(data.user);
    }
    return data;
  } catch (err: any) {
    const isFetchErr = err?.name === 'TypeError' || String(err?.message || '').toLowerCase().includes('failed to fetch');
    return {
      success: false,
      error: isFetchErr ? 'Không thể kết nối đến máy chủ. Vui lòng thử lại sau vài giây!' : (err.message || 'Lỗi kết nối khi đăng nhập'),
    };
  }
}

export const loginAccount = loginWithEmail;

/**
 * Update authenticated user's profile (name, avatar, frame)
 */
export async function updateUserProfile(updates: {
  displayName?: string;
  username?: string;
  avatar?: string;
  frame?: string;
  showcaseAchievements?: string[];
  unlockedAchievements?: string[];
  bestWpm?: number;
  bestWpmRecord?: any;
  totalGames?: number;
  totalOnlineSeconds?: number;
  matchHistory?: any[];
  cultivation?: any;
}): Promise<AuthResponse> {
  const token = getStoredAuthToken();
  if (!token) {
    return { success: false, error: 'Chưa đăng nhập' };
  }

  try {
    const res = await smartAuthFetch('/api/auth/profile', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(updates),
    });
    const data = await parseAuthResponse(res, 'Lỗi kết nối khi cập nhật hồ sơ');
    if (data.success && data.user) {
      setStoredCachedUser(data.user);
    }
    return data;
  } catch (err: any) {
    const isFetchErr = err?.name === 'TypeError' || String(err?.message || '').toLowerCase().includes('failed to fetch');
    return {
      success: false,
      error: isFetchErr ? 'Không thể kết nối đến máy chủ. Vui lòng thử lại!' : (err.message || 'Lỗi kết nối khi cập nhật hồ sơ'),
    };
  }
}

/**
 * Change password for authenticated player
 */
export async function changeUserPassword(oldPassword: string, newPassword: string): Promise<{ success: boolean; message?: string; error?: string }> {
  const token = getStoredAuthToken();
  if (!token) {
    return { success: false, error: 'Chưa đăng nhập. Vui lòng đăng nhập lại!' };
  }

  try {
    const res = await smartAuthFetch('/api/auth/change-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ oldPassword, newPassword }),
    });
    const data = await parseAuthResponse(res, 'Lỗi kết nối khi đổi mật khẩu');
    return data;
  } catch (err: any) {
    const isFetchErr = err?.name === 'TypeError' || String(err?.message || '').toLowerCase().includes('failed to fetch');
    return {
      success: false,
      error: isFetchErr ? 'Không thể kết nối đến máy chủ. Vui lòng thử lại!' : (err.message || 'Lỗi kết nối khi đổi mật khẩu'),
    };
  }
}

/**
 * Logout
 */
export async function logoutUser(): Promise<void> {
  const token = getStoredAuthToken();
  if (token) {
    try {
      await smartAuthFetch('/api/auth/logout', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch {
      // ignore
    }
  }
  setStoredAuthToken(null);
  setStoredCachedUser(null);
}
