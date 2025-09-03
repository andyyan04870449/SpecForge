// Backend data types
export interface ModuleData {
  id: string;
  projectId: string;
  modCode: string;
  title: string;
  description?: string;
  parentId?: string;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface UseCaseData {
  id: string;
  projectId: string;
  moduleId: string;
  ucCode: string;
  title: string;
  summary?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SequenceDiagramData {
  id: string;
  projectId: string;
  useCaseId: string;
  sdCode: string;
  title: string;
  mermaidSrc: string;
  parseStatus: string;
  parseError?: string;
  createdAt: string;
  updatedAt: string;
}

export interface APIContractData {
  id: string;
  projectId: string;
  apiCode: string;
  method: string;
  endpoint: string;
  title: string;
  description?: string;
  domain: string;
  requestSpec?: any;
  responseSpec?: any;
  headers?: any;
  queryParams?: any;
  pathParams?: any;
  statusCodes?: any;
  createdAt: string;
  updatedAt: string;
}

export interface DTOSchemaData {
  id: string;
  projectId: string;
  dtoCode: string;
  title: string;
  schemaJson: any;
  kind: string;
  createdAt: string;
  updatedAt: string;
}