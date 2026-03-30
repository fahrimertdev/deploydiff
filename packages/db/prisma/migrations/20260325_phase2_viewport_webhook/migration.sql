-- Add viewportPresets and webhookSecret to Project
ALTER TABLE "Project" ADD COLUMN "viewportPresets" JSONB NOT NULL DEFAULT '["desktop"]';
ALTER TABLE "Project" ADD COLUMN "webhookSecret" TEXT;

-- Add viewportLabel to ReviewPage
ALTER TABLE "ReviewPage" ADD COLUMN "viewportLabel" TEXT NOT NULL DEFAULT 'desktop';

-- Drop old unique index/constraint, add new one including viewportLabel
DROP INDEX IF EXISTS "ReviewPage_reviewId_routeId_key";
ALTER TABLE "ReviewPage" DROP CONSTRAINT IF EXISTS "ReviewPage_reviewId_routeId_key";
ALTER TABLE "ReviewPage" ADD CONSTRAINT "ReviewPage_reviewId_routeId_viewportLabel_key" UNIQUE ("reviewId", "routeId", "viewportLabel");
