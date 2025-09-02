/**
 * Link 關聯資料驗證
 */

import Joi from 'joi';

// API-Sequence Link 驗證
export const createApiSequenceLinkSchema = Joi.object({
  body: Joi.object({
    apiId: Joi.string().uuid().required(),
    sequenceId: Joi.string().uuid().required(),
    stepRef: Joi.string().optional(),
    lineNumber: Joi.number().integer().min(1).optional(),
  }).required(),
});

export const batchCreateApiSequenceLinksSchema = Joi.object({
  body: Joi.object({
    links: Joi.array().items(
      Joi.object({
        apiId: Joi.string().uuid().required(),
        sequenceId: Joi.string().uuid().required(),
        stepRef: Joi.string().optional(),
        lineNumber: Joi.number().integer().min(1).optional(),
      })
    ).min(1).max(100).required(),
  }).required(),
});

export const updateApiSequenceLinkSchema = Joi.object({
  params: Joi.object({
    id: Joi.string().uuid().required(),
  }).required(),
  body: Joi.object({
    stepRef: Joi.string().allow(null).optional(),
    lineNumber: Joi.number().integer().min(1).allow(null).optional(),
  }).min(1).required(),
});

// API-DTO Link 驗證
export const createApiDtoLinkSchema = Joi.object({
  body: Joi.object({
    apiId: Joi.string().uuid().required(),
    dtoId: Joi.string().uuid().required(),
    role: Joi.string().valid('req', 'res').required(),
  }).required(),
});

export const batchCreateApiDtoLinksSchema = Joi.object({
  body: Joi.object({
    links: Joi.array().items(
      Joi.object({
        apiId: Joi.string().uuid().required(),
        dtoId: Joi.string().uuid().required(),
        role: Joi.string().valid('req', 'res').required(),
      })
    ).min(1).max(100).required(),
  }).required(),
});

export const updateApiDtoLinkSchema = Joi.object({
  params: Joi.object({
    id: Joi.string().uuid().required(),
  }).required(),
  body: Joi.object({
    role: Joi.string().valid('req', 'res').optional(),
  }).min(1).required(),
});

// 通用查詢參數
export const listApiSequenceLinksSchema = Joi.object({
  query: Joi.object({
    apiId: Joi.string().uuid().optional(),
    sequenceId: Joi.string().uuid().optional(),
    projectId: Joi.string().uuid().optional(),
    page: Joi.number().integer().min(1).optional(),
    limit: Joi.number().integer().min(1).max(100).optional(),
    includeDetails: Joi.boolean().optional(),
  }).optional(),
});

export const listApiDtoLinksSchema = Joi.object({
  query: Joi.object({
    apiId: Joi.string().uuid().optional(),
    dtoId: Joi.string().uuid().optional(),
    role: Joi.string().valid('req', 'res').optional(),
    projectId: Joi.string().uuid().optional(),
    page: Joi.number().integer().min(1).optional(),
    limit: Joi.number().integer().min(1).max(100).optional(),
    includeDetails: Joi.boolean().optional(),
  }).optional(),
});

// ID 參數驗證
export const idParamSchema = Joi.object({
  params: Joi.object({
    id: Joi.string().uuid().required(),
  }).required(),
});

// API/Sequence/DTO ID 參數驗證
export const apiIdParamSchema = Joi.object({
  params: Joi.object({
    apiId: Joi.string().uuid().required(),
  }).required(),
});

export const sequenceIdParamSchema = Joi.object({
  params: Joi.object({
    sequenceId: Joi.string().uuid().required(),
  }).required(),
});

export const dtoIdParamSchema = Joi.object({
  params: Joi.object({
    dtoId: Joi.string().uuid().required(),
  }).required(),
});

export default {
  createApiSequenceLinkSchema,
  batchCreateApiSequenceLinksSchema,
  updateApiSequenceLinkSchema,
  createApiDtoLinkSchema,
  batchCreateApiDtoLinksSchema,
  updateApiDtoLinkSchema,
  listApiSequenceLinksSchema,
  listApiDtoLinksSchema,
  idParamSchema,
  apiIdParamSchema,
  sequenceIdParamSchema,
  dtoIdParamSchema,
};