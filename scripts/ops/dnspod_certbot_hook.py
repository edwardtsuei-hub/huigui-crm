#!/usr/bin/env python3
"""Certbot manual auth/cleanup hook for Tencent Cloud DNSPod.

This hook uses DNSPod's API v3 (TC3-HMAC-SHA256) to create and delete the
TXT records needed for DNS-01 challenges.
"""

from __future__ import annotations

import hashlib
import hmac
import json
import os
import shutil
import subprocess
import sys
import time
import urllib.error
import urllib.request
from dataclasses import dataclass
from datetime import datetime, timezone

API_ENDPOINT = "https://dnspod.tencentcloudapi.com"
API_HOST = "dnspod.tencentcloudapi.com"
API_SERVICE = "dnspod"
API_VERSION = "2021-03-23"
ALGORITHM = "TC3-HMAC-SHA256"


class HookError(RuntimeError):
    """Raised for expected operational failures."""


def env(name: str, default: str | None = None) -> str | None:
    value = os.getenv(name)
    if value is None or value == "":
        return default
    return value


def env_required(*names: str) -> str:
    for name in names:
        value = env(name)
        if value is not None:
            return value
    joined = ", ".join(names)
    raise HookError(f"missing required environment variable: one of {joined}")


def log(message: str) -> None:
    print(f"[dnspod-certbot] {message}", file=sys.stderr)


@dataclass(frozen=True)
class ChallengeContext:
    identifier: str
    validation: str
    root_domain: str
    subdomain: str
    fqdn: str
    record_line: str
    ttl: int
    propagation_seconds: int
    propagation_interval: int


class TencentDnsPodClient:
    def __init__(self, secret_id: str, secret_key: str) -> None:
        self.secret_id = secret_id
        self.secret_key = secret_key

    def request(self, action: str, payload: dict[str, object]) -> dict[str, object]:
        body = json.dumps(payload, separators=(",", ":"), ensure_ascii=False).encode("utf-8")
        now = int(time.time())
        date = datetime.fromtimestamp(now, tz=timezone.utc).strftime("%Y-%m-%d")

        canonical_headers = (
            "content-type:application/json; charset=utf-8\n"
            f"host:{API_HOST}\n"
            f"x-tc-action:{action.lower()}\n"
        )
        signed_headers = "content-type;host;x-tc-action"
        hashed_request_payload = hashlib.sha256(body).hexdigest()
        canonical_request = "\n".join(
            [
                "POST",
                "/",
                "",
                canonical_headers,
                signed_headers,
                hashed_request_payload,
            ]
        )

        credential_scope = f"{date}/{API_SERVICE}/tc3_request"
        string_to_sign = "\n".join(
            [
                ALGORITHM,
                str(now),
                credential_scope,
                hashlib.sha256(canonical_request.encode("utf-8")).hexdigest(),
            ]
        )

        secret_date = hmac.new(
            f"TC3{self.secret_key}".encode("utf-8"),
            date.encode("utf-8"),
            hashlib.sha256,
        ).digest()
        secret_service = hmac.new(secret_date, API_SERVICE.encode("utf-8"), hashlib.sha256).digest()
        secret_signing = hmac.new(secret_service, b"tc3_request", hashlib.sha256).digest()
        signature = hmac.new(
            secret_signing,
            string_to_sign.encode("utf-8"),
            hashlib.sha256,
        ).hexdigest()

        authorization = (
            f"{ALGORITHM} Credential={self.secret_id}/{credential_scope}, "
            f"SignedHeaders={signed_headers}, Signature={signature}"
        )

        request = urllib.request.Request(
            API_ENDPOINT,
            data=body,
            method="POST",
            headers={
                "Authorization": authorization,
                "Content-Type": "application/json; charset=utf-8",
                "Host": API_HOST,
                "X-TC-Action": action,
                "X-TC-Timestamp": str(now),
                "X-TC-Version": API_VERSION,
            },
        )

        try:
            with urllib.request.urlopen(request, timeout=30) as response:
                raw = response.read()
        except urllib.error.HTTPError as exc:
            detail = exc.read().decode("utf-8", errors="replace")
            raise HookError(f"{action} failed with HTTP {exc.code}: {detail}") from exc
        except urllib.error.URLError as exc:
            raise HookError(f"{action} failed: {exc}") from exc

        data = json.loads(raw.decode("utf-8"))
        response = data.get("Response", {})
        if "Error" in response:
            err = response["Error"]
            raise HookError(
                f"{action} failed: {err.get('Code', 'Unknown')} - {err.get('Message', 'Unknown error')}"
            )
        return response


def load_context() -> ChallengeContext:
    identifier = env("CERTBOT_IDENTIFIER", env_required("CERTBOT_DOMAIN")).strip().rstrip(".")
    validation = env_required("CERTBOT_VALIDATION").strip()
    root_domain = env_required("DNSPOD_ROOT_DOMAIN").strip().rstrip(".")
    if identifier != root_domain and not identifier.endswith(f".{root_domain}"):
        raise HookError(
            f"identifier {identifier!r} is not under DNSPOD_ROOT_DOMAIN {root_domain!r}"
        )

    remainder = identifier[: -len(root_domain)].rstrip(".")
    subdomain = "_acme-challenge" if not remainder else f"_acme-challenge.{remainder}"
    fqdn = f"{subdomain}.{root_domain}"

    return ChallengeContext(
        identifier=identifier,
        validation=validation,
        root_domain=root_domain,
        subdomain=subdomain,
        fqdn=fqdn,
        record_line=env("DNSPOD_RECORD_LINE", "默认"),
        ttl=int(env("DNSPOD_TTL", "60")),
        propagation_seconds=int(env("DNSPOD_PROPAGATION_SECONDS", "30")),
        propagation_interval=int(env("DNSPOD_PROPAGATION_INTERVAL", "5")),
    )


def list_matching_records(client: TencentDnsPodClient, ctx: ChallengeContext) -> list[dict[str, object]]:
    response = client.request(
        "DescribeRecordList",
        {
            "Domain": ctx.root_domain,
            "Subdomain": ctx.subdomain,
            "RecordType": "TXT",
            "RecordLine": ctx.record_line,
            "Limit": 3000,
            "Offset": 0,
            "ErrorOnEmpty": "no",
        },
    )
    records = response.get("RecordList", [])
    if not isinstance(records, list):
        return []
    matches = []
    for record in records:
        if not isinstance(record, dict):
            continue
        if str(record.get("Value", "")) != ctx.validation:
            continue
        matches.append(record)
    return matches


def create_record(client: TencentDnsPodClient, ctx: ChallengeContext) -> int:
    existing = list_matching_records(client, ctx)
    if existing:
        record_id = int(existing[0]["RecordId"])
        log(f"reusing existing TXT record #{record_id} for {ctx.fqdn}")
        return record_id

    response = client.request(
        "CreateRecord",
        {
            "Domain": ctx.root_domain,
            "SubDomain": ctx.subdomain,
            "RecordType": "TXT",
            "RecordLine": ctx.record_line,
            "Value": ctx.validation,
            "TTL": ctx.ttl,
            "Status": "ENABLE",
            "Remark": env("DNSPOD_CERTBOT_REMARK", "certbot-dns-01"),
        },
    )
    record_id = int(response["RecordId"])
    log(f"created TXT record #{record_id} for {ctx.fqdn}")
    return record_id


def delete_record(client: TencentDnsPodClient, ctx: ChallengeContext, record_id: int) -> None:
    client.request(
        "DeleteRecord",
        {
            "Domain": ctx.root_domain,
            "RecordId": record_id,
        },
    )
    log(f"deleted TXT record #{record_id} for {ctx.fqdn}")


def wait_for_authoritative_dns(ctx: ChallengeContext) -> None:
    dig = shutil.which("dig")
    if dig is None:
        log(
            f"'dig' not found, sleeping {ctx.propagation_seconds}s before continuing DNS validation"
        )
        time.sleep(ctx.propagation_seconds)
        return

    try:
        ns_proc = subprocess.run(
            [dig, "+short", ctx.root_domain, "NS"],
            check=True,
            capture_output=True,
            text=True,
        )
    except subprocess.CalledProcessError as exc:
        log(f"failed to query NS for {ctx.root_domain}: {exc}; sleeping {ctx.propagation_seconds}s")
        time.sleep(ctx.propagation_seconds)
        return

    nameservers = [line.strip().rstrip(".") for line in ns_proc.stdout.splitlines() if line.strip()]
    if not nameservers:
        log(f"no authoritative NS returned for {ctx.root_domain}; sleeping {ctx.propagation_seconds}s")
        time.sleep(ctx.propagation_seconds)
        return

    deadline = time.time() + ctx.propagation_seconds
    unresolved = set(nameservers)
    while time.time() < deadline and unresolved:
        for nameserver in tuple(unresolved):
            try:
                record_proc = subprocess.run(
                    [dig, "+short", ctx.fqdn, "TXT", f"@{nameserver}"],
                    check=True,
                    capture_output=True,
                    text=True,
                )
            except subprocess.CalledProcessError:
                continue
            values = [
                line.strip().strip('"')
                for line in record_proc.stdout.splitlines()
                if line.strip()
            ]
            if ctx.validation in values:
                unresolved.discard(nameserver)
        if unresolved:
            time.sleep(ctx.propagation_interval)

    if unresolved:
        raise HookError(
            f"TXT record for {ctx.fqdn} was not visible on authoritative NS within "
            f"{ctx.propagation_seconds}s: {', '.join(sorted(unresolved))}"
        )

    log(f"authoritative TXT propagation confirmed for {ctx.fqdn}")


def handle_auth(client: TencentDnsPodClient, ctx: ChallengeContext) -> int:
    record_id = create_record(client, ctx)
    wait_for_authoritative_dns(ctx)
    print(
        json.dumps(
            {
                "record_id": record_id,
                "root_domain": ctx.root_domain,
                "subdomain": ctx.subdomain,
                "fqdn": ctx.fqdn,
                "value": ctx.validation,
            },
            separators=(",", ":"),
        )
    )
    return 0


def parse_auth_output() -> int | None:
    raw = env("CERTBOT_AUTH_OUTPUT")
    if raw is None:
        return None
    try:
        payload = json.loads(raw)
    except json.JSONDecodeError:
        return None
    record_id = payload.get("record_id")
    if record_id is None:
        return None
    try:
        return int(record_id)
    except (TypeError, ValueError):
        return None


def handle_cleanup(client: TencentDnsPodClient, ctx: ChallengeContext) -> int:
    record_id = parse_auth_output()
    if record_id is not None:
        try:
            delete_record(client, ctx, record_id)
            return 0
        except HookError as exc:
            log(f"cleanup using CERTBOT_AUTH_OUTPUT failed, falling back to search: {exc}")

    matches = list_matching_records(client, ctx)
    if not matches:
        log(f"no matching TXT record found for {ctx.fqdn}; nothing to clean up")
        return 0

    for record in matches:
        delete_record(client, ctx, int(record["RecordId"]))
    return 0


def main(argv: list[str]) -> int:
    if len(argv) != 2 or argv[1] not in {"auth", "cleanup"}:
        print(f"usage: {argv[0]} auth|cleanup", file=sys.stderr)
        return 2

    try:
        secret_id = env_required("TENCENTCLOUD_SECRET_ID", "DNSPOD_SECRET_ID")
        secret_key = env_required("TENCENTCLOUD_SECRET_KEY", "DNSPOD_SECRET_KEY")
        client = TencentDnsPodClient(secret_id=secret_id, secret_key=secret_key)
        ctx = load_context()
        if argv[1] == "auth":
            return handle_auth(client, ctx)
        return handle_cleanup(client, ctx)
    except HookError as exc:
        log(str(exc))
        return 1


if __name__ == "__main__":
    sys.exit(main(sys.argv))
