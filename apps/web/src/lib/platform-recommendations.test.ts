import {describe,expect,it} from "vitest";
import {professionRecommendations,recommendationsFor} from "./platform-recommendations";
describe("profession platform recommendations",()=>{it("defines every profession",()=>expect(Object.keys(professionRecommendations)).toHaveLength(15));it("never hides platforms outside suggestions",()=>expect(recommendationsFor("DEVELOPER",["github","spotify"])).toEqual(["github","spotify"]))})
