import { ImageResponse } from "next/og";

export const runtime = "edge";
export async function GET(request: Request) {
  const size = [180, 192, 512].includes(Number(new URL(request.url).searchParams.get("size"))) ? Number(new URL(request.url).searchParams.get("size")) : 512;
  return new ImageResponse(<div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(145deg,#07120f,#0f3127)", color: "#53e0b3", fontSize: size * .22, fontWeight: 900, letterSpacing: "-.06em", borderRadius: size * .18 }}>PT</div>, { width: size, height: size });
}
