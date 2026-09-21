import { pool } from "./db.js";


export async function releaseReservedStock(
  client,
  orderId
) {
  // Lock the order first. This makes release and payment
  // finalisation mutually exclusive.
  const orderResult =
    await client.query(
      `
      SELECT
        id,
        stock_reserved
      FROM orders
      WHERE id = $1
      FOR UPDATE
      `,
      [orderId]
    );

  if (
    orderResult.rowCount === 0
  ) {
    const error =
      new Error(
        "Order not found while releasing reserved stock."
      );

    error.statusCode = 404;
    throw error;
  }

  const order =
    orderResult.rows[0];

  // Idempotent: reservation was already consumed/released.
  if (!order.stock_reserved) {
    return false;
  }

  const itemResult =
    await client.query(
      `
      SELECT
        product_id,
        SUM(quantity)::int AS quantity
      FROM order_items
      WHERE order_id = $1
      GROUP BY product_id
      ORDER BY product_id ASC
      `,
      [orderId]
    );

  if (
    itemResult.rowCount === 0
  ) {
    throw new Error(
      "Cannot release reservation because the order contains no items."
    );
  }

  for (
    const item of
    itemResult.rows
  ) {
    const result =
      await client.query(
        `
        UPDATE products
        SET
          reserved_stock =
            reserved_stock - $1,
          updated_at =
            NOW()
        WHERE
          id = $2
          AND reserved_stock >= $1
        RETURNING
          id,
          reserved_stock
        `,
        [
          Number(item.quantity),
          item.product_id,
        ]
      );

    if (
      result.rowCount !== 1
    ) {
      const error =
        new Error(
          "Reserved stock could not be released safely."
        );

      error.statusCode = 409;
      throw error;
    }
  }

  const releaseResult =
    await client.query(
      `
      UPDATE orders
      SET
        stock_reserved = FALSE,
        reservation_expires_at = NULL,
        updated_at = NOW()
      WHERE
        id = $1
        AND stock_reserved = TRUE
      RETURNING id
      `,
      [orderId]
    );

  if (
    releaseResult.rowCount !== 1
  ) {
    const error =
      new Error(
        "Could not finalise reservation release safely."
      );

    error.statusCode = 409;
    throw error;
  }

  return true;
}




// ===========================================================
// SHARED RAZORPAY PAYMENT FINALISER
//
// IMPORTANT:
// - Razorpay must already have been verified before calling.
// - This function performs NO external network requests.
// - The order row is locked before stock/payment mutation.
// - Browser verification, webhook processing and reconciliation
//   can all use this same atomic finalisation path.
// ===========================================================

export async function finaliseRazorpayPayment({
  orderId,
  payment,
  razorpaySignature = null,
  expectedUserId = null,
}) {
  if (
    !orderId ||
    !payment ||
    !payment.id ||
    !payment.order_id
  ) {
    const error =
      new Error(
        "Invalid payment finalisation data."
      );

    error.statusCode = 400;

    throw error;
  }

  if (
    payment.status !== "captured"
  ) {
    const error =
      new Error(
        "Payment has not been captured yet."
      );

    error.statusCode = 409;
    error.paymentAwaitingCapture = true;

    throw error;
  }

  const client =
    await pool.connect();

  let transactionOpen =
    false;

  try {
    await client.query(
      "BEGIN"
    );

    transactionOpen =
      true;

    // -------------------------------------------------------
    // Lock the local order.
    // -------------------------------------------------------

    const values =
      [orderId];

    let userCondition =
      "";

    if (expectedUserId) {
      values.push(
        expectedUserId
      );

      userCondition =
        `AND user_id = $${values.length}`;
    }

    const orderResult =
      await client.query(
        `
        SELECT
          id,
          order_number,
          user_id,
          status,
          payment_status,
          payment_method,
          subtotal_inr,
          shipping_inr,
          total_inr,
          razorpay_order_id,
          razorpay_payment_id,
          stock_reserved,
          reservation_expires_at
        FROM orders
        WHERE
          id = $1
          ${userCondition}
        FOR UPDATE
        `,
        values
      );

    if (
      orderResult.rowCount ===
      0
    ) {
      const error =
        new Error(
          "Order not found."
        );

      error.statusCode = 404;

      throw error;
    }

    const order =
      orderResult.rows[0];

    if (
      order.payment_method !==
      "RAZORPAY"
    ) {
      const error =
        new Error(
          "This order is not a Razorpay order."
        );

      error.statusCode = 400;

      throw error;
    }

    // -------------------------------------------------------
    // Idempotency.
    //
    // A browser callback and Razorpay webhook can arrive at
    // nearly the same time. Only the first one consumes stock.
    // -------------------------------------------------------

    if (
      order.payment_status ===
      "PAID"
    ) {
      if (
        order.razorpay_payment_id &&
        order.razorpay_payment_id !==
          payment.id
      ) {
        const error =
          new Error(
            "This order has already been paid using a different payment."
          );

        error.statusCode = 409;

        throw error;
      }

      await client.query(
        "COMMIT"
      );

      transactionOpen =
        false;

      return {
        alreadyPaid: true,

        order: {
          id:
            order.id,

          orderNumber:
            order.order_number,

          status:
            order.status,

          paymentStatus:
            order.payment_status,

          paymentMethod:
            order.payment_method,

          subtotalINR:
            order.subtotal_inr,

          shippingINR:
            order.shipping_inr,

          codFeeINR:
            0,

          totalINR:
            order.total_inr,
        },
      };
    }

    // -------------------------------------------------------
    // Re-check Razorpay identity and amount under the lock.
    // -------------------------------------------------------

    if (
      !order.razorpay_order_id ||
      payment.order_id !==
        order.razorpay_order_id
    ) {
      const error =
        new Error(
          "Payment order does not match the DESIGLOV order."
        );

      error.statusCode = 400;

      throw error;
    }

    const expectedAmount =
      Number(
        order.total_inr
      ) * 100;

    if (
      Number(payment.amount) !==
        expectedAmount ||
      payment.currency !== "INR"
    ) {
      const error =
        new Error(
          "Payment amount verification failed."
        );

      error.statusCode = 400;

      throw error;
    }

    if (
      payment.status !== "captured"
    ) {
      const error =
        new Error(
          "Payment has not been captured yet."
        );

      error.statusCode = 409;
      error.paymentAwaitingCapture = true;

      throw error;
    }

    // -------------------------------------------------------
    // Load order quantities in deterministic product order.
    // -------------------------------------------------------

    const itemResult =
      await client.query(
        `
        SELECT
          product_id,
          MIN(product_name)
            AS product_name,
          SUM(quantity)::int
            AS quantity
        FROM order_items
        WHERE order_id = $1
        GROUP BY product_id
        ORDER BY product_id ASC
        `,
        [
          order.id,
        ]
      );

    if (
      itemResult.rowCount ===
      0
    ) {
      const error =
        new Error(
          "Order contains no items."
        );

      error.statusCode = 409;

      throw error;
    }

    // -------------------------------------------------------
    // NORMAL CASE:
    // The 15-minute reservation is still owned by this order.
    //
    // Consume physical stock AND the matching reservation.
    // -------------------------------------------------------

    if (
      order.stock_reserved
    ) {
      for (
        const item of
        itemResult.rows
      ) {
        const quantity =
          Number(
            item.quantity
          );

        const result =
          await client.query(
            `
            UPDATE products
            SET
              stock =
                stock - $1,
              reserved_stock =
                reserved_stock - $1,
              updated_at =
                NOW()
            WHERE
              id = $2
              AND stock >= $1
              AND reserved_stock >= $1
            RETURNING
              id,
              stock,
              reserved_stock
            `,
            [
              quantity,
              item.product_id,
            ]
          );

        if (
          result.rowCount !==
          1
        ) {
          const error =
            new Error(
              `${item.product_name || "A product"} could not consume its reserved stock. Please contact DESIGLOV support regarding this payment.`
            );

          error.statusCode = 409;

          throw error;
        }
      }
    } else {
      // -----------------------------------------------------
      // LATE PAYMENT CASE
      //
      // The reservation has already been released.
      //
      // We try to fulfil the paid order only from stock that
      // is currently NOT reserved for another customer.
      //
      // A SAVEPOINT is important here:
      //
      // Example:
      //   Product A still has stock -> decrement succeeds.
      //   Product B has no stock    -> decrement fails.
      //
      // Without a savepoint we would either leave Product A
      // consumed or roll back the PAYMENT_REVIEW state too.
      //
      // With the savepoint we can:
      //   1. Undo every late stock decrement.
      //   2. Keep the main transaction alive.
      //   3. Persist PAYMENT_REVIEW.
      //   4. Commit that review state.
      //
      // This means a confirmed Razorpay payment can never be
      // silently forgotten just because fulfilment failed.
      // -----------------------------------------------------

      await client.query(
        "SAVEPOINT late_payment_stock"
      );

      let latePaymentFailure = null;

      for (
        const item of
        itemResult.rows
      ) {
        const quantity =
          Number(
            item.quantity
          );

        const result =
          await client.query(
            `
            UPDATE products
            SET
              stock =
                stock - $1,
              updated_at =
                NOW()
            WHERE
              id = $2
              AND (
                stock -
                reserved_stock
              ) >= $1
            RETURNING
              id,
              stock,
              reserved_stock
            `,
            [
              quantity,
              item.product_id,
            ]
          );

        if (
          result.rowCount !==
          1
        ) {
          latePaymentFailure = {
            productId:
              item.product_id,

            productName:
              item.product_name ||
              "A product",
          };

          break;
        }
      }

      if (
        latePaymentFailure
      ) {
        // Undo every stock decrement performed after the
        // savepoint, while keeping the transaction itself
        // alive so that PAYMENT_REVIEW can be persisted.

        await client.query(
          "ROLLBACK TO SAVEPOINT late_payment_stock"
        );

        await client.query(
          "RELEASE SAVEPOINT late_payment_stock"
        );

        const reviewResult =
          await client.query(
            `
            UPDATE orders
            SET
              status =
                'PAYMENT_REVIEW',

              payment_status =
                'PAYMENT_REVIEW',

              razorpay_payment_id =
                $1,

              razorpay_signature =
                COALESCE(
                  $2,
                  razorpay_signature
                ),

              stock_reserved =
                FALSE,

              reservation_expires_at =
                NULL,

              updated_at =
                NOW()

            WHERE
              id = $3

            RETURNING
              id,
              order_number,
              status,
              payment_status,
              payment_method,
              subtotal_inr,
              shipping_inr,
              total_inr,
              razorpay_payment_id
            `,
            [
              payment.id,
              razorpaySignature,
              order.id,
            ]
          );

        if (
          reviewResult.rowCount !==
          1
        ) {
          const error =
            new Error(
              "Could not record the paid order for manual review."
            );

          error.statusCode = 500;

          throw error;
        }

        // PAYMENT_REVIEW must survive, so commit it BEFORE
        // returning the review error to the caller.

        await client.query(
          "COMMIT"
        );

        transactionOpen = false;

        const error =
          new Error(
            `${latePaymentFailure.productName} is no longer available. Razorpay confirmed the payment, so this order has been recorded for manual review/refund.`
          );

        error.statusCode = 409;

        error.paymentNeedsReview =
          true;

        error.orderId =
          order.id;

        error.orderNumber =
          order.order_number;

        error.razorpayPaymentId =
          payment.id;

        throw error;
      }

      await client.query(
        "RELEASE SAVEPOINT late_payment_stock"
      );
    }

    // -------------------------------------------------------
    // Mark order paid.
    //
    // We intentionally do not require stock_reserved=TRUE
    // here because the safe late-payment path above may have
    // fulfilled the order from currently available stock.
    // -------------------------------------------------------

    const paidOrderResult =
      await client.query(
        `
        UPDATE orders
        SET
          status =
            'PLACED',
          payment_status =
            'PAID',
          razorpay_payment_id =
            $1,
          razorpay_signature =
            COALESCE(
              $2,
              razorpay_signature
            ),
          stock_reserved =
            FALSE,
          reservation_expires_at =
            NULL,
          updated_at =
            NOW()
        WHERE
          id = $3
          AND payment_method =
            'RAZORPAY'
          AND payment_status =
            'PENDING'
          AND razorpay_order_id =
            $4
        RETURNING
          id
        `,
        [
          payment.id,
          razorpaySignature,
          order.id,
          payment.order_id,
        ]
      );

    if (
      paidOrderResult.rowCount !==
      1
    ) {
      const error =
        new Error(
          "Could not finalise the paid order safely."
        );

      error.statusCode = 409;

      throw error;
    }

    await client.query(
      "COMMIT"
    );

    transactionOpen =
      false;

    return {
      alreadyPaid: false,

      order: {
        id:
          order.id,

        orderNumber:
          order.order_number,

        status:
          "PLACED",

        paymentStatus:
          "PAID",

        paymentMethod:
          "RAZORPAY",

        subtotalINR:
          order.subtotal_inr,

        shippingINR:
          order.shipping_inr,

        codFeeINR:
          0,

        totalINR:
          order.total_inr,
      },
    };

  } catch (error) {
    if (
      transactionOpen
    ) {
      try {
        await client.query(
          "ROLLBACK"
        );
      } catch {
        // Ignore rollback failure.
      }
    }

    // -------------------------------------------------------
    // IMPORTANT:
    // If Razorpay has confirmed payment but stock is no
    // longer available, do not pretend the order succeeded.
    //
    // The reconciliation/webhook layer added next will record
    // this as a review/refund case.
    // -------------------------------------------------------

    throw error;

  } finally {
    client.release();
  }
}


