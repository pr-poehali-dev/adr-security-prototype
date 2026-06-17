"""ADR API — CRUD для записей Architecture Decision Records в PostgreSQL."""
import json
import os
import psycopg2

SCHEMA = "t_p98037960_adr_security_prototy"


def get_conn():
    return psycopg2.connect(os.environ["DATABASE_URL"])


def cors_headers():
    return {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, X-User-Id, X-Auth-Token",
    }


def ok(body):
    return {"statusCode": 200, "headers": {**cors_headers(), "Content-Type": "application/json"}, "body": json.dumps(body, ensure_ascii=False)}


def err(code, msg):
    return {"statusCode": code, "headers": {**cors_headers(), "Content-Type": "application/json"}, "body": json.dumps({"error": msg}, ensure_ascii=False)}


def row_to_adr(row):
    return {
        "id": row[0],
        "number": row[1],
        "title": row[2],
        "status": row[3],
        "jiraTicket": row[4],
        "productName": row[5],
        "appealType": row[6],
        "date": row[7],
        "author": row[8],
        "tags": row[9],
        "context": row[10],
        "decision": row[11],
        "consequences": row[12],
        "sectionOrder": row[13],
        "sectionLayout": row[14],
        "versions": row[15],
    }


def handler(event: dict, context) -> dict:
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": cors_headers(), "body": ""}

    method = event.get("httpMethod", "GET")
    params = event.get("queryStringParameters") or {}
    body = {}
    if event.get("body"):
        try:
            body = json.loads(event["body"])
        except Exception:
            return err(400, "Invalid JSON body")

    conn = get_conn()
    cur = conn.cursor()

    try:
        # GET /  — список всех ADR
        if method == "GET":
            cur.execute(
                f"SELECT id, number, title, status, jira_ticket, product_name, appeal_type, "
                f"date, author, tags, context, decision, consequences, section_order, section_layout, versions "
                f"FROM {SCHEMA}.adrs ORDER BY number ASC"
            )
            rows = cur.fetchall()
            return ok({"adrs": [row_to_adr(r) for r in rows]})

        # POST /  — создать или обновить ADR (upsert по id)
        if method == "POST":
            adr = body.get("adr")
            if not adr:
                return err(400, "adr field required")

            cur.execute(
                f"""
                INSERT INTO {SCHEMA}.adrs
                  (id, number, title, status, jira_ticket, product_name, appeal_type,
                   date, author, tags, context, decision, consequences,
                   section_order, section_layout, versions, updated_at)
                VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,NOW())
                ON CONFLICT (id) DO UPDATE SET
                  number        = EXCLUDED.number,
                  title         = EXCLUDED.title,
                  status        = EXCLUDED.status,
                  jira_ticket   = EXCLUDED.jira_ticket,
                  product_name  = EXCLUDED.product_name,
                  appeal_type   = EXCLUDED.appeal_type,
                  date          = EXCLUDED.date,
                  author        = EXCLUDED.author,
                  tags          = EXCLUDED.tags,
                  context       = EXCLUDED.context,
                  decision      = EXCLUDED.decision,
                  consequences  = EXCLUDED.consequences,
                  section_order = EXCLUDED.section_order,
                  section_layout= EXCLUDED.section_layout,
                  versions      = EXCLUDED.versions,
                  updated_at    = NOW()
                """,
                (
                    adr["id"],
                    adr.get("number", 0),
                    adr.get("title", ""),
                    adr.get("status", "Предложено"),
                    adr.get("jiraTicket", ""),
                    adr.get("productName", ""),
                    adr.get("appealType", "Консультация"),
                    adr.get("date", ""),
                    adr.get("author", ""),
                    json.dumps(adr.get("tags", []), ensure_ascii=False),
                    adr.get("context", ""),
                    adr.get("decision", ""),
                    adr.get("consequences", ""),
                    json.dumps(adr.get("sectionOrder", []), ensure_ascii=False),
                    json.dumps(adr.get("sectionLayout", []), ensure_ascii=False),
                    json.dumps(adr.get("versions", []), ensure_ascii=False),
                ),
            )
            conn.commit()
            return ok({"ok": True})

        # DELETE /  — удалить ADR по id
        if method == "DELETE":
            adr_id = params.get("id") or body.get("id")
            if not adr_id:
                return err(400, "id required")
            cur.execute(f"DELETE FROM {SCHEMA}.adrs WHERE id = %s", (adr_id,))
            conn.commit()
            return ok({"ok": True})

        return err(405, "Method not allowed")
    finally:
        cur.close()
        conn.close()
