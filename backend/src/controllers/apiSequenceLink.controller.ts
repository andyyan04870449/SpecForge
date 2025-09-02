/**
 * API-Sequence Link Controller
 */

import { Request, Response, NextFunction } from 'express';
import { ApiSequenceLinkService } from '../services/apiSequenceLink.service';
import { prisma } from '../config/database';

export class ApiSequenceLinkController {
  private apiSequenceLinkService: ApiSequenceLinkService;

  constructor() {
    this.apiSequenceLinkService = new ApiSequenceLinkService(prisma);
  }

  /**
   * 建立關聯
   */
  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const link = await this.apiSequenceLinkService.create(req.body);
      
      res.status(201).json({
        success: true,
        data: link,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * 批次建立關聯
   */
  batchCreate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { links } = req.body;
      const created = await this.apiSequenceLinkService.batchCreate(links);
      
      res.status(201).json({
        success: true,
        data: created,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * 取得單一關聯
   */
  findById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const link = await this.apiSequenceLinkService.findById(id);
      
      res.json({
        success: true,
        data: link,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * 列出關聯
   */
  findMany = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { apiId, sequenceId, projectId, page, limit, includeDetails } = req.query;

      const filter = {
        apiId: apiId as string | undefined,
        sequenceId: sequenceId as string | undefined,
        projectId: projectId as string | undefined,
      };

      const options = {
        page: page ? parseInt(page as string) : undefined,
        limit: limit ? parseInt(limit as string) : undefined,
        includeDetails: includeDetails === 'true',
      };

      const result = await this.apiSequenceLinkService.findMany(filter, options);
      
      res.json({
        success: true,
        ...result,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * 更新關聯
   */
  update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const link = await this.apiSequenceLinkService.update(id, req.body);
      
      res.json({
        success: true,
        data: link,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * 刪除關聯
   */
  delete = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      await this.apiSequenceLinkService.delete(id);
      
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };

  /**
   * 依 API 取得 Sequences
   */
  findSequencesByApi = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { apiId } = req.params;
      const sequences = await this.apiSequenceLinkService.findSequencesByApi(apiId);
      
      res.json({
        success: true,
        data: sequences,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * 依 Sequence 取得 APIs
   */
  findApisBySequence = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { sequenceId } = req.params;
      const apis = await this.apiSequenceLinkService.findApisBySequence(sequenceId);
      
      res.json({
        success: true,
        data: apis,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * 自動偵測關聯
   */
  autoDetect = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { sequenceId } = req.params;
      const links = await this.apiSequenceLinkService.autoDetectLinks(sequenceId);
      
      res.json({
        success: true,
        data: links,
      });
    } catch (error) {
      next(error);
    }
  };
}

export default ApiSequenceLinkController;