-- Read-only catalog check for the public schema (audit 03, section 4).
-- Paste into the Supabase SQL editor. Only reads catalogs; one row per finding.
-- Run before and after every migration and compare.
with
t as (select c.oid, n.nspname as sch, c.relname as tbl, c.relrowsecurity as rls, c.relforcerowsecurity as force_rls
      from pg_class c join pg_namespace n on n.oid = c.relnamespace
      where c.relkind in ('r','p') and n.nspname = 'public')
select '1 tables' as check, tbl as object,
       'rls=' || rls || ' force=' || force_rls || ' rows~' || (select reltuples::bigint from pg_class where oid = t.oid) as detail
from t
union all
select '2 policies', tablename || '.' || policyname,
       cmd || ' roles=' || array_to_string(roles, ',') || ' using=' || coalesce(qual, '-') || ' check=' || coalesce(with_check, '-')
from pg_policies where schemaname in ('public', 'storage')
union all
select '3 grants', table_name, grantee || ': ' || string_agg(privilege_type, ',' order by privilege_type)
from information_schema.role_table_grants
where table_schema = 'public' and grantee in ('anon', 'authenticated')
group by table_name, grantee
union all
select '4 functions', p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')',
       'secdef=' || p.prosecdef || ' config=' || coalesce(array_to_string(p.proconfig, ';'), '-')
       || ' anon_exec=' || has_function_privilege('anon', p.oid, 'execute')
       || ' auth_exec=' || has_function_privilege('authenticated', p.oid, 'execute')
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
union all
select '5 buckets', id, 'public=' || public || ' limit=' || coalesce(file_size_limit::text, '-') from storage.buckets
union all
select '6 constraints', conrelid::regclass::text || '.' || conname,
       contype || ': ' || pg_get_constraintdef(oid)
from pg_constraint
where connamespace = 'public'::regnamespace and contype in ('f','c','u','p')
union all
select '7 indexes', tablename || '.' || indexname, indexdef from pg_indexes where schemaname = 'public'
union all
select '8 triggers', event_object_table || '.' || trigger_name, action_timing || ' ' || event_manipulation || ' ' || action_statement
from information_schema.triggers where trigger_schema = 'public'
union all
select '9 default privs', defaclobjtype::text || ' owner=' || pg_get_userbyid(defaclrole),
       array_to_string(defaclacl, ',')
from pg_default_acl where defaclnamespace = 'public'::regnamespace
union all
select '10 nullable ts', table_name || '.' || column_name, data_type || ' nullable=' || is_nullable
from information_schema.columns
where table_schema = 'public' and data_type like 'timestamp%' and (data_type = 'timestamp without time zone' or is_nullable = 'YES')
order by 1, 2;
