-- ---------------------------------------------------------------------------
-- chat_usage_metrics — anonymous per-request AI cost telemetry
--
-- Privacy: this table carries NO identifier of any kind. No IP address,
-- no session id, no user id, no address, no request body, no prompt text.
-- Operational numbers only: model, token counts, estimated cost, and an
-- optional call_kind discriminator. This mirrors the voter_issue_events
-- privacy contract ("NO identifier linking rows to a person, NO address,
-- NO free-text verbatim") and extends it to the cost-observability domain.
-- Use ONLY for aggregate cost monitoring and volume/spike detection —
-- never for tracing or profiling individual users or sessions.
-- ---------------------------------------------------------------------------
CREATE TABLE "chat_usage_metrics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"recorded_at" timestamp with time zone DEFAULT now() NOT NULL,
	"model" text NOT NULL,
	"call_kind" text DEFAULT 'chat',
	"input_tokens" integer NOT NULL DEFAULT 0,
	"cache_read_tokens" integer NOT NULL DEFAULT 0,
	"cache_write_tokens" integer NOT NULL DEFAULT 0,
	"output_tokens" integer NOT NULL DEFAULT 0,
	"web_search_count" integer NOT NULL DEFAULT 0,
	"estimated_cost_usd" numeric(10, 8) NOT NULL DEFAULT 0
);
--> statement-breakpoint
CREATE INDEX "chat_usage_metrics_recorded_at_idx" ON "chat_usage_metrics" ("recorded_at");
--> statement-breakpoint
CREATE INDEX "chat_usage_metrics_model_idx" ON "chat_usage_metrics" ("model");
