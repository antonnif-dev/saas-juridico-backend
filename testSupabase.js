import { supabase } from './supabaseClient.js'

async function testar() {
  const { data, error } = await supabase.from('usuarios').select('*')
  if (error) console.error('Erro:', error)
  else console.log('Dados:', data)
}

testar()