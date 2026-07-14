import { describe, expect, it } from "vitest";
import { cardDispositionAfterUserDeletion } from "./card-lifecycle";

describe("admin user deletion card policy", () => {
  it("returns physical identity to unassigned inventory by default", () => expect(cardDispositionAfterUserDeletion("unassign")).toEqual({ ownerId: null, assignmentStatus: "UNASSIGNED", inventoryStatus: "PROGRAMMED", producedTagStatus: "UNASSIGNED" }));
  it("never invents a future owner", () => expect(() => cardDispositionAfterUserDeletion("reassign")).toThrow("REASSIGN_USER_REQUIRED"));
});
