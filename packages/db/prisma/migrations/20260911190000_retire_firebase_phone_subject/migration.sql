-- Obsolete Firebase Phone Auth proof digest. No POP user/session row is removed.
-- Production application is explicitly NOT authorized in this pass.
ALTER TABLE "MobileAuthChallenge" DROP COLUMN "firebaseSubjectHash";
