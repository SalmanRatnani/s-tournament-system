-- The trigger is owned by the database and should not be exposed as a public RPC.
-- Safe to apply after 001, 002 and 003. Auth signup trigger continues to work.
revoke all on function public.create_signup_profile() from public, anon, authenticated;
