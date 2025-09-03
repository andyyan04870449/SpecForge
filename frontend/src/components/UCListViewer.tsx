import { useState } from 'react';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { ScrollArea } from './ui/scroll-area';
import { 
  Edit3, 
  Trash2, 
  FileText,
  Clock,
  Tag
} from 'lucide-react';

// 簡化的UC資料介面，只包含資料庫實際欄位
export interface SimpleUCData {
  id: string;
  title: string;
  summary?: string;
  ucCode?: string;
  module?: {
    id: string;
    title: string;
    modCode?: string;
  };
  createdAt: string;
  updatedAt: string;
}

interface UCListViewerProps {
  useCases: SimpleUCData[];
  selectedUCId?: string;
  onSelectUC?: (uc: SimpleUCData) => void;
  onUpdateUC?: (id: string, data: Partial<SimpleUCData>) => Promise<void>;
  onDeleteUC?: (id: string) => Promise<void>;
  isEditing?: boolean;
  onSave?: () => Promise<void>;
  onCancel?: () => void;
}

export default function UCListViewer({ 
  useCases,
  selectedUCId,
  onSelectUC,
  onUpdateUC, 
  onDeleteUC,
  isEditing = false,
  onSave,
  onCancel
}: UCListViewerProps) {
  const [editingUC, setEditingUC] = useState<string | null>(null);
  const [editingData, setEditingData] = useState<Record<string, Partial<SimpleUCData>>>({});

  // 開始編輯UC
  const startEdit = (uc: SimpleUCData) => {
    setEditingUC(uc.id);
    setEditingData(prev => ({
      ...prev,
      [uc.id]: {
        title: uc.title,
        summary: uc.summary
      }
    }));
  };

  // 取消編輯
  const cancelEdit = (ucId: string) => {
    setEditingUC(null);
    setEditingData(prev => {
      const newData = { ...prev };
      delete newData[ucId];
      return newData;
    });
  };

  // 儲存編輯
  const saveEdit = async (ucId: string) => {
    const data = editingData[ucId];
    if (!data || !onUpdateUC) return;

    try {
      await onUpdateUC(ucId, data);
      setEditingUC(null);
      setEditingData(prev => {
        const newData = { ...prev };
        delete newData[ucId];
        return newData;
      });
    } catch (error) {
      console.error('更新使用案例失敗:', error);
    }
  };

  // 刪除UC
  const handleDelete = async (ucId: string) => {
    if (!onDeleteUC) return;
    
    if (confirm('確定要刪除此使用案例嗎？此操作無法復原。')) {
      try {
        await onDeleteUC(ucId);
      } catch (error) {
        console.error('刪除使用案例失敗:', error);
      }
    }
  };

  // 格式化日期
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  };

  // 渲染UC項目
  const renderUCItem = (uc: SimpleUCData) => {
    const isEditing = editingUC === uc.id;
    const editData = editingData[uc.id] || {};
    const isSelected = selectedUCId === uc.id;

    return (
      <Card 
        key={uc.id} 
        className={`cursor-pointer transition-all ${
          isSelected
            ? 'bg-gradient-to-r from-green-100 to-emerald-100 border-green-400 shadow-md' 
            : 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-200 hover:shadow-sm'
        }`}
        onClick={() => !isEditing && onSelectUC?.(uc)}
      >
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 flex-1">
              <FileText className="w-5 h-5 text-green-600 shrink-0" />
              
              {/* UC代碼 */}
              {uc.ucCode && (
                <Badge variant="outline" className="text-xs font-mono">
                  {uc.ucCode}
                </Badge>
              )}

              <div className="flex-1 min-w-0">
                {isEditing ? (
                  <div className="space-y-2">
                    <Input
                      value={editData.title || ''}
                      onChange={(e) => setEditingData(prev => ({
                        ...prev,
                        [uc.id]: { ...prev[uc.id], title: e.target.value }
                      }))}
                      className="text-sm"
                      placeholder="使用案例標題"
                      onClick={(e) => e.stopPropagation()}
                    />
                    <Textarea
                      value={editData.summary || ''}
                      onChange={(e) => setEditingData(prev => ({
                        ...prev,
                        [uc.id]: { ...prev[uc.id], summary: e.target.value }
                      }))}
                      className="text-sm"
                      placeholder="使用案例摘要"
                      rows={2}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                ) : (
                  <div className="min-w-0">
                    <h4 className="font-medium text-gray-900 truncate">{uc.title}</h4>
                    {uc.summary && (
                      <p className="text-sm text-gray-600 mt-1 overflow-hidden" style={{
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical'
                      }}>{uc.summary}</p>
                    )}
                    
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                      {/* 模組資訊 */}
                      {uc.module && (
                        <div className="flex items-center gap-1">
                          <Tag className="w-3 h-3" />
                          <span>{uc.module.title}</span>
                        </div>
                      )}
                      
                      {/* 更新時間 */}
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>更新於 {formatDate(uc.updatedAt)}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 操作按鈕 */}
            <div className="flex items-center gap-1 shrink-0">
              {isEditing ? (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      cancelEdit(uc.id);
                    }}
                    className="h-8 px-2"
                  >
                    取消
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      saveEdit(uc.id);
                    }}
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
                    onClick={(e) => {
                      e.stopPropagation();
                      startEdit(uc);
                    }}
                    className="h-8 w-8 p-0"
                  >
                    <Edit3 className="w-3 h-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(uc.id);
                    }}
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
    );
  };

  return (
    <div className="h-full flex flex-col">
      <ScrollArea className="flex-1">
        <div className="p-6 space-y-6">
          {/* 頁面標題 */}
          <div className="flex items-center gap-3">
            <FileText className="w-6 h-6 text-green-600" />
            <div>
              <h2 className="text-xl font-semibold">使用案例管理</h2>
              <p className="text-sm text-gray-600">檢視和管理專案中的所有使用案例</p>
            </div>
          </div>

          {/* UC列表 */}
          <div className="space-y-4">
            {useCases.length > 0 ? (
              useCases.map(uc => renderUCItem(uc))
            ) : (
              <Card className="p-8 text-center border-dashed border-2">
                <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">尚無使用案例</h3>
                <p className="text-gray-600">使用左上角的「新增」按鈕來建立您的第一個使用案例</p>
              </Card>
            )}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}