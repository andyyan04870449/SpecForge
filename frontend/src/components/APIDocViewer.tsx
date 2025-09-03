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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { 
  ChevronDown, 
  ChevronRight, 
  Copy, 
  Play, 
  Code2,
  FileText,
  CheckCircle,
  AlertCircle,
  Edit,
  Plus,
  Trash2
} from 'lucide-react';

interface APIParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  required: boolean;
  description: string;
  example?: any;
  schema?: string;
}

interface APIResponse {
  statusCode: number;
  description: string;
  example?: any;
  schema?: string;
}

interface APIDocData {
  id: string;
  title: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  endpoint: string;
  description: string;
  summary?: string;
  tags?: string[];
  parameters?: {
    path?: APIParameter[];
    query?: APIParameter[];
    header?: APIParameter[];
    body?: APIParameter[];
  };
  responses: APIResponse[];
  requestExample?: string;
  responseExample?: string;
}

interface APIDocViewerProps {
  apiData: APIDocData;
  onUpdate?: (data: APIDocData) => Promise<void>;
  onAddItem?: () => void;
  isEditing?: boolean;
  onSave?: () => Promise<void>;
  onCancel?: () => void;
}

export default function APIDocViewer({ apiData, onUpdate, onAddItem, isEditing = false, onSave, onCancel }: APIDocViewerProps) {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    parameters: true,
    responses: true
  });
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [editData, setEditData] = useState<APIDocData>(apiData);
  const [isSaving, setIsSaving] = useState(false);

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

  const getMethodColor = (method: string) => {
    switch (method.toUpperCase()) {
      case 'GET': return 'bg-blue-500';
      case 'POST': return 'bg-green-500';
      case 'PUT': return 'bg-orange-500';
      case 'DELETE': return 'bg-red-500';
      case 'PATCH': return 'bg-purple-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusColor = (status: number) => {
    if (status >= 200 && status < 300) return 'text-green-600';
    if (status >= 400 && status < 500) return 'text-orange-600';
    if (status >= 500) return 'text-red-600';
    return 'text-gray-600';
  };

  const formatJson = (obj: any) => {
    try {
      return JSON.stringify(obj, null, 2);
    } catch {
      return obj?.toString() || '';
    }
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
    setEditData(apiData);
    if (onCancel) {
      onCancel();
    }
  };

  const renderParameters = (params: APIParameter[] = [], type: string) => {
    if (!params.length) return null;

    return (
      <div className="space-y-3">
        <h4 className="text-sm font-medium capitalize">{type} Parameters</h4>
        <div className="space-y-2">
          {params.map((param, index) => (
            <div key={index} className="border rounded-lg p-3 bg-muted/30">
              <div className="flex items-center gap-2 mb-2">
                <code className="text-sm bg-muted px-2 py-1 rounded">{param.name}</code>
                <Badge variant="outline" className="text-xs">
                  {param.type}
                </Badge>
                {param.required && (
                  <Badge variant="destructive" className="text-xs">
                    required
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground mb-2">{param.description}</p>
              {param.example !== undefined && (
                <div className="text-xs">
                  <span className="text-muted-foreground">Example: </span>
                  <code className="bg-muted px-1 py-0.5 rounded">
                    {typeof param.example === 'object' 
                      ? JSON.stringify(param.example) 
                      : param.example}
                  </code>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col">
      <ScrollArea className="flex-1">
        <div className="p-6 space-y-6">
          {/* API Header */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Badge 
                  className={`${getMethodColor(apiData.method)} text-white px-3 py-1 font-mono text-xs`}
                >
                  {apiData.method}
                </Badge>
                <code className="text-lg font-mono bg-muted px-3 py-1 rounded">
                  {apiData.endpoint}
                </code>
              </div>
              

            </div>
            
            <div>
              {isEditing ? (
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="api-title">API 標題</Label>
                    <Input
                      id="api-title"
                      value={editData.title}
                      onChange={(e) => setEditData(prev => ({ ...prev, title: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="api-description">描述</Label>
                    <Textarea
                      id="api-description"
                      value={editData.description}
                      onChange={(e) => setEditData(prev => ({ ...prev, description: e.target.value }))}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="api-method">HTTP 方法</Label>
                      <Select
                        value={editData.method}
                        onValueChange={(value: APIDocData['method']) => 
                          setEditData(prev => ({ ...prev, method: value }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="GET">GET</SelectItem>
                          <SelectItem value="POST">POST</SelectItem>
                          <SelectItem value="PUT">PUT</SelectItem>
                          <SelectItem value="DELETE">DELETE</SelectItem>
                          <SelectItem value="PATCH">PATCH</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="api-endpoint">端點路徑</Label>
                      <Input
                        id="api-endpoint"
                        value={editData.endpoint}
                        onChange={(e) => setEditData(prev => ({ ...prev, endpoint: e.target.value }))}
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <h1 className="text-xl font-semibold mb-2">{apiData.title}</h1>
                  <p className="text-muted-foreground">{apiData.description}</p>
                </>
              )}
            </div>

            {apiData.tags && (
              <div className="flex gap-2">
                {apiData.tags.map((tag, index) => (
                  <Badge key={index} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <Separator />

          {/* Parameters Section */}
          {apiData.parameters && Object.keys(apiData.parameters).length > 0 && (
            <Card>
              <Collapsible 
                open={expandedSections.parameters}
                onOpenChange={() => toggleSection('parameters')}
              >
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <FileText className="w-5 h-5" />
                        Parameters
                      </CardTitle>
                      {expandedSections.parameters ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="space-y-4">
                    {apiData.parameters.path && renderParameters(apiData.parameters.path, 'path')}
                    {apiData.parameters.query && renderParameters(apiData.parameters.query, 'query')}
                    {apiData.parameters.header && renderParameters(apiData.parameters.header, 'header')}
                    {apiData.parameters.body && renderParameters(apiData.parameters.body, 'body')}
                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
            </Card>
          )}

          {/* Responses Section */}
          <Card>
            <Collapsible 
              open={expandedSections.responses}
              onOpenChange={() => toggleSection('responses')}
            >
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <CheckCircle className="w-5 h-5" />
                      Responses
                    </CardTitle>
                    {expandedSections.responses ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="space-y-4">
                  {apiData.responses.map((response, index) => (
                    <div key={index} className="border rounded-lg p-4 bg-muted/30">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className={`${getStatusColor(response.statusCode)} bg-transparent border-current`}>
                          {response.statusCode}
                        </Badge>
                        <span className="text-sm">{response.description}</span>
                      </div>
                      
                      {response.example && (
                        <div className="mt-3">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs text-muted-foreground">Example Response:</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyToClipboard(formatJson(response.example), `response-${index}`)}
                              className="h-6 px-2"
                            >
                              {copiedCode === `response-${index}` ? (
                                <CheckCircle className="w-3 h-3" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </Button>
                          </div>
                          <pre className="text-xs bg-background border rounded p-3 overflow-auto">
                            <code>{formatJson(response.example)}</code>
                          </pre>
                        </div>
                      )}
                    </div>
                  ))}
                </CardContent>
              </CollapsibleContent>
            </Collapsible>
          </Card>

          {/* Examples Section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Code2 className="w-5 h-5" />
                Examples
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="request" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="request">Request</TabsTrigger>
                  <TabsTrigger value="response">Response</TabsTrigger>
                </TabsList>
                
                <TabsContent value="request" className="mt-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Request Example:</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(apiData.requestExample || '', 'request')}
                        className="h-6 px-2"
                      >
                        {copiedCode === 'request' ? (
                          <CheckCircle className="w-3 h-3" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </Button>
                    </div>
                    <pre className="text-xs bg-muted border rounded p-3 overflow-auto">
                      <code>{apiData.requestExample || '// No request example available'}</code>
                    </pre>
                  </div>
                </TabsContent>
                
                <TabsContent value="response" className="mt-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Response Example:</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(apiData.responseExample || '', 'response')}
                        className="h-6 px-2"
                      >
                        {copiedCode === 'response' ? (
                          <CheckCircle className="w-3 h-3" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </Button>
                    </div>
                    <pre className="text-xs bg-muted border rounded p-3 overflow-auto">
                      <code>{apiData.responseExample || '// No response example available'}</code>
                    </pre>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* Try It Out Section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Play className="w-5 h-5" />
                Try it out
              </CardTitle>
              <CardDescription>
                Test this API endpoint with your own parameters
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" disabled>
                <Play className="w-4 h-4 mr-2" />
                Execute Request
                <span className="ml-2 text-xs text-muted-foreground">(功能開發中)</span>
              </Button>
            </CardContent>
          </Card>
        </div>
      </ScrollArea>
    </div>
  );
}