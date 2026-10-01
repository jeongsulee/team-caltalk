// WF-05 캘린더 탭 (FR-06, BR-02, S-07). 필터 없는 목록을 월 그리드에 배치, 클릭 동작 없음 (§5)
import type { Todo } from '../api/types';
import { useTodos } from '../hooks/useTodos';
import { useT } from '../i18n';
import { useUiStore } from '../stores/uiStore';

const MAX_CHIPS = 3; // 넘치면 +N (스타일 가이드 §6.8)

// 날짜는 'YYYY-MM-DD' 문자열로만 다룬다 (원칙 1-7)
const toDate = (d: string) => new Date(d + 'T00:00:00Z');
const fmt = (d: Date) => d.toISOString().slice(0, 10);
const addDays = (d: string, n: number) => {
  const x = toDate(d);
  x.setUTCDate(x.getUTCDate() + n);
  return fmt(x);
};
const shiftMonth = (month: string, delta: number) => {
  const [y, m] = month.split('-').map(Number);
  return fmt(new Date(Date.UTC(y, m - 1 + delta, 1))).slice(0, 7);
};
// 오늘 강조 표시 전용 (스타일 가이드 §6.8, 상태 판단에는 쓰지 않는다)
const todayKst = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(new Date());

// 1일이 속한 주의 일요일 ~ 말일이 속한 주의 토요일
function monthDays(month: string) {
  const [y, m] = month.split('-').map(Number);
  const first = `${month}-01`;
  const last = fmt(new Date(Date.UTC(y, m, 0)));
  const start = addDays(first, -toDate(first).getUTCDay());
  const end = addDays(last, 6 - toDate(last).getUTCDay());
  const days: string[] = [];
  for (let d = start; d <= end; d = addDays(d, 1)) days.push(d);
  return days;
}

export default function TodoCalendarView() {
  const month = useUiStore((s) => s.month);
  const setMonth = useUiStore((s) => s.setMonth);
  const todos = useTodos(); // 캘린더는 필터를 적용하지 않는다 (§5)
  const t = useT();
  const today = todayKst();
  const [y, m] = month.split('-');

  // 시작~종료 각 날짜 셀에 표시 (§5)
  const todosOn = (day: string) => (todos.data ?? []).filter((todo: Todo) => todo.startDate <= day && day <= todo.endDate);

  return (
    <div className="calendar">
      {todos.error && <p className="form__alert">{t.errorMessage(todos.error)}</p>}
      <div className="calendar__head">
        <button type="button" className="btn btn--text" onClick={() => setMonth(shiftMonth(month, -1))} aria-label={t.calendar.prev}>‹</button>
        <h2 className="calendar__title">{y}. {m}.</h2>
        <button type="button" className="btn btn--text" onClick={() => setMonth(shiftMonth(month, 1))} aria-label={t.calendar.next}>›</button>
      </div>
      <div className="calendar__grid">
        {t.calendar.weekdays.map((w, i) => (
          <div key={w} className={`calendar__weekday calendar__weekday--${i}`}>{w}</div>
        ))}
        {monthDays(month).map((day) => {
          const dayTodos = todosOn(day);
          const cls = ['calendar__cell', `calendar__cell--${toDate(day).getUTCDay()}`];
          if (!day.startsWith(month)) cls.push('calendar__cell--other');
          if (day === today) cls.push('calendar__cell--today');
          return (
            <div key={day} className={cls.join(' ')} data-date={day}>
              <span className="calendar__date">{Number(day.slice(8))}</span>
              {dayTodos.slice(0, MAX_CHIPS).map((todo) => (
                <span key={todo.id} className={`chip chip--${todo.status} calendar__chip`}>{todo.title}</span>
              ))}
              {dayTodos.length > MAX_CHIPS && <span className="calendar__more">+{dayTodos.length - MAX_CHIPS}</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
