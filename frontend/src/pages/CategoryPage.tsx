// WF-07 카테고리 관리 (FR-08, BR-09~BR-11, S-09, E-09, E-10)
import { useState, type FormEvent } from 'react';
import { DEFAULT_CATEGORY_NAME } from '../constants';
import { useCategories, useCreateCategory, useDeleteCategory, useRenameCategory } from '../hooks/useCategories';
import { useT } from '../i18n';

export default function CategoryPage() {
  const categories = useCategories();
  const create = useCreateCategory();
  const rename = useRenameCategory();
  const remove = useDeleteCategory();
  const t = useT();
  const [newName, setNewName] = useState('');
  const [editing, setEditing] = useState<{ id: number; name: string } | null>(null);

  function handleCreate(e: FormEvent) {
    e.preventDefault();
    // 빈 이름·중복 이름은 서버가 판단하고 메시지를 내려준다 (BR-11)
    create.mutate(newName, { onSuccess: () => setNewName('') });
  }

  function handleRename(e: FormEvent) {
    e.preventDefault();
    if (!editing) return;
    rename.mutate(editing, { onSuccess: () => setEditing(null) });
  }

  function startEdit(id: number, name: string) {
    rename.reset();
    setEditing({ id, name });
  }

  function handleDelete(id: number, name: string) {
    // 삭제 확인 1회 (§5). 소속 할일은 '기본'으로 이동 (BR-09)
    if (window.confirm(t.category.confirmDelete(name, t.categoryName(DEFAULT_CATEGORY_NAME)))) {
      remove.mutate(id);
    }
  }

  const error = categories.error ?? remove.error;

  return (
    <section>
      <h1 className="page__title">{t.category.title}</h1>
      <form className="inline-form" onSubmit={handleCreate}>
        <input className={create.error ? 'input input--error' : 'input'} maxLength={100} placeholder={t.category.newPlaceholder}
          value={newName} onChange={(e) => setNewName(e.target.value)} />
        <button className="btn btn--secondary" type="submit" disabled={create.isPending}>{t.common.add}</button>
      </form>
      {create.error && <p className="form__alert">{t.errorMessage(create.error)}</p>}
      {error && <p className="form__alert">{t.errorMessage(error)}</p>}

      <ul className="list">
        {categories.data?.map((c) =>
          editing?.id === c.id ? (
            <li key={c.id} className="list-row">
              <form className="inline-form" onSubmit={handleRename}>
                <input className={rename.error ? 'input input--error' : 'input'} maxLength={100} autoFocus
                  value={editing.name} onChange={(e) => setEditing({ id: c.id, name: e.target.value })} />
                <button className="btn btn--primary" type="submit" disabled={rename.isPending}>{t.common.save}</button>
                <button className="btn btn--secondary" type="button" onClick={() => setEditing(null)}>{t.common.cancel}</button>
              </form>
              {rename.error && <span className="field__error">{t.errorMessage(rename.error)}</span>}
            </li>
          ) : (
            <li key={c.id} className="list-row">
              <span className="list-row__title">{t.categoryName(c.name)}</span>
              {c.name === DEFAULT_CATEGORY_NAME ? (
                // BR-10: '기본'은 수정·삭제 버튼을 렌더링하지 않는다
                <span className="list-row__meta">{t.category.locked(t.categoryName(c.name))}</span>
              ) : (
                <>
                  <button className="btn btn--text" type="button" onClick={() => startEdit(c.id, c.name)}>{t.common.edit}</button>
                  <button className="btn btn--danger" type="button" onClick={() => handleDelete(c.id, c.name)}
                    disabled={remove.isPending}>{t.common.delete}</button>
                </>
              )}
            </li>
          ),
        )}
      </ul>
    </section>
  );
}
