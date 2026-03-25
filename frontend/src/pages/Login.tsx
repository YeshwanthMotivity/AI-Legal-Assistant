import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../auth/useAuth'
import { Globe, HelpCircle, AtSign, Lock, EyeOff, Eye, ArrowRight } from 'lucide-react'
import { motion } from 'framer-motion'

const Login = () => {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const { login } = useAuth()
  
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const toggleLanguage = () => {
    const nextLang = i18n.language.startsWith('ar') ? 'en' : 'ar'
    i18n.changeLanguage(nextLang)
  }

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
    <div className="bg-surface font-body text-on-surface selection:bg-tertiary/30 min-h-screen">
      {/* Top Navigation Bar */}
      <nav className="fixed top-0 left-0 w-full z-50 flex justify-between items-center px-8 py-6 bg-transparent">
        <div className="text-2xl font-headline italic text-emerald-50">LexAI UAE</div>
        <div className="flex items-center gap-6">
          <button 
            onClick={toggleLanguage}
            className="text-emerald-50/70 hover:text-amber-200 transition-colors duration-300 flex items-center gap-2"
          >
            <Globe className="w-5 h-5" />
            <span className="font-label text-xs uppercase tracking-widest">
              {i18n.language.startsWith('ar') ? 'AR' : 'EN'}
            </span>
          </button>
          <button className="text-emerald-50/70 hover:text-amber-200 transition-colors duration-300">
            <HelpCircle className="w-6 h-6" />
          </button>
        </div>
      </nav>

      <main className="min-h-screen flex flex-col md:flex-row">
        {/* Left Section: Branding & Visuals */}
        <section className="relative w-full md:w-1/2 min-h-[409px] md:min-h-screen flex flex-col justify-center px-12 lg:px-24 overflow-hidden bg-gradient-to-br from-[#0B0F19] to-[#0F3D2E]">
          <div className="absolute inset-0 islamic-pattern pointer-events-none"></div>
          
          {/* Abstract Neural Network Decoration */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[150%] h-[150%] opacity-10 pointer-events-none">
            <img 
              alt="abstract visualization of interconnected neural nodes and digital patterns" 
              className="w-full h-full object-cover mix-blend-overlay" 
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuBT3vKJ8OBhoRnf-KdUdYh9aCq3LvX9pyOP2GJup22HsBijNycQEr5xZ30bkKWb5-7AB0e4IOoYeSLnj7of4ckx0j9nG3zu862tkaoUAn3tuZEKsyqBoZ9_J2FOr6aoJCCnOScec8pNWXW2H-omeVIXjQACfHmYMOh61KXUhnD7ss_oQiU-KPMhwZwmf2ONN9p9WVJ6n5zzxY9DXvXr0NDoDS56Z3SxViY3Wsw9D3eLDj_6g9l_9LqQWkn5XetXrPYDgrlJ8ffsexU"
            />
          </div>
          
          <div className="relative z-10 space-y-6 max-w-lg">
            <div className="inline-flex items-center px-3 py-1 rounded-full border border-primary/20 bg-primary-container/30 text-primary text-[10px] uppercase tracking-[0.2em] font-medium">
              {t('landing.suite')}
            </div>
            <h1 className="text-5xl lg:text-7xl font-headline italic text-emerald-50 leading-tight">
              LexAI UAE
            </h1>
            <p 
              className="text-lg lg:text-xl text-on-primary-container font-light leading-relaxed"
              dangerouslySetInnerHTML={{ __html: t('landing.insights') }}
            />
            <div className="pt-8 flex gap-8 items-center border-t border-white/5">
              <div className="flex flex-col">
                <span className="text-tertiary font-headline text-2xl">4.9/5</span>
                <span className="text-emerald-50/50 text-[10px] uppercase tracking-wider">{t('landing.accuracy')}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-tertiary font-headline text-2xl">200k+</span>
                <span className="text-emerald-50/50 text-[10px] uppercase tracking-wider">{t('landing.statutes')}</span>
              </div>
            </div>
          </div>
        </section>

        {/* Right Section: Login Form */}
        <section className="w-full md:w-1/2 min-h-screen flex items-center justify-center p-6 md:p-12 lg:p-24 bg-surface">
          <div className="w-full max-w-md space-y-10">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="glass-card p-10 rounded-xl space-y-8 shadow-2xl"
            >
              <div className="space-y-2">
                <h2 className="text-4xl font-headline text-on-surface">Sign In</h2>
                <p className="text-on-surface-variant font-light text-sm">{t('auth.legalIntelligence')}</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-4">
                  {/* Email Input */}
                  <div className="group">
                    <label className="block text-[10px] uppercase tracking-widest text-on-surface-variant font-medium mb-2" htmlFor="email">
                      Institutional Email
                    </label>
                    <div className="relative">
                      <AtSign className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/50 w-5 h-5" />
                      <input 
                        className="w-full bg-surface-container-low border-b-2 border-outline-variant/20 focus:border-tertiary focus:ring-0 text-on-surface py-4 pl-12 pr-4 transition-all duration-300 outline-none gold-glow" 
                        id="email" 
                        placeholder="justice.smith@firm.ae" 
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  {/* Password Input */}
                  <div className="group">
                    <div className="flex justify-between items-center mb-2">
                      <label className="block text-[10px] uppercase tracking-widest text-on-surface-variant font-medium" htmlFor="password">
                        {t('auth.accessKey')}
                      </label>
                      <a className="text-[10px] uppercase tracking-widest text-tertiary hover:text-tertiary-fixed transition-colors" href="#">
                        {t('auth.forgot')}
                      </a>
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/50 w-5 h-5" />
                      <input 
                        className="w-full bg-surface-container-low border-b-2 border-outline-variant/20 focus:border-tertiary focus:ring-0 text-on-surface py-4 pl-12 pr-12 transition-all duration-300 outline-none gold-glow" 
                        id="password" 
                        placeholder="••••••••••••" 
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                      />
                      <button 
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant/50 hover:text-on-surface" 
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>
                </div>

                {error && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="p-3 rounded bg-error-container/20 border border-error-container text-error text-[11px] font-bold uppercase tracking-widest text-center"
                  >
                    {error}
                  </motion.div>
                )}

                {/* Login Button */}
                <button 
                  className="w-full py-4 bg-gradient-to-r from-tertiary to-tertiary-container text-on-tertiary-fixed font-bold text-sm uppercase tracking-[0.2em] rounded-md shadow-lg shadow-tertiary/10 active:scale-[0.98] disabled:opacity-70 disabled:active:scale-100 transition-all duration-300 flex items-center justify-center gap-2" 
                  type="submit"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <div className="flex items-center gap-3">
                      <div className="w-4 h-4 border-2 border-on-tertiary-fixed/30 border-t-on-tertiary-fixed rounded-full animate-spin" />
                      <span>Authenticating...</span>
                    </div>
                  ) : (
                    <>
                      <span>Execute Access</span>
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </button>
              </form>

              {/* Secure Identity Gateways (Decorative) */}
              <div className="pt-6 mt-6 border-t border-outline-variant/20">
                <span className="block text-[9px] uppercase tracking-[0.3em] text-on-surface-variant mb-4 text-center">
                  Secure Identity Gateways
                </span>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    className="flex items-center justify-center gap-2 py-3 px-4 rounded-md border border-outline-variant/20 bg-surface-container-low hover:bg-surface-container hover:border-outline-variant/40 transition-all duration-200"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    <span className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">Google SSO</span>
                  </button>
                  <button
                    type="button"
                    className="flex items-center justify-center gap-2 py-3 px-4 rounded-md border border-outline-variant/20 bg-surface-container-low hover:bg-surface-container hover:border-outline-variant/40 transition-all duration-200"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                      <path fill="#00A4EF" d="M11.4 24H0V12.6h11.4V24z"/>
                      <path fill="#FFB900" d="M11.4 11.4H0V0h11.4v11.4z"/>
                      <path fill="#F25022" d="M24 11.4H12.6V0H24v11.4z"/>
                      <path fill="#7FBA00" d="M24 24H12.6V12.6H24V24z"/>
                    </svg>
                    <span className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">Azure AD</span>
                  </button>
                </div>
              </div>

            </motion.div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="fixed bottom-0 left-0 w-full z-50 flex flex-col md:flex-row justify-between items-center px-8 py-4 backdrop-blur-md bg-surface-container-lowest/80 border-t border-white/5">
        <div className="flex gap-6">
          <a href="#" className="text-on-surface-variant/50 hover:text-on-surface-variant text-[10px] uppercase tracking-[0.1em] transition-colors">Privacy Policy</a>
          <a href="#" className="text-on-surface-variant/50 hover:text-on-surface-variant text-[10px] uppercase tracking-[0.1em] transition-colors">Terms of Service</a>
          <a href="#" className="text-on-surface-variant/50 hover:text-on-surface-variant text-[10px] uppercase tracking-[0.1em] transition-colors">Regulatory Compliance</a>
        </div>
        <p className="text-on-surface-variant/50 font-inter text-[10px] uppercase tracking-[0.1em]">© 2024 LexAI UAE. High-End Legal Intelligence.</p>
      </footer>
    </div>
  )
}

export default Login
