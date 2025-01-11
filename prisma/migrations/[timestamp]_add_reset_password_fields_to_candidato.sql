-- AlterTable
ALTER TABLE "Candidato" ADD COLUMN "resetPasswordToken" TEXT,
ADD COLUMN "resetPasswordExpires" TIMESTAMP(3); 