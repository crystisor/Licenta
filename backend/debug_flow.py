"""Debug flow helpers for tracing image-generation requests."""

from __future__ import annotations

import base64
import json
import logging
import os
from collections import deque
from datetime import datetime, timezone
from typing import Any, TypedDict

REQUEST_ID_HEADER = "X-Request-ID"
DEBUG_TRACE_HEADER = "X-Debug-Trace"
TRACE_HISTORY_LIMIT = 400

logger = logging.getLogger("backend.debug_flow")
logger.setLevel(logging.INFO)

_trace_events: deque[dict[str, Any]] = deque(maxlen=TRACE_HISTORY_LIMIT)


class TraceContext(TypedDict):
    request_id: str
    route: str


def is_debug_flow_enabled() -> bool:
    return os.getenv("DEBUG_FLOW", "false").lower() == "true"


def make_trace_context(request_id: str, route: str) -> TraceContext:
    return {
        "request_id": request_id,
        "route": route,
    }


def record_trace(
    request_id: str,
    source: str,
    stage: str,
    status: str,
    details: dict[str, Any] | None = None,
    *,
    always_log: bool = False,
) -> dict[str, Any]:
    event = {
        "requestId": request_id,
        "source": source,
        "stage": stage,
        "status": status,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
    if details:
        event["details"] = details

    _trace_events.append(event)

    if always_log or is_debug_flow_enabled():
        logger.info(json.dumps({"kind": "debug_flow", **event}, default=str))

    return event


def record_context_trace(
    trace_context: TraceContext | None,
    stage: str,
    status: str,
    details: dict[str, Any] | None = None,
    *,
    always_log: bool = False,
) -> dict[str, Any] | None:
    if trace_context is None:
        return None

    return record_trace(
        trace_context["request_id"],
        "backend",
        stage,
        status,
        details,
        always_log=always_log,
    )


def get_trace_events(request_id: str | None = None) -> list[dict[str, Any]]:
    events = list(_trace_events)
    if request_id is None:
        return events
    return [event for event in events if event["requestId"] == request_id]


def clear_trace_events() -> None:
    _trace_events.clear()


def build_trace_header(request_id: str | None) -> str | None:
    if not request_id or not is_debug_flow_enabled():
        return None

    payload = json.dumps(get_trace_events(request_id), default=str).encode("utf-8")
    return base64.urlsafe_b64encode(payload).decode("ascii")
