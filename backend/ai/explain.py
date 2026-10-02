import asyncio
import json
import os
import sys
import urllib.error
import urllib.request
from pathlib import Path

from dotenv import dotenv_values

import storage.db as db

MODEL = "claude-sonnet-5-5"
API_URL = "https://api.anthropic.com/v1/messages"
# From source the key lives in the repo-root .env; the packaged app has no repo, so it uses the data dir.
ENV_FILE = (
    db.DB_PATH.parent / ".env"
    if getattr(sys, "frozen", False)
    else Path(__file__).resolve().parent.parent.parent / ".env"
)

OAUTH_IDENTITY = "You are Claude Code, Anthropic's official CLI for Claude."
OAUTH_BETA = "oauth-2025-04-20"

SYSTEM = (
    "You are a network privacy advisor inside a traffic visualizer used by non-experts. "
    "Given a summary of what this Mac is connecting to, explain in plain language why the "
    "privacy score is what it is, which processes are responsible, which findings are "
    "harmless (e.g. keepalives, CDNs) and which deserve attention, and give 2-4 concrete "
    "actions (DNS blocker, browser content blocker, per-app settings). A VPN hides the IP "
    "but does not block trackers: say so if relevant. Be concise (under 200 words), no "
    "preamble. Plain text only: no markdown, no asterisks, no backticks, no headings; use short paragraphs and lines starting with a dash for lists. Answer in the requested language."
)

HOST_SYSTEM = (
    "You are a network privacy advisor inside a traffic visualizer used by non-experts. "
    "You get one connection (a remote host or a local device) seen from this Mac: hostname, "
    "organisation, country, traffic volume, the processes using it and any alerts. Say what "
    "it most likely is, whether it looks normal or deserves attention, and what to do if it "
    "does (e.g. which app to check, block it, ignore it). Be honest about uncertainty: if the "
    "name or organisation does not identify it, say so instead of guessing. Under 150 words, "
    "no preamble. Plain text only: no markdown, no asterisks, no backticks, no headings; use "
    "short paragraphs. Answer in the requested language."
)


class NoKey(Exception):
    pass


def _credential() -> tuple[str, bool]:
    """Returns (secret, is_oauth). Uses the Claude subscription token if set, otherwise an API key. Picks one; no retry on failure."""
    file_vals = dotenv_values(ENV_FILE)
    for name, oauth in (("CLAUDE_CODE_OAUTH_TOKEN", True), ("ANTHROPIC_API_KEY", False)):
        val = (os.environ.get(name) or file_vals.get(name) or "").strip()
        if val:
            return val, oauth
    raise NoKey(str(ENV_FILE))


def build_summary(nodes: dict, alerts: list, score: int, grade: str) -> dict:
    """Metadata only: hostnames, process names and counts. No packet contents. Hosts without a reverse-DNS name are labelled by their (remote) IP."""
    ext = [n for n in nodes.values() if n.get("id") != "local"]
    total = sum(n.get("bytes", 0) for n in ext) or 1

    def entry(n: dict) -> dict:
        return {
            "host": n.get("label"),
            "org": n.get("org"),
            "country": n.get("country_code"),
            "kb": round(n.get("bytes", 0) / 1024),
            "processes": sorted((n.get("processes") or {}), key=lambda p: -n["processes"][p]["bytes"])[:3],
        }

    trackers = sorted((n for n in ext if n.get("category") == "tracking"), key=lambda n: -n.get("bytes", 0))
    by_id = {n["id"]: n for n in ext}
    beacon_ids = {a.get("node_id") for a in alerts if a.get("type") == "BEACON"}
    other = {(a.get("type"), a.get("node_id")) for a in alerts if a.get("type") != "BEACON"}
    return {
        "score": score,
        "grade": grade,
        "external_hosts": len(ext),
        "tracker_hosts": [entry(n) for n in trackers[:15]],
        "tracker_traffic_pct": round(100 * sum(n.get("bytes", 0) for n in trackers) / total, 1),
        "beacon_hosts": [entry(by_id[i]) for i in beacon_ids if i in by_id][:10],
        "other_alerts": [
            {"type": t, "host": (by_id.get(i) or {}).get("label")} for t, i in list(other)[:10]
        ],
    }


def _call(system_prompt: str, summary: dict, lang: str) -> str:
    secret, oauth = _credential()
    # The Messages API accepts a subscription OAuth token only with this beta header and Claude Code identity block.
    system = [{"type": "text", "text": OAUTH_IDENTITY}, {"type": "text", "text": system_prompt}] if oauth else system_prompt
    body = json.dumps({
        "model": MODEL,
        "max_tokens": 1500,
        "system": system,
        "messages": [{
            "role": "user",
            "content": f"Language: {'French' if lang == 'fr' else 'English'}\n\n{json.dumps(summary, indent=1)}",
        }],
    }).encode()
    headers = {"anthropic-version": "2023-06-01", "content-type": "application/json"}
    if oauth:
        headers["authorization"] = f"Bearer {secret}"
        headers["anthropic-beta"] = OAUTH_BETA
    else:
        headers["x-api-key"] = secret
    req = urllib.request.Request(API_URL, data=body, method="POST", headers=headers)
    with urllib.request.urlopen(req, timeout=60) as r:
        return "".join(b["text"] for b in json.load(r)["content"] if b.get("type") == "text")


async def explain_privacy(nodes: dict, alerts: list, score: int, grade: str, lang: str) -> str:
    summary = build_summary(nodes, alerts, score, grade)
    return await asyncio.get_running_loop().run_in_executor(None, _call, SYSTEM, summary, lang)


def build_host_summary(node: dict, alerts: list) -> dict:
    """One connection. For a local device the MAC address is left out."""
    return {
        "host": node.get("label") or node.get("hostname"),
        "ip": node.get("ip"),
        "org": node.get("org") or node.get("vendor"),
        "country": node.get("country"),
        "city": node.get("city"),
        "category": node.get("category") or node.get("device_type"),
        "traffic_kb": round(node.get("bytes", 0) / 1024),
        "packets": node.get("packets"),
        "processes": {
            name: round(st["bytes"] / 1024)
            for name, st in sorted((node.get("processes") or {}).items(), key=lambda kv: -kv[1]["bytes"])[:5]
        },
        "alerts": [
            {"type": a.get("type"), "severity": a.get("severity"), "message": a.get("message")}
            for a in alerts if a.get("node_id") == node.get("id")
        ][-5:],
    }


async def explain_host(node: dict, alerts: list, lang: str) -> str:
    summary = build_host_summary(node, alerts)
    return await asyncio.get_running_loop().run_in_executor(None, _call, HOST_SYSTEM, summary, lang)
