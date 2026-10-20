
import test, { after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { registerHooks } from "node:module";
import { MessageChannel } from "node:worker_threads";
import pg from "pg";

const DATABASE_URL =
  "postgresql://127.0.0.1:55432/desiglov_integration_test?sslmode=disable";

const EXPECTED_DIRECTORY =
  `${process.env.HOME}/.desiglov-postgres-test`;

const { port1, port2 } = new MessageChannel();

const MOCK_AUTH = "desiglov-test:cancel-auth";
const MOCK_RAZORPAY = "desiglov-test:cancel-razorpay";

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (
      specifier === "./auth.js" &&
      context.parentURL?.endsWith("/src/adminRoutes.js")
    ) {
      return {
        url: MOCK_AUTH,
        shortCircuit: true,
      };
    }

    if (
      specifier === "razorpay" &&
      context.parentURL?.endsWith("/src/adminRoutes.js")
    ) {
      return {
        url: MOCK_RAZORPAY,
        shortCircuit: true,
      };
    }

    return nextResolve(specifier, context);
  },

  load(url, context, nextLoad) {
    if (url === MOCK_AUTH) {
      return {
        format: "module",
        shortCircuit: true,
        source: `
          export function requireAuth(req,res,next) {
            req.userId =
              "00000000-0000-4000-8000-000000000001";
            req.userEmail = "test@example.invalid";
            next();
          }

          export function requireAdmin(req,res,next) {
            req.admin = {
              id: "00000000-0000-4000-8000-000000000001",
              email: "test@example.invalid"
            };
            next();
          }

          export async function writeAdminAudit() {}
        `,
      };
    }

    if (url === MOCK_RAZORPAY) {
      return {
        format: "module",
        shortCircuit: true,
        source: `
          export default class Razorpay {
            constructor() {
              this.orders = {
                fetchPayments: async () => ({
                  count: 0,
                  items: []
                })
              };
            }
          }
        `,
      };
    }

    return nextLoad(url, context);
  },
});

const express = (await import("express")).default;
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

  assert.equal(result.rows[0].db, "desiglov_integration_test");
  assert.equal(result.rows[0].port, 55432);
  assert.equal(result.rows[0].directory, EXPECTED_DIRECTORY);
}

const app = express();
app.use(express.json());
app.use("/api/admin", adminRoutes);

app.use((error, req, res, next) => {
  res.status(error.statusCode || 500).json({
    error: error.message,
  });
});

const server = app.listen(0, "127.0.0.1");

await new Promise(resolve => {
  if (server.listening) resolve();
  else server.once("listening", resolve);
});

const baseUrl =
  `http://127.0.0.1:${server.address().port}`;

after(async () => {
  await new Promise(resolve => server.close(resolve));
  await pool.end();
  port1.close();
  port2.close();
});

async function createOrder({
  method = "COD",
  paymentStatus = "PENDING",
  status = "PLACED",
  reserved = false,
  razorpayReference = null,
} = {}) {
  await verifyDatabase();

  const userId = randomUUID();
  const orderId = randomUUID();

  await pool.query(`
    INSERT INTO users (
      id, full_name, email, role
    )
    VALUES ($1, $2, $3, 'CUSTOMER')
  `, [
    userId,
    "Cancellation Test Customer",
    `cancel-${userId}@example.invalid`,
  ]);

  await pool.query(`
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
      stock_reserved
    )
    VALUES (
      $1, $2, $3,
      $4, $5, $6,
      289, 0, 0, 289,
      $7, $8
    )
  `, [
    orderId,
    `DG-CANCEL-${randomUUID().slice(0, 8)}`,
    userId,
    status,
    paymentStatus,
    method,
    razorpayReference,
    reserved,
  ]);

  return orderId;
}

async function cancelOrder(orderId) {
  const response = await fetch(
    `${baseUrl}/api/admin/orders/${orderId}/status`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        status: "CANCELLED",
      }),
    }
  );

  return {
    status: response.status,
    body: await response.json(),
  };
}

async function inspectOrder(orderId) {
  const result = await pool.query(`
    SELECT status, stock_reserved
    FROM orders
    WHERE id = $1
  `, [orderId]);

  return result.rows[0];
}

test("Test database identity", async () => {
  await verifyDatabase();
});


async function createPhysicalCodOrder() {
  await verifyDatabase();

  const orderId = await createOrder();

  const productId = -Math.floor(
    100000000 + Math.random() * 900000000
  );

  const size = "M";
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    await client.query(`
      INSERT INTO products (
        id, slug, name, category,
        price_inr, stock, reserved_stock,
        sizes, images, active
      )
      VALUES (
        $1, $2, 'COD Test Product', 'TEST',
        289, 9, 0,
        '["M"]'::jsonb, '[]'::jsonb, FALSE
      )
    `, [
      productId,
      `cod-fixture-${randomUUID()}`,
    ]);

    await client.query(`
      INSERT INTO product_size_stock (
        product_id, size, stock, reserved_stock
      )
      VALUES ($1, $2, 9, 0)
    `, [productId, size]);

    await client.query(`
      INSERT INTO order_items (
        id, order_id, product_id,
        product_name, product_slug,
        size, quantity, unit_price_inr
      )
      VALUES (
        $1, $2, $3,
        'COD Test Product', 'cod-test-product',
        $4, 1, 289
      )
    `, [
      randomUUID(),
      orderId,
      productId,
      size,
    ]);

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }

  return { orderId, productId, size };
}

test("Unpaid COD order can be cancelled", async () => {
  const { orderId } = await createPhysicalCodOrder();

  const response = await cancelOrder(orderId);

  assert.equal(
    response.status,
    200,
    JSON.stringify(response.body)
  );

  const order = await inspectOrder(orderId);

  assert.equal(order.status, "CANCELLED");
  assert.equal(order.stock_reserved, false);
});

test("Repeated cancellation is idempotent", async () => {
  const { orderId } = await createPhysicalCodOrder();

  const first = await cancelOrder(orderId);
  const second = await cancelOrder(orderId);

  assert.equal(first.status, 200);
  assert.equal(second.status, 200);

  const order = await inspectOrder(orderId);

  assert.equal(order.status, "CANCELLED");
});

test("Paid Razorpay order cannot be cancelled", async () => {
  const orderId = await createOrder({
    method: "RAZORPAY",
    paymentStatus: "PAID",
    status: "CONFIRMED",
    razorpayReference: `order_test_${randomUUID().replaceAll("-", "")}`,
  });

  const response = await cancelOrder(orderId);

  assert.equal(
    response.status,
    409,
    JSON.stringify(response.body)
  );

  const order = await inspectOrder(orderId);

  assert.equal(order.status, "CONFIRMED");
});

test("Dispatched COD order cannot be cancelled", async () => {
  const orderId = await createOrder({
    method: "COD",
    paymentStatus: "PENDING",
    status: "DISPATCHED",
  });

  const response = await cancelOrder(orderId);

  assert.equal(
    response.status,
    409,
    JSON.stringify(response.body)
  );

  const order = await inspectOrder(orderId);

  assert.equal(order.status, "DISPATCHED");
});

test("Cancelled order cannot be reactivated", async () => {
  const orderId = await createOrder({
    status: "CANCELLED",
  });

  const response = await fetch(
    `${baseUrl}/api/admin/orders/${orderId}/status`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        status: "CONFIRMED",
      }),
    }
  );

  assert.equal(response.status, 409);

  const order = await inspectOrder(orderId);

  assert.equal(order.status, "CANCELLED");
});


// DESIGLOV RESERVED STOCK INTEGRATION TESTS

async function createReservedOrder() {
  await verifyDatabase();

  const productId = -Math.floor(
    100000000 + Math.random() * 900000000
  );

  const size = "M";

  const orderId = await createOrder({
    method: "COD",
    paymentStatus: "PENDING",
    status: "PLACED",
    reserved: false,
  });

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    await client.query(`
      INSERT INTO products (
        id,
        slug,
        name,
        category,
        price_inr,
        stock,
        reserved_stock,
        sizes,
        images,
        active
      )
      VALUES (
        $1,
        $2,
        'Cancellation Integration Test Product',
        'TEST',
        289,
        10,
        1,
        '["M"]'::jsonb,
        '[]'::jsonb,
        FALSE
      )
    `, [
      productId,
      `cancel-test-${randomUUID()}`,
    ]);

    await client.query(`
      INSERT INTO product_size_stock (
        product_id,
        size,
        stock,
        reserved_stock
      )
      VALUES ($1, $2, 10, 1)
    `, [
      productId,
      size,
    ]);

    await client.query(`
      INSERT INTO order_items (
        id,
        order_id,
        product_id,
        product_name,
        product_slug,
        size,
        quantity,
        unit_price_inr
      )
      VALUES (
        $1,
        $2,
        $3,
        'Cancellation Integration Test Product',
        'cancellation-integration-test',
        $4,
        1,
        289
      )
    `, [
      randomUUID(),
      orderId,
      productId,
      size,
    ]);

    await client.query(`
      UPDATE orders
      SET stock_reserved = TRUE
      WHERE id = $1
    `, [orderId]);

    await client.query("COMMIT");

  } catch (error) {
    await client.query("ROLLBACK");
    throw error;

  } finally {
    client.release();
  }

  return {
    orderId,
    productId,
    size,
  };
}

async function inspectReservedStock(productId, size) {
  const result = await pool.query(`
    SELECT
      stock,
      reserved_stock
    FROM product_size_stock
    WHERE product_id = $1
      AND size = $2
  `, [
    productId,
    size,
  ]);

  assert.equal(result.rowCount, 1);

  return result.rows[0];
}

test(
  "COD cancellation releases reserved stock exactly once",
  async () => {
    const fixture = await createReservedOrder();

    const before = await inspectReservedStock(
      fixture.productId,
      fixture.size
    );

    assert.ok(Number(before.reserved_stock) >= 1);

    const first = await cancelOrder(fixture.orderId);

    assert.equal(
      first.status,
      200,
      JSON.stringify(first.body)
    );

    const afterFirst = await inspectReservedStock(
      fixture.productId,
      fixture.size
    );

    assert.equal(
      Number(afterFirst.reserved_stock),
      Number(before.reserved_stock) - 1
    );

    assert.equal(
      Number(afterFirst.stock),
      Number(before.stock)
    );

    const order = await inspectOrder(fixture.orderId);

    assert.equal(order.status, "CANCELLED");
    assert.equal(order.stock_reserved, false);

    const second = await cancelOrder(fixture.orderId);

    assert.equal(
      second.status,
      200,
      JSON.stringify(second.body)
    );

    const afterSecond = await inspectReservedStock(
      fixture.productId,
      fixture.size
    );

    assert.equal(
      Number(afterSecond.reserved_stock),
      Number(afterFirst.reserved_stock)
    );

    assert.equal(
      Number(afterSecond.stock),
      Number(afterFirst.stock)
    );
  }
);

test(
  "Failed reserved-stock release rolls back cancellation",
  async () => {
    const fixture = await createReservedOrder();

    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      await client.query(`
        UPDATE product_size_stock
        SET reserved_stock = 0
        WHERE product_id = $1
          AND size = $2
      `, [
        fixture.productId,
        fixture.size,
      ]);

      await client.query("COMMIT");

    } catch (error) {
      await client.query("ROLLBACK");
      throw error;

    } finally {
      client.release();
    }

    const response = await cancelOrder(fixture.orderId);

    assert.notEqual(
      response.status,
      200,
      "Cancellation must fail when stock release fails"
    );

    const order = await inspectOrder(fixture.orderId);

    assert.equal(
      order.status,
      "PLACED",
      "Failed cancellation must not change order status"
    );

    assert.equal(
      order.stock_reserved,
      true,
      "Failed cancellation must retain reservation flag"
    );
  }
);


// REAL COD PHYSICAL STOCK RESTORATION

test(
  "Cancelling COD restores physical stock exactly once",
  async () => {
    const fixture = await createReservedOrder();

    await pool.query(`
      UPDATE orders
      SET stock_reserved = FALSE
      WHERE id = $1
    `, [fixture.orderId]);

    await pool.query(`
      UPDATE product_size_stock
      SET
        stock = 9,
        reserved_stock = 0
      WHERE product_id = $1
        AND size = $2
    `, [
      fixture.productId,
      fixture.size,
    ]);

    const first = await cancelOrder(fixture.orderId);

    assert.equal(
      first.status,
      200,
      JSON.stringify(first.body)
    );

    const afterFirst = await inspectReservedStock(
      fixture.productId,
      fixture.size
    );

    assert.equal(Number(afterFirst.stock), 10);
    assert.equal(Number(afterFirst.reserved_stock), 0);

    const second = await cancelOrder(fixture.orderId);

    assert.equal(
      second.status,
      200,
      JSON.stringify(second.body)
    );

    const afterSecond = await inspectReservedStock(
      fixture.productId,
      fixture.size
    );

    assert.equal(Number(afterSecond.stock), 10);
    assert.equal(Number(afterSecond.reserved_stock), 0);

    const order = await inspectOrder(fixture.orderId);

    assert.equal(order.status, "CANCELLED");
    assert.equal(order.stock_reserved, false);
  }
);


// MULTI-ITEM COD CANCELLATION SAFETY

async function createMultiItemCodOrder() {
  await verifyDatabase();

  const orderId = await createOrder();

  const products = [
    {
      id: -Math.floor(100000000 + Math.random() * 900000000),
      size: "M",
      quantity: 2,
      stock: 8,
    },
    {
      id: -Math.floor(100000000 + Math.random() * 900000000),
      size: "L",
      quantity: 3,
      stock: 7,
    },
  ];

  if (products[0].id === products[1].id) {
    throw new Error("Test product ID collision");
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    for (const product of products) {
      await client.query(`
        INSERT INTO products (
          id,
          slug,
          name,
          category,
          price_inr,
          stock,
          reserved_stock,
          sizes,
          images,
          active
        )
        VALUES (
          $1, $2,
          'Multi Item COD Test',
          'TEST',
          289,
          $3,
          0,
          '["M","L"]'::jsonb,
          '[]'::jsonb,
          FALSE
        )
      `, [
        product.id,
        `multi-cod-${randomUUID()}`,
        product.stock,
      ]);

      await client.query(`
        INSERT INTO product_size_stock (
          product_id,
          size,
          stock,
          reserved_stock
        )
        VALUES ($1, $2, $3, 0)
      `, [
        product.id,
        product.size,
        product.stock,
      ]);

      await client.query(`
        INSERT INTO order_items (
          id,
          order_id,
          product_id,
          product_name,
          product_slug,
          size,
          quantity,
          unit_price_inr
        )
        VALUES (
          $1, $2, $3,
          'Multi Item COD Test',
          'multi-item-cod-test',
          $4, $5, 289
        )
      `, [
        randomUUID(),
        orderId,
        product.id,
        product.size,
        product.quantity,
      ]);
    }

    await client.query("COMMIT");

  } catch (error) {
    await client.query("ROLLBACK");
    throw error;

  } finally {
    client.release();
  }

  return { orderId, products };
}

async function inspectMultiItemStock(products) {
  const rows = [];

  for (const product of products) {
    const result = await pool.query(`
      SELECT
        stock,
        reserved_stock
      FROM product_size_stock
      WHERE product_id = $1
        AND size = $2
    `, [
      product.id,
      product.size,
    ]);

    rows.push(
      result.rowCount === 1
        ? result.rows[0]
        : null
    );
  }

  return rows;
}

test(
  "Multi-item COD cancellation restores all product quantities",
  async () => {
    const fixture = await createMultiItemCodOrder();

    const response = await cancelOrder(fixture.orderId);

    assert.equal(
      response.status,
      200,
      JSON.stringify(response.body)
    );

    const stocks = await inspectMultiItemStock(
      fixture.products
    );

    for (let i = 0; i < fixture.products.length; i++) {
      assert.ok(stocks[i]);

      assert.equal(
        Number(stocks[i].stock),
        fixture.products[i].stock +
          fixture.products[i].quantity
      );

      assert.equal(
        Number(stocks[i].reserved_stock),
        0
      );
    }

    const second = await cancelOrder(fixture.orderId);

    assert.equal(second.status, 200);

    const afterSecond = await inspectMultiItemStock(
      fixture.products
    );

    assert.deepEqual(afterSecond, stocks);

    const order = await inspectOrder(fixture.orderId);

    assert.equal(order.status, "CANCELLED");
  }
);

test(
  "Multi-item COD cancellation rolls back if inventory is missing",
  async () => {
    const fixture = await createMultiItemCodOrder();

    const missing = fixture.products[1];

    await pool.query(`
      DELETE FROM product_size_stock
      WHERE product_id = $1
        AND size = $2
    `, [
      missing.id,
      missing.size,
    ]);

    const before = await inspectMultiItemStock(
      fixture.products
    );

    assert.ok(before[0]);
    assert.equal(before[1], null);

    const response = await cancelOrder(fixture.orderId);

    assert.equal(
      response.status,
      409,
      JSON.stringify(response.body)
    );

    const after = await inspectMultiItemStock(
      fixture.products
    );

    assert.deepEqual(after, before);

    const order = await inspectOrder(fixture.orderId);

    assert.equal(order.status, "PLACED");
    assert.equal(order.stock_reserved, false);
  }
);
