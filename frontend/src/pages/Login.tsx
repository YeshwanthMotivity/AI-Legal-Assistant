import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../auth/useAuth'
import ThemeToggle from '../components/layout/ThemeToggle'

const Login = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { login } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      await login(username, password)
      navigate('/')
    } catch (err) {
      setError(t('auth.loginError'))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      minHeight: '100vh',
      background: 'var(--bg-base)',
      padding: '1.5rem'
    }}>
      <div className="card" style={{
        width: '100%',
        maxWidth: '440px',
        padding: '2.5rem',
        boxShadow: 'var(--shadow-lg)',
        background: 'var(--bg-card)',
        textAlign: 'center'
      }}>
        <div style={{ 
          marginBottom: '2rem',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '1rem'
        }}>
          <div style={{ 
            width: '64px', 
            height: '64px', 
            background: 'linear-gradient(135deg, var(--emerald-600), var(--emerald-400))',
            borderRadius: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 8px 16px rgba(5, 150, 105, 0.2)'
          }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="M7 21h10"/><path d="M12 3v18"/><path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2"/></svg>
          </div>
          <h1 className="judicial-title" style={{ fontSize: '1.75rem' }}>
            {t('common.appName')}
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9375rem' }}>
            UAE Labor Law Analysis Platform
          </p>
        </div>
        
        <form onSubmit={handleSubmit} style={{ textAlign: 'left' }}>
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, fontSize: '0.875rem' }}>
              Username or Email
            </label>
            <input
              type="text"
              placeholder="e.g. judge"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, fontSize: '0.875rem' }}>
              {t('auth.password')}
            </label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {error && (
            <div className="badge-red" style={{ 
              padding: '0.75rem', 
              borderRadius: 'var(--radius-md)',
              marginBottom: '1.5rem',
              width: '100%',
              justifyContent: 'center'
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary"
            disabled={isLoading}
            style={{ width: '100%', padding: '0.85rem' }}
          >
            {isLoading ? 'Authenticating...' : t('auth.loginButton')}
          </button>
        </form>

        <div style={{ 
          marginTop: '2.5rem', 
          padding: '1.25rem',
          background: 'rgba(5, 150, 105, 0.05)',
          borderRadius: 'var(--radius-md)',
          fontSize: '0.8125rem', 
          color: 'var(--text-secondary)',
          textAlign: 'left'
        }}>
          <p style={{ fontWeight: 600, marginBottom: '0.5rem', color: 'var(--emerald-700)' }}>Demo Access:</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
            <span><strong>judge</strong> / judge</span>
            <span><strong>admin</strong> / admin</span>
            <span><strong>clerk</strong> / clerk</span>
          </div>
        </div>
      </div>
      <div style={{ position: 'fixed', bottom: '1.5rem', right: '1.5rem' }}>
        <ThemeToggle />
      </div>
    </div>
  )
}

export default Login

