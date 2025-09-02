/**
 * 流水號生成服務
 */

import { prisma } from '../config/database';
import { Prisma } from '@prisma/client';
import { AppError, ErrorCode } from '../types/errors';
import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    }),
  ],
});

export enum ScopeType {
  MODULE = 'MODULE',
  USE_CASE = 'USE_CASE',
  SEQUENCE = 'SEQUENCE',
  API = 'API',
  DTO = 'DTO',
}

export interface CodeGeneratorOptions {
  projectId: string;
  scopeType: ScopeType;
  scopeRef1?: string | null;
  scopeRef2?: string | null;
}

export class CodeGeneratorService {
  private static readonly MAX_RETRY_ATTEMPTS = 3;
  private static readonly RETRY_DELAY_MS = 100;

  /**
   * 生成代碼
   */
  static async generateCode(
    options: CodeGeneratorOptions & { prefix: string; domain?: string }
  ): Promise<string> {
    const { projectId, scopeType, scopeRef1, scopeRef2, prefix, domain } = options;

    for (let attempt = 1; attempt <= this.MAX_RETRY_ATTEMPTS; attempt++) {
      try {
        // 在交易中執行以確保原子性
        const result = await prisma.$transaction(async (tx) => {
          // 查找或建立計數器
          let counter = await tx.seqCounter.findUnique({
            where: {
              projectId_scopeType_scopeRef1_scopeRef2: {
                projectId,
                scopeType,
                scopeRef1: scopeRef1 || '',
                scopeRef2: scopeRef2 || '',
              },
            },
          });

          let nextNumber: number;

          if (counter) {
            // 更新現有計數器
            nextNumber = Number(counter.nextNumber);
            await tx.seqCounter.update({
              where: { id: counter.id },
              data: { nextNumber: { increment: 1 } },
            });
          } else {
            // 建立新計數器
            nextNumber = 1;
            await tx.seqCounter.create({
              data: {
                projectId,
                scopeType,
                scopeRef1: scopeRef1 || '',
                scopeRef2: scopeRef2 || '',
                nextNumber: 2,
              },
            });
          }

          // 生成代碼
          const code = this.formatCode(prefix, nextNumber, domain);
          return code;
        }, {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
          maxWait: 5000,
          timeout: 10000,
        });

        logger.debug(`Generated code: ${result} for ${scopeType}`);
        return result;

      } catch (error: any) {
        // 如果是併發衝突，重試
        if (
          attempt < this.MAX_RETRY_ATTEMPTS &&
          (error.code === 'P2034' || // Transaction conflict
           error.code === 'P2002')   // Unique constraint violation
        ) {
          logger.warn(`Code generation conflict, retrying... (attempt ${attempt}/${this.MAX_RETRY_ATTEMPTS})`);
          await this.delay(this.RETRY_DELAY_MS * attempt);
          continue;
        }

        logger.error('Failed to generate code:', error);
        throw new AppError(
          500,
          ErrorCode.SYS_INTERNAL_ERROR,
          'Failed to generate code',
          { originalError: error.message }
        );
      }
    }

    throw new AppError(
      500,
      ErrorCode.SYS_INTERNAL_ERROR,
      'Failed to generate code after maximum retries'
    );
  }

  /**
   * 生成 Module 代碼
   */
  static async generateModuleCode(projectId: string): Promise<string> {
    return this.generateCode({
      projectId,
      scopeType: ScopeType.MODULE,
      prefix: 'MOD',
    });
  }

  /**
   * 生成 Use Case 代碼
   */
  static async generateUseCaseCode(
    projectId: string,
    moduleId: string
  ): Promise<string> {
    return this.generateCode({
      projectId,
      scopeType: ScopeType.USE_CASE,
      scopeRef1: moduleId,
      prefix: 'UC',
    });
  }

  /**
   * 生成 Sequence Diagram 代碼
   */
  static async generateSequenceCode(
    projectId: string,
    _useCaseId: string
  ): Promise<string> {
    // 序列圖代碼在整個專案內唯一，不分用例
    return this.generateCode({
      projectId,
      scopeType: ScopeType.SEQUENCE,
      scopeRef1: null, // 使用 null 表示專案範圍
      prefix: 'SD',
    });
  }

  /**
   * 生成 API 代碼
   */
  static async generateApiCode(
    projectId: string,
    domain: string = 'GEN'
  ): Promise<string> {
    // 確保 domain 格式正確
    const normalizedDomain = this.normalizeDomain(domain);
    
    return this.generateCode({
      projectId,
      scopeType: ScopeType.API,
      scopeRef1: normalizedDomain,
      prefix: 'API',
      domain: normalizedDomain,
    });
  }

  /**
   * 生成 DTO 代碼
   */
  static async generateDtoCode(
    projectId: string,
    title: string
  ): Promise<string> {
    // 從 title 提取名稱基底
    const nameBase = this.extractDtoNameBase(title);
    
    return this.generateCode({
      projectId,
      scopeType: ScopeType.DTO,
      scopeRef1: nameBase,
      prefix: 'DTO',
      domain: nameBase,
    });
  }

  /**
   * 生成專案代碼
   */
  static async generateProjectCode(name: string): Promise<string> {
    const prefix = name
      .split(/\s+/)
      .map(word => word.charAt(0).toUpperCase())
      .join('')
      .slice(0, 3) || 'PRJ';
    
    const timestamp = Date.now().toString(36).toUpperCase().slice(-4);
    const random = Math.random().toString(36).toUpperCase().slice(2, 5);
    
    return `${prefix}-${timestamp}${random}`;
  }

  /**
   * 格式化代碼
   */
  private static formatCode(
    prefix: string,
    number: number,
    domain?: string
  ): string {
    const paddedNumber = this.padNumber(number);
    
    if (domain && (prefix === 'API' || prefix === 'DTO')) {
      return `${prefix}-${domain}-${paddedNumber}`;
    }
    
    return `${prefix}-${paddedNumber}`;
  }

  /**
   * 補零
   */
  private static padNumber(number: number, minDigits: number = 3): string {
    const numStr = number.toString();
    if (numStr.length >= minDigits) {
      return numStr;
    }
    return numStr.padStart(minDigits, '0');
  }

  /**
   * 正規化 domain
   */
  private static normalizeDomain(domain: string): string {
    if (!domain || domain.trim() === '') {
      return 'GEN';
    }
    
    // 只保留英數字和連字號，轉大寫
    const normalized = domain
      .toUpperCase()
      .replace(/[^A-Z0-9-]/g, '')
      .replace(/^-+|-+$/g, '') // 移除開頭和結尾的連字號
      .replace(/-+/g, '-');    // 多個連字號合併為一個
    
    return normalized || 'GEN';
  }

  /**
   * 從 title 提取 DTO 名稱基底
   */
  private static extractDtoNameBase(title: string): string {
    if (!title || title.trim() === '') {
      return 'Unknown';
    }
    
    // 移除空白，保留英數字和部分符號
    const base = title
      .replace(/\s+/g, '')
      .replace(/[^a-zA-Z0-9]/g, '');
    
    if (!base) {
      return 'Unknown';
    }
    
    // 確保第一個字母大寫（PascalCase）
    return base.charAt(0).toUpperCase() + base.slice(1);
  }

  /**
   * 延遲執行
   */
  private static delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * 取得流水號使用狀況
   */
  static async getUsageStats(projectId: string): Promise<any> {
    const counters = await prisma.seqCounter.findMany({
      where: { projectId },
      orderBy: [
        { scopeType: 'asc' },
        { scopeRef1: 'asc' },
      ],
    });

    const stats = counters.reduce((acc, counter) => {
      const type = counter.scopeType;
      if (!acc[type]) {
        acc[type] = {
          total: 0,
          details: [],
        };
      }
      
      acc[type].total += Number(counter.nextNumber) - 1;
      acc[type].details.push({
        scope: counter.scopeRef1 || 'default',
        count: Number(counter.nextNumber) - 1,
        nextNumber: Number(counter.nextNumber),
      });
      
      return acc;
    }, {} as Record<string, any>);

    return stats;
  }
}

export default CodeGeneratorService;