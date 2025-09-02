import { Request, Response } from 'express';
import sequenceService, { SequenceService } from '../services/sequence.service';
import { asyncHandler } from '../middlewares/errorHandler';

export class SequenceController {
  create = asyncHandler(async (req: Request, res: Response) => {
    const sequence = await sequenceService.create({
      useCaseId: req.params.useCaseId,
      ...req.body,
    });
    res.status(201).json({
      success: true,
      data: sequence,
    });
  });

  findAll = asyncHandler(async (req: Request, res: Response) => {
    const result = await sequenceService.findAll(req.query);
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

  findByUseCase = asyncHandler(async (req: Request, res: Response) => {
    const result = await sequenceService.findAll({
      useCaseId: req.params.useCaseId,
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
    const sequence = await sequenceService.findById(req.params.sequenceId);
    res.json({
      success: true,
      data: sequence,
    });
  });

  update = asyncHandler(async (req: Request, res: Response) => {
    const sequence = await sequenceService.update(req.params.sequenceId, req.body);
    res.json({
      success: true,
      data: sequence,
    });
  });

  delete = asyncHandler(async (req: Request, res: Response) => {
    await sequenceService.delete(req.params.sequenceId);
    res.status(204).send();
  });

  reparse = asyncHandler(async (req: Request, res: Response) => {
    const sequence = await sequenceService.reparse(req.params.sequenceId);
    res.json({
      success: true,
      data: sequence,
    });
  });

  duplicate = asyncHandler(async (req: Request, res: Response) => {
    const sequence = await sequenceService.duplicate(
      req.params.sequenceId,
      req.body.newTitle
    );
    res.status(201).json({
      success: true,
      data: sequence,
    });
  });

  getParseErrors = asyncHandler(async (req: Request, res: Response) => {
    const sequences = await sequenceService.getParseErrors(req.params.projectId);
    res.json({
      success: true,
      data: sequences,
    });
  });

  getExample = asyncHandler(async (_req: Request, res: Response) => {
    const example = SequenceService.generateExample();
    res.json({
      success: true,
      data: {
        mermaidSrc: example,
      },
    });
  });
}

export default new SequenceController();