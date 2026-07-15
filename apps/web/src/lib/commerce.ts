export const SUBSCRIPTION_TRANSITIONS:Record<string,string[]> = {
  REQUESTED:["PAYMENT_PENDING","REJECTED"],PAYMENT_PENDING:["PAYMENT_VERIFICATION","REJECTED"],PAYMENT_VERIFICATION:["APPROVED","REJECTED"],APPROVED:["ACTIVE","REJECTED"],ACTIVE:["SUSPENDED","EXPIRED"],SUSPENDED:["ACTIVE","EXPIRED"],EXPIRED:["ACTIVE"],REJECTED:["REQUESTED"],
};
export const ORDER_TRANSITIONS:Record<string,string[]> = {
  NEW:["PAYMENT_PENDING","PAID","CANCELLED"],PAYMENT_PENDING:["PAID","CANCELLED"],PAID:["PROCESSING","REFUNDED"],PROCESSING:["READY","CANCELLED"],READY:["SHIPPED","DELIVERED","CANCELLED"],SHIPPED:["DELIVERED","REFUNDED"],DELIVERED:["REFUNDED"],
};
export function transitionAllowed(map:Record<string,string[]>,from:string,to:string){return map[from]?.includes(to)??false;}
export function storeAvailability(input:{type:string;rawAvailable:number;producedAvailable:number}){return ["BLANK_CARD","BLANK_STICKER","BLANK_WRISTBAND","QR_PRODUCT"].includes(input.type)?Math.max(0,input.producedAvailable):Math.max(0,input.rawAvailable);}
