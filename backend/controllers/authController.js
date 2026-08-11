import bcrypt from 'bcryptjs';
import { StatusCodes } from 'http-status-codes';
import User from '../models/User.js';
import {
  BadRequestError,
  UnauthenticatedError,
  ConflictError,
  ForbiddenError,
} from '../errors/customErrors.js';
import { sendToken } from '../utils/jwt.js';

export const signup = async (req, res) => {
  const { username, email, password, name } = req.body;

  if (!username || !email || !password) {
    throw new BadRequestError('username, email and password are required');
  }
  if (password.length < 8) {
    throw new BadRequestError('password must be at least 8 characters');
  }

  const existing = await User.findOne({ $or: [{ email }, { username }] });
  if (existing) {
    throw new ConflictError('An account with that email or username already exists');
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.create({ username, email, passwordHash, name });

  sendToken(user, StatusCodes.CREATED, res);
};

export const login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new BadRequestError('email and password are required');
  }

  const user = await User.findOne({ email }).select('+passwordHash');
  if (!user) {
    throw new UnauthenticatedError('Invalid credentials');
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    throw new UnauthenticatedError('Invalid credentials');
  }

  // Checked after the password so a wrong guess can't be used to discover which
  // accounts are suspended.
  if (user.status === 'suspended') {
    throw new ForbiddenError('This account has been suspended. Contact an administrator.');
  }

  sendToken(user, StatusCodes.OK, res);
};

export const getMe = async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user) throw new UnauthenticatedError('Account no longer exists');
  // A JWT issued before the suspension is still cryptographically valid — this
  // is where an already-signed-in suspended user gets shown the door.
  if (user.status === 'suspended') {
    throw new UnauthenticatedError('This account has been suspended');
  }
  res.status(StatusCodes.OK).json({ success: true, user });
};
