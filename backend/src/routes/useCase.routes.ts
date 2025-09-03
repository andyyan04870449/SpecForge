import { Router } from 'express';
import useCaseController from '../controllers/useCase.controller';
import { validate } from '../middlewares/validation';
import {
  createUseCaseSchema,
  updateUseCaseSchema,
  useCaseQuerySchema,
  useCaseIdSchema,
  moduleUseCaseSchema,
  batchCreateUseCaseSchema,
  duplicateUseCaseSchema,
  moveUseCaseSchema,
} from '../validations/useCase.validation';

const router = Router();

/**
 * @route   GET /api/v1/use-cases
 * @desc    取得所有用例列表
 * @access  Public
 */
router.get(
  '/use-cases',
  validate(useCaseQuerySchema, 'query'),
  useCaseController.findAll
);

/**
 * @route   GET /api/v1/modules/:moduleId/use-cases
 * @desc    取得模組的用例列表
 * @access  Public
 */
router.get(
  '/modules/:moduleId/use-cases',
  validate(moduleUseCaseSchema, 'params'),
  validate(useCaseQuerySchema, 'query'),
  useCaseController.findByModule
);

/**
 * @route   GET /api/v1/modules/:moduleId/use-cases/stats
 * @desc    取得模組的用例統計
 * @access  Public
 */
router.get(
  '/modules/:moduleId/use-cases/stats',
  validate(moduleUseCaseSchema, 'params'),
  useCaseController.getStatsByModule
);

/**
 * @route   POST /api/v1/modules/:moduleId/use-cases
 * @desc    在模組下建立新用例
 * @access  Public
 */
router.post(
  '/modules/:moduleId/use-cases',
  validate(moduleUseCaseSchema, 'params'),
  validate(createUseCaseSchema, 'body'),
  useCaseController.create
);

/**
 * @route   POST /api/v1/modules/:moduleId/use-cases/batch
 * @desc    批量建立用例
 * @access  Public
 */
router.post(
  '/modules/:moduleId/use-cases/batch',
  validate(moduleUseCaseSchema, 'params'),
  validate(batchCreateUseCaseSchema, 'body'),
  useCaseController.createBatch
);

/**
 * @route   GET /api/v1/use-cases/:useCaseId
 * @desc    取得用例詳情
 * @access  Public
 */
router.get(
  '/use-cases/:useCaseId',
  validate(useCaseIdSchema, 'params'),
  useCaseController.findById
);

/**
 * @route   PUT /api/v1/use-cases/:useCaseId
 * @desc    更新用例
 * @access  Public
 */
router.put(
  '/use-cases/:useCaseId',
  validate(useCaseIdSchema, 'params'),
  validate(updateUseCaseSchema, 'body'),
  useCaseController.update
);

/**
 * @route   POST /api/v1/use-cases/:useCaseId/duplicate
 * @desc    複製用例
 * @access  Public
 */
router.post(
  '/use-cases/:useCaseId/duplicate',
  validate(useCaseIdSchema, 'params'),
  validate(duplicateUseCaseSchema, 'body'),
  useCaseController.duplicate
);

/**
 * @route   PUT /api/v1/use-cases/:useCaseId/move
 * @desc    移動用例到其他模組
 * @access  Public
 */
router.put(
  '/use-cases/:useCaseId/move',
  validate(useCaseIdSchema, 'params'),
  validate(moveUseCaseSchema, 'body'),
  useCaseController.moveToModule
);

/**
 * @route   DELETE /api/v1/use-cases/:useCaseId
 * @desc    刪除用例
 * @access  Public
 */
router.delete(
  '/use-cases/:useCaseId',
  validate(useCaseIdSchema, 'params'),
  useCaseController.delete
);

export default router;