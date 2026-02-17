#!/usr/bin/env python3
"""Serveur local pour CHOP' TON STAGE.

- Sert les fichiers statiques du projet
- Expose une API partagée pour contributions/modifications structures
- Persiste dans data/shared_data.json
"""

from __future__ import annotations

import json
import threading
from datetime import datetime, timezone
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parent
DATA_DIR = ROOT / "data"
DATA_FILE = DATA_DIR / "shared_data.json"
HOST = "127.0.0.1"
PORT = 8080

DATA_LOCK = threading.Lock()


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def ensure_data_file() -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    if DATA_FILE.exists():
        return
    payload = {
        "updatedAt": utc_now_iso(),
        "contributions": [],
        "structureEdits": {},
    }
    DATA_FILE.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")


def load_data() -> dict:
    ensure_data_file()
    raw = DATA_FILE.read_text(encoding="utf-8")
    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError:
        parsed = {}
    if not isinstance(parsed, dict):
        parsed = {}
    parsed.setdefault("updatedAt", utc_now_iso())
    parsed.setdefault("contributions", [])
    parsed.setdefault("structureEdits", {})
    if not isinstance(parsed["contributions"], list):
        parsed["contributions"] = []
    if not isinstance(parsed["structureEdits"], dict):
        parsed["structureEdits"] = {}
    return parsed


def save_data(payload: dict) -> None:
    payload["updatedAt"] = utc_now_iso()
    DATA_FILE.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")


class AppHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def do_GET(self):
        parsed = urlparse(self.path)
        if parsed.path == "/api/health":
            self._send_json(200, {"ok": True, "updatedAt": utc_now_iso()})
            return

        if parsed.path == "/api/contributions":
            with DATA_LOCK:
                payload = load_data()
            self._send_json(
                200,
                {
                    "contributions": payload["contributions"],
                    "updatedAt": payload["updatedAt"],
                },
            )
            return

        if parsed.path == "/api/structure-edits":
            with DATA_LOCK:
                payload = load_data()
            self._send_json(
                200,
                {
                    "structureEdits": payload["structureEdits"],
                    "updatedAt": payload["updatedAt"],
                },
            )
            return

        return super().do_GET()

    def do_POST(self):
        parsed = urlparse(self.path)

        if parsed.path == "/api/contributions":
            body = self._read_json_body()
            contribution = body.get("contribution") if isinstance(body, dict) else None
            if not isinstance(contribution, dict):
                self._send_json(400, {"error": "Invalid body: contribution object required"})
                return

            contribution.setdefault("createdAt", utc_now_iso())
            with DATA_LOCK:
                payload = load_data()
                payload["contributions"].append(contribution)
                save_data(payload)
            self._send_json(200, {"ok": True})
            return

        if parsed.path == "/api/structure-edits":
            body = self._read_json_body()
            if not isinstance(body, dict):
                self._send_json(400, {"error": "Invalid JSON body"})
                return

            structure_id = body.get("structureId")
            edit = body.get("edit")
            if not isinstance(structure_id, str) or not structure_id.strip():
                self._send_json(400, {"error": "structureId is required"})
                return
            if not isinstance(edit, dict):
                self._send_json(400, {"error": "edit object is required"})
                return

            with DATA_LOCK:
                payload = load_data()
                payload["structureEdits"][structure_id.strip()] = edit
                save_data(payload)
            self._send_json(200, {"ok": True})
            return

        self._send_json(404, {"error": "Not found"})

    def _read_json_body(self) -> dict | list | None:
        length = int(self.headers.get("Content-Length", "0"))
        raw = self.rfile.read(length) if length > 0 else b""
        if not raw:
            return None
        try:
            return json.loads(raw.decode("utf-8"))
        except (UnicodeDecodeError, json.JSONDecodeError):
            return None

    def _send_json(self, status: int, payload: dict):
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)


if __name__ == "__main__":
    ensure_data_file()
    server = ThreadingHTTPServer((HOST, PORT), AppHandler)
    print(f"CHOP' TON STAGE server: http://{HOST}:{PORT}")
    print(f"Shared data file: {DATA_FILE}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()
