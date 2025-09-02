/**
 * DTO Schema Controller
 */

import { Request, Response, NextFunction } from 'express';
import { DtoSchemaService } from '../services/dtoSchema.service';
import { prisma } from '../config/database';

export class DtoSchemaController {
  private dtoSchemaService: DtoSchemaService;

  constructor() {
    this.dtoSchemaService = new DtoSchemaService(prisma);
  }

  /**
   * 建立 DTO Schema
   */
  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { projectId } = req.params;
      const data = {
        ...req.body,
        projectId,
      };

      const dtoSchema = await this.dtoSchemaService.create(data);
      
      res.status(201).json({
        success: true,
        data: dtoSchema,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * 批次建立 DTO Schemas
   */
  batchCreate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { projectId } = req.params;
      const { dtos } = req.body;

      const dtoSchemas = await this.dtoSchemaService.batchCreate(projectId, dtos);
      
      res.status(201).json({
        success: true,
        data: dtoSchemas,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * 取得單一 DTO Schema
   */
  findById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      
      const dtoSchema = await this.dtoSchemaService.findById(id);
      
      res.json({
        success: true,
        data: dtoSchema,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * 依代碼取得 DTO Schema
   */
  findByCode = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { projectId, dtoCode } = req.params;
      
      const dtoSchema = await this.dtoSchemaService.findByCode(projectId, dtoCode);
      
      res.json({
        success: true,
        data: dtoSchema,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * 列出 DTO Schemas
   */
  findMany = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { projectId } = req.params;
      const { kind, title, page, limit, sortBy, sortOrder } = req.query;

      const filter = {
        projectId: projectId || (req.query.projectId as string),
        kind: kind as 'request' | 'response' | undefined,
        title: title as string | undefined,
      };

      const options = {
        page: page ? parseInt(page as string) : undefined,
        limit: limit ? parseInt(limit as string) : undefined,
        sortBy: sortBy as string | undefined,
        sortOrder: sortOrder as 'asc' | 'desc' | undefined,
      };

      const result = await this.dtoSchemaService.findMany(filter, options);
      
      res.json({
        success: true,
        ...result,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * 更新 DTO Schema
   */
  update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      
      const dtoSchema = await this.dtoSchemaService.update(id, req.body);
      
      res.json({
        success: true,
        data: dtoSchema,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * 刪除 DTO Schema
   */
  delete = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      
      await this.dtoSchemaService.delete(id);
      
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };

  /**
   * 產生 TypeScript 介面
   */
  generateTypeScript = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      
      const typescript = await this.dtoSchemaService.generateTypeScript(id);
      
      res.type('text/plain').send(typescript);
    } catch (error) {
      next(error);
    }
  };

  /**
   * 取得 DTO 統計資訊
   */
  getStatistics = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { projectId } = req.params;
      
      const stats = await this.dtoSchemaService.getStatistics(projectId);
      
      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  };
}

export default DtoSchemaController;