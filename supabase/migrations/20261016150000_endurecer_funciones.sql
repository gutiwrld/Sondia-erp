-- Avisos del asesor de seguridad de Supabase:
--  * search_path fijo en las funciones de trigger que no lo tenían.
--  * Las funciones de trigger no se llaman desde la API: fuera el EXECUTE.
alter function public.set_updated_at() set search_path = '';
alter function public.enforce_client_rules() set search_path = '';
alter function public.set_task_completed_at() set search_path = '';

revoke execute on function public.enforce_member_allowlist() from public, anon, authenticated;
revoke execute on function public.link_member_to_user() from public, anon, authenticated;
revoke execute on function public.log_client_changes() from public, anon, authenticated;
