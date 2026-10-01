// 언어 선택 (ko/en). props만 받는 표시 전용
import type { Lang } from '../i18n';

interface Props {
  value: Lang;
  label: string;
  onChange: (lang: Lang) => void;
}

export default function LanguageSelect({ value, label, onChange }: Props) {
  return (
    <select className="lang-select" aria-label={label} value={value} onChange={(e) => onChange(e.target.value as Lang)}>
      <option value="ko">한국어</option>
      <option value="en">English</option>
    </select>
  );
}
