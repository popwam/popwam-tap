export const META_OAUTH_CAPABILITY_SCOPES={
  facebook_profile:["public_profile","user_link"],
  facebook_pages:["pages_show_list"],
  instagram:["instagram_basic"],
  threads:["threads_basic"],
  whatsapp_business:["whatsapp_business_management"],
} as const;

export type MetaOAuthCapability=keyof typeof META_OAUTH_CAPABILITY_SCOPES;
type Environment=Readonly<Record<string,string|undefined>>;
const optionalCapabilities=new Set<MetaOAuthCapability>(["facebook_pages","instagram","threads","whatsapp_business"]);

export function enabledMetaOAuthCapabilities(env:Environment=process.env):MetaOAuthCapability[]{
  const configured=(env.META_OAUTH_CAPABILITIES||"").split(",").map(value=>value.trim()).filter((value):value is MetaOAuthCapability=>optionalCapabilities.has(value as MetaOAuthCapability));
  return ["facebook_profile",...new Set(configured)];
}

export function buildMetaOAuthScopes(env:Environment=process.env):string[]{
  return [...new Set(enabledMetaOAuthCapabilities(env).flatMap(capability=>META_OAUTH_CAPABILITY_SCOPES[capability]))];
}
