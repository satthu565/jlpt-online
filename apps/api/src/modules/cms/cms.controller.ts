import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { AuthUserContext } from '../../common/types/auth.types.js';
import { CmsService } from './cms.service.js';
import type {
  CreateArticleDto,
  CreateFaqItemDto,
  CreateLandingPageDto,
  UpdateArticleDto,
} from './cms.types.js';

@Controller('cms')
export class CmsController {
  constructor(private readonly cmsService: CmsService) {}

  @Get('articles')
  async listArticles(@Query('locale') locale?: string) {
    return this.cmsService.listArticles(locale);
  }

  @Get('articles/:slug')
  async getArticleBySlug(
    @Param('slug') slug: string,
    @Query('locale') locale?: string,
  ) {
    return this.cmsService.getArticleBySlug(slug, locale ?? 'vi');
  }

  @Post('articles')
  @Roles('admin', 'editor')
  async createArticle(
    @Body() dto: CreateArticleDto,
    @CurrentUser() user?: AuthUserContext,
  ) {
    if (!user) {
      throw new ForbiddenException({
        code: 'UNAUTHENTICATED',
        message: 'Yêu cầu đăng nhập tài khoản biên tập viên.',
      });
    }
    return this.cmsService.createArticle({
      ...dto,
      authorId: user.id,
    });
  }

  @Put('articles/:id')
  @Roles('admin', 'editor')
  async updateArticle(
    @Param('id') id: string,
    @Body() dto: UpdateArticleDto,
    @CurrentUser() user?: AuthUserContext,
  ) {
    if (!user) {
      throw new ForbiddenException({
        code: 'UNAUTHENTICATED',
        message: 'Yêu cầu đăng nhập tài khoản biên tập viên.',
      });
    }
    return this.cmsService.updateArticle(id, {
      ...dto,
      authorId: user.id,
    });
  }

  @Get('landing/:slug')
  async getLandingPage(@Param('slug') slug: string) {
    return this.cmsService.getLandingPageBySlug(slug);
  }

  @Post('landing')
  @Roles('admin', 'editor')
  async upsertLandingPage(
    @Body() dto: CreateLandingPageDto,
    @CurrentUser() user?: AuthUserContext,
  ) {
    if (!user) {
      throw new ForbiddenException({
        code: 'UNAUTHENTICATED',
        message: 'Yêu cầu đăng nhập tài khoản quản trị.',
      });
    }
    return this.cmsService.upsertLandingPage(dto);
  }

  @Get('faqs')
  async listFaqs(
    @Query('category') category?: string,
    @Query('locale') locale?: string,
  ) {
    return this.cmsService.listFaqItems(category, locale ?? 'vi');
  }

  @Post('faqs')
  @Roles('admin', 'editor')
  async createFaq(
    @Body() dto: CreateFaqItemDto,
    @CurrentUser() user?: AuthUserContext,
  ) {
    if (!user) {
      throw new ForbiddenException({
        code: 'UNAUTHENTICATED',
        message: 'Yêu cầu đăng nhập tài khoản quản trị.',
      });
    }
    return this.cmsService.createFaqItem(dto);
  }

  @Post('sanitize')
  async sanitizePreview(@Body('markdown') markdown: string) {
    return {
      sanitized: this.cmsService.sanitizeContent(markdown),
    };
  }
}
