-- Deduplication: prevent the same external item from being captured twice
alter table raw_captures
  add constraint raw_captures_source_source_id_key
  unique (source, source_id);
