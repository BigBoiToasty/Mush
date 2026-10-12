-- move_card: move a card to another slot in the same binder, or swap it with
-- the card already there, in one all-or-nothing step. Run once in Supabase
-- Studio's SQL Editor (safe to re-run). Added 2026-10-12.
--
-- Runs with the caller's permissions (security invoker), so the existing
-- "own slots" row-level security policies still decide what a user may touch:
-- another user's slots are simply not found.
create or replace function public.move_card(
  p_binder_id bigint,
  p_src_page integer,
  p_src_slot integer,
  p_dest_page integer,
  p_dest_slot integer
) returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_src bigint;
  v_dest bigint;
begin
  if p_src_page = p_dest_page and p_src_slot = p_dest_slot then
    return;
  end if;

  select id into v_src from binder_slots
    where binder_id = p_binder_id and page_number = p_src_page and slot_number = p_src_slot
    for update;
  if v_src is null then
    raise exception 'No card in the source slot' using errcode = 'P0002';
  end if;

  select id into v_dest from binder_slots
    where binder_id = p_binder_id and page_number = p_dest_page and slot_number = p_dest_slot
    for update;

  if v_dest is null then
    update binder_slots set page_number = p_dest_page, slot_number = p_dest_slot where id = v_src;
  else
    -- Swap. Park the moving card on slot -1 first: the unique
    -- (binder_id, page_number, slot_number) key is checked row by row.
    update binder_slots set slot_number = -1 where id = v_src;
    update binder_slots set page_number = p_src_page, slot_number = p_src_slot where id = v_dest;
    update binder_slots set page_number = p_dest_page, slot_number = p_dest_slot where id = v_src;
  end if;
end;
$$;

revoke all on function public.move_card(bigint, integer, integer, integer, integer) from public, anon;
grant execute on function public.move_card(bigint, integer, integer, integer, integer) to authenticated;
