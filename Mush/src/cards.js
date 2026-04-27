import {supabase} from "./supabaseClient";

//  CARD STUFF

export async function getCards(binderId, pageNumber) {
  const { data, error } = await supabase
    .from('binder_slots')
    .select('*')
    .eq('binder_id', binderId)
    .eq('page_number', pageNumber)

  if (error) {
    console.error('Load error:', error)
    return []
  }

  return data
}

export async function saveCards(slot) {
  const { error } = await supabase
    .from('binder_slots')
    .upsert(slot, { onConflict: 'binder_id, page_number, slot_number' })

  if (error) {
    console.error('Save error:', error)
  }
}

export async function deleteCard(binderId, pageNumber, slotNumber) {
  const { error } = await supabase
    .from('binder_slots')
    .delete()
    .eq('binder_id', binderId)
    .eq('page_number', pageNumber)
    .eq('slot_number', slotNumber)

  if (error) {
    console.error('Delete error:', error)
  }
}

//  BINDER STUFF

export async function getBinders(userId) {
  const { data, error } = await supabase
    .from('binders')
    .select('*')
    .eq('user_id', userId)

  if (error) {
    console.error('Binder load error:', error)
    return []
  }

  return data
}

export async function createBinders(name, userId) {
  const { data, error } = await supabase
    .from('binders')
    .insert({name, user_id: userId})
    .select()
    .single()
    
  if (error) {
    console.error('Binder create error:', error)
    return null
  }

  return data
}