-- ---------------------------------------------------------------------------
-- Where the last import stopped.
--
-- The first run learned what the docs imply: the free plan's 30-a-minute limit
-- bites long before the monthly quota does. 31 requests in a few seconds
-- returned 429 at offset 300, so the import is now throttled and chunked, and
-- each run has to say where the next one picks up.
--
-- Recorded rather than derived. The resume point was briefly the sum of
-- `written` across runs, which is right only while nobody ever re-imports a
-- range — and "run it again from the start" is exactly what someone does when
-- they think something went wrong.
-- ---------------------------------------------------------------------------
alter table public.catalogue_syncs
  add column next_offset integer not null default 0;

comment on column public.catalogue_syncs.next_offset is
  'The offset the following run should start from. The highest one wins.';
