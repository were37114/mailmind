#!/usr/bin/env bash
set -euo pipefail

OPENCLAW_CFG="${OPENCLAW_CFG:-/root/.openclaw/openclaw.json}"
CUA_BIN="${CUA_BIN:-/root/.cua/cua}"
CUA_CONFIG_DIR="${CUA_CONFIG_DIR:-/root/.cua/config}"
DISPLAY_VAR="${DISPLAY:-:99}"
DEFAULT_RUNS_DIR="${DEFAULT_RUNS_DIR:-/root/.cua/runs}"

CMD_MODE="${1:-preflight}"
PREFLIGHT_EMITTED_SWITCH_TAG="false"
CUA_PID=""
MONITOR_PID=""

now_ts() {
  date -u +"%Y-%m-%dT%H:%M:%SZ"
}

emit_json() {
  python3 - <<'PY' "$@"
import json, sys
from datetime import datetime, timezone

args = sys.argv[1:]
obj = {}
for it in args:
  if "=" in it:
    k, v = it.split("=", 1)
    obj[k] = v
obj["ts"] = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
print(json.dumps(obj, ensure_ascii=False))
PY
}

progress() {
  emit_json "type=progress" "mode=${CMD_MODE}" "message=$1"
}

on_err() {
  code="${1:-1}"
  msg="${2:-unknown error}"
  emit_json "type=preflight_failed" "mode=${CMD_MODE}" "code=${code}" "message=${msg}"
  printf "preflight_failed: %s\n" "$msg" >&2
  if [[ "$CMD_MODE" == "preflight" && "$PREFLIGHT_EMITTED_SWITCH_TAG" != "true" ]]; then
    emit_json "type=computer_handoff" "mode=${CMD_MODE}" "reason=preflight_failed"
    printf "<computer-handoff />\n"
  fi
  exit "$code"
}

trap 'on_err "$?" "unexpected failure (exit=$?)"' ERR

on_int() {
  progress "signal_received=interrupt"
  if [[ -n "${CUA_PID:-}" ]]; then
    kill "$CUA_PID" >/dev/null 2>&1 || true
  fi
  if [[ -n "${MONITOR_PID:-}" ]]; then
    kill "$MONITOR_PID" >/dev/null 2>&1 || true
  fi
  printf "<computer-handoff />\n"
  exit 130
}

trap 'on_int' INT TERM

if [[ ! -f "$OPENCLAW_CFG" ]]; then
  on_err 2 "openclaw config not found: $OPENCLAW_CFG"
fi

if [[ ! -x "$CUA_BIN" ]]; then
  on_err 2 "cua binary not found or not executable: $CUA_BIN"
fi

MODEL_ID=""
BASE_URL=""
API_KEY=""
MULTIMODAL_SUPPORTED=""

resolve_runs_dir() {
  python3 - <<'PY' "$CUA_CONFIG_DIR" "$DEFAULT_RUNS_DIR"
import json, sys
from pathlib import Path

cfg_dir = Path(sys.argv[1])
fallback = str(sys.argv[2])

def load(p: Path):
  if not p.exists():
    return {}
  try:
    return json.loads(p.read_text(encoding="utf-8"))
  except Exception:
    return {}

local_cfg = load(cfg_dir / "local.json")
default_cfg = load(cfg_dir / "default.json")

def get_runs_dir(obj):
  agent = obj.get("agent", {}) if isinstance(obj, dict) else {}
  v = agent.get("runsDir")
  return v if isinstance(v, str) and v.strip() else ""

runs_dir = get_runs_dir(local_cfg) or get_runs_dir(default_cfg) or fallback
runs_dir = str(runs_dir).strip()
print(runs_dir)
PY
}

load_openclaw_context() {
  python3 - <<'PY' "$OPENCLAW_CFG"
import json, sys
from pathlib import Path

cfg = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))
primary = str(cfg["agents"]["defaults"]["model"]["primary"])
parts = primary.split("/", 1)
model_id = parts[-1]
provider_name = parts[0] if len(parts) > 1 else ""

providers = cfg.get("models", {}).get("providers", {})
provider = providers.get(provider_name, {})
base_url = str(provider.get("baseUrl", "")).strip().strip("`").strip().strip('"').strip("'")
api_key = str(provider.get("apiKey", "")).strip().strip("`").strip().strip('"').strip("'")

found = None
for p in providers.values():
  for m in p.get("models", []) or []:
    if str(m.get("id", "")) == model_id:
      found = m
      break
  if found:
    break

inputs = []
if isinstance(found, dict):
  inputs = found.get("input", []) or []
ok = "image" in set(map(str, inputs))

print(model_id)
print(base_url)
print(api_key)
print("true" if ok else "false")
PY
}

check_single_process() {
  if command -v pgrep >/dev/null 2>&1; then
    if pgrep -f "$CUA_BIN run" >/dev/null 2>&1; then
      on_err 1 "existing cua run process detected"
    fi
  fi
}

do_preflight() {
  progress "phase=preflight.start"
  mapfile -t ctx < <(load_openclaw_context)
  MODEL_ID="${ctx[0]:-}"
  BASE_URL="${ctx[1]:-}"
  API_KEY="${ctx[2]:-}"
  MULTIMODAL_SUPPORTED="${ctx[3]:-}"

  if [[ -z "$MODEL_ID" || -z "$BASE_URL" || -z "$API_KEY" || -z "$MULTIMODAL_SUPPORTED" ]]; then
    on_err 2 "failed to resolve model/base_url/api_key/multimodal from $OPENCLAW_CFG"
  fi

  emit_json "type=preflight_result" "mode=${CMD_MODE}" "model_id=${MODEL_ID}" "multimodal_supported=${MULTIMODAL_SUPPORTED}"
  if [[ "$MULTIMODAL_SUPPORTED" != "true" ]]; then
    PREFLIGHT_EMITTED_SWITCH_TAG="true"
    emit_json "type=model_switch_multimodal" "mode=${CMD_MODE}" "model_id=${MODEL_ID}"
    printf "<model-switch-multimodal />\n"
    exit 0
  fi
  check_single_process
  progress "phase=preflight.ok model_id=${MODEL_ID}"
}

do_run() {
  if [[ $# -lt 1 ]]; then
    echo "usage: $0 run <task_content>" >&2
    exit 2
  fi
  task="$1"
  do_preflight
  runs_dir="$(resolve_runs_dir)"
  if [[ -z "$runs_dir" ]]; then
    runs_dir="$DEFAULT_RUNS_DIR"
  fi
  progress "phase=run.prepare runs_dir=${runs_dir}"

  before_dirs=""
  if [[ -d "$runs_dir" ]]; then
    before_dirs="$(ls -1 "$runs_dir" 2>/dev/null | tr '\n' ' ')"
  fi

  progress "phase=run.start"
  DISPLAY="$DISPLAY_VAR" CUA_CONFIG_DIR="$CUA_CONFIG_DIR" "$CUA_BIN" run \
    --model "$MODEL_ID" \
    --base-url "$BASE_URL" \
    --api-key "$API_KEY" \
    "$task" &
  CUA_PID="$!"
  emit_json "type=cua_process" "mode=${CMD_MODE}" "pid=${CUA_PID}"

  run_id=""
  for _ in $(seq 1 200); do
    if ! kill -0 "$CUA_PID" >/dev/null 2>&1; then
      break
    fi
    if [[ -d "$runs_dir" ]]; then
      for d in $(ls -1 "$runs_dir" 2>/dev/null); do
        case "$d" in
          output|images) continue ;;
        esac
        if [[ -n "$before_dirs" ]] && [[ " $before_dirs " == *" $d "* ]]; then
          continue
        fi
        if [[ -d "$runs_dir/$d" ]]; then
          run_id="$d"
          break
        fi
      done
    fi
    if [[ -n "$run_id" ]]; then
      break
    fi
    sleep 0.05
  done

  if [[ -n "$run_id" ]]; then
    run_dir="${runs_dir}/${run_id}"
    emit_json "type=run_detected" "mode=${CMD_MODE}" "run_id=${run_id}" "runs_dir=${runs_dir}" "run_dir=${run_dir}"
    emit_json "type=run_paths" "mode=${CMD_MODE}" "run_id=${run_id}" "steps_jsonl=${run_dir}/steps.jsonl" "run_meta=${run_dir}/run.meta.json" "steps_json=${run_dir}/steps.json"
  else
    emit_json "type=run_detect_failed" "mode=${CMD_MODE}" "runs_dir=${runs_dir}"
  fi

  wait "$CUA_PID"
  code="$?"
  if [[ -n "${run_id:-}" ]] && [[ -f "${runs_dir}/${run_id}/steps.json" ]]; then
    reason_json="$(python3 - <<'PY' "${runs_dir}/${run_id}/steps.json"
import json, sys
p = sys.argv[1]
try:
  data = json.loads(open(p, "r", encoding="utf-8").read())
  print(json.dumps({"success": data.get("success"), "reason": data.get("reason")}, ensure_ascii=False))
except Exception:
  print("{}")
PY
)"
    emit_json "type=final_summary" "mode=${CMD_MODE}" "run_id=${run_id}" "summary=${reason_json}"
  fi
  emit_json "type=run_exit" "mode=${CMD_MODE}" "code=${code}" "run_id=${run_id}"
  return "$code"
}

cmd="${1:-preflight}"
shift || true
case "$cmd" in
  preflight)
    do_preflight
    ;;
  run)
    do_run "$@"
    ;;
  *)
    on_err 2 "usage: $0 {preflight|run} ..."
    ;;
esac