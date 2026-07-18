"use client";

import { motion, Variants } from "framer-motion";
import styles from "@/app/(dashboard)/dashboard/analytics/analytics.module.css";

interface StatCardProps {
  title: string;
  value: string | number;
  change?: string;
  icon: React.ReactNode;
  variants: Variants;
}

export function StatCard({
  title,
  value,
  change,
  icon,
  variants,
}: StatCardProps) {
  return (
    <motion.div className={styles.statCard} variants={variants}>
      <div className={styles.statCardHeader}>
        <span>{title}</span>
        {icon}
      </div>
      <p className={styles.statCardValue}>{value}</p>
      {change && <p className={styles.statCardFooter}>{change}</p>}
    </motion.div>
  );
}
