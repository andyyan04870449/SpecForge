import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { AppError, ErrorCode } from '../types/errors';

export const validate = (schema: Joi.ObjectSchema, property: 'body' | 'query' | 'params' = 'body') => {
  return (req: Request, _res: Response, next: NextFunction) => {
    const { error } = schema.validate(req[property], {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
      }));

      throw new AppError(
        400,
        ErrorCode.VAL_INVALID_INPUT,
        'Validation failed',
        { errors }
      );
    }

    next();
  };
};