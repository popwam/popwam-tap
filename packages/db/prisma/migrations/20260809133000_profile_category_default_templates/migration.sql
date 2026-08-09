-- Idempotent catalogue repair. Existing templates and categories are reused;
-- no user/profile rows are created, reset, or deleted.
WITH defaults(category_slug, template_slug) AS (
  VALUES
    ('personal', 'minimal'),
    ('freelancer', 'professional'),
    ('professional', 'professional'),
    ('creator', 'creator'),
    ('restaurant', 'business'),
    ('clinic', 'business'),
    ('salon', 'business'),
    ('supermarket', 'business'),
    ('agency', 'business'),
    ('company', 'business')
)
UPDATE "ProfileCategory" AS category
SET "defaultTemplateId" = template."id", "updatedAt" = CURRENT_TIMESTAMP
FROM defaults
JOIN "ProfileTemplate" AS template ON template."slug" = defaults.template_slug AND template."isActive" = true
WHERE category."slug" = defaults.category_slug
  AND category."isActive" = true
  AND category."defaultTemplateId" IS DISTINCT FROM template."id";
