
import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { User, AuthState } from './types';
import LoginPage from './components/Auth/LoginPage';
import RegisterPage from './components/Auth/RegisterPage';
import Dashboard from './components/Dashboard/Dashboard';
import AdminDashboard from './components/Dashboard/AdminDashboard';
import FormEditor from './components/Form/FormEditor';
import PrintPreview from './components/Print/PrintPreview';
import AssetManager from './components/Admin/AssetManager';
import UserManager from './components/Admin/UserManager';

const App: React.FC = () => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isAuthenticated: false
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedSession = localStorage.getItem('kewpa9_session');
    if (savedSession) {
      setAuthState({
        user: JSON.parse(savedSession),
        isAuthenticated: true
      });
    }
    setLoading(false);
  }, []);

  const handleLogin = (user: User) => {
    setAuthState({ user, isAuthenticated: true });
    localStorage.setItem('kewpa9_session', JSON.stringify(user));
  };

  const handleLogout = () => {
    setAuthState({ user: null, isAuthenticated: false });
    localStorage.removeItem('kewpa9_session');
  };

  if (loading) return <div className="h-screen flex items-center justify-center">Memuatkan...</div>;

  return (
    <HashRouter>
      <div className="min-h-screen">
        <Routes>
          <Route 
            path="/login" 
            element={!authState.isAuthenticated ? <LoginPage onLogin={handleLogin} /> : <Navigate to="/" />} 
          />
          <Route 
            path="/register" 
            element={!authState.isAuthenticated ? <RegisterPage /> : <Navigate to="/" />} 
          />
          
          <Route 
            path="/" 
            element={authState.isAuthenticated ? (
              authState.user?.isAdmin ? (
                <AdminDashboard user={authState.user!} onLogout={handleLogout} />
              ) : (
                <Dashboard user={authState.user!} onLogout={handleLogout} />
              )
            ) : <Navigate to="/login" />} 
          />

          <Route 
            path="/admin/assets" 
            element={authState.isAuthenticated && authState.user?.isAdmin ? (
              <AssetManager />
            ) : <Navigate to="/login" />} 
          />

          <Route 
            path="/admin/users" 
            element={authState.isAuthenticated && authState.user?.isAdmin ? (
              <UserManager />
            ) : <Navigate to="/login" />} 
          />

          <Route 
            path="/form/new" 
            element={authState.isAuthenticated ? (
              <FormEditor user={authState.user!} />
            ) : <Navigate to="/login" />} 
          />

          <Route 
            path="/form/edit/:id" 
            element={authState.isAuthenticated ? (
              <FormEditor user={authState.user!} />
            ) : <Navigate to="/login" />} 
          />

          <Route 
            path="/form/print/:id" 
            element={authState.isAuthenticated ? (
              <PrintPreview />
            ) : <Navigate to="/login" />} 
          />
        </Routes>
      </div>
    </HashRouter>
  );
};

export default App;
