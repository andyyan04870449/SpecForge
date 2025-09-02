import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Alert, AlertDescription } from './ui/alert';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from './ui/resizable';
import { Code, X, AlertTriangle } from 'lucide-react';
import MermaidRenderer from './MermaidRenderer';

interface MermaidCanvasProps {
  initialContent?: string;
  onContentChange?: (content: string) => void;
  title?: string;
  isEditing?: boolean;
}

export default function MermaidCanvas({ initialContent = '', onContentChange, title, isEditing = false }: MermaidCanvasProps) {
  const [showCodeEditor, setShowCodeEditor] = useState(true); // 預設顯示代碼編輯器
  const [mermaidCode, setMermaidCode] = useState(initialContent || getDefaultContent());
  const [error, setError] = useState<string | null>(null);

  // 提供預設範例
  function getDefaultContent() {
    return `sequenceDiagram
    autonumber
    actor 使用者 as 使用者（瀏覽器）
    participant 前端 as 前端（登入頁）
    participant API as API Gateway
    participant 驗證服務 as 驗證服務
    participant 使用者資料庫 as 使用者資料庫
    
    使用者->>前端: 開啟登入頁
    使用者->>前端: 輸入帳號與密碼
    
    前端->>API: POST /auth/login（API-AUTH-01, DTO-AUTH-01）
    API->>驗證服務: 驗證憑證
    驗證服務->>使用者資料庫: 查詢使用者
    使用者資料庫-->>驗證服務: 回傳使用者紀錄
    驗證服務->>驗證服務: 檢查密碼與狀態
    
    alt 登入成功
        驗證服務-->>API: 成功
        API-->>前端: 200 登入成功（API-AUTH-01, DTO-AUTH-02）
        前端-->>前端: 儲存權杖並導向 /projects
    else 登入失敗
        驗證服務-->>API: 失敗
        API-->>前端: 401 無效憑證（API-AUTH-01, DTO-COMMON-01）
        前端-->>使用者: 顯示錯誤訊息
    end`;
  }

  // 當初始內容變化時更新代碼
  useEffect(() => {
    if (initialContent) {
      setMermaidCode(initialContent);
    }
  }, [initialContent]);

  const handleCodeChange = (newCode: string) => {
    setMermaidCode(newCode);
    setError(null);
    onContentChange?.(newCode);
  };

  const handleMermaidError = (errorMsg: string) => {
    setError(errorMsg);
  };

  // 監聽來自 MermaidRenderer 的錯誤
  useEffect(() => {
    const handleError = (event: any) => {
      if (event.detail && event.detail.type === 'mermaid-error') {
        setError(event.detail.message);
      }
    };

    window.addEventListener('mermaid-error', handleError);
    return () => {
      window.removeEventListener('mermaid-error', handleError);
    };
  }, []);

  return (
    <div className="h-full w-full flex flex-col">
      {/* 頂部工具列 */}
      <div className="absolute top-2 right-2 z-20">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowCodeEditor(!showCodeEditor)}
          className="bg-background/80 backdrop-blur-sm"
          title={showCodeEditor ? "隱藏代碼編輯器" : "顯示代碼編輯器"}
        >
          {showCodeEditor ? (
            <>
              <X className="w-4 h-4 mr-1" />
              隱藏代碼
            </>
          ) : (
            <>
              <Code className="w-4 h-4 mr-1" />
              顯示代碼
            </>
          )}
        </Button>
      </div>

      {/* 主要內容區域 - 充滿整個可用空間 */}
      {showCodeEditor ? (
        <ResizablePanelGroup direction="horizontal" className="h-full w-full">
          {/* Mermaid 畫布 */}
          <ResizablePanel defaultSize={65} minSize={30}>
            <div className="h-full w-full flex flex-col">
              {mermaidCode.trim() ? (
                <MermaidRenderer
                  chart={mermaidCode}
                  className="h-full w-full"
                />
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <Code className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>請在右側輸入 Mermaid 代碼</p>
                  </div>
                </div>
              )}
              
              {/* 錯誤訊息 */}
              {error && (
                <div className="p-4 border-t">
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      {error}
                    </AlertDescription>
                  </Alert>
                </div>
              )}
            </div>
          </ResizablePanel>

          <ResizableHandle />

          {/* 代碼編輯器 */}
          <ResizablePanel defaultSize={35} minSize={20} maxSize={70}>
            <div className="h-full flex flex-col border-l bg-muted/30">
              <div className="p-3 border-b">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium">Mermaid 代碼</h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowCodeEditor(false)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              
              <div className="flex-1 p-3 min-h-0">
                <Textarea
                  placeholder={`sequenceDiagram
participant A as Alice
participant B as Bob
A->>B: Hello Bob
B-->>A: Hello Alice`}
                  value={mermaidCode}
                  onChange={(e) => handleCodeChange(e.target.value)}
                  className="h-full w-full resize-none bg-background font-mono text-sm overflow-auto"
                  style={{
                    whiteSpace: 'pre',
                    overflowWrap: 'normal',
                    wordBreak: 'normal'
                  }}
                />
              </div>
              
              {!mermaidCode.trim() && (
                <div className="p-3 pt-0 text-xs text-muted-foreground">
                  💡 提示：您可以編輯上方的 Mermaid 代碼來創建自己的圖表
                </div>
              )}
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      ) : (
        // 全螢幕 Mermaid 畫布
        <div className="h-full w-full flex flex-col">
          {mermaidCode.trim() ? (
            <MermaidRenderer
              chart={mermaidCode}
              className="h-full w-full"
            />
          ) : (
            <div className="h-full flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <Code className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>點擊右上角代碼圖標開始編輯</p>
              </div>
            </div>
          )}
          
          {/* 錯誤訊息 */}
          {error && (
            <div className="p-4 border-t">
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  {error}
                </AlertDescription>
              </Alert>
            </div>
          )}
        </div>
      )}
    </div>
  );
}