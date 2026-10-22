CREATE TABLE "checkup_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"checkup_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"category" text,
	"name" text NOT NULL,
	"value" text,
	"unit" text,
	"reference_range" text,
	"finding" text,
	"judgment" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "checkups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"upload_id" uuid NOT NULL,
	"exam_date" date,
	"institution" text,
	"exam_type" text,
	"conditional_advice" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "checkups_uploadId_unique" UNIQUE("upload_id")
);
--> statement-breakpoint
CREATE TABLE "follow_ups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"checkup_id" uuid NOT NULL,
	"target" text NOT NULL,
	"reason" text NOT NULL,
	"recommended_timing" text NOT NULL,
	"recommended_months" integer,
	"source_text" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "uploads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pathname" text NOT NULL,
	"filename" text NOT NULL,
	"content_type" text NOT NULL,
	"size" integer NOT NULL,
	"status" text DEFAULT 'uploaded' NOT NULL,
	"draft" jsonb,
	"error" text,
	"model" text,
	"cost_usd" numeric(10, 6),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"analyzed_at" timestamp with time zone,
	CONSTRAINT "uploads_pathname_unique" UNIQUE("pathname")
);
--> statement-breakpoint
ALTER TABLE "checkup_items" ADD CONSTRAINT "checkup_items_checkup_id_checkups_id_fk" FOREIGN KEY ("checkup_id") REFERENCES "public"."checkups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checkups" ADD CONSTRAINT "checkups_upload_id_uploads_id_fk" FOREIGN KEY ("upload_id") REFERENCES "public"."uploads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "follow_ups" ADD CONSTRAINT "follow_ups_checkup_id_checkups_id_fk" FOREIGN KEY ("checkup_id") REFERENCES "public"."checkups"("id") ON DELETE cascade ON UPDATE no action;