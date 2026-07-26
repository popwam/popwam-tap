import {
  OnboardingConditionOperator,
  OnboardingDefinitionStatus,
  OnboardingMappingKey,
  OnboardingQuestionType,
  PrismaClient,
  ProfileKind,
} from "@prisma/client";
import { config } from "dotenv";
import { resolve } from "node:path";

config({ path: resolve(process.cwd(), "../../.env"), quiet: true });

type OptionSeed = { key: string; en: string; ar: string };
type ConditionSeed = {
  source: string;
  operator: OnboardingConditionOperator;
  values?: string[];
};
type QuestionSeed = {
  key: string;
  type: OnboardingQuestionType;
  en: string;
  ar: string;
  mapping: OnboardingMappingKey;
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  maxItems?: number;
  options?: OptionSeed[];
  conditions?: ConditionSeed[];
};
type StepSeed = {
  key: string;
  en: string;
  ar: string;
  module?: string;
  required?: boolean;
  questions: QuestionSeed[];
};
type DefinitionSeed = {
  key: string;
  version: number;
  kind: ProfileKind;
  category?: string;
  steps: StepSeed[];
};

const contactStep = (): StepSeed => ({
  key: "contact",
  en: "Contact",
  ar: "التواصل",
  module: "CONTACT",
  required: false,
  questions: [
    { key: "contact_phone", type: OnboardingQuestionType.PHONE, en: "Contact phone", ar: "هاتف التواصل", mapping: OnboardingMappingKey.CONTACT_PHONE, maxLength: 32 },
    { key: "contact_email", type: OnboardingQuestionType.EMAIL, en: "Contact email", ar: "البريد الإلكتروني للتواصل", mapping: OnboardingMappingKey.CONTACT_EMAIL, maxLength: 254 },
    { key: "contact_location", type: OnboardingQuestionType.LOCATION, en: "Location or address", ar: "الموقع أو العنوان", mapping: OnboardingMappingKey.CONTACT_LOCATION, maxLength: 300 },
  ],
});

const linkStep = (): StepSeed => ({
  key: "links",
  en: "Links",
  ar: "الروابط",
  module: "LINKS",
  required: false,
  questions: [
    { key: "website_link", type: OnboardingQuestionType.URL, en: "Website or portfolio", ar: "الموقع أو معرض الأعمال", mapping: OnboardingMappingKey.SOCIAL_LINK, maxLength: 500 },
  ],
});

const businessIdentityStep = (): StepSeed => ({
  key: "business_identity",
  en: "Business identity",
  ar: "هوية النشاط",
  module: "IDENTITY",
  questions: [
    { key: "business_logo", type: OnboardingQuestionType.IMAGE, en: "Business logo (optional)", ar: "شعار النشاط (اختياري)", mapping: OnboardingMappingKey.GALLERY_ATTACH, maxItems: 1 },
    { key: "business_name", type: OnboardingQuestionType.TEXT, en: "Business name", ar: "اسم النشاط", mapping: OnboardingMappingKey.ORGANIZATION_NAME, required: true, minLength: 2, maxLength: 120 },
    { key: "business_description", type: OnboardingQuestionType.TEXTAREA, en: "Short description", ar: "وصف مختصر", mapping: OnboardingMappingKey.ABOUT_BIO, maxLength: 800 },
  ],
});

const branchStep = (): StepSeed => ({
  key: "branches",
  en: "Branches",
  ar: "الفروع",
  module: "BRANCHES",
  required: false,
  questions: [
    { key: "has_branches", type: OnboardingQuestionType.BOOLEAN, en: "Do you want to add a branch now?", ar: "هل تريد إضافة فرع الآن؟", mapping: OnboardingMappingKey.SETUP_LATER },
    {
      key: "branch_address",
      type: OnboardingQuestionType.LOCATION,
      en: "Branch address",
      ar: "عنوان الفرع",
      mapping: OnboardingMappingKey.BRANCH_CREATE,
      required: true,
      maxLength: 300,
      conditions: [{ source: "has_branches", operator: OnboardingConditionOperator.IS_TRUE }],
    },
  ],
});

const setupLaterStep = (key: string, en: string, ar: string): StepSeed => ({
  key,
  en,
  ar,
  required: false,
  questions: [
    { key: `${key}_later`, type: OnboardingQuestionType.BOOLEAN, en: `Configure ${en.toLowerCase()} later`, ar: `إعداد ${ar} لاحقاً`, mapping: OnboardingMappingKey.SETUP_LATER },
  ],
});

const professionalDefinition = (category: "freelancer" | "professional"): DefinitionSeed => ({
  key: `${category}-v1`,
  version: 1,
  kind: ProfileKind.PERSONAL,
  category,
  steps: [
    {
      key: "about",
      en: "About you",
      ar: "نبذة عنك",
      module: "ABOUT",
      questions: [
        { key: "profile_image", type: OnboardingQuestionType.IMAGE, en: "Profile image (optional)", ar: "صورة الملف (اختيارية)", mapping: OnboardingMappingKey.GALLERY_ATTACH, maxItems: 1 },
        { key: "job_title", type: OnboardingQuestionType.TEXT, en: "Profession or title", ar: "المهنة أو المسمى", mapping: OnboardingMappingKey.JOB_TITLE, required: true, minLength: 2, maxLength: 120 },
        { key: "bio", type: OnboardingQuestionType.TEXTAREA, en: "Short bio", ar: "نبذة مختصرة", mapping: OnboardingMappingKey.ABOUT_BIO, maxLength: 800 },
      ],
    },
    {
      key: "services",
      en: "Services",
      ar: "الخدمات",
      module: "SERVICES",
      required: false,
      questions: [
        {
          key: "services",
          type: OnboardingQuestionType.MULTI_SELECT,
          en: "Services you provide",
          ar: "الخدمات التي تقدمها",
          mapping: OnboardingMappingKey.SERVICE_CREATE,
          maxItems: 3,
          options: [
            { key: "consulting", en: "Consulting", ar: "استشارات" },
            { key: "design", en: "Design", ar: "تصميم" },
            { key: "development", en: "Development", ar: "تطوير" },
            { key: "training", en: "Training", ar: "تدريب" },
          ],
        },
      ],
    },
    linkStep(),
    contactStep(),
  ],
});

const definitions: DefinitionSeed[] = [
  {
    key: "personal-basic-v1",
    version: 1,
    kind: ProfileKind.PERSONAL,
    steps: [
      {
        key: "about",
        en: "About you",
        ar: "نبذة عنك",
        module: "ABOUT",
        questions: [
          { key: "profile_image", type: OnboardingQuestionType.IMAGE, en: "Profile image (optional)", ar: "صورة الملف (اختيارية)", mapping: OnboardingMappingKey.GALLERY_ATTACH, maxItems: 1 },
          { key: "display_name", type: OnboardingQuestionType.TEXT, en: "Public display name", ar: "الاسم الظاهر", mapping: OnboardingMappingKey.PROFILE_DISPLAY_NAME, required: true, minLength: 2, maxLength: 120 },
          { key: "bio", type: OnboardingQuestionType.TEXTAREA, en: "Short bio", ar: "نبذة مختصرة", mapping: OnboardingMappingKey.ABOUT_BIO, maxLength: 800 },
        ],
      },
      contactStep(),
      linkStep(),
    ],
  },
  professionalDefinition("freelancer"),
  professionalDefinition("professional"),
  {
    key: "business-basic-v1",
    version: 1,
    kind: ProfileKind.BUSINESS,
    steps: [businessIdentityStep(), contactStep(), linkStep()],
  },
  {
    key: "restaurant-v1",
    version: 1,
    kind: ProfileKind.BUSINESS,
    category: "restaurant",
    steps: [businessIdentityStep(), branchStep(), setupLaterStep("menu", "Menu", "القائمة"), contactStep(), linkStep()],
  },
  {
    key: "clinic-v1",
    version: 1,
    kind: ProfileKind.BUSINESS,
    category: "clinic",
    steps: [
      businessIdentityStep(),
      {
        key: "services",
        en: "Specialties",
        ar: "التخصصات",
        module: "SERVICES",
        required: false,
        questions: [{
          key: "services",
          type: OnboardingQuestionType.MULTI_SELECT,
          en: "Specialties or services",
          ar: "التخصصات أو الخدمات",
          mapping: OnboardingMappingKey.SERVICE_CREATE,
          maxItems: 4,
          options: [
            { key: "general", en: "General care", ar: "رعاية عامة" },
            { key: "dental", en: "Dental", ar: "أسنان" },
            { key: "dermatology", en: "Dermatology", ar: "جلدية" },
            { key: "pediatrics", en: "Pediatrics", ar: "أطفال" },
          ],
        }],
      },
      branchStep(),
      contactStep(),
      setupLaterStep("booking", "Booking", "الحجز"),
    ],
  },
  {
    key: "salon-v1",
    version: 1,
    kind: ProfileKind.BUSINESS,
    category: "salon",
    steps: [
      businessIdentityStep(),
      {
        key: "services",
        en: "Services",
        ar: "الخدمات",
        module: "SERVICES",
        required: false,
        questions: [{
          key: "services",
          type: OnboardingQuestionType.MULTI_SELECT,
          en: "Services offered",
          ar: "الخدمات المقدمة",
          mapping: OnboardingMappingKey.SERVICE_CREATE,
          maxItems: 4,
          options: [
            { key: "hair", en: "Hair", ar: "الشعر" },
            { key: "nails", en: "Nails", ar: "الأظافر" },
            { key: "makeup", en: "Makeup", ar: "المكياج" },
            { key: "skincare", en: "Skin care", ar: "العناية بالبشرة" },
          ],
        }],
      },
      branchStep(),
      contactStep(),
      setupLaterStep("booking", "Booking", "الحجز"),
    ],
  },
];

function validateDefinition(definition: DefinitionSeed) {
  const keys = new Set(definition.steps.flatMap((step) => step.questions.map((question) => question.key)));
  if (keys.size !== definition.steps.flatMap((step) => step.questions).length) {
    throw new Error(`Duplicate question key in ${definition.key}`);
  }
  for (const question of definition.steps.flatMap((step) => step.questions)) {
    for (const condition of question.conditions || []) {
      if (!keys.has(condition.source)) throw new Error(`Unknown condition source ${condition.source}`);
    }
  }
}

async function main() {
  if (process.env.NODE_ENV === "production" && process.env.ALLOW_PRODUCTION_ONBOARDING_SEED !== "true") {
    throw new Error("Production onboarding seed is disabled.");
  }
  const prisma = new PrismaClient();
  try {
    for (const definition of definitions) {
      validateDefinition(definition);
      const existing = await prisma.onboardingDefinition.findUnique({
        where: { key_version: { key: definition.key, version: definition.version } },
      });
      if (existing) continue; // Published versions are immutable.
      const category = definition.category
        ? await prisma.profileCategory.findUniqueOrThrow({ where: { slug: definition.category } })
        : null;
      const moduleKeys = [...new Set(definition.steps.flatMap((step) => step.module ? [step.module] : []))];
      const modules = await prisma.profileModuleDefinition.findMany({ where: { key: { in: moduleKeys } } });
      if (modules.length !== moduleKeys.length) throw new Error(`Missing module definition for ${definition.key}`);
      const moduleIds = new Map(modules.map((module) => [module.key, module.id]));
      await prisma.onboardingDefinition.create({
        data: {
          key: definition.key,
          version: definition.version,
          profileKind: definition.kind,
          categoryId: category?.id,
          status: OnboardingDefinitionStatus.PUBLISHED,
          publishedAt: new Date("2026-07-25T00:00:00.000Z"),
          steps: {
            create: definition.steps.map((step, stepIndex) => ({
              key: step.key,
              sortOrder: (stepIndex + 1) * 10,
              titleEn: step.en,
              titleAr: step.ar,
              required: step.required ?? true,
              moduleDefinitionId: step.module ? moduleIds.get(step.module) : undefined,
              questions: {
                create: step.questions.map((question, questionIndex) => ({
                  key: question.key,
                  questionType: question.type,
                  labelEn: question.en,
                  labelAr: question.ar,
                  required: question.required ?? false,
                  sortOrder: (questionIndex + 1) * 10,
                  mappingKey: question.mapping,
                  minLength: question.minLength,
                  maxLength: question.maxLength,
                  maxItems: question.maxItems,
                  options: {
                    create: (question.options || []).map((option, optionIndex) => ({
                      key: option.key,
                      labelEn: option.en,
                      labelAr: option.ar,
                      sortOrder: (optionIndex + 1) * 10,
                    })),
                  },
                  conditions: {
                    create: (question.conditions || []).map((condition) => ({
                      sourceQuestionKey: condition.source,
                      operator: condition.operator,
                      expectedValues: condition.values || [],
                    })),
                  },
                })),
              },
            })),
          },
        },
      });
    }
    console.info(`Onboarding definitions ready: ${definitions.length}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
