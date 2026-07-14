export const ADMIN_USER_ACCORDIONS_OPEN_BY_DEFAULT = false;

export function userMatchesAdminLinkSearch(user: { name?: string | null; email: string; links: string[]; shortCodes: string[]; batchCodes: string[] }, query: string) {
  const needle = query.trim().toLocaleLowerCase();
  if (!needle) return true;
  return [user.name || "", user.email, ...user.links, ...user.shortCodes, ...user.batchCodes].some(value => value.toLocaleLowerCase().includes(needle));
}
