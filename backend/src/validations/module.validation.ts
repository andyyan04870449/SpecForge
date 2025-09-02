import Joi from 'joi';

export const createModuleSchema = Joi.object({
  title: Joi.string().min(1).max(100).required(),
  description: Joi.string().max(500).optional(),
  parentId: Joi.string().uuid().optional(),
  order: Joi.number().integer().min(0).optional(),
});

export const updateModuleSchema = Joi.object({
  title: Joi.string().min(1).max(100).optional(),
  description: Joi.string().max(500).optional(),
  parentId: Joi.string().uuid().allow(null).optional(),
  order: Joi.number().integer().min(0).optional(),
}).min(1);

export const moduleQuerySchema = Joi.object({
  parentId: Joi.string().uuid().allow(null).optional(),
  includeChildren: Joi.boolean().optional(),
  sortBy: Joi.string()
    .valid('modCode', 'title', 'order', 'createdAt')
    .optional(),
  sortOrder: Joi.string().valid('asc', 'desc').optional(),
});

export const moduleIdSchema = Joi.object({
  moduleId: Joi.string().uuid().required(),
});

export const projectModuleSchema = Joi.object({
  projectId: Joi.string().uuid().required(),
});

export const reorderModuleSchema = Joi.object({
  order: Joi.number().integer().min(0).required(),
});