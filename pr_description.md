## What does this PR do?

This PR standardizes user feedback by migrating the entire `apps/web` frontend to a new, centralized notification system. The refactor replaces scattered and inconsistent methods of displaying success or error messages (such as local state variables, browser alerts, and console logs) with a single, robust `notify` utility. This change significantly improves code maintainability, reduces boilerplate, and provides a more consistent and professional user experience.

## Which module(s)?

- `apps/web`

## Key Changes

The core of this PR is the systematic refactoring of all `.tsx` files, including pages and interactive client components, that perform asynchronous operations or handle user-driven events. The following protocol was applied to each file:

1.  **Standardized Imports:** The `notify` utility was imported from `@/lib/toast` wherever needed.
2.  **Anti-Pattern Removal:** Legacy notification patterns were hunted down and eliminated, including:
    -   `useState` hooks for managing local error and success messages.
    -   `setTimeout` calls used to manually clear messages.
    -   Primitive `alert()` dialogs.
    -   Raw `console.error()` calls inside `catch` blocks, which are now channeled through the notification system.
3.  **Robust Async Handling:** All asynchronous logic (e.g., form submissions, API requests) was wrapped in a consistent `try/catch/finally` structure:
    -   **`try`**: Executes the primary business logic and triggers a `notify.success()` call on completion.
    -   **`catch`**: Catches any thrown errors and passes them to `notify.error()`, which gracefully handles `ApiError` objects and provides fallback messages.
    -   **`finally`**: Resets loading states (e.g., `setIsLoading(false)`), ensuring the UI is always responsive, even after an error.
4.  **Simplified JSX:** All conditional rendering logic tied to the old local message state has been removed, resulting in cleaner and more readable component templates.

These changes ensure that all user-facing notifications are delivered through a single, consistent, and aesthetically pleasing toast-based system.

## Checklist
- [x] Tests added/updated for the change
- [x] lint and test pass locally
- [ ] If this changes schema.prisma, a migration is included
- [ ] If this adds/changes a permission, PERMISSION_MATRIX.md is updated
- [ ] If this changes setup/env steps, ONBOARDING_GUIDE.md is updated
