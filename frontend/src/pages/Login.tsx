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
  const isRTL = i18n.dir() === 'rtl'
 
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
    <div className="bg-[#F9F8F2] font-body selection:bg-emerald-800/10 h-screen overflow-hidden">
      {/* Top Navigation Bar */}
      <nav className="fixed inset-x-0 top-0 z-50 flex justify-between items-center px-8 py-4 bg-transparent">
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
 
      <div className="grid grid-cols-1 lg:grid-cols-2 h-full overflow-hidden">
       
        {/* Left Side - Branding & Architecture Preview */}
        <section className="relative hidden lg:flex flex-col justify-center px-20 xl:px-32 bg-[#01140d] overflow-hidden" style={{ [isRTL ? 'marginLeft' : 'marginRight']: '-2px', zIndex: 1 }}>
          <BackgroundPreview />
 
          {/* Background Islamic Geometric Pattern (reduced opacity for arch preview) */}
          <div className="absolute inset-0 islamic-pattern opacity-[0.03] pointer-events-none mix-blend-overlay" />
         
         
          {/* Abstract Neural Network Decoration */}
          <div className="absolute inset-0 opacity-10 pointer-events-none overflow-hidden">
            <img
              alt="abstract visualization of interconnected neural nodes and digital patterns"
              className="w-full h-full object-cover mix-blend-overlay"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuBT3vKJ8OBhoRnf-KdUdYh9aCq3LvX9pyOP2GJup22HsBijNycQEr5xZ30bkKWb5-7AB0e4IOoYeSLnj7of4ckx0j9nG3zu862tkaoUAn3tuZEKsyqBoZ9_J2FOr6aoJCCnOScec8pNWXW2H-omeVIXjQACfHmYMOh61KXUhnD7ss_oQiU-KPMhwZwmf2ONN9p9WVJ6n5zzxY9DXvXr0NDoDS56Z3SxViY3Wsw9D3eLDj_6g9l_9LqQWkn5XetXrPYDgrlJ8ffsexU"
            />
          </div>
         
          <div className="relative z-10 space-y-6 w-full max-w-2xl">
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
          <div className={isRTL ? "portal-divider-curve-rtl" : "portal-divider-curve"} />
          <div className={isRTL ? "portal-divider-glow-rtl" : "portal-divider-glow"} />
        </section>
 
        {/* Right Section: Login Form */}
        <section className="flex flex-col items-center justify-center p-6 md:p-12 lg:p-24 bg-[#F9F8F2] relative w-full overflow-hidden">
          {/* Subtle noise/texture for the ivory side */}
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/felt.png')]" />
          <div className="w-full max-w-[400px] space-y-6">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={error ? {
                x: [0, -10, 10, -10, 10, 0],
                transition: { duration: 0.4 }
              } : { opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="bg-bg-surface/40 backdrop-blur-xl p-8 rounded-[2.5rem] space-y-6 border border-white/10 shadow-2xl relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-text-accent/5 to-transparent pointer-events-none" />
             
              <div className="space-y-6 text-center lg:text-left relative z-10 py-4">
                <h2 className="text-3xl font-headline font-bold text-[#003426] tracking-tight">{t('auth.loginButton')}</h2>
                <p className="text-[#D4AF37] font-black uppercase tracking-[0.4em] text-[10px] opacity-80">{t('auth.legalIntelligence')}</p>
              </div>

              <div className="space-y-6 relative z-10">
                <p className="text-text-secondary text-sm font-light leading-relaxed">
                  Access the Sovereign AI Judicial Assistant platform via the centralized identity service.
                </p>
                
                <button
                  onClick={login}
                  className="w-full py-4 btn-royal-shine text-white font-black text-xs uppercase tracking-[0.4em] rounded-2xl flex items-center justify-center gap-3 shadow-lg shadow-emerald-500/20"
                >
                  <span>{t('auth.login')}</span>
                  <ArrowRight className="w-5 h-5" />
                </button>
                
                <div className="pt-6 border-t border-border-subtle">
                  <p className="text-[10px] text-text-muted text-center uppercase tracking-widest font-bold">
                    Authenticated via Keycloak SSO
                  </p>
                </div>
              </div>
v>
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
      <footer className="fixed inset-x-0 bottom-0 z-50 flex flex-col md:flex-row justify-center items-center px-8 py-10 bg-transparent">
        <p className="text-[#D4AF37] font-headline text-[10px] uppercase tracking-[0.8em] font-bold italic drop-shadow-sm">© 2026 Motivity Labs.</p>
      </footer>
    </div>
  )
}
 
export default Login
 