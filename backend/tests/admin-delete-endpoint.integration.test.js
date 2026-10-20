import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { registerHooks } from "node:module";
import pg from "pg";

const DATABASE_URL =
  "postgresql://127.0.0.1:55432/desiglov_integration_test?sslmode=disable";

const EXPECTED_DIRECTORY =
  `${process.env.HOME}/.desiglov-postgres-test`;

const MOCK_RAZORPAY_URL =
  "desiglov-test:mock-razorpay";

const MOCK_AUTH_URL =
  "desiglov-test:mock-auth";

const { port1, port2 } =
  new MessageChannel();

const responses = new Map();

globalThis.__desiglovPaymentResponses =
  responses;

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (
      specifier === "razorpay" &&
      context.parentURL?.endsWith(
        "/src/adminRoutes.js"
      )
    ) {
      return {
        url: MOCK_RAZORPAY_URL,
        shortCircuit: true,
      };
    }

    if (
      specifier === "./auth.js" &&
      context.parentURL?.endsWith(
        "/src/adminRoutes.js"
      )
    ) {
      return {
        url: MOCK_AUTH_URL,
        shortCircuit: true,
      };
    }

    return nextResolve(
      specifier,
      context
    );
  },

  load(url, context, nextLoad) {
    if (url === MOCK_RAZORPAY_URL) {
      return {
        format: "module",
        shortCircuit: true,
        source: `
          export default class Razorpay {
            constructor() {
              this.orders = {
                fetchPayments: async (orderId) => {
                  const response =
                    globalThis.__desiglovPaymentResponses
                      .get(orderId);

                  if (response instanceof Error) {
                    throw response;
                  }

                  if (response === undefined) {
                    throw new Error(
                      "No mocked Razorpay response."
                    );
                  }

                  return response;
                }
              };
            }
          }
        `,
      };
    }

    if (url === MOCK_AUTH_URL) {
      return {
        format: "module",
        shortCircuit: true,
        source: `
          export function requireAuth(req, res, next) {
            req.userId =
              "00000000-0000-4000-8000-000000000001";
            req.userEmail =
              "integration-admin@example.invalid";
            next();
          }

          export function requireAdmin(req, res, next) {
            req.admin = {
              id:
                "00000000-0000-4000-8000-000000000001",
              email:
                "integration-admin@example.invalid"
            };
            next();
          }

          export async function writeAdminAudit() {}
        `,
      };
    }

    return nextLoad(
      url,
      context
    );
  },
});

const express =
  (await import("express")).default;

const { default: adminRoutes } =
  await import("../src/adminRoutes.js");

const pool = new pg.Pool({
  connectionString: DATABASE_URL,
  max: 2,
  allowExitOnIdle: true,
});

async function verifyDatabase() {
  const result = await pool.query(`
    SELECT
      current_database() AS db,
      inet_server_port() AS port,
      current_setting('data_directory') AS directory
  `);

  const row = result.rows[0];

  assert.equal(
    row.db,
    "desiglov_integration_test"
  );

  assert.equal(
    row.port,
    55432
  );

  assert.equal(
    row.directory,
    EXPECTED_DIRECTORY
  );
}

async function createOrder(options = {}) {
  const userId = randomUUID();
  const orderId = randomUUID();

  const paymentMethod =
    options.paymentMethod ?? "RAZORPAY";

  const paymentStatus =
    options.paymentStatus ?? "EXPIRED";

  const orderStatus =
    options.orderStatus ?? "PENDING";

  const razorpayOrderId =
    paymentMethod === "RAZORPAY"
      ? `order_test_${randomUUID().replaceAll("-", "")}`
      : null;

  await pool.query(
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
      "Endpoint Test Customer",
      `endpoint-${userId}@example.invalid`,
    ]
  );

  await pool.query(
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
      $4, $5, $6,
      369, 0, 0, 369,
      $7, $8, $9
    )
    `,
    [
      orderId,
      `DG-ENDPOINT-${randomUUID().slice(0, 8)}`,
      userId,
      orderStatus,
      paymentStatus,
      paymentMethod,
      razorpayOrderId,
      options.paymentId ?? null,
      options.stockReserved ?? false,
    ]
  );

  return {
    orderId,
    razorpayOrderId,
  };
}

const app = express();

app.use(express.json());

app.use("/api/admin", adminRoutes);

app.use((error, req, res, next) => {
  res.status(500).json({
    error: error.message,
  });
});

const server = app.listen(
  0,
  "127.0.0.1"
);

await new Promise((resolve) => {
  if (server.listening) {
    resolve();
  } else {
    server.once("listening", resolve);
  }
});

const address = server.address();

const baseUrl =
  `http://127.0.0.1:${address.port}`;

async function deleteOrder(orderId) {
  const response = await fetch(
    `${baseUrl}/api/admin/orders/${orderId}`,
    {
      method: "DELETE",
    }
  );

  return {
    status: response.status,
    body: await response.json(),
  };
}

async function inspectOrder(orderId) {
  const order = await pool.query(
    `
    SELECT
      deleted_at,
      deleted_by,
      stock_reserved
    FROM orders
    WHERE id = $1
    `,
    [orderId]
  );

  const audit = await pool.query(
    `
    SELECT
      action,
      entity_id,
      metadata
    FROM admin_audit_log
    WHERE entity_id = $1
      AND action = 'ORDER_SOFT_DELETED'
    `,
    [orderId]
  );

  return {
    order: order.rows[0],
    audit: audit.rows,
  };
}

test(
  "Isolated database identity verified",
  async () => {
    await verifyDatabase();
  }
);

const scenarios = [
  {
    name: "Expired order without payment attempts",
    payments: { count: 0, items: [] },
    expectedStatus: 200,
  },
  {
    name: "Expired order with failed payments",
    payments: {
      count: 1,
      items: [{ status: "failed" }],
    },
    expectedStatus: 200,
  },
  {
    name: "Captured payment protected",
    payments: {
      count: 1,
      items: [{ status: "captured" }],
    },
    expectedStatus: 409,
  },
  {
    name: "Authorized payment protected",
    payments: {
      count: 1,
      items: [{ status: "authorized" }],
    },
    expectedStatus: 409,
  },
  {
    name: "Refunded payment protected",
    payments: {
      count: 1,
      items: [{ status: "refunded" }],
    },
    expectedStatus: 409,
  },
  {
    name: "Incomplete Razorpay response blocked",
    payments: {
      count: 2,
      items: [{ status: "failed" }],
    },
    expectedStatus: 503,
  },
  {
    name: "Razorpay verification error blocked",
    payments: new Error("Mocked failure"),
    expectedStatus: 503,
  },
];

for (const scenario of scenarios) {
  test(
    scenario.name,
    async () => {
      await verifyDatabase();

      const {
        orderId,
        razorpayOrderId,
      } = await createOrder();

      responses.set(
        razorpayOrderId,
        scenario.payments
      );

      const result =
        await deleteOrder(orderId);

      assert.equal(
        result.status,
        scenario.expectedStatus,
        JSON.stringify(result.body)
      );

      const state =
        await inspectOrder(orderId);

      const shouldDelete =
        scenario.expectedStatus === 200;

      assert.equal(
        Boolean(state.order.deleted_at),
        shouldDelete
      );

      assert.equal(
        state.audit.length,
        shouldDelete ? 1 : 0
      );

      if (shouldDelete) {
        assert.equal(
          state.audit[0].action,
          "ORDER_SOFT_DELETED"
        );
      }
    }
  );
}

test(
  "Reserved stock blocks deletion",
  async () => {
    await verifyDatabase();

    const { orderId } =
      await createOrder({
        stockReserved: true,
      });

    const result =
      await deleteOrder(orderId);

    assert.equal(result.status, 409);

    const state =
      await inspectOrder(orderId);

    assert.equal(
      state.order.deleted_at,
      null
    );

    assert.equal(
      state.order.stock_reserved,
      true
    );

    assert.equal(
      state.audit.length,
      0
    );
  }
);

test(
  "Cancelled COD order can be deleted",
  async () => {
    await verifyDatabase();

    const { orderId } =
      await createOrder({
        paymentMethod: "COD",
        paymentStatus: "PENDING",
        orderStatus: "CANCELLED",
      });

    const result =
      await deleteOrder(orderId);

    assert.equal(result.status, 200);

    const state =
      await inspectOrder(orderId);

    assert.ok(
      state.order.deleted_at
    );

    assert.equal(
      state.audit.length,
      1
    );
  }
);

test.after(async () => {
  await pool.end();

  await new Promise((resolve) => {
    server.close(resolve);
  });

  port1.close();
  port2.close();
});
