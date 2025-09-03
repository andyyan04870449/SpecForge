import React, { useState, useRef, useEffect, useCallback, MouseEvent } from 'react';
import ReactFlow, { 
  Node, 
  Edge, 
  Controls, 
  Background, 
  useNodesState, 
  useEdgesState,
  ConnectionMode,
  MarkerType,
  Position,
  Handle,
  ReactFlowInstance,
  useReactFlow
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Card, Button, Input, Drawer, Space, Tag, Spin, Avatar, Tabs, Switch, Typography, Menu, Modal, Form, Select, message } from 'antd';
import { 
  RobotOutlined, 
  UserOutlined,
  SendOutlined,
  CloseOutlined,
  EyeOutlined,
  EyeInvisibleOutlined,
  EditOutlined,
  SaveOutlined,
  CodeOutlined,
  PlusOutlined,
  FolderAddOutlined,
  FileAddOutlined,
  ApiOutlined,
  ProfileOutlined,
  PartitionOutlined,
  FileTextOutlined,
  DeleteOutlined
} from '@ant-design/icons';
import MermaidRenderer from '../components/MermaidRenderer';
import './AIDesignCanvas.css';

const { TextArea } = Input;
const { TabPane } = Tabs;
const { Title, Text, Paragraph } = Typography;

// 自定義節點組件
interface NodeData {
  type: 'MODULE' | 'USE_CASE' | 'SEQUENCE' | 'API' | 'DTO';
  code: string;
  label: string;
}

const CustomNode: React.FC<{ data: NodeData }> = ({ data }) => {
  const nodeTypeColors = {
    MODULE: '#1890ff',
    USE_CASE: '#52c41a', 
    SEQUENCE: '#722ed1',
    API: '#fa8c16',
    DTO: '#eb2f96'
  };

  return (
    <div 
      className="custom-node" 
      style={{ borderColor: nodeTypeColors[data.type] }}
    >
      <Handle type="target" position={Position.Left} />
      <div className="node-header">
        <Tag color={nodeTypeColors[data.type]} style={{ margin: 0 }}>
          {data.type.replace('_', ' ')}
        </Tag>
      </div>
      <div className="node-content">
        <strong>{data.code}</strong>
        <div className="node-title">{data.label}</div>
      </div>
      <Handle type="source" position={Position.Right} />
    </div>
  );
};

const nodeTypes = {
  custom: CustomNode
};

// 定義節點層級關係
const NODE_HIERARCHY = {
  MODULE: 'USE_CASE',
  USE_CASE: 'SEQUENCE',
  SEQUENCE: 'API',
  API: 'DTO',
  DTO: null // DTO 是最後一層
};

// 生成新節點ID和代碼
const generateNodeId = (type: string, nodes: Node[]) => {
  const typePrefix = {
    MODULE: 'MD',
    USE_CASE: 'UC',
    SEQUENCE: 'SD',
    API: 'API',
    DTO: 'DTO'
  }[type];
  
  const existingNodes = nodes.filter(n => n.id.startsWith(typePrefix));
  const nextNum = existingNodes.length + 1;
  return `${typePrefix}-${nextNum}`;
};

const generateCode = (type: string, nodes: Node[]) => {
  const typePrefix = {
    MODULE: 'MOD',
    USE_CASE: 'UC',
    SEQUENCE: 'SD',
    API: 'API',
    DTO: 'DTO'
  }[type];
  
  const existingNodes = nodes.filter(n => n.data.type === type);
  const nextNum = existingNodes.length + 1;
  return `${typePrefix}-${String(nextNum).padStart(3, '0')}`;
};

// 假資料
const initialNodes: Node[] = [
  // Modules
  { id: 'MD-1', type: 'custom', position: { x: 50, y: 200 }, data: { label: '用戶認證', code: 'MOD-001', type: 'MODULE' } },
  { id: 'MD-2', type: 'custom', position: { x: 50, y: 400 }, data: { label: '訂單管理', code: 'MOD-002', type: 'MODULE' } },
  
  // Use Cases
  { id: 'UC-1', type: 'custom', position: { x: 250, y: 100 }, data: { label: '用戶登入', code: 'UC-001', type: 'USE_CASE' } },
  { id: 'UC-2', type: 'custom', position: { x: 250, y: 200 }, data: { label: '用戶註冊', code: 'UC-002', type: 'USE_CASE' } },
  { id: 'UC-3', type: 'custom', position: { x: 250, y: 300 }, data: { label: '密碼重設', code: 'UC-003', type: 'USE_CASE' } },
  { id: 'UC-4', type: 'custom', position: { x: 250, y: 400 }, data: { label: '創建訂單', code: 'UC-004', type: 'USE_CASE' } },
  { id: 'UC-5', type: 'custom', position: { x: 250, y: 500 }, data: { label: '查詢訂單', code: 'UC-005', type: 'USE_CASE' } },
  
  // Sequence Diagrams
  { id: 'SD-1', type: 'custom', position: { x: 450, y: 50 }, data: { label: '登入流程', code: 'SD-001', type: 'SEQUENCE' } },
  { id: 'SD-2', type: 'custom', position: { x: 450, y: 150 }, data: { label: '註冊流程', code: 'SD-002', type: 'SEQUENCE' } },
  { id: 'SD-3', type: 'custom', position: { x: 450, y: 250 }, data: { label: '密碼重設流程', code: 'SD-003', type: 'SEQUENCE' } },
  { id: 'SD-4', type: 'custom', position: { x: 450, y: 350 }, data: { label: '創建訂單流程', code: 'SD-004', type: 'SEQUENCE' } },
  { id: 'SD-5', type: 'custom', position: { x: 450, y: 450 }, data: { label: '查詢訂單流程', code: 'SD-005', type: 'SEQUENCE' } },
  
  // APIs
  { id: 'API-1', type: 'custom', position: { x: 650, y: 30 }, data: { label: 'POST /auth/login', code: 'API-001', type: 'API' } },
  { id: 'API-2', type: 'custom', position: { x: 650, y: 110 }, data: { label: 'POST /auth/register', code: 'API-002', type: 'API' } },
  { id: 'API-3', type: 'custom', position: { x: 650, y: 190 }, data: { label: 'POST /auth/reset', code: 'API-003', type: 'API' } },
  { id: 'API-4', type: 'custom', position: { x: 650, y: 270 }, data: { label: 'POST /orders', code: 'API-004', type: 'API' } },
  { id: 'API-5', type: 'custom', position: { x: 650, y: 350 }, data: { label: 'GET /orders/:id', code: 'API-005', type: 'API' } },
  
  // DTOs
  { id: 'DTO-1', type: 'custom', position: { x: 850, y: 10 }, data: { label: 'LoginRequest', code: 'DTO-001', type: 'DTO' } },
  { id: 'DTO-2', type: 'custom', position: { x: 850, y: 80 }, data: { label: 'LoginResponse', code: 'DTO-002', type: 'DTO' } },
  { id: 'DTO-3', type: 'custom', position: { x: 850, y: 150 }, data: { label: 'RegisterRequest', code: 'DTO-003', type: 'DTO' } },
  { id: 'DTO-4', type: 'custom', position: { x: 850, y: 220 }, data: { label: 'ResetRequest', code: 'DTO-004', type: 'DTO' } },
  { id: 'DTO-5', type: 'custom', position: { x: 850, y: 290 }, data: { label: 'CreateOrderReq', code: 'DTO-005', type: 'DTO' } },
  { id: 'DTO-6', type: 'custom', position: { x: 850, y: 360 }, data: { label: 'OrderResponse', code: 'DTO-006', type: 'DTO' } },
];

const initialEdges: Edge[] = [
  // Module to Use Cases
  { id: 'e1', source: 'MD-1', target: 'UC-1', animated: true },
  { id: 'e2', source: 'MD-1', target: 'UC-2', animated: true },
  { id: 'e3', source: 'MD-1', target: 'UC-3', animated: true },
  { id: 'e4', source: 'MD-2', target: 'UC-4', animated: true },
  { id: 'e5', source: 'MD-2', target: 'UC-5', animated: true },
  
  // Use Cases to Sequence Diagrams
  { id: 'e6', source: 'UC-1', target: 'SD-1' },
  { id: 'e7', source: 'UC-2', target: 'SD-2' },
  { id: 'e8', source: 'UC-3', target: 'SD-3' },
  { id: 'e9', source: 'UC-4', target: 'SD-4' },
  { id: 'e10', source: 'UC-5', target: 'SD-5' },
  
  // Sequence Diagrams to APIs
  { id: 'e11', source: 'SD-1', target: 'API-1' },
  { id: 'e12', source: 'SD-2', target: 'API-2' },
  { id: 'e13', source: 'SD-3', target: 'API-3' },
  { id: 'e14', source: 'SD-4', target: 'API-4' },
  { id: 'e15', source: 'SD-5', target: 'API-5' },
  
  // APIs to DTOs
  { id: 'e16', source: 'API-1', target: 'DTO-1', markerEnd: { type: MarkerType.ArrowClosed } },
  { id: 'e17', source: 'API-1', target: 'DTO-2', markerEnd: { type: MarkerType.ArrowClosed } },
  { id: 'e18', source: 'API-2', target: 'DTO-3', markerEnd: { type: MarkerType.ArrowClosed } },
  { id: 'e19', source: 'API-3', target: 'DTO-4', markerEnd: { type: MarkerType.ArrowClosed } },
  { id: 'e20', source: 'API-4', target: 'DTO-5', markerEnd: { type: MarkerType.ArrowClosed } },
  { id: 'e21', source: 'API-5', target: 'DTO-6', markerEnd: { type: MarkerType.ArrowClosed } },
];

// 詳細資料
const nodeDetails: { [key: string]: any } = {
  'MD-1': {
    type: 'MODULE',
    code: 'MOD-001',
    name: '用戶認證模組',
    description: '處理用戶登入、註冊、密碼重設等認證相關功能',
    businessCapabilities: [
      '用戶註冊與帳號創建',
      '多因素身份驗證',
      '密碼管理與重設',
      'Session與Token管理',
      '第三方登入整合'
    ],
    scope: '用戶身份驗證與授權管理'
  },
  'UC-1': {
    type: 'USE_CASE',
    code: 'UC-001',
    name: '用戶登入',
    description: '用戶使用帳號密碼或第三方登入系統',
    actors: ['用戶', '系統', '認證服務'],
    preconditions: [
      '用戶未登入',
      '用戶帳號存在且未被鎖定',
      '系統服務正常運行'
    ],
    mainFlow: [
      '用戶進入登入頁面',
      '輸入帳號（郵箱）和密碼',
      '點擊登入按鈕',
      '系統驗證憑證格式',
      '系統查詢用戶資料',
      '驗證密碼正確性',
      '生成訪問令牌和刷新令牌',
      '返回登入成功和用戶資訊'
    ],
    alternativeFlow: [
      '密碼錯誤：提示錯誤並記錄失敗次數',
      '帳號不存在：提示帳號或密碼錯誤',
      '帳號被鎖定：提示帳號已被鎖定'
    ],
    postconditions: [
      '用戶成功登入系統',
      '系統生成有效的訪問令牌',
      '記錄登入日誌'
    ]
  },
  'SD-1': {
    type: 'SEQUENCE',
    code: 'SD-001',
    name: '登入流程循序圖',
    mermaidCode: `sequenceDiagram
    participant U as 用戶
    participant F as 前端
    participant B as 後端API
    participant Auth as 認證服務
    participant DB as 資料庫
    participant Redis as 快取
    
    U->>F: 輸入帳號密碼
    F->>F: 驗證輸入格式
    F->>B: POST /api/auth/login
    Note right of B: 包含 email, password
    B->>Auth: 驗證請求
    Auth->>DB: 查詢用戶資料
    DB-->>Auth: 返回用戶資料
    Auth->>Auth: 驗證密碼(bcrypt)
    
    alt 密碼正確
        Auth->>Redis: 儲存Session
        Auth->>Auth: 生成JWT Token
        Auth-->>B: 認證成功
        B-->>F: 返回Token和用戶資訊
        F->>F: 儲存Token到LocalStorage
        F-->>U: 顯示登入成功
    else 密碼錯誤
        Auth-->>B: 認證失敗
        B-->>F: 返回401錯誤
        F-->>U: 顯示錯誤訊息
    end`
  },
  'API-1': {
    type: 'API',
    code: 'API-001',
    method: 'POST',
    path: '/api/auth/login',
    summary: '用戶登入',
    description: '驗證用戶憑證並返回訪問令牌',
    tags: ['Authentication'],
    request: {
      contentType: 'application/json',
      body: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: {
            type: 'string',
            format: 'email',
            description: '用戶郵箱',
            example: 'user@example.com'
          },
          password: {
            type: 'string',
            minLength: 8,
            description: '用戶密碼',
            example: 'password123'
          },
          rememberMe: {
            type: 'boolean',
            description: '記住登入狀態',
            default: false
          }
        }
      }
    },
    responses: {
      '200': {
        description: '登入成功',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                success: { type: 'boolean', example: true },
                data: {
                  type: 'object',
                  properties: {
                    token: { 
                      type: 'string', 
                      description: '訪問令牌',
                      example: 'eyJhbGciOiJIUzI1NiIs...'
                    },
                    refreshToken: { 
                      type: 'string', 
                      description: '刷新令牌',
                      example: 'eyJhbGciOiJIUzI1NiIs...'
                    },
                    user: {
                      type: 'object',
                      properties: {
                        id: { type: 'string' },
                        email: { type: 'string' },
                        name: { type: 'string' },
                        role: { type: 'string' }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
      '401': {
        description: '認證失敗',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                success: { type: 'boolean', example: false },
                error: {
                  type: 'object',
                  properties: {
                    code: { type: 'string', example: 'INVALID_CREDENTIALS' },
                    message: { type: 'string', example: '帳號或密碼錯誤' }
                  }
                }
              }
            }
          }
        }
      }
    }
  },
  'DTO-1': {
    type: 'DTO',
    code: 'DTO-001',
    name: 'LoginRequest',
    description: '用戶登入請求資料結構',
    schema: {
      type: 'object',
      required: ['email', 'password'],
      properties: {
        email: {
          type: 'string',
          format: 'email',
          description: '用戶郵箱',
          minLength: 5,
          maxLength: 100,
          pattern: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$'
        },
        password: {
          type: 'string',
          description: '用戶密碼',
          minLength: 8,
          maxLength: 50,
          pattern: '^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d).{8,}$'
        },
        rememberMe: {
          type: 'boolean',
          description: '是否記住登入狀態',
          default: false
        },
        deviceInfo: {
          type: 'object',
          description: '設備資訊（可選）',
          properties: {
            deviceType: { type: 'string', enum: ['web', 'mobile', 'desktop'] },
            browser: { type: 'string' },
            os: { type: 'string' }
          }
        }
      }
    }
  }
};

interface ChatMessage {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: Date;
}

const AIDesignCanvas: React.FC = () => {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedNode, setSelectedNode] = useState<any>(null);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showCode, setShowCode] = useState(false);
  const [editedContent, setEditedContent] = useState<any>({});
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);
  
  // 右鍵選單相關
  const [contextMenu, setContextMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
    node?: Node | null;
    type: 'canvas' | 'node';
  }>({
    visible: false,
    x: 0,
    y: 0,
    node: null,
    type: 'canvas'
  });
  
  // 新增節點Modal
  const [nodeModal, setNodeModal] = useState<{
    visible: boolean;
    type: string;
    parentNode?: Node | null;
    position?: { x: number; y: number };
  }>({
    visible: false,
    type: '',
    parentNode: null,
    position: undefined
  });
  
  const [form] = Form.useForm();
  
  // 聊天相關
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
      content: '我已經為您生成了完整的系統設計圖。您可以點擊任何節點查看詳細資訊，或在空白處右鍵新增模組。',
      timestamp: new Date()
    }
  ]);
  const [userInput, setUserInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // 處理畫布右鍵
  const handlePaneContextMenu = useCallback((event: MouseEvent) => {
    event.preventDefault();
    
    if (!reactFlowInstance) return;
    
    const position = reactFlowInstance.project({
      x: event.clientX,
      y: event.clientY
    });
    
    setContextMenu({
      visible: true,
      x: event.clientX,
      y: event.clientY,
      node: null,
      type: 'canvas'
    });
    
    setNodeModal(prev => ({
      ...prev,
      position
    }));
  }, [reactFlowInstance]);

  // 處理節點右鍵
  const handleNodeContextMenu = useCallback((event: MouseEvent, node: Node) => {
    event.preventDefault();
    event.stopPropagation();
    
    setContextMenu({
      visible: true,
      x: event.clientX,
      y: event.clientY,
      node,
      type: 'node'
    });
  }, []);

  // 關閉右鍵選單
  useEffect(() => {
    const handleClick = () => setContextMenu(prev => ({ ...prev, visible: false }));
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  // 處理新增節點
  const handleAddNode = (type: string, parentNode?: Node | null) => {
    setContextMenu(prev => ({ ...prev, visible: false }));
    setNodeModal({
      visible: true,
      type,
      parentNode: parentNode || null,
      position: contextMenu.type === 'canvas' ? nodeModal.position : undefined
    });
    form.resetFields();
  };

  // 創建新節點
  const handleCreateNode = () => {
    const values = form.getFieldsValue();
    const { type, parentNode, position } = nodeModal;
    
    const newNodeId = generateNodeId(type, nodes);
    const newNodeCode = generateCode(type, nodes);
    
    let newPosition = position;
    
    // 如果有父節點，計算新節點位置
    if (parentNode) {
      const parentPos = parentNode.position;
      const childrenOfSameType = edges.filter(e => 
        e.source === parentNode.id && 
        nodes.find(n => n.id === e.target && n.data.type === type)
      );
      
      newPosition = {
        x: parentPos.x + 200,
        y: parentPos.y + (childrenOfSameType.length * 80)
      };
    }
    
    // 創建新節點
    const newNode: Node = {
      id: newNodeId,
      type: 'custom',
      position: newPosition || { x: 100, y: 100 },
      data: {
        label: values.name,
        code: newNodeCode,
        type: type as any
      }
    };
    
    setNodes(nds => [...nds, newNode]);
    
    // 如果有父節點，創建連接
    if (parentNode) {
      const newEdge: Edge = {
        id: `e${edges.length + 1}`,
        source: parentNode.id,
        target: newNodeId,
        animated: type === 'USE_CASE'
      };
      setEdges(eds => [...eds, newEdge]);
    }
    
    // 添加節點詳細資料
    nodeDetails[newNodeId] = {
      type,
      code: newNodeCode,
      name: values.name,
      description: values.description || '',
      ...values
    };
    
    setNodeModal({ visible: false, type: '', parentNode: null });
    message.success(`成功新增${getNodeTypeName(type)}`);
  };

  // 刪除節點
  const handleDeleteNode = (node: Node) => {
    // 找出所有相關的邊
    const connectedEdges = edges.filter(e => 
      e.source === node.id || e.target === node.id
    );
    
    // 找出所有子節點（遞迴）
    const getChildNodes = (nodeId: string): string[] => {
      const childEdges = edges.filter(e => e.source === nodeId);
      const childIds = childEdges.map(e => e.target);
      const allChildIds = [...childIds];
      
      childIds.forEach(childId => {
        allChildIds.push(...getChildNodes(childId));
      });
      
      return allChildIds;
    };
    
    const childNodeIds = getChildNodes(node.id);
    const nodesToDelete = [node.id, ...childNodeIds];
    
    // 刪除節點和相關邊
    setNodes(nds => nds.filter(n => !nodesToDelete.includes(n.id)));
    setEdges(eds => eds.filter(e => 
      !nodesToDelete.includes(e.source) && !nodesToDelete.includes(e.target)
    ));
    
    // 刪除詳細資料
    nodesToDelete.forEach(id => {
      delete nodeDetails[id];
    });
    
    message.success('已刪除節點及其所有子節點');
    setContextMenu(prev => ({ ...prev, visible: false }));
  };

  const getNodeTypeName = (type: string) => {
    const names: { [key: string]: string } = {
      MODULE: '模組',
      USE_CASE: '使用案例',
      SEQUENCE: '循序圖',
      API: 'API',
      DTO: 'DTO'
    };
    return names[type] || type;
  };

  const handleNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    const detail = nodeDetails[node.id];
    if (detail) {
      setSelectedNode({ ...node, detail });
      setEditedContent(detail);
      setDrawerVisible(true);
      setIsEditing(false);
      setShowCode(false);
    }
  }, []);

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

    setTimeout(() => {
      const aiResponse: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: '我正在分析您的需求並更新設計圖...',
        timestamp: new Date()
      };
      setChatMessages(prev => [...prev, aiResponse]);
      setIsLoading(false);
    }, 1500);
  };

  const handleSave = () => {
    // 保存編輯的內容
    nodeDetails[selectedNode.id] = editedContent;
    setIsEditing(false);
  };

  const renderDetailContent = () => {
    if (!selectedNode || !selectedNode.detail) return null;

    const { type } = selectedNode.detail;

    switch (type) {
      case 'MODULE':
      case 'USE_CASE':
        return (
          <div className="detail-content">
            {isEditing ? (
              <>
                <div className="edit-field">
                  <label>名稱</label>
                  <Input 
                    value={editedContent.name}
                    onChange={(e) => setEditedContent({ ...editedContent, name: e.target.value })}
                  />
                </div>
                <div className="edit-field">
                  <label>描述</label>
                  <TextArea 
                    value={editedContent.description}
                    onChange={(e) => setEditedContent({ ...editedContent, description: e.target.value })}
                    rows={3}
                  />
                </div>
                {type === 'USE_CASE' && (
                  <>
                    <div className="edit-field">
                      <label>主要流程</label>
                      <TextArea 
                        value={editedContent.mainFlow?.join('\n')}
                        onChange={(e) => setEditedContent({ 
                          ...editedContent, 
                          mainFlow: e.target.value.split('\n').filter(Boolean) 
                        })}
                        rows={8}
                      />
                    </div>
                  </>
                )}
              </>
            ) : (
              <>
                <Title level={4}>{selectedNode.detail.name}</Title>
                <Paragraph>{selectedNode.detail.description}</Paragraph>
                
                {selectedNode.detail.businessCapabilities && (
                  <div className="detail-section">
                    <Title level={5}>業務能力</Title>
                    <ul>
                      {selectedNode.detail.businessCapabilities.map((cap: string, idx: number) => (
                        <li key={idx}>{cap}</li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {selectedNode.detail.actors && (
                  <div className="detail-section">
                    <Title level={5}>參與者</Title>
                    <Space>
                      {selectedNode.detail.actors.map((actor: string) => (
                        <Tag key={actor}>{actor}</Tag>
                      ))}
                    </Space>
                  </div>
                )}
                
                {selectedNode.detail.mainFlow && (
                  <div className="detail-section">
                    <Title level={5}>主要流程</Title>
                    <ol>
                      {selectedNode.detail.mainFlow.map((flow: string, idx: number) => (
                        <li key={idx}>{flow}</li>
                      ))}
                    </ol>
                  </div>
                )}
              </>
            )}
          </div>
        );

      case 'SEQUENCE':
        return (
          <div className="detail-content">
            <div className="code-toggle">
              <Switch 
                checked={showCode}
                onChange={setShowCode}
                checkedChildren={<CodeOutlined />}
                unCheckedChildren={<EyeOutlined />}
              />
              <span>{showCode ? '顯示圖表' : '顯示代碼'}</span>
            </div>
            
            {showCode ? (
              <div className="code-editor">
                {isEditing ? (
                  <TextArea
                    value={editedContent.mermaidCode}
                    onChange={(e) => setEditedContent({ ...editedContent, mermaidCode: e.target.value })}
                    rows={20}
                    style={{ fontFamily: 'monospace' }}
                  />
                ) : (
                  <pre className="mermaid-code">{selectedNode.detail.mermaidCode}</pre>
                )}
              </div>
            ) : (
              <div className="mermaid-preview">
                <MermaidRenderer chart={selectedNode.detail.mermaidCode || ''} />
              </div>
            )}
          </div>
        );

      case 'API':
        return (
          <div className="detail-content api-detail">
            <div className="api-header">
              <Tag color="orange">{selectedNode.detail.method}</Tag>
              <Text code>{selectedNode.detail.path}</Text>
            </div>
            <Paragraph>{selectedNode.detail.description}</Paragraph>
            
            <Tabs defaultActiveKey="request">
              <TabPane tab="Request" key="request">
                <div className="api-section">
                  <Title level={5}>Request Body</Title>
                  <pre className="json-preview">
                    {JSON.stringify(selectedNode.detail.request?.body, null, 2)}
                  </pre>
                </div>
              </TabPane>
              <TabPane tab="Responses" key="responses">
                <div className="api-section">
                  {selectedNode.detail.responses && Object.entries(selectedNode.detail.responses).map(([code, response]: [string, any]) => (
                    <div key={code} className="response-item">
                      <Tag color={code === '200' ? 'success' : 'error'}>{code}</Tag>
                      <Text>{response.description}</Text>
                      <pre className="json-preview">
                        {JSON.stringify(response.content?.['application/json']?.schema, null, 2)}
                      </pre>
                    </div>
                  ))}
                </div>
              </TabPane>
            </Tabs>
          </div>
        );

      case 'DTO':
        return (
          <div className="detail-content dto-detail">
            <Title level={4}>{selectedNode.detail.name}</Title>
            <Paragraph>{selectedNode.detail.description}</Paragraph>
            
            <div className="schema-section">
              <Title level={5}>Schema</Title>
              {isEditing ? (
                <TextArea
                  value={JSON.stringify(editedContent.schema, null, 2)}
                  onChange={(e) => {
                    try {
                      const parsed = JSON.parse(e.target.value);
                      setEditedContent({ ...editedContent, schema: parsed });
                    } catch (err) {
                      // Invalid JSON, just update the text
                    }
                  }}
                  rows={15}
                  style={{ fontFamily: 'monospace' }}
                />
              ) : (
                <pre className="json-preview">
                  {JSON.stringify(selectedNode.detail.schema, null, 2)}
                </pre>
              )}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="ai-design-canvas">
      {/* 左側聊天窗 */}
      <div className="chat-panel">
        <Card className="chat-card">
          <div className="chat-header">
            <Space>
              <RobotOutlined style={{ fontSize: 20, color: '#1890ff' }} />
              <span className="chat-title">AI 設計助手</span>
            </Space>
          </div>
          
          <div className="chat-messages">
            {chatMessages.map(msg => (
              <div key={msg.id} className={`chat-message ${msg.type}`}>
                <Avatar 
                  icon={msg.type === 'user' ? <UserOutlined /> : <RobotOutlined />}
                  style={{ 
                    backgroundColor: msg.type === 'user' ? '#87d068' : '#1890ff' 
                  }}
                />
                <div className="message-content">
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
                <div className="message-content">
                  <Spin size="small" />
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          <div className="chat-input">
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
            />
            <Button 
              type="primary" 
              icon={<SendOutlined />}
              onClick={handleSendMessage}
              loading={isLoading}
              style={{ marginTop: 8 }}
              block
            >
              發送
            </Button>
          </div>
        </Card>
      </div>

      {/* 右側畫布 */}
      <div className="canvas-panel">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={handleNodeClick}
          onNodeContextMenu={handleNodeContextMenu}
          onPaneContextMenu={handlePaneContextMenu}
          onInit={setReactFlowInstance}
          nodeTypes={nodeTypes}
          connectionMode={ConnectionMode.Loose}
          fitView
        >
          <Background />
          <Controls />
        </ReactFlow>
        
        {/* 右鍵選單 */}
        {contextMenu.visible && (
          <div
            className="context-menu"
            style={{
              position: 'fixed',
              top: contextMenu.y,
              left: contextMenu.x,
              zIndex: 1000
            }}
          >
            <Menu
              mode="vertical"
              style={{ minWidth: 150 }}
              onClick={(e) => e.domEvent.stopPropagation()}
            >
              {contextMenu.type === 'canvas' ? (
                <Menu.Item
                  key="add-module"
                  icon={<FolderAddOutlined />}
                  onClick={() => handleAddNode('MODULE')}
                >
                  新增模組
                </Menu.Item>
              ) : contextMenu.node && (
                <>
                  {NODE_HIERARCHY[contextMenu.node.data.type] && (
                    <Menu.Item
                      key="add-child"
                      icon={<PlusOutlined />}
                      onClick={() => handleAddNode(
                        NODE_HIERARCHY[contextMenu.node!.data.type] as string,
                        contextMenu.node
                      )}
                    >
                      新增{getNodeTypeName(NODE_HIERARCHY[contextMenu.node.data.type] as string)}
                    </Menu.Item>
                  )}
                  <Menu.Item
                    key="view-detail"
                    icon={<EyeOutlined />}
                    onClick={() => handleNodeClick(
                      { preventDefault: () => {} } as any,
                      contextMenu.node!
                    )}
                  >
                    查看詳細
                  </Menu.Item>
                  <Menu.Divider />
                  <Menu.Item
                    key="delete"
                    icon={<DeleteOutlined />}
                    danger
                    onClick={() => handleDeleteNode(contextMenu.node!)}
                  >
                    刪除節點
                  </Menu.Item>
                </>
              )}
            </Menu>
          </div>
        )}
      </div>

      {/* 新增節點Modal */}
      <Modal
        title={`新增${getNodeTypeName(nodeModal.type)}`}
        visible={nodeModal.visible}
        onOk={handleCreateNode}
        onCancel={() => setNodeModal({ visible: false, type: '', parentNode: null })}
        width={500}
      >
        <Form
          form={form}
          layout="vertical"
        >
          <Form.Item
            label="名稱"
            name="name"
            rules={[{ required: true, message: '請輸入名稱' }]}
          >
            <Input placeholder={`請輸入${getNodeTypeName(nodeModal.type)}名稱`} />
          </Form.Item>
          
          <Form.Item
            label="描述"
            name="description"
          >
            <TextArea 
              rows={3} 
              placeholder={`請輸入${getNodeTypeName(nodeModal.type)}描述`}
            />
          </Form.Item>
          
          {nodeModal.parentNode && (
            <Form.Item label="父節點">
              <Input 
                value={`${nodeModal.parentNode.data.code} - ${nodeModal.parentNode.data.label}`} 
                disabled 
              />
            </Form.Item>
          )}
        </Form>
      </Modal>

      {/* 右側滑出面板 */}
      <Drawer
        title={
          <div className="drawer-header">
            <Space>
              <Tag color={
                selectedNode?.detail?.type === 'MODULE' ? '#1890ff' :
                selectedNode?.detail?.type === 'USE_CASE' ? '#52c41a' :
                selectedNode?.detail?.type === 'SEQUENCE' ? '#722ed1' :
                selectedNode?.detail?.type === 'API' ? '#fa8c16' :
                '#eb2f96'
              }>
                {selectedNode?.detail?.type}
              </Tag>
              <Text strong>{selectedNode?.detail?.code}</Text>
            </Space>
            <Space>
              {!isEditing ? (
                <Button 
                  icon={<EditOutlined />} 
                  onClick={() => setIsEditing(true)}
                >
                  編輯
                </Button>
              ) : (
                <>
                  <Button 
                    type="primary"
                    icon={<SaveOutlined />} 
                    onClick={handleSave}
                  >
                    保存
                  </Button>
                  <Button 
                    onClick={() => {
                      setIsEditing(false);
                      setEditedContent(selectedNode.detail);
                    }}
                  >
                    取消
                  </Button>
                </>
              )}
            </Space>
          </div>
        }
        placement="right"
        width={600}
        onClose={() => setDrawerVisible(false)}
        visible={drawerVisible}
        className="detail-drawer"
      >
        {renderDetailContent()}
      </Drawer>
    </div>
  );
};

export default AIDesignCanvas;