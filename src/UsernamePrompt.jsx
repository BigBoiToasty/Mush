import { useState } from 'react'
import { supabase } from './supabaseClient'
import cardImg from './assets/notepad-vertical.png'
import { theme } from './theme'
import { TIDE_BG, FRAME } from './pixelArt'

// Same notebook look as LoginCard, but on a vertical notepad (the login-card
// artwork rotated and shortened). The card is narrower than the login card, so
// layout/font values are local cqw/% tuned for the 800x891 portrait art rather
// than theme.layout's landscape coordinates.
const t = theme
const fontBase = { fontFamily: t.font.family, letterSpacing: t.font.letterSpacing }

const frameBox = {
  ...fontBase,
  color: t.colors.inputText,
  backgroundColor: t.colors.inputCorner,
  borderStyle: 'solid',
  borderWidth: '2.2cqw',
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
      <form
        onSubmit={handleSubmit}
        className="@container relative overflow-hidden aspect-[800/891] w-[min(460px,88vw,calc(80vh*0.898))]"
      >
        <img
          src={cardImg}
          alt=""
          className="pointer-events-none absolute inset-0 size-full select-none"
        />

        <h2
          style={{ ...fontBase, color: t.colors.label, fontSize: '7cqw', top: '18%' }}
          className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap"
        >
          Pick a username
        </h2>

        <label
          style={{ ...fontBase, color: t.colors.label, fontSize: '4.4cqw', left: '14%', top: '36%' }}
          className="absolute"
        >
          Username
        </label>
        <input
          type="text"
          aria-label="Username"
          autoComplete="username"
          value={username}
          onChange={e => setUsername(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleSubmit(e) }}
          autoFocus
          style={{
            ...frameBox,
            fontSize: '4cqw',
            left: '14%',
            top: '43%',
            width: '72%',
            height: '10.5%',
            paddingLeft: '3cqw',
            paddingRight: '3cqw',
          }}
          className="absolute"
        />

        <button
          type="submit"
          disabled={loading || !username.trim()}
          style={{
            ...frameBox,
            position: 'absolute',
            fontSize: '4.2cqw',
            left: '14%',
            top: '63%',
            padding: '1.6cqw 2.4cqw',
          }}
          className="cursor-pointer leading-none hover:brightness-110 disabled:opacity-50 disabled:cursor-default"
        >
          {loading ? '...' : 'Continue'}
        </button>

        {error && (
          <p style={{
            position: 'absolute',
            left: '14%',
            bottom: '6%',
            maxWidth: '72%',
            ...fontBase,
            fontSize: '2.8cqw',
            color: '#cc0000',
            margin: 0,
          }}>
            {error}
          </p>
        )}
      </form>
    </div>
  )
}
