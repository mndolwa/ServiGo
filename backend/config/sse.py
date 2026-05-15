import json
import queue
import threading
from django.http import StreamingHttpResponse

# Simple in-process SSE broadcaster for development/testing.
# Not suitable for multi-process production (use Redis/pubsub or Channels).

_subscribers_lock = threading.Lock()
_subscribers: list[queue.Queue] = []

def subscribe():
    q = queue.Queue()
    with _subscribers_lock:
        _subscribers.append(q)
    return q

def unsubscribe(q):
    with _subscribers_lock:
        try:
            _subscribers.remove(q)
        except ValueError:
            pass

def broadcast_event(event: dict):
    payload = json.dumps(event)
    with _subscribers_lock:
        for q in list(_subscribers):
            try:
                q.put(payload)
            except Exception:
                # ignore individual subscriber failures
                pass

def _event_stream(q: queue.Queue):
    try:
        # Send a comment to keep connection open initially
        yield ": connected\n\n"
        while True:
            data = q.get()
            yield f"data: {data}\n\n"
    finally:
        unsubscribe(q)

def sse_view(request):
    q = subscribe()
    response = StreamingHttpResponse(_event_stream(q), content_type="text/event-stream")
    response['Cache-Control'] = 'no-cache'
    return response
