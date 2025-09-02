import { Request, Response } from 'express';
import projectService from '../services/project.service';
import { asyncHandler } from '../middlewares/errorHandler';

export class ProjectController {
  create = asyncHandler(async (req: Request, res: Response) => {
    // 自動設定建立者為專案擁有者
    const projectData = {
      ...req.body,
      ownerId: req.user?.userId
    };
    const project = await projectService.create(projectData);
    res.status(201).json({
      success: true,
      data: project,
    });
  });

  findAll = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.userId; // 從認證中介軟體獲取使用者 ID
    
    // 轉換 query string 參數為正確的型別
    const params = {
      page: req.query.page ? parseInt(req.query.page as string) : undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
      search: req.query.search as string,
      status: req.query.status as any,
      sortBy: req.query.sortBy as any,
      sortOrder: req.query.sortOrder as any,
    };
    
    const result = await projectService.findAll(params, userId);
    res.json({
      success: true,
      data: result.data,
      meta: {
        total: result.total,
        page: result.page,
        totalPages: result.totalPages,
      },
    });
  });

  findById = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.userId;
    const project = await projectService.findById(req.params.projectId, userId);
    res.json({
      success: true,
      data: project,
    });
  });

  update = asyncHandler(async (req: Request, res: Response) => {
    const project = await projectService.update(req.params.projectId, req.body);
    res.json({
      success: true,
      data: project,
    });
  });

  delete = asyncHandler(async (req: Request, res: Response) => {
    await projectService.delete(req.params.projectId);
    res.status(204).send();
  });

  getStatistics = asyncHandler(async (req: Request, res: Response) => {
    const stats = await projectService.getStatistics(req.params.projectId);
    res.json({
      success: true,
      data: stats,
    });
  });
}

export default new ProjectController();