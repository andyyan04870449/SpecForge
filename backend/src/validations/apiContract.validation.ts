import Joi from 'joi';

export const createApiContractSchema = Joi.object({
  domain: Joi.string().min(1).max(50).required(),
  endpoint: Joi.string().min(1).max(200).required(),
  method: Joi.string()
    .valid('GET', 'POST', 'PUT', 'DELETE', 'PATCH')
    .required(),
  title: Joi.string().min(1).max(100).required(),
  description: Joi.string().max(500).optional(),
  requestSpec: Joi.object().optional(),
  responseSpec: Joi.object().optional(),
  headers: Joi.object().optional(),
  queryParams: Joi.object().optional(),
  pathParams: Joi.object().optional(),
  statusCodes: Joi.object().optional(),
});

export const updateApiContractSchema = Joi.object({
  domain: Joi.string().min(1).max(50).optional(),
  endpoint: Joi.string().min(1).max(200).optional(),
  method: Joi.string()
    .valid('GET', 'POST', 'PUT', 'DELETE', 'PATCH')
    .optional(),
  title: Joi.string().min(1).max(100).optional(),
  description: Joi.string().max(500).optional(),
  requestSpec: Joi.object().optional(),
  responseSpec: Joi.object().optional(),
  headers: Joi.object().optional(),
  queryParams: Joi.object().optional(),
  pathParams: Joi.object().optional(),
  statusCodes: Joi.object().optional(),
}).min(1);

export const apiContractQuerySchema = Joi.object({
  projectId: Joi.string().uuid().optional(),
  domain: Joi.string().max(50).optional(),
  method: Joi.string()
    .valid('GET', 'POST', 'PUT', 'DELETE', 'PATCH')
    .optional(),
  search: Joi.string().max(100).optional(),
  page: Joi.number().integer().min(1).optional(),
  limit: Joi.number().integer().min(1).max(100).optional(),
  sortBy: Joi.string()
    .valid('apiCode', 'domain', 'endpoint', 'method', 'createdAt')
    .optional(),
  sortOrder: Joi.string().valid('asc', 'desc').optional(),
});

export const apiContractIdSchema = Joi.object({
  apiId: Joi.string().uuid().required(),
});

export const projectApiSchema = Joi.object({
  projectId: Joi.string().uuid().required(),
});

export const duplicateApiContractSchema = Joi.object({
  newEndpoint: Joi.string().min(1).max(200).required(),
});

export const importApiContractSchema = Joi.object({
  apis: Joi.array()
    .items(
      Joi.object({
        domain: Joi.string().min(1).max(50).required(),
        endpoint: Joi.string().min(1).max(200).required(),
        method: Joi.string()
          .valid('GET', 'POST', 'PUT', 'DELETE', 'PATCH')
          .required(),
        title: Joi.string().min(1).max(100).required(),
        description: Joi.string().max(500).optional(),
        requestSpec: Joi.object().optional(),
        responseSpec: Joi.object().optional(),
        headers: Joi.object().optional(),
        queryParams: Joi.object().optional(),
        pathParams: Joi.object().optional(),
        statusCodes: Joi.object().optional(),
      })
    )
    .min(1)
    .max(100)
    .required(),
});