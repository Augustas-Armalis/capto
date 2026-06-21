CREATE TABLE "caption_correction" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"project_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"engine" text,
	"language" text,
	"kind" text NOT NULL,
	"ai_text" text,
	"final_text" text,
	"payload" jsonb
);
--> statement-breakpoint
CREATE TABLE "user_caption_preset" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"config" jsonb NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "caption_correction" ADD CONSTRAINT "caption_correction_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_caption_preset" ADD CONSTRAINT "user_caption_preset_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;