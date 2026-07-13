import type { ProfileTheme } from "@popwam/db";
export const THEME_TOKENS:Record<ProfileTheme,{background:string;panel:string;accent:string;text:string;radius:number;buttonRadius:number}>={
  CLASSIC_DARK:{background:"#07090f",panel:"#111722",accent:"#32d6a2",text:"#f5f7fb",radius:22,buttonRadius:13},
  CLASSIC_LIGHT:{background:"#eef3f6",panel:"#ffffff",accent:"#087e68",text:"#17202a",radius:19,buttonRadius:11},
  ELEGANT_DARK:{background:"#120d17",panel:"#2a1a31",accent:"#f0a8ca",text:"#fff7fb",radius:40,buttonRadius:999},
  ELEGANT_LIGHT:{background:"#fff5fa",panel:"#ffffff",accent:"#b83c79",text:"#342230",radius:40,buttonRadius:999},
  BUSINESS_DARK:{background:"#08101f",panel:"#101c31",accent:"#4f9cff",text:"#f8fafc",radius:16,buttonRadius:8},
  BUSINESS_LIGHT:{background:"#edf3f9",panel:"#ffffff",accent:"#1d4ed8",text:"#132238",radius:16,buttonRadius:8},
};
