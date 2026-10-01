// WF-02 로그인 (FR-01, BR-01, S-02, E-02)
import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router';
import LanguageSelect from '../components/LanguageSelect';
import ThemeToggle from '../components/ThemeToggle';
import { useLogin } from '../hooks/useAuth';
import { useT } from '../i18n';
import { useUiStore } from '../stores/uiStore';

export default function LoginPage() {
  const navigate = useNavigate();
  const login = useLogin();
  const t = useT();
  const { lang, setLang, theme, toggleTheme } = useUiStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    // 토큰 저장은 authApi → client.ts에서 처리
    login.mutate({ email, password }, { onSuccess: () => navigate('/', { replace: true }) });
  }

  return (
    <main className="form-page">
      <div className="form-page__lang">
        <ThemeToggle theme={theme} t={t} onToggle={toggleTheme} />
        <LanguageSelect value={lang} label={t.language} onChange={setLang} />
      </div>
      <form className="form" onSubmit={handleSubmit}>
        <h1 className="form__title">{t.login.title}</h1>
        <label className="field">
          <span className="field__label">{t.common.email}</span>
          <input className="input" type="email" required value={email}
            onChange={(e) => setEmail(e.target.value)} placeholder="user@example.com" />
        </label>
        <label className="field">
          <span className="field__label">{t.common.password}</span>
          <input className="input" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
        {/* 이메일·비밀번호 구분 없는 안내 (E-02) */}
        {login.error && <p className="form__alert">{t.errorMessage(login.error)}</p>}
        <button className="btn btn--primary" type="submit" disabled={login.isPending}>{t.login.submit}</button>
        <p className="form__footer">
          {t.login.noAccount} <Link to="/signup">{t.login.toSignup}</Link>
        </p>
      </form>
    </main>
  );
}
