/**
 * DTO Schema 資料驗證
 */

import Joi from 'joi';

// JSON Schema 驗證
const jsonSchemaValidation = Joi.object({
  type: Joi.string().required(),
  properties: Joi.object().when('type', {
    is: 'object',
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),
  items: Joi.when('type', {
    is: 'array',
    then: Joi.object().required(),
    otherwise: Joi.optional(),
  }),
  required: Joi.array().items(Joi.string()).optional(),
  enum: Joi.array().optional(),
  format: Joi.string().optional(),
  minLength: Joi.number().optional(),
  maxLength: Joi.number().optional(),
  minimum: Joi.number().optional(),
  maximum: Joi.number().optional(),
  pattern: Joi.string().optional(),
  description: Joi.string().optional(),
}).unknown(true); // 允許其他 JSON Schema 屬性

// 建立 DTO Schema
export const createDtoSchemaSchema = Joi.object({
  params: Joi.object({
    projectId: Joi.string().uuid().required(),
  }).required(),
  body: Joi.object({
    title: Joi.string().min(1).max(200).required(),
    schemaJson: jsonSchemaValidation.required(),
    kind: Joi.string().valid('request', 'response').required(),
  }).required(),
});

// 批次建立 DTO Schemas
export const batchCreateDtoSchemasSchema = Joi.object({
  body: Joi.object({
    dtos: Joi.array().items(
      Joi.object({
        title: Joi.string().min(1).max(200).required(),
        schemaJson: jsonSchemaValidation.required(),
        kind: Joi.string().valid('request', 'response').required(),
      })
    ).min(1).max(100).required(),
  }).required(),
});

// 更新 DTO Schema
export const updateDtoSchemaSchema = Joi.object({
  params: Joi.object({
    id: Joi.string().uuid().required(),
  }).required(),
  body: Joi.object({
    title: Joi.string().min(1).max(200).optional(),
    schemaJson: jsonSchemaValidation.optional(),
    kind: Joi.string().valid('request', 'response').optional(),
  }).min(1).required(),
});

// 查詢參數
export const listDtoSchemasSchema = Joi.object({
  query: Joi.object({
    projectId: Joi.string().uuid().optional(),
    kind: Joi.string().valid('request', 'response').optional(),
    title: Joi.string().optional(),
    page: Joi.number().integer().min(1).optional(),
    limit: Joi.number().integer().min(1).max(100).optional(),
    sortBy: Joi.string().valid('title', 'kind', 'dtoCode', 'createdAt').optional(),
    sortOrder: Joi.string().valid('asc', 'desc').optional(),
  }).optional(),
});

// ID 參數驗證
export const idParamSchema = Joi.object({
  params: Joi.object({
    id: Joi.string().uuid().required(),
  }).required(),
});

// Project ID 參數驗證
export const projectIdParamSchema = Joi.object({
  params: Joi.object({
    projectId: Joi.string().uuid().required(),
  }).required(),
});

// DTO Code 查詢
export const dtoCodeQuerySchema = Joi.object({
  params: Joi.object({
    projectId: Joi.string().uuid().required(),
    dtoCode: Joi.string().pattern(/^DTO-[\w-]+-\d{3,}$/).required(),
  }).required(),
});

export default {
  createDtoSchemaSchema,
  batchCreateDtoSchemasSchema,
  updateDtoSchemaSchema,
  listDtoSchemasSchema,
  idParamSchema,
  projectIdParamSchema,
  dtoCodeQuerySchema,
};