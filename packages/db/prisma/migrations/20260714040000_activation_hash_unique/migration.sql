-- Activation tokens are one-time card credentials. Enforce the same uniqueness
-- guarantee at the database layer as serial numbers, slugs, and public tokens.
CREATE UNIQUE INDEX "Card_activationTokenHash_key" ON "Card"("activationTokenHash");
