import { useState } from 'react'
import cardImg from './assets/login-card.png'
import pageFlipSprite from './assets/page-flip.png'
import sableyeShow from './assets/sableye-show.webp'
import sableyeHide from './assets/sableye-hide.webp'
import googleG from './assets/google-g.png'
import { theme } from './theme'
import { supabase } from './supabaseClient'
import { toAuthEmail } from './auth'
import { TIDE_BG, FRAME } from './pixelArt'

// Notebook login card. Scales to fit the viewport while keeping its 645:400
// ratio; inner elements use percentages + cqw so the whole thing scales as one.
// ALL tweakable values live in theme.js — edit there.
const t = theme
const fontBase = { fontFamily: t.font.family, letterSpacing: t.font.letterSpacing }

// Shared pixel-frame look for inputs and buttons.
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

const pixelInput = {
  ...frameBox,
  fontSize: t.font.input,
  paddingLeft: t.layout.inputPadX,
  paddingRight: t.layout.inputPadX,
  width: t.layout.fieldW,
  height: t.layout.fieldH,
}

const labelStyle = (top) => ({ ...fontBase, color: t.colors.label, fontSize: t.font.label, left: t.layout.fieldX, top })

const btnStyle = (pos) => ({
  ...frameBox,
  position: 'absolute',
  fontSize: pos.font || t.font.button,
  paddingLeft:   pos.pad || t.layout.buttonPadX,
  paddingRight:  pos.pad || t.layout.buttonPadX,
  paddingTop:    pos.pad || t.layout.buttonPadY,
  paddingBottom: pos.pad || t.layout.buttonPadY,
  left:  pos.right ? undefined : pos.left,
  right: pos.right,
  top:   pos.top,
  ...(pos.matchInput && {
    height: t.layout.fieldH,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  }),
})

const btnCls = 'absolute cursor-pointer leading-none hover:brightness-110'

// Sableye show/hide toggle, positioned inside the right edge of the password
// field whose top is given.
function PwToggle({ shown, onToggle, fieldTop, label }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={shown ? `Hide ${label}` : `Show ${label}`}
      aria-pressed={shown}
      title={shown ? `Hide ${label}` : `Show ${label}`}
      style={{
        position: 'absolute',
        left: `calc(${t.layout.fieldX} + ${t.layout.fieldW} - 6%)`,
        top: `calc(${fieldTop} + ${t.layout.fieldH} / 2)`,
        transform: 'translateY(-50%)',
        background: 'transparent',
        border: 'none',
        cursor: 'pointer',
        padding: 0,
        lineHeight: 0,
      }}
    >
      <img
        src={shown ? sableyeShow : sableyeHide}
        alt=""
        style={{ width: t.layout.pwToggleSize, height: 'auto', display: 'block', imageRendering: 'pixelated' }}
      />
    </button>
  )
}

// One card face. Same art + fields for both modes; only the title, button labels,
// and signup-only rows (Confirm Password, Create Account) differ.
// interactive=false is used for the two stacked faces mid-flip (no input then).
function CardFace({
  mode, showPw, onTogglePw, showConfirmPw, onToggleConfirmPw, onFlip, interactive,
  username = '', password = '', confirmPw = '',
  onUsernameChange = () => {}, onPasswordChange = () => {}, onConfirmPwChange = () => {},
  onLogin = () => {}, onSignup = () => {}, onGoogleLogin = () => {},
  authError = null, loading = false,
}) {
  const copy = t.copy[mode]
  const isSignup = mode === 'signup'
  const [curl, setCurl] = useState('idle') // 'idle' | 'in' | 'out'

  return (
    <div className="absolute inset-0" style={{ pointerEvents: interactive ? 'auto' : 'none' }}>
      <img
        src={cardImg}
        alt=""
        className="pointer-events-none absolute inset-0 size-full select-none"
      />
      {curl !== 'idle' && (
        <div
          key={curl}
          className={`pointer-events-none absolute inset-0 ${curl === 'in' ? 'curl-in' : 'curl-out'}`}
          style={{
            backgroundImage: `url(${pageFlipSprite})`,
            backgroundSize: '600% 100%',
            backgroundRepeat: 'no-repeat',
            outline: 'none',
            transform: 'translateX(-0.26px)',
          }}
          onAnimationEnd={() => { if (curl === 'out') setCurl('idle') }}
        />
      )}

      <h2
        style={{ ...fontBase, color: t.colors.label, fontSize: t.font.title, top: t.layout.titleTop }}
        className="absolute left-1/2 -translate-x-1/2"
      >
        {copy.title}
      </h2>

      {/* Username row */}
      <label style={labelStyle(t.layout.usernameLabelTop)} className="absolute">Username</label>
      <input
        type="text"
        aria-label="Username"
        autoComplete="username"
        value={username}
        onChange={e => onUsernameChange(e.target.value)}
        onKeyDown={e => { if (!isSignup && e.key === 'Enter') onLogin(username, password) }}
        style={{ ...pixelInput, left: t.layout.fieldX, top: t.layout.usernameTop }}
        className="absolute"
      />
      {/* Google sign-in — login only, right of the username field */}
      {!isSignup && (
        <button type="button" onClick={onGoogleLogin} disabled={loading} style={btnStyle(t.layout.buttons.google)} className={btnCls}>
          <img
            src={googleG}
            alt="Google"
            style={{ height: t.layout.googleIconSize, width: 'auto', display: 'block', imageRendering: 'pixelated' }}
          />
        </button>
      )}

      {/* Password row */}
      <label style={labelStyle(t.layout.passwordLabelTop)} className="absolute">Password</label>
      <input
        type={showPw ? 'text' : 'password'}
        aria-label="Password"
        autoComplete={isSignup ? 'new-password' : 'current-password'}
        value={password}
        onChange={e => onPasswordChange(e.target.value)}
        onKeyDown={e => { if (!isSignup && e.key === 'Enter') onLogin(username, password) }}
        style={{ ...pixelInput, left: t.layout.fieldX, top: t.layout.passwordTop, paddingRight: '8%' }}
        className="absolute"
      />
      <PwToggle shown={showPw} onToggle={onTogglePw} fieldTop={t.layout.passwordTop} label="password" />
      {/* Flip button: "Sign Up →" in login, "← Login" in signup — always right of the password field */}
      <button
        type="button"
        onClick={onFlip}
        // ponytail: curl-on-hover disabled, unfinished -- re-add onMouseEnter/onMouseLeave (setCurl 'in'/'out') to resume
        style={btnStyle(t.layout.buttons.flip)}
        className={btnCls}
      >
        {copy.alt}
      </button>

      {/* Signup-only: confirm password row + Create Account */}
      {isSignup && (
        <>
          <label style={labelStyle(t.layout.confirmPwLabelTop)} className="absolute">Confirm Password</label>
          <input
            type={showConfirmPw ? 'text' : 'password'}
            aria-label="Confirm Password"
            autoComplete="new-password"
            value={confirmPw}
            onChange={e => onConfirmPwChange(e.target.value)}
            style={{ ...pixelInput, left: t.layout.fieldX, top: t.layout.confirmPwTop, paddingRight: '8%' }}
            className="absolute"
          />
          <PwToggle shown={showConfirmPw} onToggle={onToggleConfirmPw} fieldTop={t.layout.confirmPwTop} label="confirm password" />
          <button
            type="button"
            disabled={loading}
            onClick={() => onSignup(username, password, confirmPw)}
            style={btnStyle(t.layout.buttons.createAcct)}
            className={btnCls}
          >
            {loading ? '...' : copy.primary}
          </button>
        </>
      )}

      {/* Login-only: submit. No "Forgot Password" -- accounts use synthetic
          @mush.app emails, so there's no address to send a reset to. */}
      {!isSignup && (
        <button
          type="button"
          disabled={loading}
          onClick={() => onLogin(username, password)}
          style={btnStyle(t.layout.buttons.login)}
          className={btnCls}
        >
          {loading ? '...' : copy.primary}
        </button>
      )}
      {authError && (
        <p style={{
          position: 'absolute',
          left: t.layout.fieldX,
          bottom: '4%',
          ...fontBase,
          fontSize: '1.8cqw',
          color: '#cc0000',
          margin: 0,
        }}>
          {authError}
        </p>
      )}
    </div>
  )
}


export default function LoginCard() {
  const [showPw, setShowPw] = useState(false)
  const [showConfirmPw, setShowConfirmPw] = useState(false)
  const [mode, setMode] = useState('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [authError, setAuthError] = useState(null)
  const [loading, setLoading] = useState(false)

  async function handleLogin(u, p) {
    setAuthError(null)
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({
      email: toAuthEmail(u),
      password: p,
    })
    setLoading(false)
    if (error) setAuthError('Incorrect username or password')
  }

  async function handleSignup(u, p, cp) {
    setAuthError(null)
    if (p !== cp) { setAuthError('Passwords do not match'); return }
    setLoading(true)
    const { data: existing } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', u.trim().toLowerCase())
      .maybeSingle()
    if (existing) {
      setLoading(false)
      setAuthError('That username is already taken')
      return
    }
    const { error } = await supabase.auth.signUp({
      email: toAuthEmail(u),
      password: p,
      options: { data: { username: u.trim().toLowerCase() } },
    })
    setLoading(false)
    if (error) {
      setAuthError(error.message)
      return
    }
    // Profile creation is handled by App.jsx's fetchProfile via user metadata
  }

  async function handleGoogleLogin() {
    setAuthError(null)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin, queryParams: { prompt: 'select_account' } },
    })
    if (error) setAuthError(error.message)
  }

  return (
    <div
      className="flex min-h-screen items-center justify-center"
      style={{ background: TIDE_BG, backgroundSize: 'cover', imageRendering: 'pixelated' }}
    >
      <div className="flex flex-col items-center gap-[1.5vw] w-[min(900px,92vw,calc(92vh*1.6125))]">
        <h1
          style={{ ...fontBase, color: t.colors.inputCorner, fontSize: 'clamp(0.7rem, 1.8vw, 1.1rem)' }}
          className="text-center"
        >
          Mush — Online Pokémon Card Binder
        </h1>
        <div className="@container relative overflow-hidden aspect-[645/400] w-full">
        <CardFace
          mode={mode}
          showPw={showPw}
          interactive
          username={username}
          password={password}
          confirmPw={confirmPw}
          onUsernameChange={setUsername}
          onPasswordChange={setPassword}
          onConfirmPwChange={setConfirmPw}
          onLogin={handleLogin}
          onSignup={handleSignup}
          onGoogleLogin={handleGoogleLogin}
          authError={authError}
          loading={loading}
          onTogglePw={() => setShowPw((v) => !v)}
          showConfirmPw={showConfirmPw}
          onToggleConfirmPw={() => setShowConfirmPw((v) => !v)}
          onFlip={() => setMode(mode === 'login' ? 'signup' : 'login')}
        />
        </div>
      </div>
    </div>
  )
}
