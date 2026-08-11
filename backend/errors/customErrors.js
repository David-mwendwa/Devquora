import { StatusCodes } from 'http-status-codes';

export class CustomAPIError extends Error {
  constructor(message, statusCode = StatusCodes.INTERNAL_SERVER_ERROR) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class BadRequestError extends CustomAPIError {
  constructor(message = 'Bad Request') {
    super(message, StatusCodes.BAD_REQUEST);
  }
}

export class UnauthenticatedError extends CustomAPIError {
  constructor(message = 'Authentication required') {
    super(message, StatusCodes.UNAUTHORIZED);
  }
}

export class ForbiddenError extends CustomAPIError {
  constructor(message = 'Forbidden') {
    super(message, StatusCodes.FORBIDDEN);
  }
}

export class NotFoundError extends CustomAPIError {
  constructor(message = 'Resource not found') {
    super(message, StatusCodes.NOT_FOUND);
  }
}

export class ConflictError extends CustomAPIError {
  constructor(message = 'Resource already exists') {
    super(message, StatusCodes.CONFLICT);
  }
}

export class ValidationError extends CustomAPIError {
  constructor(errors, message = 'Validation failed') {
    super(message, StatusCodes.UNPROCESSABLE_ENTITY);
    this.errors = typeof errors === 'string' ? { message: errors } : errors;
  }
}

export class TooManyRequestsError extends CustomAPIError {
  constructor(message = 'Too many requests, please try again later.') {
    super(message, StatusCodes.TOO_MANY_REQUESTS);
  }
}

export class InternalServerError extends CustomAPIError {
  constructor(message = 'Internal server error') {
    super(message, StatusCodes.INTERNAL_SERVER_ERROR);
  }
}
