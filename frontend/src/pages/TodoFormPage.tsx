// WF-06 할일 등록·수정 (FR-03, FR-04, BR-02~BR-06, S-04, S-05, E-03~E-05). 완료 처리는 이 화면에 두지 않는다 (§5)
import { useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router';
import type { Todo } from '../api/types';
import DatePicker from '../components/DatePicker';
import { DEFAULT_CATEGORY_NAME } from '../constants';
import { useCategories } from '../hooks/useCategories';
import { useCreateTodo, useTodo, useUpdateTodo } from '../hooks/useTodos';
import { useT } from '../i18n';

// BR-05: 시작일자 = KST 오늘 + 7일, 종료일자 = 시작일자
export function getInitialDates(now = new Date()) {
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  kst.setUTCDate(kst.getUTCDate() + 7);
  const date = kst.toISOString().slice(0, 10);
  return { startDate: date, endDate: date };
}

export default function TodoFormPage() {
  const { id } = useParams();
  return id ? <EditTodo id={Number(id)} /> : <TodoForm />;
}

function EditTodo({ id }: { id: number }) {
  const todo = useTodo(id);
  const t = useT();
  // E-05: 타인 할일이면 서버 거부(404) 메시지만 표시하고 폼을 그리지 않는다
  if (todo.error) return <p className="form__alert">{t.errorMessage(todo.error)}</p>;
  if (!todo.data) return null;
  return <TodoForm todo={todo.data} />;
}

function TodoForm({ todo }: { todo?: Todo }) {
  const navigate = useNavigate();
  const categories = useCategories();
  const create = useCreateTodo();
  const update = useUpdateTodo();
  const t = useT();
  const initial = todo ?? getInitialDates();
  const [title, setTitle] = useState(todo?.title ?? '');
  const [categoryId, setCategoryId] = useState(todo ? String(todo.categoryId) : '');
  const [startDate, setStartDate] = useState(initial.startDate);
  const [endDate, setEndDate] = useState(initial.endDate);
  const [dateError, setDateError] = useState(false);

  const mutation = todo ? update : create;

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    // BR-04 사전 검증 (UX용, 최종 판단은 서버)
    if (endDate < startDate) {
      setDateError(true);
      return;
    }
    setDateError(false);
    // 카테고리 미선택 시 categoryId를 보내지 않는다 (BR-03)
    const body = { title, startDate, endDate, ...(categoryId ? { categoryId: Number(categoryId) } : {}) };
    const onSuccess = () => navigate('/');
    if (todo) update.mutate({ id: todo.id, patch: body }, { onSuccess });
    else create.mutate(body, { onSuccess });
  }

  return (
    <section className="form-page">
      <form className="form" onSubmit={handleSubmit}>
        <h1 className="form__title">{todo ? t.form.editTitle : t.form.createTitle}</h1>
        <label className="field">
          <span className="field__label">{t.form.title}</span>
          <input className="input" required maxLength={200} placeholder={t.form.titlePlaceholder}
            value={title} onChange={(e) => setTitle(e.target.value)} />
        </label>
        <label className="field">
          <span className="field__label">{t.form.category}</span>
          <select className="input" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            <option value="">{t.form.noCategory(t.categoryName(DEFAULT_CATEGORY_NAME))}</option>
            {categories.data?.map((c) => <option key={c.id} value={c.id}>{t.categoryName(c.name)}</option>)}
          </select>
        </label>
        <label className="field">
          <span className="field__label">{t.form.startDate}</span>
          <DatePicker value={startDate} onChange={setStartDate} invalid={dateError} />
        </label>
        <label className="field">
          <span className="field__label">{t.form.endDate}</span>
          <DatePicker value={endDate} onChange={setEndDate} invalid={dateError} />
          {dateError && <span className="field__error">{t.form.dateOrder}</span>}
        </label>
        {mutation.error && <p className="form__alert">{t.errorMessage(mutation.error)}</p>}
        {categories.error && <p className="form__alert">{t.errorMessage(categories.error)}</p>}
        <div className="form__actions">
          <button className="btn btn--secondary" type="button" onClick={() => navigate(-1)}>{t.common.cancel}</button>
          <button className="btn btn--primary" type="submit" disabled={mutation.isPending}>{t.common.save}</button>
        </div>
      </form>
    </section>
  );
}
