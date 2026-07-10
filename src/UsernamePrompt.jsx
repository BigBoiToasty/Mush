import { useState } from 'react'
import { supabase } from './supabaseClient'

export default function UsernamePrompt({ session, onUsernameSet }) {
  const [username, setUsername] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    const trimmed = username.trim()
    if (!trimmed) return
    setError(null)
    setLoading(true)
    const { error } = await supabase
      .from('profiles')
      .insert({ user_id: session.user.id, username: trimmed.toLowerCase() })
    setLoading(false)
    if (error) {
      setError(error.code === '23505' ? 'Username already taken. Try another.' : error.message)
      return
    }
    onUsernameSet()
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 w-72">
        <h2 className="text-xl font-bold text-center">Pick a username</h2>
        <input
          type="text"
          value={username}
          onChange={e => setUsername(e.target.value)}
          placeholder="your username"
          className="border border-gray-400 px-3 py-2 rounded"
          autoFocus
        />
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <button
          type="submit"
          disabled={loading || !username.trim()}
          className="rounded border border-gray-800 px-4 py-2 hover:bg-gray-100 disabled:opacity-50"
        >
          {loading ? '...' : 'Continue'}
        </button>
      </form>
    </div>
  )
}
