import { useState } from 'react'
import { supabase } from './supabaseClient'
import { theme } from './theme'
import { TIDE_BG, FRAME } from './pixelArt'

const t = theme
const fontBase = { fontFamily: t.font.family, letterSpacing: t.font.letterSpacing }

const frameBox = {
  ...fontBase,
  color: t.colors.inputText,
  backgroundColor: t.colors.inputCorner,
  borderStyle: 'solid',
  borderWidth: t.frame.width,
  borderImageSource: FRAME,
  borderImageSlice: `${t.frame.slice} fill`,
  borderImageRepeat: 'stretch',
  imageRendering: 'pixelated',
  outline: 'none',
}

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
    <div
      className="flex min-h-screen items-center justify-center"
      style={{ background: TIDE_BG, backgroundSize: 'cover', imageRendering: 'pixelated' }}
    >
      <form onSubmit={handleSubmit} className="@container flex flex-col gap-[3cqw] w-[min(420px,88vw)] p-[6cqw]" style={frameBox}>
        <h2 style={{ ...fontBase, color: t.colors.label, fontSize: '5cqw' }} className="text-center">
          Pick a username
        </h2>
        <input
          type="text"
          value={username}
          onChange={e => setUsername(e.target.value)}
          placeholder="your username"
          autoFocus
          style={{ ...frameBox, fontSize: '3.2cqw', padding: '3cqw', backgroundColor: t.colors.inputFill }}
        />
        {error && (
          <p style={{ ...fontBase, color: '#cc0000', fontSize: '2.6cqw', margin: 0 }}>{error}</p>
        )}
        <button
          type="submit"
          disabled={loading || !username.trim()}
          style={{ ...frameBox, fontSize: '3.2cqw', padding: '3cqw', cursor: 'pointer' }}
          className="hover:brightness-110 disabled:opacity-50 disabled:cursor-default"
        >
          {loading ? '...' : 'Continue'}
        </button>
      </form>
    </div>
  )
}
