// 다크/라이트 모드 전환 버튼. props만 받는 표시 전용
import type { Messages } from '../i18n';
import type { Theme } from '../stores/uiStore';

interface Props {
  theme: Theme;
  t: Messages;
  onToggle: () => void;
}

// 버튼에는 바꿀 대상 모드를 표시한다
export default function ThemeToggle({ theme, t, onToggle }: Props) {
  return (
    <button type="button" className="theme-toggle" aria-pressed={theme === 'dark'} onClick={onToggle}>
      {theme === 'dark' ? t.theme.toLight : t.theme.toDark}
    </button>
  );
}
