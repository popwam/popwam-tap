const ARABIC_MARKS=/[\u064B-\u065F\u0670\u06D6-\u06ED]/g;
export function normalizeContentName(value:string){return value.normalize("NFKC").trim().toLocaleLowerCase("ar").replace(ARABIC_MARKS,"").replace(/[أإآٱ]/g,"ا").replace(/ى/g,"ي").replace(/ة/g,"ه").replace(/ـ/g,"").replace(/\s+/g," ").replace(/^ال(?=\p{L}{3})/u,"");}
