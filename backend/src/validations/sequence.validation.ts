import Joi from 'joi';

export const createSequenceSchema = Joi.object({
  title: Joi.string().min(1).max(100).required(),
  mermaidSrc: Joi.string().min(1).max(10000).required(),
});

export const updateSequenceSchema = Joi.object({
  title: Joi.string().min(1).max(100).optional(),
  mermaidSrc: Joi.string().min(1).max(10000).optional(),
}).min(1);

export const sequenceQuerySchema = Joi.object({
  useCaseId: Joi.string().uuid().optional(),
  projectId: Joi.string().uuid().optional(),
  parseStatus: Joi.string().valid('pending', 'success', 'error').optional(),
  search: Joi.string().max(100).optional(),
  page: Joi.number().integer().min(1).optional(),
  limit: Joi.number().integer().min(1).max(100).optional(),
  sortBy: Joi.string()
    .valid('sdCode', 'title', 'createdAt', 'updatedAt')
    .optional(),
  sortOrder: Joi.string().valid('asc', 'desc').optional(),
});

export const sequenceIdSchema = Joi.object({
  sequenceId: Joi.string().uuid().required(),
});

export const useCaseSequenceSchema = Joi.object({
  useCaseId: Joi.string().uuid().required(),
});

export const duplicateSequenceSchema = Joi.object({
  newTitle: Joi.string().min(1).max(100).required(),
});

export const projectSequenceSchema = Joi.object({
  projectId: Joi.string().uuid().required(),
});