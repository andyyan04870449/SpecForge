import React, { useState, useRef, useEffect } from 'react';
import { Card, Button, Space, Tag, Collapse, Badge, Checkbox, message, Avatar, Tooltip, Progress, Input, Tabs, Modal, Spin } from 'antd';
import { 
  RobotOutlined, 
  CheckCircleOutlined, 
  CloseCircleOutlined,
  BulbOutlined,
  ApiOutlined,
  ProfileOutlined,
  PartitionOutlined,
  FileTextOutlined,
  FolderOpenOutlined,
  SendOutlined,
  UserOutlined,
  EyeOutlined,
  CodeOutlined,
  FileSearchOutlined
} from '@ant-design/icons';
import MermaidRenderer from '../components/MermaidRenderer';
import './AIChatAssistant.css';

const { Panel } = Collapse;
const { TextArea } = Input;
const { TabPane } = Tabs;

interface SuggestionCard {
  id: string;
  type: 'MODULE' | 'USE_CASE' | 'SEQUENCE' | 'API' | 'DTO';
  action: 'CREATE' | 'UPDATE';
  code: string;
  title: string;
  description?: string;
  content?: any; // 完整內容用於預覽
  parentId?: string;
  dependencies?: string[];
  conflicts?: string[];
  selected: boolean;
  preview?: {
    before?: string;
    after: string;
  };
  children?: SuggestionCard[];
}

interface ChatMessage {
  id: string;
  type: 'user' | 'ai' | 'suggestions';
  content: string;
  suggestions?: SuggestionCard[];
  timestamp: Date;
}

const AIChatAssistant: React.FC = () => {
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      type: 'user',
      content: '我需要設計一個電商系統的用戶認證和訂單管理功能',
      timestamp: new Date()
    },
    {
      id: '2',
      type: 'ai',
      content: '我已經分析了您的需求，為您生成了完整的系統設計建議。包含2個模組、6個使用案例、相關的循序圖和API設計。請檢視下方的設計建議卡片。',
      timestamp: new Date()
    }
  ]);

  const [userInput, setUserInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [previewModal, setPreviewModal] = useState<{
    visible: boolean;
    card: SuggestionCard | null;
  }>({ visible: false, card: null });
  
  const chatEndRef = useRef<HTMLDivElement>(null);

  // 示例建議資料（包含完整內容）
  const [currentSuggestions, setCurrentSuggestions] = useState<SuggestionCard[]>([
    {
      id: '1',
      type: 'MODULE',
      action: 'CREATE',
      code: 'MOD-001',
      title: '用戶認證模組',
      description: '處理用戶登入、註冊、密碼重設等認證相關功能',
      content: {
        name: '用戶認證模組',
        description: '處理用戶登入、註冊、密碼重設等認證相關功能',
        scope: '用戶身份驗證與授權管理',
        businessCapabilities: [
          '用戶註冊與帳號創建',
          '多因素身份驗證',
          '密碼管理與重設',
          'Session與Token管理'
        ]
      },
      selected: false,
      children: [
        {
          id: '1-1',
          type: 'USE_CASE',
          action: 'CREATE',
          code: 'UC-001',
          title: '用戶登入',
          description: '用戶使用帳號密碼或第三方登入',
          content: {
            actors: ['用戶', '系統'],
            preconditions: ['用戶未登入', '用戶帳號存在'],
            mainFlow: [
              '用戶進入登入頁面',
              '輸入帳號密碼',
              '系統驗證憑證',
              '生成訪問令牌',
              '返回登入成功'
            ],
            alternativeFlow: ['密碼錯誤流程', '帳號鎖定流程'],
            postconditions: ['用戶成功登入系統']
          },
          parentId: '1',
          selected: false
        },
        {
          id: '1-2',
          type: 'USE_CASE',
          action: 'CREATE',
          code: 'UC-002',
          title: '用戶註冊',
          content: {
            actors: ['新用戶', '系統'],
            mainFlow: [
              '用戶填寫註冊表單',
              '系統驗證資料格式',
              '檢查郵箱唯一性',
              '創建用戶帳號',
              '發送驗證郵件'
            ]
          },
          parentId: '1',
          selected: false
        },
        {
          id: '1-3',
          type: 'SEQUENCE',
          action: 'CREATE',
          code: 'SD-001',
          title: '登入流程循序圖',
          content: {
            mermaid: `sequenceDiagram
    participant U as 用戶
    participant F as 前端
    participant B as 後端
    participant DB as 資料庫
    participant R as Redis
    
    U->>F: 輸入帳號密碼
    F->>B: POST /api/auth/login
    B->>DB: 查詢用戶資料
    DB-->>B: 返回用戶資料
    B->>B: 驗證密碼
    B->>R: 儲存Session
    B->>B: 生成JWT Token
    B-->>F: 返回Token和用戶資訊
    F-->>U: 顯示登入成功`
          },
          parentId: '1-1',
          selected: false
        }
      ]
    },
    {
      id: '2',
      type: 'MODULE',
      action: 'CREATE',
      code: 'MOD-002',
      title: '訂單管理模組',
      description: '處理訂單的創建、查詢、更新和取消等操作',
      content: {
        name: '訂單管理模組',
        scope: '訂單全生命週期管理'
      },
      selected: false,
      children: []
    }
  ]);

  const [apiSuggestions] = useState<SuggestionCard[]>([
    { 
      id: 'api-1', 
      type: 'API', 
      action: 'CREATE',
      code: 'API-AUTH-001', 
      title: 'POST /api/auth/login',
      content: {
        method: 'POST',
        path: '/api/auth/login',
        description: '用戶登入接口',
        request: {
          body: {
            email: 'string',
            password: 'string'
          }
        },
        response: {
          '200': {
            token: 'string',
            refreshToken: 'string',
            user: {
              id: 'string',
              email: 'string',
              name: 'string'
            }
          }
        }
      },
      selected: false 
    }
  ]);

  const [dtoSuggestions] = useState<SuggestionCard[]>([
    { 
      id: 'dto-1', 
      type: 'DTO', 
      action: 'CREATE',
      code: 'DTO-LoginRequest-001', 
      title: 'LoginRequest',
      content: {
        type: 'object',
        properties: {
          email: { type: 'string', format: 'email', description: '用戶郵箱' },
          password: { type: 'string', minLength: 8, description: '用戶密碼' },
          rememberMe: { type: 'boolean', description: '記住登入狀態' }
        },
        required: ['email', 'password']
      },
      selected: false 
    }
  ]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const handleSendMessage = () => {
    if (!userInput.trim()) return;

    const newUserMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: userInput,
      timestamp: new Date()
    };

    setChatMessages(prev => [...prev, newUserMessage]);
    setUserInput('');
    setIsLoading(true);

    // 模擬AI回應
    setTimeout(() => {
      const aiResponse: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: '我正在分析您的需求並生成設計建議...',
        timestamp: new Date()
      };
      setChatMessages(prev => [...prev, aiResponse]);
      setIsLoading(false);
    }, 1500);
  };

  const handlePreview = (card: SuggestionCard) => {
    setPreviewModal({ visible: true, card });
  };

  const renderPreviewContent = (card: SuggestionCard) => {
    if (!card.content) return <p>無預覽內容</p>;

    switch (card.type) {
      case 'MODULE':
        return (
          <div className="preview-content">
            <h3>{card.content.name}</h3>
            <p>{card.content.description}</p>
            {card.content.businessCapabilities && (
              <div>
                <h4>業務能力：</h4>
                <ul>
                  {card.content.businessCapabilities.map((cap: string, idx: number) => (
                    <li key={idx}>{cap}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        );
      
      case 'USE_CASE':
        return (
          <div className="preview-content">
            <h4>參與者：</h4>
            <p>{card.content.actors?.join(', ')}</p>
            <h4>前置條件：</h4>
            <ul>
              {card.content.preconditions?.map((pre: string, idx: number) => (
                <li key={idx}>{pre}</li>
              ))}
            </ul>
            <h4>主要流程：</h4>
            <ol>
              {card.content.mainFlow?.map((flow: string, idx: number) => (
                <li key={idx}>{flow}</li>
              ))}
            </ol>
          </div>
        );

      case 'SEQUENCE':
        return (
          <div className="preview-content">
            <MermaidRenderer chart={card.content.mermaid} />
          </div>
        );

      case 'API':
        return (
          <div className="preview-content">
            <pre className="api-preview">
              <code>{JSON.stringify(card.content, null, 2)}</code>
            </pre>
          </div>
        );

      case 'DTO':
        return (
          <div className="preview-content">
            <pre className="dto-preview">
              <code>{JSON.stringify(card.content, null, 2)}</code>
            </pre>
          </div>
        );

      default:
        return <p>無法預覽此類型</p>;
    }
  };

  const renderSuggestionCard = (card: SuggestionCard) => {
    const typeConfig = {
      MODULE: { icon: <FolderOpenOutlined />, color: '#1890ff' },
      USE_CASE: { icon: <ProfileOutlined />, color: '#52c41a' },
      SEQUENCE: { icon: <PartitionOutlined />, color: '#722ed1' },
      API: { icon: <ApiOutlined />, color: '#fa8c16' },
      DTO: { icon: <FileTextOutlined />, color: '#eb2f96' }
    };

    const config = typeConfig[card.type];

    return (
      <Card 
        key={card.id}
        className="suggestion-card"
        size="small"
        style={{ marginBottom: 12 }}
      >
        <div className="card-content">
          <div className="card-header">
            <Checkbox 
              checked={card.selected}
              onChange={(e) => {
                // 更新選擇狀態
                const updateSelection = (cards: SuggestionCard[]): SuggestionCard[] => {
                  return cards.map(c => {
                    if (c.id === card.id) {
                      return { ...c, selected: e.target.checked };
                    }
                    if (c.children) {
                      return { ...c, children: updateSelection(c.children) };
                    }
                    return c;
                  });
                };
                setCurrentSuggestions(updateSelection(currentSuggestions));
              }}
            >
              <Space>
                <span style={{ color: config.color }}>{config.icon}</span>
                <Tag color={card.action === 'CREATE' ? 'green' : 'blue'}>
                  {card.action === 'CREATE' ? '新增' : '更新'}
                </Tag>
                <strong>{card.code}</strong> - {card.title}
              </Space>
            </Checkbox>
            <Button 
              type="link" 
              icon={<EyeOutlined />} 
              size="small"
              onClick={() => handlePreview(card)}
            >
              預覽
            </Button>
          </div>
          {card.description && (
            <p className="card-description">{card.description}</p>
          )}
          {card.conflicts && card.conflicts.length > 0 && (
            <Tooltip title={card.conflicts[0]}>
              <Tag color="warning">衝突</Tag>
            </Tooltip>
          )}
          {card.children && card.children.length > 0 && (
            <Collapse ghost className="nested-cards">
              <Panel header={`包含 ${card.children.length} 個子項`} key="1">
                {card.children.map(child => renderSuggestionCard(child))}
              </Panel>
            </Collapse>
          )}
        </div>
      </Card>
    );
  };

  const handleApplySelections = () => {
    const countSelected = (cards: SuggestionCard[]): number => {
      return cards.reduce((acc, card) => {
        const selfCount = card.selected ? 1 : 0;
        const childCount = card.children ? countSelected(card.children) : 0;
        return acc + selfCount + childCount;
      }, 0);
    };

    const totalSelected = countSelected(currentSuggestions) + 
                         countSelected(apiSuggestions) + 
                         countSelected(dtoSuggestions);

    if (totalSelected === 0) {
      message.warning('請至少選擇一項建議');
      return;
    }

    message.success(`成功套用 ${totalSelected} 項設計建議`);
  };

  return (
    <div className="ai-chat-assistant">
      <div className="chat-main-container">
        {/* 左側聊天區域 */}
        <div className="chat-section">
          <Card className="chat-card">
            <div className="chat-header">
              <Space>
                <RobotOutlined style={{ fontSize: 20, color: '#1890ff' }} />
                <span className="chat-title">AI 設計助手</span>
              </Space>
            </div>
            
            <div className="chat-messages-container">
              {chatMessages.map(msg => (
                <div key={msg.id} className={`chat-message ${msg.type}`}>
                  <Avatar 
                    icon={msg.type === 'user' ? <UserOutlined /> : <RobotOutlined />}
                    style={{ 
                      backgroundColor: msg.type === 'user' ? '#87d068' : '#1890ff' 
                    }}
                  />
                  <div className="message-bubble">
                    <p>{msg.content}</p>
                    <span className="message-time">
                      {msg.timestamp.toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="chat-message ai">
                  <Avatar icon={<RobotOutlined />} style={{ backgroundColor: '#1890ff' }} />
                  <div className="message-bubble">
                    <Spin size="small" />
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            <div className="chat-input-container">
              <TextArea
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                onPressEnter={(e) => {
                  if (!e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder="請描述您的需求..."
                autoSize={{ minRows: 2, maxRows: 4 }}
                style={{ marginBottom: 8 }}
              />
              <Button 
                type="primary" 
                icon={<SendOutlined />}
                onClick={handleSendMessage}
                loading={isLoading}
                block
              >
                發送
              </Button>
            </div>
          </Card>
        </div>

        {/* 右側建議卡片區域 */}
        <div className="suggestions-section">
          <Card className="suggestions-card">
            <div className="suggestions-header">
              <Space>
                <BulbOutlined style={{ fontSize: 18, color: '#faad14' }} />
                <span className="suggestions-title">設計建議</span>
              </Space>
              <Space>
                <Tag color="blue">模組 2</Tag>
                <Tag color="green">用例 3</Tag>
                <Tag color="purple">循序圖 1</Tag>
                <Tag color="orange">API 1</Tag>
                <Tag color="magenta">DTO 1</Tag>
              </Space>
            </div>

            <Tabs defaultActiveKey="all" className="suggestions-tabs">
              <TabPane tab="全部建議" key="all">
                <div className="suggestions-list">
                  {currentSuggestions.map(card => renderSuggestionCard(card))}
                  {apiSuggestions.map(card => renderSuggestionCard(card))}
                  {dtoSuggestions.map(card => renderSuggestionCard(card))}
                </div>
              </TabPane>
              <TabPane tab="模組與用例" key="modules">
                <div className="suggestions-list">
                  {currentSuggestions.map(card => renderSuggestionCard(card))}
                </div>
              </TabPane>
              <TabPane tab="API" key="apis">
                <div className="suggestions-list">
                  {apiSuggestions.map(card => renderSuggestionCard(card))}
                </div>
              </TabPane>
              <TabPane tab="DTO" key="dtos">
                <div className="suggestions-list">
                  {dtoSuggestions.map(card => renderSuggestionCard(card))}
                </div>
              </TabPane>
            </Tabs>

            <div className="suggestions-actions">
              <Space>
                <Button 
                  type="primary" 
                  icon={<CheckCircleOutlined />}
                  onClick={handleApplySelections}
                  size="large"
                >
                  套用選中建議
                </Button>
                <Button 
                  icon={<CloseCircleOutlined />}
                  size="large"
                >
                  忽略全部
                </Button>
              </Space>
            </div>
          </Card>
        </div>
      </div>

      {/* 預覽Modal */}
      <Modal
        title={
          <Space>
            <FileSearchOutlined />
            預覽：{previewModal.card?.code} - {previewModal.card?.title}
          </Space>
        }
        visible={previewModal.visible}
        onCancel={() => setPreviewModal({ visible: false, card: null })}
        width={800}
        footer={[
          <Button key="close" onClick={() => setPreviewModal({ visible: false, card: null })}>
            關閉
          </Button>,
          <Button 
            key="apply" 
            type="primary"
            onClick={() => {
              if (previewModal.card) {
                // 更新選擇狀態
                const updateSelection = (cards: SuggestionCard[]): SuggestionCard[] => {
                  return cards.map(c => {
                    if (c.id === previewModal.card!.id) {
                      return { ...c, selected: true };
                    }
                    if (c.children) {
                      return { ...c, children: updateSelection(c.children) };
                    }
                    return c;
                  });
                };
                setCurrentSuggestions(updateSelection(currentSuggestions));
                message.success('已選擇此項建議');
                setPreviewModal({ visible: false, card: null });
              }
            }}
          >
            選擇此建議
          </Button>
        ]}
      >
        {previewModal.card && renderPreviewContent(previewModal.card)}
      </Modal>
    </div>
  );
};

export default AIChatAssistant;