// fetch 래퍼: 토큰 첨부·재발급·로그인 이동 (FE-02, BR-01, E-02). localStorage 토큰 접근은 이 파일에서만
const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '';
const ACCESS_KEY = 'accessToken';
const REFRESH_KEY = 'refreshToken';

export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
  }
}

export function saveTokens(accessToken: string, refreshToken?: string) {
  localStorage.setItem(ACCESS_KEY, accessToken);
  if (refreshToken) localStorage.setItem(REFRESH_KEY, refreshToken);
}

export function clearTokens() {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
}

export const hasToken = () => localStorage.getItem(ACCESS_KEY) !== null;

function send(method: string, path: string, body?: unknown) {
  const headers: Record<string, string> = {};
  const token = localStorage.getItem(ACCESS_KEY);
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  return fetch(BASE_URL + path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
}

async function toApiError(res: Response) {
  const data = await res.json().catch(() => null);
  return new ApiError(res.status, data?.error?.code ?? 'UNKNOWN', data?.error?.message ?? '요청을 처리하지 못했습니다.');
}

async function refreshAccessToken() {
  const res = await send('POST', '/api/auth/refresh', { refreshToken: localStorage.getItem(REFRESH_KEY) ?? '' });
  if (!res.ok) return false;
  saveTokens((await res.json()).accessToken);
  return true;
}

export async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  try {
    let res = await send(method, path, body);
    // 로그인·가입·재발급은 재발급 루프에서 제외
    if (res.status === 401 && !path.startsWith('/api/auth/')) {
      if (await refreshAccessToken()) {
        res = await send(method, path, body);
      } else {
        clearTokens();
        window.location.assign('/login'); // BR-01: Refresh Token도 무효
      }
    }
    if (!res.ok) throw await toApiError(res);
    return (res.status === 204 ? undefined : await res.json()) as T;
  } catch (err) {
    if (import.meta.env.DEV) console.error(err); // 운영에서는 로그를 남기지 않는다
    throw err;
  }
}
