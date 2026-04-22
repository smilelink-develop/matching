-- Make JobPostingTemplate.driveFolderUrl optional.
-- 求人票は案件に紐づく企業フォルダへ自動保存されるため、テンプレ単位での保存先指定は不要になった。
ALTER TABLE "JobPostingTemplate" ALTER COLUMN "driveFolderUrl" DROP NOT NULL;
