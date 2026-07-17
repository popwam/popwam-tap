export const CUSTOMER_PRODUCT_STATUSES=["ACTIVE","PAUSED","LOST","STOLEN","DISABLED","TRANSFER_PENDING"] as const;
export function canSetProductStatus(value:string):value is typeof CUSTOMER_PRODUCT_STATUSES[number]{return CUSTOMER_PRODUCT_STATUSES.includes(value as typeof CUSTOMER_PRODUCT_STATUSES[number]);}
export function maskedSerial(value:string){return `${"•".repeat(Math.max(6,value.length-3))}${value.slice(-3)}`;}
