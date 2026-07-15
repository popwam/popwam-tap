export function canonicalUserPair(first:string,second:string){return first<second?{userAId:first,userBId:second}:{userAId:second,userBId:first};}
export function directChatKey(first:string,second:string){const pair=canonicalUserPair(first,second);return `${pair.userAId}:${pair.userBId}`;}
export function isFriendshipParticipant(friendship:{userAId:string;userBId:string},userId:string){return friendship.userAId===userId||friendship.userBId===userId;}
export function otherFriendId(friendship:{userAId:string;userBId:string},userId:string){if(friendship.userAId===userId)return friendship.userBId;if(friendship.userBId===userId)return friendship.userAId;throw new Error("FRIENDSHIP_ACCESS_DENIED");}
