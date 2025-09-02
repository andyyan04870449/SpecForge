import { useState, useEffect } from 'react';
import LoginPage from './LoginPage';
import ProjectListPage from './ProjectListPage';
import SystemAnalysisApp from './SystemAnalysisApp';
import api from '@/services/api';

type AppPage = 'login' | 'projects' | 'analysis';

interface User {
  email: string;
  name: string;
}

export default function MainApp() {
  const [currentPage, setCurrentPage] = useState<AppPage>('login');
  const [user, setUser] = useState<User | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 檢查是否有儲存的登入狀態
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        const authToken = localStorage.getItem('authToken');
        const userData = localStorage.getItem('userData');
        
        if (authToken && userData) {
          // 驗證 token 是否仍然有效
          try {
            const response = await api.getProfile();
            
            if (response.success) {
              const parsedUser = JSON.parse(userData);
              setUser(parsedUser);
              setCurrentPage('projects');
            } else {
              // Token 無效，清除儲存的資料
              localStorage.removeItem('authToken');
              localStorage.removeItem('refreshToken');
              localStorage.removeItem('userData');
            }
          } catch (error) {
            // Token 過期或無效（API 會在 401 時自動清除）
            console.log('Token 驗證失敗，保持在登入頁面');
          }
        }
      } catch (error) {
        console.error('檢查認證狀態失敗:', error);
        // 網路錯誤時不清除 token，但保持在登入頁面
      } finally {
        setIsLoading(false);
      }
    };

    checkAuthStatus();

    // 監聽自定義登出事件
    const handleAuthLogout = (event: any) => {
      console.log('收到登出事件:', event.detail);
      handleLogout();
    };

    window.addEventListener('auth:logout', handleAuthLogout);
    
    return () => {
      window.removeEventListener('auth:logout', handleAuthLogout);
    };
  }, []);

  const handleLogin = (userData: User) => {
    setUser(userData);
    setCurrentPage('projects');
  };

  const handleLogout = () => {
    // 清除本地儲存的認證資料
    localStorage.removeItem('authToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('userData');
    
    setUser(null);
    setSelectedProjectId(null);
    setCurrentPage('login');
  };

  const handleSelectProject = (projectId: string) => {
    setSelectedProjectId(projectId);
    setCurrentPage('analysis');
  };

  const handleBackToProjects = () => {
    setSelectedProjectId(null);
    setCurrentPage('projects');
  };

  // 顯示載入畫面
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">檢查登入狀態中...</p>
        </div>
      </div>
    );
  }

  // 根據當前頁面渲染不同組件
  if (currentPage === 'login') {
    return <LoginPage onLogin={handleLogin} />;
  }

  if (currentPage === 'projects') {
    return (
      <ProjectListPage
        user={user!}
        onSelectProject={handleSelectProject}
        onLogout={handleLogout}
      />
    );
  }

  if (currentPage === 'analysis') {
    return (
      <SystemAnalysisApp
        projectId={selectedProjectId!}
        user={user!}
        onBackToProjects={handleBackToProjects}
        onLogout={handleLogout}
      />
    );
  }

  return null;
}