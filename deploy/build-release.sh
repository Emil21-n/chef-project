#!/usr/bin/env bash
set -euo pipefail

source_dir=/srv/chef-project/source
release_root=/srv/chef-project/releases
current_link=/srv/chef-project/current
env_file=/etc/chef-project/frontend.env
release_id="$(date -u +%Y%m%d%H%M%S)"
release_dir="${release_root}/${release_id}"

die() {
  printf 'error: %s\n' "$*" >&2
  exit 1
}

read_env_value() {
  local key="$1"
  local raw

  # Parse exactly one KEY=value line without evaluating the environment file.
  # This avoids executing shell syntax that may legitimately occur in secrets.
  raw="$(awk -v key="$key" '
    index($0, key "=") == 1 {
      count += 1
      value = substr($0, length(key) + 2)
    }
    END {
      if (count != 1) exit 1
      print value
    }
  ' "$env_file")" || die "${key} must appear exactly once in ${env_file}"

  raw="${raw%$'\r'}"
  if [[ "$raw" == \"*\" && "$raw" == *\" ]]; then
    raw="${raw:1:${#raw}-2}"
  elif [[ "$raw" == \'*\' && "$raw" == *\' ]]; then
    raw="${raw:1:${#raw}-2}"
  fi

  printf '%s' "$raw"
}

[[ "${EUID}" -eq 0 ]] || die "run as root"
[[ -d "$source_dir" ]] || die "missing source directory: ${source_dir}"
[[ -r "$env_file" ]] || die "missing environment file: ${env_file}"
[[ ! -e "$release_dir" ]] || die "release already exists: ${release_dir}"

if find "$source_dir" -maxdepth 1 -type f -name '.env*' -print -quit \
  | grep -q .; then
  die "environment files must not be present in ${source_dir}"
fi

strapi_api_url="$(read_env_value NEXT_PUBLIC_STRAPI_API_URL)"
strapi_public_url="$(read_env_value NEXT_PUBLIC_STRAPI_PUBLIC_URL)"

for url in "$strapi_api_url" "$strapi_public_url"; do
  [[ "$url" =~ ^https://[A-Za-z0-9.-]+(:[0-9]+)?(/[^[:space:]]*)?$ ]] \
    || die "Strapi build URLs must be absolute HTTPS URLs"
done

previous_release=""
if [[ -L "$current_link" ]]; then
  previous_release="$(readlink -f "$current_link")"
fi

cd "$source_dir"

runuser -u chefapp -- env \
  NEXT_PUBLIC_STRAPI_API_URL="$strapi_api_url" \
  NEXT_PUBLIC_STRAPI_PUBLIC_URL="$strapi_public_url" \
  NEXT_TELEMETRY_DISABLED=1 \
  NODE_OPTIONS=--max-old-space-size=768 \
  npm ci --no-audit --no-fund

runuser -u chefapp -- env \
  NEXT_PUBLIC_STRAPI_API_URL="$strapi_api_url" \
  NEXT_PUBLIC_STRAPI_PUBLIC_URL="$strapi_public_url" \
  NEXT_TELEMETRY_DISABLED=1 \
  NODE_OPTIONS=--max-old-space-size=768 \
  npm run build

install -d -o chefapp -g chefapp "$release_dir"
runuser -u chefapp -- cp -a .next/standalone/. "$release_dir/"
install -d -o chefapp -g chefapp "$release_dir/.next"
runuser -u chefapp -- cp -a .next/static "$release_dir/.next/static"
runuser -u chefapp -- cp -a public "$release_dir/public"

ln -sfnT "$release_dir" "$current_link"
chown -h chefapp:chefapp "$current_link"

systemctl daemon-reload
systemctl enable chef-project.service

deployment_ok=false
if systemctl restart chef-project.service; then
  for _ in {1..20}; do
    if curl --fail --silent --show-error --max-time 5 \
      http://127.0.0.1:3000/api/health >/dev/null; then
      deployment_ok=true
      break
    fi
    sleep 2
  done
fi

if [[ "$deployment_ok" != true ]]; then
  if [[ -n "$previous_release" && -d "$previous_release" ]]; then
    ln -sfnT "$previous_release" "$current_link"
    chown -h chefapp:chefapp "$current_link"
    systemctl restart chef-project.service || true
  fi
  die "release health check failed; previous release restored when available"
fi

# Keep the current release plus the two newest rollback candidates. Only
# timestamp-named directories below the explicit release root are eligible.
mapfile -t releases < <(
  find "$release_root" -mindepth 1 -maxdepth 1 -type d \
    -regextype posix-extended -regex '.*/[0-9]{14}' -printf '%T@ %p\n' \
    | sort -nr \
    | cut -d' ' -f2-
)

for ((index = 3; index < ${#releases[@]}; index += 1)); do
  candidate="${releases[$index]}"
  if [[ "$candidate" =~ ^${release_root}/[0-9]{14}$ ]] \
    && [[ "$(readlink -f "$current_link")" != "$candidate" ]]; then
    rm -rf -- "$candidate"
  fi
done

printf 'release=%s\n' "$release_id"
