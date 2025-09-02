/**
 * 請求資料驗證中間件
 */

import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { AppError, ErrorCode } from '../types/errors';

/**
 * 驗證中間件工廠函數
 */
export const validate = (schema: Joi.ObjectSchema) => {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      // 組合驗證物件
      const validationObject: any = {};
      
      if (schema.describe().keys.params) {
        validationObject.params = req.params;
      }
      
      if (schema.describe().keys.query) {
        validationObject.query = req.query;
      }
      
      if (schema.describe().keys.body) {
        validationObject.body = req.body;
      }

      // 執行驗證
      const { error, value } = schema.validate(validationObject, {
        abortEarly: false,
        stripUnknown: true,
      });

      if (error) {
        // 格式化錯誤訊息
        const errors = error.details.map((detail) => ({
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

      // 更新請求物件
      if (value.params) req.params = value.params;
      if (value.query) req.query = value.query;
      if (value.body) req.body = value.body;

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * 驗證單一欄位
 */
export const validateField = (field: any, schema: Joi.Schema): void => {
  const { error } = schema.validate(field);
  
  if (error) {
    throw new AppError(
      400,
      ErrorCode.VAL_INVALID_INPUT,
      error.details[0].message
    );
  }
};

export default validate;