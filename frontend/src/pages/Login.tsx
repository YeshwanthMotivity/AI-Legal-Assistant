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
    // Respect global theme (Light Ivory or Dark Midnight)
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
    <div className="bg-[#F9F8F2] font-body selection:bg-emerald-800/10 min-h-screen">
      {/* Top Navigation Bar */}
      <nav className="fixed top-0 left-0 w-full z-50 flex justify-between items-center px-8 py-8 bg-transparent">
        <div className="text-3xl font-headline italic font-bold text-gradient-gold tracking-tight">{t('landing.lexAi')}</div>
        <div className="flex items-center gap-6">
          <button 
            onClick={toggleLanguage}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-primary/20 bg-white/50 hover:bg-white text-primary text-sm transition-all duration-300 shadow-sm"
          >
            <Globe className="w-4 h-4" />
            <span className="font-bold tracking-wide">
              {i18n.language.startsWith('ar') ? 'AR' : 'EN'}
            </span>
          </button>
          
          <button 
            onClick={() => setIsArchOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-full border border-primary/10 bg-primary/5 hover:bg-primary/10 text-primary hover:text-accent hover:border-accent/50 transition-all duration-300 backdrop-blur-md shadow-sm"
          >
            <Network className="w-4 h-4" />
            <span className="text-[10px] font-black tracking-widest uppercase">{t('landing.systemArchitecture')}</span>
          </button>
        </div>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-2 min-h-screen">
        
        {/* Left Side - Branding & Architecture Preview */}
        <section className="relative hidden lg:flex flex-col justify-center px-20 xl:px-32 bg-gradient-to-br from-[#062c1d] to-[#01140d] overflow-hidden border-0 outline-0">
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
            <div className="inline-flex items-center px-3 py-1 rounded-full border border-accent/20 bg-accent/10 text-accent text-[10px] uppercase tracking-[0.2em] font-bold">
              {t('landing.suite')}
            </div>
            <h1 className="text-6xl lg:text-8xl font-headline italic text-gradient-gold leading-tight font-bold">
              {t('landing.lexAi')}
            </h1>
            <p 
              className="text-xl lg:text-2xl text-emerald-100/80 font-light leading-relaxed max-w-md"
              dangerouslySetInnerHTML={{ __html: t('landing.insights') }}
            />
            <div className="pt-8 flex gap-8 items-center border-t border-white/10">
              <div className="flex flex-col">
                <span className="text-accent font-headline text-2xl font-bold">4.9/5</span>
                <span className="text-emerald-100/50 text-[10px] uppercase tracking-wider font-bold">{t('landing.accuracy')}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-accent font-headline text-2xl font-bold">200k+</span>
                <span className="text-emerald-100/50 text-[10px] uppercase tracking-wider font-bold">{t('landing.statutes')}</span>
              </div>
            </div>
          </div>
          
          {/* Organic 'Imperial Curve' Divider */}
          <div className="portal-divider-curve" />
          <div className="portal-divider-glow" />
        </section>

        {/* Right Section: Login Form */}
        <section className="flex flex-col items-center justify-center p-6 md:p-12 lg:p-24 bg-[#F9F8F2] relative z-10 w-full overflow-hidden border-l-0">
          {/* Subtle noise/texture for the ivory side */}
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/felt.png')]" />
          <div className="w-full max-w-md space-y-10">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={error ? { 
                x: [0, -10, 10, -10, 10, 0],
                transition: { duration: 0.4 }
              } : { opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="bg-bg-surface/40 backdrop-blur-xl p-14 rounded-[3rem] space-y-14 border border-white/10 shadow-2xl relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-text-accent/5 to-transparent pointer-events-none" />
              
              <div className="space-y-4 text-center lg:text-left relative z-10">
                <h2 className="text-6xl font-headline font-bold text-[#003426] tracking-tight">{t('auth.loginButton')}</h2>
                <p className="text-[#D4AF37] font-black uppercase tracking-[0.4em] text-[10px] opacity-80">{t('auth.legalIntelligence')}</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-4">
                  {/* Email Input */}
                  <div className="group">
                    <label className="block text-[10px] uppercase tracking-[0.3em] text-text-secondary font-black mb-3" htmlFor="email">
                      {t('auth.institutionalEmail')}
                    </label>
                    <div className="relative group-focus-within:scale-[1.01] transition-transform duration-300">
                      <User className="absolute left-6 top-1/2 -translate-y-1/2 text-primary/40 w-4 h-4 group-focus-within:text-text-accent transition-colors" />
                      <input
                        className="w-full bg-bg-surface border border-border-color focus:border-text-accent/50 focus:ring-8 focus:ring-text-accent/5 rounded-2xl text-text-primary py-5 pl-14 pr-6 transition-all duration-300 outline-none placeholder:text-text-muted/50 font-medium text-sm"
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
                      <label className="block text-[10px] uppercase tracking-[0.3em] text-text-secondary font-black" htmlFor="password">
                        {t('auth.accessKey')}
                      </label>
                      <a className="text-[10px] uppercase tracking-[0.2em] text-text-accent hover:opacity-80 transition-opacity font-bold" href="#">
                        {t('auth.forgot')}
                      </a>
                    </div>
                    <div className="relative group-focus-within:scale-[1.01] transition-transform duration-300">
                      <Lock className="absolute left-6 top-1/2 -translate-y-1/2 text-primary/40 w-4 h-4 group-focus-within:text-text-accent transition-colors" />
                      <input
                        className="w-full bg-bg-surface border border-border-color focus:border-text-accent/50 focus:ring-8 focus:ring-text-accent/5 rounded-2xl text-text-primary py-5 pl-14 pr-14 transition-all duration-300 outline-none placeholder:text-text-muted/50 font-medium text-sm"
                        id="password"
                        placeholder="••••••••••••"
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                      />
                      <button 
                         className="absolute right-6 top-1/2 -translate-y-1/2 text-text-muted/50 hover:text-text-accent transition-colors" 
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
                  className="w-full py-5 btn-royal-shine text-white font-black text-sm uppercase tracking-[0.4em] rounded-2xl disabled:opacity-70 flex items-center justify-center gap-3 mt-4" 
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
              <div className="pt-8 mt-4 border-t border-border-subtle">
                <span className="block text-[9px] uppercase tracking-[0.3em] text-text-muted mb-6 text-center font-bold">
                  {t('auth.envAccessCredentials')}
                </span>
                <div className="grid grid-cols-1 gap-3">
                  {[
                    { role: 'judge', pass: 'judge', color: 'bg-primary/5 text-primary border-primary/10' },
                    { role: 'clerk', pass: 'clerk', color: 'bg-indigo-500/5 text-indigo-400 border-indigo-500/10' },
                    { role: 'admin', pass: 'admin', color: 'bg-accent-gold/5 text-text-accent border-accent-gold/10' }
                  ].map(({ role, pass, color }) => (
                    <div key={role} className={cn("flex flex-row items-center justify-between p-4 px-6 rounded-xl border text-xs font-bold", color)}>
                      <span className="uppercase tracking-widest">{role}</span>
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
    
      {/* Footer (Always Ivory-themed gold) */}
      <footer className="fixed bottom-0 left-0 w-full z-50 flex flex-col md:flex-row justify-center items-center px-8 py-10 bg-transparent">
        <p className="text-[#D4AF37] font-headline text-[10px] uppercase tracking-[0.8em] font-bold italic drop-shadow-sm">© 2026 Motivity Labs.</p>
      </footer>
    </div>
  )
}

export default Login