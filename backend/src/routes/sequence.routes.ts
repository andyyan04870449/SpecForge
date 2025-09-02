import { Router } from 'express';
import sequenceController from '../controllers/sequence.controller';
import { validate } from '../middlewares/validation';
import {
  createSequenceSchema,
  updateSequenceSchema,
  sequenceQuerySchema,
  sequenceIdSchema,
  useCaseSequenceSchema,
  duplicateSequenceSchema,
  projectSequenceSchema,
} from '../validations/sequence.validation';

const router = Router();

/**
 * @route   GET /api/v1/sequences
 * @desc    取得所有序列圖列表
 * @access  Public
 */
router.get(
  '/sequences',
  validate(sequenceQuerySchema, 'query'),
  sequenceController.findAll
);

/**
 * @route   GET /api/v1/sequences/example
 * @desc    取得範例 Mermaid 原始碼
 * @access  Public
 */
router.get(
  '/sequences/example',
  sequenceController.getExample
);

/**
 * @route   GET /api/v1/use-cases/:useCaseId/sequences
 * @desc    取得用例的序列圖列表
 * @access  Public
 */
router.get(
  '/use-cases/:useCaseId/sequences',
  validate(useCaseSequenceSchema, 'params'),
  validate(sequenceQuerySchema, 'query'),
  sequenceController.findByUseCase
);

/**
 * @route   POST /api/v1/use-cases/:useCaseId/sequences
 * @desc    在用例下建立新序列圖
 * @access  Public
 */
router.post(
  '/use-cases/:useCaseId/sequences',
  validate(useCaseSequenceSchema, 'params'),
  validate(createSequenceSchema, 'body'),
  sequenceController.create
);

/**
 * @route   GET /api/v1/sequences/:sequenceId
 * @desc    取得序列圖詳情
 * @access  Public
 */
router.get(
  '/sequences/:sequenceId',
  validate(sequenceIdSchema, 'params'),
  sequenceController.findById
);

/**
 * @route   PUT /api/v1/sequences/:sequenceId
 * @desc    更新序列圖
 * @access  Public
 */
router.put(
  '/sequences/:sequenceId',
  validate(sequenceIdSchema, 'params'),
  validate(updateSequenceSchema, 'body'),
  sequenceController.update
);

/**
 * @route   POST /api/v1/sequences/:sequenceId/reparse
 * @desc    重新解析序列圖
 * @access  Public
 */
router.post(
  '/sequences/:sequenceId/reparse',
  validate(sequenceIdSchema, 'params'),
  sequenceController.reparse
);

/**
 * @route   POST /api/v1/sequences/:sequenceId/duplicate
 * @desc    複製序列圖
 * @access  Public
 */
router.post(
  '/sequences/:sequenceId/duplicate',
  validate(sequenceIdSchema, 'params'),
  validate(duplicateSequenceSchema, 'body'),
  sequenceController.duplicate
);

/**
 * @route   DELETE /api/v1/sequences/:sequenceId
 * @desc    刪除序列圖
 * @access  Public
 */
router.delete(
  '/sequences/:sequenceId',
  validate(sequenceIdSchema, 'params'),
  sequenceController.delete
);

/**
 * @route   GET /api/v1/projects/:projectId/sequences/parse-errors
 * @desc    取得專案中解析錯誤的序列圖
 * @access  Public
 */
router.get(
  '/projects/:projectId/sequences/parse-errors',
  validate(projectSequenceSchema, 'params'),
  sequenceController.getParseErrors
);

export default router;