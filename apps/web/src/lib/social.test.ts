import {describe,expect,it} from "vitest";
import {canonicalUserPair,directChatKey,isFriendshipParticipant,otherFriendId} from "./social";
describe("social relationship safety",()=>{it("creates one stable pair regardless of request direction",()=>{expect(canonicalUserPair("z","a")).toEqual({userAId:"a",userBId:"z"});expect(directChatKey("a","z")).toBe(directChatKey("z","a"));});it("rejects unrelated friendship access",()=>{const row={userAId:"a",userBId:"b"};expect(isFriendshipParticipant(row,"a")).toBe(true);expect(()=>otherFriendId(row,"c")).toThrow("FRIENDSHIP_ACCESS_DENIED");});});
