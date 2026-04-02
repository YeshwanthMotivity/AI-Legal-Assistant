import { motion } from 'framer-motion'
import { ArrowRight, Database, Search, FileText, Languages, Brain, CheckSquare, Edit3, Settings } from 'lucide-react'
import { useTranslation } from 'react-i18next'

const nodes = [
  { id: 'document_agent', icon: FileText, label: 'Document Agent' },
  { id: 'precedent_search', icon: Search, label: 'Precedent Search' },
  { id: 'law_search', icon: Search, label: 'Jurisprudence Search' },
  { id: 'calculation_agent', icon: Settings, label: 'Calculation Agent' },
  { id: 'context_builder', icon: Database, label: 'Context Builder' },
  { id: 'reasoning_agent', icon: Brain, label: 'Reasoning Agent' },
  { id: 'explainability_builder', icon: Languages, label: 'Explainability Builder' },
  { id: 'judgment_drafting', icon: Edit3, label: 'Judgment Drafting' }
]

const PipelineFlow = () => {
  return (
    <div className="w-full overflow-x-auto pb-6 custom-scrollbar">
      <div className="min-w-[800px] flex items-center justify-between gap-2 px-2">
        {nodes.map((node, index) => {
          const Icon = node.icon
          return (
            <div key={node.id} className="flex items-center gap-2 flex-shrink-0">
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
                className="flex flex-col items-center gap-3 w-[100px]"
              >
                <div className="relative group w-14 h-14 rounded-full bg-surface-container border border-tertiary/20 flex items-center justify-center shadow-lg shadow-black/50 transition-all hover:bg-tertiary/10 hover:border-tertiary/60">
                  {/* Subtle pulsing ring */}
                  <div className="absolute inset-0 rounded-full border border-tertiary/30 animate-[ping_3s_cubic-bezier(0,0,0.2,1)_infinite] opacity-20 pointer-events-none" />
                  <Icon className="w-5 h-5 text-tertiary" />
                </div>
                <span className="text-[10px] text-center font-bold tracking-widest text-on-surface uppercase opacity-80 leading-tight">
                  {node.label}
                </span>
              </motion.div>

              {/* Connecting Line (omit for last item) */}
              {index < nodes.length - 1 && (
                <motion.div 
                  initial={{ width: 0, opacity: 0 }}
                  whileInView={{ width: '40px', opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.3, delay: (index * 0.1) + 0.2 }}
                  className="flex items-center flex-shrink-0 opacity-50 relative -translate-y-4"
                >
                  <div className="h-[1px] w-full bg-gradient-to-r from-tertiary/20 to-tertiary/60" />
                  <ArrowRight className="w-3 h-3 text-tertiary/60 absolute -right-1" />
                </motion.div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default PipelineFlow
