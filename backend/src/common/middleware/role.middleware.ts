import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { NextFunction, Response } from 'express';

import { UserRole } from '../../../generated/prisma/enums.cjs';
import { AuthenticatedRequest } from '../interfaces/authenticated-request.interface';

export const allowRoles =
  (...allowedRoles: UserRole[]) =>
  (request: AuthenticatedRequest, _response: Response, next: NextFunction) => {
    if (!request.user) {
      throw new UnauthorizedException('Authentication is required');
    }

    if (!allowedRoles.includes(request.user.role as UserRole)) {
      throw new ForbiddenException('You do not have access to this resource');
    }

    next();
  };
