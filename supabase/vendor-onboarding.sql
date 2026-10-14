-- Persist the structured answers from the ChopHub three-page vendor onboarding form.
alter table public.vendors
  add column if not exists onboarding_data jsonb not null default '{}'::jsonb
    check (jsonb_typeof(onboarding_data) = 'object');
