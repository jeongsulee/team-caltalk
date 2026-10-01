// 할일 행 (WF-04, 스타일 가이드 §6.7). props만 받는 표시 전용 (원칙 2.2)
import { Link } from 'react-router';
import type { Todo } from '../api/types';
import type { Messages } from '../i18n';

interface Props {
  todo: Todo;
  categoryName: string;
  t: Messages;
  onToggle: (isCompleted: boolean) => void;
  onDelete: () => void;
}

export default function TodoItem({ todo, categoryName, t, onToggle, onDelete }: Props) {
  return (
    <li className="todo-row">
      {/* BR-12: 완료 토글, 해제하면 되돌림 */}
      <input type="checkbox" className="checkbox" checked={todo.isCompleted} onChange={(e) => onToggle(e.target.checked)} />
      <span className="todo-row__title">{todo.title}</span>
      <span className="todo-row__meta">{categoryName}</span>
      <span className="todo-row__meta">{todo.startDate} ~ {todo.endDate}</span>
      {/* 상태는 서버가 계산한 값을 그대로 표시 (원칙 1-4) */}
      <span className={`chip chip--${todo.status}`}>{t.status[todo.status]}</span>
      <Link className="btn btn--text" to={`/todos/${todo.id}/edit`}>{t.common.edit}</Link>
      <button className="btn btn--danger" type="button" onClick={onDelete}>{t.common.delete}</button>
    </li>
  );
}
