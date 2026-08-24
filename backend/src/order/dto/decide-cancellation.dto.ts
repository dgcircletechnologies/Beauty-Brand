import { IsIn, IsOptional, IsString } from 'class-validator';

import { CancellationRequestStatus } from '../../../generated/prisma/enums.cjs';

export class DecideCancellationDto {
  @IsIn([
    CancellationRequestStatus.APPROVED,
    CancellationRequestStatus.REJECTED,
  ])
  status!: CancellationRequestStatus;

  @IsOptional()
  @IsString()
  decisionNote?: string;
}
