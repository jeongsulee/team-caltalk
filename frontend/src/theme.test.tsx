// 다크/라이트 모드 전환
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router';
import App from './App';
import css from './index.css?raw';
import { useUiStore } from './stores/uiStore';

function renderLogin() {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter initialEntries={['/login']}>
        <App />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

// index.css에서 블록 안의 색 토큰 이름 목록
const tokensIn = (block: string) => [...block.matchAll(/(--(?:color|chip)-[\w-]+):/g)].map((m) => m[1]).sort();

beforeEach(() => {
  useUiStore.setState({ lang: 'ko', theme: 'light' });
});
afterEach(cleanup);

describe('theme', () => {
  test('theme 토글하면 light ↔ dark로 바뀌고 localStorage에 저장된다', () => {
    useUiStore.getState().toggleTheme();
    expect(useUiStore.getState().theme).toBe('dark');
    expect(JSON.parse(localStorage.getItem('cal-todo-ui') ?? '{}').state.theme).toBe('dark');
    useUiStore.getState().toggleTheme();
    expect(useUiStore.getState().theme).toBe('light');
  });

  test('theme 로그인 화면의 전환 버튼을 누르면 <html data-theme>과 버튼 라벨이 바뀐다', () => {
    renderLogin();
    expect(document.documentElement.dataset.theme).toBe('light');
    const button = screen.getByRole('button', { name: '다크 모드' });
    expect(button.getAttribute('aria-pressed')).toBe('false');

    fireEvent.click(button);
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(screen.getByRole('button', { name: '라이트 모드' }).getAttribute('aria-pressed')).toBe('true');
  });

  test('theme 영어에서는 버튼 라벨이 영어로 표시된다', () => {
    useUiStore.setState({ lang: 'en', theme: 'dark' });
    renderLogin();
    expect(screen.getByRole('button', { name: 'Light mode' })).toBeTruthy();
  });

  test('theme 다크 블록이 라이트(:root)의 색 토큰을 빠짐없이 다시 정의한다', () => {
    const light = css.match(/:root \{([\s\S]*?)\n\}/)![1];
    const dark = css.match(/:root\[data-theme='dark'\] \{([\s\S]*?)\n\}/)![1];
    expect(tokensIn(light).length).toBeGreaterThan(0);
    expect(tokensIn(dark)).toEqual(tokensIn(light));
  });
});
