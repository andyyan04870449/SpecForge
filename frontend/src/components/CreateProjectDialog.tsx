import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Plus } from 'lucide-react';
import { Project } from '../services/api';

interface CreateProjectDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  newProject: {
    name: string;
    description: string;
    status: Project['status'];
  };
  onProjectChange: (project: { name: string; description: string; status: Project['status'] }) => void;
  onCreateProject: () => void;
  children?: React.ReactNode;
  disabled?: boolean;
}

const PROJECT_STATUS_OPTIONS = [
  { value: 'PLANNING' as const, label: '規劃中', color: 'bg-gray-500' },
  { value: 'IN_PROGRESS' as const, label: '進行中', color: 'bg-green-500' },
  { value: 'REVIEW' as const, label: '審核中', color: 'bg-yellow-500' },
  { value: 'COMPLETED' as const, label: '已完成', color: 'bg-blue-500' }
];

const PROJECT_FEATURES = [
  '使用者案例 (UC) 管理',
  '循序圖 (SD) 設計',
  'API 合約文檔',
  '資料傳輸物件 (DTO) 定義',
  'AI 輔助系統分析'
];

export default function CreateProjectDialog({
  isOpen,
  onOpenChange,
  newProject,
  onProjectChange,
  onCreateProject,
  children,
  disabled = false
}: CreateProjectDialogProps) {

  const handleReset = () => {
    onOpenChange(false);
    onProjectChange({
      name: '',
      description: '',
      status: 'IN_PROGRESS'
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>新增專案</DialogTitle>
          <DialogDescription>
            建立新的系統分析專案
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <Label htmlFor="project-name">專案名稱 *</Label>
            <Input
              id="project-name"
              placeholder="請輸入專案名稱"
              value={newProject.name}
              onChange={(e) => onProjectChange({ ...newProject, name: e.target.value })}
              className="w-full"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="project-description">專案描述</Label>
            <Textarea
              id="project-description"
              placeholder="請輸入專案描述，說明專案的目標和範圍"
              value={newProject.description}
              onChange={(e) => onProjectChange({ ...newProject, description: e.target.value })}
              className="w-full min-h-[100px]"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="project-status">專案狀態</Label>
            <Select
              value={newProject.status}
              onValueChange={(value: Project['status']) => 
                onProjectChange({ ...newProject, status: value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="選擇專案狀態" />
              </SelectTrigger>
              <SelectContent>
                {PROJECT_STATUS_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 ${option.color} rounded-full`}></div>
                      {option.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="text-sm text-muted-foreground bg-muted/30 p-3 rounded-lg">
            <p className="mb-2">💡 專案建立後包含：</p>
            <ul className="text-xs space-y-1 ml-4">
              {PROJECT_FEATURES.map((feature, index) => (
                <li key={index}>• {feature}</li>
              ))}
            </ul>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={handleReset}>
            取消
          </Button>
          <Button
            onClick={onCreateProject}
            disabled={!newProject.name.trim() || disabled}
          >
            <Plus className="w-4 h-4 mr-2" />
            建立專案
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}