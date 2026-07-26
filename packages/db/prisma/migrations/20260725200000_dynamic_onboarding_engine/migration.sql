-- Phase D dynamic onboarding engine.
-- Additive only. This migration is created for review and is intentionally not applied.

CREATE TYPE "OnboardingDefinitionStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'RETIRED');
CREATE TYPE "OnboardingStepType" AS ENUM ('FORM', 'REVIEW');
CREATE TYPE "OnboardingQuestionType" AS ENUM (
  'TEXT', 'TEXTAREA', 'PHONE', 'EMAIL', 'URL', 'NUMBER', 'CURRENCY',
  'BOOLEAN', 'SINGLE_SELECT', 'MULTI_SELECT', 'IMAGE', 'LOCATION',
  'TIME', 'DAY_HOURS'
);
CREATE TYPE "OnboardingMappingKey" AS ENUM (
  'PROFILE_DISPLAY_NAME', 'ABOUT_BIO', 'CONTACT_PHONE', 'CONTACT_EMAIL',
  'CONTACT_LOCATION', 'JOB_TITLE', 'ORGANIZATION_NAME', 'SOCIAL_LINK',
  'SERVICE_CREATE', 'BRANCH_CREATE', 'GALLERY_ATTACH', 'SETUP_LATER'
);
CREATE TYPE "OnboardingConditionOperator" AS ENUM (
  'EQUALS', 'NOT_EQUALS', 'IN', 'NOT_IN', 'IS_TRUE', 'IS_FALSE',
  'ANSWERED', 'NOT_ANSWERED'
);

CREATE TABLE "OnboardingDefinition" (
  "id" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "profileKind" "ProfileKind" NOT NULL,
  "categoryId" TEXT,
  "templateId" TEXT,
  "status" "OnboardingDefinitionStatus" NOT NULL DEFAULT 'DRAFT',
  "publishedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "OnboardingDefinition_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OnboardingStep" (
  "id" TEXT NOT NULL,
  "definitionId" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL,
  "titleEn" TEXT NOT NULL,
  "titleAr" TEXT NOT NULL,
  "descriptionEn" TEXT,
  "descriptionAr" TEXT,
  "stepType" "OnboardingStepType" NOT NULL DEFAULT 'FORM',
  "required" BOOLEAN NOT NULL DEFAULT true,
  "moduleDefinitionId" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "OnboardingStep_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OnboardingQuestion" (
  "id" TEXT NOT NULL,
  "stepId" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "questionType" "OnboardingQuestionType" NOT NULL,
  "labelEn" TEXT NOT NULL,
  "labelAr" TEXT NOT NULL,
  "helpEn" TEXT,
  "helpAr" TEXT,
  "required" BOOLEAN NOT NULL DEFAULT false,
  "sortOrder" INTEGER NOT NULL,
  "mappingKey" "OnboardingMappingKey" NOT NULL,
  "minLength" INTEGER,
  "maxLength" INTEGER,
  "minValue" DECIMAL(14,2),
  "maxValue" DECIMAL(14,2),
  "maxItems" INTEGER,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "OnboardingQuestion_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OnboardingQuestionOption" (
  "id" TEXT NOT NULL,
  "questionId" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "labelEn" TEXT NOT NULL,
  "labelAr" TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "active" BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT "OnboardingQuestionOption_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OnboardingQuestionCondition" (
  "id" TEXT NOT NULL,
  "questionId" TEXT NOT NULL,
  "sourceQuestionKey" TEXT NOT NULL,
  "operator" "OnboardingConditionOperator" NOT NULL,
  "expectedValues" TEXT[],
  CONSTRAINT "OnboardingQuestionCondition_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "OnboardingProgress"
  ADD COLUMN "profileId" TEXT,
  ADD COLUMN "definitionId" TEXT,
  ADD COLUMN "definitionVersion" INTEGER,
  ADD COLUMN "currentStepKey" TEXT,
  ADD COLUMN "revision" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "draftAnswers" JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN "initialAnswers" JSONB NOT NULL DEFAULT '{}';

CREATE UNIQUE INDEX "OnboardingDefinition_key_version_key"
  ON "OnboardingDefinition"("key", "version");
CREATE INDEX "OnboardingDefinition_profileKind_status_version_idx"
  ON "OnboardingDefinition"("profileKind", "status", "version");
CREATE INDEX "OnboardingDefinition_categoryId_status_version_idx"
  ON "OnboardingDefinition"("categoryId", "status", "version");
CREATE INDEX "OnboardingDefinition_templateId_status_version_idx"
  ON "OnboardingDefinition"("templateId", "status", "version");
CREATE UNIQUE INDEX "OnboardingStep_definitionId_key_key"
  ON "OnboardingStep"("definitionId", "key");
CREATE INDEX "OnboardingStep_definitionId_active_sortOrder_idx"
  ON "OnboardingStep"("definitionId", "active", "sortOrder");
CREATE INDEX "OnboardingStep_moduleDefinitionId_idx"
  ON "OnboardingStep"("moduleDefinitionId");
CREATE UNIQUE INDEX "OnboardingQuestion_stepId_key_key"
  ON "OnboardingQuestion"("stepId", "key");
CREATE INDEX "OnboardingQuestion_stepId_active_sortOrder_idx"
  ON "OnboardingQuestion"("stepId", "active", "sortOrder");
CREATE UNIQUE INDEX "OnboardingQuestionOption_questionId_key_key"
  ON "OnboardingQuestionOption"("questionId", "key");
CREATE INDEX "OnboardingQuestionOption_questionId_active_sortOrder_idx"
  ON "OnboardingQuestionOption"("questionId", "active", "sortOrder");
CREATE INDEX "OnboardingQuestionCondition_questionId_idx"
  ON "OnboardingQuestionCondition"("questionId");
CREATE UNIQUE INDEX "OnboardingProgress_profileId_key"
  ON "OnboardingProgress"("profileId");
CREATE INDEX "OnboardingProgress_definitionId_definitionVersion_idx"
  ON "OnboardingProgress"("definitionId", "definitionVersion");
CREATE INDEX "OnboardingProgress_profileId_completedAt_idx"
  ON "OnboardingProgress"("profileId", "completedAt");

ALTER TABLE "OnboardingDefinition"
  ADD CONSTRAINT "OnboardingDefinition_categoryId_fkey"
  FOREIGN KEY ("categoryId") REFERENCES "ProfileCategory"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OnboardingDefinition"
  ADD CONSTRAINT "OnboardingDefinition_templateId_fkey"
  FOREIGN KEY ("templateId") REFERENCES "ProfileTemplate"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OnboardingStep"
  ADD CONSTRAINT "OnboardingStep_definitionId_fkey"
  FOREIGN KEY ("definitionId") REFERENCES "OnboardingDefinition"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OnboardingStep"
  ADD CONSTRAINT "OnboardingStep_moduleDefinitionId_fkey"
  FOREIGN KEY ("moduleDefinitionId") REFERENCES "ProfileModuleDefinition"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OnboardingQuestion"
  ADD CONSTRAINT "OnboardingQuestion_stepId_fkey"
  FOREIGN KEY ("stepId") REFERENCES "OnboardingStep"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OnboardingQuestionOption"
  ADD CONSTRAINT "OnboardingQuestionOption_questionId_fkey"
  FOREIGN KEY ("questionId") REFERENCES "OnboardingQuestion"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OnboardingQuestionCondition"
  ADD CONSTRAINT "OnboardingQuestionCondition_questionId_fkey"
  FOREIGN KEY ("questionId") REFERENCES "OnboardingQuestion"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OnboardingProgress"
  ADD CONSTRAINT "OnboardingProgress_profileId_fkey"
  FOREIGN KEY ("profileId") REFERENCES "Profile"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OnboardingProgress"
  ADD CONSTRAINT "OnboardingProgress_definitionId_fkey"
  FOREIGN KEY ("definitionId") REFERENCES "OnboardingDefinition"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
