import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
} from '@nestjs/common';

import { ResponseMessage } from '../../common/decorators/response-message.decorator';
import type { AuthenticatedRequest } from '../../common/interfaces/authenticated-request.interface';
import { AccountService } from '../account.service';
import { UpdateProfileDto } from '../dto/update-profile.dto';
import { UpsertAddressDto } from '../dto/upsert-address.dto';

@Controller('account')
export class CustomerAccountController {
  constructor(private readonly accountService: AccountService) {}

  @Get('profile')
  @ResponseMessage('Profile fetched successfully')
  getProfile(@Req() request: AuthenticatedRequest) {
    return this.accountService.getProfile(request.user.id);
  }

  @Patch('profile')
  @ResponseMessage('Profile updated successfully')
  updateProfile(
    @Req() request: AuthenticatedRequest,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.accountService.updateProfile(request.user.id, dto);
  }

  @Get('addresses')
  @ResponseMessage('Addresses fetched successfully')
  getAddresses(@Req() request: AuthenticatedRequest) {
    return this.accountService.getAddresses(request.user.id);
  }

  @Post('addresses')
  @ResponseMessage('Address added successfully')
  createAddress(
    @Req() request: AuthenticatedRequest,
    @Body() dto: UpsertAddressDto,
  ) {
    return this.accountService.createAddress(request.user.id, dto);
  }

  @Patch('addresses/:addressId')
  @ResponseMessage('Address updated successfully')
  updateAddress(
    @Req() request: AuthenticatedRequest,
    @Param('addressId') addressId: string,
    @Body() dto: UpsertAddressDto,
  ) {
    return this.accountService.updateAddress(request.user.id, addressId, dto);
  }

  @Delete('addresses/:addressId')
  @ResponseMessage('Address removed successfully')
  deleteAddress(
    @Req() request: AuthenticatedRequest,
    @Param('addressId') addressId: string,
  ) {
    return this.accountService.deleteAddress(request.user.id, addressId);
  }
}
