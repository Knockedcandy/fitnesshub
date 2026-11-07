'use client';
import { motion } from 'framer-motion';
export default function AnimatedSection({ children, className='' }) {
  return <motion.section initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{duration:.4}} className={className}>{children}</motion.section>;
}
