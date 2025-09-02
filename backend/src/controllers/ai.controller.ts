/**
 * AI Controller
 */

import { Request, Response, NextFunction } from 'express';
import { AiGeneratorService } from '../services/aiGenerator.service';
import { prisma } from '../config/database';

export class AiController {
  private aiService: AiGeneratorService;

  constructor() {
    this.aiService = new AiGeneratorService(prisma);
  }

  /**
   * 生成內容
   */
  generate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { type, ...params } = req.body;
      
      let draft: any;
      
      switch (type) {
        case 'sequence':
          draft = await this.aiService.generateSequence(params);
          break;
        case 'api':
          draft = await this.aiService.generateApi(params);
          break;
        case 'dto':
          draft = await this.aiService.generateDto(params);
          break;
        default:
          res.status(400).json({
            success: false,
            error: {
              code: 'VAL_INVALID_INPUT',
              message: `Unknown generation type: ${type}`,
            },
          });
          return;
      }
      
      res.json({
        success: true,
        data: draft,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * 取得 AI 草稿
   */
  getDraft = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { draftId } = req.params;
      
      const draft = await this.aiService.getDraft(draftId);
      
      res.json({
        success: true,
        data: draft,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * 採用 AI 草稿
   */
  adoptDraft = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { draftId } = req.body;
      
      if (!draftId) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VAL_INVALID_INPUT',
            message: 'Draft ID is required',
          },
        });
        return;
      }
      
      const result = await this.aiService.adoptDraft(draftId);
      
      res.status(201).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * 刪除 AI 草稿
   */
  deleteDraft = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { draftId } = req.params;
      
      this.aiService.deleteDraft(draftId);
      
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };

  /**
   * 取得 AI 模板
   */
  getTemplates = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const templates = this.aiService.getTemplates();
      
      res.json({
        success: true,
        data: templates,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * 根據序列圖建議 API
   */
  suggestApis = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { sequenceId } = req.body;
      
      if (!sequenceId) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VAL_INVALID_INPUT',
            message: 'Sequence ID is required',
          },
        });
        return;
      }
      
      const draft = await this.aiService.suggestApisFromSequence(sequenceId);
      
      res.json({
        success: true,
        data: draft,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * 根據 API 建議 DTO
   */
  suggestDtos = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { apiId } = req.body;
      
      if (!apiId) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VAL_INVALID_INPUT',
            message: 'API ID is required',
          },
        });
        return;
      }
      
      const draft = await this.aiService.suggestDtosFromApi(apiId);
      
      res.json({
        success: true,
        data: draft,
      });
    } catch (error) {
      next(error);
    }
  };
}

export default AiController;