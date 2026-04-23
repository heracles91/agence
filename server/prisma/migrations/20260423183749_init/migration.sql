-- CreateEnum
CREATE TYPE "Role" AS ENUM ('directeur_general', 'directeur_creatif', 'directeur_financier', 'chef_de_projet', 'social_media', 'copywriter', 'designer', 'commercial', 'consultant_externe', 'admin');

-- CreateEnum
CREATE TYPE "GamePhase" AS ENUM ('prelaunch', 'playing', 'victory', 'defeat');

-- CreateEnum
CREATE TYPE "CrisisType" AS ENUM ('vote_collectif', 'subi');

-- CreateEnum
CREATE TYPE "ContentType" AS ENUM ('info', 'mission');

-- CreateEnum
CREATE TYPE "MiniGameType" AS ENUM ('arbitrage', 'validation_dc', 'budget', 'planning', 'moderation', 'redaction', 'upload_visuel', 'negociation', 'analyse');

-- CreateEnum
CREATE TYPE "SubmissionStatus" AS ENUM ('pending', 'pending_validation', 'approved', 'rejected', 'expired');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('mission_new', 'mission_validated', 'crisis_new', 'vote_closed', 'score_update', 'game_event');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "Role",
    "is_admin" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "game_config" (
    "id" INTEGER NOT NULL,
    "phase" "GamePhase" NOT NULL DEFAULT 'prelaunch',
    "current_day" INTEGER NOT NULL DEFAULT 0,
    "launch_date" TIMESTAMP(3),
    "daily_update_hour" INTEGER NOT NULL DEFAULT 20,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "game_config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "client_profile" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "company_name" TEXT NOT NULL,
    "sector" TEXT NOT NULL,
    "personality" TEXT NOT NULL,
    "initial_brief" TEXT NOT NULL,
    "tolerance_threshold" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "client_profile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_votes" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "voted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "role_votes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_news" (
    "id" TEXT NOT NULL,
    "day_number" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "daily_news_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crises" (
    "id" TEXT NOT NULL,
    "day_number" INTEGER NOT NULL,
    "type" "CrisisType" NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "options" JSONB,
    "deadline" TIMESTAMP(3),
    "winning_option" TEXT,
    "result_applied" BOOLEAN NOT NULL DEFAULT false,
    "ai_consequence" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "crises_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crisis_votes" (
    "id" TEXT NOT NULL,
    "crisis_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "option_id" TEXT NOT NULL,
    "voted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "crisis_votes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "private_content" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "day_number" INTEGER NOT NULL,
    "type" "ContentType" NOT NULL,
    "content" TEXT NOT NULL,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "mission_completed" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "private_content_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "satisfaction_scores" (
    "id" TEXT NOT NULL,
    "day_number" INTEGER NOT NULL,
    "score" INTEGER NOT NULL,
    "delta" INTEGER NOT NULL,
    "ai_comment" TEXT NOT NULL,
    "calculated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "satisfaction_scores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "minigames" (
    "id" TEXT NOT NULL,
    "day_number" INTEGER NOT NULL,
    "role" "Role" NOT NULL,
    "type" "MiniGameType" NOT NULL,
    "title" TEXT NOT NULL,
    "prompt" JSONB NOT NULL,
    "deadline" TIMESTAMP(3) NOT NULL,
    "requires_validation_from" "Role",
    "score_impact_success" DOUBLE PRECISION NOT NULL,
    "score_impact_failure" DOUBLE PRECISION NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "minigames_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "minigame_submissions" (
    "id" TEXT NOT NULL,
    "minigame_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "SubmissionStatus" NOT NULL DEFAULT 'pending',
    "validated_by" TEXT,
    "validated_at" TIMESTAMP(3),
    "validator_comment" TEXT,
    "applied_to_score" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "minigame_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "type" "NotificationType" NOT NULL,
    "content" TEXT NOT NULL,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "action" TEXT NOT NULL,
    "details" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "role_votes_user_id_key" ON "role_votes"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "crisis_votes_crisis_id_user_id_key" ON "crisis_votes"("crisis_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "satisfaction_scores_day_number_key" ON "satisfaction_scores"("day_number");

-- AddForeignKey
ALTER TABLE "role_votes" ADD CONSTRAINT "role_votes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crisis_votes" ADD CONSTRAINT "crisis_votes_crisis_id_fkey" FOREIGN KEY ("crisis_id") REFERENCES "crises"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crisis_votes" ADD CONSTRAINT "crisis_votes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "private_content" ADD CONSTRAINT "private_content_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "minigame_submissions" ADD CONSTRAINT "minigame_submissions_minigame_id_fkey" FOREIGN KEY ("minigame_id") REFERENCES "minigames"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "minigame_submissions" ADD CONSTRAINT "minigame_submissions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "minigame_submissions" ADD CONSTRAINT "minigame_submissions_validated_by_fkey" FOREIGN KEY ("validated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
