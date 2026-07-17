"use client";

import { motion } from "framer-motion";
import styles from "@/app/page.module.css";

interface StepCardProps {
  number: string;
  title: string;
  description: string;
  delay?: number;
}

export function StepCard({ number, title, description, delay = 0 }: StepCardProps) {
  return (
    <motion.div
      className={styles.stepCard}
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.5, ease: "easeOut", delay }}
      whileHover={{ y: -6 }}
    >
      <motion.span
        className={styles.stepNumber}
        whileHover={{ scale: 1.15 }}
        transition={{ type: "spring", stiffness: 320, damping: 14 }}
      >
        {number}
      </motion.span>
      <h3>{title}</h3>
      <p>{description}</p>
    </motion.div>
  );
}
