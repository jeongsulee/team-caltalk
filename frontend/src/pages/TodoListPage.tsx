// WF-04 목록 탭 / WF-05 캘린더 탭 전환 (FR-04~06, BR-02, BR-08, BR-12, S-06, S-07)
import { Link } from 'react-router';
import TodoFilters from '../components/TodoFilters';
import TodoItem from '../components/TodoItem';
import { useCategories } from '../hooks/useCategories';
import { useDeleteTodo, useTodos, useUpdateTodo } from '../hooks/useTodos';
import { useT } from '../i18n';
import { useUiStore } from '../stores/uiStore';
import TodoCalendarView from './TodoCalendarView';

export default function TodoListPage() {
  const tab = useUiStore((s) => s.tab);
  const setTab = useUiStore((s) => s.setTab);
  const t = useT();

  return (
    <section>
      <div className="toolbar">
        <div className="tabs">
          <button type="button" className={tab === 'list' ? 'tab tab--active' : 'tab'} onClick={() => setTab('list')}>{t.list.listTab}</button>
          <button type="button" className={tab === 'calendar' ? 'tab tab--active' : 'tab'} onClick={() => setTab('calendar')}>{t.list.calendarTab}</button>
        </div>
        <Link className="btn btn--primary" to="/todos/new">{t.list.add}</Link>
      </div>
      {tab === 'list' ? <TodoList /> : <TodoCalendarView />}
    </section>
  );
}

function TodoList() {
  const { categoryId, status, setCategoryId, setStatus } = useUiStore();
  // 필터 값은 쿼리 키·요청 파라미터로 서버에 전달 (FR-07)
  const todos = useTodos({ categoryId: categoryId ?? undefined, status: status ?? undefined });
  const categories = useCategories();
  const update = useUpdateTodo();
  const remove = useDeleteTodo();
  const t = useT();

  const categoryName = (id: number) => t.categoryName(categories.data?.find((c) => c.id === id)?.name ?? '');

  function handleDelete(id: number, title: string) {
    // 삭제 확인 1회 (§5)
    if (window.confirm(t.list.confirmDelete(title))) remove.mutate(id);
  }

  const error = todos.error ?? categories.error ?? update.error ?? remove.error;

  return (
    <>
      <TodoFilters categories={categories.data ?? []} categoryId={categoryId} status={status} t={t}
        onCategoryChange={setCategoryId} onStatusChange={setStatus} />
      {error && <p className="form__alert">{t.errorMessage(error)}</p>}
      {todos.data?.length === 0 && <p className="empty">{t.list.empty}</p>}
      <ul className="list">
        {todos.data?.map((todo) => (
          <TodoItem key={todo.id} todo={todo} categoryName={categoryName(todo.categoryId)} t={t}
            onToggle={(isCompleted) => update.mutate({ id: todo.id, patch: { isCompleted } })}
            onDelete={() => handleDelete(todo.id, todo.title)} />
        ))}
      </ul>
    </>
  );
}
