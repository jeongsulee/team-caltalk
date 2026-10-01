// BR-04 오류 표시(E-03), BR-05 초기값 (FE-14). 서버 호출은 훅을 대체해 mutate 호출 여부로 확인한다
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { useUiStore } from '../stores/uiStore';
import TodoFormPage, { getInitialDates } from './TodoFormPage';

const createMutate = vi.fn();
vi.mock('../hooks/useTodos', () => ({
  useCreateTodo: () => ({ mutate: createMutate, error: null, isPending: false }),
  useUpdateTodo: () => ({ mutate: vi.fn(), error: null, isPending: false }),
  useTodo: () => ({ data: undefined, error: null }),
}));
vi.mock('../hooks/useCategories', () => ({
  useCategories: () => ({ data: [], error: null }),
}));

function renderNewForm() {
  render(
    <MemoryRouter initialEntries={['/todos/new']}>
      <Routes>
        <Route path="/todos/new" element={<TodoFormPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

const input = (label: string) => screen.getByLabelText(label) as HTMLInputElement;

function fillAndSubmit(startDate: string, endDate: string) {
  fireEvent.change(input('제목'), { target: { value: '보고서 작성' } });
  fireEvent.change(input('시작일자'), { target: { value: startDate } });
  fireEvent.change(input('종료일자'), { target: { value: endDate } });
  fireEvent.click(screen.getByRole('button', { name: '저장' }));
}

beforeEach(() => {
  createMutate.mockClear();
  useUiStore.getState().setLang('ko'); // jsdom 기본 언어(en-US)와 무관하게 한국어 문구로 검증
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('TodoFormPage', () => {
  test('E-03 BR-04 종료일자 < 시작일자로 제출하면 오류 문구가 표시되고 등록 API가 호출되지 않는다', () => {
    renderNewForm();
    fillAndSubmit('2026-10-10', '2026-10-09');
    expect(screen.getByText('종료일자는 시작일자보다 빠를 수 없습니다.')).toBeTruthy();
    expect(createMutate).not.toHaveBeenCalled();
  });

  test('E-03 BR-04 같은 날짜로 제출하면 등록 API가 호출된다 (카테고리 미선택 시 categoryId 없음, BR-03)', () => {
    renderNewForm();
    fillAndSubmit('2026-10-10', '2026-10-10');
    expect(screen.queryByText('종료일자는 시작일자보다 빠를 수 없습니다.')).toBeNull();
    expect(createMutate).toHaveBeenCalledTimes(1);
    expect(createMutate.mock.calls[0][0]).toEqual({ title: '보고서 작성', startDate: '2026-10-10', endDate: '2026-10-10' });
  });

  test('BR-05 고정된 오늘(KST) 기준 초기 시작일자는 오늘+7일, 초기 종료일자는 시작일자와 같다', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-01T03:00:00Z')); // KST 2026-10-01 12:00
    renderNewForm();
    expect(input('시작일자').value).toBe('2026-10-08');
    expect(input('종료일자').value).toBe('2026-10-08');
  });

  test('BR-05 getInitialDates는 KST 날짜 경계를 따른다 (UTC 15:00 = KST 다음날 00:00)', () => {
    expect(getInitialDates(new Date('2026-09-30T14:59:59Z'))).toEqual({ startDate: '2026-10-07', endDate: '2026-10-07' });
    expect(getInitialDates(new Date('2026-09-30T15:00:00Z'))).toEqual({ startDate: '2026-10-08', endDate: '2026-10-08' });
  });

  test('i18n 영어로 전환하면 라벨과 BR-04 오류 문구가 영어로 표시되고 등록 API는 호출되지 않는다', () => {
    useUiStore.getState().setLang('en');
    renderNewForm();
    expect(screen.getByRole('heading', { name: 'New todo' })).toBeTruthy();
    fireEvent.change(input('Title'), { target: { value: 'Report' } });
    fireEvent.change(input('Start date'), { target: { value: '2026-10-10' } });
    fireEvent.change(input('End date'), { target: { value: '2026-10-09' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(screen.getByText('The end date cannot be earlier than the start date.')).toBeTruthy();
    expect(createMutate).not.toHaveBeenCalled();
  });
});
