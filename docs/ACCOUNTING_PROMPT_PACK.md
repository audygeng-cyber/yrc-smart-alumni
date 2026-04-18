# Accounting Prompt Pack for Cursor IDE

เอกสารนี้รวบรวม Prompt ชุดเต็มสำหรับสร้างระบบบัญชีมาตรฐานของ `YRC Smart Alumni` โดยเน้นการใช้งานกับ Cursor IDE และ Supabase/PostgreSQL

**เส้นทางปฏิบัติการองค์กร (ต้นจนจบ, checklist):** [`OPERATIONAL_RUNBOOK.md`](./OPERATIONAL_RUNBOOK.md)

## ขั้นตอนที่ 1: การวางโครงสร้าง Database Schema (สำหรับ Supabase/PostgreSQL)

**Prompt:**

> "Act as a Senior System Architect and CPA. I am building a professional accounting module for 'YRC Smart Alumni' system using Supabase. Please generate the SQL schema for the following tables:
>  1. chart_of_accounts: Include columns for account_code (PK), account_name, category (1-5), and parent_account_id for sub-accounts.
>  2. journal_headers: Include journal_id (PK), transaction_date, reference_no (unique & gapless), description, status (Draft/Posted/Voided), and created_by.
>  3. journal_lines: Include line_id (PK), journal_id (FK), account_code (FK), debit_amount, credit_amount.
>  4. audit_logs: To track every change with user_id, action_type, old_value, new_value, and timestamp.
>  5. fiscal_years: To manage accounting periods (Start/End date and Is_Closed status).
>    Ensure all tables have proper foreign key constraints and timestamps for auditing."

## ขั้นตอนที่ 2: การเขียน Logic ควบคุมบัญชีคู่และความถูกต้องของข้อมูล

**Prompt:**

> "Based on the schema created, I need to implement the Core Accounting Logic in Node.js/TypeScript:
>  1. Create a validation function: Before saving any journal_headers and journal_lines, the system MUST check that Sum(Debit) equals Sum(Credit). If not, throw an error.
>  2. Implement a 'Gapless Document Numbering' logic for reference_no based on the Thai accounting standard (e.g., JV-YYYYMM-0001).
>  3. Create a 'Post to Ledger' function: Once a journal is posted, set its status to 'Posted' and make it Read-Only. No updates or deletes allowed on posted entries.
>  4. Implement an 'Audit Trail' trigger: Every insert/update on journal tables must be logged in the audit_logs table automatically."

## ขั้นตอนที่ 3: ระบบแก้ไขรายการและทะเบียนทรัพย์สิน (Audit Compliance)

**Prompt:**

> "To comply with auditor requirements, please write the following features:
>  1. 'Void/Reverse Entry' Logic: Instead of deleting a wrong 'Posted' journal, create a function that generates a new Reversing Journal Entry (swapping Dr./Cr.) and link it to the original entry for transparency.
>  2. 'Fixed Asset & Depreciation' Module: Create a table fixed_assets (purchase_date, cost, useful_life, residual_value). Write a function to calculate monthly depreciation using the Straight-Line method and automatically generate a Journal Entry at the end of each month.
>  3. Include Thai Tax Logic: Add fields for VAT (7%) and Withholding Tax (1%, 3%, 5%) calculation in the transaction flow."

## ขั้นตอนที่ 4: ระบบรายงานและการปิดงบการเงิน

**Prompt:**

> "Develop the financial reporting engine:
>  1. Trial Balance: A query to aggregate all journal_lines grouped by account_code to show total Debit/Credit and ending balance.
>  2. Income Statement (Income/Expense Statement): Specifically for an Alumni Association, calculate Total Revenues - Total Expenses for a specific date range.
>  3. Balance Sheet: Show Assets, Liabilities, and Equity (including Retained Earnings/Accumulated Surplus).
>  4. Year-End Closing Function: Create a logic to close the fiscal year by zeroing out Revenue and Expense accounts, then moving the net balance to 'Accumulated Surplus' in the Equity category. Ensure it marks the fiscal_years as 'Closed' to prevent any further entries."

## ข้อแนะนำเพิ่มเติมเมื่อใช้ใน Cursor IDE

1. ใช้โหมด `@Codebase` เพื่อให้ Cursor เข้าใจบริบทโค้ดเดิม
2. เน้นความปลอดภัย: ไม่ hardcode secret ลงโค้ด ให้ใช้ `.env` หรือ Supabase Vault
3. UI/UX ฝั่งบัญชี: ปรับโทนให้เข้ากับสมาคมและใช้งานง่ายบนมือถือ

---

## Prompt เสริม: CoA + Seed Data + Frontend Helper

**Copy ข้อความด้านล่างนี้ไปวางใน Cursor IDE**

> "Act as a Senior System Architect and an Expert CPA. I need to create the 'Chart of Accounts' (CoA) module for an Alumni Association accounting system using Supabase (PostgreSQL).
> **Step 1: Database Schema**
> Please generate the SQL script to create a chart_of_accounts table. The table must include:
>  * account_code (VARCHAR, Primary Key) - The standard account number.
>  * account_name (VARCHAR) - Name of the account in Thai.
>  * category (INTEGER) - Must be exactly 1 (Assets), 2 (Liabilities), 3 (Equity/Accumulated Fund), 4 (Revenues), or 5 (Expenses).
>  * is_active (BOOLEAN) - Default to true.
>  * created_at and updated_at timestamps.
> **Step 2: Seed Data (Standard Account Codes)**
> Generate an SQL INSERT script to pre-populate the chart_of_accounts with standard 4-digit codes specifically tailored for a Non-profit / Alumni Association. Include the following essential accounts:
>  * **Category 1 (Assets - 1xxx):** Cash in Hand, Bank Accounts (Savings/Current), Accounts Receivable.
>  * **Category 2 (Liabilities - 2xxx):** Accounts Payable, Accrued Expenses, Withholding Tax Payable, VAT Payable.
>  * **Category 3 (Equity/Fund - 3xxx):** Accumulated Surplus (รายได้สูง/ต่ำกว่าค่าใช้จ่ายสะสม). Note: Do not use Retained Earnings, as this is an association.
>  * **Category 4 (Revenues - 4xxx):** Membership Fees (รายได้ค่าบำรุงสมาคม), Donation Revenues (รายได้เงินบริจาค), Event/Activity Revenues.
>  * **Category 5 (Expenses - 5xxx):** Event/Activity Expenses, Administrative Expenses, Bank Fees, Accounting/Audit Fees.
> **Step 3: Frontend Validation Logic**
> Create a TypeScript helper function for the frontend that receives an account_code and automatically returns the correct Main Category Name (e.g., if code starts with '4', return 'รายได้')."

## สิ่งที่คาดว่าจะได้จาก Prompt นี้

1. SQL Schema สำหรับสร้างตาราง CoA
2. Seed Data ผังบัญชีเริ่มต้นสำหรับสมาคม
3. TypeScript helper สำหรับ map รหัสบัญชี -> หมวดหลักอัตโนมัติ

