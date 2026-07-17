"use client";

import { useState } from "react";
import { motion, Variants } from "framer-motion";
import styles from "./profile.module.css";
import { TextField } from "@/components/ui/TextField";
import { Button } from "@/components/ui/Button";
import {
  IStudentProfile,
  HireStatus,
  JobType,
  WorkplacePreference,
} from "./profile.interface";
import { notify } from "@/lib/toast";

// 1. Mock Data mapped to the new schema
const mockInitialData: IStudentProfile = {
  phone: "+880 1711-000000",
  address: "Dhaka, Bangladesh",
  courseName: "BSc in Computer Science",
  specialization: "Software Engineering",
  skills: "Next.js, TypeScript, PostgreSQL",
  hireStatus: HireStatus.ACTIVELY_LOOKING,
  jobType: JobType.FULL_TIME,
  workplacePreference: WorkplacePreference.REMOTE,
  currentEmployer: "",
  currentPosition: "",
  portfolioUrl: "https://github.com/",
  linkedinUrl: "https://linkedin.com/in/",
};

// 2. Framer Motion Animation Variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.2 },
  },
};

const itemVariants: Variants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { type: "spring", stiffness: 300, damping: 24 },
  },
};

export default function StudentProfilePage() {
  const [profile, setProfile] = useState<IStudentProfile>(mockInitialData);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setProfile((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      // 1. Your actual or simulated network request
      await new Promise((resolve) => setTimeout(resolve, 1000));
      console.log("Saving payload:", profile);

      // 2. Trigger the global success toast
      notify.success(
        "Profile updated",
        "Your changes have been saved successfully.",
      );
    } catch (error) {
      // 3. If the backend rejects the payload, the utility parses the error
      notify.error(error, "Could not update profile");
    } finally {
      // 4. Always turn off the loading state, whether it succeeded or failed
      setIsSaving(false);
    }
  };

  const InputField = ({
    label,
    children,
  }: {
    label: string;
    children: React.ReactNode;
  }) => (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-slate-700">{label}</label>
      {children}
    </div>
  );

  return (
    <motion.div
      className={styles.card}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
    >
      {/* UPGRADED HEADER WITH AVATAR */}
      <div className={styles.headerContent}>
        <motion.div
          className={styles.avatarContainer}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          {/* Fallback to a placeholder if no avatarUrl exists */}
          <img
            src="https://api.dicebear.com/7.x/notionists/svg?seed=Felix&backgroundColor=e2e8f0"
            alt="Profile Avatar"
            className={styles.avatarImage}
          />
          <div className={styles.avatarOverlay}>Upload</div>
        </motion.div>

        <div>
          <motion.h1
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            Career Preference Profile
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
          >
            Manage your placement data, analytics, and core competencies.
          </motion.p>
        </div>
      </div>

      <motion.form
        className={styles.form}
        onSubmit={handleSave}
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <div className={styles.formGrid}>
          {/* --- Contact & Academics --- */}
          <motion.div variants={itemVariants}>
            <TextField
              label="Phone Number"
              name="phone"
              value={profile.phone}
              onChange={handleChange}
              required
            />
          </motion.div>

          <motion.div variants={itemVariants}>
            <TextField
              label="Address"
              name="address"
              value={profile.address}
              onChange={handleChange}
            />
          </motion.div>

          <motion.div variants={itemVariants}>
            <TextField
              label="Course Name"
              name="courseName"
              value={profile.courseName}
              onChange={handleChange}
            />
          </motion.div>

          <motion.div variants={itemVariants}>
            <TextField
              label="Specialization"
              name="specialization"
              value={profile.specialization}
              onChange={handleChange}
            />
          </motion.div>

          {/* --- UPGRADED CAREER PREFERENCES --- */}
          <motion.div variants={itemVariants}>
            <InputField label="Hire Status">
              <select
                name="hireStatus"
                value={profile.hireStatus}
                onChange={handleChange}
                className={styles.select}
              >
                <option value={HireStatus.STUDENT_ONLY}>Student Only</option>
                <option value={HireStatus.ACTIVELY_LOOKING}>
                  Actively Looking
                </option>
                <option value={HireStatus.EMPLOYED}>Employed</option>
              </select>
            </InputField>
          </motion.div>

          <motion.div variants={itemVariants}>
            <InputField label="Target Job Type">
              <select
                name="jobType"
                value={profile.jobType}
                onChange={handleChange}
                className={styles.select}
              >
                <option value={JobType.NOT_LOOKING}>Not Looking</option>
                <option value={JobType.INTERNSHIP}>Internship</option>
                <option value={JobType.PART_TIME}>Part-Time</option>
                <option value={JobType.FULL_TIME}>Full-Time</option>
              </select>
            </InputField>
          </motion.div>

          <motion.div variants={itemVariants}>
            <InputField label="Workplace Preference">
              <select
                name="workplacePreference"
                value={profile.workplacePreference}
                onChange={handleChange}
                className={styles.select}
              >
                <option value={WorkplacePreference.NO_PREFERENCE}>
                  No Preference
                </option>
                <option value={WorkplacePreference.REMOTE}>Remote</option>
                <option value={WorkplacePreference.HYBRID}>Hybrid</option>
                <option value={WorkplacePreference.ON_SITE}>On-Site</option>
              </select>
            </InputField>
          </motion.div>

          <motion.div variants={itemVariants}>
            <TextField
              label="LinkedIn URL"
              name="linkedinUrl"
              value={profile.linkedinUrl}
              onChange={handleChange}
            />
          </motion.div>

          <motion.div variants={itemVariants} className={styles.fullWidth}>
            <TextField
              label="Technical Skills (Comma separated)"
              name="skills"
              value={profile.skills}
              onChange={handleChange}
              placeholder="e.g. Next.js, Prisma, Tailwind"
            />
          </motion.div>
        </div>

        {/* --- Action Footer --- */}
        <motion.div className={styles.actions} variants={itemVariants}>
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button type="submit" isLoading={isSaving}>
              Save Preferences
            </Button>
          </motion.div>
        </motion.div>
      </motion.form>
    </motion.div>
  );
}
