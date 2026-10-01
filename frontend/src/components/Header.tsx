// 공통 헤더 (WF-03~07, 스타일 가이드 §5.1)
import { NavLink } from 'react-router';
import { useLogout } from '../hooks/useAuth';
import { useT } from '../i18n';
import { useUiStore } from '../stores/uiStore';
import LanguageSelect from './LanguageSelect';
import ThemeToggle from './ThemeToggle';

export default function Header() {
  const logout = useLogout();
  const t = useT();
  const lang = useUiStore((s) => s.lang);
  const setLang = useUiStore((s) => s.setLang);
  const theme = useUiStore((s) => s.theme);
  const toggleTheme = useUiStore((s) => s.toggleTheme);
  return (
    <header className="header">
      <span className="header__brand">cal-todo</span>
      <nav className="header__nav">
        <NavLink to="/" end>{t.nav.todos}</NavLink>
        <NavLink to="/categories">{t.nav.categories}</NavLink>
        <NavLink to="/profile">{t.nav.profile}</NavLink>
      </nav>
      <div className="header__right">
        <ThemeToggle theme={theme} t={t} onToggle={toggleTheme} />
        <LanguageSelect value={lang} label={t.language} onChange={setLang} />
        <button type="button" className="header__logout" onClick={logout}>{t.nav.logout}</button>
      </div>
    </header>
  );
}
