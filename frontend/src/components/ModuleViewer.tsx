import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { ScrollArea } from './ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { 
  Plus, 
  Folder,
  FolderOpen,
  Edit3, 
  Trash2, 
  ChevronDown, 
  ChevronRight,
  FileText,
  Building,
  Package
} from 'lucide-react';

export interface ModuleData {
  id: string;
  name: string;
  description?: string;
  modCode?: string;
  parentId?: string;
  order: number;
  createdAt: string;
  updatedAt: string;
  children?: ModuleData[];
  useCaseCount?: number;
}

interface ModuleViewerProps {
  modules: ModuleData[];
  selectedModuleId?: string;
  onAddModule?: (moduleData: Partial<ModuleData>) => Promise<void>;
  onUpdateModule?: (id: string, moduleData: Partial<ModuleData>) => Promise<void>;
  onDeleteModule?: (id: string) => Promise<void>;
  isEditing?: boolean;
  onSave?: () => Promise<void>;
  onCancel?: () => void;
}

interface NewModuleForm {
  name: string;
  description: string;
  parentId: string | null;
}

export default function ModuleViewer({ 
  modules, 
  selectedModuleId,
  onAddModule, 
  onUpdateModule, 
  onDeleteModule,
  isEditing = false,
  onSave,
  onCancel
}: ModuleViewerProps) {
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({});
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingModule, setEditingModule] = useState<string | null>(null);
  const [newModule, setNewModule] = useState<NewModuleForm>({
    name: '',
    description: '',
    parentId: null
  });
  const [editingData, setEditingData] = useState<Record<string, Partial<ModuleData>>>({});

  // 切換模組展開/收合
  const toggleModule = (moduleId: string) => {
    setExpandedModules(prev => ({
      ...prev,
      [moduleId]: !prev[moduleId]
    }));
  };

  // 處理新增模組
  const handleAddModule = async () => {
    if (!newModule.name.trim()) return;

    try {
      if (onAddModule) {
        await onAddModule({
          name: newModule.name,
          description: newModule.description || undefined,
          parentId: newModule.parentId || undefined,
          order: 0
        });
      }

      // 重置表單
      setNewModule({
        name: '',
        description: '',
        parentId: null
      });
      setIsAddDialogOpen(false);
    } catch (error) {
      console.error('新增模組失敗:', error);
    }
  };

  // 開始編輯模組
  const startEdit = (module: ModuleData) => {
    setEditingModule(module.id);
    setEditingData(prev => ({
      ...prev,
      [module.id]: {
        name: module.name,
        description: module.description
      }
    }));
  };

  // 取消編輯
  const cancelEdit = (moduleId: string) => {
    setEditingModule(null);
    setEditingData(prev => {
      const newData = { ...prev };
      delete newData[moduleId];
      return newData;
    });
  };

  // 儲存編輯
  const saveEdit = async (moduleId: string) => {
    const data = editingData[moduleId];
    if (!data || !onUpdateModule) return;

    try {
      await onUpdateModule(moduleId, data);
      setEditingModule(null);
      setEditingData(prev => {
        const newData = { ...prev };
        delete newData[moduleId];
        return newData;
      });
    } catch (error) {
      console.error('更新模組失敗:', error);
    }
  };

  // 刪除模組
  const handleDelete = async (moduleId: string) => {
    if (!onDeleteModule) return;
    
    if (confirm('確定要刪除此模組嗎？此操作無法復原。')) {
      try {
        await onDeleteModule(moduleId);
      } catch (error) {
        console.error('刪除模組失敗:', error);
      }
    }
  };

  // 取得所有模組的扁平列表（用於父模組選擇）
  const getFlatModules = (moduleList: ModuleData[], level = 0): Array<{module: ModuleData, level: number}> => {
    let result: Array<{module: ModuleData, level: number}> = [];
    
    moduleList.forEach(module => {
      result.push({ module, level });
      if (module.children && module.children.length > 0) {
        result = result.concat(getFlatModules(module.children, level + 1));
      }
    });
    
    return result;
  };

  // 渲染模組項目
  const renderModuleItem = (module: ModuleData, level = 0) => {
    const hasChildren = module.children && module.children.length > 0;
    const isExpanded = expandedModules[module.id];
    const isEditing = editingModule === module.id;
    const editData = editingData[module.id] || {};

    return (
      <div key={module.id} className="space-y-2">
        <Card className={`${level > 0 ? 'ml-6' : ''} ${
          selectedModuleId === module.id 
            ? 'bg-gradient-to-r from-blue-100 to-indigo-100 border-blue-400 shadow-md' 
            : 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200'
        }`}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 flex-1">
                {hasChildren && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleModule(module.id)}
                    className="p-1 h-6 w-6"
                  >
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                  </Button>
                )}
                
                <div className="flex items-center gap-2">
                  {hasChildren ? (
                    isExpanded ? (
                      <FolderOpen className="w-5 h-5 text-blue-600" />
                    ) : (
                      <Folder className="w-5 h-5 text-blue-600" />
                    )
                  ) : (
                    <Package className="w-5 h-5 text-indigo-600" />
                  )}
                  
                  {module.modCode && (
                    <Badge variant="outline" className="text-xs font-mono">
                      {module.modCode}
                    </Badge>
                  )}
                </div>

                <div className="flex-1">
                  {isEditing ? (
                    <div className="space-y-2">
                      <Input
                        value={editData.name || ''}
                        onChange={(e) => setEditingData(prev => ({
                          ...prev,
                          [module.id]: { ...prev[module.id], name: e.target.value }
                        }))}
                        className="text-sm"
                        placeholder="模組名稱"
                      />
                      <Textarea
                        value={editData.description || ''}
                        onChange={(e) => setEditingData(prev => ({
                          ...prev,
                          [module.id]: { ...prev[module.id], description: e.target.value }
                        }))}
                        className="text-sm"
                        placeholder="模組描述"
                        rows={2}
                      />
                    </div>
                  ) : (
                    <div>
                      <h4 className="font-medium text-gray-900">{module.name}</h4>
                      {module.description && (
                        <p className="text-sm text-gray-600 mt-1">{module.description}</p>
                      )}
                      {module.useCaseCount !== undefined && (
                        <div className="flex items-center gap-2 mt-2">
                          <FileText className="w-3 h-3 text-gray-400" />
                          <span className="text-xs text-gray-500">
                            {module.useCaseCount} 個使用案例
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1">
                {isEditing ? (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => cancelEdit(module.id)}
                      className="h-8 px-2"
                    >
                      取消
                    </Button>
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => saveEdit(module.id)}
                      className="h-8 px-2"
                    >
                      儲存
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => startEdit(module)}
                      className="h-8 w-8 p-0"
                    >
                      <Edit3 className="w-3 h-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(module.id)}
                      className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 子模組 */}
        {hasChildren && isExpanded && (
          <div className="space-y-2">
            {module.children!.map(child => renderModuleItem(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col">
      <ScrollArea className="flex-1">
        <div className="p-6 space-y-6">
          {/* 頁面標題 */}
          <div className="flex items-center gap-3">
            <Building className="w-6 h-6 text-blue-600" />
            <div>
              <h2 className="text-xl font-semibold">模組管理</h2>
              <p className="text-sm text-gray-600">管理專案的功能模組結構</p>
            </div>
          </div>

          {/* 模組列表 */}
          <div className="space-y-4">
            {modules.length > 0 ? (
              modules.map(module => renderModuleItem(module))
            ) : (
              <Card className="p-8 text-center border-dashed border-2">
                <Building className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">尚無模組</h3>
                <p className="text-gray-600">使用左上角的「新增」按鈕來建立您的第一個功能模組</p>
              </Card>
            )}
          </div>
        </div>
      </ScrollArea>

      {/* 新增模組對話框 */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>新增模組</DialogTitle>
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
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="module-description">模組描述</Label>
              <Textarea
                id="module-description"
                value={newModule.description}
                onChange={(e) => setNewModule(prev => ({ ...prev, description: e.target.value }))}
                placeholder="請輸入模組描述"
                rows={3}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="parent-module">父模組</Label>
              <Select
                value={newModule.parentId || ''}
                onValueChange={(value) => setNewModule(prev => ({ 
                  ...prev, 
                  parentId: value || null 
                }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="選擇父模組（可選）" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">無父模組（頂層模組）</SelectItem>
                  {getFlatModules(modules).map(({ module, level }) => (
                    <SelectItem key={module.id} value={module.id}>
                      {'　'.repeat(level)}{module.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => {
                setIsAddDialogOpen(false);
                setNewModule({ name: '', description: '', parentId: null });
              }}
            >
              取消
            </Button>
            <Button
              onClick={handleAddModule}
              disabled={!newModule.name.trim()}
            >
              <Plus className="w-4 h-4 mr-2" />
              新增模組
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}