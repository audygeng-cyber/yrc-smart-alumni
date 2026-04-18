-- Link payment requests to originating journal entry (single pipeline: accounting → approval)
alter table public.payment_requests
  add column if not exists journal_entry_id uuid references public.journal_entries (id) on delete set null;

create index if not exists payment_requests_journal_entry_idx
  on public.payment_requests (journal_entry_id)
  where journal_entry_id is not null;
