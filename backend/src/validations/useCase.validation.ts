import Joi from 'joi';

export const createUseCaseSchema = Joi.object({
  title: Joi.string().min(1).max(100).required(),
  summary: Joi.string().max(500).optional(),
});

export const updateUseCaseSchema = Joi.object({
  title: Joi.string().min(1).max(100).optional(),
  summary: Joi.string().max(500).optional(),
}).min(1);

export const useCaseQuerySchema = Joi.object({
  moduleId: Joi.string().uuid().optional(),
  projectId: Joi.string().uuid().optional(),
  search: Joi.string().max(100).optional(),
  page: Joi.number().integer().min(1).optional(),
  limit: Joi.number().integer().min(1).max(100).optional(),
  sortBy: Joi.string()
    .valid('ucCode', 'title', 'createdAt', 'updatedAt')
    .optional(),
  sortOrder: Joi.string().valid('asc', 'desc').optional(),
});

export const useCaseIdSchema = Joi.object({
  useCaseId: Joi.string().uuid().required(),
});

export const moduleUseCaseSchema = Joi.object({
  moduleId: Joi.string().uuid().required(),
});

export const batchCreateUseCaseSchema = Joi.object({
  useCases: Joi.array()
    .items(
      Joi.object({
        title: Joi.string().min(1).max(100).required(),
        summary: Joi.string().max(500).optional(),
      })
    )
    .min(1)
    .max(10)
    .required(),
});

export const duplicateUseCaseSchema = Joi.object({
  newTitle: Joi.string().min(1).max(100).required(),
});

export const moveUseCaseSchema = Joi.object({
  targetModuleId: Joi.string().uuid().required(),
});