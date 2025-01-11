-- AlterTable
ALTER TABLE "Empresa" ADD COLUMN "resetPasswordToken" TEXT,
ADD COLUMN "resetPasswordExpires" TIMESTAMP(3); 