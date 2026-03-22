# Windows Packaging And GitHub Release Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add Windows packaging targets and a GitHub Actions release workflow that builds macOS and Windows artifacts and uploads them to GitHub Releases.

**Architecture:** Extend the existing `electron-builder` configuration instead of introducing a second packaging path. Keep release automation in a single GitHub Actions workflow with separate macOS and Windows build jobs, then publish collected artifacts to a tagged GitHub Release.

**Tech Stack:** Electron, electron-builder, Node.js test runner, GitHub Actions

---

### Task 1: Lock the desired packaging contract with tests

**Files:**
- Modify: `src/main/packaging-config.test.ts`
- Test: `src/main/packaging-config.test.ts`

**Step 1: Write the failing test**

Add one test that asserts `package.json` exposes a Windows `build.win.target` including `nsis` and `zip`.

Add one test that asserts `.github/workflows/release.yml` exists and contains:
- `workflow_dispatch`
- tag trigger for `v*`
- macOS and Windows jobs
- `npm run dist -- --mac --arm64`
- `npm run dist -- --win --x64`
- release publication step

**Step 2: Run test to verify it fails**

Run: `node --test dist-electron/src/main/packaging-config.test.js`
Expected: FAIL because the Windows config and workflow do not exist yet.

**Step 3: Write minimal implementation**

Implement only the config and workflow content needed to satisfy the tests.

**Step 4: Run test to verify it passes**

Run: `npm run build:main && node --test dist-electron/src/main/packaging-config.test.js`
Expected: PASS

### Task 2: Add Windows packaging targets

**Files:**
- Modify: `package.json`

**Step 1: Extend builder config**

Add a `build.win` section with `target` entries for:
- `nsis`
- `zip`

Keep the existing macOS config untouched unless a shared field is required.

**Step 2: Keep artifact generation compatible with the existing wrapper**

Do not replace the existing `package` / `dist` scripts. The workflow should continue using `scripts/run-electron-builder.mjs` with platform arguments.

**Step 3: Re-run targeted verification**

Run: `npm run build:main && node --test dist-electron/src/main/packaging-config.test.js`
Expected: PASS

### Task 3: Add GitHub Release workflow

**Files:**
- Create: `.github/workflows/release.yml`
- Optionally Modify: `README.md`

**Step 1: Add workflow triggers and permissions**

Create a workflow that triggers on:
- `push` tags matching `v*`
- `workflow_dispatch`

Grant:
- `contents: write`

**Step 2: Add macOS build job**

Use a macOS runner to:
- checkout
- setup Node
- `npm ci`
- `npm run lint`
- `npm run build`
- `node --test dist-electron/src/**/*.test.js`
- `npm run dist -- --mac --arm64`
- upload mac artifacts as workflow artifacts

**Step 3: Add Windows build job**

Use a Windows runner to:
- checkout
- setup Node
- `npm ci`
- `npm run lint`
- `npm run build`
- `node --test dist-electron/src/**/*.test.js`
- `npm run dist -- --win --x64`
- upload Windows artifacts as workflow artifacts

**Step 4: Add release publish job**

After both build jobs succeed:
- download workflow artifacts
- create or update the GitHub Release for the tag
- upload the packaged assets

Prefer official GitHub tooling already present on runners over extra release-specific dependencies.

### Task 4: Document the release path

**Files:**
- Modify: `README.md`

**Step 1: Add a concise release section**

Document:
- local mac packaging commands
- the new GitHub workflow trigger
- how the GitHub Release gets populated
- the limitation that Windows packaging is produced in CI, not verified locally on macOS

**Step 2: Re-run broad verification**

Run:
- `npm run lint`
- `npm run build`
- `npm run build:main && node --test dist-electron/src/main/packaging-config.test.js`

Expected: PASS
