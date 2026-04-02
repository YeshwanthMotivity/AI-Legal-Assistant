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
  // Prevent scrolling on background when modal is open
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
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-primary/20 backdrop-blur-md z-[100]"
          />

          {/* Slide-over Panel */}
          <motion.div
            initial={{ x: '100%', opacity: 0.5 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 30, stiffness: 200 }}
            className="fixed top-0 right-0 h-full w-full md:w-[600px] lg:w-[850px] bg-bg-base border-l border-primary/10 z-[101] overflow-y-auto custom-scrollbar shadow-2xl"
          >
            <div className="relative min-h-full p-8 md:p-12 pb-24">
              
              {/* Close Button */}
              <button 
                onClick={onClose}
                className="absolute top-8 right-8 p-3 rounded-full bg-bg-surface hover:bg-primary-royal hover:text-white text-primary-royal transition-all duration-300 shadow-sm border border-border-subtle"
                aria-label="Close architecture view"
              >
                <X className="w-6 h-6" />
              </button>

              {/* HEADER SECTION */}
              <div className="mb-14 mt-4 space-y-6">
                <div className="flex flex-wrap items-center gap-3 mb-8">
                  {['On-Premise', 'Air-Gapped', 'Arabic + English', 'Multi-Agent AI'].map(tag => (
                    <span key={tag} className="px-4 py-1.5 text-[10px] uppercase tracking-widest bg-text-accent/10 text-text-accent border border-text-accent/20 rounded-full font-black shadow-sm">
                      {tag}
                    </span>
                  ))}
                </div>
                <h2 className="text-4xl md:text-6xl font-headline text-text-primary font-bold tracking-tight">AI Judicial Assistant Architecture</h2>
                <p className="text-text-secondary font-medium text-xl italic max-w-2xl leading-relaxed">Enterprise-grade AI system for sovereign UAE legal intelligence</p>
              </div>

              {/* SECTION 1: USER ACCESS LAYER */}
              <section className="mb-16">
                <div className="flex items-center gap-3 mb-8 border-b border-primary/10 pb-5">
                  <Users className="w-5 h-5 text-accent" />
                  <h3 className="font-black tracking-[0.3em] uppercase text-primary text-[11px] opacity-80">User Access Layer</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <ModuleCard 
                    title="Admin Portal" icon={<ShieldCheck />} 
                    items={['Dashboard', 'User Management', 'Audit Logs']} 
                  />
                  <ModuleCard 
                    title="Judge Portal" icon={<LayoutDashboard />} 
                    items={['Workspace', 'Judgments Drafting', 'Analysis']} 
                  />
                  <ModuleCard 
                    title="Clerk Portal" icon={<Layers />} 
                    items={['Case Intake', 'Document OCR', 'Bulk Upload']} 
                  />
                  <ModuleCard 
                    title="Auth & RBAC" icon={<Key />} 
                    items={['JWT Tokens', 'Role Hierarchy', 'Session Replay']} 
                  />
                </div>
              </section>

              {/* SECTION 2: BACKEND DOMAIN MODULES */}
              <section className="mb-16">
                <div className="flex items-center gap-3 mb-8 border-b border-primary/10 pb-5">
                  <Server className="w-5 h-5 text-accent" />
                  <h3 className="font-black tracking-[0.3em] uppercase text-primary text-[11px] opacity-80">Backend Domain Modules</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <ModuleCard title="Case Core" icon={<ShieldCheck />} />
                  <ModuleCard title="Document Processor" icon={<FileText />} />
                  <ModuleCard title="Ingestion Engine" icon={<Activity />} />
                  <ModuleCard title="User IAM" icon={<Key />} />
                  <ModuleCard title="Audit & Eval" icon={<Eye />} />
                </div>
              </section>

              {/* SECTION 3: AI ORCHESTRATION PIPELINE */}
              <section className="mb-16">
                <div className="flex items-center gap-3 mb-8 border-b border-primary/10 pb-5">
                  <Network className="w-5 h-5 text-accent" />
                  <h3 className="font-black tracking-[0.3em] uppercase text-primary text-[11px] opacity-80">AI Orchestration Graph</h3>
                </div>
                <div className="bg-white rounded-2xl p-8 border border-primary/10 shadow-lg">
                  <PipelineFlow />
                </div>
              </section>

              {/* SECTION 4: AI MICROSERVICES */}
              <section className="mb-16">
                <div className="flex items-center gap-3 mb-8 border-b border-primary/10 pb-5">
                  <Cpu className="w-5 h-5 text-accent" />
                  <h3 className="font-black tracking-[0.3em] uppercase text-primary text-[11px] opacity-80">AI Microservices</h3>
                </div>
                <div className="flex flex-wrap gap-4">
                  {['BGE-M3 (Embeddings)', 'BGE Reranker', 'Qwen 2.5 (1.5B)', 'JAIS Arabic LLM'].map(service => (
                    <div key={service} className="px-6 py-3.5 rounded-xl bg-white border border-primary/10 font-mono text-xs text-primary hover:border-accent hover:text-accent font-bold transition-all shadow-sm">
                      {service}
                    </div>
                  ))}
                </div>
              </section>

              {/* SECTION 5: DATA LAYER */}
              <section className="mb-10">
                <div className="flex items-center gap-3 mb-8 border-b border-border-subtle pb-5">
                  <Database className="w-5 h-5 text-text-accent" />
                  <h3 className="font-black tracking-[0.3em] uppercase text-text-primary text-[11px] opacity-80">Data Layer</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <ModuleCard title="PostgreSQL" icon={<Database />} items={['Relational App State']} className="bg-[#336791]/10 border-[#336791]/30" />
                  <ModuleCard title="MinIO" icon={<HardDrive />} items={['S3 Object Storage']} className="bg-[#C72E49]/10 border-[#C72E49]/30" />
                  <ModuleCard title="Qdrant" icon={<Database />} items={['High-Dimensional Vectors']} className="bg-[#fc2f4c]/10 border-[#fc2f4c]/30" />
                </div>
              </section>

            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

export default ArchitectureModal
