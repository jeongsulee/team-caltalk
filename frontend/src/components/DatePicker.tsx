// 날짜 선택: 브라우저 기본 <input type="date"> (BR-06, 별도 라이브러리 없음)
interface Props {
  value: string; // YYYY-MM-DD
  onChange: (value: string) => void;
  invalid?: boolean;
}

export default function DatePicker({ value, onChange, invalid }: Props) {
  return (
    <input className={invalid ? 'input input--error' : 'input'} type="date" required
      value={value} onChange={(e) => onChange(e.target.value)} />
  );
}
