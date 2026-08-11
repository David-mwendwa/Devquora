import { StatusCodes } from 'http-status-codes';
import { CustomAPIError } from '../errors/customErrors.js';

const isProduction = /prod/i.test(process.env.NODE_ENV || '');
// A guard test asserts a 401/403 and is *expecting* the throw; logging each one
// buries the suite's actual result under stack traces from errors that were the
// point of the test. The response itself is unchanged.
const isTest = process.env.NODE_ENV === 'test';

const logError = (err, req) => {
  if (isTest) return;
  const errorInfo = {
    timestamp: new Date().toISOString(),
    path: req.path,
    method: req.method,
    message: err.message,
    ...(err.name && { name: err.name }),
    ...(!isProduction && { stack: err.stack }),
  };
  console.error(isProduction ? 'Production Error:' : 'Error:', errorInfo);
};

const handleDevelopmentErrors = (err, req, res) => {
  logError(err, req);
  const {
    message = 'An unexpected error occurred',
    name = 'InternalServerError',
    statusCode = StatusCodes.INTERNAL_SERVER_ERROR,
    ...rest
  } = err;

  res.status(statusCode).json({
    success: false,
    message,
    error: { name, statusCode, path: req.originalUrl, stack: err.stack, details: rest },
  });
};

const handleProductionErrors = (err, req, res) => {
  if (err instanceof CustomAPIError) {
    logError(err, req);
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      ...(err.errors && { errors: err.errors }),
    });
  }

  const defaultError = {
    statusCode: err.statusCode || StatusCodes.INTERNAL_SERVER_ERROR,
    message: 'An unexpected error occurred. Please try again later.',
  };

  if (err.name === 'CastError') {
    defaultError.statusCode = StatusCodes.NOT_FOUND;
    defaultError.message = `Resource not found. Invalid: ${err.path}`;
  } else if (err.code === 11000) {
    defaultError.statusCode = StatusCodes.CONFLICT;
    const field = Object.keys(err.keyValue)[0];
    defaultError.message = `${field} '${err.keyValue[field]}' already exists.`;
  } else if (err.name === 'ValidationError') {
    defaultError.statusCode = StatusCodes.BAD_REQUEST;
    defaultError.message = Object.values(err.errors)
      .map((error) => error.message)
      .join('; ');
  } else if (err.name === 'MulterError') {
    defaultError.statusCode = StatusCodes.BAD_REQUEST;
    defaultError.message = `File upload error: ${err.message}`;
  }

  logError(err, req);
  res.status(defaultError.statusCode).json({ success: false, message: defaultError.message });
};

const errorHandlerMiddleware = (err, req, res, next) => {
  if (res.headersSent) return next(err);
  return isProduction
    ? handleProductionErrors(err, req, res)
    : handleDevelopmentErrors(err, req, res);
};

export default errorHandlerMiddleware;
