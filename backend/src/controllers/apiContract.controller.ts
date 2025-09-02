import { Request, Response } from 'express';
import apiContractService from '../services/apiContract.service';
import { asyncHandler } from '../middlewares/errorHandler';

export class ApiContractController {
  create = asyncHandler(async (req: Request, res: Response) => {
    const apiContract = await apiContractService.create({
      projectId: req.params.projectId,
      ...req.body,
    });
    res.status(201).json({
      success: true,
      data: apiContract,
    });
  });

  findAll = asyncHandler(async (req: Request, res: Response) => {
    const result = await apiContractService.findAll(req.query);
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

  findByProject = asyncHandler(async (req: Request, res: Response) => {
    const result = await apiContractService.findAll({
      projectId: req.params.projectId,
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
    const apiContract = await apiContractService.findById(req.params.apiId);
    res.json({
      success: true,
      data: apiContract,
    });
  });

  update = asyncHandler(async (req: Request, res: Response) => {
    const apiContract = await apiContractService.update(req.params.apiId, req.body);
    res.json({
      success: true,
      data: apiContract,
    });
  });

  delete = asyncHandler(async (req: Request, res: Response) => {
    await apiContractService.delete(req.params.apiId);
    res.status(204).send();
  });

  duplicate = asyncHandler(async (req: Request, res: Response) => {
    const apiContract = await apiContractService.duplicate(
      req.params.apiId,
      req.body.newEndpoint
    );
    res.status(201).json({
      success: true,
      data: apiContract,
    });
  });

  getStatsByDomain = asyncHandler(async (req: Request, res: Response) => {
    const stats = await apiContractService.getStatsByDomain(req.params.projectId);
    res.json({
      success: true,
      data: stats,
    });
  });

  importBatch = asyncHandler(async (req: Request, res: Response) => {
    const apis = await apiContractService.importBatch(
      req.params.projectId,
      req.body.apis
    );
    res.status(201).json({
      success: true,
      data: apis,
      meta: {
        imported: apis.length,
      },
    });
  });

  generateOpenApiSpec = asyncHandler(async (req: Request, res: Response) => {
    const spec = await apiContractService.generateOpenApiSpec(req.params.projectId);
    res.json({
      success: true,
      data: spec,
    });
  });
}

export default new ApiContractController();