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
import { Search, Plus, MessageSquare, FileText, GitBranch, Database, Code, ChevronDown, ChevronRight, FolderOpen, Folder, ArrowLeft, Home, Send, Bot, User, LogOut, Edit3, Save, X, Loader2, AlertCircle, RefreshCw, Building } from 'lucide-react';
import MermaidCanvas from './MermaidCanvas';
import APIDocViewer from './APIDocViewer';
import DTOViewer from './DTOViewer';
import UCViewer from './UCViewer';
import UCListViewer, { SimpleUCData } from './UCListViewer';
import ModuleViewer, { ModuleData } from './ModuleViewer';
import { useProjectData, isAnyLoading, hasAnyError, getFirstError } from '@/hooks/useProjectData';
import { useKeyboardShortcuts, ShortcutConfig, formatShortcut } from '@/hooks/useKeyboardShortcuts';
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
  type: 'UC' | 'SD' | 'API' | 'DTO' | 'MD';
  category: string;
  module?: string;
  content?: string;
  apiData?: APIDocData;
  dtoData?: DTOData;
  ucData?: UCData;
  moduleData?: ModuleData;
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
  onOpenAIAssistant?: () => void;
}

export default function SystemAnalysisApp({ projectId, user, onBackToProjects, onLogout, onOpenAIAssistant }: SystemAnalysisAppProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [chatInput, setChatInput] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isModuleDialogOpen, setIsModuleDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ProjectItem | null>(null);
  const [activeTab, setActiveTab] = useState('md');
  const [showShortcuts, setShowShortcuts] = useState(false);
  // 為每個頁籤維護獨立的選中項目
  const [selectedItemsByTab, setSelectedItemsByTab] = useState<Record<string, string | null>>({
    md: null,
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
    module: '',
    category: '身份驗證系統',
    method: 'GET' as APIDocData['method'],
    endpoint: ''
  });

  // 新增模組表單狀態
  const [newModule, setNewModule] = useState({
    name: '',
    description: ''
  });

  // 對話滾動到底部的 ref
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  // 設定鍵盤快捷鍵
  const shortcuts: ShortcutConfig[] = [
    // 頁籤切換
    { key: '1', alt: true, handler: () => setActiveTab('md'), description: '切換到 MD 頁籤' },
    { key: '2', alt: true, handler: () => setActiveTab('uc'), description: '切換到 UC 頁籤' },
    { key: '3', alt: true, handler: () => setActiveTab('sd'), description: '切換到 SD 頁籤' },
    { key: '4', alt: true, handler: () => setActiveTab('api'), description: '切換到 API 頁籤' },
    { key: '5', alt: true, handler: () => setActiveTab('dto'), description: '切換到 DTO 頁籤' },
    { key: '6', alt: true, handler: () => setChatInput(''), description: '切換到 AI 助手' },
    
    // 功能快捷鍵
    { key: 'n', alt: true, handler: () => setIsCreateDialogOpen(true), description: '新增項目' },
    { key: 's', ctrl: true, handler: () => handleSaveCurrentItem(), description: '儲存當前項目', enabled: !!selectedItem },
    { key: 'r', ctrl: true, handler: () => refresh.all(), description: '重新載入資料' },
    
    // 導航
    { key: '/', ctrl: true, handler: () => searchInputRef.current?.focus(), description: '聚焦搜尋框' },
    { key: 'Escape', handler: () => setShowShortcuts(false), description: '關閉快捷鍵列表', enabled: showShortcuts },
    { key: '?', shift: true, handler: () => setShowShortcuts(!showShortcuts), description: '顯示/隱藏快捷鍵' },
    
    // 頁籤內導航
    { key: 'ArrowDown', handler: () => navigateItems('down'), description: '選擇下一個項目' },
    { key: 'ArrowUp', handler: () => navigateItems('up'), description: '選擇上一個項目' },
    { key: 'Enter', handler: () => openSelectedItem(), description: '開啟選中項目', enabled: !!selectedItem },
  ];
  
  useKeyboardShortcuts(shortcuts);
  
  // 輔助函數
  const handleSaveCurrentItem = () => {
    // TODO: 實現儲存邏輯
    console.log('Saving current item:', selectedItem);
  };
  
  const navigateItems = (direction: 'up' | 'down') => {
    // TODO: 實現項目導航邏輯
    console.log('Navigating items:', direction);
  };
  
  const openSelectedItem = () => {
    if (selectedItem) {
      // TODO: 實現開啟項目邏輯
      console.log('Opening item:', selectedItem);
    }
  };

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
      // 後端返回的UC包含module關聯，需要正確處理
      const moduleName = (uc as any).module?.title || uc.module || '未指定模組';
      const summary = (uc as any).summary || uc.category || '未分類';
      
      items.push({
        id: uc.id,
        title: uc.title,
        type: 'UC',
        category: summary,
        module: moduleName,
        ucData: {
          id: uc.id,
          title: uc.title,
          module: moduleName,
          category: summary,
          description: summary,
          preconditions: uc.preconditions || [],
          postconditions: uc.postconditions || [],
          mainFlow: uc.mainFlow || [],
          businessRules: uc.businessRules || [],
          acceptanceCriteria: uc.acceptanceCriteria || [],
          notes: uc.notes || []
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

    // 轉換 Module 資料 - 直接列出每個模組
    projectData.modules.forEach(module => {
      items.push({
        id: module.id,
        title: module.title,
        type: 'MD',
        category: '功能模組',
        module: module.title, // 模組歸屬於自己
        moduleData: {
          id: module.id,
          name: module.title,
          description: module.description || '',
          order: 0,
          createdAt: module.createdAt,
          updatedAt: module.updatedAt,
          children: [],
          useCaseCount: 0
        }
      });
    });

    // 如果沒有模組，顯示提示項目
    if (projectData.modules.length === 0) {
      items.push({
        id: 'no-modules',
        title: '尚無模組',
        type: 'MD',
        category: '提示',
        module: '提示',
        moduleData: {
          id: 'no-modules',
          name: '尚無模組',
          description: '點擊左上角「新增」按鈕來建立第一個模組',
          order: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          children: [],
          useCaseCount: 0
        }
      });
    }
    
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
      // 先確保有模組
      if (projectData.modules.length === 0) {
        // 如果沒有模組，先建立一個預設模組
        const defaultModule = await api.createModule(projectId, {
          title: newItem.module || '預設模組',
          description: '自動建立的預設模組'
        });
        await refresh.modules();
      }
      
      // 找到或建立對應的模組
      let targetModule = projectData.modules.find(m => m.title === newItem.module);
      if (!targetModule && projectData.modules.length > 0) {
        targetModule = projectData.modules[0]; // 使用第一個模組作為預設
      }
      
      if (!targetModule) {
        alert('無法找到或建立模組');
        return;
      }

      let createdItem: any = null;
      
      // 根據類型調用不同的 API
      switch (newItem.type) {
        case 'UC':
          const ucData = {
            title: newItem.title,
            summary: newItem.category // 將項目分類對應到資料庫的summary欄位
          };
          const ucResponse = await api.createUseCase(targetModule.id, ucData);
          createdItem = ucResponse.data;
          await refresh.useCases(1, false, true); // 強制重新載入 UC 列表，跳過cache
          break;
          
        case 'SD':
          const useCaseId = newItem.module; // SD的module欄位實際儲存的是useCaseId
          if (!useCaseId || useCaseId.trim() === '') {
            throw new Error('請先建立使用案例，然後才能創建循序圖');
          }
          const sdData = {
            title: newItem.title,
            mermaidSrc: '' // 空的Mermaid內容，讓使用者自己編寫
          };
          const sdResponse = await api.createSequenceDiagramForUseCase(useCaseId, sdData);
          createdItem = sdResponse.data;
          await refresh.sequences(); // 重新載入 SD 列表
          break;
          
        case 'API':
          const apiData = {
            projectId,
            title: newItem.title,
            method: newItem.method,
            endpoint: newItem.endpoint,
            description: '新建的API端點',
            responses: []
          };
          const apiResponse = await api.createAPIContract(apiData);
          createdItem = apiResponse.data;
          await refresh.apiContracts(); // 重新載入 API 列表
          break;
          
        case 'DTO':
          const dtoData = {
            projectId,
            name: newItem.title,
            description: '新建的資料傳輸物件',
            properties: []
          };
          const dtoResponse = await api.createDTOSchema(dtoData);
          createdItem = dtoResponse.data;
          await refresh.dtoSchemas(); // 重新載入 DTO 列表
          break;
      }
      
      // 切換到對應的頁籤
      const targetTab = newItem.type.toLowerCase();
      setActiveTab(targetTab);
      
      // 關閉對話框並重置表單
      setIsCreateDialogOpen(false);
      const defaultModule = projectData.modules.length > 0 ? projectData.modules[0].title : '預設模組';
      setNewItem({
        type: 'UC',
        title: '',
        module: defaultModule,
        category: '',
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

  // 監聽專案資料變化，更新預設模組
  useEffect(() => {
    if (projectData.modules.length > 0 && newItem.module === '') {
      setNewItem(prev => ({
        ...prev,
        module: projectData.modules[0].title
      }));
    }
  }, [projectData.modules, newItem.module]);

  // 切換模組展開狀態
  const toggleModule = (module: string) => {
    setExpandedModules(prev => ({
      ...prev,
      [module]: !prev[module]
    }));
  };

  // 處理新增項目按鈕點擊（從子組件傳來的）
  const handleAddItem = () => {
    if (activeTab === 'md') {
      // MD 頁籤直接開啟模組專用對話框
      setIsModuleDialogOpen(true);
    } else if (activeTab === 'uc') {
      // UC 頁籤直接建立UC類型的項目，不需要讓用戶選擇
      const firstModule = projectData.modules.length > 0 ? projectData.modules[0].title : '預設模組';
      setNewItem(prev => ({
        ...prev,
        type: 'UC',
        module: firstModule
      }));
      setIsCreateDialogOpen(true);
    } else if (activeTab === 'sd') {
      // SD 頁籤直接建立SD類型的項目，需要選擇關聯的UC
      if (projectData.useCases.length === 0) {
        alert('請先建立使用案例，然後才能創建循序圖。循序圖必須關聯到一個使用案例。');
        return;
      }
      const firstUseCase = projectData.useCases[0].id;
      setNewItem(prev => ({
        ...prev,
        type: 'SD',
        module: firstUseCase, // 使用module欄位儲存useCaseId
        category: ''
      }));
      setIsCreateDialogOpen(true);
    } else {
      // 其他頁籤使用通用的新增項目對話框
      const defaultType = activeTab.toUpperCase() as ProjectItem['type'];
      setNewItem(prev => ({
        ...prev,
        type: defaultType
      }));
      setIsCreateDialogOpen(true);
    }
  };

  // 處理模組新增
  const handleCreateModule = async () => {
    try {
      await api.createModule(projectId, {
        title: newModule.name,
        description: newModule.description || '新建的功能模組'
      });
      
      // 重新載入模組列表
      await refresh.modules();
      
      // 關閉對話框並重置表單
      setIsModuleDialogOpen(false);
      setNewModule({
        name: '',
        description: ''
      });
      
    } catch (error: any) {
      console.error('建立模組失敗:', error);
      alert(`建立模組失敗: ${error.response?.data?.message || error.message}`);
    }
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
      case 'MD': return '功能模組';
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
      case 'MD': return <Building className="w-5 h-5 text-indigo-600" />;
      case 'UC': return <FileText className="w-5 h-5 text-green-600" />;
      case 'SD': return <GitBranch className="w-5 h-5 text-purple-600" />;
      case 'API': return <Code className="w-5 h-5 text-orange-600" />;
      case 'DTO': return <Database className="w-5 h-5 text-blue-600" />;
      default: return <FileText className="w-5 h-5 text-gray-600" />;
    }
  };

  // 渲染項目列表
  const renderItemList = (items: ProjectItem[]) => {
    // MD、UC 和 SD 類型直接平鋪顯示，不使用資料夾分組
    if (items.length > 0 && (items[0].type === 'MD' || items[0].type === 'UC' || items[0].type === 'SD')) {
      return (
        <div className="space-y-1">
          {items.map(item => (
            <div
              key={item.id}
              className={`flex items-center gap-2 p-2 cursor-pointer rounded transition-colors ${
                selectedItem?.id === item.id 
                  ? 'bg-blue-100 border-l-2 border-blue-500' 
                  : 'hover:bg-gray-50'
              }`}
              onClick={() => handleItemClick(item)}
            >
              {item.type === 'MD' && <Building size={14} className="text-indigo-600" />}
              {item.type === 'UC' && <FileText size={14} className="text-green-600" />}
              {item.type === 'SD' && <GitBranch size={14} className="text-purple-600" />}
              <span className="text-sm">{item.title}</span>
            </div>
          ))}
        </div>
      );
    }

    // 其他類型使用資料夾分組
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
        {/* 左側分析列表（原側邊欄的搜尋和分類列表部分） */}
        <ResizablePanel defaultSize={20}>
          <div className="h-full bg-white flex flex-col border-r border-gray-200">
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
                  {onOpenAIAssistant && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={onOpenAIAssistant}
                      className="flex items-center gap-1"
                    >
                      <Bot size={16} />
                      AI助手
                    </Button>
                  )}
                  <span className="text-sm text-gray-600">{user.name}</span>
                  <Button variant="ghost" size="sm" onClick={onLogout}>
                    <LogOut size={16} />
                  </Button>
                </div>
              </div>

              {/* 搜索框與新增按鈕 */}
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <Input
                    ref={searchInputRef}
                    placeholder="搜尋項目... (Ctrl+/)"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                {(activeTab === 'md' || activeTab === 'uc' || activeTab === 'sd') && (
                  <Button 
                    size="sm" 
                    onClick={handleAddItem}
                    className="shrink-0"
                  >
                    <Plus size={14} className="mr-1" />
                    新增
                  </Button>
                )}
              </div>
            </div>

            {/* 分類列表 */}
            <div className="flex-1 overflow-hidden">
              <Tabs value={activeTab} onValueChange={handleTabChange} className="h-full flex flex-col">
                <TabsList className="grid w-full grid-cols-5 mx-4 mt-4 flex-shrink-0 text-xs">
                  <TabsTrigger value="md">MD</TabsTrigger>
                  <TabsTrigger value="uc">UC</TabsTrigger>
                  <TabsTrigger value="sd">SD</TabsTrigger>
                  <TabsTrigger value="api">API</TabsTrigger>
                  <TabsTrigger value="dto">DTO</TabsTrigger>
                </TabsList>
                
                <div className="flex-1 overflow-hidden">
                  <TabsContent value="md" className="h-full mt-4 mx-0">
                    <ScrollArea className="h-full px-4">
                      {renderItemList(getFilteredItems('md'))}
                    </ScrollArea>
                  </TabsContent>
                  
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
          </div>
        </ResizablePanel>

        {/* 可調整大小的分隔器 */}
        <ResizableHandle withHandle />

        {/* 中間主要內容區域 */}
        <ResizablePanel defaultSize={60}>
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
            
            {/* 統一的頂部工具欄 - 永遠顯示 */}
            <div className="flex justify-between items-center p-6 border-b border-gray-200 bg-white flex-shrink-0">
              <div className="flex items-center gap-3">
                {activeTab === 'uc' ? (
                  <>
                    <FileText className="w-8 h-8 text-green-600" />
                    <div>
                      <h1 className="text-2xl font-bold">使用案例管理</h1>
                      <p className="text-gray-600">檢視和管理專案中的所有使用案例</p>
                    </div>
                  </>
                ) : selectedItem ? (
                  <>
                    {getTypeIcon(selectedItem.type)}
                    <div>
                      <h1 className="text-2xl font-bold">{selectedItem.title}</h1>
                      <p className="text-gray-600">{getTypeDescription(selectedItem.type)}</p>
                    </div>
                  </>
                ) : (
                  <>
                    <FileText className="w-8 h-8 text-gray-400" />
                    <div>
                      <h1 className="text-2xl font-bold text-gray-600">系統分析工具</h1>
                      <p className="text-gray-500">選擇一個項目開始編輯</p>
                    </div>
                  </>
                )}
              </div>
              <div className="flex items-center gap-2">
                {activeTab === 'uc' ? (
                  /* UC頁籤只顯示新增按鈕 */
                  <Button onClick={handleAddItem}>
                    <Plus className="w-4 h-4 mr-2" />
                    新增使用案例
                  </Button>
                ) : selectedItem && isEditing ? (
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
                    {selectedItem && (
                      <Button variant="outline" onClick={handleEditItem}>
                        <Edit3 className="w-4 h-4 mr-2" />
                        編輯
                      </Button>
                    )}
                    <Button onClick={handleAddItem}>
                      <Plus className="w-4 h-4 mr-2" />
                      新增項目
                    </Button>
                  </>
                )}
              </div>
            </div>

            {/* UC頁籤使用列表視圖，其他頁籤基於selectedItem */}
            {activeTab === 'uc' ? (
              /* UC列表視圖 */
              <div className="flex-1 overflow-auto">
                <UCListViewer
                  useCases={projectData.useCases.map((uc: any) => ({
                    id: uc.id,
                    title: uc.title,
                    summary: uc.summary,
                    ucCode: uc.ucCode,
                    module: uc.module ? {
                      id: uc.module.id,
                      title: uc.module.title,
                      modCode: uc.module.modCode
                    } : undefined,
                    createdAt: uc.createdAt,
                    updatedAt: uc.updatedAt
                  }))}
                  selectedUCId={selectedItem?.type === 'UC' ? selectedItem.id : undefined}
                  onSelectUC={(uc) => {
                    // 當點擊UC時，可以選擇性地設置為選中項目
                    // 目前保持簡單，不需要特別處理
                  }}
                  onUpdateUC={async (id, data) => {
                    await api.updateUseCase(id, data);
                    await refresh.useCases(1, false, true);
                  }}
                  onDeleteUC={async (id) => {
                    await api.deleteUseCase(id);
                    await refresh.useCases(1, false, true);
                  }}
                />
              </div>
            ) : selectedItem ? (
              /* 其他頁籤的內容區域 */
              <div className="flex-1 overflow-auto">
                {selectedItem.type === 'MD' && (
                  <div className="h-full">
                    <ModuleViewer
                      modules={(projectData.modules || []).map(m => ({
                        ...m,
                        name: m.title, // 將 API 的 title 映射到 ModuleData 的 name
                        order: 0, // 添加缺少的 order 屬性
                        children: [],
                        useCaseCount: 0
                      }))}
                      selectedModuleId={selectedItem.id !== 'no-modules' ? selectedItem.id : undefined}
                      onAddModule={async (moduleData) => {
                        await api.createModule(projectId, {
                          title: moduleData.name!,
                          description: moduleData.description
                        });
                        await refresh.modules();
                      }}
                      onUpdateModule={async (id, moduleData) => {
                        await api.updateModule(id, moduleData);
                        await refresh.modules();
                      }}
                      onDeleteModule={async (id) => {
                        await api.deleteModule(id);
                        await refresh.modules();
                      }}
                      isEditing={isEditing}
                      onSave={async () => handleSaveEdit()}
                      onCancel={handleCancelEdit}
                    />
                  </div>
                )}
                {selectedItem.type === 'SD' && (
                  <div className="h-full">
                    <MermaidCanvas 
                      initialContent={selectedItem.content || ''}
                      title={selectedItem.title}
                      isEditing={isEditing}
                      onContentChange={async (content) => {
                        // 更新本地狀態
                        setSelectedItem(prev => prev ? {...prev, content} : null);
                        
                        // 如果在編輯模式，自動保存到後端
                        if (isEditing && selectedItem.id) {
                          try {
                            await api.updateSequenceDiagram(selectedItem.id, {
                              content,
                              title: selectedItem.title,
                              category: selectedItem.category
                            });
                            // 重新載入 SD 列表
                            await refresh.sequences();
                          } catch (error) {
                            console.error('保存循序圖失敗:', error);
                          }
                        }
                      }}
                    />
                  </div>
                )}
                {selectedItem.type === 'API' && selectedItem.apiData && (
                  <div className="h-full">
                    <APIDocViewer 
                      apiData={selectedItem.apiData}
                      isEditing={isEditing}
                      onUpdate={async (updatedData) => {
                        // 更新本地狀態
                        setSelectedItem(prev => prev ? {...prev, apiData: updatedData} : null);
                        
                        // 調用 API 更新
                        if (selectedItem.id) {
                          await api.updateAPIContract(selectedItem.id, updatedData);
                          // 重新載入 API 列表
                          await refresh.apiContracts();
                        }
                      }}
                      onSave={async () => handleSaveEdit()}
                      onCancel={handleCancelEdit}
                    />
                  </div>
                )}
                {selectedItem.type === 'DTO' && selectedItem.dtoData && (
                  <div className="h-full">
                    <DTOViewer 
                      dtoData={selectedItem.dtoData}
                      isEditing={isEditing}
                      onUpdate={async (updatedData) => {
                        // 更新本地狀態
                        setSelectedItem(prev => prev ? {...prev, dtoData: updatedData} : null);
                        
                        // 調用 API 更新
                        if (selectedItem.id) {
                          await api.updateDTOSchema(selectedItem.id, updatedData);
                          // 重新載入 DTO 列表
                          await refresh.dtoSchemas();
                        }
                      }}
                      onSave={async () => handleSaveEdit()}
                      onCancel={handleCancelEdit}
                    />
                  </div>
                )}
              </div>
            ) : activeTab === 'uc' ? (
              /* UC頁籤沒有選中項目時也顯示列表視圖 */
              <div className="flex-1 overflow-auto">
                <UCListViewer
                  useCases={projectData.useCases.map((uc: any) => ({
                    id: uc.id,
                    title: uc.title,
                    summary: uc.summary,
                    ucCode: uc.ucCode,
                    module: uc.module ? {
                      id: uc.module.id,
                      title: uc.module.title,
                      modCode: uc.module.modCode
                    } : undefined,
                    createdAt: uc.createdAt,
                    updatedAt: uc.updatedAt
                  }))}
                  onUpdateUC={async (id, data) => {
                    await api.updateUseCase(id, data);
                    await refresh.useCases(1, false, true);
                  }}
                  onDeleteUC={async (id) => {
                    await api.deleteUseCase(id);
                    await refresh.useCases(1, false, true);
                  }}
                />
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-500">
                <div className="text-center">
                  <FileText size={64} className="mx-auto mb-4 opacity-50" />
                  <h3 className="text-xl mb-2">請選擇一個項目</h3>
                  <p className="mb-4">在左側列表中點擊項目以查看詳細內容</p>
                  <Button onClick={handleAddItem} variant="outline" size="lg">
                    <Plus className="w-4 h-4 mr-2" />
                    立即新增項目
                  </Button>
                </div>
              </div>
            )}
          </div>
        </ResizablePanel>

        {/* 可調整大小的分隔器 */}
        <ResizableHandle withHandle />

        {/* 右側AI對話區 */}
        <ResizablePanel defaultSize={20}>
          <div className="h-full bg-white flex flex-col border-l border-gray-200">
            {/* AI對話區標題 */}
            <div className="p-4 border-b border-gray-200 flex-shrink-0">
              <div className="flex items-center gap-2">
                <MessageSquare size={16} className="text-blue-600" />
                <span className="font-medium">AI助手</span>
              </div>
            </div>
            
            {/* AI對話內容 */}
            <div className="flex-1 flex flex-col p-4">
              <Card className="flex-1 mb-4">
                <CardContent className="p-4 h-full">
                  <div className="h-full overflow-auto" ref={chatScrollRef}>
                    <div className="space-y-3">
                      {chatMessages.map(message => (
                        <div key={message.id} className="mb-3 last:mb-0">
                          <div className="flex items-start gap-3">
                            {message.isUser ? (
                              <User size={16} className="text-gray-600 mt-1 flex-shrink-0" />
                            ) : (
                              <Bot size={16} className="text-blue-600 mt-1 flex-shrink-0" />
                            )}
                            <div className="flex-1">
                              <p className="text-sm text-gray-700 leading-relaxed">{message.message}</p>
                              <span className="text-xs text-gray-400 mt-1 block">
                                {message.timestamp.toLocaleTimeString()}
                              </span>
                            </div>
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
                  <Send size={14} />
                </Button>
              </div>
            </div>
          </div>
        </ResizablePanel>

        {/* 新增模組對話框 */}
        <Dialog open={isModuleDialogOpen} onOpenChange={setIsModuleDialogOpen}>
          <DialogContent className="sm:max-w-[400px]">
            <DialogHeader>
              <DialogTitle>新增功能模組</DialogTitle>
              <DialogDescription>
                建立新的功能模組來組織專案結構
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="module-name">模組名稱 *</Label>
                <Input
                  id="module-name"
                  value={newModule.name}
                  onChange={(e) => setNewModule(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="請輸入模組名稱"
                  autoFocus
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="module-description">模組描述</Label>
                <Textarea
                  id="module-description"
                  value={newModule.description}
                  onChange={(e) => setNewModule(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="請輸入模組描述（選填）"
                  rows={3}
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => {
                  setIsModuleDialogOpen(false);
                  setNewModule({ name: '', description: '' });
                }}
              >
                取消
              </Button>
              <Button
                onClick={handleCreateModule}
                disabled={!newModule.name.trim()}
              >
                <Plus className="w-4 h-4 mr-2" />
                建立模組
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* 新增項目對話框 */}
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>
                {activeTab === 'uc' ? '新增使用者案例' : 
                 activeTab === 'sd' ? '新增循序圖' : '新增項目'}
              </DialogTitle>
              <DialogDescription>
                {activeTab === 'uc' ? '建立新的使用者案例 (Use Case)' : 
                 activeTab === 'sd' ? '建立新的循序圖 (Sequence Diagram)' : 
                 '建立新的系統分析項目'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {activeTab !== 'uc' && activeTab !== 'sd' && (
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
              )}

              <div className="space-y-2">
                <Label htmlFor="item-title">
                  {activeTab === 'sd' ? '循序圖名稱' : '項目名稱'}
                </Label>
                <Input
                  id="item-title"
                  placeholder={
                    activeTab === 'sd' ? '請輸入循序圖名稱' : '請輸入項目名稱'
                  }
                  value={newItem.title}
                  onChange={(e) => setNewItem(prev => ({ ...prev, title: e.target.value }))}
                />
              </div>

              {activeTab === 'sd' ? (
                <div className="space-y-2">
                  <Label htmlFor="item-usecase">關聯使用案例</Label>
                  <Select
                    value={newItem.module} // 重用module欄位來儲存useCaseId
                    onValueChange={(value) => 
                      setNewItem(prev => ({ ...prev, module: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="選擇使用案例" />
                    </SelectTrigger>
                    <SelectContent>
                      {projectData.useCases.length > 0 ? (
                        projectData.useCases.map(uc => (
                          <SelectItem key={uc.id} value={uc.id}>
                            {uc.title}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="" disabled>
                          尚無可用使用案例，請先建立使用案例
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              ) : activeTab !== 'uc' && (
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
                      {projectData.modules.length > 0 ? (
                        projectData.modules.map(module => (
                          <SelectItem key={module.id} value={module.title}>
                            {module.title}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="預設模組" disabled>
                          尚無可用模組，請先建立模組
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="item-category">
                  {activeTab === 'uc' ? '使用案例摘要' : 
                   activeTab === 'sd' ? '循序圖描述' : '項目分類'}
                </Label>
                <Input
                  id="item-category"
                  placeholder={
                    activeTab === 'uc' ? '請簡單描述這個使用案例的功能' :
                    activeTab === 'sd' ? '請描述這個循序圖的用途' : '請輸入項目分類'
                  }
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
                  const defaultModule = projectData.modules.length > 0 ? projectData.modules[0].title : '預設模組';
                  const firstUseCase = projectData.useCases.length > 0 ? projectData.useCases[0].id : '';
                  setNewItem({
                    type: 'UC',
                    title: '',
                    module: activeTab === 'sd' ? firstUseCase : defaultModule,
                    category: '',
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
        
        {/* 快捷鍵幫助對話框 */}
        <Dialog open={showShortcuts} onOpenChange={setShowShortcuts}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-auto">
            <DialogHeader>
              <DialogTitle>鍵盤快捷鍵</DialogTitle>
              <DialogDescription>
                使用以下快捷鍵提高操作效率
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <h3 className="font-semibold mb-2">頁籤切換</h3>
                <div className="space-y-1">
                  {shortcuts.filter(s => s.key >= '1' && s.key <= '6').map(shortcut => (
                    <div key={shortcut.key} className="flex justify-between items-center py-1">
                      <span className="text-sm">{shortcut.description}</span>
                      <kbd className="px-2 py-1 text-xs bg-gray-100 rounded">
                        {formatShortcut(shortcut)}
                      </kbd>
                    </div>
                  ))}
                </div>
              </div>
              
              <div>
                <h3 className="font-semibold mb-2">功能快捷鍵</h3>
                <div className="space-y-1">
                  {shortcuts.filter(s => ['n', 's', 'r'].includes(s.key)).map(shortcut => (
                    <div key={shortcut.key + (shortcut.ctrl ? '-ctrl' : '')} className="flex justify-between items-center py-1">
                      <span className="text-sm">{shortcut.description}</span>
                      <kbd className="px-2 py-1 text-xs bg-gray-100 rounded">
                        {formatShortcut(shortcut)}
                      </kbd>
                    </div>
                  ))}
                </div>
              </div>
              
              <div>
                <h3 className="font-semibold mb-2">導航</h3>
                <div className="space-y-1">
                  {shortcuts.filter(s => ['/', '?', 'Escape', 'ArrowDown', 'ArrowUp', 'Enter'].includes(s.key)).map(shortcut => (
                    <div key={shortcut.key + (shortcut.shift ? '-shift' : '')} className="flex justify-between items-center py-1">
                      <span className="text-sm">{shortcut.description}</span>
                      <kbd className="px-2 py-1 text-xs bg-gray-100 rounded">
                        {formatShortcut(shortcut)}
                      </kbd>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </ResizablePanelGroup>
    </div>
  );
}