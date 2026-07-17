"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { Reveal } from "./reveal";
import styles from "./faq-section.module.css";

const FAQS = [
  {
    question: "Who is StudentOS built for?",
    answer:
      "Coaching centers, bootcamps, and student organizations that need to manage batches, sessions, and attendance in one place instead of spreadsheets.",
  },
  {
    question: "How does the rotating attendance code work?",
    answer:
      "A mentor opens a time-boxed attendance window for a session. A fresh code is generated and shown only while that window is open, and students self check-in with it before it expires.",
  },
  {
    question: "Can a mentor correct an attendance mistake?",
    answer:
      "Yes. Mentors can manually override any student's status for a session, with a required reason, and the change shows up in that student's attendance history immediately.",
  },
  {
    question: "What's the difference between a mentor and a student account?",
    answer:
      "Mentors manage batches, sessions, members, and workspace settings. Students see their own batches, check in to sessions, and manage their profile — each role only gets a dashboard scoped to what applies to them.",
  },
  {
    question: "Do I need a credit card to get started?",
    answer: "No. Sign up, create a workspace, and start organizing batches immediately — no card required.",
  },
  {
    question: "Can I invite mentors and students after creating my workspace?",
    answer:
      "Yes. Invite people by email at any time from the Members page and assign them a mentor or student role as your team grows.",
  },
];

function ChevronIcon() {
  return (
    <svg className={styles.chevron} viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M5 7.5L10 12.5L15 7.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function FaqSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section id="faq" className={styles.faq}>
      <Reveal className={styles.sectionHeading}>
        <span className={styles.eyebrow}>Frequently asked questions</span>
        <h2>Still have questions?</h2>
        <p>Everything you need to know before you set up a workspace.</p>
      </Reveal>

      <div className={styles.list}>
        {FAQS.map((item, index) => {
          const isOpen = openIndex === index;
          return (
            <Reveal key={item.question} delay={(index % 3) * 0.06}>
              <motion.div className={styles.item} data-open={isOpen} initial={false} whileHover={{ y: -3 }}>
                <button
                  type="button"
                  className={styles.question}
                  aria-expanded={isOpen}
                  onClick={() => setOpenIndex(isOpen ? null : index)}
                >
                  <span>{item.question}</span>
                  <motion.span
                    className={styles.chevronWrap}
                    animate={{ rotate: isOpen ? 180 : 0 }}
                    transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                  >
                    <ChevronIcon />
                  </motion.span>
                </button>
                <AnimatePresence initial={false}>
                  {isOpen ? (
                    <motion.div
                      key="content"
                      className={styles.answerWrap}
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                    >
                      <p className={styles.answer}>{item.answer}</p>
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </motion.div>
            </Reveal>
          );
        })}
      </div>
    </section>
  );
}
