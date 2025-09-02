import { useState } from 'react';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { ScrollArea } from './ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { MessageSquare, Plus, X, Minimize2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ChatMessage {
  id: string;
  message: string;
  isUser: boolean;
  timestamp: Date;
}

interface FloatingChatBotProps {
  chatMessages: ChatMessage[];
  chatInput: string;
  setChatInput: (value: string) => void;
  onSendMessage: () => void;
}

export default function FloatingChatBot({ 
  chatMessages, 
  chatInput, 
  setChatInput, 
  onSendMessage 
}: FloatingChatBotProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSendMessage();
    }
  };

  const toggleExpanded = () => {
    if (isMinimized) {
      setIsMinimized(false);
    }
    setIsExpanded(!isExpanded);
  };

  const toggleMinimized = () => {
    setIsMinimized(!isMinimized);
    if (isExpanded) {
      setIsExpanded(false);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {/* 最小化模式：只顯示一個圓形按鈕 */}
      {isMinimized && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          exit={{ scale: 0 }}
          className="relative"
        >
          <Button
            onClick={toggleExpanded}
            className="w-14 h-14 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 bg-primary hover:bg-primary/90"
          >
            <MessageSquare className="w-6 h-6" />
          </Button>
          {/* 通知點 */}
          {chatMessages.length > 1 && (
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center animate-pulse">
              {chatMessages.filter(msg => !msg.isUser).length > 5 ? '5+' : chatMessages.filter(msg => !msg.isUser).length}
            </div>
          )}
        </motion.div>
      )}

      {/* 展開模式：顯示完整的對話框 */}
      <AnimatePresence>
        {isExpanded && !isMinimized && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            transition={{ duration: 0.2 }}
          >
            <Card className="w-96 h-[500px] shadow-2xl border-2 backdrop-blur-sm bg-background/95">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <MessageSquare className="w-5 h-5" />
                    AI 系統分析助手
                  </CardTitle>
                  <div className="flex gap-1">
                    <Button
                      onClick={toggleMinimized}
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                    >
                      <Minimize2 className="w-4 h-4" />
                    </Button>
                    <Button
                      onClick={toggleExpanded}
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="p-4 h-full flex flex-col">
                {/* 訊息區域 */}
                <ScrollArea className="flex-1 mb-4 pr-4">
                  <div className="space-y-3">
                    {chatMessages.map(msg => (
                      <motion.div
                        key={msg.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                        className={`p-3 rounded-lg text-sm max-w-[280px] break-words ${
                          msg.isUser 
                            ? 'bg-primary text-primary-foreground ml-auto' 
                            : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        <div className="whitespace-pre-wrap">{msg.message}</div>
                        <div className={`text-xs mt-1 opacity-70 ${
                          msg.isUser ? 'text-right' : 'text-left'
                        }`}>
                          {msg.timestamp.toLocaleTimeString([], { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </ScrollArea>
                
                {/* 輸入區域 */}
                <div className="flex gap-2 mt-auto">
                  <Textarea
                    placeholder="描述您需要的系統分析文檔..."
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="flex-1 min-h-0 resize-none bg-muted/50 border-border/50 focus:border-primary/50 transition-colors"
                    rows={2}
                  />
                  <Button 
                    onClick={onSendMessage} 
                    size="sm"
                    disabled={!chatInput.trim()}
                    className="px-3 transition-all hover:scale-105"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 摺疊模式：顯示簡化的對話框 */}
      {!isExpanded && !isMinimized && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
        >
          <Card className="w-80 shadow-xl border backdrop-blur-sm bg-background/95">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" />
                  <span className="text-sm">AI 協作</span>
                </div>
                <div className="flex gap-1">
                  <Button
                    onClick={toggleExpanded}
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                  >
                    <MessageSquare className="w-4 h-4" />
                  </Button>
                  <Button
                    onClick={toggleMinimized}
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                  >
                    <Minimize2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              
              {/* 最近一條訊息預覽 */}
              {chatMessages.length > 0 && (
                <div className="mb-3 p-2 bg-muted/50 rounded text-xs text-muted-foreground line-clamp-2">
                  {chatMessages[chatMessages.length - 1]?.message}
                </div>
              )}
              
              <div className="flex gap-2">
                <Textarea
                  placeholder="描述您需要的系統分析文檔..."
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="flex-1 min-h-0 resize-none bg-muted/30 text-sm"
                  rows={2}
                />
                <Button 
                  onClick={onSendMessage} 
                  size="sm"
                  disabled={!chatInput.trim()}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}