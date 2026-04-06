// ─── CMS Module ────────────────────────────────────────────────
// Content management: banners, collections, pages, blog posts,
// FAQs, announcements, SEO metadata, homepage layout.

import { Module } from '@nestjs/common';
import { TrpcService } from '../../trpc/trpc.service';
import { CmsService } from './cms.service';
import { CmsBlogService } from './cms.blog.service';
import { CmsHomepageService } from './cms.homepage.service';
import { CmsSeoService } from './cms.seo.service';
import { CmsTrpcRouter } from './cms.trpc';
import { CmsController } from './cms.controller';

@Module({
  controllers: [CmsController],
  providers: [
    TrpcService,
    CmsService,
    CmsBlogService,
    CmsHomepageService,
    CmsSeoService,
    CmsTrpcRouter,
  ],
  exports: [CmsService, CmsBlogService, CmsHomepageService, CmsSeoService, CmsTrpcRouter],
})
export class CmsModule {}
