import jwt from 'jsonwebtoken';

export const verifyJWT = ({ token }) => {
  return jwt.verify(token, process.env.JWT_SECRET);
};

export const sendToken = (user, statusCode, res) => {
  const token = user.signJWT();

  const oneDay = 24 * 60 * 60 * 1000;
  const options = {
    expires: new Date(Date.now() + (process.env.COOKIE_LIFETIME || 7) * oneDay),
    httpOnly: true,
    secure: /production/i.test(process.env.NODE_ENV),
    sameSite: 'lax',
  };

  user.passwordHash = undefined;

  res.status(statusCode).cookie('token', token, options).json({ success: true, token, user });
};
