// BE-04 상태 판단 함수·KST 오늘 (순수 단위 테스트: 고정 today 주입 허용)
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { getTodayKst, getTodoStatus, TODO_STATUSES } = require('../src/services/todoStatus');

const TODAY = '2026-10-07';
// TODAY 기준 n일 뒤 'YYYY-MM-DD'
const d = (n) => {
  const dt = new Date(TODAY + 'T00:00:00Z');
  dt.setUTCDate(dt.getUTCDate() + n);
  return dt.toISOString().slice(0, 10);
};
const status = (s, e, isCompleted) => getTodoStatus({ startDate: d(s), endDate: d(e), isCompleted }, TODAY);

test('BE-04 TODO_STATUSES는 4개 상태 값이다', () => {
  assert.deepEqual([...TODO_STATUSES].sort(), ['completed', 'in_progress', 'overdue', 'upcoming']);
});

test('BE-04 E-06 시작일=오늘 미완료 → in_progress', () => assert.equal(status(0, 2, false), 'in_progress'));
test('BE-04 E-06 종료일=오늘 미완료 → in_progress', () => assert.equal(status(-2, 0, false), 'in_progress'));
test('BE-04 E-06 종료일=어제 미완료 → overdue', () => assert.equal(status(-3, -1, false), 'overdue'));
test('BE-04 E-06 종료일=어제 완료 → completed', () => assert.equal(status(-3, -1, true), 'completed'));
test('BE-04 E-06 시작일>오늘 미완료 → upcoming', () => assert.equal(status(1, 3, false), 'upcoming'));

// 도메인 §3 경계 예시 (시작=종료=경계일인 단일일 할일로 확인)
test('BE-04 도메인§3 경계: 시작일자=오늘 미완료 → in_progress', () => assert.equal(status(0, 0, false), 'in_progress'));
test('BE-04 도메인§3 경계: 종료일자=오늘 미완료 → in_progress', () => assert.equal(status(-1, 0, false), 'in_progress'));
test('BE-04 도메인§3 경계: 종료일자=어제 미완료 → overdue', () => assert.equal(status(-1, -1, false), 'overdue'));
test('BE-04 도메인§3 경계: 종료일자=어제 완료 → completed', () => assert.equal(status(-1, -1, true), 'completed'));

test('BE-04 E-06 TODO-A1~A6 조건이 upcoming, in_progress, in_progress, overdue, completed, in_progress', () => {
  // seed.js의 TODOS 표와 같은 오프셋
  const cases = [
    ['TODO-A1', 3, 5, false, 'upcoming'],
    ['TODO-A2', 0, 2, false, 'in_progress'],
    ['TODO-A3', -2, 0, false, 'in_progress'],
    ['TODO-A4', -5, -1, false, 'overdue'],
    ['TODO-A5', -5, -1, true, 'completed'],
    ['TODO-A6', 0, 0, false, 'in_progress'],
  ];
  for (const [label, s, e, done, expected] of cases) {
    assert.equal(status(s, e, done), expected, label);
  }
});

test('BE-04 BR-08 KST 경계: 2026-09-30T15:00:00Z → 2026-10-01', () => {
  assert.equal(getTodayKst(new Date('2026-09-30T15:00:00Z')), '2026-10-01');
});

test('BE-04 BR-08 KST 경계: 2026-09-30T14:59:59Z → 2026-09-30', () => {
  assert.equal(getTodayKst(new Date('2026-09-30T14:59:59Z')), '2026-09-30');
});

test('BE-04 getTodayKst() 인자 없이 호출하면 YYYY-MM-DD 문자열', () => {
  assert.match(getTodayKst(), /^\d{4}-\d{2}-\d{2}$/);
});
