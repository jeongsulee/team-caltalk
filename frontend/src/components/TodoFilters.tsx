// 카테고리·상태 필터 (FR-07, 스타일 가이드 §6.6). props만 받는 표시 전용, 필터링은 서버가 한다
import type { Category, TodoStatus } from '../api/types';
import type { Messages } from '../i18n';

interface Props {
  categories: Category[];
  categoryId: number | null;
  status: TodoStatus | null;
  t: Messages;
  onCategoryChange: (categoryId: number | null) => void;
  onStatusChange: (status: TodoStatus | null) => void; // 단일 값, 다시 선택하면 대체 (E-08)
}

export default function TodoFilters({ categories, categoryId, status, t, onCategoryChange, onStatusChange }: Props) {
  return (
    <div className="filters">
      <label className="field">
        <span className="field__label">{t.list.filterCategory}</span>
        <select className={categoryId === null ? 'input' : 'input input--active'} value={categoryId ?? ''}
          onChange={(e) => onCategoryChange(e.target.value ? Number(e.target.value) : null)}>
          <option value="">{t.common.all}</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{t.categoryName(c.name)}</option>)}
        </select>
      </label>
      <label className="field">
        <span className="field__label">{t.list.filterStatus}</span>
        <select className={status === null ? 'input' : 'input input--active'} value={status ?? ''}
          onChange={(e) => onStatusChange((e.target.value || null) as TodoStatus | null)}>
          <option value="">{t.common.all}</option>
          {Object.entries(t.status).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </label>
    </div>
  );
}
