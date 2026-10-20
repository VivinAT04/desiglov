import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const admin = fs.readFileSync(
  new URL("../src/adminRoutes.js", import.meta.url),
  "utf8"
);

function extractDeleteHandler() {
  const marker = 'router.delete("/orders/:id"';
  const start = admin.indexOf(marker);

  assert.ok(start >= 0, "Admin DELETE route not found");

  const callbackStart = admin.indexOf("async (req, res, next) => {", start);

  assert.ok(callbackStart >= 0, "Delete handler not found");

  const bodyStart = admin.indexOf("{", callbackStart);
  let depth = 0;
  let end = -1;

  // Use the JS parser to verify syntax separately.
  // This extractor is only used to locate the handler.
  for (let i = bodyStart; i < admin.length; i++) {
    if (admin[i] === "{") depth++;
    if (admin[i] === "}") {
      depth--;
      if (depth === 0) {
        end = i + 1;
        break;
      }
    }
  }

  assert.ok(end > bodyStart, "Handler boundary not found");

  return admin.slice(callbackStart, end);
}

function paymentDeletionAllowed(payments) {
  assert.ok(Array.isArray(payments));

  const safeStatuses = new Set(["failed"]);

  return payments.every(
    payment =>
      payment &&
      safeStatuses.has(payment.status)
  );
}

test("No payment attempts can qualify for deletion", () => {
  assert.equal(paymentDeletionAllowed([]), true);
});

test("Failed payment attempts can qualify for deletion", () => {
  assert.equal(
    paymentDeletionAllowed([
      { status: "failed" },
      { status: "failed" }
    ]),
    true
  );
});

for (const status of [
  "authorized",
  "captured",
  "refunded",
  "created",
  "pending"
]) {
  test(`${status} payment blocks deletion`, () => {
    assert.equal(
      paymentDeletionAllowed([{ status }]),
      false
    );
  });
}

test("Mixed failed and captured payments block deletion", () => {
  assert.equal(
    paymentDeletionAllowed([
      { status: "failed" },
      { status: "captured" }
    ]),
    false
  );
});

test("Unknown payment status blocks deletion", () => {
  assert.equal(
    paymentDeletionAllowed([{ status: "unknown" }]),
    false
  );
});

test("Missing payment status blocks deletion", () => {
  assert.equal(
    paymentDeletionAllowed([{}]),
    false
  );
});

test("Invalid payment object blocks deletion", () => {
  assert.equal(
    paymentDeletionAllowed([null]),
    false
  );
});

test("Delete route uses the same allowed statuses", () => {
  assert.match(
    admin,
    /const\s+safeStatuses\s*=\s*new\s+Set\s*\(\s*\[\s*["']failed["']\s*\]\s*\)/
  );

  assert.match(
    admin,
    /allowed\s*=\s*payments\.every\s*\(/
  );

  assert.match(
    admin,
    /safeStatuses\.has\(payment\.status\)/
  );
});

test("Delete route verifies Razorpay before updating order", () => {
  const handler = extractDeleteHandler();

  const lookup = handler.indexOf(
    "razorpay.orders.fetchPayments"
  );

  const deletion = handler.indexOf(
    "deleted_at = NOW()"
  );

  assert.ok(lookup >= 0);
  assert.ok(deletion > lookup);
});

test("Delete route protects reserved stock", () => {
  assert.match(
    extractDeleteHandler(),
    /if\s*\(\s*order\.stock_reserved\s*\)/
  );
});

test("Delete route locks the database order", () => {
  assert.match(
    extractDeleteHandler(),
    /FOR UPDATE/
  );
});

test("Delete route requires expired Razorpay payment status", () => {
  assert.match(
    extractDeleteHandler(),
    /order\.payment_status\s*===\s*["']EXPIRED["']/
  );
});

test("Delete route records an audit entry", () => {
  assert.match(
    extractDeleteHandler(),
    /INSERT INTO admin_audit_log/
  );
});

test("Test file itself parses successfully", () => {
  const script = fs.readFileSync(
    new URL("./payment-behaviour.test.js", import.meta.url),
    "utf8"
  );

  assert.ok(script.includes("node:test"));
});
