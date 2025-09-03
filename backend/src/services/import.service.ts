/**
 * 匯入服務 - 匯入專案資料
 */

import { PrismaClient } from '@prisma/client';
import { ExportData } from './export.service';
import { CodeGeneratorService } from './codeGenerator.service';
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

export interface ImportOptions {
  overwrite?: boolean;
  generateNewCodes?: boolean;
  skipValidation?: boolean;
  importedBy?: string;
}

export interface ImportResult {
  success: boolean;
  projectId?: string;
  imported: {
    project: boolean;
    modules: number;
    useCases: number;
    sequences: number;
    apis: number;
    dtos: number;
    links: number;
  };
  errors: Array<{
    type: string;
    message: string;
    details?: any;
  }>;
  warnings: Array<{
    type: string;
    message: string;
  }>;
}

export class ImportService {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * 驗證匯入資料格式
   */
  async validateImportData(data: any): Promise<{
    valid: boolean;
    errors: string[];
  }> {
    const errors: string[] = [];

    // 檢查必要欄位
    if (!data.version) {
      errors.push('Missing version field');
    }

    if (!data.project) {
      errors.push('Missing project data');
    } else {
      if (!data.project.name) {
        errors.push('Missing project name');
      }
      if (!data.project.projectCode) {
        errors.push('Missing project code');
      }
    }

    if (!Array.isArray(data.modules)) {
      errors.push('Modules must be an array');
    }

    if (!Array.isArray(data.useCases)) {
      errors.push('Use cases must be an array');
    }

    if (!Array.isArray(data.sequences)) {
      errors.push('Sequences must be an array');
    }

    if (!Array.isArray(data.apis)) {
      errors.push('APIs must be an array');
    }

    if (!Array.isArray(data.dtos)) {
      errors.push('DTOs must be an array');
    }

    // 檢查版本相容性
    if (data.version && !this.isVersionCompatible(data.version)) {
      errors.push(`Incompatible version: ${data.version}`);
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * 匯入專案資料
   */
  async importProject(
    data: ExportData,
    options: ImportOptions = {}
  ): Promise<ImportResult> {
    const {
      overwrite = false,
      generateNewCodes = false,
      skipValidation = false,
    } = options;

    const result: ImportResult = {
      success: false,
      imported: {
        project: false,
        modules: 0,
        useCases: 0,
        sequences: 0,
        apis: 0,
        dtos: 0,
        links: 0,
      },
      errors: [],
      warnings: [],
    };

    try {
      // 驗證資料
      if (!skipValidation) {
        const validation = await this.validateImportData(data);
        if (!validation.valid) {
          result.errors = validation.errors.map(e => ({
            type: 'validation',
            message: e,
          }));
          return result;
        }
      }

      // 檢查專案是否已存在
      const existingProject = await this.prisma.project.findUnique({
        where: { projectCode: data.project.projectCode },
      });

      if (existingProject && !overwrite) {
        result.errors.push({
          type: 'duplicate',
          message: `Project with code ${data.project.projectCode} already exists`,
        });
        return result;
      }

      // 使用交易確保原子性
      await this.prisma.$transaction(async (tx) => {
        // 如果覆蓋，先刪除舊專案
        if (existingProject && overwrite) {
          await tx.project.delete({
            where: { id: existingProject.id },
          });
          result.warnings.push({
            type: 'overwrite',
            message: `Overwriting existing project ${existingProject.projectCode}`,
          });
        }

        // 建立 ID 映射表（舊 ID -> 新 ID）
        const idMap = new Map<string, string>();

        // 匯入專案
        const projectData = { ...data.project };
        delete projectData.id;
        
        if (generateNewCodes) {
          projectData.projectCode = await CodeGeneratorService.generateProjectCode(projectData.name);
        }

        const newProject = await tx.project.create({
          data: projectData,
        });
        
        idMap.set(data.project.id, newProject.id);
        result.projectId = newProject.id;
        result.imported.project = true;

        // 匯入模組
        for (const module of data.modules) {
          const moduleData = { ...module };
          const oldId = moduleData.id;
          delete moduleData.id;
          
          moduleData.projectId = newProject.id;
          
          if (moduleData.parentId) {
            moduleData.parentId = idMap.get(moduleData.parentId) || null;
          }
          
          if (generateNewCodes) {
            moduleData.modCode = await CodeGeneratorService.generateModuleCode(newProject.id);
          }

          const newModule = await tx.module.create({
            data: moduleData,
          });
          
          idMap.set(oldId, newModule.id);
          result.imported.modules++;
        }

        // 匯入使用案例
        for (const useCase of data.useCases) {
          const useCaseData = { ...useCase };
          const oldId = useCaseData.id;
          delete useCaseData.id;
          
          useCaseData.projectId = newProject.id;
          useCaseData.moduleId = idMap.get(useCaseData.moduleId)!;
          
          if (generateNewCodes) {
            useCaseData.ucCode = await CodeGeneratorService.generateUseCaseCode(
              newProject.id,
              useCaseData.moduleId
            );
          }

          const newUseCase = await tx.useCase.create({
            data: useCaseData,
          });
          
          idMap.set(oldId, newUseCase.id);
          result.imported.useCases++;
        }

        // 匯入序列圖
        for (const sequence of data.sequences) {
          const sequenceData = { ...sequence };
          const oldId = sequenceData.id;
          delete sequenceData.id;
          
          sequenceData.projectId = newProject.id;
          sequenceData.useCaseId = idMap.get(sequenceData.useCaseId)!;
          
          if (generateNewCodes) {
            sequenceData.sdCode = await CodeGeneratorService.generateSequenceCode(
              newProject.id,
              sequenceData.useCaseId
            );
          }

          const newSequence = await tx.sequenceDiagram.create({
            data: sequenceData,
          });
          
          idMap.set(oldId, newSequence.id);
          result.imported.sequences++;
        }

        // 匯入 API
        for (const api of data.apis) {
          const apiData = { ...api };
          const oldId = apiData.id;
          delete apiData.id;
          
          apiData.projectId = newProject.id;
          
          if (generateNewCodes) {
            apiData.apiCode = await CodeGeneratorService.generateApiCode(
              newProject.id,
              apiData.domain
            );
          }

          const newApi = await tx.apiContract.create({
            data: apiData,
          });
          
          idMap.set(oldId, newApi.id);
          result.imported.apis++;
        }

        // 匯入 DTO
        for (const dto of data.dtos) {
          const dtoData = { ...dto };
          const oldId = dtoData.id;
          delete dtoData.id;
          
          dtoData.projectId = newProject.id;
          
          if (generateNewCodes) {
            dtoData.dtoCode = await CodeGeneratorService.generateDtoCode(
              newProject.id,
              dtoData.title
            );
          }

          const newDto = await tx.dtoSchema.create({
            data: dtoData,
          });
          
          idMap.set(oldId, newDto.id);
          result.imported.dtos++;
        }

        // 匯入 API-Sequence 關聯
        if (data.apiSequenceLinks) {
          for (const link of data.apiSequenceLinks) {
            const linkData = { ...link };
            delete linkData.id;
            
            linkData.apiId = idMap.get(linkData.apiId)!;
            linkData.sequenceId = idMap.get(linkData.sequenceId)!;
            
            if (linkData.apiId && linkData.sequenceId) {
              await tx.apiSequenceLink.create({
                data: linkData,
              });
              result.imported.links++;
            }
          }
        }

        // 匯入 API-DTO 關聯
        if (data.apiDtoLinks) {
          for (const link of data.apiDtoLinks) {
            const linkData = { ...link };
            delete linkData.id;
            
            linkData.apiId = idMap.get(linkData.apiId)!;
            linkData.dtoId = idMap.get(linkData.dtoId)!;
            
            if (linkData.apiId && linkData.dtoId) {
              await tx.apiDtoLink.create({
                data: linkData,
              });
              result.imported.links++;
            }
          }
        }
      });

      result.success = true;
      logger.info(`Imported project: ${result.imported.modules} modules, ${result.imported.useCases} use cases, etc.`);
      
    } catch (error: any) {
      logger.error('Import failed:', error);
      result.errors.push({
        type: 'system',
        message: 'Import failed',
        details: error.message,
      });
    }

    return result;
  }

  /**
   * 檢查版本相容性
   */
  private isVersionCompatible(version: string): boolean {
    // 簡單的版本檢查，實際可以更複雜
    const supportedVersions = ['1.0.0', '1.0', '1'];
    return supportedVersions.some(v => version.startsWith(v));
  }
}

export default ImportService;