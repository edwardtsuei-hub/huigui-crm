#!/usr/bin/env bash
set -euo pipefail
public_dir="/opt/huigui-crm/apps/web/public/employee-frontend/current/ops"
log_file="/var/log/huigui-employee-healthprobe.log"
alert_file="/var/log/huigui-employee-healthprobe.alert.log"
mkdir -p "$public_dir"
started_at="$(date -Is)"
status="passed"
issues="[]"
probe_json="[]"
add_probe() {
  local name="$1" url="$2" expected="$3" http_status body_excerpt item_status issue
  http_status="$(curl -k -sS -o /tmp/huigui-employee-probe-body -w '%{http_code}' --max-time 8 "$url" 2>/tmp/huigui-employee-probe-error || true)"
  body_excerpt="$(head -c 160 /tmp/huigui-employee-probe-body 2>/dev/null | tr '\n' ' ' | sed 's/["\\]/_/g')"
  item_status="passed"
  issue=""
  if [ "$http_status" != "$expected" ]; then
    item_status="failed"
    issue="expected ${expected}, got ${http_status}"
  fi
  if [ "$item_status" != "passed" ]; then status="blocked"; fi
  probe_json="$(node -e 'const arr=JSON.parse(process.argv[1]); arr.push({name:process.argv[2],url:process.argv[3],expectedHttpStatus:Number(process.argv[4]),httpStatus:Number(process.argv[5])||0,status:process.argv[6],issue:process.argv[7],bodyPreview:process.argv[8]}); process.stdout.write(JSON.stringify(arr));' "$probe_json" "$name" "$url" "$expected" "$http_status" "$item_status" "$issue" "$body_excerpt")"
}
add_probe "frontend-root" "https://management.hui-health.com/" "200"
add_probe "frontend-mobile" "https://management.hui-health.com/mobile" "200"
add_probe "api-health" "https://management.hui-health.com/api/health" "200"
compose_status="$(docker compose -f /opt/huigui-crm/docker-compose.yml ps --format json 2>/dev/null | node -e 'const fs=require("fs"); const input=fs.readFileSync(0,"utf8").trim().split(/\n+/).filter(Boolean).map(line=>{try{return JSON.parse(line)}catch{return null}}).filter(Boolean); const services=input.map(item=>({name:item.Name||item.Service,service:item.Service,state:item.State,status:item.Status,health:item.Health||""})); const bad=services.filter(item=>item.state!=="running" || /unhealthy/i.test(item.health)); process.stdout.write(JSON.stringify({services,badCount:bad.length}));' )"
bad_count="$(node -e 'const v=JSON.parse(process.argv[1]); process.stdout.write(String(v.badCount||0));' "$compose_status")"
if [ "$bad_count" != "0" ]; then status="blocked"; fi
finished_at="$(date -Is)"
summary="$(node -e 'const probes=JSON.parse(process.argv[1]); const compose=JSON.parse(process.argv[2]); const status=process.argv[3]; const startedAt=process.argv[4]; const finishedAt=process.argv[5]; const failed=probes.filter(p=>p.status!=="passed"); const issues=[...failed.map(p=>`${p.name}: ${p.issue}`), ...(compose.badCount? [`docker compose bad services: ${compose.badCount}`]:[])]; process.stdout.write(JSON.stringify({generatedAt:finishedAt,startedAt,finishedAt,status,site:"https://management.hui-health.com",apiBaseUrl:"https://management.hui-health.com/api",probes,compose,issues}, null, 2));' "$probe_json" "$compose_status" "$status" "$started_at" "$finished_at")"
printf '%s\n' "$summary" > "$public_dir/employee-launch-status.json"
node -e 'const fs=require("fs"); const s=JSON.parse(fs.readFileSync(process.argv[1],"utf8")); const rows=s.probes.map(p=>`<tr><td>${p.name}</td><td>${p.httpStatus}</td><td>${p.status}</td><td>${p.issue||""}</td></tr>`).join(""); const services=s.compose.services.map(x=>`<tr><td>${x.service}</td><td>${x.name}</td><td>${x.state}</td><td>${x.health||x.status||""}</td></tr>`).join(""); const html=`<!doctype html><meta charset="utf-8"><title>Employee Launch Monitoring</title><style>body{font-family:system-ui,-apple-system,Segoe UI,sans-serif;margin:32px;color:#172033}table{border-collapse:collapse;width:100%;margin:16px 0}td,th{border:1px solid #d7dde8;padding:8px;text-align:left}code{background:#f3f5f8;padding:2px 4px}.passed{color:#146c43}.blocked{color:#a61b1b}</style><h1>Employee Launch Monitoring</h1><p>Status: <strong class="${s.status}">${s.status}</strong></p><p>Generated: <code>${s.generatedAt}</code></p><p>Site: <code>${s.site}</code></p><h2>HTTP probes</h2><table><tr><th>Name</th><th>HTTP</th><th>Status</th><th>Issue</th></tr>${rows}</table><h2>Docker services</h2><table><tr><th>Service</th><th>Container</th><th>State</th><th>Health</th></tr>${services}</table><h2>Issues</h2><pre>${s.issues.join("\n")||"none"}</pre>`; fs.writeFileSync(process.argv[2], html);' "$public_dir/employee-launch-status.json" "$public_dir/employee-launch-monitoring.html"
line="${finished_at} status=${status} probes=$(node -e 'const p=JSON.parse(process.argv[1]); process.stdout.write(String(p.filter(x=>x.status==="passed").length)+"/"+String(p.length));' "$probe_json") badContainers=${bad_count}"
echo "$line" >> "$log_file"
tail -n 80 "$log_file" | sed 's/&/\&amp;/g;s/</\&lt;/g;s/>/\&gt;/g' | awk 'BEGIN{print "<!doctype html><meta charset=\"utf-8\"><title>Employee Launch Logs</title><style>body{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;margin:32px;color:#172033;white-space:pre-wrap}</style><h1>Employee Launch Healthprobe Logs</h1><pre>"} {print} END{print "</pre>"}' > "$public_dir/employee-launch-logs.html"
if [ "$status" != "passed" ]; then
  echo "$line" >> "$alert_file"
  logger -t huigui-employee-healthprobe "$line"
fi
