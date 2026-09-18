-- 0005_normalize_status_values.sql
--
-- jobs.status is a free-text column (no CHECK constraint / enum), so the app
-- can use the canonical keys directly. This migration only rewrites *known*
-- legacy or display-style values onto those keys. It is idempotent and never
-- touches unrecognized values, so no application data is lost or invented.
--
-- Canonical keys:
--   saved | applied | recruiter_screen | interview |
--   moved_to_next_round | waiting_for_offer | offer | rejected | withdrawn

update public.jobs
set status = case
  when lower(btrim(status)) in ('recruiter screening', 'recruiter_screening', 'recruiter screen') then 'recruiter_screen'
  when lower(btrim(status)) in ('interview scheduled', 'interview_scheduled') then 'interview'
  when lower(btrim(status)) in ('moved to next round', 'moved_to_next_round') then 'moved_to_next_round'
  when lower(btrim(status)) in (
    'waiting for offer', 'waiting_for_offer',
    'awaiting for response', 'awaiting_for_response', 'awaiting response'
  ) then 'waiting_for_offer'
  when lower(btrim(status)) in (
    'offer', 'offer received', 'offer_received',
    'offer accepted', 'offer_accepted', 'offer declined', 'offer_declined'
  ) then 'offer'
  else status
end
where lower(btrim(status)) in (
  'recruiter screening', 'recruiter_screening', 'recruiter screen',
  'interview scheduled', 'interview_scheduled',
  'moved to next round', 'moved_to_next_round',
  'waiting for offer', 'waiting_for_offer',
  'awaiting for response', 'awaiting_for_response', 'awaiting response',
  'offer', 'offer received', 'offer_received',
  'offer accepted', 'offer_accepted', 'offer declined', 'offer_declined'
);
