import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../auth/useAuth'
import { Globe, User, Lock, EyeOff, Eye, ArrowRight, Network } from 'lucide-react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import BackgroundPreview from '../components/architecture/BackgroundPreview'
import ArchitectureModal from '../components/architecture/ArchitectureModal'

const Login = () => {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const { login } = useAuth()
  
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isArchOpen, setIsArchOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  useEffect(() => {
    document.documentElement.classList.add('dark')
  }, [])

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
    <div className="dark bg-navy-950 font-body text-slate-200 selection:bg-emerald-500/30 min-h-screen">
      {/* Top Navigation Bar */}
      <nav className="fixed top-0 left-0 w-full z-50 flex justify-between items-center px-8 py-8 bg-transparent">
        <div className="text-3xl font-headline italic font-bold text-white tracking-tight">{t('landing.lexAi')}</div>
        <div className="flex items-center gap-6">
          <button 
            onClick={toggleLanguage}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/20 bg-white/5 hover:bg-white/10 text-emerald-50 text-sm transition-all duration-300"
          >
            <Globe className="w-4 h-4" />
            <span className="font-medium tracking-wide">
              {i18n.language.startsWith('ar') ? 'AR' : 'EN'}
            </span>
          </button>
          
          <button 
            onClick={() => setIsArchOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 text-emerald-50/90 hover:text-amber-200 hover:border-amber-200/50 transition-all duration-300 backdrop-blur-md"
          >
            <Network className="w-4 h-4" />
            <span className="text-xs font-bold tracking-widest uppercase">{t('landing.systemArchitecture')}</span>
          </button>
        </div>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-2 min-h-screen">
        
        {/* Left Side - Branding & Architecture Preview */}
        <section className="relative hidden lg:flex flex-col justify-center px-20 xl:px-32 border-r border-white/5 bg-gradient-to-br from-navy-900 to-emerald-950 overflow-hidden">
          
          <BackgroundPreview />

          {/* Background Islamic Geometric Pattern (reduced opacity for arch preview) */}
          <div className="absolute inset-0 islamic-pattern opacity-[0.03] pointer-events-none mix-blend-overlay" />
          
          
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
            <h1 className="text-6xl lg:text-8xl font-headline italic text-white leading-tight font-bold">
              {t('landing.lexAi')}
            </h1>
            <p 
              className="text-xl lg:text-2xl text-emerald-100/80 font-light leading-relaxed max-w-md"
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
        <section className="flex flex-col items-center justify-center p-6 md:p-12 lg:p-24 bg-navy-900 relative z-10 w-full">
          <div className="w-full max-w-md space-y-10">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="bg-navy-800/40 backdrop-blur-xl p-12 rounded-[2.5rem] space-y-10 border border-white/5 shadow-[0_20px_50px_rgba(0,0,0,0.3)]"
            >
              <div className="space-y-3 text-center lg:text-left">
                <h2 className="text-5xl font-headline font-bold text-white">{t('auth.loginButton')}</h2>
                <p className="text-emerald-500/80 font-bold uppercase tracking-[0.2em] text-[10px]">{t('auth.legalIntelligence')}</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-4">
                  {/* Email Input */}
                  <div className="group">
                    <label className="block text-[10px] uppercase tracking-[0.3em] text-slate-400 font-bold mb-3" htmlFor="email">
                      {t('auth.institutionalEmail')}
                    </label>
                    <div className="relative">
                      <User className="absolute left-5 top-1/2 -translate-y-1/2 text-emerald-500/40 w-5 h-5 group-focus-within:text-emerald-500 transition-colors" />
                      <input
                        className="w-full bg-navy-950/50 border border-white/5 focus:border-emerald-500/50 focus:ring-4 focus:ring-emerald-500/10 rounded-2xl text-white py-4 pl-14 pr-5 transition-all duration-300 outline-none placeholder:text-slate-600"
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
                    <div className="flex justify-between items-center mb-3">
                      <label className="block text-[10px] uppercase tracking-[0.3em] text-slate-400 font-bold" htmlFor="password">
                        {t('auth.accessKey')}
                      </label>
                      <a className="text-[10px] uppercase tracking-[0.2em] text-emerald-500 hover:text-emerald-400 transition-colors font-bold" href="#">
                        {t('auth.forgot')}
                      </a>
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-emerald-500/40 w-5 h-5 group-focus-within:text-emerald-500 transition-colors" />
                      <input
                        className="w-full bg-navy-950/50 border border-white/5 focus:border-emerald-500/50 focus:ring-4 focus:ring-emerald-500/10 rounded-2xl text-white py-4 pl-14 pr-14 transition-all duration-300 outline-none placeholder:text-slate-600"
                        id="password"
                        placeholder="••••••••••••"
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                      />
                      <button 
                         className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors" 
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
                  className="w-full py-5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-sm uppercase tracking-[0.3em] rounded-2xl shadow-xl shadow-emerald-900/40 active:scale-[0.98] disabled:opacity-70 disabled:active:scale-100 transition-all duration-500 flex items-center justify-center gap-3" 
                  type="submit"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <div className="flex items-center gap-3">
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>{t('auth.authenticating')}</span>
                    </div>
                  ) : (
                    <>
                      <span>{t('auth.login')}</span>
                      <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>
              </form>

              {/* Demo Credentials Section (from original logic) */}
              <div className="pt-8 mt-8 border-t border-outline-variant/20">
                <span className="block text-[9px] uppercase tracking-[0.3em] text-on-surface-variant mb-4 text-center">
                  {t('auth.envAccessCredentials')}
                </span>
                <div className="grid grid-cols-1 gap-2.5">
                  {[
                    { role: 'judge', pass: 'judge', color: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' },
                    { role: 'clerk', pass: 'clerk', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
                    { role: 'admin', pass: 'admin', color: 'bg-amber-500/10 text-amber-400 border-amber-500/20' }
                  ].map(({ role, pass, color }) => (
                    <div key={role} className={cn("flex flex-row items-center justify-between p-3 px-5 rounded-md border text-xs", color)}>
                      <span className="font-bold uppercase tracking-widest">{role}</span>
                      <span className="font-mono tracking-widest opacity-80">{pass}</span>
                    </div>
                  ))}
                </div>
              </div>

            </motion.div>

            {/* Sign Up Link */}
            {/* <div className="text-center">
              <p className="text-sm text-on-surface-variant font-light">
                {t('auth.newToLexAi')} 
                <a className="text-tertiary font-medium hover:underline ml-1" href="#">{t('auth.establishAccount')}</a>
              </p>
            </div> */}
          </div>
        </section>
      </div>
      
      {/* Architecture Explorer Modal */}
      <ArchitectureModal isOpen={isArchOpen} onClose={() => setIsArchOpen(false)} />
    
      {/* Footer */}
      <footer className="fixed bottom-0 left-0 w-full z-50 flex flex-col md:flex-row justify-center items-center px-8 py-4 backdrop-blur-md bg-[#0a0f1a]/90 border-t border-white/5">
        <p className="text-on-surface-variant/50 font-inter text-[10px] uppercase tracking-[0.1em]">© 2026 Motivity Labs.</p>
      </footer>
    </div>
  )
}

export default Login