CREATE TABLE notification_sent_log (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  programme_id     uuid        NOT NULL REFERENCES programmes(id) ON DELETE CASCADE,
  notification_type text       NOT NULL,
  sent_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE (programme_id, notification_type)
);
