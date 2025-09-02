/**
 * Search Controller
 */

import { Request, Response, NextFunction } from 'express';
import { SearchService } from '../services/search.service';
import { prisma } from '../config/database';

export class SearchController {
  private searchService: SearchService;

  constructor() {
    this.searchService = new SearchService(prisma);
  }

  /**
   * 執行搜尋
   */
  search = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { q, query, projectId, types, limit, page } = req.query;
      
      const searchQuery = (q || query) as string;
      
      const result = await this.searchService.search({
        query: searchQuery,
        projectId: projectId as string | undefined,
        types: types ? (types as string).split(',') : undefined,
        limit: limit ? parseInt(limit as string) : undefined,
        page: page ? parseInt(page as string) : undefined,
      });
      
      res.json({
        success: true,
        ...result,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * 取得搜尋建議
   */
  suggest = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { q, query, projectId, limit } = req.query;
      
      const searchQuery = (q || query) as string;
      
      const suggestions = await this.searchService.suggest(
        searchQuery,
        projectId as string | undefined,
        limit ? parseInt(limit as string) : undefined
      );
      
      res.json({
        success: true,
        data: suggestions,
      });
    } catch (error) {
      next(error);
    }
  };
}

export default SearchController;