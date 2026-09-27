# Keeper production deployment

Author: Alex Picon <alexnpc@me.com>

Every push to `main` runs the API regression tests, then uploads that exact commit to Vultr over SSH. `deploy/release.sh` serializes releases, builds an image, checks a candidate container, and rolls back if the production health check fails. The previous container is retained for rollback.

GitHub Actions secrets: `VULTR_HOST`, `VULTR_SSH_KEY`, `VULTR_KNOWN_HOSTS`. SSH uses a dedicated deployment key and pinned host keys. Environment configuration lives outside releases at `/opt/keeper/shared/.env` with mode 600; deployments never overwrite it.

Caddy serves `keeper-ai.tech` and `www.keeper-ai.tech` over HTTPS and proxies to the app bound to loopback. The full environment file is mounted read-only into the app container and is never included in Git or the Docker image.

Server: Ubuntu 24.04, Vultr Atlanta, 1 CPU / 1 GB, $5/month before taxes and usage extras. API provider usage is billed separately. Runtime runs as the deployment user. Ports 80 and 443 are public; port 8888 is local only.

Check `/healthz`, `/keeper/?story=bread`, and `/slides/keeper/` after deployment. Read `/opt/keeper/deployed-revision` to identify the running Git commit.
