# StudentOS — Contribution Guidelines

This document outlines the standard process for contributing code to StudentOS.

## 1. Branch Naming Convention

All branches must follow this prefix pattern:

```
<type>/<short-description>
```

| Type        | Description                                          |
| ----------- | ---------------------------------------------------- |
| `feat/`     | New features or functionality                        |
| `fix/`      | Bug fixes                                            |
| `chore/`    | Tooling, workspace configurations, or dependencies   |
| `refactor/` | Code structure improvements with no behavior changes |
| `docs/`     | Documentation changes                                |

Example:
`feat/auth-signup-login`

## 2. Commit Messages

We follow the Conventional Commits specification:

```
<type>(<scope>): <short summary>
```

Scopes map to project modules (e.g., `auth`, `org`, `batch`, `session`, `attendance`, `ticket`, `fraud`, `student-import`, `notification`, `reports`, `platform-admin`).

Example:
`feat(auth): add password encryption helper`

## 3. Pull Requests

All pull requests must use the PR template and pass verification:

- Make sure code compiles cleanly: `npm run build`
- Ensure tests pass locally: `npm run test`
- Make sure linting passes locally: `npm run lint`

## 4. Code Review & Merging

- Every PR requires at least one approving review before merging.
- All merges to `main` must use the squash merge strategy.
