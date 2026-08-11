import jwt from 'jsonwebtoken';
import { UnauthenticatedError, ForbiddenError } from '../errors/customErrors.js';

export const authenticate = async (req, res, next) => {
  let token = null;
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else if (req.cookies?.token) {
    token = req.cookies.token;
  }

  if (!token) {
    throw new UnauthenticatedError('Authentication invalid. Please log in');
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    throw new UnauthenticatedError('Invalid or expired token. Please log in again');
  }
};

export const authorizeRoles = (...roles) => {
  const allowedRoles = roles.flat();
  return (req, res, next) => {
    if (!allowedRoles.includes(req.user.role)) {
      throw new ForbiddenError(`${req.user.role} is not authorized to perform this action`);
    }
    next();
  };
};
