import Joi from 'joi';

export const createProjectSchema = Joi.object({
  name: Joi.string().min(1).max(100).required(),
  description: Joi.string().max(500).optional(),
  version: Joi.string().max(20).optional(),
  ownerId: Joi.string().uuid().optional(),
});

export const updateProjectSchema = Joi.object({
  name: Joi.string().min(1).max(100).optional(),
  description: Joi.string().max(500).optional(),
  version: Joi.string().max(20).optional(),
  status: Joi.string()
    .valid('PLANNING', 'IN_PROGRESS', 'REVIEW', 'COMPLETED')
    .optional(),
  ownerId: Joi.string().uuid().optional(),
}).min(1);

export const projectQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).optional(),
  limit: Joi.number().integer().min(1).max(100).optional(),
  search: Joi.string().max(100).allow('').optional(),
  status: Joi.string()
    .valid('PLANNING', 'IN_PROGRESS', 'REVIEW', 'COMPLETED')
    .optional(),
  sortBy: Joi.string()
    .valid('name', 'createdAt', 'updatedAt')
    .optional(),
  sortOrder: Joi.string().valid('asc', 'desc').optional(),
});

export const projectIdSchema = Joi.object({
  projectId: Joi.string().uuid().required(),
});