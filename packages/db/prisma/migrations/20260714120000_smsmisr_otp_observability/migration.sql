ALTER TABLE "OtpChallenge" ADD COLUMN "requestIpHash" TEXT;
ALTER TABLE "OtpSendLog" ADD COLUMN "responseCode" TEXT;
ALTER TABLE "OtpSendLog" ADD COLUMN "messageId" TEXT;
ALTER TABLE "OtpSendLog" ADD COLUMN "cost" TEXT;

CREATE INDEX "OtpChallenge_requestIpHash_createdAt_idx" ON "OtpChallenge"("requestIpHash", "createdAt");
