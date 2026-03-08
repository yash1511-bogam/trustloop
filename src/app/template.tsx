"use client";

import { usePathname } from "next/navigation";
import { motion } from "framer-motion";

export default function Template({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <motion.div
      animate={{ opacity: 1, y: 0, scale: 1 }}
      initial={{ opacity: 0, y: 16, scale: 0.98 }}
      key={pathname}
      transition={{ 
        type: "spring", 
        stiffness: 300, 
        damping: 30,
        mass: 0.8 
      }}
    >
      {children}
    </motion.div>
  );
}
