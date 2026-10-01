// 라우트 정의, 보호 라우트 (BR-01). 각 화면 Task가 자기 라우트를 여기에 등록한다
import { useEffect } from 'react';
import { Routes, Route, Navigate, Outlet } from 'react-router';
import Header from './components/Header';
import CategoryPage from './pages/CategoryPage';
import LoginPage from './pages/LoginPage';
import ProfilePage from './pages/ProfilePage';
import SignupPage from './pages/SignupPage';
import TodoFormPage from './pages/TodoFormPage';
import TodoListPage from './pages/TodoListPage';
import { useIsLoggedIn } from './hooks/useAuth';
import { useUiStore } from './stores/uiStore';

// 토큰이 없으면 /login (BR-01, E-02)
function ProtectedLayout() {
  if (!useIsLoggedIn()) return <Navigate to="/login" replace />;
  return (
    <>
      <Header />
      <main className="page">
        <Outlet />
      </main>
    </>
  );
}

export default function App() {
  const lang = useUiStore((s) => s.lang);
  const theme = useUiStore((s) => s.theme);
  // 현재 언어·테마를 <html lang>, <html data-theme>에 반영 (다크 토큰은 index.css)
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  return (
    <Routes>
      {/* 공개 경로 */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route element={<ProtectedLayout />}>
        <Route path="/" element={<TodoListPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/categories" element={<CategoryPage />} />
        <Route path="/todos/new" element={<TodoFormPage />} />
        <Route path="/todos/:id/edit" element={<TodoFormPage />} />
        {/* 미등록 경로도 보호 (화면은 각 Task에서 등록) */}
        <Route path="*" element={null} />
      </Route>
    </Routes>
  );
}
