// REST 응답 타입 (원칙 2.3: 타입 공유 패키지 없이 직접 정의, backend/swagger.yaml 기준)
export type TodoStatus = 'upcoming' | 'in_progress' | 'completed' | 'overdue';

export interface User {
  id: number;
  email: string;
  name: string;
}

export interface Category {
  id: number;
  name: string;
}

export interface Todo {
  id: number;
  title: string;
  categoryId: number;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  isCompleted: boolean;
  status: TodoStatus;
}
