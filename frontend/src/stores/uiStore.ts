// UI 상태만 (원칙 2.2): 활성 탭, 필터 선택값, 캘린더 현재 월, 언어, 테마. 서버 데이터는 담지 않는다
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { TodoStatus } from '../api/types';
import type { Lang } from '../i18n';

// 캘린더 초기 월 (표시용, KST 기준 'YYYY-MM')
const currentMonthKst = () =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit' }).format(new Date());

// 저장된 언어가 없으면 브라우저 언어 (한국어가 아니면 영어)
const browserLang = (): Lang => (navigator.language.startsWith('ko') ? 'ko' : 'en');

export type Theme = 'light' | 'dark';
// 저장된 테마가 없으면 OS 설정 (matchMedia가 없는 환경은 라이트)
const systemTheme = (): Theme => (window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');

interface UiState {
  tab: 'list' | 'calendar';
  categoryId: number | null; // null: 전체
  status: TodoStatus | null; // 단일 값, 다시 선택하면 대체 (E-08)
  month: string; // 'YYYY-MM'
  lang: Lang;
  theme: Theme;
  setTab: (tab: UiState['tab']) => void;
  setCategoryId: (categoryId: number | null) => void;
  setStatus: (status: TodoStatus | null) => void;
  setMonth: (month: string) => void;
  setLang: (lang: Lang) => void;
  toggleTheme: () => void;
}

export const useUiStore = create<UiState>()(
  persist(
    (set, get) => ({
      tab: 'list',
      categoryId: null,
      status: null,
      month: currentMonthKst(),
      lang: browserLang(),
      theme: systemTheme(),
      setTab: (tab) => set({ tab }),
      setCategoryId: (categoryId) => set({ categoryId }),
      setStatus: (status) => set({ status }),
      setMonth: (month) => set({ month }),
      setLang: (lang) => set({ lang }),
      toggleTheme: () => set({ theme: get().theme === 'dark' ? 'light' : 'dark' }),
    }),
    // 언어·테마만 새로고침 후에도 유지 (localStorage)
    { name: 'cal-todo-ui', partialize: (s) => ({ lang: s.lang, theme: s.theme }) },
  ),
);
