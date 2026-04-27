import { supabase } from './supabaseClient'

supabase
  .from('binders')
  .select('*')
  .then(res => console.log(res))

supabase.from('binders').insert({ name: 'Poo Binder' })

