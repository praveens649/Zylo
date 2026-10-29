-- Data Transfer ledger entries — banked data sent to / received from a friend.
ALTER TYPE "DataBankTransactionType" ADD VALUE IF NOT EXISTS 'TRANSFER_OUT';
ALTER TYPE "DataBankTransactionType" ADD VALUE IF NOT EXISTS 'TRANSFER_IN';
