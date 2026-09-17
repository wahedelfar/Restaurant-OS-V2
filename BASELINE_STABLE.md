# Restaurant OS V2 — Stable Baseline

## Baseline
- Branch: `baseline-stable-2026-09-18`
- Commit: `1a04f71559962963a5ebdd2a7d36895e01055324`
- Date: 2026-09-18
- Purpose: recovery/reference baseline for the integrated Admin, Delivery/GPS/Driver/Tracking, Kitchen, Products, image upload, sidebar, and current production runtime.

## Rule
Do not develop directly on this branch. Treat it as a frozen recovery reference. If `main` develops a regression, compare against this commit/branch first and recover only the affected files or create a controlled rollback from this exact baseline.

## Important
This baseline includes the product save/image fix committed immediately before the branch was created. Verify the corresponding Vercel deployment is READY before treating production as fully validated.
