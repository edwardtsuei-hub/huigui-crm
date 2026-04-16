#!/usr/bin/env bash
set -euo pipefail

DOMAIN="${CRM_DOMAIN:-crm.hui-health.com}"
EXPECTED_IP="${CRM_IP:-}"
USERNAME="${CRM_USERNAME:-}"
PASSWORD="${CRM_PASSWORD:-}"

http_url="http://${DOMAIN}/login"
https_login_url="https://${DOMAIN}/login"
https_health_url="https://${DOMAIN}/api/health"
https_auth_url="https://${DOMAIN}/api/auth/login"

curl_args=(--noproxy "*" --silent --show-error --connect-timeout 8 --max-time 20)
resolve_args=()

if [[ -n "${EXPECTED_IP}" ]]; then
  resolve_args=(
    --resolve "${DOMAIN}:80:${EXPECTED_IP}"
    --resolve "${DOMAIN}:443:${EXPECTED_IP}"
  )
fi

assert_contains() {
  local haystack="$1"
  local needle="$2"
  local message="$3"

  if [[ "${haystack}" != *"${needle}"* ]]; then
    printf 'Check failed: %s\n' "${message}" >&2
    exit 1
  fi
}

assert_status() {
  local actual="$1"
  local expected="$2"
  local message="$3"

  if [[ "${actual}" != "${expected}" ]]; then
    printf 'Check failed: %s (got %s)\n' "${message}" "${actual}" >&2
    exit 1
  fi
}

printf 'Checking HTTP redirect for %s\n' "${http_url}"
http_headers="$(curl "${curl_args[@]}" "${resolve_args[@]}" -I "${http_url}")"
assert_contains "${http_headers}" "Location: https://${DOMAIN}/login" "HTTP login should redirect to HTTPS login"

printf 'Checking HTTPS login page for %s\n' "${https_login_url}"
https_status="$(
  curl "${curl_args[@]}" "${resolve_args[@]}" -o /dev/null -w '%{http_code}' "${https_login_url}"
)"
assert_status "${https_status}" "200" "HTTPS login page should return 200"

printf 'Checking HTTPS health endpoint for %s\n' "${https_health_url}"
health_body="$(curl "${curl_args[@]}" "${resolve_args[@]}" "${https_health_url}")"
assert_contains "${health_body}" '"status":"ok"' "Health endpoint should report ok"

if [[ -n "${USERNAME}" && -n "${PASSWORD}" ]]; then
  printf 'Checking HTTPS login API for %s\n' "${DOMAIN}"
  login_body="$(
    curl "${curl_args[@]}" "${resolve_args[@]}" \
      -H "Content-Type: application/json" \
      --data-binary "{\"username\":\"${USERNAME}\",\"password\":\"${PASSWORD}\"}" \
      "${https_auth_url}"
  )"
  assert_contains "${login_body}" '"accessToken"' "Login API should return an access token"
fi

printf 'HTTPS regression checks passed for %s\n' "${DOMAIN}"
