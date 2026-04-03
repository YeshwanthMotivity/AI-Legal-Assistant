import { motion } from 'framer-motion'

const BackgroundPreview = () => {
  return (
    <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none opacity-20">
      <motion.div 
        animate={{ 
          y: [0, -20, 0], 
          opacity: [0.3, 0.5, 0.3] 
        }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-1/4 right-[10%] w-[400px] h-[300px] bg-emerald-500/10 blur-[120px] rounded-full" 
      />
      
      <motion.div 
        animate={{ 
          x: [0, 30, 0], 
          opacity: [0.2, 0.4, 0.2] 
        }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        className="absolute bottom-1/4 left-[20%] w-[500px] h-[400px] bg-tertiary/10 blur-[150px] rounded-full" 
      />
    </div>
  )
}

export default BackgroundPreview
