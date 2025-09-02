import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { ScrollArea } from './ui/scroll-area';
import { Separator } from './ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from './ui/dialog';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { 
  ChevronDown, 
  ChevronRight, 
  Copy, 
  Database,
  FileText,
  CheckCircle,
  Code2,
  AlertTriangle,
  Info,
  Link,
  Settings,
  Edit,
  Plus,
  Trash2
} from 'lucide-react';

interface DTOProperty {
  name: string;
  type: string;
  required: boolean;
  description: string;
  example?: any;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    enum?: string[];
    format?: string;
  };
  references?: string; // 參考其他 DTO
}

interface DTOData {
  id: string;
  name: string;
  description: string;
  version?: string;
  category?: string;
  tags?: string[];
  properties: DTOProperty[];
  example?: any;
  relationships?: {
    extends?: string[];
    implements?: string[];
    uses?: string[];
  };
  validation?: {
    rules?: string[];
    schema?: string;
  };
  notes?: string[];
}

interface DTOViewerProps {
  dtoData: DTOData;
  onUpdate?: (data: DTOData) => void;
  onAddItem?: () => void;
  isEditing?: boolean;
  onSave?: () => void;
  onCancel?: () => void;
}

export default function DTOViewer({ dtoData, onUpdate, onAddItem, isEditing = false, onSave, onCancel }: DTOViewerProps) {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    properties: true,
    example: true,
    relationships: false,
    validation: false
  });
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [editData, setEditData] = useState<DTOData>(dtoData);
  const [isAddingProperty, setIsAddingProperty] = useState(false);
  const [newProperty, setNewProperty] = useState<DTOProperty>({
    name: '',
    type: 'string',
    required: false,
    description: ''
  });

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(type);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const getTypeColor = (type: string) => {
    const lowerType = type.toLowerCase();
    if (lowerType.includes('string')) return 'bg-blue-100 text-blue-800 border-blue-200';
    if (lowerType.includes('number') || lowerType.includes('int')) return 'bg-green-100 text-green-800 border-green-200';
    if (lowerType.includes('boolean')) return 'bg-purple-100 text-purple-800 border-purple-200';
    if (lowerType.includes('date')) return 'bg-orange-100 text-orange-800 border-orange-200';
    if (lowerType.includes('array')) return 'bg-pink-100 text-pink-800 border-pink-200';
    if (lowerType.includes('object')) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    return 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const formatJson = (obj: any) => {
    try {
      return JSON.stringify(obj, null, 2);
    } catch {
      return obj?.toString() || '';
    }
  };

  const generateTypeScriptInterface = () => {
    const interfaceLines = [`interface ${dtoData.name} {`];
    
    dtoData.properties.forEach(prop => {
      const optional = prop.required ? '' : '?';
      const comment = prop.description ? `  /** ${prop.description} */\n` : '';
      const propLine = `  ${prop.name}${optional}: ${prop.type};`;
      
      if (comment) interfaceLines.push(comment + propLine);
      else interfaceLines.push(propLine);
    });
    
    interfaceLines.push('}');
    return interfaceLines.join('\n');
  };

  const generateJavaClass = () => {
    const className = dtoData.name;
    const classLines = [
      `public class ${className} {`,
      ''
    ];
    
    // Properties
    dtoData.properties.forEach(prop => {
      if (prop.description) {
        classLines.push(`    /** ${prop.description} */`);
      }
      const javaType = prop.type.replace('string', 'String').replace('number', 'Integer').replace('boolean', 'Boolean');
      classLines.push(`    private ${javaType} ${prop.name};`);
      classLines.push('');
    });
    
    // Getters and Setters
    dtoData.properties.forEach(prop => {
      const javaType = prop.type.replace('string', 'String').replace('number', 'Integer').replace('boolean', 'Boolean');
      const capitalizedName = prop.name.charAt(0).toUpperCase() + prop.name.slice(1);
      
      classLines.push(`    public ${javaType} get${capitalizedName}() {`);
      classLines.push(`        return ${prop.name};`);
      classLines.push('    }');
      classLines.push('');
      
      classLines.push(`    public void set${capitalizedName}(${javaType} ${prop.name}) {`);
      classLines.push(`        this.${prop.name} = ${prop.name};`);
      classLines.push('    }');
      classLines.push('');
    });
    
    classLines.push('}');
    return classLines.join('\n');
  };

  const renderValidationRules = (validation: DTOProperty['validation']) => {
    if (!validation) return null;
    
    const rules = [];
    if (validation.min !== undefined) rules.push(`最小值: ${validation.min}`);
    if (validation.max !== undefined) rules.push(`最大值: ${validation.max}`);
    if (validation.pattern) rules.push(`格式: ${validation.pattern}`);
    if (validation.format) rules.push(`類型: ${validation.format}`);
    if (validation.enum) rules.push(`枚舉: ${validation.enum.join(', ')}`);
    
    return rules.length > 0 ? (
      <div className="mt-2 text-xs">
        <span className="text-muted-foreground">驗證規則: </span>
        <span className="text-orange-600">{rules.join(' | ')}</span>
      </div>
    ) : null;
  };

  const handleSave = () => {
    if (onUpdate) {
      onUpdate(editData);
    }
    if (onSave) {
      onSave();
    }
  };

  const handleCancel = () => {
    setEditData(dtoData);
    if (onCancel) {
      onCancel();
    }
  };

  const handleAddProperty = () => {
    if (!newProperty.name.trim()) return;
    
    const property: DTOProperty = {
      ...newProperty,
      name: newProperty.name.trim()
    };
    
    setEditData(prev => ({
      ...prev,
      properties: [...prev.properties, property]
    }));
    
    setNewProperty({
      name: '',
      type: 'string',
      required: false,
      description: ''
    });
    setIsAddingProperty(false);
  };

  const handleRemoveProperty = (index: number) => {
    setEditData(prev => ({
      ...prev,
      properties: prev.properties.filter((_, i) => i !== index)
    }));
  };

  return (
    <div className="h-full flex flex-col">
      <ScrollArea className="flex-1">
        <div className="p-6 space-y-6">
          {/* DTO Header */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Badge className="bg-indigo-500 text-white px-3 py-1 font-mono text-xs">
                  DTO
                </Badge>
                <code className="text-lg font-mono bg-muted px-3 py-1 rounded">
                  {dtoData.name}
                </code>
                {dtoData.version && (
                  <Badge variant="outline" className="text-xs">
                    v{dtoData.version}
                  </Badge>
                )}
              </div>
              

            </div>
            
            <div>
              {isEditing ? (
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="dto-name">DTO 名稱</Label>
                    <Input
                      id="dto-name"
                      value={editData.name}
                      onChange={(e) => setEditData(prev => ({ ...prev, name: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="dto-description">描述</Label>
                    <Textarea
                      id="dto-description"
                      value={editData.description}
                      onChange={(e) => setEditData(prev => ({ ...prev, description: e.target.value }))}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="dto-version">版本</Label>
                      <Input
                        id="dto-version"
                        value={editData.version || ''}
                        onChange={(e) => setEditData(prev => ({ ...prev, version: e.target.value }))}
                        placeholder="1.0"
                      />
                    </div>
                    <div>
                      <Label htmlFor="dto-category">分類</Label>
                      <Input
                        id="dto-category"
                        value={editData.category || ''}
                        onChange={(e) => setEditData(prev => ({ ...prev, category: e.target.value }))}
                        placeholder="分類名稱"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <h1 className="text-xl font-semibold mb-2">{dtoData.name}</h1>
                  <p className="text-muted-foreground">{dtoData.description}</p>
                </>
              )}
            </div>

            {dtoData.tags && (
              <div className="flex gap-2">
                {dtoData.tags.map((tag, index) => (
                  <Badge key={index} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <Separator />

          {/* Properties Section */}
          <Card>
            <Collapsible 
              open={expandedSections.properties}
              onOpenChange={() => toggleSection('properties')}
            >
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Settings className="w-5 h-5" />
                      屬性定義
                    </CardTitle>
                    {expandedSections.properties ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="space-y-4">
                  {isEditing && (
                    <div className="flex justify-end mb-4">
                      <Dialog open={isAddingProperty} onOpenChange={setIsAddingProperty}>
                        <DialogTrigger asChild>
                          <Button size="sm" variant="outline">
                            <Plus className="w-4 h-4 mr-2" />
                            新增屬性
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>新增屬性</DialogTitle>
                            <DialogDescription>
                              新增 DTO 屬性定義
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4 py-4">
                            <div className="space-y-2">
                              <Label htmlFor="prop-name">屬性名稱 *</Label>
                              <Input
                                id="prop-name"
                                value={newProperty.name}
                                onChange={(e) => setNewProperty(prev => ({ ...prev, name: e.target.value }))}
                                placeholder="propertyName"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="prop-type">資料類型</Label>
                              <Select
                                value={newProperty.type}
                                onValueChange={(value) => setNewProperty(prev => ({ ...prev, type: value }))}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="string">string</SelectItem>
                                  <SelectItem value="number">number</SelectItem>
                                  <SelectItem value="boolean">boolean</SelectItem>
                                  <SelectItem value="Date">Date</SelectItem>
                                  <SelectItem value="array">array</SelectItem>
                                  <SelectItem value="object">object</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="prop-description">描述</Label>
                              <Textarea
                                id="prop-description"
                                value={newProperty.description}
                                onChange={(e) => setNewProperty(prev => ({ ...prev, description: e.target.value }))}
                                placeholder="屬性說明"
                              />
                            </div>
                            <div className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                id="prop-required"
                                checked={newProperty.required}
                                onChange={(e) => setNewProperty(prev => ({ ...prev, required: e.target.checked }))}
                              />
                              <Label htmlFor="prop-required">必填欄位</Label>
                            </div>
                          </div>
                          <div className="flex justify-end gap-3">
                            <Button variant="outline" onClick={() => setIsAddingProperty(false)}>
                              取消
                            </Button>
                            <Button onClick={handleAddProperty} disabled={!newProperty.name.trim()}>
                              新增
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  )}
                  
                  <div className="space-y-3">
                    {(isEditing ? editData.properties : dtoData.properties).map((property, index) => (
                      <div key={index} className="border rounded-lg p-4 bg-muted/30">
                        <div className="flex items-center gap-2 mb-2">
                          <code className="text-sm bg-background px-2 py-1 rounded font-mono">
                            {property.name}
                          </code>
                          <Badge 
                            variant="outline" 
                            className={`text-xs border ${getTypeColor(property.type)}`}
                          >
                            {property.type}
                          </Badge>
                          {property.required && (
                            <Badge variant="destructive" className="text-xs">
                              required
                            </Badge>
                          )}
                          {property.references && (
                            <Badge variant="outline" className="text-xs flex items-center gap-1">
                              <Link className="w-3 h-3" />
                              {property.references}
                            </Badge>
                          )}
                          {isEditing && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleRemoveProperty(index)}
                              className="ml-auto h-6 w-6 p-0 text-destructive hover:text-destructive"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          )}
                        </div>
                        
                        <p className="text-sm text-muted-foreground mb-2">{property.description}</p>
                        
                        {property.example !== undefined && (
                          <div className="text-xs mb-2">
                            <span className="text-muted-foreground">範例: </span>
                            <code className="bg-background px-1 py-0.5 rounded">
                              {typeof property.example === 'object' 
                                ? JSON.stringify(property.example) 
                                : property.example}
                            </code>
                          </div>
                        )}
                        
                        {renderValidationRules(property.validation)}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Collapsible>
          </Card>

          {/* Relationships Section */}
          {dtoData.relationships && (
            <Card>
              <Collapsible 
                open={expandedSections.relationships}
                onOpenChange={() => toggleSection('relationships')}
              >
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Link className="w-5 h-5" />
                        關聯關係
                      </CardTitle>
                      {expandedSections.relationships ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="space-y-4">
                    {dtoData.relationships.extends && (
                      <div>
                        <h4 className="text-sm font-medium mb-2">繼承自</h4>
                        <div className="flex gap-2">
                          {dtoData.relationships.extends.map((parent, index) => (
                            <Badge key={index} variant="outline" className="bg-blue-50 text-blue-700">
                              {parent}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {dtoData.relationships.implements && (
                      <div>
                        <h4 className="text-sm font-medium mb-2">實現介面</h4>
                        <div className="flex gap-2">
                          {dtoData.relationships.implements.map((interface_, index) => (
                            <Badge key={index} variant="outline" className="bg-green-50 text-green-700">
                              {interface_}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {dtoData.relationships.uses && (
                      <div>
                        <h4 className="text-sm font-medium mb-2">使用的 DTO</h4>
                        <div className="flex gap-2 flex-wrap">
                          {dtoData.relationships.uses.map((usedDto, index) => (
                            <Badge key={index} variant="outline" className="bg-purple-50 text-purple-700">
                              {usedDto}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
            </Card>
          )}

          {/* Example Section */}
          <Card>
            <Collapsible 
              open={expandedSections.example}
              onOpenChange={() => toggleSection('example')}
            >
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <FileText className="w-5 h-5" />
                      範例與程式碼
                    </CardTitle>
                    {expandedSections.example ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent>
                  <Tabs defaultValue="json" className="w-full">
                    <TabsList className="grid w-full grid-cols-3">
                      <TabsTrigger value="json">JSON 範例</TabsTrigger>
                      <TabsTrigger value="typescript">TypeScript</TabsTrigger>
                      <TabsTrigger value="java">Java</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="json" className="mt-4">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">JSON 範例:</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(formatJson(dtoData.example), 'json')}
                            className="h-6 px-2"
                          >
                            {copiedCode === 'json' ? (
                              <CheckCircle className="w-3 h-3" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </Button>
                        </div>
                        <pre className="text-xs bg-background border rounded p-3 overflow-auto">
                          <code>{formatJson(dtoData.example) || '// 尚未提供範例'}</code>
                        </pre>
                      </div>
                    </TabsContent>
                    
                    <TabsContent value="typescript" className="mt-4">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">TypeScript 介面:</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(generateTypeScriptInterface(), 'typescript')}
                            className="h-6 px-2"
                          >
                            {copiedCode === 'typescript' ? (
                              <CheckCircle className="w-3 h-3" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </Button>
                        </div>
                        <pre className="text-xs bg-muted border rounded p-3 overflow-auto">
                          <code>{generateTypeScriptInterface()}</code>
                        </pre>
                      </div>
                    </TabsContent>
                    
                    <TabsContent value="java" className="mt-4">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Java 類別:</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(generateJavaClass(), 'java')}
                            className="h-6 px-2"
                          >
                            {copiedCode === 'java' ? (
                              <CheckCircle className="w-3 h-3" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </Button>
                        </div>
                        <pre className="text-xs bg-muted border rounded p-3 overflow-auto">
                          <code>{generateJavaClass()}</code>
                        </pre>
                      </div>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </CollapsibleContent>
            </Collapsible>
          </Card>

          {/* Validation Section */}
          {dtoData.validation && (
            <Card>
              <Collapsible 
                open={expandedSections.validation}
                onOpenChange={() => toggleSection('validation')}
              >
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <CheckCircle className="w-5 h-5" />
                        驗證規則
                      </CardTitle>
                      {expandedSections.validation ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="space-y-4">
                    {dtoData.validation.rules && (
                      <div>
                        <h4 className="text-sm font-medium mb-2">商業邏輯驗證</h4>
                        <ul className="space-y-1">
                          {dtoData.validation.rules.map((rule, index) => (
                            <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                              <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                              {rule}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    {dtoData.validation.schema && (
                      <div>
                        <h4 className="text-sm font-medium mb-2">JSON Schema</h4>
                        <pre className="text-xs bg-background border rounded p-3 overflow-auto">
                          <code>{dtoData.validation.schema}</code>
                        </pre>
                      </div>
                    )}
                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
            </Card>
          )}

          {/* Notes Section */}
          {dtoData.notes && dtoData.notes.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Info className="w-5 h-5" />
                  開發註記
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {dtoData.notes.map((note, index) => (
                    <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                      {note}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}