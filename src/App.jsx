import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'
import LoginCard from './LoginCard'
import UsernamePrompt from './UsernamePrompt'
import BinderPage from './BinderPage'
import { cacheProfile, readProfile } from './offlineCache'
import { LoadingScreen, initButtonSkinFromProfile } from './ui'

// supabase-js throws instead of returning an error when getSession() tries a
// background token refresh and the network is down. Read its own persisted
// session straight from storage as a fallback so a stale-but-offline session
// still lets the app render instead of bouncing to the login screen.
function readStoredSession() {
  const key = Object.keys(localStorage).find((k) => k.startsWith('sb-') && k.endsWith('-auth-token'))
  if (!key) return null
  try {
    return JSON.parse(localStorage.getItem(key))
  } catch {
    return null
  }
}

export default function App() {
  const [session, setSession] = useState(undefined) // undefined = still loading
  const [profile, setProfile] = useState(undefined) // undefined = fetching, null = no profile

  async function fetchProfile(userId) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('username, button_skin, button_border, button_fill, button_text')
        .eq('user_id', userId)
        .maybeSingle()

      if (error) {
        console.error('Failed to fetch profile:', error)
        const cached = readProfile(userId)
        if (cached) setProfile(cached) // offline: render from last-known profile
        return
      }

      if (data) {
        cacheProfile(userId, data)
        setProfile(data)
        initButtonSkinFromProfile(data)
        return
      }

      // No profile row yet — check for a pending username from signup metadata
      const { data: { user } } = await supabase.auth.getUser()
      const pendingUsername = user?.user_metadata?.username
      if (!pendingUsername) {
        setProfile(null) // Google OAuth user with no profile → show UsernamePrompt
        return
      }

      // Insert profile from signup metadata (resolves the signUp → onAuthStateChange race)
      const { error: insertError } = await supabase
        .from('profiles')
        .insert({ user_id: userId, username: pendingUsername })
      if (insertError && insertError.code !== '23505') {
        console.error('Failed to create profile:', insertError)
        setProfile(null)
        return
      }
      // Fetch the now-existing profile (just inserted, or already existed via 23505 race)
      const { data: created } = await supabase
        .from('profiles')
        .select('username, button_skin, button_border, button_fill, button_text')
        .eq('user_id', userId)
        .maybeSingle()
      setProfile(created ?? null)
      if (created) initButtonSkinFromProfile(created)
    } catch (err) {
      console.error('Unexpected error in fetchProfile:', err)
    }
  }

  useEffect(() => {
    // Supabase re-fires onAuthStateChange (e.g. TOKEN_REFRESHED) whenever the tab
    // regains focus even though the user never logged out. Only reset session/profile
    // when the signed-in user actually changes, so returning to the tab doesn't
    // remount BinderPage and wipe its in-progress state (current page, open binder).
    let lastUserId

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session) {
        lastUserId = session.user.id
        setProfile(undefined)
        fetchProfile(session.user.id)
      }
    }).catch(err => {
      console.error('Failed to fetch session:', err)
      // Likely a failed background refresh while offline, not an actual
      // sign-out -- fall back to the last persisted session rather than
      // logging the user out just because they lost the network.
      const stored = readStoredSession()
      setSession(stored)
      if (stored) {
        lastUserId = stored.user.id
        setProfile(undefined)
        fetchProfile(stored.user.id)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session) {
        if (session.user.id === lastUserId) return
        lastUserId = session.user.id
        setProfile(undefined)
        fetchProfile(session.user.id)
      } else {
        lastUserId = undefined
        setProfile(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  if (session === undefined) return <LoadingScreen />

  if (!session) return <LoginCard />

  if (profile === undefined) return <LoadingScreen />
  if (profile === null) return (
    <UsernamePrompt
      session={session}
      onUsernameSet={() => fetchProfile(session.user.id)}
    />
  )

  return <BinderPage userId={session.user.id} />
}
