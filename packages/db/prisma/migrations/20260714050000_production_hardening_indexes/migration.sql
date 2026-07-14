-- CardStatus is frequently filtered independently by public/admin/programming
-- paths; the existing (assignmentStatus, cardStatus) index cannot efficiently
-- serve that predicate because cardStatus is not its leading column.
CREATE INDEX "Card_cardStatus_idx" ON "Card"("cardStatus");
