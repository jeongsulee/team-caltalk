// 상태 판단 (BE-04, BR-08). 날짜는 'YYYY-MM-DD' 문자열 비교
const TODO_STATUSES = ['upcoming', 'in_progress', 'completed', 'overdue'];

function getTodayKst(now = new Date()) {
  return new Date(now.getTime() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

function getTodoStatus({ startDate, endDate, isCompleted }, today) {
  if (isCompleted) return 'completed';
  if (endDate < today) return 'overdue';
  if (startDate > today) return 'upcoming';
  return 'in_progress';
}

module.exports = { getTodayKst, getTodoStatus, TODO_STATUSES };
