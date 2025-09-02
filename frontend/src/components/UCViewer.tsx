import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Separator } from './ui/separator';
import { ScrollArea } from './ui/scroll-area';
import { 
  CheckCircle, 
  AlertCircle, 
  FileText, 
  Edit3, 
  Save, 
  X,
  Plus,
  Trash2,
  GitBranch,
  Target
} from 'lucide-react';

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

interface UCViewerProps {
  ucData: UCData;
  onUpdate?: (updatedData: UCData) => void;
  onAddItem?: () => void;
  isEditing?: boolean;
  onSave?: () => void;
  onCancel?: () => void;
}

export default function UCViewer({ ucData, onUpdate, onAddItem, isEditing = false, onSave, onCancel }: UCViewerProps) {
  const [editData, setEditData] = useState<UCData>(ucData);

  const handleSave = () => {
    onUpdate?.(editData);
    if (onSave) {
      onSave();
    }
  };

  const handleCancel = () => {
    setEditData(ucData);
    if (onCancel) {
      onCancel();
    }
  };

  const addStep = () => {
    const newStep: UCStep = {
      id: `step-${Date.now()}`,
      order: 1,
      action: '',
      description: ''
    };

    setEditData(prev => ({
      ...prev,
      mainFlow: [...prev.mainFlow, { ...newStep, order: prev.mainFlow.length + 1 }]
    }));
  };

  const removeStep = (stepId: string) => {
    setEditData(prev => ({
      ...prev,
      mainFlow: prev.mainFlow.filter(step => step.id !== stepId)
    }));
  };

  const updateArrayField = (field: keyof UCData, index: number, value: string) => {
    setEditData(prev => ({
      ...prev,
      [field]: (prev[field] as string[]).map((item, i) => i === index ? value : item)
    }));
  };

  const addArrayItem = (field: keyof UCData) => {
    setEditData(prev => ({
      ...prev,
      [field]: [...(prev[field] as string[]), '']
    }));
  };

  const removeArrayItem = (field: keyof UCData, index: number) => {
    setEditData(prev => ({
      ...prev,
      [field]: (prev[field] as string[]).filter((_, i) => i !== index)
    }));
  };



  return (
    <div className="h-full flex flex-col">
      {/* 基本資訊區域 */}
      <div className="p-6 border-b bg-muted/30">
        <div className="space-y-4">
          {/* 標籤區域 */}
          <div className="flex items-center gap-2">
            <Badge variant="outline">{ucData.id}</Badge>
          </div>

          {/* 描述 */}
          <div>
            {isEditing ? (
              <div>
                <span className="text-sm text-muted-foreground">描述</span>
                <Textarea
                  value={editData.description}
                  onChange={(e) => setEditData(prev => ({ ...prev, description: e.target.value }))}
                  className="mt-1 bg-background/50"
                  rows={2}
                />
              </div>
            ) : (
              <p className="text-sm text-muted-foreground leading-relaxed">{ucData.description}</p>
            )}
          </div>


        </div>
      </div>

      {/* 主要內容 */}
      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="p-6">
            <Tabs defaultValue="flows" className="space-y-6">
              <TabsList>
                <TabsTrigger value="flows">流程</TabsTrigger>
                <TabsTrigger value="criteria">驗收標準</TabsTrigger>
                <TabsTrigger value="details">詳細資訊</TabsTrigger>
              </TabsList>

              <TabsContent value="flows" className="space-y-6">
                {/* 主要流程 */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <GitBranch className="w-5 h-5" />
                      使用者流程
                    </CardTitle>
                    <CardDescription>描述使用者操作的步驟流程</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {isEditing ? (
                      <div className="space-y-4">
                        {editData.mainFlow.map((step, index) => (
                          <div key={step.id} className="border border-border rounded-lg p-4">
                            <div className="flex justify-between items-start mb-3">
                              <Badge variant="outline">步驟 {index + 1}</Badge>
                              <Button
                                onClick={() => removeStep(step.id)}
                                variant="outline"
                                size="sm"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                            <div className="space-y-3">
                              <div>
                                <Label>動作</Label>
                                <Input
                                  value={step.action}
                                  onChange={(e) => {
                                    setEditData(prev => ({
                                      ...prev,
                                      mainFlow: prev.mainFlow.map(s =>
                                        s.id === step.id ? { ...s, action: e.target.value } : s
                                      )
                                    }));
                                  }}
                                  placeholder="使用者執行的動作"
                                  className="mt-1"
                                />
                              </div>
                              <div>
                                <Label>描述</Label>
                                <Textarea
                                  value={step.description}
                                  onChange={(e) => {
                                    setEditData(prev => ({
                                      ...prev,
                                      mainFlow: prev.mainFlow.map(s =>
                                        s.id === step.id ? { ...s, description: e.target.value } : s
                                      )
                                    }));
                                  }}
                                  placeholder="詳細描述這個步驟的內容和預期結果"
                                  className="mt-1"
                                  rows={3}
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                        <Button
                          onClick={addStep}
                          variant="outline"
                          className="w-full"
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          新增步驟
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {ucData.mainFlow.map((step, index) => (
                          <div key={step.id} className="flex gap-3 p-3 bg-muted/30 rounded-lg">
                            <Badge variant="outline" className="shrink-0">
                              {index + 1}
                            </Badge>
                            <div className="flex-1">
                              <h4 className="text-sm mb-1">{step.action}</h4>
                              {step.description && (
                                <p className="text-xs text-muted-foreground">{step.description}</p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>


              </TabsContent>

              <TabsContent value="criteria" className="space-y-6">
                {/* 前置條件 */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CheckCircle className="w-5 h-5" />
                      前置條件
                    </CardTitle>
                    <CardDescription>執行此使用者案例前必須滿足的條件</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {isEditing ? (
                      <div className="space-y-2">
                        {editData.preconditions.map((condition, index) => (
                          <div key={index} className="flex gap-2">
                            <Textarea
                              value={condition}
                              onChange={(e) => updateArrayField('preconditions', index, e.target.value)}
                              placeholder="前置條件"
                              rows={1}
                            />
                            <Button
                              onClick={() => removeArrayItem('preconditions', index)}
                              variant="outline"
                              size="sm"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        ))}
                        <Button
                          onClick={() => addArrayItem('preconditions')}
                          variant="outline"
                          size="sm"
                          className="w-full"
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          新增前置條件
                        </Button>
                      </div>
                    ) : (
                      <ul className="space-y-2">
                        {ucData.preconditions.map((condition, index) => (
                          <li key={index} className="flex items-start gap-2">
                            <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                            <span className="text-sm">{condition}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </CardContent>
                </Card>

                {/* 後置條件 */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Target className="w-5 h-5" />
                      後置條件
                    </CardTitle>
                    <CardDescription>成功執行此使用者案例後的預期結果</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {isEditing ? (
                      <div className="space-y-2">
                        {editData.postconditions.map((condition, index) => (
                          <div key={index} className="flex gap-2">
                            <Textarea
                              value={condition}
                              onChange={(e) => updateArrayField('postconditions', index, e.target.value)}
                              placeholder="後置條件"
                              rows={1}
                            />
                            <Button
                              onClick={() => removeArrayItem('postconditions', index)}
                              variant="outline"
                              size="sm"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        ))}
                        <Button
                          onClick={() => addArrayItem('postconditions')}
                          variant="outline"
                          size="sm"
                          className="w-full"
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          新增後置條件
                        </Button>
                      </div>
                    ) : (
                      <ul className="space-y-2">
                        {ucData.postconditions.map((condition, index) => (
                          <li key={index} className="flex items-start gap-2">
                            <Target className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                            <span className="text-sm">{condition}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </CardContent>
                </Card>

                {/* 驗收標準 */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CheckCircle className="w-5 h-5" />
                      驗收標準
                    </CardTitle>
                    <CardDescription>用於驗證功能是否正確實作的標準</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {isEditing ? (
                      <div className="space-y-2">
                        {editData.acceptanceCriteria.map((criteria, index) => (
                          <div key={index} className="flex gap-2">
                            <Textarea
                              value={criteria}
                              onChange={(e) => updateArrayField('acceptanceCriteria', index, e.target.value)}
                              placeholder="驗收標準"
                              rows={1}
                            />
                            <Button
                              onClick={() => removeArrayItem('acceptanceCriteria', index)}
                              variant="outline"
                              size="sm"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        ))}
                        <Button
                          onClick={() => addArrayItem('acceptanceCriteria')}
                          variant="outline"
                          size="sm"
                          className="w-full"
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          新增驗收標準
                        </Button>
                      </div>
                    ) : (
                      <ul className="space-y-2">
                        {ucData.acceptanceCriteria.map((criteria, index) => (
                          <li key={index} className="flex items-start gap-2">
                            <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                            <span className="text-sm">{criteria}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="details" className="space-y-6">
                {/* 業務規則 */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <AlertCircle className="w-5 h-5" />
                      業務規則
                    </CardTitle>
                    <CardDescription>相關的業務邏輯和限制</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {isEditing ? (
                      <div className="space-y-2">
                        {editData.businessRules.map((rule, index) => (
                          <div key={index} className="flex gap-2">
                            <Textarea
                              value={rule}
                              onChange={(e) => updateArrayField('businessRules', index, e.target.value)}
                              placeholder="業務規則"
                              rows={1}
                            />
                            <Button
                              onClick={() => removeArrayItem('businessRules', index)}
                              variant="outline"
                              size="sm"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        ))}
                        <Button
                          onClick={() => addArrayItem('businessRules')}
                          variant="outline"
                          size="sm"
                          className="w-full"
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          新增業務規則
                        </Button>
                      </div>
                    ) : (
                      <ul className="space-y-2">
                        {ucData.businessRules.map((rule, index) => (
                          <li key={index} className="flex items-start gap-2">
                            <AlertCircle className="w-4 h-4 text-orange-500 mt-0.5 shrink-0" />
                            <span className="text-sm">{rule}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </CardContent>
                </Card>

                {/* 備註 */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="w-5 h-5" />
                      備註
                    </CardTitle>
                    <CardDescription>額外的說明和注意事項</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {isEditing ? (
                      <div className="space-y-2">
                        {editData.notes.map((note, index) => (
                          <div key={index} className="flex gap-2">
                            <Textarea
                              value={note}
                              onChange={(e) => updateArrayField('notes', index, e.target.value)}
                              placeholder="備註"
                              rows={2}
                            />
                            <Button
                              onClick={() => removeArrayItem('notes', index)}
                              variant="outline"
                              size="sm"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        ))}
                        <Button
                          onClick={() => addArrayItem('notes')}
                          variant="outline"
                          size="sm"
                          className="w-full"
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          新增備註
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {ucData.notes.map((note, index) => (
                          <p key={index} className="text-sm p-3 bg-muted/30 rounded-lg">
                            {note}
                          </p>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}