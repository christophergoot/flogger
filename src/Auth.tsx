import { useState } from 'react'
import { useGoogleLogin, type UseGoogleLoginOptionsImplicitFlow } from '@react-oauth/google'

const STORAGE_KEY = 'activityLog_spreadsheetId'
const SESSION_KEY = 'activityLog_session'

export interface GoogleUser {
  email: string
  accessToken: string
  spreadsheetId: string
}

interface PersistedSession {
  email: string
  accessToken: string
  spreadsheetId: string
  expiresAt: number
}

export function loadPersistedSession(): GoogleUser | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    if (!raw) return null
    const session = JSON.parse(raw) as PersistedSession
    if (Date.now() >= session.expiresAt) {
      localStorage.removeItem(SESSION_KEY)
      return null
    }
    return { email: session.email, accessToken: session.accessToken, spreadsheetId: session.spreadsheetId }
  } catch {
    return null
  }
}

export function clearPersistedSession() {
  localStorage.removeItem(SESSION_KEY)
}

interface AuthProps {
  onSignIn: (user: GoogleUser) => void
}

const SCOPES = [
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive.file',
].join(' ')

function decodeJwtPayload(token: string): { email?: string } {
  try {
    const base64 = token.split('.')[1]
    if (!base64) return {}
    const json = atob(base64.replace(/-/g, '+').replace(/_/g, '/'))
    return JSON.parse(json) as { email?: string }
  } catch {
    return {}
  }
}

async function fetchEmailFromUserinfo(accessToken: string): Promise<string> {
  const res = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) throw new Error('Failed to fetch user info')
  const data = (await res.json()) as { email?: string }
  return data.email ?? ''
}

export function Auth({ onSignIn }: AuthProps) {
  const [error, setError] = useState<string | null>(null)

  const login = useGoogleLogin({
    scope: SCOPES,
    ux_mode: 'redirect',
    onSuccess: async (credential) => {
      setError(null)
      try {
        const cred = credential as { access_token?: string; expires_in?: number; id_token?: string }
        const access_token = cred.access_token
        if (!access_token) {
          setError('No access token received from Google.')
          return
        }
        const payload = decodeJwtPayload(cred.id_token ?? '')
        let email = payload.email ?? ''
        if (!email) {
          email = await fetchEmailFromUserinfo(access_token)
        }
        if (!email) {
          setError('Could not get email from Google.')
          return
        }

        let spreadsheetId = localStorage.getItem(`${STORAGE_KEY}_${email}`)
        if (!spreadsheetId) {
          const { createSpreadsheet } = await import('./lib/googleApi')
          spreadsheetId = await createSpreadsheet(access_token)
          localStorage.setItem(`${STORAGE_KEY}_${email}`, spreadsheetId)
        }

        const expiresAt = Date.now() + (cred.expires_in ?? 3600) * 1000
        localStorage.setItem(SESSION_KEY, JSON.stringify({ email, accessToken: access_token, spreadsheetId, expiresAt }))

        onSignIn({ email, accessToken: access_token, spreadsheetId })
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Sign-in failed.'
        setError(message)
      }
    },
    onError: (err) => {
      setError((err as { error_description?: string })?.error_description ?? 'Google sign-in failed.')
    },
    onNonOAuthError: (err) => {
      if (err?.type === 'popup_closed') {
        setError('Sign-in was cancelled or the popup was closed.')
      } else {
        setError(err?.type ?? 'Sign-in failed.')
      }
    },
  } as UseGoogleLoginOptionsImplicitFlow)

  return (
    <div className="auth">
      <h1 className="auth-title">Flogger</h1>
      <p className="auth-subtitle">Accountability hurts</p>
      <p className="auth-subtitle auth-subtitle--muted">Sign in with Google to store your activities in your own sheet</p>
      {error && (
        <p className="auth-error" role="alert">
          {error}
        </p>
      )}
      <button type="button" className="auth-google" onClick={() => login()}>
        Sign in with Google
      </button>
    </div>
  )
}

export { STORAGE_KEY }
