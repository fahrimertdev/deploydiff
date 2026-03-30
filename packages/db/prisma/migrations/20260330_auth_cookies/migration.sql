-- Add authCookies to Project for capturing protected routes
ALTER TABLE "Project" ADD COLUMN "authCookies" TEXT;
