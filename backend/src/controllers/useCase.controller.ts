import { Request, Response } from 'express';
import useCaseService from '../services/useCase.service';
import { asyncHandler } from '../middlewares/errorHandler';

export class UseCaseController {
  create = asyncHandler(async (req: Request, res: Response) => {
    const useCase = await useCaseService.create({
      moduleId: req.params.moduleId,
      ...req.body,
    });
    res.status(201).json({
      success: true,
      data: useCase,
    });
  });

  findAll = asyncHandler(async (req: Request, res: Response) => {
    const result = await useCaseService.findAll(req.query);
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

  findByModule = asyncHandler(async (req: Request, res: Response) => {
    const result = await useCaseService.findAll({
      moduleId: req.params.moduleId,
      ...req.query,
    });
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
    const useCase = await useCaseService.findById(req.params.useCaseId);
    res.json({
      success: true,
      data: useCase,
    });
  });

  update = asyncHandler(async (req: Request, res: Response) => {
    const useCase = await useCaseService.update(req.params.useCaseId, req.body);
    res.json({
      success: true,
      data: useCase,
    });
  });

  delete = asyncHandler(async (req: Request, res: Response) => {
    await useCaseService.delete(req.params.useCaseId);
    res.status(204).send();
  });

  createBatch = asyncHandler(async (req: Request, res: Response) => {
    const useCases = await useCaseService.createBatch(
      req.params.moduleId,
      req.body.useCases
    );
    res.status(201).json({
      success: true,
      data: useCases,
    });
  });

  duplicate = asyncHandler(async (req: Request, res: Response) => {
    const useCase = await useCaseService.duplicate(
      req.params.useCaseId,
      req.body.newTitle
    );
    res.status(201).json({
      success: true,
      data: useCase,
    });
  });

  moveToModule = asyncHandler(async (req: Request, res: Response) => {
    const useCase = await useCaseService.moveToModule(
      req.params.useCaseId,
      req.body.targetModuleId
    );
    res.json({
      success: true,
      data: useCase,
    });
  });

  getStatsByModule = asyncHandler(async (req: Request, res: Response) => {
    const stats = await useCaseService.getStatsByModule(req.params.moduleId);
    res.json({
      success: true,
      data: stats,
    });
  });
}

export default new UseCaseController();