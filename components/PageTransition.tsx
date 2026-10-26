'use client';
/** Adapted from XinghuisamaBlogs PageTransition; progressive enhancement keeps static content visible without JS. */
import { motion } from 'framer-motion';
import type { ReactNode } from 'react';
export default function PageTransition({children}:{children:ReactNode}) { return <motion.div initial={false} animate={{opacity:1}} transition={{duration:.35}} className="page-transition">{children}</motion.div>; }
