import { getServerSession } from "next-auth";
import { authOptions } from "./auth";

export async function getApiUser() {
  const session = await getServerSession(authOptions);
  return session?.user?.id ? session.user : null;
}

export function unauthorized() {
  return Response.json({ error: "Unauthorized" }, { status: 401 });
}
