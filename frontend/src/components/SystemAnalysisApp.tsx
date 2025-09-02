import { useState, useRef, useEffect, useMemo } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { ScrollArea } from './ui/scroll-area';
import { Badge } from './ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from './ui/resizable';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from './ui/dialog';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Search, Plus, MessageSquare, FileText, GitBranch, Database, Code, ChevronDown, ChevronRight, FolderOpen, Folder, ArrowLeft, Home, Send, Bot, User, LogOut, Edit3, Save, X, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import MermaidCanvas from './MermaidCanvas';
import APIDocViewer from './APIDocViewer';
import DTOViewer from './DTOViewer';
import UCViewer from './UCViewer';
import { useProjectData, isAnyLoading, hasAnyError, getFirstError } from '@/hooks/useProjectData';
import { Alert, AlertDescription } from './ui/alert';
import api from '@/services/api';

interface APIParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  required: boolean;
  description: string;
  example?: any;
  schema?: string;
}

interface APIResponse {
  statusCode: number;
  description: string;
  example?: any;
  schema?: string;
}

interface APIDocData {
  id: string;
  title: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  endpoint: string;
  description: string;
  summary?: string;
  tags?: string[];
  parameters?: {
    path?: APIParameter[];
    query?: APIParameter[];
    header?: APIParameter[];
    body?: APIParameter[];
  };
  responses: APIResponse[];
  requestExample?: string;
  responseExample?: string;
}

interface DTOProperty {
  name: string;
  type: string;
  required: boolean;
  description: string;
  example?: any;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    enum?: string[];
    format?: string;
  };
  references?: string;
}

interface DTOData {
  id: string;
  name: string;
  description: string;
  version?: string;
  category?: string;
  tags?: string[];
  properties: DTOProperty[];
  example?: any;
  relationships?: {
    extends?: string[];
    implements?: string[];
    uses?: string[];
  };
  validation?: {
    rules?: string[];
    schema?: string;
  };
  notes?: string[];
}

interface UCStep {
  id: string;
  order: number;
  action: string;
  description: string;
}

interface UCData {
  id: string;
  title: string;
  module: string;
  category: string;
  description: string;
  preconditions: string[];
  postconditions: string[];
  mainFlow: UCStep[];
  businessRules: string[];
  acceptanceCriteria: string[];
  notes: string[];
}

interface ProjectItem {
  id: string;
  title: string;
  type: 'UC' | 'SD' | 'API' | 'DTO';
  category: string;
  module?: string;
  content?: string;
  apiData?: APIDocData;
  dtoData?: DTOData;
  ucData?: UCData;
}

interface ChatMessage {
  id: string;
  message: string;
  isUser: boolean;
  timestamp: Date;
}

interface SystemAnalysisAppProps {
  projectId: string;
  user: { email: string; name: string };
  onBackToProjects: () => void;
  onLogout: () => void;
}

export default function SystemAnalysisApp({ projectId, user, onBackToProjects, onLogout }: SystemAnalysisAppProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [chatInput, setChatInput] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ProjectItem | null>(null);
  const [activeTab, setActiveTab] = useState('uc');
  // 為每個頁籤維護獨立的選中項目
  const [selectedItemsByTab, setSelectedItemsByTab] = useState<Record<string, string | null>>({
    uc: null,
    sd: null,
    api: null,
    dto: null
  });
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({
    '身份驗證模組': true,
    '使用者管理模組': true,
    '訂單管理模組': false
  });
  
  // 使用 useProjectData hook 載入專案資料
  const { data: projectData, loading, error, refresh } = useProjectData(projectId);
  const isLoading = isAnyLoading(loading);
  const hasError = hasAnyError(error);
  const errorMessage = getFirstError(error);

  // 新增項目表單狀態
  const [newItem, setNewItem] = useState({
    type: 'UC' as ProjectItem['type'],
    title: '',
    module: '身份驗證模組',
    category: '身份驗證系統',
    method: 'GET' as APIDocData['method'],
    endpoint: ''
  });

  // 對話滾動到底部的 ref
  const chatScrollRef = useRef<HTMLDivElement>(null);

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      message: '歡迎使用系統分析工具！您可以請我幫您生成使用者案例、循序圖、API合約或DTO。',
      isUser: false,
      timestamp: new Date()
    }
  ]);
  
  // 將 API 資料轉換為 ProjectItem 格式
  const projectItems = useMemo<ProjectItem[]>(() => {
    const items: ProjectItem[] = [];
    
    // 轉換 UC 資料
    projectData.useCases.forEach(uc => {
      items.push({
        id: uc.id,
        title: uc.title,
        type: 'UC',
        category: uc.category,
        module: uc.module,
        ucData: {
          id: uc.id,
          title: uc.title,
          module: uc.module,
          category: uc.category,
          description: uc.description,
          preconditions: uc.preconditions,
          postconditions: uc.postconditions,
          mainFlow: uc.mainFlow,
          businessRules: uc.businessRules,
          acceptanceCriteria: uc.acceptanceCriteria,
          notes: uc.notes
        }
      });
    });
    
    // 轉換 SD 資料
    projectData.sequences.forEach(sd => {
      items.push({
        id: sd.id,
        title: sd.title,
        type: 'SD',
        category: sd.category,
        content: sd.content
      });
    });
    
    // 轉換 API 資料
    projectData.apiContracts.forEach(api => {
      items.push({
        id: api.id,
        title: api.title,
        type: 'API',
        category: api.summary || '未分類',
        apiData: {
          id: api.id,
          title: api.title,
          method: api.method,
          endpoint: api.endpoint,
          description: api.description,
          summary: api.summary,
          tags: api.tags,
          parameters: api.parameters,
          responses: api.responses,
          requestExample: api.requestExample,
          responseExample: api.responseExample
        }
      });
    });
    
    // 轉換 DTO 資料
    projectData.dtoSchemas.forEach(dto => {
      items.push({
        id: dto.id,
        title: dto.name,
        type: 'DTO',
        category: dto.category || '未分類',
        dtoData: {
          id: dto.id,
          name: dto.name,
          description: dto.description,
          version: dto.version,
          category: dto.category,
          tags: dto.tags,
          properties: dto.properties,
          example: dto.example,
          relationships: dto.relationships,
          validation: dto.validation,
          notes: dto.notes
        }
      });
    });
    
    return items;
  }, [projectData]);
  
  // 測試資料已移除，現在使用真實 API 資料

  const [currentSelectedItemId, setCurrentSelectedItemId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  // 獲取當前頁籤的第一個項目
  const getFirstItemForTab = (tabType: string) => {
    const items = getFilteredItems(tabType);
    return items.length > 0 ? items[0] : null;
  };

  // 獲取指定頁籤應該顯示的項目
  const getTabSelectedItem = (tabType: string) => {
    const savedItemId = selectedItemsByTab[tabType];
    if (savedItemId) {
      const item = projectItems.find(item => item.id === savedItemId);
      if (item) return item;
    }
    // 如果沒有儲存的選項或項目不存在，返回第一個項目
    return getFirstItemForTab(tabType);
  };

  // 篩選項目的函數
  const getFilteredItems = (type: string) => {
    return projectItems.filter(item => item.type === type.toUpperCase());
  };

  // 按模組分組項目
  const getItemsByModule = (items: ProjectItem[]) => {
    const grouped: Record<string, ProjectItem[]> = {};
    items.forEach(item => {
      const module = item.module || '未分類';
      if (!grouped[module]) {
        grouped[module] = [];
      }
      grouped[module].push(item);
    });
    return grouped;
  };

  // 處理項目點擊
  const handleItemClick = (item: ProjectItem) => {
    setCurrentSelectedItemId(item.id);
    setSelectedItem(item);
    setIsEditing(false); // 切換項目時關閉編輯模式
    // 儲存到對應頁籤的選中項目
    setSelectedItemsByTab(prev => ({
      ...prev,
      [activeTab]: item.id
    }));
  };

  // 處理頁籤���換
  const handleTabChange = (newTab: string) => {
    setActiveTab(newTab);
    setIsEditing(false); // 切換頁籤時關閉編輯模式
    // 恢復該頁籤的選中項目或設定預設項目
    const targetItem = getTabSelectedItem(newTab);
    if (targetItem) {
      setSelectedItem(targetItem);
      setCurrentSelectedItemId(targetItem.id);
      // 如果該頁籤沒有儲存的選項，儲存第一個項目
      if (!selectedItemsByTab[newTab]) {
        setSelectedItemsByTab(prev => ({
          ...prev,
          [newTab]: targetItem.id
        }));
      }
    } else {
      setSelectedItem(null);
      setCurrentSelectedItemId(null);
    }
  };

  // 新增項目 - 改為調用 API
  const handleCreateItem = async () => {
    try {
      let newItemData: any = {
        projectId,
        title: newItem.title,
        category: newItem.category,
        module: newItem.module
      };

      let createdItem: any = null;
      
      // 根據類型調用不同的 API
      switch (newItem.type) {
        case 'UC':
          newItemData = {
            ...newItemData,
            description: '新建的使用案例',
            preconditions: [],
            postconditions: [],
            mainFlow: [],
            businessRules: [],
            acceptanceCriteria: [],
            notes: []
          };
          const ucResponse = await api.createUseCase(newItemData);
          createdItem = ucResponse.data;
          await refresh.useCases(); // 重新載入 UC 列表
          break;
          
        case 'SD':
          newItemData = {
            ...newItemData,
            content: 'sequenceDiagram\n    participant User\n    participant System'
          };
          const sdResponse = await api.createSequenceDiagram(newItemData);
          createdItem = sdResponse.data;
          await refresh.sequences(); // 重新載入 SD 列表
          break;
          
        case 'API':
          newItemData = {
            ...newItemData,
            method: newItem.method,
            endpoint: newItem.endpoint,
            description: '新建的API端點',
            responses: []
          };
          const apiResponse = await api.createAPIContract(newItemData);
          createdItem = apiResponse.data;
          await refresh.apiContracts(); // 重新載入 API 列表
          break;
          
        case 'DTO':
          newItemData = {
            ...newItemData,
            name: newItem.title,
            description: '新建的資料傳輸物件',
            properties: []
          };
          const dtoResponse = await api.createDTOSchema(newItemData);
          createdItem = dtoResponse.data;
          await refresh.dtoSchemas(); // 重新載入 DTO 列表
          break;
      }
      
      // 切換到對應的頁籤
      const targetTab = newItem.type.toLowerCase();
      setActiveTab(targetTab);
      
      // 關閉對話框並重置表單
      setIsCreateDialogOpen(false);
      setNewItem({
        type: 'UC',
        title: '',
        module: '身份驗證模組',
        category: '身份驗證系統',
        method: 'GET',
        endpoint: ''
      });
      
    } catch (error: any) {
      console.error('建立項目失敗:', error);
      alert(`建立項目失敗: ${error.response?.data?.message || error.message}`);
    }
  };

  // 處理AI對話
  const handleSendMessage = () => {
    if (!chatInput.trim()) return;

    const userMessage: ChatMessage = {
      id: String(Date.now()),
      message: chatInput,
      isUser: true,
      timestamp: new Date()
    };

    const botResponse: ChatMessage = {
      id: String(Date.now() + 1),
      message: `我收到了您的需求："${chatInput}"。我可以幫您生成相應的系統分析文件。請告訴我您需要什麼類型的文件？`,
      isUser: false,
      timestamp: new Date()
    };

    setChatMessages([...chatMessages, userMessage, botResponse]);
    setChatInput('');
  };

  // 滾動到聊天底部
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatMessages]);

  // 初始化時設定預設選中項目
  useEffect(() => {
    if (!selectedItem && projectItems.length > 0) {
      const initialItem = getFirstItemForTab(activeTab);
      if (initialItem) {
        setSelectedItem(initialItem);
        setCurrentSelectedItemId(initialItem.id);
        setSelectedItemsByTab(prev => ({
          ...prev,
          [activeTab]: initialItem.id
        }));
      }
    }
  }, [projectItems, activeTab]);

  // 監聽 activeTab 變化，但避免重複執行
  useEffect(() => {
    const targetItem = getTabSelectedItem(activeTab);
    if (targetItem && (!selectedItem || selectedItem.id !== targetItem.id)) {
      setSelectedItem(targetItem);
      setCurrentSelectedItemId(targetItem.id);
    }
  }, [activeTab]);

  // 切換模組展開狀態
  const toggleModule = (module: string) => {
    setExpandedModules(prev => ({
      ...prev,
      [module]: !prev[module]
    }));
  };

  // 處理新增項目按鈕點擊（從子組件傳來的）
  const handleAddItem = () => {
    setIsCreateDialogOpen(true);
  };

  // 處理編輯按鈕點擊
  const handleEditItem = () => {
    setIsEditing(!isEditing);
  };

  // 處理編輯保存
  const handleSaveEdit = () => {
    setIsEditing(false);
  };

  // 處理編輯取消
  const handleCancelEdit = () => {
    setIsEditing(false);
  };

  // 獲取當前項目的類型描述
  const getTypeDescription = (type: string) => {
    switch (type) {
      case 'UC': return '使用者案例';
      case 'SD': return '循序圖';
      case 'API': return 'API合約';
      case 'DTO': return '資料傳輸物件';
      default: return '';
    }
  };

  // 獲取當前項目的圖標
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'UC': return <FileText className="w-5 h-5 text-green-600" />;
      case 'SD': return <GitBranch className="w-5 h-5 text-purple-600" />;
      case 'API': return <Code className="w-5 h-5 text-orange-600" />;
      case 'DTO': return <Database className="w-5 h-5 text-blue-600" />;
      default: return <FileText className="w-5 h-5 text-gray-600" />;
    }
  };

  // 渲染項目列表
  const renderItemList = (items: ProjectItem[]) => {
    const groupedItems = getItemsByModule(items);
    
    return Object.entries(groupedItems).map(([module, moduleItems]) => (
      <div key={module} className="mb-4">
        <div 
          className="flex items-center gap-2 p-2 cursor-pointer hover:bg-gray-100 rounded"
          onClick={() => toggleModule(module)}
        >
          {expandedModules[module] ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          <FolderOpen size={16} className="text-blue-600" />
          <span className="font-medium">{module}</span>
          <Badge variant="secondary" className="ml-auto">
            {moduleItems.length}
          </Badge>
        </div>
        
        {expandedModules[module] && (
          <div className="ml-6 mt-2 space-y-1">
            {moduleItems.map(item => (
              <div
                key={item.id}
                className={`flex items-center gap-2 p-2 cursor-pointer rounded transition-colors ${
                  selectedItem?.id === item.id 
                    ? 'bg-blue-100 border-l-2 border-blue-500' 
                    : 'hover:bg-gray-50'
                }`}
                onClick={() => handleItemClick(item)}
              >
                {item.type === 'UC' && <FileText size={14} className="text-green-600" />}
                {item.type === 'SD' && <GitBranch size={14} className="text-purple-600" />}
                {item.type === 'API' && <Code size={14} className="text-orange-600" />}
                {item.type === 'DTO' && <Database size={14} className="text-blue-600" />}
                <span className="text-sm">{item.title}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    ));
  };

  return (
    <div className="h-screen w-full overflow-hidden">
      <ResizablePanelGroup direction="horizontal" className="h-full bg-gray-50">
        {/* 左側欄位 - 可調整大小 */}
        <ResizablePanel defaultSize={25} minSize={20} maxSize={40}>
          <div className="h-full flex flex-col border-r border-gray-200 bg-white">
            {/* 頂部工具欄 */}
            <div className="p-4 border-b border-gray-200 flex-shrink-0">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={onBackToProjects}>
                    <ArrowLeft size={16} />
                  </Button>
                  <Home size={16} className="text-gray-600" />
                  <span className="font-semibold">專案分析</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">{user.name}</span>
                  <Button variant="ghost" size="sm" onClick={onLogout}>
                    <LogOut size={16} />
                  </Button>
                </div>
              </div>

              {/* 搜索框 */}
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="搜尋項目..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* 分類列表 */}
            <div className="flex-1 overflow-hidden">
              <Tabs value={activeTab} onValueChange={handleTabChange} className="h-full flex flex-col">
                <TabsList className="grid w-full grid-cols-4 mx-4 mt-4 flex-shrink-0">
                  <TabsTrigger value="uc">UC</TabsTrigger>
                  <TabsTrigger value="sd">SD</TabsTrigger>
                  <TabsTrigger value="api">API</TabsTrigger>
                  <TabsTrigger value="dto">DTO</TabsTrigger>
                </TabsList>
                
                <div className="flex-1 overflow-hidden">
                  <TabsContent value="uc" className="h-full mt-4 mx-0">
                    <ScrollArea className="h-full px-4">
                      {renderItemList(getFilteredItems('uc'))}
                    </ScrollArea>
                  </TabsContent>
                  
                  <TabsContent value="sd" className="h-full mt-4 mx-0">
                    <ScrollArea className="h-full px-4">
                      {renderItemList(getFilteredItems('sd'))}
                    </ScrollArea>
                  </TabsContent>
                  
                  <TabsContent value="api" className="h-full mt-4 mx-0">
                    <ScrollArea className="h-full px-4">
                      {renderItemList(getFilteredItems('api'))}
                    </ScrollArea>
                  </TabsContent>
                  
                  <TabsContent value="dto" className="h-full mt-4 mx-0">
                    <ScrollArea className="h-full px-4">
                      {renderItemList(getFilteredItems('dto'))}
                    </ScrollArea>
                  </TabsContent>
                </div>
              </Tabs>
            </div>

            {/* AI對話區 */}
            <div className="border-t border-gray-200 p-4 flex-shrink-0">
              <div className="flex items-center gap-2 mb-2">
                <MessageSquare size={16} className="text-blue-600" />
                <span className="font-medium text-sm">AI助手</span>
              </div>
              
              <Card className="mb-3">
                <CardContent className="p-3">
                  <div className="h-32 overflow-auto" ref={chatScrollRef}>
                    <div className="space-y-2 p-2">
                      {chatMessages.slice(-3).map(message => (
                        <div key={message.id} className="mb-2 last:mb-0">
                          <div className="flex items-start gap-2">
                            {message.isUser ? (
                              <User size={12} className="text-gray-600 mt-1" />
                            ) : (
                              <Bot size={12} className="text-blue-600 mt-1" />
                            )}
                            <p className="text-xs text-gray-700">{message.message}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="flex gap-2">
                <Input
                  placeholder="告訴我您的需求..."
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                  className="text-sm"
                />
                <Button size="sm" onClick={handleSendMessage}>
                  <Send size={12} />
                </Button>
              </div>
            </div>
          </div>
        </ResizablePanel>

        {/* 可調整大小的分隔器 */}
        <ResizableHandle withHandle />

        {/* 右側主要內容區域 */}
        <ResizablePanel defaultSize={75}>
          <div className="h-full bg-white flex flex-col">
            {/* 載入狀態 */}
            {isLoading && (
              <div className="absolute inset-0 bg-white/80 z-50 flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                  <p className="text-sm text-gray-600">載入專案資料中...</p>
                </div>
              </div>
            )}
            
            {/* 錯誤提示 */}
            {hasError && (
              <Alert className="m-4 border-red-200 bg-red-50">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-800">
                  {errorMessage || '載入資料時發生錯誤'}
                  <Button 
                    variant="link" 
                    size="sm" 
                    onClick={() => refresh.all()}
                    className="ml-2 text-red-600 hover:text-red-800"
                  >
                    <RefreshCw className="h-3 w-3 mr-1" />
                    重試
                  </Button>
                </AlertDescription>
              </Alert>
            )}
            
            {selectedItem ? (
              <>
                {/* 統一的頂部工具欄 */}
                <div className="flex justify-between items-center p-6 border-b border-gray-200 bg-white flex-shrink-0">
                  <div className="flex items-center gap-3">
                    {getTypeIcon(selectedItem.type)}
                    <div>
                      <h1 className="text-2xl font-bold">{selectedItem.title}</h1>
                      <p className="text-gray-600">{getTypeDescription(selectedItem.type)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {isEditing ? (
                      <>
                        <Button variant="outline" onClick={handleCancelEdit}>
                          <X className="w-4 h-4 mr-2" />
                          取消
                        </Button>
                        <Button onClick={handleSaveEdit}>
                          <Save className="w-4 h-4 mr-2" />
                          儲存
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button variant="outline" onClick={handleEditItem}>
                          <Edit3 className="w-4 h-4 mr-2" />
                          編輯
                        </Button>
                        <Button onClick={handleAddItem}>
                          <Plus className="w-4 h-4 mr-2" />
                          新增項目
                        </Button>
                      </>
                    )}
                  </div>
                </div>

                {/* 內容區域 - 使用直接的overflow auto而不是ScrollArea */}
                <div className="flex-1 overflow-auto">
                  {selectedItem.type === 'UC' && selectedItem.ucData && (
                    <div className="h-full">
                      <UCViewer 
                        ucData={selectedItem.ucData} 
                        onAddItem={handleAddItem}
                        isEditing={isEditing}
                        onSave={handleSaveEdit}
                        onCancel={handleCancelEdit}
                      />
                    </div>
                  )}
                  {selectedItem.type === 'SD' && (
                    <div className="h-full">
                      <MermaidCanvas 
                        initialContent={selectedItem.content || ''}
                        onContentChange={(content) => {
                          setSelectedItem(prev => prev ? {...prev, content} : null);
                        }}
                      />
                    </div>
                  )}
                  {selectedItem.type === 'API' && selectedItem.apiData && (
                    <div className="h-full">
                      <APIDocViewer 
                        apiData={selectedItem.apiData}
                        isEditing={isEditing}
                        onUpdate={(updatedData) => {
                          setSelectedItem(prev => prev ? {...prev, apiData: updatedData} : null);
                        }}
                      />
                    </div>
                  )}
                  {selectedItem.type === 'DTO' && selectedItem.dtoData && (
                    <div className="h-full">
                      <DTOViewer 
                        dtoData={selectedItem.dtoData}
                        isEditing={isEditing}
                        onUpdate={(updatedData) => {
                          setSelectedItem(prev => prev ? {...prev, dtoData: updatedData} : null);
                        }}
                      />
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-500">
                <div className="text-center">
                  <FileText size={64} className="mx-auto mb-4 opacity-50" />
                  <h3 className="text-xl mb-2">請選擇一個項目</h3>
                  <p>在左側列表中點擊項目以查看詳細內容</p>
                </div>
              </div>
            )}
          </div>
        </ResizablePanel>

        {/* 新增項目對話框 */}
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>新增項目</DialogTitle>
              <DialogDescription>
                建立新的系統分析項目
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="item-type">項目類型</Label>
                <Select
                  value={newItem.type}
                  onValueChange={(value: ProjectItem['type']) => 
                    setNewItem(prev => ({ ...prev, type: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="選擇項目類型" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="UC">使用者案例 (UC)</SelectItem>
                    <SelectItem value="SD">循序圖 (SD)</SelectItem>
                    <SelectItem value="API">API合約</SelectItem>
                    <SelectItem value="DTO">資料傳輸物件 (DTO)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="item-title">項目名稱</Label>
                <Input
                  id="item-title"
                  placeholder="請輸入項目名稱"
                  value={newItem.title}
                  onChange={(e) => setNewItem(prev => ({ ...prev, title: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="item-module">所屬模組</Label>
                <Select
                  value={newItem.module}
                  onValueChange={(value) => 
                    setNewItem(prev => ({ ...prev, module: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="選擇模組" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="身份驗證模組">身份驗證模組</SelectItem>
                    <SelectItem value="使用者管理模組">使用者管理模組</SelectItem>
                    <SelectItem value="訂單管理模組">訂單管理模組</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="item-category">項目分類</Label>
                <Input
                  id="item-category"
                  placeholder="請輸入項目分類"
                  value={newItem.category}
                  onChange={(e) => setNewItem(prev => ({ ...prev, category: e.target.value }))}
                />
              </div>

              {newItem.type === 'API' && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="api-method">HTTP方法</Label>
                    <Select
                      value={newItem.method}
                      onValueChange={(value: APIDocData['method']) => 
                        setNewItem(prev => ({ ...prev, method: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="選擇HTTP方法" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="GET">GET</SelectItem>
                        <SelectItem value="POST">POST</SelectItem>
                        <SelectItem value="PUT">PUT</SelectItem>
                        <SelectItem value="DELETE">DELETE</SelectItem>
                        <SelectItem value="PATCH">PATCH</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="api-endpoint">API端點</Label>
                    <Input
                      id="api-endpoint"
                      placeholder="例如：/api/users"
                      value={newItem.endpoint}
                      onChange={(e) => setNewItem(prev => ({ ...prev, endpoint: e.target.value }))}
                    />
                  </div>
                </>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => {
                  setIsCreateDialogOpen(false);
                  setNewItem({
                    type: 'UC',
                    title: '',
                    module: '身份驗證模組',
                    category: '身份驗證系統',
                    method: 'GET',
                    endpoint: ''
                  });
                }}
              >
                取消
              </Button>
              <Button
                onClick={handleCreateItem}
                disabled={!newItem.title.trim()}
              >
                <Plus className="w-4 h-4 mr-2" />
                建立項目
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </ResizablePanelGroup>
    </div>
  );
}