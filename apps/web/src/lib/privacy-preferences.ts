export function nearbyEnabled(enabled:boolean,visibleUntil:Date|null,now=new Date()){return enabled&&Boolean(visibleUntil&&visibleUntil>now);}
export function activityIdentityLabel(consented:boolean,name:string|null){return consented&&name?.trim()?name.trim():"Anonymous visitor";}
