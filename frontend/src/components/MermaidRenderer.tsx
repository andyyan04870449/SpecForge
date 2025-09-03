import { useEffect, useRef, useState } from 'react';
import { Alert, AlertDescription } from './ui/alert';
import { AlertTriangle, ZoomIn, ZoomOut, Maximize2, Move } from 'lucide-react';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { Button } from './ui/button';

interface MermaidRendererProps {
  chart: string;
  className?: string;
}

export default function MermaidRenderer({ chart, className = '' }: MermaidRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [svg, setSvg] = useState<string>('');
  
  useEffect(() => {
    if (!chart || !chart.trim()) {
      console.log('[MermaidRenderer] No chart content');
      setSvg('');
      return;
    }

    const renderChart = async () => {
      try {
        console.log('[MermaidRenderer] Starting render...');
        setError(null);
        setSvg('');
        
        // 動態導入 mermaid
        const mermaid = (await import('mermaid')).default;
        
        // 初始化 mermaid
        mermaid.initialize({
          startOnLoad: false,
          theme: 'default',
          securityLevel: 'loose',
          fontFamily: 'inherit',
          fontSize: 14,
          logLevel: 'fatal',
          suppressErrorRendering: true,
          deterministicIds: true,
          maxTextSize: 50000,
          sequence: {
            diagramMarginX: 50,
            diagramMarginY: 10,
            actorMargin: 50,
            width: 150,
            height: 65,
            boxMargin: 10,
            boxTextMargin: 5,
            noteMargin: 10,
            messageMargin: 35,
            mirrorActors: false,
            bottomMarginAdj: 1,
            useMaxWidth: true,
            rightAngles: false,
            showSequenceNumbers: false,
            wrap: true
          },
          flowchart: {
            useMaxWidth: true,
            htmlLabels: true,
          }
        });
        
        // 生成唯一 ID
        const id = `mermaid-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        console.log('[MermaidRenderer] Rendering chart...');
        
        // 使用 mermaid.render 生成 SVG
        const { svg: generatedSvg } = await mermaid.render(id, chart.trim());
        
        console.log('[MermaidRenderer] SVG generated successfully');
        setSvg(generatedSvg);
        
      } catch (err) {
        console.error('[MermaidRenderer] Error:', err);
        setError(err instanceof Error ? err.message : '圖表渲染失敗');
        setSvg('');
      }
    };

    renderChart();
  }, [chart]);
  
  // 如果沒有圖表內容，顯示提示
  if (!chart || !chart.trim()) {
    return (
      <div className={`flex items-center justify-center p-8 text-muted-foreground ${className}`}>
        <div className="text-center">
          <AlertTriangle className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>請輸入 Mermaid 圖表語法</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`p-4 ${className}`}>
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-2">
              <div>錯誤: {error}</div>
              <details className="text-xs opacity-75">
                <summary className="cursor-pointer">顯示原始內容</summary>
                <pre className="mt-2 whitespace-pre-wrap bg-muted p-2 rounded text-xs">
                  {chart}
                </pre>
              </details>
            </div>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!svg) {
    return (
      <div className={`flex items-center justify-center p-8 ${className}`}>
        <div className="text-center text-muted-foreground">
          <div className="w-6 h-6 border-2 border-current border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
          <p>正在渲染圖表...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`h-full w-full relative ${className}`}>
      <TransformWrapper
        initialScale={1}
        minScale={0.1}
        maxScale={5}
        centerOnInit={true}
        wheel={{ step: 0.15 }}
        doubleClick={{ disabled: false, step: 0.75 }}
        panning={{ velocityDisabled: false }}
        limitToBounds={false}
        centerZoomedOut={false}
      >
        {({ zoomIn, zoomOut, resetTransform, centerView }) => (
          <>
            {/* 控制按鈕 */}
            <div className="absolute top-4 left-4 z-10 flex gap-2 bg-background/80 backdrop-blur-sm rounded-lg p-2 shadow-lg">
              <Button
                variant="outline"
                size="icon"
                onClick={() => zoomIn()}
                title="放大"
                className="h-8 w-8"
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => zoomOut()}
                title="縮小"
                className="h-8 w-8"
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => {
                  resetTransform();
                  centerView();
                }}
                title="重置視圖"
                className="h-8 w-8"
              >
                <Maximize2 className="h-4 w-4" />
              </Button>
            </div>
            
            {/* 提示訊息 */}
            <div className="absolute bottom-4 left-4 z-10 text-xs text-muted-foreground bg-background/80 backdrop-blur-sm rounded-lg px-3 py-2 shadow-lg">
              <div className="flex items-center gap-2">
                <Move className="h-3 w-3" />
                <span>滑鼠拖曳移動 • 滾輪縮放 • 雙擊放大</span>
              </div>
            </div>
            
            {/* 可縮放的內容區域 */}
            <TransformComponent
              wrapperStyle={{
                width: '100%',
                height: '100%',
              }}
              contentStyle={{
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <div 
                ref={containerRef}
                className="mermaid-container"
                style={{ 
                  cursor: 'move',
                  userSelect: 'none',
                }}
                dangerouslySetInnerHTML={{ __html: svg }}
              />
            </TransformComponent>
          </>
        )}
      </TransformWrapper>
    </div>
  );
}