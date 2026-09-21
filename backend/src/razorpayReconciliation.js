import Razorpay from "razorpay";

import { pool } from "./db.js";

import {
  finaliseRazorpayPayment,
  releaseReservedStock,
} from "./razorpayPaymentService.js";


const RECONCILIATION_INTERVAL_MS =
  60 * 1000;

const RESERVATION_GRACE_MINUTES =
  5;

const BATCH_SIZE =
  20;


let reconciliationRunning = false;


function getRazorpay() {
  const keyId =
    process.env.RAZORPAY_KEY_ID;

  const keySecret =
    process.env.RAZORPAY_KEY_SECRET;

  if (
    !keyId ||
    !keySecret
  ) {
    throw new Error(
      "Razorpay credentials are not configured."
    );
  }

  return new Razorpay({
    key_id: keyId,
    key_secret: keySecret,
  });
}


function successfulPayment(
  payments
) {
  if (
    !Array.isArray(payments)
  ) {
    return null;
  }

  // Only captured payments are considered successfully paid.
  // Authorized payments remain pending while Razorpay
  // automatic capture is still in progress.
  return (
    payments.find(
      (payment) =>
        payment?.status ===
        "captured"
    ) || null
  );
}


async function getExpiredCandidates() {
  const result =
    await pool.query(
      `
      SELECT
        id,
        order_number,
        razorpay_order_id,
        total_inr,
        reservation_expires_at
      FROM orders
      WHERE
        payment_method =
          'RAZORPAY'

        AND payment_status =
          'PENDING'

        AND stock_reserved =
          TRUE

        AND reservation_expires_at
          IS NOT NULL

        AND reservation_expires_at <
          (
            NOW() -
            (
              $1::text ||
              ' minutes'
            )::interval
          )

      ORDER BY
        reservation_expires_at ASC

      LIMIT $2
      `,
      [
        RESERVATION_GRACE_MINUTES,
        BATCH_SIZE,
      ]
    );

  return result.rows;
}


async function markExpired(
  client,
  orderId
) {
  await client.query(
    `
    UPDATE orders
    SET
      status =
        'PAYMENT_EXPIRED',

      payment_status =
        'EXPIRED',

      updated_at =
        NOW()

    WHERE
      id = $1

      AND payment_status =
        'PENDING'

      AND stock_reserved =
        FALSE
    `,
    [
      orderId,
    ]
  );
}


async function releaseExpiredOrder(
  order
) {
  const client =
    await pool.connect();

  let transactionOpen =
    false;

  try {
    await client.query(
      "BEGIN"
    );

    transactionOpen = true;


    // releaseReservedStock() locks the order row first.
    //
    // If the browser callback or webhook finalises payment
    // first, stock_reserved will already be FALSE and this
    // becomes an idempotent no-op.

    const released =
      await releaseReservedStock(
        client,
        order.id
      );


    if (!released) {
      await client.query(
        "ROLLBACK"
      );

      transactionOpen = false;

      return false;
    }


    await markExpired(
      client,
      order.id
    );


    await client.query(
      "COMMIT"
    );

    transactionOpen = false;


    console.log(
      "Expired Razorpay reservation released.",
      {
        orderId:
          order.id,

        orderNumber:
          order.order_number,
      }
    );


    return true;

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

    throw error;

  } finally {
    client.release();
  }
}


async function recoverMissingRazorpayOrder(
  razorpay,
  order
) {
  // ---------------------------------------------------------
  // ORPHAN RAZORPAY ORDER RECOVERY
  //
  // Our Razorpay order is created with:
  //
  //   receipt = DESIGLOV order_number
  //
  // If Razorpay creation succeeded but every database attach
  // attempt failed, the local order can temporarily have:
  //
  //   razorpay_order_id = NULL
  //
  // Search Razorpay using the unique DESIGLOV receipt and
  // verify every important field before attaching anything.
  // ---------------------------------------------------------

  let response;

  try {
    response =
      await razorpay.orders.all({
        receipt:
          order.order_number,
      });

  } catch (error) {
    console.error(
      "Could not search Razorpay for orphan order; reservation retained.",
      {
        orderId:
          order.id,

        orderNumber:
          order.order_number,

        message:
          error?.message,
      }
    );

    return null;
  }


  const razorpayOrders =
    Array.isArray(response)
      ? response
      : Array.isArray(
          response?.items
        )
        ? response.items
        : [];


  // Razorpay receipt lookup should identify our order.
  //
  // We still independently verify:
  //
  //   receipt
  //   amount
  //   currency
  //   DESIGLOV order ID in notes
  //   DESIGLOV order number in notes
  //
  // Never attach merely because one search result exists.

  const matches =
    razorpayOrders.filter(
      (candidate) => {
        const notes =
          candidate?.notes || {};

        return (
          candidate?.id &&

          candidate.receipt ===
            order.order_number &&

          Number(
            candidate.amount
          ) ===
            Number(
              order.total_inr
            ) * 100 &&

          candidate.currency ===
            "INR" &&

          String(
            notes.desiglovOrderId ||
            ""
          ) ===
            String(
              order.id
            ) &&

          String(
            notes.desiglovOrderNumber ||
            ""
          ) ===
            String(
              order.order_number
            )
        );
      }
    );


  if (
    matches.length === 0
  ) {
    // We cannot prove that Razorpay has no order forever.
    //
    // Therefore do not release stock from this ambiguous
    // recovery path. Keep it for another reconciliation pass
    // and surface it in logs for investigation.

    console.error(
      "No safely matching Razorpay order found for orphan DESIGLOV order; reservation retained.",
      {
        orderId:
          order.id,

        orderNumber:
          order.order_number,
      }
    );

    return null;
  }


  if (
    matches.length !== 1
  ) {
    console.error(
      "Multiple Razorpay orders matched the DESIGLOV orphan order; automatic attachment refused.",
      {
        orderId:
          order.id,

        orderNumber:
          order.order_number,

        matchCount:
          matches.length,
      }
    );

    return null;
  }


  const recovered =
    matches[0];


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


    const lockedResult =
      await client.query(
        `
        SELECT
          id,
          razorpay_order_id,
          payment_status,
          stock_reserved
        FROM orders
        WHERE id = $1
        FOR UPDATE
        `,
        [
          order.id,
        ]
      );


    if (
      lockedResult.rowCount !==
      1
    ) {
      throw new Error(
        "Orphan order disappeared during recovery."
      );
    }


    const locked =
      lockedResult.rows[0];


    // Another request/worker may have repaired it while the
    // Razorpay API request was running.

    if (
      locked.razorpay_order_id
    ) {
      await client.query(
        "COMMIT"
      );

      transactionOpen =
        false;

      return locked.razorpay_order_id;
    }


    if (
      locked.payment_status !==
        "PENDING" ||
      !locked.stock_reserved
    ) {
      await client.query(
        "ROLLBACK"
      );

      transactionOpen =
        false;

      console.warn(
        "Orphan Razorpay order changed state before recovery; automatic attachment skipped.",
        {
          orderId:
            order.id,

          orderNumber:
            order.order_number,

          paymentStatus:
            locked.payment_status,

          stockReserved:
            locked.stock_reserved,
        }
      );

      return null;
    }


    const attachResult =
      await client.query(
        `
        UPDATE orders
        SET
          razorpay_order_id =
            $1,

          updated_at =
            NOW()

        WHERE
          id = $2

          AND razorpay_order_id
            IS NULL

          AND payment_method =
            'RAZORPAY'

          AND payment_status =
            'PENDING'

          AND stock_reserved =
            TRUE

        RETURNING
          razorpay_order_id
        `,
        [
          recovered.id,
          order.id,
        ]
      );


    if (
      attachResult.rowCount !==
      1
    ) {
      throw new Error(
        "Recovered Razorpay order could not be attached safely."
      );
    }


    await client.query(
      "COMMIT"
    );

    transactionOpen =
      false;


    console.log(
      "Recovered and attached orphan Razorpay order.",
      {
        orderId:
          order.id,

        orderNumber:
          order.order_number,

        razorpayOrderId:
          recovered.id,
      }
    );


    return recovered.id;

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


    console.error(
      "Orphan Razorpay order recovery failed; reservation retained.",
      {
        orderId:
          order.id,

        orderNumber:
          order.order_number,

        razorpayOrderId:
          recovered.id,

        message:
          error?.message,
      }
    );


    return null;

  } finally {
    client.release();
  }
}


async function reconcileOrder(
  razorpay,
  order
) {
  // ---------------------------------------------------------
  // IMPORTANT:
  //
  // If a Razorpay order ID was never attached, we do NOT
  // release its stock here.
  //
  // That is an ambiguous state because an external Razorpay
  // order may have been created successfully while the local
  // database attachment failed.
  //
  // We keep the reservation until the separate orphan-order
  // recovery logic is completed.
  // ---------------------------------------------------------

  if (
    !order.razorpay_order_id
  ) {
    const recoveredRazorpayOrderId =
      await recoverMissingRazorpayOrder(
        razorpay,
        order
      );


    if (
      !recoveredRazorpayOrderId
    ) {
      return;
    }


    // Continue this same reconciliation cycle using the
    // recovered ID instead of waiting another minute.

    order.razorpay_order_id =
      recoveredRazorpayOrderId;
  }


  let response;

  try {
    response =
      await razorpay.orders.fetchPayments(
        order.razorpay_order_id
      );

  } catch (error) {
    // Never release inventory when Razorpay cannot be checked.
    //
    // A temporary API/network failure must not turn into an
    // accidental stock release for a customer who paid.

    console.error(
      "Could not check Razorpay payments; reservation retained.",
      {
        orderId:
          order.id,

        orderNumber:
          order.order_number,

        razorpayOrderId:
          order.razorpay_order_id,

        message:
          error?.message,
      }
    );

    return;
  }


  const payments =
    Array.isArray(response)
      ? response
      : Array.isArray(
          response?.items
        )
        ? response.items
        : [];


  const paid =
    successfulPayment(
      payments
    );


  if (paid) {
    try {
      await finaliseRazorpayPayment({
        orderId:
          order.id,

        payment:
          paid,

        razorpaySignature:
          null,

        expectedUserId:
          null,
      });


      console.log(
        "Expired reservation had a successful Razorpay payment and was finalised.",
        {
          orderId:
            order.id,

          orderNumber:
            order.order_number,

          razorpayPaymentId:
            paid.id,

          paymentStatus:
            paid.status,
        }
      );

    } catch (error) {
      if (
        error?.paymentNeedsReview
      ) {
        // The shared finaliser has already committed
        // PAYMENT_REVIEW in this case.

        console.error(
          "Expired paid order requires manual review/refund.",
          {
            orderId:
              order.id,

            orderNumber:
              order.order_number,

            razorpayPaymentId:
              paid.id,

            message:
              error.message,
          }
        );

        return;
      }


      console.error(
        "Could not finalise successful Razorpay payment during reconciliation.",
        {
          orderId:
            order.id,

          orderNumber:
            order.order_number,

          razorpayPaymentId:
            paid.id,

          message:
            error?.message,
        }
      );
    }

    return;
  }


  // ---------------------------------------------------------
  // CONSERVATIVE RELEASE POLICY
  //
  // We intentionally do NOT release the reservation merely
  // because fetchPayments() returned:
  //
  //   - an empty list
  //   - a "created" payment
  //
  // A payment could still be in progress around the expiry
  // boundary.
  //
  // After the 5-minute grace period, we only release when all
  // payments Razorpay returned are conclusively unsuccessful
  // (failed/refunded), OR when Razorpay returned no payments
  // and the reservation has already passed the grace period.
  //
  // A later successful payment is still protected by the
  // shared finaliser's late-payment logic:
  //
  //   stock available -> fulfil safely
  //   stock unavailable -> PAYMENT_REVIEW
  // ---------------------------------------------------------


  const statuses =
    payments
      .map(
        (payment) =>
          payment?.status
      )
      .filter(Boolean);


  const hasAuthorizedPayment =
    statuses.includes(
      "authorized"
    );


  if (hasAuthorizedPayment) {
    console.log(
      "Razorpay payment is authorised and awaiting capture; reservation retained.",
      {
        orderId:
          order.id,
        orderNumber:
          order.order_number,
        razorpayOrderId:
          order.razorpay_order_id,
      }
    );

    return;
  }


  const hasCreatedPayment =
    statuses.includes(
      "created"
    );


  if (hasCreatedPayment) {
    console.log(
      "Expired reservation still has a created Razorpay payment; keeping reservation for another reconciliation pass.",
      {
        orderId:
          order.id,

        orderNumber:
          order.order_number,

        razorpayOrderId:
          order.razorpay_order_id,
      }
    );

    return;
  }


  const conclusiveStatuses =
    new Set([
      "failed",
      "refunded",
    ]);


  const allReturnedPaymentsConclusive =
    statuses.length > 0 &&
    statuses.every(
      (status) =>
        conclusiveStatuses.has(
          status
        )
    );


  const noPayments =
    payments.length === 0;


  if (
    !noPayments &&
    !allReturnedPaymentsConclusive
  ) {
    console.warn(
      "Razorpay returned an unexpected payment state; reservation retained.",
      {
        orderId:
          order.id,

        orderNumber:
          order.order_number,

        statuses,
      }
    );

    return;
  }


  try {
    await releaseExpiredOrder(
      order
    );

  } catch (error) {
    console.error(
      "Failed to release expired Razorpay reservation.",
      {
        orderId:
          order.id,

        orderNumber:
          order.order_number,

        message:
          error?.message,
      }
    );
  }
}


export async function reconcileExpiredRazorpayReservations() {
  if (
    reconciliationRunning
  ) {
    return;
  }

  reconciliationRunning =
    true;

  try {
    const candidates =
      await getExpiredCandidates();


    if (
      candidates.length === 0
    ) {
      return;
    }


    const razorpay =
      getRazorpay();


    for (
      const order of
      candidates
    ) {
      try {
        await reconcileOrder(
          razorpay,
          order
        );

      } catch (error) {
        // One bad order must not stop reconciliation of every
        // other expired reservation.

        console.error(
          "Unexpected Razorpay reconciliation error.",
          {
            orderId:
              order.id,

            orderNumber:
              order.order_number,

            message:
              error?.message,
          }
        );
      }
    }

  } catch (error) {
    console.error(
      "Razorpay reconciliation cycle failed.",
      {
        message:
          error?.message,
      }
    );

  } finally {
    reconciliationRunning =
      false;
  }
}


export function startRazorpayReconciliation() {
  console.log(
    "Razorpay reservation reconciliation enabled.",
    {
      intervalSeconds:
        RECONCILIATION_INTERVAL_MS /
        1000,

      graceMinutes:
        RESERVATION_GRACE_MINUTES,
    }
  );


  // First run shortly after startup instead of immediately
  // competing with database/server initialisation.

  const initialTimer =
    setTimeout(
      () => {
        reconcileExpiredRazorpayReservations()
          .catch(
            (error) => {
              console.error(
                "Initial Razorpay reconciliation failed.",
                {
                  message:
                    error?.message,
                }
              );
            }
          );
      },
      10 * 1000
    );


  initialTimer.unref?.();


  const interval =
    setInterval(
      () => {
        reconcileExpiredRazorpayReservations()
          .catch(
            (error) => {
              console.error(
                "Scheduled Razorpay reconciliation failed.",
                {
                  message:
                    error?.message,
                }
              );
            }
          );
      },
      RECONCILIATION_INTERVAL_MS
    );


  interval.unref?.();


  return interval;
}
