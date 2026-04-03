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
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[100]"
          />

          {/* Slide-over Panel */}
          <motion.div
            initial={{ x: '100%', opacity: 0.5 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed top-0 right-0 h-full w-full md:w-[600px] lg:w-[800px] bg-surface-container-low border-l border-white/10 z-[101] overflow-y-auto custom-scrollbar shadow-2xl"
          >
            <div className="relative min-h-full p-8 md:p-12 pb-24">
              
              {/* Close Button */}
              <button 
                onClick={onClose}
                className="absolute top-6 right-6 p-2 rounded-full hover:bg-white/10 text-on-surface-variant hover:text-white transition-colors"
                aria-label="Close architecture view"
              >
                <X className="w-6 h-6" />
              </button>

              {/* HEADER SECTION */}
              <div className="mb-12 mt-4 space-y-4">
                <div className="flex flex-wrap items-center gap-3 mb-6">
                  {['On-Premise', 'Air-Gapped', 'Arabic + English', 'Multi-Agent AI'].map(tag => (
                    <span key={tag} className="px-3 py-1 text-[10px] uppercase tracking-widest bg-primary/10 text-primary border border-primary/20 rounded-full font-bold">
                      {tag}
                    </span>
                  ))}
                </div>
                <h2 className="text-3xl md:text-5xl font-headline text-emerald-50">AI Judicial Assistant Architecture</h2>
                <p className="text-on-surface-variant font-light text-lg">Enterprise-grade AI system for UAE legal intelligence</p>
              </div>

              {/* SECTION 1: USER ACCESS LAYER */}
              <section className="mb-14">
                <div className="flex items-center gap-3 mb-6 border-b border-white/10 pb-4">
                  <Users className="w-5 h-5 text-tertiary" />
                  <h3 className="text-lg font-bold tracking-widest uppercase text-on-surface-variant text-[11px]">User Access Layer</h3>
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
              <section className="mb-14">
                <div className="flex items-center gap-3 mb-6 border-b border-white/10 pb-4">
                  <Server className="w-5 h-5 text-tertiary" />
                  <h3 className="text-lg font-bold tracking-widest uppercase text-on-surface-variant text-[11px]">Backend Domain Modules</h3>
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
              <section className="mb-14">
                <div className="flex items-center gap-3 mb-6 border-b border-white/10 pb-4">
                  <Network className="w-5 h-5 text-tertiary" />
                  <h3 className="text-lg font-bold tracking-widest uppercase text-on-surface-variant text-[11px]">AI Orchestration Graph</h3>
                </div>
                <div className="bg-surface-container/50 rounded-xl p-6 border border-white/5 shadow-inner">
                  <PipelineFlow />
                </div>
              </section>

              {/* SECTION 4: AI MICROSERVICES */}
              <section className="mb-14">
                <div className="flex items-center gap-3 mb-6 border-b border-white/10 pb-4">
                  <Cpu className="w-5 h-5 text-tertiary" />
                  <h3 className="text-lg font-bold tracking-widest uppercase text-on-surface-variant text-[11px]">AI Microservices</h3>
                </div>
                <div className="flex flex-wrap gap-4">
                  {['BGE-M3 (Embeddings)', 'BGE Reranker', 'Qwen 2.5 (1.5B)', 'JAIS Arabic LLM'].map(service => (
                    <div key={service} className="px-5 py-3 rounded-lg bg-surface border border-white/5 font-mono text-xs text-on-surface hover:border-tertiary/50 transition-colors">
                      {service}
                    </div>
                  ))}
                </div>
              </section>

              {/* SECTION 5: DATA LAYER */}
              <section className="mb-6">
                <div className="flex items-center gap-3 mb-6 border-b border-white/10 pb-4">
                  <Database className="w-5 h-5 text-tertiary" />
                  <h3 className="text-lg font-bold tracking-widest uppercase text-on-surface-variant text-[11px]">Data Layer</h3>
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
