// /api/auth/*, /api/users/me (FR-01, FR-02)
import { request, saveTokens, clearTokens, hasToken } from './client';
import type { User } from './types';

export const signup = (body: { email: string; password: string; name: string }) =>
  request<User>('POST', '/api/auth/signup', body);

export async function login(body: { email: string; password: string }) {
  const res = await request<{ accessToken: string; refreshToken: string; user: User }>('POST', '/api/auth/login', body);
  saveTokens(res.accessToken, res.refreshToken);
  return res.user;
}

export const logout = clearTokens; // 서버 무상태: 클라이언트 토큰 삭제 (§5)
export const isLoggedIn = hasToken;

export const getMe = () => request<User>('GET', '/api/users/me');
export const updateMe = (body: { name: string }) => request<User>('PATCH', '/api/users/me', body);
