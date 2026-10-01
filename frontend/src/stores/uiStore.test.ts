// E-08 상태 필터 대체 규칙 (FE-14)
import { describe, expect, test } from 'vitest';
import { useUiStore } from './uiStore';

describe('uiStore', () => {
  test('E-08 상태 필터를 연속 선택하면 마지막 값 하나만 남는다', () => {
    useUiStore.getState().setStatus('overdue');
    useUiStore.getState().setStatus('completed');
    expect(useUiStore.getState().status).toBe('completed');
  });

  test('E-08 상태 필터를 전체(null)로 되돌릴 수 있다', () => {
    useUiStore.getState().setStatus('in_progress');
    useUiStore.getState().setStatus(null);
    expect(useUiStore.getState().status).toBeNull();
  });
});
