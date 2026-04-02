import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ShieldCheck, Cpu, Database, Network, Users, Activity, HardDrive, LayoutDashboard, Key, Eye, Server, Layers, FileText } from 'lucide-react'
import ModuleCard from './ModuleCard'
import PipelineFlow from './PipelineFlow'

interface ArchitectureModalProps {
  isOpen: boolean
  onClose: () => void
}

const ArchitectureModal = ({ isOpen, onClose }: ArchitectureModalProps) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-emerald-950/40 backdrop-blur-3xl z-[100]"
          />

          <motion.div
            initial={{ x: '100%', opacity: 0.5 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 40, stiffness: 300 }}
            className="fixed top-0 right-0 h-full w-full lg:w-[950px] bg-[#0A1F16] border-l border-white/5 z-[101] overflow-y-auto scrollbar-hide shadow-[0_0_100px_rgba(0,0,0,1)]"
          >
            <div className="relative min-h-full p-12 lg:p-20 pb-32">
              <div className="absolute top-0 right-0 p-10 opacity-[0.03] pointer-events-none w-full h-full bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]" />

              <button 
                onClick={onClose}
                className="absolute top-12 right-12 p-5 rounded-3xl bg-white/5 border border-white/10 text-white hover:bg-text-accent hover:text-bg-base transition-all duration-500 shadow-2xl group active:scale-95"
              >
                <X className="w-8 h-8 group-hover:rotate-90 transition-transform duration-500" />
              </button>

              <header className="mb-24 space-y-8 relative z-10">
                <div className="flex flex-wrap items-center gap-4">
                  {['On-Premise', 'Air-Gapped', 'Sovereign Nodes', 'Neural-Sync'].map(tag => (
                    <span key={tag} className="px-6 py-2 text-[10px] font-black uppercase tracking-[0.4em] bg-text-accent/10 text-text-accent border border-text-accent/20 rounded-full shadow-2xl">
                      {tag}
                    </span>
                  ))}
                </div>
                <div>
                  <h2 className="text-6xl lg:text-8xl font-headline !text-white font-bold tracking-tighter leading-none mb-4 drop-shadow-2xl">System Blueprint</h2>
                  <p className="!text-[#D4AF37] font-serif italic text-3xl max-w-3xl leading-relaxed opacity-100">Sovereign UAE Intelligence — System Schematic v4.0</p>
                </div>
              </header>

              <div className="space-y-24 relative z-20">
                {/* TIER 1: INTERFACE LAYER */}
                <section>
                  <div className="flex items-center gap-6 mb-12 group">
                    <div className="w-1.5 h-10 bg-[#D4AF37] rounded-full transition-all group-hover:h-12 shadow-[0_0_20px_rgba(212,175,55,0.8)]" />
                    <h3 className="font-headline text-3xl font-bold !text-white tracking-tight italic">Tier 01: Sovereign Experience Layer</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-8 lg:pr-24">
                    <ModuleCard title="Admin Portal" icon={<ShieldCheck className="w-8 h-8" />} items={['Sovereign Dashboard', 'Identity Control (IAM)', 'Audit-Sec Ledger']} />
                    <ModuleCard title="Judge Portal" icon={<LayoutDashboard className="w-8 h-8" />} items={['Decision Workspace', 'Neural Drafting', 'Explainability Grid']} />
                    <ModuleCard title="Clerk Portal" icon={<Layers className="w-8 h-8" />} items={['Intake Queue', 'Direct OCR Pipeline', 'System Synced']} />
                    <ModuleCard title="Auth & RBAC" icon={<Key className="w-8 h-8" />} items={['Military Grade (AES)', 'Role Graph', 'Session Enclave']} />
                  </div>
                </section>

                {/* TIER 2: PROCESSING LAYER */}
                <section className="relative">
                  <div className="flex items-center gap-6 mb-12 group">
                    <div className="w-1.5 h-10 bg-success rounded-full transition-all group-hover:h-12 shadow-[0_0_15px_rgba(16,185,129,0.6)]" />
                    <h3 className="font-headline text-3xl font-bold text-white tracking-tight italic">Tier 02: Neural Processing Graph</h3>
                  </div>
                  <div className="bg-white/5 border border-white/5 p-12 rounded-[3.5rem] shadow-2xl overflow-hidden group">
                    <PipelineFlow />
                    <div className="mt-12 flex flex-wrap gap-4 pt-10 border-t border-white/5">
                      {['JAIS-1.5B (Arabic LLM)', 'Qwen-2.5-Coder', 'BGE-M3 Embed'].map(s => (
                        <div key={s} className="px-5 py-2.5 rounded-xl bg-white/5 font-mono text-[10px] text-text-accent uppercase tracking-[0.2em] font-bold border border-white/10 group-hover:border-text-accent/30 transition-all">
                          {s}
                        </div>
                      ))}
                    </div>
                  </div>
                </section>

                {/* TIER 3: DATA LAYER */}
                <section>
                  <div className="flex items-center gap-6 mb-12 group">
                    <div className="w-1.5 h-10 bg-indigo-500 rounded-full transition-all group-hover:h-12 shadow-[0_0_20px_rgba(99,102,241,0.8)]" />
                    <h3 className="font-headline text-3xl font-bold !text-white tracking-tight italic">Tier 03: Encrypted Persistence</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="p-8 rounded-[2.5rem] bg-white/[0.03] border border-[#336791]/30 hover:border-[#336791] transition-all space-y-4 group">
                      <div className="w-12 h-12 bg-[#336791]/20 rounded-2xl flex items-center justify-center text-[#336791] group-hover:bg-[#336791]/40 transition-colors"><Database /></div>
                      <p className="font-headline font-bold text-xl text-white">PostgreSQL</p>
                      <p className="text-[11px] text-emerald-100/60 uppercase tracking-[0.2em] font-black">Relation State</p>
                    </div>
                    <div className="p-8 rounded-[2.5rem] bg-white/[0.03] border border-[#fc2f4c]/30 hover:border-[#fc2f4c] transition-all space-y-4 group">
                      <div className="w-12 h-12 bg-[#fc2f4c]/20 rounded-2xl flex items-center justify-center text-[#fc2f4c] group-hover:bg-[#fc2f4c]/40 transition-colors"><Network /></div>
                      <p className="font-headline font-bold text-xl text-white">Qdrant Vector DB</p>
                      <p className="text-[11px] text-emerald-100/60 uppercase tracking-[0.2em] font-black">High-D Inferences</p>
                    </div>
                    <div className="p-8 rounded-[2.5rem] bg-white/[0.03] border border-[#C72E49]/30 hover:border-[#C72E49] transition-all space-y-4 group">
                      <div className="w-12 h-12 bg-[#C72E49]/20 rounded-2xl flex items-center justify-center text-[#C72E49] group-hover:bg-[#C72E49]/40 transition-colors"><HardDrive /></div>
                      <p className="font-headline font-bold text-xl text-white">Object Storage</p>
                      <p className="text-[11px] text-emerald-100/60 uppercase tracking-[0.2em] font-black">Encrypted Dossiers</p>
                    </div>
                  </div>
                </section>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

export default ArchitectureModal
