// ─── Recommendations Module ───────────────────────────────────
// AI-powered product recommendations: personalized feeds, similar
// products, trending items, bought-together, behavior tracking,
// and pre-computed similarity scoring.

import { Module } from '@nestjs/common';
import { RecommendationsService } from './recommendations.service';
import { RecommendationsBehaviorService } from './recommendations.behavior.service';
import { RecommendationsSimilarityService } from './recommendations.similarity.service';
import { RecommendationsScoringService } from './recommendations.scoring.service';
import { RecommendationsController } from './recommendations.controller';
import { RecommendationsEventHandler } from './recommendations.event-handler';
import { RecommendationsTrpcRouter } from './recommendations.trpc';

@Module({
  controllers: [RecommendationsController],
  providers: [
    RecommendationsService,
    RecommendationsBehaviorService,
    RecommendationsSimilarityService,
    RecommendationsScoringService,
    RecommendationsEventHandler,
    RecommendationsTrpcRouter,
  ],
  exports: [
    RecommendationsService,
    RecommendationsBehaviorService,
    RecommendationsSimilarityService,
    RecommendationsScoringService,
    RecommendationsTrpcRouter,
  ],
})
export class RecommendationsModule {}
