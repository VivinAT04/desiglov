import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const admin = fs.readFileSync(
  new URL("../src/adminRoutes.js", import.meta.url),
  "utf8"
);

const payment = fs.readFileSync(
  new URL("../src/razorpayPaymentService.js", import.meta.url),
  "utf8"
);

const webhook = fs.readFileSync(
  new URL("../src/razorpayWebhook.js", import.meta.url),
  "utf8"
);

const frontend = fs.readFileSync(
  new URL("../../frontend/src/App.jsx", import.meta.url),
  "utf8"
);

test("Expired Razorpay deletion is implemented", () => {
  assert.match(
    admin,
    /payment_status\s*===?\s*["']EXPIRED["']/
  );
});

test("Razorpay payments are checked before deletion", () => {
  assert.ok(
    admin.includes("razorpay.orders.fetchPayments")
  );
});

test("Incomplete payment lookup blocks deletion", () => {
  assert.ok(
    admin.includes("incompletePaymentList")
  );
});

test("Reserved stock is protected", () => {
  assert.ok(
    admin.includes("order.stock_reserved")
  );
});

test("Orders use soft deletion", () => {
  assert.ok(
    admin.includes("deleted_at = NOW()")
  );
});

test("Admin deletion is audited", () => {
  assert.ok(
    admin.includes("INSERT INTO admin_audit_log")
  );
});

test("Deleted orders are checked during payment finalisation", () => {
  assert.ok(
    payment.includes("if (order.deleted_at)")
  );
});

test("Razorpay order ID is verified", () => {
  assert.ok(
    payment.includes(
      "payment.order_id !== order.razorpay_order_id"
    )
  );
});

test("Payment amount is verified", () => {
  assert.ok(
    payment.includes(
      "Number(payment.amount) !== Number(order.total_inr) * 100"
    )
  );
});

test("Payment currency is verified", () => {
  assert.ok(
    payment.includes('payment.currency !== "INR"')
  );
});

test("Late payments require manual review", () => {
  assert.ok(
    payment.includes("status = 'PAYMENT_REVIEW'")
  );
});

test("Review database update is checked", () => {
  assert.ok(
    payment.includes("reviewResult.rowCount !== 1")
  );
});

test("Deleted orders cannot be fulfilled normally", () => {
  assert.ok(
    payment.includes("AND deleted_at IS NULL")
  );
});

test("Webhook acknowledges payment review", () => {
  assert.ok(
    webhook.includes("error?.paymentNeedsReview")
  );
});

test("Admin dashboard includes payment review orders", () => {
  assert.ok(
    admin.includes("o.status = 'PAYMENT_REVIEW'")
  );
});

test("Frontend supports deleting expired orders", () => {
  assert.ok(
    frontend.includes(
      'order.paymentStatus === "EXPIRED"'
    )
  );
});


test("Refunded Razorpay payments cannot be deleted", () => {
  const deleteRoute = admin.split(
    'router.delete("/orders/:id"'
  )[1];

  assert.ok(deleteRoute, "Delete route must exist");

  assert.match(
    deleteRoute,
    /const\s+safeStatuses\s*=\s*new\s+Set\s*\(\s*\[\s*["']failed["']\s*\]\s*\)/
  );

  assert.doesNotMatch(
    deleteRoute,
    /safeStatuses\s*=\s*new\s+Set\s*\(\s*\[[^\]]*["']refunded["']/
  );
});
