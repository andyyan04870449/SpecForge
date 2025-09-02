import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Avatar, AvatarFallback } from './ui/avatar';
import CreateProjectDialog from './CreateProjectDialog';
import { Plus, Search, FolderOpen, Clock, LogOut, Calendar, Star } from 'lucide-react';
import apiService, { Project, CreateProjectRequest } from '../services/api';

interface ProjectWithUI extends Project {
  starred: boolean;
}

interface ProjectListPageProps {
  user: { email: string; name: string };
  onSelectProject: (projectId: string) => void;
  onLogout: () => void;
}

export default function ProjectListPage({ user, onSelectProject, onLogout }: ProjectListPageProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [projects, setProjects] = useState<ProjectWithUI[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [newProject, setNewProject] = useState({
    name: '',
    description: '',
    status: 'IN_PROGRESS' as Project['status']
  });


  // 載入專案列表
  const loadProjects = async () => {
    try {
      setLoading(true);
      setError(null); // 清除之前的錯誤
      
      const response = await apiService.getProjects({ 
        search: searchQuery,
        limit: 100 
      });
      
      // 將 API 資料轉換為 UI 所需格式，並加入星號狀態
      const projectsWithUI: ProjectWithUI[] = response.data.map(project => ({
        ...project,
        starred: localStorage.getItem(`project_starred_${project.id}`) === 'true'
      }));
      
      setProjects(projectsWithUI);
    } catch (error: any) {
      console.error('載入專案列表失敗:', error);
      
      // 設置錯誤訊息
      if (error.response?.status === 401) {
        setError('認證已過期，請重新登入');
      } else if (error.response?.status === 403) {
        setError('無權限存取專案列表');
      } else if (error.code === 'ECONNREFUSED' || error.message?.includes('Network Error')) {
        setError('無法連接到伺服器，請檢查網路連線');
      } else {
        setError(error.response?.data?.error?.message || error.message || '載入專案列表失敗');
      }
    } finally {
      setLoading(false);
    }
  };

  // 組件載入時獲取專案
  useEffect(() => {
    loadProjects();
  }, []);

  // 搜尋延遲處理
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      loadProjects();
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  // 搜尋功能由 API 處理，所以這裡直接使用 projects
  const filteredProjects = projects;

  const handleCreateProject = async () => {
    if (!newProject.name.trim()) return;

    try {
      setLoading(true);
      const createData: CreateProjectRequest = {
        name: newProject.name.trim(),
        description: newProject.description.trim() || undefined,
      };

      const response = await apiService.createProject(createData);
      
      // 重置表單並關閉對話框
      setNewProject({
        name: '',
        description: '',
        status: 'IN_PROGRESS'
      });
      setIsCreateDialogOpen(false);
      
      // 重新載入專案列表
      await loadProjects();
      
      // 進入新建的專案
      onSelectProject(response.data.id);
    } catch (error) {
      console.error('建立專案失敗:', error);
      // TODO: 顯示錯誤訊息給使用者
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: Project['status']) => {
    switch (status) {
      case 'PLANNING':
        return <Badge variant="outline" className="bg-gray-100 text-gray-800">規劃中</Badge>;
      case 'IN_PROGRESS':
        return <Badge variant="default" className="bg-green-100 text-green-800">進行中</Badge>;
      case 'REVIEW':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">審核中</Badge>;
      case 'COMPLETED':
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800">已完成</Badge>;
      default:
        return null;
    }
  };

  const toggleStar = (projectId: string) => {
    setProjects(prev =>
      prev.map(project => {
        if (project.id === projectId) {
          const newStarred = !project.starred;
          // 保存到 localStorage
          localStorage.setItem(`project_starred_${projectId}`, newStarred.toString());
          return { ...project, starred: newStarred };
        }
        return project;
      })
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 頂部導航 */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <FolderOpen className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-gray-900">系統分析工具</h1>
                <p className="text-sm text-gray-500">專案管理</p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Avatar className="w-8 h-8">
                  <AvatarFallback>
                    {user.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden sm:block">
                  <p className="text-sm font-medium text-gray-900">{user.name}</p>
                  <p className="text-xs text-gray-500">{user.email}</p>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={onLogout}>
                <LogOut className="w-4 h-4 mr-2" />
                登出
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* 主要內容 */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 標題和操作區 */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">我的專案</h2>
            <p className="text-gray-600 mt-1">管理您的系統分析專案</p>
          </div>
          <CreateProjectDialog
            isOpen={isCreateDialogOpen}
            onOpenChange={setIsCreateDialogOpen}
            newProject={newProject}
            onProjectChange={setNewProject}
            onCreateProject={handleCreateProject}
            disabled={loading}
          >
            <Button className="mt-4 sm:mt-0">
              <Plus className="w-4 h-4 mr-2" />
              新增專案
            </Button>
          </CreateProjectDialog>
        </div>

        {/* 搜索欄 */}
        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
            <Input
              placeholder="搜尋專案..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* 錯誤訊息 */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center">
              <div className="text-red-600 text-sm font-medium">
                {error}
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="ml-auto text-red-600 hover:text-red-700"
                onClick={() => setError(null)}
              >
                ✕
              </Button>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="mt-2 text-red-600 border-red-300 hover:bg-red-50"
              onClick={() => loadProjects()}
            >
              重試
            </Button>
          </div>
        )}

        {/* 載入狀態 */}
        {loading && (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mr-3"></div>
            <div className="text-gray-500">載入中...</div>
          </div>
        )}

        {/* 專案列表 */}
        {!loading && (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredProjects.map((project) => (
            <Card 
              key={project.id} 
              className="hover:shadow-lg transition-shadow cursor-pointer group"
              onClick={() => onSelectProject(project.id)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <CardTitle className="text-lg group-hover:text-primary transition-colors">
                        {project.name}
                      </CardTitle>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleStar(project.id);
                        }}
                      >
                        <Star 
                          className={`w-4 h-4 ${
                            project.starred 
                              ? 'fill-yellow-400 text-yellow-400' 
                              : 'text-gray-400 hover:text-yellow-400'
                          }`} 
                        />
                      </Button>
                    </div>
                    {getStatusBadge(project.status)}
                  </div>
                </div>
                <p className="text-sm text-gray-600 mt-2 line-clamp-2">
                  {project.description}
                </p>
              </CardHeader>

              <CardContent>
                {/* 項目統計 */}
                <div className="grid grid-cols-4 gap-2 mb-4">
                  <div className="text-center">
                    <div className="text-lg font-semibold text-blue-600">
                      {project.itemCount?.UC || 0}
                    </div>
                    <div className="text-xs text-gray-500">UC</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-semibold text-green-600">
                      {project.itemCount?.SD || 0}
                    </div>
                    <div className="text-xs text-gray-500">SD</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-semibold text-purple-600">
                      {project.itemCount?.API || 0}
                    </div>
                    <div className="text-xs text-gray-500">API</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-semibold text-orange-600">
                      {project.itemCount?.DTO || 0}
                    </div>
                    <div className="text-xs text-gray-500">DTO</div>
                  </div>
                </div>

                {/* 時間資訊 */}
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <div className="flex items-center">
                    <Calendar className="w-3 h-3 mr-1" />
                    創建：{new Date(project.createdAt).toLocaleDateString()}
                  </div>
                  <div className="flex items-center">
                    <Clock className="w-3 h-3 mr-1" />
                    修改：{new Date(project.updatedAt).toLocaleDateString()}
                  </div>
                </div>
              </CardContent>
            </Card>
            ))}
          </div>
        )}

        {/* 空狀態 */}
        {!loading && filteredProjects.length === 0 && (
          <div className="text-center py-12">
            <FolderOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchQuery ? '找不到相關專案' : '還沒有專案'}
            </h3>
            <p className="text-gray-600 mb-4">
              {searchQuery 
                ? '請嘗試使用不同的關鍵字搜尋' 
                : '建立您的第一個系統分析專案'
              }
            </p>
            {!searchQuery && (
              <CreateProjectDialog
                isOpen={isCreateDialogOpen}
                onOpenChange={setIsCreateDialogOpen}
                newProject={newProject}
                onProjectChange={setNewProject}
                onCreateProject={handleCreateProject}
                disabled={loading}
              >
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  新增專案
                </Button>
              </CreateProjectDialog>
            )}
          </div>
        )}
      </main>
    </div>
  );
}