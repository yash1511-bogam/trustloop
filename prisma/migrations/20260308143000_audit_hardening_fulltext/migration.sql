ALTER TABLE "Incident"
ADD COLUMN IF NOT EXISTS "search_vector" tsvector;

UPDATE "Incident"
SET "search_vector" = to_tsvector(
  'english',
  coalesce("title", '') || ' ' ||
  coalesce("description", '') || ' ' ||
  coalesce("sourceTicketRef", '')
);

CREATE OR REPLACE FUNCTION trustloop_incident_search_vector_update()
RETURNS trigger AS $$
BEGIN
  NEW."search_vector" := to_tsvector(
    'english',
    coalesce(NEW."title", '') || ' ' ||
    coalesce(NEW."description", '') || ' ' ||
    coalesce(NEW."sourceTicketRef", '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS incident_search_vector_update ON "Incident";

CREATE TRIGGER incident_search_vector_update
BEFORE INSERT OR UPDATE OF "title", "description", "sourceTicketRef"
ON "Incident"
FOR EACH ROW
EXECUTE FUNCTION trustloop_incident_search_vector_update();

CREATE INDEX IF NOT EXISTS "idx_incident_search_vector_gin"
ON "Incident"
USING GIN ("search_vector");

CREATE INDEX IF NOT EXISTS "idx_incident_workspace_source_ticket_ref"
ON "Incident" ("workspaceId", "sourceTicketRef");
