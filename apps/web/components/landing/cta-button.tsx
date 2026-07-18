"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ReactNode } from "react";

const MotionLink = motion.create(Link);

interface CtaButtonProps {
  href: string;
  className: string;
  children: ReactNode;
}

export function CtaButton({ href, className, children }: CtaButtonProps) {
  return (
    <MotionLink
      href={href}
      className={className}
      whileHover={{ scale: 1.04 }}
      whileTap={{ scale: 0.96 }}
      transition={{ duration: 0.15, ease: "easeOut" }}
    >
      {children}
    </MotionLink>
  );
}
