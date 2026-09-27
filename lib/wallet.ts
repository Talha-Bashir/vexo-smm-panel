import { db } from "@/lib/db";
import { ensureBonusSchema } from "@/lib/signup-bonus";

let schemaPromise: Promise<void> | null = null;

export function ensureWalletSchema() {
  if (!schemaPromise) {
    schemaPromise = db
      .query(`
        CREATE EXTENSION IF NOT EXISTS pgcrypto;

        CREATE TABLE IF NOT EXISTS vexo_wallets (
          user_id INTEGER PRIMARY KEY REFERENCES vexo_users(id) ON DELETE CASCADE,
          balance_pkr NUMERIC(14,2) NOT NULL DEFAULT 0,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS vexo_deposits (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id INTEGER NOT NULL REFERENCES vexo_users(id) ON DELETE CASCADE,
          method VARCHAR(40) NOT NULL,
          amount_pkr NUMERIC(14,2) NOT NULL CHECK (amount_pkr >= 100 AND amount_pkr <= 500000),
          transaction_id VARCHAR(120) NOT NULL,
          screenshot TEXT,
          status VARCHAR(20) NOT NULL DEFAULT 'Pending'
            CHECK (status IN ('Pending', 'Approved', 'Rejected')),
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          reviewed_at TIMESTAMPTZ,
          reviewed_by INTEGER REFERENCES vexo_users(id) ON DELETE SET NULL,
          rejection_reason TEXT
        );

        ALTER TABLE vexo_deposits ADD COLUMN IF NOT EXISTS screenshot TEXT;

        CREATE INDEX IF NOT EXISTS vexo_deposits_user_created_idx
          ON vexo_deposits(user_id, created_at DESC);

        CREATE INDEX IF NOT EXISTS vexo_deposits_status_created_idx
          ON vexo_deposits(status, created_at ASC);

        CREATE UNIQUE INDEX IF NOT EXISTS vexo_deposits_method_transaction_uidx
          ON vexo_deposits(method, transaction_id);

        CREATE TABLE IF NOT EXISTS vexo_wallet_transactions (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id INTEGER NOT NULL REFERENCES vexo_users(id) ON DELETE CASCADE,
          type VARCHAR(20) NOT NULL CHECK (type IN ('Credit', 'Debit', 'Refund')),
          amount_pkr NUMERIC(14,2) NOT NULL CHECK (amount_pkr > 0),
          reference_type VARCHAR(40),
          reference_id VARCHAR(120),
          description TEXT NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS vexo_wallet_transactions_user_created_idx
          ON vexo_wallet_transactions(user_id, created_at DESC);

        CREATE UNIQUE INDEX IF NOT EXISTS vexo_wallet_transactions_reference_uidx
          ON vexo_wallet_transactions(reference_type, reference_id)
          WHERE reference_type IS NOT NULL AND reference_id IS NOT NULL;

        CREATE TABLE IF NOT EXISTS vexo_orders (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id INTEGER NOT NULL REFERENCES vexo_users(id) ON DELETE CASCADE,
          idempotency_key VARCHAR(120) UNIQUE,
          provider_order_id VARCHAR(120),
          service_id VARCHAR(50) NOT NULL,
          service_name TEXT,
          platform VARCHAR(50),
          link TEXT NOT NULL,
          quantity INTEGER NOT NULL,
          rate_pkr NUMERIC(14,6) NOT NULL,
          charge_pkr NUMERIC(14,2) NOT NULL CHECK (charge_pkr >= 0),
          status VARCHAR(30) NOT NULL DEFAULT 'Payment Reserved',
          failure_reason TEXT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS vexo_orders_user_created_idx
          ON vexo_orders(user_id, created_at DESC);

        CREATE INDEX IF NOT EXISTS vexo_orders_status_created_idx
          ON vexo_orders(status, created_at DESC);

        CREATE UNIQUE INDEX IF NOT EXISTS vexo_orders_provider_order_uidx
          ON vexo_orders(provider_order_id)
          WHERE provider_order_id IS NOT NULL;

        ALTER TABLE vexo_orders ADD COLUMN IF NOT EXISTS rate_pkr NUMERIC(14,6);
        ALTER TABLE vexo_orders ADD COLUMN IF NOT EXISTS rate NUMERIC(14,6);
        ALTER TABLE vexo_orders ADD COLUMN IF NOT EXISTS platform VARCHAR(50);
        ALTER TABLE vexo_orders ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(120);
        ALTER TABLE vexo_orders ADD COLUMN IF NOT EXISTS failure_reason TEXT;
        ALTER TABLE vexo_orders ADD COLUMN IF NOT EXISTS provider_response JSONB;

        CREATE TABLE IF NOT EXISTS vexo_order_refills (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          order_id UUID NOT NULL REFERENCES vexo_orders(id) ON DELETE CASCADE,
          user_id INTEGER NOT NULL REFERENCES vexo_users(id) ON DELETE CASCADE,
          provider_order_id VARCHAR(120),
          provider_refill_id VARCHAR(120),
          status VARCHAR(40) NOT NULL DEFAULT 'Pending',
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS vexo_order_refills_user_created_idx
          ON vexo_order_refills(user_id, created_at DESC);
      `)
      .then(async () => {
        await ensureBonusSchema();
      })
      .then(() => undefined)
      .catch((error) => {
        schemaPromise = null;
        throw error;
      });
  }

  return schemaPromise;
}

export async function getUserWallet(userId: number) {
  await ensureWalletSchema();

  await db.query(
    `INSERT INTO vexo_wallets (user_id) VALUES ($1)
     ON CONFLICT (user_id) DO NOTHING`,
    [userId]
  );

  const wallet = await db.query(
    `SELECT user_id, balance_pkr, bonus_balance_pkr, updated_at
     FROM vexo_wallets
     WHERE user_id = $1`,
    [userId]
  );

  const deposits = await db.query(
    `SELECT id, method, amount_pkr, transaction_id, status,
            created_at, reviewed_at, rejection_reason
     FROM vexo_deposits
     WHERE user_id = $1
     ORDER BY created_at DESC
     LIMIT 50`,
    [userId]
  );

  const transactions = await db.query(
    `SELECT id, type, amount_pkr, reference_type, reference_id, description, created_at
     FROM vexo_wallet_transactions
     WHERE user_id = $1
     ORDER BY created_at DESC
     LIMIT 50`,
    [userId]
  );

  const balancePkr = Number(wallet.rows[0]?.balance_pkr ?? 0);
  const bonusBalancePkr = Number(wallet.rows[0]?.bonus_balance_pkr ?? 0);
  const totalAvailablePkr = Math.round((balancePkr + bonusBalancePkr) * 100) / 100;

  return {
    balancePkr,
    bonusBalancePkr,
    totalAvailablePkr,
    deposits: deposits.rows.map((row) => ({
      id: row.id,
      method: row.method,
      amount: Number(row.amount_pkr),
      transactionId: row.transaction_id,
      status: row.status,
      createdAt: row.created_at,
      reviewedAt: row.reviewed_at,
      rejectionReason: row.rejection_reason,
    })),
    transactions: transactions.rows.map((row) => ({
      id: row.id,
      type: row.type,
      amount: Number(row.amount_pkr),
      referenceType: row.reference_type,
      referenceId: row.reference_id,
      description: row.description,
      createdAt: row.created_at,
    })),
  };
}

export class InsufficientWalletBalanceError extends Error {
  balancePkr: number;
  requiredPkr: number;

  constructor(balancePkr: number, requiredPkr: number) {
    super("Insufficient wallet balance.");
    this.name = "InsufficientWalletBalanceError";
    this.balancePkr = balancePkr;
    this.requiredPkr = requiredPkr;
  }
}

export async function reserveWalletForOrder(input: {
  userId: number;
  orderIdempotencyKey: string;
  serviceId: string;
  serviceName: string;
  platform: string;
  link: string;
  quantity: number;
  ratePkr: number;
  chargePkr: number;
}) {
  await ensureWalletSchema();

  const client = await db.connect();
  try {
    await client.query("BEGIN");

    const existing = await client.query(
      `SELECT id, provider_order_id, status, charge_pkr, created_at
       FROM vexo_orders
       WHERE idempotency_key = $1 AND user_id = $2
       LIMIT 1`,
      [input.orderIdempotencyKey, input.userId]
    );

    if (existing.rows[0]) {
      await client.query("COMMIT");
      return {
        existing: true,
        order: existing.rows[0],
        balancePkr: null,
      };
    }

    await client.query(
      `INSERT INTO vexo_wallets (user_id) VALUES ($1)
       ON CONFLICT (user_id) DO NOTHING`,
      [input.userId]
    );

    const walletResult = await client.query(
      `SELECT balance_pkr, COALESCE(bonus_balance_pkr, 0) AS bonus_balance_pkr
       FROM vexo_wallets WHERE user_id = $1 FOR UPDATE`,
      [input.userId]
    );

    const realBalancePkr = Number(walletResult.rows[0]?.balance_pkr ?? 0);
    const bonusBalancePkr = Number(walletResult.rows[0]?.bonus_balance_pkr ?? 0);
    const totalAvailable = Math.round((realBalancePkr + bonusBalancePkr) * 100) / 100;
    const chargePkr = Math.round(input.chargePkr * 100) / 100;

    if (!Number.isFinite(chargePkr) || chargePkr <= 0) {
      throw new Error("Invalid order charge.");
    }

    if (totalAvailable + 0.000001 < chargePkr) {
      throw new InsufficientWalletBalanceError(totalAvailable, chargePkr);
    }

    // Promotional bonus credit is deducted first, then real deposited balance
    const bonusChargePkr = Math.round(Math.min(bonusBalancePkr, chargePkr) * 100) / 100;
    const realChargePkr = Math.round((chargePkr - bonusChargePkr) * 100) / 100;

    const orderResult = await client.query(
      `INSERT INTO vexo_orders
        (user_id, idempotency_key, service_id, service_name, platform, link, quantity, rate_pkr, rate, charge_pkr, bonus_charge_pkr, real_charge_pkr, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $8, $9, $10, $11, 'Payment Reserved')
       RETURNING id, charge_pkr, bonus_charge_pkr, real_charge_pkr, status, created_at`,
      [
        input.userId,
        input.orderIdempotencyKey,
        input.serviceId,
        input.serviceName,
        input.platform,
        input.link,
        input.quantity,
        input.ratePkr,
        chargePkr,
        bonusChargePkr,
        realChargePkr,
      ]
    );

    const order = orderResult.rows[0];

    await client.query(
      `UPDATE vexo_wallets
       SET balance_pkr = balance_pkr - $2,
           bonus_balance_pkr = bonus_balance_pkr - $3,
           updated_at = NOW()
       WHERE user_id = $1`,
      [input.userId, realChargePkr, bonusChargePkr]
    );

    if (bonusChargePkr > 0) {
      await client.query(
        `INSERT INTO vexo_wallet_transactions
          (user_id, type, amount_pkr, reference_type, reference_id, description)
         VALUES ($1, 'Debit', $2, 'order_bonus', $3, $4)`,
        [input.userId, bonusChargePkr, order.id, `Payment for order ${order.id} (Promotional Bonus Credit)`]
      );
    }

    if (realChargePkr > 0) {
      await client.query(
        `INSERT INTO vexo_wallet_transactions
          (user_id, type, amount_pkr, reference_type, reference_id, description)
         VALUES ($1, 'Debit', $2, 'order_real', $3, $4)`,
        [input.userId, realChargePkr, order.id, `Payment for order ${order.id} (Real Balance)`]
      );
    }

    await client.query("COMMIT");

    return {
      existing: false,
      order,
      balancePkr: realBalancePkr - realChargePkr,
      bonusBalancePkr: bonusBalancePkr - bonusChargePkr,
      totalAvailablePkr: totalAvailable - chargePkr,
    };
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

export async function markOrderProviderSuccess(orderId: string, providerOrderId: string) {
  await ensureWalletSchema();
  const result = await db.query(
    `UPDATE vexo_orders
     SET provider_order_id = $2, status = 'Pending', updated_at = NOW(), failure_reason = NULL
     WHERE id = $1
     RETURNING id, charge_pkr, status`,
    [orderId, providerOrderId]
  );
  return result.rows[0] ?? null;
}

export async function refundFailedOrder(orderId: string, reason: string) {
  await ensureWalletSchema();
  const client = await db.connect();
  try {
    await client.query("BEGIN");

    const orderResult = await client.query(
      `SELECT id, user_id, charge_pkr, COALESCE(bonus_charge_pkr, 0) AS bonus_charge_pkr, COALESCE(real_charge_pkr, 0) AS real_charge_pkr, status
       FROM vexo_orders
       WHERE id = $1
       FOR UPDATE`,
      [orderId]
    );

    const order = orderResult.rows[0];
    if (!order) {
      await client.query("ROLLBACK");
      return null;
    }

    if (order.status !== "Payment Reserved") {
      await client.query("COMMIT");
      return order;
    }

    await client.query(
      `INSERT INTO vexo_wallets (user_id) VALUES ($1)
       ON CONFLICT (user_id) DO NOTHING`,
      [order.user_id]
    );

    const totalCharge = Number(order.charge_pkr || 0);
    let bonusRefund = Number(order.bonus_charge_pkr || 0);
    let realRefund = Number(order.real_charge_pkr || 0);

    // Fallback for legacy orders placed before split tracking
    if (bonusRefund === 0 && realRefund === 0 && totalCharge > 0) {
      realRefund = totalCharge;
    }

    await client.query(
      `UPDATE vexo_wallets
       SET balance_pkr = balance_pkr + $2,
           bonus_balance_pkr = bonus_balance_pkr + $3,
           updated_at = NOW()
       WHERE user_id = $1`,
      [order.user_id, realRefund, bonusRefund]
    );

    if (realRefund > 0) {
      await client.query(
        `INSERT INTO vexo_wallet_transactions
          (user_id, type, amount_pkr, reference_type, reference_id, description)
         VALUES ($1, 'Refund', $2, 'order_refund', $3, $4)
         ON CONFLICT (reference_type, reference_id) DO NOTHING`,
        [order.user_id, realRefund, order.id, `Refund for failed order ${order.id}: ${reason}`]
      );
    }

    if (bonusRefund > 0) {
      await client.query(
        `INSERT INTO vexo_wallet_transactions
          (user_id, type, amount_pkr, reference_type, reference_id, description)
         VALUES ($1, 'Refund', $2, 'order_bonus_refund', $3, $4)
         ON CONFLICT (reference_type, reference_id) DO NOTHING`,
        [order.user_id, bonusRefund, order.id, `Promotional bonus credit restored for failed order ${order.id}: ${reason}`]
      );
    }

    await client.query(
      `UPDATE vexo_orders
       SET status = 'Payment Refunded', failure_reason = $2, updated_at = NOW()
       WHERE id = $1`,
      [order.id, reason]
    );

    await client.query("COMMIT");
    return { ...order, status: "Payment Refunded" };
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}
