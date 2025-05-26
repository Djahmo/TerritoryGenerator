
import { motion } from 'framer-motion'

const Wrapper = ({ children, className='' }: { children: React.ReactNode, className?:string }) =>
  <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2, ease: "easeInOut" }}
      className="h-full w-full"
    >
      <section className={className}>
        {children}
      </section>
    </motion.div>

export default Wrapper
