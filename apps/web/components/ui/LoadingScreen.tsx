import styles from "./LoadingScreen.module.css";

/** Full-viewport loading state for the brief window while we resolve whether a session is valid. */
export function LoadingScreen() {
  return (
    <div className={styles.screen} role="status" aria-label="Loading">
      <span className={styles.spinner} />
    </div>
  );
}
