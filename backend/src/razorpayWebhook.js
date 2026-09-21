import crypto from "crypto";
import express from "express";

import { pool } from "./db.js";

import {
  finaliseRazorpayPayment,
} from "./razorpayPaymentService.js";


const router = express.Router();


function signaturesMatch(
  rawBody,
  receivedSignature,
  secret
) {
  if (
    !Buffer.isBuffer(rawBody) ||
    !receivedSignature ||
    !secret
  ) {
    return false;
  }

  const expectedSignature =
    crypto
      .createHmac(
        "sha256",
        secret
      )
      .update(rawBody)
      .digest("hex");

  const expectedBuffer =
    Buffer.from(
      expectedSignature,
      "utf8"
    );

  const receivedBuffer =
    Buffer.from(
      String(receivedSignature),
      "utf8"
    );

  if (
    expectedBuffer.length !==
    receivedBuffer.length
  ) {
    return false;
  }

  return crypto.timingSafeEqual(
    expectedBuffer,
    receivedBuffer
  );
}


router.post(
  "/razorpay",
  express.raw({
    type: "application/json",
    limit: "100kb",
  }),
  async (req, res) => {
    const webhookSecret =
      process.env
        .RAZORPAY_WEBHOOK_SECRET;

    if (!webhookSecret) {
      console.error(
        "RAZORPAY_WEBHOOK_SECRET is not configured."
      );

      return res
        .status(503)
        .json({
          error:
            "Webhook is not configured.",
        });
    }


    const signature =
      req.get(
        "x-razorpay-signature"
      );

    if (
      !signaturesMatch(
        req.body,
        signature,
        webhookSecret
      )
    ) {
      console.warn(
        "Rejected Razorpay webhook with invalid signature."
      );

      return res
        .status(400)
        .json({
          error:
            "Invalid webhook signature.",
        });
    }


    let event;

    try {
      event =
        JSON.parse(
          req.body.toString(
            "utf8"
          )
        );
    } catch {
      return res
        .status(400)
        .json({
          error:
            "Invalid webhook payload.",
        });
    }


    const eventName =
      String(
        event?.event || ""
      );


    // We only finalise events that contain a successful
    // Razorpay payment.
    //
    // Other webhook events are acknowledged so Razorpay does
    // not repeatedly retry events DESIGLOV intentionally
    // ignores.

    if (
      eventName !== "payment.captured"
    ) {
      return res
        .status(200)
        .json({
          received: true,
          ignored: true,
          event: eventName,
        });
    }


    const payment =
      event?.payload
        ?.payment
        ?.entity;


    if (
      !payment ||
      !payment.id ||
      !payment.order_id
    ) {
      console.error(
        "Razorpay webhook is missing payment information.",
        {
          event:
            eventName,
        }
      );

      return res
        .status(400)
        .json({
          error:
            "Webhook payment information is missing.",
        });
    }


    // Locate our local order using the Razorpay order ID.
    //
    // We intentionally do not trust a DESIGLOV order ID from
    // webhook notes. The Razorpay order ID stored in our own
    // database is the binding used for finalisation.

    const orderResult =
      await pool.query(
        `
        SELECT
          id,
          order_number,
          payment_status,
          razorpay_payment_id
        FROM orders
        WHERE
          payment_method =
            'RAZORPAY'
          AND razorpay_order_id =
            $1
        LIMIT 1
        `,
        [
          payment.order_id,
        ]
      );


    if (
      orderResult.rowCount !==
      1
    ) {
      // Returning a retryable status is intentional.
      //
      // This covers the rare race where Razorpay sends the
      // payment webhook before our application has finished
      // attaching razorpay_order_id to the local order.

      console.error(
        "Razorpay webhook payment could not be matched to a DESIGLOV order.",
        {
          event:
            eventName,

          razorpayOrderId:
            payment.order_id,

          razorpayPaymentId:
            payment.id,
        }
      );

      return res
        .status(503)
        .json({
          error:
            "Order is not ready for webhook processing.",
        });
    }


    const localOrder =
      orderResult.rows[0];


    try {
      const result =
        await finaliseRazorpayPayment({
          orderId:
            localOrder.id,

          payment,

          // Checkout callback signatures and webhook
          // signatures are different things.
          //
          // Therefore the webhook does NOT write its webhook
          // signature into razorpay_signature.
          razorpaySignature:
            null,

          // Webhooks are server-to-server and are not scoped
          // to the currently logged-in customer.
          expectedUserId:
            null,
        });


      console.log(
        "Razorpay payment finalised from webhook.",
        {
          event:
            eventName,

          orderId:
            localOrder.id,

          orderNumber:
            localOrder.order_number,

          razorpayPaymentId:
            payment.id,
        }
      );


      return res
        .status(200)
        .json({
          received: true,
          processed: true,
          order:
            result.order,
        });

    } catch (error) {
      if (
        error?.paymentNeedsReview
      ) {
        // The shared finaliser already COMMITTED the
        // PAYMENT_REVIEW state before throwing this error.
        //
        // Therefore acknowledge the webhook. Retrying it will
        // not magically restore stock and could create noisy
        // repeated delivery attempts.

        console.error(
          "Razorpay payment requires manual review/refund.",
          {
            event:
              eventName,

            orderId:
              localOrder.id,

            orderNumber:
              localOrder.order_number,

            razorpayPaymentId:
              payment.id,

            message:
              error.message,
          }
        );


        return res
          .status(200)
          .json({
            received: true,
            processed: true,
            paymentNeedsReview:
              true,
          });
      }


      console.error(
        "Razorpay webhook finalisation failed.",
        {
          event:
            eventName,

          orderId:
            localOrder.id,

          orderNumber:
            localOrder.order_number,

          razorpayPaymentId:
            payment.id,

          message:
            error?.message,
        }
      );


      // Ask Razorpay to retry genuine temporary processing
      // failures instead of acknowledging a payment we have
      // not safely recorded.

      return res
        .status(503)
        .json({
          error:
            "Webhook processing failed.",
        });
    }
  }
);


export default router;
