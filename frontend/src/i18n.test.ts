// 다국어 사전·서버 오류 번역·언어 유지
import { describe, expect, test } from 'vitest';
import { messages } from './i18n';
import { useUiStore } from './stores/uiStore';

// 함수·배열을 포함한 사전의 키 경로 목록
const keyPaths = (obj: object, prefix = ''): string[] =>
  Object.entries(obj).flatMap(([k, v]) =>
    v && typeof v === 'object' && !Array.isArray(v) ? keyPaths(v, `${prefix}${k}.`) : [`${prefix}${k}`]);

describe('i18n', () => {
  test('i18n ko와 en 사전의 키 구조가 같다', () => {
    expect(keyPaths(messages.en).sort()).toEqual(keyPaths(messages.ko).sort());
    expect(messages.en.calendar.weekdays).toHaveLength(7);
  });

  test('i18n 상태 라벨 4개가 두 언어 모두 있다 (원칙 1-4: 서버 status 코드를 라벨로만 변환)', () => {
    expect(messages.ko.status).toEqual({ upcoming: '시작 전', in_progress: '진행중', completed: '완료', overdue: '기한 초과' });
    expect(messages.en.status).toEqual({ upcoming: 'Upcoming', in_progress: 'In progress', completed: 'Completed', overdue: 'Overdue' });
  });

  test('i18n E-02 영어에서는 서버 error.code를 영어 문구로 바꾼다', () => {
    const err = { code: 'INVALID_CREDENTIALS', message: '이메일 또는 비밀번호가 올바르지 않습니다.' };
    expect(messages.en.errorMessage(err)).toBe('Incorrect email or password.');
    expect(messages.en.errorMessage({ code: 'EMAIL_DUPLICATED', message: '이미 가입된 이메일입니다.' })).toBe('This email is already registered.');
  });

  test('i18n 한국어는 서버 메시지 그대로, 알 수 없는 code·네트워크 오류는 두 언어 모두 원래 메시지', () => {
    const err = { code: 'VALIDATION_ERROR', message: '이름은 1~100자여야 합니다.' };
    expect(messages.ko.errorMessage(err)).toBe('이름은 1~100자여야 합니다.');
    expect(messages.en.errorMessage({ code: 'UNKNOWN', message: 'raw' })).toBe('raw');
    expect(messages.en.errorMessage(new TypeError('Failed to fetch'))).toBe('Failed to fetch');
  });

  test("i18n BR-10 '기본' 카테고리는 영어에서 Default로 표시하고 다른 이름은 그대로", () => {
    expect(messages.en.categoryName('기본')).toBe('Default');
    expect(messages.en.categoryName('업무')).toBe('업무');
    expect(messages.ko.categoryName('기본')).toBe('기본');
  });

  test('i18n 선택한 언어는 localStorage에 저장되어 새로고침 후에도 유지되고, 필터는 저장하지 않는다', () => {
    useUiStore.getState().setStatus('overdue');
    useUiStore.getState().setLang('en');
    const saved = JSON.parse(localStorage.getItem('cal-todo-ui') ?? '{}');
    expect(saved.state.lang).toBe('en');
    expect(Object.keys(saved.state).sort()).toEqual(['lang', 'theme']); // 필터 등 다른 UI 상태는 저장하지 않는다
  });
});
