-- CreateTable
CREATE TABLE "seed_history" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "ran_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "success" BOOLEAN NOT NULL,

    CONSTRAINT "seed_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "seed_history_name_key" ON "seed_history"("name");
