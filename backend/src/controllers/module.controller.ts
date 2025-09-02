import { Request, Response } from 'express';
import moduleService from '../services/module.service';
import { asyncHandler } from '../middlewares/errorHandler';

export class ModuleController {
  create = asyncHandler(async (req: Request, res: Response) => {
    const module = await moduleService.create({
      projectId: req.params.projectId,
      ...req.body,
    });
    res.status(201).json({
      success: true,
      data: module,
    });
  });

  findAll = asyncHandler(async (req: Request, res: Response) => {
    const result = await moduleService.findAll({
      projectId: req.params.projectId,
      ...req.query,
    });
    res.json({
      success: true,
      data: result.data,
      meta: {
        total: result.total,
      },
    });
  });

  findById = asyncHandler(async (req: Request, res: Response) => {
    const module = await moduleService.findById(req.params.moduleId);
    res.json({
      success: true,
      data: module,
    });
  });

  update = asyncHandler(async (req: Request, res: Response) => {
    const module = await moduleService.update(req.params.moduleId, req.body);
    res.json({
      success: true,
      data: module,
    });
  });

  delete = asyncHandler(async (req: Request, res: Response) => {
    await moduleService.delete(req.params.moduleId);
    res.status(204).send();
  });

  getModuleTree = asyncHandler(async (req: Request, res: Response) => {
    const tree = await moduleService.getModuleTree(req.params.projectId);
    res.json({
      success: true,
      data: tree,
    });
  });

  reorder = asyncHandler(async (req: Request, res: Response) => {
    const module = await moduleService.reorder(
      req.params.moduleId,
      req.body.order
    );
    res.json({
      success: true,
      data: module,
    });
  });
}

export default new ModuleController();