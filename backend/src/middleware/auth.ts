import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";

export interface AuthPayload {
  userId: number;
}

export interface AuthedRequest extends Request {
  auth?: AuthPayload;
}

export function requireAuth(
  req: AuthedRequest,
  res: Response,
  next: NextFunction
) {
  const token = req.cookies?.token;
  if (!token) {
    return res.status(401).json({ error: "unauthorized" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthPayload;
    req.auth = decoded;
    next();
  } catch {
    return res.status(401).json({ error: "invalid_token" });
  }
}

/** Populates req.auth if a valid token cookie exists, but never rejects. */
export function optionalAuth(
  req: AuthedRequest,
  _res: Response,
  next: NextFunction
) {
  const token = req.cookies?.token;
  if (token) {
    try {
      req.auth = jwt.verify(token, JWT_SECRET) as AuthPayload;
    } catch {
      // invalid token — proceed without auth
    }
  }
  next();
}

export function signToken(payload: AuthPayload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

