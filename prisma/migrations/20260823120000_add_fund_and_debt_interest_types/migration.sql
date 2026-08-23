-- Add fund certificates and loan-interest repayment asset types.
ALTER TYPE "AssetType" ADD VALUE IF NOT EXISTS 'FUND_DCDS';
ALTER TYPE "AssetType" ADD VALUE IF NOT EXISTS 'FUND_ETF_VN30';
ALTER TYPE "AssetType" ADD VALUE IF NOT EXISTS 'DEBT_INTEREST';
