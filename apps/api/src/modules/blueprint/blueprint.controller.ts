import {
  Body,
  Controller,
  Get,
  Param,
  Post,
} from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { BlueprintService } from './blueprint.service.js';

@Controller('admin/blueprints')
export class BlueprintController {
  constructor(private readonly blueprintService: BlueprintService) {}

  @Roles('admin', 'editor')
  @Get()
  async listBlueprints() {
    return this.blueprintService.listBlueprints();
  }

  @Roles('admin', 'editor')
  @Get(':id')
  async getBlueprint(@Param('id') id: string) {
    return this.blueprintService.getBlueprintById(id);
  }

  @Roles('admin', 'editor')
  @Post()
  async createBlueprint(
    @Body() body: Record<string, unknown>,
    @CurrentUser() user: { id?: string; userId?: string },
  ) {
    const userId = user.userId || user.id || 'admin';
    return this.blueprintService.createBlueprint(body, userId);
  }

  @Roles('admin', 'editor')
  @Post(':id/versions')
  async createBlueprintVersion(
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
    @CurrentUser() user: { id?: string; userId?: string },
  ) {
    const userId = user.userId || user.id || 'admin';
    return this.blueprintService.createBlueprintVersion(id, body, userId);
  }

  @Roles('admin')
  @Post(':id/activate')
  async activateBlueprint(
    @Param('id') id: string,
    @Body() body: unknown,
    @CurrentUser() user: { id?: string; userId?: string },
  ) {
    const userId = user.userId || user.id || 'admin';
    return this.blueprintService.activateBlueprint(id, body, userId);
  }
}
