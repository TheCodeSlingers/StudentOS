"use client";

import { useEffect, useState } from "react";
import { motion, Variants } from "framer-motion";
import styles from "./profile.module.css";
import { TextField } from "@/components/ui/TextField";
import { Button } from "@/components/ui/Button";
import { IStudentProfile } from "./profile.interface";
import { ApiError, getStudentProfile, updateStudentProfile } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import { useRequireRole } from "@/lib/use-require-role";

const EMPTY_PROFILE: IStudentProfile = {
  phone: "",
  address: "",
  courseName: "",
  specialization: "",
  skills: "",
  hireStatus: "STUDENT_ONLY",
  jobType: "NOT_LOOKING",
  workplacePreference: "NO_PREFERENCE",
  currentEmployer: "",
  currentPosition: "",
  portfolioUrl: "",
  linkedinUrl: "",
};

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
  const isAuthorized = useRequireRole("STUDENT");
  const { membershipId } = useAuth();
  const [profile, setProfile] = useState<IStudentProfile>(EMPTY_PROFILE);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthorized || !membershipId) {
      return;
    }

    getStudentProfile(membershipId)
      .then((result) => {
        setProfile({
          phone: result.phone ?? "",
          address: result.address ?? "",
          courseName: result.courseName ?? "",
          specialization: result.specialization ?? "",
          skills: result.skills.join(", "),
          hireStatus: result.hireStatus,
          jobType: result.jobType,
          workplacePreference: result.workplacePreference,
          currentEmployer: result.currentEmployer ?? "",
          currentPosition: result.currentPosition ?? "",
          portfolioUrl: result.portfolioUrl ?? "",
          linkedinUrl: result.linkedinUrl ?? "",
        });
      })
      .catch((error) => {
        setLoadError(error instanceof ApiError ? error.message : "Could not load your profile.");
      })
      .finally(() => setIsLoading(false));
  }, [isAuthorized, membershipId]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setProfile((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!membershipId) {
      return;
    }

    setIsSaving(true);
    setSaveMessage(null);
    setSaveError(null);

    try {
      await updateStudentProfile(membershipId, {
        phone: profile.phone || null,
        address: profile.address || null,
        courseName: profile.courseName || null,
        specialization: profile.specialization || null,
        skills: profile.skills
          .split(",")
          .map((skill) => skill.trim())
          .filter(Boolean),
        hireStatus: profile.hireStatus,
        jobType: profile.jobType,
        workplacePreference: profile.workplacePreference,
        currentEmployer: profile.currentEmployer || null,
        currentPosition: profile.currentPosition || null,
        portfolioUrl: profile.portfolioUrl || null,
        linkedinUrl: profile.linkedinUrl || null,
      });
      setSaveMessage("Profile updated successfully.");
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (error) {
      setSaveError(error instanceof ApiError ? error.message : "Could not save your profile.");
    } finally {
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
    <div className={styles.inputField}>
      <label>{label}</label>
      {children}
    </div>
  );

  if (!isAuthorized) {
    return null;
  }

  if (isLoading) {
    return (
      <div className={styles.card}>
        <p>Loading your profile…</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className={styles.card}>
        <p>{loadError}</p>
      </div>
    );
  }

  return (
    <motion.div
      className={styles.card}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
    >
      <div className={styles.headerContent}>
        <motion.div
          className={styles.avatarContainer}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
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
          <motion.div variants={itemVariants}>
            <TextField
              label="Phone Number"
              name="phone"
              value={profile.phone}
              onChange={handleChange}
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

          <motion.div variants={itemVariants}>
            <InputField label="Hire Status">
              <select
                name="hireStatus"
                value={profile.hireStatus}
                onChange={handleChange}
                className={styles.select}
              >
                <option value="STUDENT_ONLY">Student Only</option>
                <option value="JOB_SEEKING">Actively Looking</option>
                <option value="EMPLOYED">Employed</option>
                <option value="FREELANCING">Freelancing</option>
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
                <option value="NOT_LOOKING">Not Looking</option>
                <option value="INTERNSHIP">Internship</option>
                <option value="PART_TIME">Part-Time</option>
                <option value="FULL_TIME">Full-Time</option>
                <option value="FREELANCE">Freelance</option>
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
                <option value="NO_PREFERENCE">No Preference</option>
                <option value="REMOTE">Remote</option>
                <option value="HYBRID">Hybrid</option>
                <option value="ONSITE">On-Site</option>
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

        <motion.div className={styles.actions} variants={itemVariants}>
          {saveError && <span className={styles.errorText}>{saveError}</span>}
          {saveMessage && (
            <motion.span
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={styles.successText}
            >
              {saveMessage}
            </motion.span>
          )}
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
