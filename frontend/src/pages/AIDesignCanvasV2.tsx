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
  MiniMap
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Card, Button, Input, Drawer, Space, Tag, Spin, Avatar, Tabs, Switch, Typography, Menu, Modal, Form, Select, message, Alert, Breadcrumb } from 'antd';
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
  DeleteOutlined,
  LoadingOutlined,
  HomeOutlined,
  ProjectOutlined,
  ReloadOutlined,
  ArrowLeftOutlined,
  LogoutOutlined
} from '@ant-design/icons';
import MermaidRenderer from '../components/MermaidRenderer';
import api, { Project, Module, UseCase, SequenceDiagram, APIContract, DTOSchema } from '@/services/api';
import './AIDesignCanvas.css';

const { TextArea } = Input;
const { TabPane } = Tabs;
const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

// 定義節點資料介面
interface NodeData {
  type: 'MODULE' | 'USE_CASE' | 'SEQUENCE' | 'API' | 'DTO';
  code: string;
  label: string;
  dbId?: string; // 資料庫ID
  parentId?: string; // 父節點資料庫ID
}

// 自定義節點組件
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
  DTO: null
};

interface ChatMessage {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: Date;
}

// 缺失功能記錄
interface MissingFeature {
  id: string;
  category: string;
  feature: string;
  description: string;
  severity: 'high' | 'medium' | 'low';
}

interface AIDesignCanvasV2Props {
  projectId: string;
  user: { email: string; name: string };
  onBackToProjects: () => void;
  onLogout: () => void;
}

const AIDesignCanvasV2: React.FC<AIDesignCanvasV2Props> = ({ projectId, user, onBackToProjects, onLogout }) => {
  // 專案相關狀態
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [loadingProject, setLoadingProject] = useState(false);
  
  // 節點和邊
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNode, setSelectedNode] = useState<any>(null);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showCode, setShowCode] = useState(false);
  const [editedContent, setEditedContent] = useState<any>({});
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);
  
  // 資料載入狀態
  const [loadingModules, setLoadingModules] = useState(false);
  const [loadingUseCases, setLoadingUseCases] = useState(false);
  const [loadingSequences, setLoadingSequences] = useState(false);
  const [loadingAPIs, setLoadingAPIs] = useState(false);
  const [loadingDTOs, setLoadingDTOs] = useState(false);
  
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
      type: 'ai',
      content: '歡迎使用新版AI設計助手！請先選擇或創建一個專案。',
      timestamp: new Date()
    }
  ]);
  const [userInput, setUserInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // 缺失功能追蹤
  const [missingFeatures] = useState<MissingFeature[]>([
    {
      id: '1',
      category: 'API Integration',
      feature: 'AI Service Connection',
      description: '後端尚未實現AI生成服務端點，目前使用模擬資料',
      severity: 'high'
    },
    {
      id: '2',
      category: 'Data Model',
      feature: 'Module Parent Hierarchy',
      description: '模組的多層級結構支援有限，API未完全實現',
      severity: 'medium'
    },
    {
      id: '3',
      category: 'Consistency Check',
      feature: 'Auto Validation',
      description: '一致性檢查API尚未完成，無法自動驗證關聯完整性',
      severity: 'high'
    },
    {
      id: '4',
      category: 'UI Feature',
      feature: 'Auto Layout',
      description: '缺少自動佈局演算法，節點需手動調整位置',
      severity: 'low'
    }
  ]);

  // 載入專案資料
  useEffect(() => {
    if (projectId) {
      loadProject(projectId);
    }
  }, [projectId]);

  // 載入專案
  const loadProject = async (projectId: string) => {
    setLoadingProject(true);
    try {
      const response = await api.getProject(projectId);
      if (response.success && response.data) {
        setCurrentProject(response.data);
        await loadProjectData(projectId);
        message.success(`已載入專案: ${response.data.name}`);
      }
    } catch (error) {
      console.error('Failed to load project:', error);
      message.error('載入專案失敗');
    } finally {
      setLoadingProject(false);
    }
  };

  // 載入專案資料並轉換為節點
  const loadProjectData = async (projectId: string) => {
    const newNodes: Node[] = [];
    const newEdges: Edge[] = [];
    
    try {
      console.log('開始載入專案資料:', projectId);
      
      // 載入模組
      setLoadingModules(true);
      const modulesResponse = await api.getModules(projectId);
      console.log('模組資料:', modulesResponse);
      const modules = modulesResponse.success ? modulesResponse.data : [];
      
      modules.forEach((module: any, index) => {
        const node = {
          id: `MOD-${module.id}`,
          type: 'custom',
          position: { x: 50, y: 100 + index * 150 },
          data: {
            label: module.title || module.name || `模組 ${index + 1}`,
            code: module.modCode || `MOD-${index + 1}`,
            type: 'MODULE' as const,
            dbId: module.id,
            parentId: module.parentId
          }
        };
        console.log('創建模組節點:', node);
        newNodes.push(node);
      });

      // 載入使用案例
      setLoadingUseCases(true);
      const useCasesResponse = await api.getUseCases(projectId);
      const useCases = useCasesResponse.success ? useCasesResponse.data : [];
      
      useCases.forEach((uc: any, index) => {
        const nodeId = `UC-${uc.id}`;
        const node = {
          id: nodeId,
          type: 'custom',
          position: { x: 250, y: 50 + index * 100 },
          data: {
            label: uc.title || `使用案例 ${index + 1}`,
            code: uc.ucCode || `UC-${index + 1}`,
            type: 'USE_CASE' as const,
            dbId: uc.id,
            parentId: uc.moduleId
          }
        };
        console.log('創建使用案例節點:', node);
        newNodes.push(node);
        
        // 創建模組到使用案例的連線
        if ((uc as any).moduleId) {
          newEdges.push({
            id: `e-mod-uc-${uc.id}`,
            source: `MOD-${(uc as any).moduleId}`,
            target: nodeId,
            animated: true
          });
        }
      });

      // 載入循序圖
      setLoadingSequences(true);
      const sequencesResponse = await api.getSequenceDiagrams(projectId);
      const sequences = sequencesResponse.success ? sequencesResponse.data : [];
      
      sequences.forEach((seq: any, index) => {
        // 使用更簡單的ID格式，避免特殊字符
        const nodeId = `sd_${seq.id.replace(/-/g, '_')}`;
        newNodes.push({
          id: nodeId,
          type: 'custom',
          position: { x: 450, y: 50 + index * 100 },
          data: {
            label: seq.title,
            code: (seq as any).sdCode || `SD-${index + 1}`,
            type: 'SEQUENCE',
            dbId: seq.id,
            parentId: (seq as any).useCaseId,
            mermaidSrc: (seq as any).mermaidSrc
          }
        });
        
        // 創建使用案例到循序圖的連線
        if ((seq as any).useCaseId) {
          const sourceId = `uc_${(seq as any).useCaseId.replace(/-/g, '_')}`;
          newEdges.push({
            id: `e_seq_${index}`,
            source: sourceId,
            target: nodeId
          });
        }
      });

      // 載入API
      setLoadingAPIs(true);
      const apisResponse = await api.getAPIContracts(projectId);
      const apis = apisResponse.success ? apisResponse.data : [];
      
      apis.forEach((api: any, index) => {
        // 使用更簡單的ID格式，避免特殊字符
        const nodeId = `api_${api.id.replace(/-/g, '_')}`;
        newNodes.push({
          id: nodeId,
          type: 'custom',
          position: { x: 650, y: 30 + index * 80 },
          data: {
            label: api.title || `${api.method} ${api.endpoint}`,
            code: (api as any).apiCode || `API-${index + 1}`,
            type: 'API',
            dbId: api.id
          }
        });
      });

      // 載入DTO
      setLoadingDTOs(true);
      const dtosResponse = await api.getDTOSchemas(projectId);
      const dtos = dtosResponse.success ? dtosResponse.data : [];
      
      dtos.forEach((dto, index) => {
        newNodes.push({
          id: `DTO-${dto.id}`,
          type: 'custom',
          position: { x: 850, y: 10 + index * 70 },
          data: {
            label: (dto as any).title || (dto as any).name,
            code: (dto as any).dtoCode || `DTO-${index + 1}`,
            type: 'DTO',
            dbId: dto.id,
            kind: (dto as any).kind
          }
        });
      });

      // TODO: 載入API-Sequence和API-DTO關聯（需要後端提供關聯查詢API）
      // 目前這部分API尚未完全實現，先記錄為缺失功能

      // 如果沒有數據，添加一些測試節點
      if (newNodes.length === 0) {
        console.log('沒有找到數據，添加測試節點');
        newNodes.push({
          id: 'test_mod_1',
          type: 'custom',
          position: { x: 100, y: 100 },
          data: {
            label: 'tes_MD',
            code: 'MOD-001',
            type: 'MODULE' as const,
            dbId: 'test_1'
          }
        });
        newNodes.push({
          id: 'test_uc_1',
          type: 'custom',
          position: { x: 300, y: 100 },
          data: {
            label: 'test_UC',
            code: 'UC-001',
            type: 'USE_CASE' as const,
            dbId: 'test_2'
          }
        });
        newNodes.push({
          id: 'test_sd_1',
          type: 'custom',
          position: { x: 500, y: 100 },
          data: {
            label: 'test_SD',
            code: 'SD-001',
            type: 'SEQUENCE' as const,
            dbId: 'test_3'
          }
        });
        
        newEdges.push({
          id: 'e1',
          source: 'test_mod_1',
          target: 'test_uc_1',
          animated: true
        });
        newEdges.push({
          id: 'e2',
          source: 'test_uc_1',
          target: 'test_sd_1'
        });
      }
      
      console.log('設定節點:', newNodes);
      console.log('設定連線:', newEdges);
      setNodes(newNodes);
      setEdges(newEdges);
      
    } catch (error: any) {
      console.error('Failed to load project data:', error);
      message.error(`載入專案資料時發生錯誤: ${error.message || error}`);
    } finally {
      setLoadingModules(false);
      setLoadingUseCases(false);
      setLoadingSequences(false);
      setLoadingAPIs(false);
      setLoadingDTOs(false);
    }
  };

  // 處理畫布右鍵
  const handlePaneContextMenu = useCallback((event: MouseEvent) => {
    event.preventDefault();
    
    if (!currentProject) {
      message.warning('請先選擇專案');
      return;
    }
    
    if (!reactFlowInstance) return;
    
    const position = reactFlowInstance.screenToFlowPosition({
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
  }, [reactFlowInstance, currentProject]);

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

  // 創建新節點（呼叫後端API）
  const handleCreateNode = async () => {
    if (!currentProject) {
      message.error('請先選擇專案');
      return;
    }

    const values = form.getFieldsValue();
    const { type, parentNode, position } = nodeModal;
    
    try {
      let newNodeData: any = null;
      let newNodeId = '';
      
      switch (type) {
        case 'MODULE':
          const moduleData = {
            title: values.name,
            description: values.description,
            parentId: parentNode?.data.dbId
          };
          const moduleResponse = await api.createModule(currentProject.id, moduleData);
          if (moduleResponse.success && moduleResponse.data) {
            newNodeData = moduleResponse.data;
            newNodeId = `mod_${newNodeData.id.replace(/-/g, '_')}`;
          }
          break;
          
        case 'USE_CASE':
          if (!parentNode?.data.dbId) {
            message.error('使用案例必須隸屬於模組');
            return;
          }
          const ucData = {
            title: values.name,
            summary: values.description
          };
          const ucResponse = await api.createUseCase(parentNode.data.dbId, ucData);
          if (ucResponse.success && ucResponse.data) {
            newNodeData = ucResponse.data;
            newNodeId = `uc_${newNodeData.id.replace(/-/g, '_')}`;
          }
          break;
          
        case 'SEQUENCE':
          if (!parentNode?.data.dbId) {
            message.error('循序圖必須隸屬於使用案例');
            return;
          }
          const sdData = {
            title: values.name,
            description: values.description,
            mermaidSrc: values.mermaidCode || 'sequenceDiagram\n    participant User\n    participant System'
          };
          const sdResponse = await api.createSequenceDiagramForUseCase(parentNode.data.dbId, sdData);
          if (sdResponse.success && sdResponse.data) {
            newNodeData = sdResponse.data;
            newNodeId = `sd_${newNodeData.id.replace(/-/g, '_')}`;
          }
          break;
          
        case 'API':
          // 解析路徑來取得 domain 和 endpoint
          const fullPath = values.path || '/api/resource';
          const pathParts = fullPath.split('/').filter(p => p);
          const domain = pathParts[0] || 'api';
          const endpoint = '/' + pathParts.join('/');
          
          const apiData = {
            title: values.name,
            description: values.description,
            method: values.method || 'GET',
            domain: domain,
            endpoint: endpoint,
            projectId: currentProject.id
          };
          const apiResponse = await api.createAPIContract(apiData);
          if (apiResponse.success && apiResponse.data) {
            newNodeData = apiResponse.data;
            newNodeId = `api_${newNodeData.id.replace(/-/g, '_')}`;
          }
          break;
          
        case 'DTO':
          const schemaJson: any = {
            type: 'object',
            properties: {}
          };
          
          // 只有在有描述時才加入 description 欄位
          if (values.description) {
            schemaJson.description = values.description;
          }
          
          const dtoData = {
            title: values.name,
            schemaJson: schemaJson,
            kind: values.kind || 'request',
            projectId: currentProject.id
          };
          const dtoResponse = await api.createDTOSchema(dtoData);
          if (dtoResponse.success && dtoResponse.data) {
            newNodeData = dtoResponse.data;
            newNodeId = `dto_${newNodeData.id.replace(/-/g, '_')}`;
          }
          break;
      }
      
      if (newNodeData) {
        // 計算節點位置
        let newPosition = position;
        if (parentNode) {
          const parentPos = parentNode.position;
          const childrenCount = edges.filter(e => e.source === parentNode.id).length;
          newPosition = {
            x: parentPos.x + 200,
            y: parentPos.y + (childrenCount * 80)
          };
        }
        
        // 創建新節點
        const newNode: Node = {
          id: newNodeId,
          type: 'custom',
          position: newPosition || { x: 100, y: 100 },
          data: {
            label: values.name,
            code: newNodeData.modCode || newNodeData.ucCode || newNodeData.sdCode || newNodeData.apiCode || newNodeData.dtoCode || newNodeData.code,
            type: type as any,
            dbId: newNodeData.id,
            parentId: parentNode?.data.dbId
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
        
        message.success(`成功新增${getNodeTypeName(type)}`);
        setNodeModal({ visible: false, type: '', parentNode: null });
      }
    } catch (error: any) {
      console.error('Failed to create node:', error);
      message.error(error.response?.data?.error?.message || '創建失敗');
    }
  };

  // 刪除節點
  const handleDeleteNode = async (node: Node) => {
    if (!node.data.dbId) {
      message.error('無法刪除此節點');
      return;
    }
    
    try {
      // 根據節點類型調用對應的刪除API
      switch (node.data.type) {
        case 'MODULE':
          await api.deleteModule(node.data.dbId);
          break;
        case 'USE_CASE':
          await api.deleteUseCase(node.data.dbId);
          break;
        case 'SEQUENCE':
          await api.deleteSequenceDiagram(node.data.dbId);
          break;
        case 'API':
          await api.deleteAPIContract(node.data.dbId);
          break;
        case 'DTO':
          await api.deleteDTOSchema(node.data.dbId);
          break;
      }
      
      // 找出所有子節點
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
      
      // 從UI中刪除節點和邊
      setNodes(nds => nds.filter(n => !nodesToDelete.includes(n.id)));
      setEdges(eds => eds.filter(e => 
        !nodesToDelete.includes(e.source) && !nodesToDelete.includes(e.target)
      ));
      
      message.success('刪除成功');
      setContextMenu(prev => ({ ...prev, visible: false }));
    } catch (error: any) {
      console.error('Failed to delete node:', error);
      message.error(error.response?.data?.error?.message || '刪除失敗');
    }
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

  const handleNodeClick = useCallback(async (event: React.MouseEvent, node: Node) => {
    if (!node.data.dbId) return;
    
    try {
      let detail: any = null;
      
      // 根據節點類型載入詳細資料
      switch (node.data.type) {
        case 'MODULE':
          const moduleResponse = await api.getModule(node.data.dbId);
          detail = moduleResponse.success ? moduleResponse.data : null;
          break;
        case 'USE_CASE':
          const ucResponse = await api.getUseCase(node.data.dbId);
          detail = ucResponse.success ? ucResponse.data : null;
          break;
        case 'SEQUENCE':
          const sdResponse = await api.getSequenceDiagram(node.data.dbId);
          detail = sdResponse.success ? sdResponse.data : null;
          break;
        case 'API':
          const apiResponse = await api.getAPIContract(node.data.dbId);
          detail = apiResponse.success ? apiResponse.data : null;
          break;
        case 'DTO':
          const dtoResponse = await api.getDTOSchema(node.data.dbId);
          detail = dtoResponse.success ? dtoResponse.data : null;
          break;
      }
      
      if (detail) {
        setSelectedNode({ ...node, detail });
        setEditedContent(detail);
        setDrawerVisible(true);
        setIsEditing(false);
        setShowCode(false);
      }
    } catch (error) {
      console.error('Failed to load node detail:', error);
      message.error('載入詳細資料失敗');
    }
  }, []);

  const handleSave = async () => {
    if (!selectedNode || !selectedNode.data.dbId) return;
    
    try {
      // 根據節點類型調用對應的更新API
      switch (selectedNode.data.type) {
        case 'MODULE':
          await api.updateModule(selectedNode.data.dbId, editedContent);
          break;
        case 'USE_CASE':
          await api.updateUseCase(selectedNode.data.dbId, editedContent);
          break;
        case 'SEQUENCE':
          await api.updateSequenceDiagram(selectedNode.data.dbId, editedContent);
          break;
        case 'API':
          await api.updateAPIContract(selectedNode.data.dbId, editedContent);
          break;
        case 'DTO':
          await api.updateDTOSchema(selectedNode.data.dbId, editedContent);
          break;
      }
      
      message.success('更新成功');
      setIsEditing(false);
      
      // 更新節點標籤
      setNodes(nds => nds.map(n => {
        if (n.id === selectedNode.id) {
          return {
            ...n,
            data: {
              ...n.data,
              label: editedContent.name || editedContent.title
            }
          };
        }
        return n;
      }));
    } catch (error: any) {
      console.error('Failed to save:', error);
      message.error(error.response?.data?.error?.message || '保存失敗');
    }
  };

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
    setChatLoading(true);

    // 模擬AI回應（實際AI服務未實現）
    setTimeout(() => {
      const aiResponse: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: '抱歉，AI生成服務尚未實現。這是一個已記錄的缺失功能。',
        timestamp: new Date()
      };
      setChatMessages(prev => [...prev, aiResponse]);
      setChatLoading(false);
    }, 1500);
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const renderDetailContent = () => {
    if (!selectedNode || !selectedNode.detail) return null;

    const { type } = selectedNode.data;
    const detail = selectedNode.detail;

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
                    value={editedContent.name || editedContent.title}
                    onChange={(e) => setEditedContent({ 
                      ...editedContent, 
                      [detail.name ? 'name' : 'title']: e.target.value 
                    })}
                  />
                </div>
                <div className="edit-field">
                  <label>描述</label>
                  <TextArea 
                    value={editedContent.description || editedContent.summary}
                    onChange={(e) => setEditedContent({ 
                      ...editedContent, 
                      [detail.description ? 'description' : 'summary']: e.target.value 
                    })}
                    rows={3}
                  />
                </div>
              </>
            ) : (
              <>
                <Title level={4}>{detail.name || detail.title}</Title>
                <Paragraph>{detail.description || detail.summary}</Paragraph>
                {detail.actors && (
                  <div className="detail-section">
                    <Title level={5}>參與者</Title>
                    <p>{detail.actors}</p>
                  </div>
                )}
                {detail.preconditions && (
                  <div className="detail-section">
                    <Title level={5}>前置條件</Title>
                    <p>{detail.preconditions}</p>
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
                  <pre className="mermaid-code">{detail.mermaidCode}</pre>
                )}
              </div>
            ) : (
              <div className="mermaid-preview">
                {detail.mermaidCode && <MermaidRenderer chart={detail.mermaidCode} />}
              </div>
            )}
          </div>
        );

      case 'API':
        return (
          <div className="detail-content api-detail">
            <div className="api-header">
              <Tag color="orange">{detail.method}</Tag>
              <Text code>{detail.path}</Text>
            </div>
            <Paragraph>{detail.description}</Paragraph>
            
            {isEditing ? (
              <>
                <div className="edit-field">
                  <label>路徑</label>
                  <Input 
                    value={editedContent.path}
                    onChange={(e) => setEditedContent({ ...editedContent, path: e.target.value })}
                  />
                </div>
                <div className="edit-field">
                  <label>方法</label>
                  <Select
                    value={editedContent.method}
                    onChange={(value) => setEditedContent({ ...editedContent, method: value })}
                    style={{ width: '100%' }}
                  >
                    <Option value="GET">GET</Option>
                    <Option value="POST">POST</Option>
                    <Option value="PUT">PUT</Option>
                    <Option value="DELETE">DELETE</Option>
                    <Option value="PATCH">PATCH</Option>
                  </Select>
                </div>
              </>
            ) : (
              <div className="api-section">
                <Title level={5}>參數</Title>
                <pre className="json-preview">
                  {JSON.stringify(detail.parameters || {}, null, 2)}
                </pre>
              </div>
            )}
          </div>
        );

      case 'DTO':
        return (
          <div className="detail-content dto-detail">
            <Title level={4}>{detail.title}</Title>
            <Paragraph>{detail.description}</Paragraph>
            
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
                      // Invalid JSON
                    }
                  }}
                  rows={15}
                  style={{ fontFamily: 'monospace' }}
                />
              ) : (
                <pre className="json-preview">
                  {JSON.stringify(detail.schema, null, 2)}
                </pre>
              )}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const dataLoading = loadingProject || loadingModules || loadingUseCases || loadingSequences || loadingAPIs || loadingDTOs;

  return (
    <div className="ai-design-canvas">
      {/* 頂部工具欄 */}
      <div className="canvas-toolbar">
        <Space>
          <Button 
            icon={<ArrowLeftOutlined />}
            onClick={onBackToProjects}
          >
            返回專案列表
          </Button>
          <Breadcrumb>
            <Breadcrumb.Item>
              <ProjectOutlined />
            </Breadcrumb.Item>
            <Breadcrumb.Item>
              {currentProject?.name || '載入中...'}
            </Breadcrumb.Item>
          </Breadcrumb>
        </Space>
        
        <Space>
          <span style={{ marginRight: 16 }}>
            <UserOutlined /> {user.name || user.email}
          </span>
          <Button 
            icon={<ReloadOutlined />}
            onClick={() => currentProject && loadProjectData(currentProject.id)}
            disabled={!currentProject || dataLoading}
          >
            重新載入
          </Button>
          <Button type="primary" onClick={() => {
            Modal.info({
              title: '缺失功能清單',
              width: 600,
              content: (
                <div>
                  {missingFeatures.map(feature => (
                    <Alert
                      key={feature.id}
                      message={feature.feature}
                      description={feature.description}
                      type={feature.severity === 'high' ? 'error' : feature.severity === 'medium' ? 'warning' : 'info'}
                      style={{ marginBottom: 8 }}
                    />
                  ))}
                </div>
              )
            });
          }}>
            查看缺失功能
          </Button>
          <Button 
            icon={<LogoutOutlined />}
            onClick={onLogout}
            danger
          >
            登出
          </Button>
        </Space>
      </div>

      {/* 主要內容區 */}
      <div className="canvas-main">
        {/* 左側聊天窗 */}
        <div className="chat-panel">
          <Card className="chat-card">
            <div className="chat-header">
              <Space>
                <RobotOutlined style={{ fontSize: 20, color: '#1890ff' }} />
                <span className="chat-title">AI 設計助手</span>
                {chatLoading && <Spin indicator={<LoadingOutlined style={{ fontSize: 16 }} spin />} />}
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
              {chatLoading && (
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
                loading={chatLoading}
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
          {!currentProject ? (
            <div className="no-project-placeholder" style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              color: '#8c8c8c'
            }}>
              <LoadingOutlined style={{ fontSize: 48, color: '#1890ff' }} />
              <Title level={4} type="secondary" style={{ marginTop: 16 }}>載入專案中...</Title>
            </div>
          ) : (
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onNodeClick={handleNodeClick}
              onNodeContextMenu={handleNodeContextMenu}
              onPaneContextMenu={handlePaneContextMenu}
              onInit={(instance) => {
                console.log('ReactFlow 初始化完成');
                setReactFlowInstance(instance);
              }}
              nodeTypes={nodeTypes}
              connectionMode={ConnectionMode.Loose}
              defaultViewport={{ x: 0, y: 0, zoom: 1 }}
              fitView
              fitViewOptions={{ padding: 0.2 }}
            >
              <Background />
              <Controls />
              <MiniMap />
            </ReactFlow>
          )}
          
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
                items={
                  contextMenu.type === 'canvas' ? [
                    {
                      key: 'add-module',
                      icon: <FolderAddOutlined />,
                      label: '新增模組',
                      onClick: () => handleAddNode('MODULE')
                    }
                  ] : contextMenu.node ? [
                    ...(NODE_HIERARCHY[contextMenu.node.data.type as keyof typeof NODE_HIERARCHY] ? [{
                      key: 'add-child',
                      icon: <PlusOutlined />,
                      label: `新增${getNodeTypeName(NODE_HIERARCHY[contextMenu.node.data.type as keyof typeof NODE_HIERARCHY] as string)}`,
                      onClick: () => handleAddNode(
                        NODE_HIERARCHY[contextMenu.node!.data.type as keyof typeof NODE_HIERARCHY] as string,
                        contextMenu.node
                      )
                    }] : []),
                    {
                      key: 'view-detail',
                      icon: <EyeOutlined />,
                      label: '查看詳細',
                      onClick: () => handleNodeClick(
                        { preventDefault: () => {} } as any,
                        contextMenu.node!
                      )
                    },
                    { type: 'divider' as const },
                    {
                      key: 'delete',
                      icon: <DeleteOutlined />,
                      label: '刪除節點',
                      danger: true,
                      onClick: () => handleDeleteNode(contextMenu.node!)
                    }
                  ] : []
                }
              />
            </div>
          )}
        </div>
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
          
          {nodeModal.type === 'API' && (
            <>
              <Form.Item
                label="方法"
                name="method"
                initialValue="GET"
              >
                <Select>
                  <Option value="GET">GET</Option>
                  <Option value="POST">POST</Option>
                  <Option value="PUT">PUT</Option>
                  <Option value="DELETE">DELETE</Option>
                  <Option value="PATCH">PATCH</Option>
                </Select>
              </Form.Item>
              <Form.Item
                label="路徑"
                name="path"
                rules={[{ required: true, message: '請輸入API路徑' }]}
              >
                <Input placeholder="/api/resource" />
              </Form.Item>
            </>
          )}
          
          {nodeModal.type === 'DTO' && (
            <Form.Item
              label="類型"
              name="kind"
              initialValue="request"
              rules={[{ required: true }]}
            >
              <Select>
                <Option value="request">Request</Option>
                <Option value="response">Response</Option>
              </Select>
            </Form.Item>
          )}
          
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
                selectedNode?.data?.type === 'MODULE' ? '#1890ff' :
                selectedNode?.data?.type === 'USE_CASE' ? '#52c41a' :
                selectedNode?.data?.type === 'SEQUENCE' ? '#722ed1' :
                selectedNode?.data?.type === 'API' ? '#fa8c16' :
                '#eb2f96'
              }>
                {selectedNode?.data?.type}
              </Tag>
              <Text strong>{selectedNode?.data?.code}</Text>
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

export default AIDesignCanvasV2;