import { UserAccount, AuthResponse } from '../types';

const AUTH_TOKEN_KEY = 'fasttyping_auth_token_v1';
const AUTH_USER_KEY = 'fasttyping_auth_user_v1';

export function getStoredAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(AUTH_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setStoredAuthToken(token: string | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (token) {
      localStorage.setItem(AUTH_TOKEN_KEY, token);
    } else {
      localStorage.removeItem(AUTH_TOKEN_KEY);
      localStorage.removeItem(AUTH_USER_KEY);
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
    const res = await fetch('/api/auth/me', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    const data: AuthResponse = await res.json();
    if (data.success && data.user) {
      setStoredCachedUser(data.user);
      return data.user;
    } else {
      setStoredAuthToken(null);
      return null;
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
    const res = await fetch('/api/auth/google', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ credential, ...profileHint }),
    });
    const data: AuthResponse = await res.json();
    if (data.success && data.token && data.user) {
      setStoredAuthToken(data.token);
      setStoredCachedUser(data.user);
    }
    return data;
  } catch (err: any) {
    return { success: false, error: err.message || 'Lỗi kết nối khi đăng nhập Google' };
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
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const result: AuthResponse = await res.json();
    if (result.success && result.token && result.user) {
      setStoredAuthToken(result.token);
      setStoredCachedUser(result.user);
    }
    return result;
  } catch (err: any) {
    return { success: false, error: err.message || 'Lỗi kết nối khi tạo tài khoản' };
  }
}

export const registerAccount = registerWithEmail;

/**
 * Verify real Gmail with 6-digit code (if needed)
 */
export async function verifyEmailCode(email: string, code: string): Promise<AuthResponse> {
  try {
    const res = await fetch('/api/auth/verify-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, code }),
    });
    const data: AuthResponse = await res.json();
    if (data.success && data.token && data.user) {
      setStoredAuthToken(data.token);
      setStoredCachedUser(data.user);
    }
    return data;
  } catch (err: any) {
    return { success: false, error: err.message || 'Lỗi kết nối khi xác nhận mã' };
  }
}

/**
 * Resend verification code
 */
export async function resendVerifyCode(email: string): Promise<AuthResponse> {
  try {
    const res = await fetch('/api/auth/resend-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, error: err.message || 'Lỗi kết nối khi gửi lại mã' };
  }
}

/**
 * Login with username or email and password
 */
export async function loginWithEmail(identifier: string, password?: string): Promise<AuthResponse> {
  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ account: identifier, password }),
    });
    const data: AuthResponse = await res.json();
    if (data.success && data.token && data.user) {
      setStoredAuthToken(data.token);
      setStoredCachedUser(data.user);
    }
    return data;
  } catch (err: any) {
    return { success: false, error: err.message || 'Lỗi kết nối khi đăng nhập' };
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
  matchHistory?: any[];
  cultivation?: any;
}): Promise<AuthResponse> {
  const token = getStoredAuthToken();
  if (!token) {
    return { success: false, error: 'Chưa đăng nhập' };
  }

  try {
    const res = await fetch('/api/auth/profile', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(updates),
    });
    const data: AuthResponse = await res.json();
    if (data.success && data.user) {
      setStoredCachedUser(data.user);
    }
    return data;
  } catch (err: any) {
    return { success: false, error: err.message || 'Lỗi kết nối khi cập nhật hồ sơ' };
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
    const res = await fetch('/api/auth/change-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ oldPassword, newPassword }),
    });
    const data = await res.json();
    return data;
  } catch (err: any) {
    return { success: false, error: err.message || 'Lỗi kết nối khi đổi mật khẩu' };
  }
}

/**
 * Logout
 */
export async function logoutUser(): Promise<void> {
  const token = getStoredAuthToken();
  if (token) {
    try {
      await fetch('/api/auth/logout', {
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
