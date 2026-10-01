// WF-01 회원가입 (FR-01, BR-01, BR-07, S-01, E-01)
import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router';
import LanguageSelect from '../components/LanguageSelect';
import ThemeToggle from '../components/ThemeToggle';
import { useSignup } from '../hooks/useAuth';
import { useT } from '../i18n';
import { useUiStore } from '../stores/uiStore';

export default function SignupPage() {
  const navigate = useNavigate();
  const signup = useSignup();
  const t = useT();
  const { lang, setLang, theme, toggleTheme } = useUiStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');

  const error = signup.error as { code?: string; message: string } | null;
  const emailError = error?.code === 'EMAIL_DUPLICATED' ? t.errorMessage(error) : null; // BR-07

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    // 가입 후 자동 로그인 안 함 (§5): 로그인 화면으로 이동
    signup.mutate({ email, password, name }, { onSuccess: () => navigate('/login') });
  }

  return (
    <main className="form-page">
      <div className="form-page__lang">
        <ThemeToggle theme={theme} t={t} onToggle={toggleTheme} />
        <LanguageSelect value={lang} label={t.language} onChange={setLang} />
      </div>
      <form className="form" onSubmit={handleSubmit}>
        <h1 className="form__title">{t.signup.title}</h1>
        {error && !emailError && <p className="form__alert">{t.errorMessage(error)}</p>}
        <label className="field">
          <span className="field__label">{t.common.email}</span>
          <input className={emailError ? 'input input--error' : 'input'} type="email" required
            value={email} onChange={(e) => setEmail(e.target.value)} placeholder="user@example.com" />
          {emailError && <span className="field__error">{emailError}</span>}
        </label>
        <label className="field">
          <span className="field__label">{t.common.password}</span>
          {/* 비밀번호 정책 검사 없음 (범위 제외) */}
          <input className="input" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
        <label className="field">
          <span className="field__label">{t.common.name}</span>
          <input className="input" required maxLength={100} value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <button className="btn btn--primary" type="submit" disabled={signup.isPending}>{t.signup.submit}</button>
        <p className="form__footer">
          {t.signup.hasAccount} <Link to="/login">{t.signup.toLogin}</Link>
        </p>
      </form>
    </main>
  );
}
