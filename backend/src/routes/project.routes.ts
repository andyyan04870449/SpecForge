import { Router } from 'express';
import projectController from '../controllers/project.controller';
import { validate } from '../middlewares/validation';
import { authenticateToken } from '../middlewares/auth.middleware';
import { checkProjectPermission, checkProjectOwnership } from '../middlewares/permission.middleware';
import {
  createProjectSchema,
  updateProjectSchema,
  projectQuerySchema,
  projectIdSchema,
} from '../validations/project.validation';

const router = Router();

/**
 * @route   GET /api/v1/projects
 * @desc    取得專案列表
 * @access  Private - 需要認證
 */
router.get(
  '/',
  authenticateToken,
  validate(projectQuerySchema, 'query'),
  projectController.findAll
);

/**
 * @route   GET /api/v1/projects/:projectId
 * @desc    取得專案詳情
 * @access  Private - 需要 VIEWER 以上權限
 */
router.get(
  '/:projectId',
  authenticateToken,
  validate(projectIdSchema, 'params'),
  checkProjectPermission('VIEWER'),
  projectController.findById
);

/**
 * @route   GET /api/v1/projects/:projectId/statistics
 * @desc    取得專案統計資料
 * @access  Private - 需要 VIEWER 以上權限
 */
router.get(
  '/:projectId/statistics',
  authenticateToken,
  validate(projectIdSchema, 'params'),
  checkProjectPermission('VIEWER'),
  projectController.getStatistics
);

/**
 * @route   POST /api/v1/projects
 * @desc    建立新專案
 * @access  Private - 需要認證
 */
router.post(
  '/',
  authenticateToken,
  validate(createProjectSchema, 'body'),
  projectController.create
);

/**
 * @route   PUT /api/v1/projects/:projectId
 * @desc    更新專案
 * @access  Private - 需要 EDITOR 以上權限
 */
router.put(
  '/:projectId',
  authenticateToken,
  validate(projectIdSchema, 'params'),
  validate(updateProjectSchema, 'body'),
  checkProjectPermission('EDITOR'),
  projectController.update
);

/**
 * @route   DELETE /api/v1/projects/:projectId
 * @desc    刪除專案
 * @access  Private - 需要 OWNER 權限
 */
router.delete(
  '/:projectId',
  authenticateToken,
  validate(projectIdSchema, 'params'),
  checkProjectOwnership,
  projectController.delete
);

export default router;