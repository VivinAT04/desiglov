import test from "node:test";
import assert from "node:assert/strict";
import pg from "pg";
import { randomUUID } from "node:crypto";

const TEST_DATABASE =
  "desiglov_integration_test";

const TEST_PORT = 55432;

const TEST_DATA_DIRECTORY =
  `${process.env.HOME}/.desiglov-postgres-test`;

const connectionString =
  "postgresql://127.0.0.1:55432/desiglov_integration_test?sslmode=disable";

const pool = new pg.Pool({
  connectionString,
  max: 2,
  connectionTimeoutMillis: 5000,
  allowExitOnIdle: true,
});

async function verifyDatabase() {
  const result = await pool.query(`
    SELECT
      current_database() AS database_name,
      inet_server_port() AS server_port,
      current_setting('data_directory') AS data_directory
  `);

  const row = result.rows[0];

  assert.equal(
    row.database_name,
    TEST_DATABASE
  );

  assert.equal(
    row.server_port,
    TEST_PORT
  );

  assert.equal(
    row.data_directory,
    TEST_DATA_DIRECTORY
  );
}

function evaluateRazorpayPayments(response) {
  if (
    !response ||
    !Array.isArray(response.items) ||
    !Number.isInteger(response.count) ||
    response.count !== response.items.length
  ) {
    return false;
  }

  return response.items.every(
    (payment) =>
      payment &&
      typeof payment === "object" &&
      payment.status === "failed"
  );
}

async function runDeletionDecision(
  client,
  orderId,
  razorpayResponse
) {
  await client.query("BEGIN");

  try {
    const result = await client.query(
      `
      SELECT
        id,
        payment_method,
        payment_status,
        razorpay_order_id,
        razorpay_payment_id,
        stock_reserved,
        deleted_at
      FROM orders
      WHERE id = $1
      FOR UPDATE
      `,
      [orderId]
    );

    const order = result.rows[0];

    if (!order) {
      await client.query("ROLLBACK");
      return false;
    }

    const eligible =
      order.payment_method === "RAZORPAY" &&
      order.payment_status === "EXPIRED" &&
      Boolean(order.razorpay_order_id) &&
      !order.razorpay_payment_id &&
      !order.stock_reserved &&
      !order.deleted_at &&
      evaluateRazorpayPayments(
        razorpayResponse
      );

    if (!eligible) {
      await client.query("ROLLBACK");
      return false;
    }

    const updated = await client.query(
      `
      UPDATE orders
      SET
        deleted_at = NOW(),
        updated_at = NOW()
      WHERE id = $1
        AND deleted_at IS NULL
      RETURNING id
      `,
      [orderId]
    );

    await client.query("COMMIT");

    return updated.rowCount === 1;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  }
}

async function insertTestOrder(
  client,
  {
    paymentStatus = "EXPIRED",
    paymentMethod = "RAZORPAY",
    razorpayOrderId = `order_test_${randomUUID().replaceAll("-", "")}`,
    razorpayPaymentId = null,
    stockReserved = false,
  } = {}
) {
  const userId = randomUUID();
  const orderId = randomUUID();

  await client.query(
    `
    INSERT INTO users (
      id,
      full_name,
      email,
      role
    )
    VALUES ($1, $2, $3, 'CUSTOMER')
    `,
    [
      userId,
      "DesiGlov Integration Test",
      `integration-${userId}@example.invalid`,
    ]
  );

  await client.query(
    `
    INSERT INTO orders (
      id,
      order_number,
      user_id,
      status,
      payment_status,
      payment_method,
      subtotal_inr,
      shipping_inr,
      cod_fee_inr,
      total_inr,
      razorpay_order_id,
      razorpay_payment_id,
      stock_reserved
    )
    VALUES (
      $1, $2, $3,
      'PENDING',
      $4, $5,
      369, 0, 0, 369,
      $6, $7, $8
    )
    `,
    [
      orderId,
      `DG-TEST-${randomUUID().slice(0, 8)}`,
      userId,
      paymentStatus,
      paymentMethod,
      razorpayOrderId,
      razorpayPaymentId,
      stockReserved,
    ]
  );

  return { userId, orderId };
}

const scenarios = [
  {
    name: "Expired order with no payment attempts can be deleted",
    payments: { count: 0, items: [] },
    expected: true,
  },
  {
    name: "Expired order with failed payment can be deleted",
    payments: {
      count: 1,
      items: [{ status: "failed" }],
    },
    expected: true,
  },
  {
    name: "Captured payment blocks deletion",
    payments: {
      count: 1,
      items: [{ status: "captured" }],
    },
    expected: false,
  },
  {
    name: "Authorized payment blocks deletion",
    payments: {
      count: 1,
      items: [{ status: "authorized" }],
    },
    expected: false,
  },
  {
    name: "Refunded payment blocks deletion",
    payments: {
      count: 1,
      items: [{ status: "refunded" }],
    },
    expected: false,
  },
  {
    name: "Mixed failed and captured payments block deletion",
    payments: {
      count: 2,
      items: [
        { status: "failed" },
        { status: "captured" },
      ],
    },
    expected: false,
  },
  {
    name: "Incomplete payment lookup blocks deletion",
    payments: {
      count: 2,
      items: [{ status: "failed" }],
    },
    expected: false,
  },
  {
    name: "Unknown payment status blocks deletion",
    payments: {
      count: 1,
      items: [{ status: "unknown" }],
    },
    expected: false,
  },
  {
    name: "Missing payment status blocks deletion",
    payments: {
      count: 1,
      items: [{}],
    },
    expected: false,
  },
  {
    name: "Malformed Razorpay response blocks deletion",
    payments: null,
    expected: false,
  },
];

test(
  "Verify isolated PostgreSQL identity",
  async () => {
    await verifyDatabase();
  }
);

for (const scenario of scenarios) {
  test(
    scenario.name,
    async () => {
      await verifyDatabase();

      const client = await pool.connect();

      try {
        await client.query("BEGIN");

        const { orderId } =
          await insertTestOrder(client);

        await client.query("COMMIT");

        const deleted =
          await runDeletionDecision(
            client,
            orderId,
            scenario.payments
          );

        assert.equal(
          deleted,
          scenario.expected
        );

        const result = await client.query(
          `
          SELECT deleted_at
          FROM orders
          WHERE id = $1
          `,
          [orderId]
        );

        assert.equal(
          Boolean(result.rows[0].deleted_at),
          scenario.expected
        );
      } finally {
        try {
          await client.query("ROLLBACK");
        } finally {
          client.release();
        }
      }
    }
  );
}

test(
  "Reserved stock blocks deletion",
  async () => {
    await verifyDatabase();

    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const { orderId } =
        await insertTestOrder(client, {
          stockReserved: true,
        });

      await client.query("COMMIT");

      const deleted =
        await runDeletionDecision(
          client,
          orderId,
          { count: 0, items: [] }
        );

      assert.equal(deleted, false);

      const result = await client.query(
        `
        SELECT deleted_at, stock_reserved
        FROM orders
        WHERE id = $1
        `,
        [orderId]
      );

      assert.equal(
        result.rows[0].deleted_at,
        null
      );

      assert.equal(
        result.rows[0].stock_reserved,
        true
      );
    } finally {
      client.release();
    }
  }
);

test(
  "Existing Razorpay payment ID blocks deletion",
  async () => {
    await verifyDatabase();

    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const { orderId } =
        await insertTestOrder(client, {
          razorpayPaymentId: `pay_test_${randomUUID().replaceAll("-", "")}`,
        });

      await client.query("COMMIT");

      const deleted =
        await runDeletionDecision(
          client,
          orderId,
          { count: 0, items: [] }
        );

      assert.equal(deleted, false);
    } finally {
      client.release();
    }
  }
);

test.after(async () => {
  await pool.end();
});
