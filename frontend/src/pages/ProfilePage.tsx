// WF-03 내 정보 수정 (FR-02, BR-01, S-03). 수정 항목은 이름만 (§5)
import { useState, type FormEvent } from 'react';
import { useMe, useUpdateMe } from '../hooks/useAuth';
import { useT } from '../i18n';

export default function ProfilePage() {
  const me = useMe();
  const updateMe = useUpdateMe();
  const t = useT();
  const [name, setName] = useState<string | null>(null); // null: 서버 값 그대로

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    // 빈 이름도 서버로 보내 서버 오류 메시지를 표시한다
    updateMe.mutate({ name: name ?? me.data?.name ?? '' }, { onSuccess: () => setName(null) });
  }

  function handleCancel() {
    setName(null);
    updateMe.reset();
  }

  if (me.error) return <p className="form__alert">{t.errorMessage(me.error)}</p>;
  if (!me.data) return null;

  return (
    <section className="form-page">
      <form className="form" onSubmit={handleSubmit}>
        <h1 className="form__title">{t.profile.title}</h1>
        <div className="field">
          <span className="field__label">{t.profile.emailReadonly}</span>
          <span>{me.data.email}</span>
        </div>
        <label className="field">
          <span className="field__label">{t.common.name}</span>
          <input className={updateMe.error ? 'input input--error' : 'input'} maxLength={100}
            value={name ?? me.data.name} onChange={(e) => setName(e.target.value)} />
        </label>
        {updateMe.error && <p className="form__alert">{t.errorMessage(updateMe.error)}</p>}
        {updateMe.isSuccess && <p className="form__notice">{t.profile.saved}</p>}
        <div className="form__actions">
          <button className="btn btn--secondary" type="button" onClick={handleCancel}>{t.common.cancel}</button>
          <button className="btn btn--primary" type="submit" disabled={updateMe.isPending}>{t.common.save}</button>
        </div>
      </form>
    </section>
  );
}
