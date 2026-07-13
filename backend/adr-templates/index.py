"""ADR Templates API — сохранение заполненных ADR как переиспользуемых шаблонов-референсов."""
import json
import os
import psycopg2

SCHEMA = os.environ.get("DB_SCHEMA", "t_p98037960_adr_security_prototy")


def get_conn():
    return psycopg2.connect(os.environ["DATABASE_URL"])


def cors_headers():
    return {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, X-User-Id, X-Auth-Token",
    }


def ok(body):
    return {"statusCode": 200, "headers": {**cors_headers(), "Content-Type": "application/json"}, "body": json.dumps(body, ensure_ascii=False)}


def err(code, msg):
    return {"statusCode": code, "headers": {**cors_headers(), "Content-Type": "application/json"}, "body": json.dumps({"error": msg}, ensure_ascii=False)}


def row_to_template(row):
    return {
        "id": row[0],
        "name": row[1],
        "description": row[2],
        "icon": row[3],
        "sourceAdrId": row[4],
        "title": row[5],
        "status": row[6],
        "jiraTicket": row[7],
        "productName": row[8],
        "appealType": row[9],
        "author": row[10],
        "tags": row[11],
        "context": row[12],
        "decision": row[13],
        "consequences": row[14],
        "sectionOrder": row[15],
        "sectionLayout": row[16],
    }


def handler(event: dict, context) -> dict:
    """Хранит пользовательские шаблоны ADR: список, создание из заполненного ADR, удаление."""
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
        # GET /  — список всех пользовательских шаблонов
        if method == "GET":
            cur.execute(
                f"SELECT id, name, description, icon, source_adr_id, title, status, jira_ticket, "
                f"product_name, appeal_type, author, tags, context, decision, consequences, "
                f"section_order, section_layout "
                f"FROM {SCHEMA}.adr_templates ORDER BY created_at DESC"
            )
            rows = cur.fetchall()
            return ok({"templates": [row_to_template(r) for r in rows]})

        # POST /  — сохранить заполненный ADR как шаблон
        if method == "POST":
            tpl = body.get("template")
            if not tpl or not tpl.get("id"):
                return err(400, "template field with id required")
            if not tpl.get("name", "").strip():
                return err(400, "template name required")

            cur.execute(
                f"""
                INSERT INTO {SCHEMA}.adr_templates
                  (id, name, description, icon, source_adr_id, title, status, jira_ticket,
                   product_name, appeal_type, author, tags, context, decision, consequences,
                   section_order, section_layout)
                VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
                ON CONFLICT (id) DO UPDATE SET
                  name          = EXCLUDED.name,
                  description   = EXCLUDED.description,
                  icon          = EXCLUDED.icon,
                  title         = EXCLUDED.title,
                  status        = EXCLUDED.status,
                  jira_ticket   = EXCLUDED.jira_ticket,
                  product_name  = EXCLUDED.product_name,
                  appeal_type   = EXCLUDED.appeal_type,
                  author        = EXCLUDED.author,
                  tags          = EXCLUDED.tags,
                  context       = EXCLUDED.context,
                  decision      = EXCLUDED.decision,
                  consequences  = EXCLUDED.consequences,
                  section_order = EXCLUDED.section_order,
                  section_layout= EXCLUDED.section_layout
                """,
                (
                    tpl["id"],
                    tpl.get("name", ""),
                    tpl.get("description", ""),
                    tpl.get("icon", "FileText"),
                    tpl.get("sourceAdrId", ""),
                    tpl.get("title", ""),
                    tpl.get("status", "Предложено"),
                    tpl.get("jiraTicket", ""),
                    tpl.get("productName", ""),
                    tpl.get("appealType", "Консультация"),
                    tpl.get("author", ""),
                    json.dumps(tpl.get("tags", []), ensure_ascii=False),
                    tpl.get("context", ""),
                    tpl.get("decision", ""),
                    tpl.get("consequences", ""),
                    json.dumps(tpl.get("sectionOrder", []), ensure_ascii=False),
                    json.dumps(tpl.get("sectionLayout", []), ensure_ascii=False),
                ),
            )
            conn.commit()
            return ok({"ok": True})

        # DELETE /  — удалить шаблон по id
        if method == "DELETE":
            tpl_id = params.get("id") or body.get("id")
            if not tpl_id:
                return err(400, "id required")
            cur.execute(f"DELETE FROM {SCHEMA}.adr_templates WHERE id = %s", (tpl_id,))
            conn.commit()
            return ok({"ok": True})

        return err(405, "Method not allowed")
    finally:
        cur.close()
        conn.close()
