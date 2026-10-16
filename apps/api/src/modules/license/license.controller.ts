import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { AuthUserContext } from '../../common/types/auth.types.js';
import { LicenseService } from './license.service.js';
import type {
  CreateLicenseDto,
  CreateSourceDto,
  TakedownLicenseDto,
  UpdateLicenseDto,
  UpdateSourceDto,
} from './license.types.js';

@Roles('admin', 'editor', 'reviewer')
@Controller('admin')
export class LicenseController {
  constructor(private readonly licenseService: LicenseService) {}

  // Sources (QB-17)
  @Post('sources')
  async createSource(@Body() dto: CreateSourceDto) {
    return this.licenseService.createSource(dto);
  }

  @Get('sources')
  async listSources() {
    return this.licenseService.listSources();
  }

  @Get('sources/:id')
  async getSource(@Param('id') id: string) {
    return this.licenseService.getSource(id);
  }

  @Patch('sources/:id')
  async updateSource(@Param('id') id: string, @Body() dto: UpdateSourceDto) {
    return this.licenseService.updateSource(id, dto);
  }

  @Delete('sources/:id')
  async deleteSource(@Param('id') id: string) {
    return this.licenseService.deleteSource(id);
  }

  // Licenses (QB-16, ADM-19)
  @Post('licenses')
  async createLicense(@Body() dto: CreateLicenseDto) {
    return this.licenseService.createLicense(dto);
  }

  @Get('licenses')
  async listLicenses(@Query('sourceId') sourceId?: string) {
    return this.licenseService.listLicenses(sourceId);
  }

  @Get('licenses/:id')
  async getLicense(@Param('id') id: string) {
    return this.licenseService.getLicense(id);
  }

  @Patch('licenses/:id')
  async updateLicense(@Param('id') id: string, @Body() dto: UpdateLicenseDto) {
    return this.licenseService.updateLicense(id, dto);
  }

  @Delete('licenses/:id')
  async deleteLicense(@Param('id') id: string) {
    return this.licenseService.deleteLicense(id);
  }

  @Roles('admin')
  @Post('licenses/:id/takedown')
  async takedownLicense(
    @Param('id') id: string,
    @Body() dto: TakedownLicenseDto,
    @CurrentUser() user: AuthUserContext,
  ) {
    return this.licenseService.takedownLicense(id, dto.reason, user?.userId);
  }
}
