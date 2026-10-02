// 다국어 문구 (ko, en). 화면 문구와 상태 라벨 매핑은 이 한 곳에서만 (원칙 §3)
import type { TodoStatus } from './api/types';
import { DEFAULT_CATEGORY_NAME } from './constants';
import { useUiStore } from './stores/uiStore';

export type Lang = 'ko' | 'en';
type ErrorLike = { code?: string; message: string };

const ko = {
  language: '언어',
  theme: { toDark: '다크 모드', toLight: '라이트 모드' },
  nav: { todos: '할일', categories: '카테고리', profile: '내 정보', logout: '로그아웃' },
  common: { email: '이메일', password: '비밀번호', name: '이름', save: '저장', cancel: '취소', edit: '수정', delete: '삭제', add: '추가', all: '전체' },
  status: { upcoming: '시작 전', in_progress: '진행중', completed: '완료', overdue: '기한 초과' } as Record<TodoStatus, string>,
  login: { title: '로그인', submit: '로그인', noAccount: '계정이 없나요?', toSignup: '회원가입' },
  signup: { title: '회원가입', submit: '가입하기', hasAccount: '이미 계정이 있나요?', toLogin: '로그인' },
  profile: { title: '내 정보 수정', emailReadonly: '이메일 (수정 불가)', saved: '저장되었습니다.' },
  category: {
    title: '카테고리 관리',
    newPlaceholder: '새 카테고리 이름',
    locked: (name: string) => `('${name}'은 수정·삭제 불가)`,
    confirmDelete: (name: string, defaultName: string) => `'${name}' 카테고리를 삭제할까요? 소속 할일은 '${defaultName}'으로 이동합니다.`,
  },
  list: {
    listTab: '목록',
    calendarTab: '캘린더',
    add: '+ 할일 등록',
    filterCategory: '카테고리',
    filterStatus: '상태',
    empty: '조건에 맞는 할일이 없습니다.',
    confirmDelete: (title: string) => `'${title}' 할일을 삭제할까요?`,
  },
  form: {
    createTitle: '할일 등록',
    editTitle: '할일 수정',
    title: '제목',
    titlePlaceholder: '제목을 입력하세요',
    category: '카테고리',
    noCategory: (defaultName: string) => `선택 안 함 (미지정 시 '${defaultName}')`,
    startDate: '시작일자',
    endDate: '종료일자',
    dateOrder: '종료일자는 시작일자보다 빠를 수 없습니다.',
  },
  calendar: { weekdays: ['일', '월', '화', '수', '목', '금', '토'], prev: '이전 달', next: '다음 달', empty: '이 날짜에 일정이 없습니다.', close: '닫기' },
  // '기본'은 서버 데이터 이름 그대로 표시
  categoryName: (name: string) => name,
  // 서버 메시지가 한국어이므로 그대로 표시
  errorMessage: (e: ErrorLike) => e.message,
};

export type Messages = typeof ko;

// 서버 error.code → 영어 문구 (docs/5-project-principle.md §3)
const EN_ERRORS: Record<string, string> = {
  VALIDATION_ERROR: 'Please check your input.',
  DEFAULT_CATEGORY_PROTECTED: "The 'Default' category can't be edited or deleted.",
  UNAUTHORIZED: 'Please log in.',
  INVALID_CREDENTIALS: 'Incorrect email or password.',
  NOT_FOUND: 'Not found.',
  EMAIL_DUPLICATED: 'This email is already registered.',
  CATEGORY_NAME_DUPLICATED: 'A category with this name already exists.',
  INTERNAL_ERROR: 'A server error occurred.',
};

const en: Messages = {
  language: 'Language',
  theme: { toDark: 'Dark mode', toLight: 'Light mode' },
  nav: { todos: 'Todos', categories: 'Categories', profile: 'Profile', logout: 'Log out' },
  common: { email: 'Email', password: 'Password', name: 'Name', save: 'Save', cancel: 'Cancel', edit: 'Edit', delete: 'Delete', add: 'Add', all: 'All' },
  status: { upcoming: 'Upcoming', in_progress: 'In progress', completed: 'Completed', overdue: 'Overdue' },
  login: { title: 'Log in', submit: 'Log in', noAccount: "Don't have an account?", toSignup: 'Sign up' },
  signup: { title: 'Sign up', submit: 'Sign up', hasAccount: 'Already have an account?', toLogin: 'Log in' },
  profile: { title: 'Edit profile', emailReadonly: 'Email (read-only)', saved: 'Saved.' },
  category: {
    title: 'Categories',
    newPlaceholder: 'New category name',
    locked: (name) => `('${name}' can't be edited or deleted)`,
    confirmDelete: (name, defaultName) => `Delete category '${name}'? Its todos will move to '${defaultName}'.`,
  },
  list: {
    listTab: 'List',
    calendarTab: 'Calendar',
    add: '+ New todo',
    filterCategory: 'Category',
    filterStatus: 'Status',
    empty: 'No todos match the filter.',
    confirmDelete: (title) => `Delete todo '${title}'?`,
  },
  form: {
    createTitle: 'New todo',
    editTitle: 'Edit todo',
    title: 'Title',
    titlePlaceholder: 'Enter a title',
    category: 'Category',
    noCategory: (defaultName) => `None (defaults to '${defaultName}')`,
    startDate: 'Start date',
    endDate: 'End date',
    dateOrder: 'The end date cannot be earlier than the start date.',
  },
  calendar: { weekdays: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], prev: 'Previous month', next: 'Next month', empty: 'No todos on this date.', close: 'Close' },
  categoryName: (name) => (name === DEFAULT_CATEGORY_NAME ? 'Default' : name),
  // 알 수 없는 code(네트워크 오류 등)는 원래 메시지를 그대로 표시
  errorMessage: (e) => (e.code && EN_ERRORS[e.code]) || e.message,
};

export const messages: Record<Lang, Messages> = { ko, en };

export const useT = () => messages[useUiStore((s) => s.lang)];
