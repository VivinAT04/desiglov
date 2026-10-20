import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const adminSource = fs.readFileSync(
  new URL("../src/adminRoutes.js", import.meta.url),
  "utf8"
);

const stockSource = fs.readFileSync(
  new URL("../src/razorpayPaymentService.js", import.meta.url),
  "utf8"
);

const frontendSource = fs.readFileSync(
  new URL("../../frontend/src/App.jsx", import.meta.url),
  "utf8"
);

const start = adminSource.indexOf(
  'router.patch(\n  "/orders/:id/status",'
);

const end = adminSource.indexOf(
  "// CUSTOMERS",
  start
);

assert.ok(start >= 0, "Status endpoint not found");
assert.ok(end > start, "Status endpoint boundary not found");

const route = adminSource.slice(start, end);

test("Cancellation uses a database transaction", () => {
  assert.match(route, /pool\.connect\(\)/);
  assert.match(route, /query\("BEGIN"\)/);
  assert.match(route, /query\("COMMIT"\)/);
  assert.match(route, /query\("ROLLBACK"\)/);
});

test("Cancellation locks the order", () => {
  assert.match(route, /FOR UPDATE/);
});

test("Cancellation checks COD payment method", () => {
  assert.match(
    route,
    /existing\.payment_method !== "COD"/
  );
});

test("Cancellation requires pending payment", () => {
  assert.match(
    route,
    /existing\.payment_status !== "PENDING"/
  );
});

test("Cancellation rejects Razorpay payment references", () => {
  assert.match(route, /existing\.razorpay_order_id/);
  assert.match(route, /existing\.razorpay_payment_id/);
});

test("Cancellation restricts eligible order statuses", () => {
  assert.match(route, /"PLACED"/);
  assert.match(route, /"CONFIRMED"/);
  assert.match(route, /"PACKED"/);
  assert.match(route, /allowedStatuses\.includes/);
});

test("Cancellation calls reserved stock release", () => {
  assert.match(
    route,
    /await releaseReservedStock\(\s*client,\s*existing\.id/
  );
});

test("Stock release locks the order", () => {
  assert.match(
    stockSource,
    /export async function releaseReservedStock/
  );

  assert.match(
    stockSource,
    /FOR UPDATE/
  );
});

test("Stock release is idempotent", () => {
  assert.match(
    stockSource,
    /if \(!order\.stock_reserved\)/
  );

  assert.match(
    stockSource,
    /return false/
  );
});

test("Stock release clears reservation flag", () => {
  assert.match(
    stockSource,
    /stock_reserved = FALSE/
  );

  assert.match(
    stockSource,
    /reservation_expires_at = NULL/
  );
});

test("Cancelled orders cannot be reactivated", () => {
  assert.match(
    route,
    /Cancelled orders cannot be reactivated/
  );
});

test("Deleted orders cannot be updated", () => {
  assert.match(
    route,
    /Deleted orders cannot be updated/
  );
});

test("Cancellation records administrator audit", () => {
  assert.match(route, /writeAdminAudit/);
  assert.match(route, /ORDER_STATUS_CHANGED/);
  assert.match(route, /stockReleased/);
});

test("Frontend cancellation calls backend save", () => {
  assert.match(
    frontendSource,
    /await onSave\(\s*order\.id,\s*"CANCELLED"/
  );
});

test("Frontend prevents duplicate cancellation clicks", () => {
  assert.match(
    frontendSource,
    /disabled=\{saving \|\| status === "CANCELLED"\}/
  );
});
