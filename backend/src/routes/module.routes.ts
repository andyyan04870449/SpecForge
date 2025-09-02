import { Router } from 'express';
import moduleController from '../controllers/module.controller';
import { validate } from '../middlewares/validation';
import {
  createModuleSchema,
  updateModuleSchema,
  moduleQuerySchema,
  moduleIdSchema,
  projectModuleSchema,
  reorderModuleSchema,
} from '../validations/module.validation';

const router = Router();

/**
 * @route   GET /api/v1/projects/:projectId/modules
 * @desc    取得專案的模組列表
 * @access  Public
 */
router.get(
  '/projects/:projectId/modules',
  validate(projectModuleSchema, 'params'),
  validate(moduleQuerySchema, 'query'),
  moduleController.findAll
);

/**
 * @route   GET /api/v1/projects/:projectId/modules/tree
 * @desc    取得專案的模組樹狀結構
 * @access  Public
 */
router.get(
  '/projects/:projectId/modules/tree',
  validate(projectModuleSchema, 'params'),
  moduleController.getModuleTree
);

/**
 * @route   POST /api/v1/projects/:projectId/modules
 * @desc    建立新模組
 * @access  Public
 */
router.post(
  '/projects/:projectId/modules',
  validate(projectModuleSchema, 'params'),
  validate(createModuleSchema, 'body'),
  moduleController.create
);

/**
 * @route   GET /api/v1/modules/:moduleId
 * @desc    取得模組詳情
 * @access  Public
 */
router.get(
  '/modules/:moduleId',
  validate(moduleIdSchema, 'params'),
  moduleController.findById
);

/**
 * @route   PUT /api/v1/modules/:moduleId
 * @desc    更新模組
 * @access  Public
 */
router.put(
  '/modules/:moduleId',
  validate(moduleIdSchema, 'params'),
  validate(updateModuleSchema, 'body'),
  moduleController.update
);

/**
 * @route   PUT /api/v1/modules/:moduleId/reorder
 * @desc    調整模組順序
 * @access  Public
 */
router.put(
  '/modules/:moduleId/reorder',
  validate(moduleIdSchema, 'params'),
  validate(reorderModuleSchema, 'body'),
  moduleController.reorder
);

/**
 * @route   DELETE /api/v1/modules/:moduleId
 * @desc    刪除模組
 * @access  Public
 */
router.delete(
  '/modules/:moduleId',
  validate(moduleIdSchema, 'params'),
  moduleController.delete
);

export default router;