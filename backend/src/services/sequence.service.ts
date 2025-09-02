import { PrismaClient, SequenceDiagram, Prisma } from '@prisma/client';
import { prisma } from '../config/database';
import { AppError, ErrorCode } from '../types/errors';
import { CodeGeneratorService } from './codeGenerator.service';
import MermaidParserService, { ParsedApiCall } from './mermaidParser.service';

export interface CreateSequenceInput {
  useCaseId: string;
  title: string;
  mermaidSrc: string;
}

export interface UpdateSequenceInput {
  title?: string;
  mermaidSrc?: string;
}

export interface SequenceListParams {
  useCaseId?: string;
  projectId?: string;
  parseStatus?: 'pending' | 'success' | 'error';
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: 'sdCode' | 'title' | 'createdAt' | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
}

export interface SequenceWithRelations extends SequenceDiagram {
  useCase?: any;
  project?: any;
  apiSequenceLinks?: any[];
  _count?: {
    apiSequenceLinks: number;
  };
}

export interface ParsedSequence extends SequenceDiagram {
  parsedData?: {
    participants: string[];
    apiCalls: ParsedApiCall[];
  } | null;
}

export class SequenceService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = prisma;
  }

  /**
   * 建立序列圖
   */
  async create(data: CreateSequenceInput): Promise<ParsedSequence> {
    // 驗證用例是否存在
    const useCase = await this.prisma.useCase.findUnique({
      where: { id: data.useCaseId },
      include: { project: true },
    });

    if (!useCase) {
      throw new AppError(
        404,
        ErrorCode.BIZ_NOT_FOUND,
        `UseCase with ID ${data.useCaseId} not found`
      );
    }

    // 驗證並解析 Mermaid 語法
    const validation = MermaidParserService.validate(data.mermaidSrc);
    let parseStatus = 'pending';
    let parseError: string | null = null;
    let parsedData = null;

    if (!validation.valid) {
      parseStatus = 'error';
      parseError = validation.error || 'Invalid Mermaid syntax';
    } else {
      const parseResult = MermaidParserService.parse(data.mermaidSrc);
      if (parseResult.success) {
        parseStatus = 'success';
        parsedData = {
          participants: parseResult.participants,
          apiCalls: parseResult.apiCalls,
        };
      } else {
        parseStatus = 'error';
        parseError = parseResult.error || 'Failed to parse Mermaid';
      }
    }

    // 生成序列圖代碼
    const sdCode = await CodeGeneratorService.generateSequenceCode(
      useCase.projectId,
      data.useCaseId
    );

    // 格式化 Mermaid 原始碼
    const formattedSrc = MermaidParserService.format(data.mermaidSrc);

    const sequence = await this.prisma.sequenceDiagram.create({
      data: {
        projectId: useCase.projectId,
        useCaseId: data.useCaseId,
        sdCode,
        title: data.title,
        mermaidSrc: formattedSrc,
        parseStatus,
        parseError,
      },
    });

    return {
      ...sequence,
      parsedData,
    };
  }

  /**
   * 查詢序列圖列表
   */
  async findAll(params: SequenceListParams = {}): Promise<{
    data: SequenceWithRelations[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const {
      useCaseId,
      projectId,
      parseStatus,
      search,
      page = 1,
      limit = 10,
      sortBy = 'sdCode',
      sortOrder = 'asc',
    } = params;

    const skip = (page - 1) * limit;
    
    const where: Prisma.SequenceDiagramWhereInput = {};
    
    if (useCaseId) {
      where.useCaseId = useCaseId;
    }
    
    if (projectId) {
      where.projectId = projectId;
    }
    
    if (parseStatus) {
      where.parseStatus = parseStatus;
    }
    
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { sdCode: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.sequenceDiagram.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          useCase: {
            include: {
              module: true,
            },
          },
          project: true,
          _count: {
            select: {
              apiSequenceLinks: true,
            },
          },
        },
      }),
      this.prisma.sequenceDiagram.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * 取得單一序列圖詳情
   */
  async findById(id: string): Promise<ParsedSequence> {
    const sequence = await this.prisma.sequenceDiagram.findUnique({
      where: { id },
      include: {
        useCase: {
          include: {
            module: true,
          },
        },
        project: true,
        apiSequenceLinks: true,
        _count: {
          select: {
            apiSequenceLinks: true,
          },
        },
      },
    });

    if (!sequence) {
      throw new AppError(
        404,
        ErrorCode.BIZ_NOT_FOUND,
        `Sequence diagram with ID ${id} not found`
      );
    }

    // 如果狀態是成功，重新解析以取得最新資料
    let parsedData = null;
    if (sequence.parseStatus === 'success') {
      const parseResult = MermaidParserService.parse(sequence.mermaidSrc);
      if (parseResult.success) {
        parsedData = {
          participants: parseResult.participants,
          apiCalls: parseResult.apiCalls,
        };
      }
    }

    return {
      ...sequence,
      parsedData,
    };
  }

  /**
   * 更新序列圖
   */
  async update(id: string, data: UpdateSequenceInput): Promise<ParsedSequence> {
    const existingSequence = await this.prisma.sequenceDiagram.findUnique({
      where: { id },
    });

    if (!existingSequence) {
      throw new AppError(
        404,
        ErrorCode.BIZ_NOT_FOUND,
        `Sequence diagram with ID ${id} not found`
      );
    }

    const updateData: any = {
      ...data,
      updatedAt: new Date(),
    };

    // 如果更新了 Mermaid 原始碼，重新解析
    if (data.mermaidSrc) {
      const validation = MermaidParserService.validate(data.mermaidSrc);
      
      if (!validation.valid) {
        updateData.parseStatus = 'error';
        updateData.parseError = validation.error || 'Invalid Mermaid syntax';
      } else {
        const parseResult = MermaidParserService.parse(data.mermaidSrc);
        if (parseResult.success) {
          updateData.parseStatus = 'success';
          updateData.parseError = null;
        } else {
          updateData.parseStatus = 'error';
          updateData.parseError = parseResult.error || 'Failed to parse Mermaid';
        }
      }

      // 格式化 Mermaid 原始碼
      updateData.mermaidSrc = MermaidParserService.format(data.mermaidSrc);
    }

    const updated = await this.prisma.sequenceDiagram.update({
      where: { id },
      data: updateData,
    });

    // 重新解析以取得最新資料
    let parsedData = null;
    if (updated.parseStatus === 'success') {
      const parseResult = MermaidParserService.parse(updated.mermaidSrc);
      if (parseResult.success) {
        parsedData = {
          participants: parseResult.participants,
          apiCalls: parseResult.apiCalls,
        };
      }
    }

    return {
      ...updated,
      parsedData,
    };
  }

  /**
   * 刪除序列圖
   */
  async delete(id: string): Promise<void> {
    const sequence = await this.prisma.sequenceDiagram.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            apiSequenceLinks: true,
          },
        },
      },
    });

    if (!sequence) {
      throw new AppError(
        404,
        ErrorCode.BIZ_NOT_FOUND,
        `Sequence diagram with ID ${id} not found`
      );
    }

    // 刪除會自動級聯刪除相關的 apiSequenceLinks
    await this.prisma.sequenceDiagram.delete({
      where: { id },
    });
  }

  /**
   * 重新解析序列圖
   */
  async reparse(id: string): Promise<ParsedSequence> {
    const sequence = await this.prisma.sequenceDiagram.findUnique({
      where: { id },
    });

    if (!sequence) {
      throw new AppError(
        404,
        ErrorCode.BIZ_NOT_FOUND,
        `Sequence diagram with ID ${id} not found`
      );
    }

    // 重新驗證和解析
    const validation = MermaidParserService.validate(sequence.mermaidSrc);
    let parseStatus = 'pending';
    let parseError: string | null = null;
    let parsedData = null;

    if (!validation.valid) {
      parseStatus = 'error';
      parseError = validation.error || 'Invalid Mermaid syntax';
    } else {
      const parseResult = MermaidParserService.parse(sequence.mermaidSrc);
      if (parseResult.success) {
        parseStatus = 'success';
        parseError = null;
        parsedData = {
          participants: parseResult.participants,
          apiCalls: parseResult.apiCalls,
        };
      } else {
        parseStatus = 'error';
        parseError = parseResult.error || 'Failed to parse Mermaid';
      }
    }

    // 更新解析狀態
    const updated = await this.prisma.sequenceDiagram.update({
      where: { id },
      data: {
        parseStatus,
        parseError,
        updatedAt: new Date(),
      },
    });

    return {
      ...updated,
      parsedData,
    };
  }

  /**
   * 複製序列圖
   */
  async duplicate(id: string, newTitle: string): Promise<ParsedSequence> {
    const sourceSequence = await this.prisma.sequenceDiagram.findUnique({
      where: { id },
    });

    if (!sourceSequence) {
      throw new AppError(
        404,
        ErrorCode.BIZ_NOT_FOUND,
        `Sequence diagram with ID ${id} not found`
      );
    }

    // 生成新的序列圖代碼
    const sdCode = await CodeGeneratorService.generateSequenceCode(
      sourceSequence.projectId,
      sourceSequence.useCaseId
    );

    const newSequence = await this.prisma.sequenceDiagram.create({
      data: {
        projectId: sourceSequence.projectId,
        useCaseId: sourceSequence.useCaseId,
        sdCode,
        title: newTitle,
        mermaidSrc: sourceSequence.mermaidSrc,
        parseStatus: sourceSequence.parseStatus,
        parseError: sourceSequence.parseError,
      },
    });

    // 如果解析成功，返回解析資料
    let parsedData = null;
    if (newSequence.parseStatus === 'success') {
      const parseResult = MermaidParserService.parse(newSequence.mermaidSrc);
      if (parseResult.success) {
        parsedData = {
          participants: parseResult.participants,
          apiCalls: parseResult.apiCalls,
        };
      }
    }

    return {
      ...newSequence,
      parsedData,
    };
  }

  /**
   * 取得解析錯誤的序列圖
   */
  async getParseErrors(projectId?: string): Promise<SequenceDiagram[]> {
    const where: Prisma.SequenceDiagramWhereInput = {
      parseStatus: 'error',
    };

    if (projectId) {
      where.projectId = projectId;
    }

    return this.prisma.sequenceDiagram.findMany({
      where,
      include: {
        useCase: {
          include: {
            module: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  /**
   * 產生範例 Mermaid 原始碼
   */
  static generateExample(): string {
    return `sequenceDiagram
  participant User
  participant Frontend
  participant Backend
  participant Database

  User->>Frontend: 點擊登入
  Frontend->>Backend: POST /api/auth/login
  Backend->>Database: 查詢使用者資料
  Database-->>Backend: 返回使用者資料
  Backend-->>Frontend: 返回 JWT Token
  Frontend-->>User: 顯示登入成功`;
  }
}

export default new SequenceService();