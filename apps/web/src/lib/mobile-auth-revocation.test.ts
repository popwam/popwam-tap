import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const database = vi.hoisted(() => ({
  mobileRefreshToken: {
    findUnique: vi.fn(),
    updateMany: vi.fn(),
  },
  deviceSession: { updateMany: vi.fn() },
  mobileDeviceCredential: { updateMany: vi.fn() },
  devicePushToken: { updateMany: vi.fn() },
  $transaction: vi.fn(),
}));

vi.mock("@popwam/db", () => ({ prisma: database }));

import { revokeMobileSession } from "./mobile-auth";

const previousSecret = process.env.MOBILE_TOKEN_SECRET;

afterEach(() => {
  vi.clearAllMocks();
  if (previousSecret === undefined) delete process.env.MOBILE_TOKEN_SECRET;
  else process.env.MOBILE_TOKEN_SECRET = previousSecret;
});

describe("mobile session revocation", () => {
  it("revokes refresh family, device session, binding credential, and push token", async () => {
    process.env.MOBILE_TOKEN_SECRET = "m".repeat(64);
    database.mobileRefreshToken.findUnique.mockResolvedValue({ familyId: "family", deviceSessionId: "device-session", userId: "user" });
    database.$transaction.mockImplementation(async (operation: (tx: typeof database) => unknown) => operation(database));
    database.mobileRefreshToken.updateMany.mockResolvedValue({ count: 1 });
    database.deviceSession.updateMany.mockResolvedValue({ count: 1 });
    database.mobileDeviceCredential.updateMany.mockResolvedValue({ count: 1 });
    database.devicePushToken.updateMany.mockResolvedValue({ count: 1 });

    await revokeMobileSession("r".repeat(64));

    expect(database.mobileRefreshToken.updateMany).toHaveBeenCalledOnce();
    expect(database.deviceSession.updateMany).toHaveBeenCalledOnce();
    expect(database.mobileDeviceCredential.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ deviceSessionId: "device-session", userId: "user", revokedAt: null }),
      data: expect.objectContaining({ status: "REVOKED" }),
    }));
    expect(database.devicePushToken.updateMany).toHaveBeenCalledOnce();
  });
});
