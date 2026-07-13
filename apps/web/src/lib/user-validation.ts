export function normalizeEmail(value: string) { return value.trim().toLowerCase(); }
export function isUniqueConstraintError(error: unknown) { return Boolean(error && typeof error === "object" && "code" in error && error.code === "P2002"); }
export async function runAtomicUserCreation<TTx, TUser>(database: { $transaction<R>(work: (tx: TTx) => Promise<R>): Promise<R> }, create: (tx: TTx) => Promise<TUser>, ensure: (tx: TTx, user: TUser) => Promise<void>) { return database.$transaction(async tx => { const user = await create(tx); await ensure(tx,user); return user; }); }
