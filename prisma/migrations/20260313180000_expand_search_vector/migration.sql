-- Expand full-text search vector to include customerName, customerEmail, category, summary, modelVersion

CREATE OR REPLACE FUNCTION trustloop_incident_search_vector_update()
RETURNS trigger AS $$
BEGIN
  NEW."search_vector" := to_tsvector(
    'english',
    coalesce(NEW."title", '') || ' ' ||
    coalesce(NEW."description", '') || ' ' ||
    coalesce(NEW."sourceTicketRef", '') || ' ' ||
    coalesce(NEW."customerName", '') || ' ' ||
    coalesce(NEW."customerEmail", '') || ' ' ||
    coalesce(NEW."category"::text, '') || ' ' ||
    coalesce(NEW."summary", '') || ' ' ||
    coalesce(NEW."modelVersion", '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS incident_search_vector_update ON "Incident";

CREATE TRIGGER incident_search_vector_update
BEFORE INSERT OR UPDATE OF "title", "description", "sourceTicketRef", "customerName", "customerEmail", "category", "summary", "modelVersion"
ON "Incident"
FOR EACH ROW
EXECUTE FUNCTION trustloop_incident_search_vector_update();

-- Backfill existing rows
UPDATE "Incident"
SET "search_vector" = to_tsvector(
  'english',
  coalesce("title", '') || ' ' ||
  coalesce("description", '') || ' ' ||
  coalesce("sourceTicketRef", '') || ' ' ||
  coalesce("customerName", '') || ' ' ||
  coalesce("customerEmail", '') || ' ' ||
  coalesce("category"::text, '') || ' ' ||
  coalesce("summary", '') || ' ' ||
  coalesce("modelVersion", '')
);
