-- Person.id を編集可能にするための下準備。
-- 全ての Person への FK に ON UPDATE CASCADE を追加、
-- Person.id が変わったら子テーブルも自動で新 ID を追従する。
-- (対応関係: onDelete は既存を維持、onUpdate だけ Cascade に変更)

ALTER TABLE "PersonCustomQuestion"
  DROP CONSTRAINT "PersonCustomQuestion_personId_fkey",
  ADD CONSTRAINT "PersonCustomQuestion_personId_fkey"
    FOREIGN KEY ("personId") REFERENCES "Person"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PersonOnboarding"
  DROP CONSTRAINT "PersonOnboarding_personId_fkey",
  ADD CONSTRAINT "PersonOnboarding_personId_fkey"
    FOREIGN KEY ("personId") REFERENCES "Person"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PortalDocument"
  DROP CONSTRAINT "PortalDocument_personId_fkey",
  ADD CONSTRAINT "PortalDocument_personId_fkey"
    FOREIGN KEY ("personId") REFERENCES "Person"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PortalTask"
  DROP CONSTRAINT "PortalTask_personId_fkey",
  ADD CONSTRAINT "PortalTask_personId_fkey"
    FOREIGN KEY ("personId") REFERENCES "Person"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Message"
  DROP CONSTRAINT "Message_personId_fkey",
  ADD CONSTRAINT "Message_personId_fkey"
    FOREIGN KEY ("personId") REFERENCES "Person"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ResumeDocument"
  DROP CONSTRAINT "ResumeDocument_personId_fkey",
  ADD CONSTRAINT "ResumeDocument_personId_fkey"
    FOREIGN KEY ("personId") REFERENCES "Person"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ResumeProfile"
  DROP CONSTRAINT "ResumeProfile_personId_fkey",
  ADD CONSTRAINT "ResumeProfile_personId_fkey"
    FOREIGN KEY ("personId") REFERENCES "Person"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PersonPlacement"
  DROP CONSTRAINT "PersonPlacement_personId_fkey",
  ADD CONSTRAINT "PersonPlacement_personId_fkey"
    FOREIGN KEY ("personId") REFERENCES "Person"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Invoice"
  DROP CONSTRAINT "Invoice_personId_fkey",
  ADD CONSTRAINT "Invoice_personId_fkey"
    FOREIGN KEY ("personId") REFERENCES "Person"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "DealCandidate"
  DROP CONSTRAINT "DealCandidate_personId_fkey",
  ADD CONSTRAINT "DealCandidate_personId_fkey"
    FOREIGN KEY ("personId") REFERENCES "Person"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
