CREATE TABLE IF NOT EXISTS "user_wrong_reasons" (
	"user_id" uuid NOT NULL,
	"question_id" uuid NOT NULL,
	"reason" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_wrong_reasons_user_id_question_id_pk" PRIMARY KEY("user_id","question_id")
);--> statement-breakpoint
ALTER TABLE "user_wrong_reasons" DROP CONSTRAINT IF EXISTS "user_wrong_reasons_user_id_users_id_fk";--> statement-breakpoint
ALTER TABLE "user_wrong_reasons" ADD CONSTRAINT "user_wrong_reasons_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_wrong_reasons" DROP CONSTRAINT IF EXISTS "user_wrong_reasons_question_id_questions_id_fk";--> statement-breakpoint
ALTER TABLE "user_wrong_reasons" ADD CONSTRAINT "user_wrong_reasons_question_id_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE cascade ON UPDATE no action;
