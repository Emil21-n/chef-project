# Production deployment

These files describe the production Next.js service, Nginx reverse proxy and
atomic release process for `chefschoice-turk.ru`. No credentials or environment
values belong in this directory.

## Prerequisites

- Ubuntu/Debian host with Nginx, `curl`, Node.js 22 and npm installed.
- A system user and group named `chefapp`.
- `/srv/chef-project/source` and `/srv/chef-project/releases`, owned by
  `chefapp:chefapp`.
- A valid Let's Encrypt certificate at
  `/etc/letsencrypt/live/chefschoice-turk.ru/` and the standard Certbot Nginx
  TLS files referenced by `nginx.conf`.
- DNS for the apex and `www` names pointed at the server.

The Strapi Cloud hostname and YooKassa webhook networks in the Nginx files are
public deployment identifiers. Recheck the webhook network list against the
[official YooKassa documentation](https://yookassa.ru/developers/using-api/webhooks)
when installing or reviewing the configuration.

## Environment

Provision `/etc/chef-project/frontend.env` outside Git through the project's
secret-management process. It must be owned by `root:root`, mode `0600`, and
contain the application's required variables:

- `NEXT_PUBLIC_STRAPI_API_URL`, `NEXT_PUBLIC_STRAPI_PUBLIC_URL`,
  `STRAPI_API_TOKEN` and `SITE_URL`;
- `YOOKASSA_SHOP_ID`, `YOOKASSA_SECRET_KEY` and the receipt settings used by
  the application;
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD` and
  `ORDER_NOTIFICATION_EMAIL`.

Do not copy the environment file into the repository, release directory or a
shell history.

## Install configuration

Run from the repository root as `root`. Back up any existing configuration
before replacing it:

```bash
stamp="$(date -u +%Y%m%d%H%M%S)"
install -d -m 0755 /etc/nginx/snippets
for live_file in \
  /etc/nginx/sites-available/chef-project \
  /etc/nginx/snippets/chef-strapi-admin.conf \
  /etc/systemd/system/chef-project.service; do
  if [[ -e "$live_file" ]]; then
    cp -a "$live_file" "${live_file}.bak-${stamp}"
  fi
done

install -m 0644 deploy/nginx.conf /etc/nginx/sites-available/chef-project
install -m 0644 deploy/strapi-admin-proxy.conf /etc/nginx/snippets/chef-strapi-admin.conf
install -m 0644 deploy/chef-project.service /etc/systemd/system/chef-project.service
install -m 0700 deploy/build-release.sh /usr/local/sbin/chef-project-build-release
ln -sfn /etc/nginx/sites-available/chef-project /etc/nginx/sites-enabled/chef-project

nginx -t
systemctl daemon-reload
systemctl reload nginx
```

## Deploy a release

Synchronize only the frontend source into `/srv/chef-project/source`, excluding
local build output, dependencies and every environment file. Then run the
release builder:

```bash
rsync -a --delete --delete-excluded \
  --exclude node_modules \
  --exclude .next \
  --exclude '.env*' \
  frontend/ /srv/chef-project/source/
chown -R chefapp:chefapp /srv/chef-project/source
/usr/local/sbin/chef-project-build-release
```

The script performs `npm ci`, builds the standalone Next.js bundle, switches
the `current` symlink atomically, restarts the service, and checks the local
health endpoint. If that check fails, it restores the previous release when
one exists. Three timestamped releases are retained.

## Verify

```bash
systemctl is-active nginx chef-project.service
nginx -t
curl --fail --silent --show-error http://127.0.0.1:3000/api/health
curl --fail --silent --show-error https://chefschoice-turk.ru/api/health
curl --head https://www.chefschoice-turk.ru/
curl --head https://chefschoice-turk.ru/admin
curl --head https://chefschoice-turk.ru/robots.txt
curl --head https://chefschoice-turk.ru/sitemap.xml
```

Expected results include an active service, successful health responses, one
permanent redirect from `www` to the apex domain, `X-Robots-Tag` on the Strapi
admin proxy, and HTTP 200 for the SEO files. Also review recent logs:

```bash
journalctl -u chef-project.service --since '-10 minutes' --no-pager
tail -n 100 /var/log/nginx/error.log
```

An end-to-end paid-order test must use a deliberately approved low-value test
order and verify both YooKassa state and delivery of the order email; the health
checks above do not create a payment.

## Rollback

List releases, select the last known-good timestamp, switch the symlink, and
verify health:

```bash
readlink -f /srv/chef-project/current
find /srv/chef-project/releases -mindepth 1 -maxdepth 1 -type d -name '??????????????' -print
ln -sfnT /srv/chef-project/releases/YYYYMMDDHHMMSS /srv/chef-project/current
chown -h chefapp:chefapp /srv/chef-project/current
systemctl restart chef-project.service
curl --fail --silent --show-error http://127.0.0.1:3000/api/health
```

For an Nginx or systemd rollback, restore the timestamped backup made during
installation, run `nginx -t` and `systemctl daemon-reload`, then reload Nginx
and restart the application service.
