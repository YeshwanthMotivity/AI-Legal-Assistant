import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../auth/useAuth'
import ThemeToggle from '../components/layout/ThemeToggle'
import { 
  Scale, 
  Lock, 
  User, 
  Globe, 
  ShieldCheck,
  ArrowRight,
  Info
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'

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
    <div className="min-h-screen w-full relative overflow-hidden bg-background flex items-center justify-center p-6 selection:bg-emerald-500/30">
      {/* Dynamic Background Pattern */}
      <div className="absolute inset-0 opacity-10 dark:opacity-20 pointer-events-none">
         <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-500/20 blur-[120px] rounded-full" />
         <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary/20 blur-[120px] rounded-full" />
         <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-5 dark:opacity-10" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="w-full max-w-md relative z-10"
      >
        {/* Superior Branding Section */}
        <div className="text-center mb-10 translate-y-2">
           <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-black uppercase tracking-widest mb-6 backdrop-blur-sm">
              <ShieldCheck className="w-3.5 h-3.5" />
              Secure Judicial Portal
           </div>
           
           <div className="flex justify-center mb-6">
              <div className="relative group">
                <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full group-hover:bg-primary/40 transition-all duration-700" />
                <div className="relative w-20 h-20 bg-gradient-to-br from-primary to-primary-hover rounded-[24px] flex items-center justify-center shadow-2xl border border-white/10 group-hover:rotate-6 transition-transform">
                   <Scale className="w-10 h-10 text-white drop-shadow-lg" />
                </div>
              </div>
           </div>

           <h1 className="text-3xl font-black tracking-tight text-foreground mb-2">
              {t('common.appName')}
           </h1>
           <div className="flex items-center justify-center gap-2 text-muted-foreground font-bold uppercase text-[10px] tracking-[0.2em] opacity-80">
              <span>DIFC</span>
              <div className="w-1 h-1 bg-border rounded-full" />
              <span>Labor Law AI</span>
              <div className="w-1 h-1 bg-border rounded-full" />
              <span>v2.4.0</span>
           </div>
        </div>

        <Card className="backdrop-blur-xl border-border/50 shadow-2xl overflow-hidden rounded-[32px] bg-card/50 dark:bg-white/5">
          <CardContent className="p-10">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2 group">
                <label className="text-[11px] font-black uppercase text-muted-foreground ml-1 tracking-tighter flex items-center gap-2">
                  <User className="w-3 h-3 text-primary" />
                  Credentials
                </label>
                <div className="relative flex items-center">
                  <User className="absolute left-4 w-5 h-5 text-muted-foreground/30 group-focus-within:text-primary transition-colors z-10" />
                  <input
                    type="text"
                    placeholder="Judicial ID or Email"
                    className="w-full bg-background border border-border/50 rounded-2xl pr-4 py-4 text-sm text-foreground focus:outline-none focus:ring-4 focus:ring-primary/20 transition-all font-bold placeholder:text-muted-foreground/30"
                    style={{ paddingLeft: '3.5rem' }}
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2 group">
                <label className="text-[11px] font-black uppercase text-muted-foreground ml-1 tracking-tighter flex items-center gap-2">
                   <Lock className="w-3 h-3 text-primary" />
                   {t('auth.password')}
                </label>
                <div className="relative flex items-center">
                  <Lock className="absolute left-4 w-5 h-5 text-muted-foreground/30 group-focus-within:text-primary transition-colors z-10" />
                  <input
                    type="password"
                    placeholder="••••••••"
                    className="w-full bg-background border border-border/50 rounded-2xl pr-4 py-4 text-sm text-foreground focus:outline-none focus:ring-4 focus:ring-primary/20 transition-all font-bold placeholder:text-muted-foreground/30"
                    style={{ paddingLeft: '3.5rem' }}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
              </div>

              {error && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="p-4 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-black uppercase tracking-widest text-center"
                >
                  {error}
                </motion.div>
              )}

              <Button
                type="submit"
                className="w-full h-14 rounded-2xl bg-primary hover:bg-primary-hover text-primary-foreground text-[13px] font-black uppercase tracking-widest shadow-lg shadow-primary/20 transition-all group border-none"
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 border-2 border-primary-foreground/20 border-t-primary-foreground rounded-full animate-spin" />
                    Authenticating...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    {t('auth.loginButton')}
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                )}
              </Button>
            </form>

            <div className="mt-10 pt-8 border-t border-border/50">
              <div className="flex items-center gap-2 mb-4">
                 <Info className="w-3.5 h-3.5 text-muted-foreground" />
                 <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Environment Access</span>
              </div>
              <div className="grid grid-cols-1 gap-2.5">
                {[
                  { role: 'judge', pass: 'judge', color: 'bg-indigo-500/10 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400 border-indigo-500/10' },
                  { role: 'clerk', pass: 'clerk', color: 'bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 border-emerald-500/10' },
                  { role: 'admin', pass: 'admin', color: 'bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400 border-amber-500/10' }
                ].map(({ role, pass, color }) => (
                  <div key={role} className={cn("grid grid-cols-[100px_1fr] items-center p-3 px-5 rounded-xl border transition-colors", color)}>
                     <span className="text-[10px] font-black uppercase tracking-widest">{role}</span>
                     <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold opacity-40">PASSWORD:</span>
                        <span className="text-[10px] font-black tracking-widest">{pass}</span>
                     </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Global Footer */}
        <div className="mt-8 flex items-center justify-between px-4 text-muted-foreground text-[10px] font-black uppercase tracking-[0.2em] opacity-60">
           <div className="flex items-center gap-2">
              <Globe className="w-3.5 h-3.5" />
              GLOBAL REGION
           </div>
           <span>© 2026 DIFC JUDICIARY</span>
        </div>
      </motion.div>

      <div className="fixed bottom-8 right-8 z-50">
        <ThemeToggle />
      </div>
    </div>
  )
}

export default Login

