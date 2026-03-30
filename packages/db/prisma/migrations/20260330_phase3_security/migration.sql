-- Phase 3: Security — allowedPreviewHosts field
ALTER TABLE "Project" ADD COLUMN "allowedPreviewHosts" JSONB NOT NULL DEFAULT '[]';
