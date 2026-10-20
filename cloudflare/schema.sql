-- Solo órdenes simuladas de Stripe TEST. No existe inventario LIVE aquí.
CREATE TABLE IF NOT EXISTS test_orders (
 session_id TEXT PRIMARY KEY,
 amount_total INTEGER NOT NULL,
 currency TEXT NOT NULL,
 total_units INTEGER NOT NULL,
 item_summary TEXT NOT NULL,
 created_at TEXT NOT NULL
);
