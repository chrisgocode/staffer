# Releases and previews

## Releases

Merges to `main` don't deploy. [release-please](https://github.com/googleapis/release-please) keeps a release PR open that collects every Conventional Commit merged since the last release (`feat:`, `fix:`, …) and bumps the version and `CHANGELOG.md`. Merging that PR tags `vX.Y.Z` and runs `.github/workflows/deploy.yml`, which deploys Convex first and then Vercel production from the tag, after approval in the `Production` environment.

To redeploy or roll back, run the **Deploy** workflow by hand with an earlier release tag. Only `vX.Y.Z` tags on `main` are accepted.

## PR previews

Vercel's Git deployments are off for every branch (`vercel.json`), so pushing a branch deploys nothing. Add the `preview` label to a PR to deploy it to its own Convex preview backend (`pr-<number>`) and a Vercel preview; the URL is posted as a comment and every later push redeploys. Removing the label, or closing or merging the PR, deletes both.

The preview job runs the PR's code with `VERCEL_TOKEN`, so label a PR only after reading its diff. Fork PRs never get a preview.

### Google sign-in on previews

Each Convex preview backend has a new `*.convex.site` host, and Google only redirects to pre-registered URIs, so Google sign-in won't complete on a preview unless that preview's callback is registered with the OAuth client. Pages that don't need a signed-in user work as usual.

## Setup

GitHub repository secrets:

| Secret | What it is |
| --- | --- |
| `RELEASE_PLEASE_TOKEN` | Fine-grained PAT with Contents and Pull requests read/write on this repo. A PAT, because PRs opened with `GITHUB_TOKEN` don't trigger workflows. |
| `CONVEX_DEPLOY_KEY` | Convex **production** deploy key. |
| `CONVEX_PREVIEW_DEPLOY_KEY` | Convex **preview** deploy key. |
| `VERCEL_TOKEN` | Vercel access token scoped to the team. |

GitHub repository variables: `VERCEL_ORG_ID` and `VERCEL_PROJECT_ID` (from `.vercel/project.json` after `vercel link`).

In Convex, set the project's default environment variables for preview deployments (`AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, `JWT_PRIVATE_KEY`, `JWKS`, `ADMIN_EMAILS`, `STUDENT_EMAILS`, `HTTP_API_KEY`) so each new preview backend starts configured.

In Vercel, `vercel.json` sets the build command to `bun run build`, so Vercel never runs `convex deploy` itself; the workflows pass `NEXT_PUBLIC_CONVEX_URL` to every deployment.
