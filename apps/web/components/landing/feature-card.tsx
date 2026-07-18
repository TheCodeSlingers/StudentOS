"use client";

import { motion } from "framer-motion";
import { ReactNode } from "react";
import styles from "@/app/page.module.css";

interface FeatureCardProps {
  icon: ReactNode;
  title: string;
  description: string;
  delay?: number;
}

export function FeatureCard({ icon, title, description, delay = 0 }: FeatureCardProps) {
  return (
    <motion.div
      className={styles.featureCard}
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.5, ease: "easeOut", delay }}
      whileHover={{ y: -6 }}
    >
      <motion.span
        className={styles.featureIcon}
        whileHover={{ scale: 1.15, rotate: -8 }}
        transition={{ type: "spring", stiffness: 320, damping: 14 }}
      >
        {icon}
      </motion.span>
      <h3>{title}</h3>
      <p>{description}</p>
    </motion.div>
  );
}
