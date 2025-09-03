import { Router } from 'express';
import apiContractController from '../controllers/apiContract.controller';
import { validate } from '../middlewares/validation';
import {
  createApiContractSchema,
  updateApiContractSchema,
  apiContractQuerySchema,
  apiContractIdSchema,
  projectApiSchema,
  duplicateApiContractSchema,
  importApiContractSchema,
} from '../validations/apiContract.validation';

const router = Router();

/**
 * @route   GET /api/v1/api-contracts
 * @desc    取得所有 API 合約列表
 * @access  Public
 */
router.get(
  '/api-contracts',
  validate(apiContractQuerySchema, 'query'),
  apiContractController.findAll
);

/**
 * @route   GET /api/v1/projects/:projectId/apis
 * @desc    取得專案的 API 合約列表
 * @access  Public
 */
router.get(
  '/projects/:projectId/apis',
  validate(projectApiSchema, 'params'),
  validate(apiContractQuerySchema, 'query'),
  apiContractController.findByProject
);

/**
 * @route   GET /api/v1/projects/:projectId/apis/stats
 * @desc    取得專案的 API 統計（按領域分組）
 * @access  Public
 */
router.get(
  '/projects/:projectId/apis/stats',
  validate(projectApiSchema, 'params'),
  apiContractController.getStatsByDomain
);

/**
 * @route   GET /api/v1/projects/:projectId/apis/openapi
 * @desc    生成 OpenAPI 規格
 * @access  Public
 */
router.get(
  '/projects/:projectId/apis/openapi',
  validate(projectApiSchema, 'params'),
  apiContractController.generateOpenApiSpec
);

/**
 * @route   POST /api/v1/projects/:projectId/apis
 * @desc    建立新的 API 合約
 * @access  Public
 */
router.post(
  '/projects/:projectId/apis',
  validate(projectApiSchema, 'params'),
  validate(createApiContractSchema, 'body'),
  apiContractController.create
);

/**
 * @route   POST /api/v1/projects/:projectId/apis/import
 * @desc    批量匯入 API 合約
 * @access  Public
 */
router.post(
  '/projects/:projectId/apis/import',
  validate(projectApiSchema, 'params'),
  validate(importApiContractSchema, 'body'),
  apiContractController.importBatch
);

/**
 * @route   GET /api/v1/apis/:apiId
 * @desc    取得 API 合約詳情
 * @access  Public
 */
router.get(
  '/apis/:apiId',
  validate(apiContractIdSchema, 'params'),
  apiContractController.findById
);

/**
 * @route   PUT /api/v1/apis/:apiId
 * @desc    更新 API 合約
 * @access  Public
 */
router.put(
  '/apis/:apiId',
  validate(apiContractIdSchema, 'params'),
  validate(updateApiContractSchema, 'body'),
  apiContractController.update
);

/**
 * @route   POST /api/v1/apis/:apiId/duplicate
 * @desc    複製 API 合約
 * @access  Public
 */
router.post(
  '/apis/:apiId/duplicate',
  validate(apiContractIdSchema, 'params'),
  validate(duplicateApiContractSchema, 'body'),
  apiContractController.duplicate
);

/**
 * @route   DELETE /api/v1/apis/:apiId
 * @desc    刪除 API 合約
 * @access  Public
 */
router.delete(
  '/apis/:apiId',
  validate(apiContractIdSchema, 'params'),
  apiContractController.delete
);

export default router;