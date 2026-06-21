CREATE TABLE "feedback" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text,
	"email" text,
	"kind" text NOT NULL,
	"message" text NOT NULL,
	"page" text,
	"resolved" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
