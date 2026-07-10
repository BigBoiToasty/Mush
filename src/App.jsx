import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'
import LoginCard from './LoginCard'
import UsernamePrompt from './UsernamePrompt'
import BinderPage from './BinderPage'
import { cacheProfile, readProfile } from './offlineCache'

export default function App() {
  const [session, setSession] = useState(undefined) // undefined = still loading
  const [profile, setProfile] = useState(undefined) // undefined = fetching, null = no profile

  async function fetchProfile(userId) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('username')
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
        .select('username')
        .eq('user_id', userId)
        .maybeSingle()
      setProfile(created ?? null)
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
      setSession(null)
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

  if (session === undefined) return null // brief loading gap; no flash

  if (!session) return <LoginCard />

  if (profile === undefined) return null
  if (profile === null) return (
    <UsernamePrompt
      session={session}
      onUsernameSet={() => fetchProfile(session.user.id)}
    />
  )

  return <BinderPage profile={profile} userId={session.user.id} />
}
