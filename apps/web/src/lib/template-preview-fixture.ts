import type { PublicProfileProjectionData } from "@/lib/profile-projection";
import { approvedTemplateBySlug } from "./profile-templates";
import type { StorefrontPolicy } from "@/lib/storefront-order";

export const ADMIN_PREVIEW_STOREFRONT_POLICY:StorefrontPolicy={enabled:true,products:true,services:true,maxItems:12,whatsapp:true,email:true};

const modules = ["IDENTITY", "ABOUT", "CONTACT", "SOCIAL", "LINKS", "GALLERY", "SERVICES", "BRANCHES"].map((key,index)=>({id:`preview-module-${key}`,key,enabled:true,visibility:"PUBLIC" as const,sortOrder:index*10,configuration:null,moduleDefinition:{key}}));

export function createAdminTemplatePreviewFixture(slug:string):PublicProfileProjectionData {
  const template=approvedTemplateBySlug(slug);if(!template)throw new Error("PREVIEW_TEMPLATE_NOT_FOUND");
  const business=template.profileKind==="BUSINESS";
  const professional=template.family==="professional";
  const storefront=template.family==="storefront";
  const displayName=business?"Northstar Studio":"Maya Hassan";
  return {
    id:`admin-preview-${template.source}`,slug:`preview-${template.slug}`,displayName,displayLabel:null,type:business?"ORGANIZATION":"PERSONAL",profileKind:template.profileKind,categorySlug:business?"business-services":"personal",lifecycle:"PUBLISHED",access:"PUBLIC",canonicalPublication:true,isPublic:true,publishedAt:new Date("2026-01-15T10:00:00.000Z"),primaryLanguage:"en",profession:professional?"DESIGNER":business?"BUSINESS":"CREATOR",customProfession:null,
    firstName:business?null:"Maya",lastName:business?null:"Hassan",displayNameAr:business?null:"مايا حسن",displayNameEn:business?null:"Maya Hassan",organizationNameAr:business?"استوديو نورث ستار":null,organizationNameEn:business?"Northstar Studio":null,title:professional?"Product Designer & Creative Strategist":business?"Thoughtful products, memorable experiences":"Independent creator · Cairo",jobTitleAr:professional?"مصممة منتجات واستراتيجية إبداعية":null,jobTitleEn:professional?"Product Designer & Creative Strategist":null,company:professional?"Atelier Nine":business?"Northstar Collective":null,industryAr:business?"تصميم وتجارب رقمية":null,industryEn:business?"Design & digital experiences":null,
    bio:business?"We create clear brands, useful digital products, and human-centered experiences for ambitious teams.":"Designer, storyteller, and maker creating warm digital experiences with a distinctly human point of view.",bioAr:business?null:"مصممة وصانعة محتوى أبتكر تجارب رقمية دافئة بلمسة إنسانية.",bioEn:business?null:"Designer, storyteller, and maker creating warm digital experiences with a distinctly human point of view.",descriptionAr:business?"نصمم علامات واضحة ومنتجات رقمية مفيدة وتجارب إنسانية للفرق الطموحة.":null,descriptionEn:business?"We create clear brands, useful digital products, and human-centered experiences for ambitious teams.":null,
    avatarUrl:business?"/template-preview/logo-business.svg":"/template-preview/avatar-personal.svg",logoUrl:business?"/template-preview/logo-business.svg":null,coverUrl:business?"/template-preview/cover-business.svg":"/template-preview/cover-personal.svg",phone:"+201001234567",alternatePhone:null,email:"hello@preview.example",website:"https://example.com",locationText:"Cairo, Egypt",addressAr:"القاهرة، مصر",addressEn:"Cairo, Egypt",contactNotesAr:null,contactNotesEn:null,whatsappBusiness:business?"+201001234567":null,whatsappPrivate:business?null:"+201001234567",facebook:"https://facebook.com/popwam",linkedin:"https://linkedin.com/company/popwam",github:"https://github.com/popwam",tiktok:"https://tiktok.com/@popwam",theme:"CLASSIC_LIGHT",
    showAvatar:true,showCover:true,showDisplayName:true,showTitle:true,showBio:true,showPhone:true,showEmail:true,showWebsite:true,showLocation:true,showWhatsappBusiness:business,showWhatsappPrivate:!business,showSocialLinks:true,showCustomFields:true,showUploadedFiles:true,showSaveContact:false,allowInstallable:false,
    fields:[
      {id:"preview-field-1",label:"Specialty",labelAr:"التخصص",labelEn:"Specialty",value:professional?"Product strategy · UX systems":"Editorial design · Photography",type:"TEXT",iconKey:null,customIconUrl:null,actionUrl:null,sortOrder:10,isVisible:true},
      {id:"preview-field-2",label:"Education",labelAr:"التعليم",labelEn:"Education",value:professional?"BA Design · Alexandria University":"Visual Arts · Cairo",type:"TEXT",iconKey:null,customIconUrl:null,actionUrl:null,sortOrder:20,isVisible:true},
      {id:"preview-field-3",label:"Skills",labelAr:"المهارات",labelEn:"Skills",value:professional?"Research · Prototyping · Design leadership":"Art direction · Content · Illustration",type:"TEXT",iconKey:null,customIconUrl:null,actionUrl:null,sortOrder:30,isVisible:true},
    ],
    uploads:professional?[{id:"preview-cv",publicUrl:"/template-preview/sample-cv.svg",originalFilename:"maya-hassan-preview-cv.svg",originalName:"Maya Hassan Preview CV",mimeType:"image/svg+xml",title:"Curriculum Vitae",displayTitleAr:"السيرة الذاتية",displayTitleEn:"Curriculum Vitae",sortOrder:10,isVisible:true}]:[],
    destinations:[
      {id:"preview-link-1",title:"Selected work",titleAr:"أعمال مختارة",titleEn:"Selected work",type:"WEBSITE",url:"https://example.com/work",icon:null,iconKey:"globe",customIconUrl:null,sortOrder:10,isVisible:true,isActive:true},
      {id:"preview-link-2",title:"Book a conversation",titleAr:"احجز محادثة",titleEn:"Book a conversation",type:"CUSTOM_URL",url:"https://example.com/contact",icon:null,iconKey:"calendar",customIconUrl:null,sortOrder:20,isVisible:true,isActive:true},
      {id:"preview-link-3",title:"Latest journal",titleAr:"أحدث المقالات",titleEn:"Latest journal",type:"CUSTOM_URL",url:"https://example.com/journal",icon:null,iconKey:"link",customIconUrl:null,sortOrder:30,isVisible:true,isActive:true},
    ],
    services:[
      {id:"preview-item-1",nameAr:"هوية بصرية",nameEn:storefront?"Signature collection":"Brand identity",descriptionAr:"هوية متكاملة وواضحة للعلامات الطموحة.",descriptionEn:storefront?"A refined everyday piece designed with lasting materials.":"A complete, distinctive identity for ambitious brands.",itemType:storefront?"PRODUCT":"SERVICE",imageUrl:"/template-preview/item-1.svg",price:storefront?"250":null,currency:storefront?"EGP":null,category:storefront?"Featured":"Brand",featured:true,url:null,iconKey:null,sortOrder:10,isVisible:true},
      {id:"preview-item-2",nameAr:"تصميم رقمي",nameEn:storefront?"Personal styling session":"Digital product design",descriptionAr:"تجربة رقمية بسيطة وسريعة وسهلة الاستخدام.",descriptionEn:storefront?"A focused one-to-one service tailored to your style.":"Clear, responsive experiences shaped around real users.",itemType:"SERVICE",imageUrl:"/template-preview/item-2.svg",price:null,currency:null,category:storefront?"Services":"Digital",featured:false,url:null,iconKey:null,sortOrder:20,isVisible:true},
      {id:"preview-item-3",nameAr:"مجموعة تقنية",nameEn:storefront?"Studio edition":"Creative direction",descriptionAr:"حل عملي بتفاصيل مدروسة.",descriptionEn:storefront?"Limited studio release with a clean modern finish.":"A coherent visual direction across every touchpoint.",itemType:storefront?"PRODUCT":"SERVICE",imageUrl:"/template-preview/item-3.svg",price:storefront?"495":null,currency:storefront?"EGP":null,category:storefront?"New arrival":"Creative",featured:true,url:null,iconKey:null,sortOrder:30,isVisible:true},
      {id:"preview-item-4",nameAr:"استشارة نمو",nameEn:"Growth consultation",descriptionAr:"جلسة عملية لتحديد الفرص والخطوات التالية.",descriptionEn:"A practical session to clarify opportunities and next steps.",itemType:"SERVICE",imageUrl:"/template-preview/item-4.svg",price:storefront?"180":null,currency:storefront?"EGP":null,category:storefront?"Services":"Strategy",featured:false,url:null,iconKey:null,sortOrder:40,isVisible:true},
    ],
    branches:business?[{id:"preview-branch-1",nameAr:"استوديو القاهرة",nameEn:"Cairo studio",addressAr:"وسط القاهرة، مصر",addressEn:"Downtown Cairo, Egypt",phone:"+201001234567",mapUrl:"https://maps.google.com",sortOrder:10,isVisible:true}]:[],
    sectionEntries:[],modules,
    media:[
      {id:"preview-media-1",mediaId:"preview-media-1",purpose:"GALLERY",visibility:"PUBLIC",publicUrl:"/template-preview/item-1.svg",sortOrder:10},
      {id:"preview-media-2",mediaId:"preview-media-2",purpose:"GALLERY",visibility:"PUBLIC",publicUrl:"/template-preview/item-3.svg",sortOrder:20},
    ],
    virtualCard:{template:{slug:template.slug,configuration:template.configuration}},
  } as unknown as PublicProfileProjectionData;
}
