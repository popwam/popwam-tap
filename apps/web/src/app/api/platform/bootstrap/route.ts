import { prisma } from "@popwam/db";
import { getPublicLocalizationBootstrap } from "@/lib/localization-runtime";
export async function GET(){const [localization,countries]=await Promise.all([getPublicLocalizationBootstrap(),prisma.phoneCountryConfig.findMany({where:{enabled:true},orderBy:[{displayOrder:"asc"},{name:"asc"}],select:{iso2:true,iso3:true,name:true,localizedNames:true,dialCode:true,flagEmoji:true,phonePlaceholder:true,displayOrder:true}})]);return Response.json({ok:true,...localization,phoneCountries:countries},{headers:{"cache-control":"public, max-age=300"}})}
