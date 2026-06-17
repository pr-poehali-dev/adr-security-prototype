"""
Локальный HTTP-сервер для ADR API.
Оборачивает handler из index.py в стандартный Flask-сервер.
Используется при локальной разработке и в Docker.
"""
import json
import os
from flask import Flask, request, Response
from index import handler

app = Flask(__name__)


def make_event(req):
    body = req.get_data(as_text=True) or None
    return {
        "httpMethod": req.method,
        "headers": dict(req.headers),
        "queryStringParameters": dict(req.args) or {},
        "body": body,
        "isBase64Encoded": False,
        "requestContext": {"identity": {"sourceIp": req.remote_addr}},
    }


class FakeContext:
    request_id = "local"


@app.route("/", methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"])
def adr_api():
    event = make_event(request)
    result = handler(event, FakeContext())
    status = result.get("statusCode", 200)
    headers = result.get("headers", {})
    body = result.get("body", "")
    resp = Response(body, status=status)
    for k, v in headers.items():
        resp.headers[k] = v
    return resp


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    print(f"ADR API listening on http://0.0.0.0:{port}")
    app.run(host="0.0.0.0", port=port, debug=False)
