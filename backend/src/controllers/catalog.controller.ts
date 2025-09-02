/**
 * Catalog Controller
 */

import { Request, Response, NextFunction } from 'express';
import { CatalogService } from '../services/catalog.service';
import { prisma } from '../config/database';

export class CatalogController {
  private catalogService: CatalogService;

  constructor() {
    this.catalogService = new CatalogService(prisma);
  }

  /**
   * 取得專案完整目錄樹
   */
  getProjectCatalog = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { projectId } = req.params;
      
      const catalog = await this.catalogService.getProjectCatalog(projectId);
      
      res.json({
        success: true,
        data: catalog,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * 取得模組目錄
   */
  getModuleCatalog = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { projectId } = req.params;
      
      const modules = await this.catalogService.getModuleCatalog(projectId);
      
      res.json({
        success: true,
        data: modules,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * 取得 API 目錄
   */
  getApiCatalog = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { projectId } = req.params;
      const { domain } = req.query;
      
      const catalog = await this.catalogService.getApiCatalog(
        projectId,
        domain as string | undefined
      );
      
      res.json({
        success: true,
        data: catalog,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * 取得 DTO 目錄
   */
  getDtoCatalog = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { projectId } = req.params;
      const { kind } = req.query;
      
      const catalog = await this.catalogService.getDtoCatalog(
        projectId,
        kind as 'request' | 'response' | undefined
      );
      
      res.json({
        success: true,
        data: catalog,
      });
    } catch (error) {
      next(error);
    }
  };
}

export default CatalogController;