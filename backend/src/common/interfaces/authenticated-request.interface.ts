import { Request } from 'express';

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: string;
  status: string;
}

export interface AuthenticatedRequest extends Request {
  user: AuthenticatedUser;
  refreshToken?: string;
}
