# Cloudflare Deployment

VetList deploys as a Cloudflare Worker with static assets from the local Astro build.

## Normal Live Update Flow

1. Make and verify code/data changes locally.
2. Run `npm run build`.
   - The `prebuild` step runs `scripts/precompute-site-data.js`.
   - Astro writes the generated static site to `dist/`.
3. Run `npm run deploy`.
   - This calls `wrangler deploy`.
   - `wrangler.toml` points Cloudflare to `worker/index.js` and serves `dist/` via the `ASSETS` binding.
4. Push the code changes to GitHub with `git push origin main`.

For one command after committing, use:

```bash
npm run build:deploy
```

## What Gets Deployed

- `worker/index.js` handles Worker requests and redirects `www.vetlist.org` to `vetlist.org`.
- `dist/` contains the locally built Astro pages and assets.
- `wrangler.toml` maps both `vetlist.org` and `www.vetlist.org` to the Worker.

## Notes

- `data/derived/` is ignored by git. It is regenerated during `npm run build`.
- `dist/` is a build artifact. The deployed content comes from the local `dist/` uploaded by Wrangler.
- Run a focused check after build when changing routes, for example:

```bash
test -f dist/canada/quebec/montreal/index.html
rg "bad-slug" dist/canada/quebec/index.html
```

## Current Package Scripts

- `npm run build`: precomputes data and builds Astro into `dist/`.
- `npm run deploy`: deploys the Worker and `dist/` assets to Cloudflare.
- `npm run build:deploy`: builds and deploys in sequence.
