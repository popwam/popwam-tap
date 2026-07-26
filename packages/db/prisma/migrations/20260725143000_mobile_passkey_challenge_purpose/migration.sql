-- Purpose-bind native mobile authentication challenges. Existing
-- AUTHENTICATE rows retain their Web/NextAuth meaning.
ALTER TYPE "PasskeyChallengeType" ADD VALUE IF NOT EXISTS 'AUTHENTICATE_MOBILE';
