import express from "express";
import crypto from "crypto";
import Razorpay from "razorpay";
import { z } from "zod";
import { pool } from "./db.js";
import { requireAuth } from "./auth.js";
import {
  finaliseRazorpayPayment,
  releaseReservedStock,
} from "./razorpayPaymentService.js";

const router = express.Router();

const orderSchema = z.object({
  addressId: z.string().uuid(),

  paymentMethod: z.enum([
    "COD",
    "RAZORPAY",
  ]),

  items: z
    .array(
      z.object({
        productId: z
          .number()
          .int()
          .positive(),

        size: z
          .string()
          .min(1)
          .max(50),

        quantity: z
          .number()
          .int()
          .min(1)
          .max(10),
      })
    )
    .min(1, "Your bag is empty."),
});

const verifyPaymentSchema = z.object({
  orderId: z.string().uuid(),

  razorpay_order_id: z
    .string()
    .min(1),

  razorpay_payment_id: z
    .string()
    .min(1),

  razorpay_signature: z
    .string()
    .min(1),
});


function makeOrderNumber() {
  const now = new Date();

  const date = [
    now.getFullYear(),
    String(
      now.getMonth() + 1
    ).padStart(2, "0"),
    String(
      now.getDate()
    ).padStart(2, "0"),
  ].join("");

  const random = crypto
    .randomBytes(3)
    .toString("hex")
    .toUpperCase();

  return `DG-${date}-${random}`;
}


function normaliseState(state) {
  return String(state || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}


function calculateShipping(
  subtotal,
  state
) {
  if (subtotal >= 2999) {
    return 0;
  }

  const normalised =
    normaliseState(state);

  if (
    normalised === "tamil nadu" ||
    normalised === "tamilnadu" ||
    normalised === "tn"
  ) {
    return 70;
  }

  return 99;
}


function calculatePaymentFee(
  paymentMethod
) {
  return paymentMethod === "COD"
    ? 30
    : 0;
}


function getRazorpayMode() {
  return (
    process.env.RAZORPAY_MODE ||
    "test"
  )
    .trim()
    .toLowerCase();
}


function razorpayPaymentsEnabled() {
  const mode =
    getRazorpayMode();

  const keyId =
    process.env.RAZORPAY_KEY_ID ||
    "";

  if (mode === "test") {
    return keyId.startsWith(
      "rzp_test_"
    );
  }

  if (mode === "live") {
    return (
      process.env
        .RAZORPAY_LIVE_PAYMENTS_ENABLED ===
        "true" &&
      keyId.startsWith(
        "rzp_live_"
      )
    );
  }

  return false;
}


function getRazorpay() {
  const keyId =
    process.env.RAZORPAY_KEY_ID;

  const keySecret =
    process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    throw new Error(
      "Razorpay credentials are not configured."
    );
  }

  return new Razorpay({
    key_id: keyId,
    key_secret: keySecret,
  });
}


async function validateOrder(
  client,
  userId,
  addressId,
  items,
  paymentMethod,
  lockProducts = false
) {
  const addressResult =
    await client.query(
      `
      SELECT
        id,
        full_name,
        phone,
        line1,
        line2,
        city,
        state,
        postal_code,
        country
      FROM addresses
      WHERE
        id = $1
        AND user_id = $2
      LIMIT 1
      `,
      [
        addressId,
        userId,
      ]
    );

  if (
    addressResult.rowCount === 0
  ) {
    const error = new Error(
      "Please select a valid delivery address."
    );

    error.statusCode = 400;
    throw error;
  }

  const address =
    addressResult.rows[0];

  let subtotal = 0;

  const validatedItems = [];

  // Stock is tracked per product, not per size.
  // Calculate the total requested quantity for each product
  // so duplicate cart lines cannot bypass stock validation.
  const requestedQuantityByProduct =
    new Map();

  for (const item of items) {
    const currentQuantity =
      requestedQuantityByProduct.get(
        item.productId
      ) || 0;

    requestedQuantityByProduct.set(
      item.productId,
      currentQuantity +
        item.quantity
    );
  }

  // Load each unique product once and, when requested,
  // lock products in ascending ID order. Every checkout therefore
  // acquires product locks in the same deterministic order.
  const productIds =
    Array.from(
      requestedQuantityByProduct.keys()
    ).sort(
      (a, b) =>
        Number(a) - Number(b)
    );

  const productById =
    new Map();

  for (const productId of productIds) {
    const lockClause =
      lockProducts
        ? "FOR UPDATE"
        : "";

    const result =
      await client.query(
        `
        SELECT
          id,
          slug,
          name,
          price_inr,
          stock,
          reserved_stock,
          active,
          sizes
        FROM products
        WHERE id = $1
        ${lockClause}
        `,
        [productId]
      );

    if (
      result.rowCount === 0
    ) {
      const error =
        new Error(
          "One of the products in your bag no longer exists."
        );

      error.statusCode = 400;
      throw error;
    }

    productById.set(
      productId,
      result.rows[0]
    );
  }

  // Preserve the original cart lines for order_items,
  // including separate sizes, while using the already
  // locked product rows for validation.
  for (const item of items) {
    const product =
      productById.get(
        item.productId
      );

    if (!product.active) {
      const error =
        new Error(
          `${product.name} is currently unavailable.`
        );

      error.statusCode = 400;
      throw error;
    }

    const sizes =
      Array.isArray(
        product.sizes
      )
        ? product.sizes
        : [];

    if (
      !sizes.includes(
        item.size
      )
    ) {
      const error =
        new Error(
          `Please select a valid size for ${product.name}.`
        );

      error.statusCode = 400;
      throw error;
    }

    const requestedQuantity =
      requestedQuantityByProduct.get(
        product.id
      ) || 0;

    const availableStock =
      Number(product.stock) -
      Number(
        product.reserved_stock ||
          0
      );

    if (
      availableStock <
      requestedQuantity
    ) {
      const error =
        new Error(
          `Only ${Math.max(
            0,
            availableStock
          )} ${product.name} item(s) are currently available.`
        );

      error.statusCode = 400;
      throw error;
    }

    subtotal +=
      Number(
        product.price_inr
      ) *
      item.quantity;

    validatedItems.push({
      requested: item,
      product,
    });
  }

  const shipping =
    calculateShipping(
      subtotal,
      address.state
    );

  const paymentFee =
    calculatePaymentFee(
      paymentMethod
    );

  const total =
    subtotal +
    shipping +
    paymentFee;

  return {
    address,
    validatedItems,
    subtotal,
    shipping,
    paymentFee,
    total,
  };
}


async function insertOrderItems(
  client,
  orderId,
  validatedItems
) {
  for (
    const item of
    validatedItems
  ) {
    await client.query(
      `
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
        $4,
        $5,
        $6,
        $7,
        $8
      )
      `,
      [
        crypto.randomUUID(),
        orderId,
        item.product.id,
        item.product.name,
        item.product.slug,
        item.requested.size,
        item.requested.quantity,
        item.product.price_inr,
      ]
    );
  }
}


async function aggregateProductQuantities(
  items
) {
  const quantityByProduct =
    new Map();

  for (const item of items) {
    const current =
      quantityByProduct.get(
        item.productId
      ) || 0;

    quantityByProduct.set(
      item.productId,
      current + item.quantity
    );
  }

  return Array.from(
    quantityByProduct.entries()
  ).sort(
    ([productIdA], [productIdB]) =>
      Number(productIdA) -
      Number(productIdB)
  );
}


async function reserveStock(
  client,
  items
) {
  // Always update products in ascending ID order.
  // This reduces deadlock risk when concurrent orders
  // contain the same products in different cart orders.
  const quantities =
    await aggregateProductQuantities(
      items
    );

  for (
    const [
      productId,
      quantity,
    ] of quantities
  ) {
    const result =
      await client.query(
        `
        UPDATE products
        SET
          reserved_stock =
            reserved_stock + $1,
          updated_at =
            NOW()
        WHERE
          id = $2
          AND active = TRUE
          AND (
            stock - reserved_stock
          ) >= $1
        RETURNING
          id,
          stock,
          reserved_stock
        `,
        [
          quantity,
          productId,
        ]
      );

    if (
      result.rowCount !== 1
    ) {
      const error =
        new Error(
          "One or more products no longer have enough stock to reserve."
        );

      error.statusCode = 409;
      throw error;
    }
  }
}


async function reduceStock(
  client,
  items
) {
  // COD stock reduction uses the same deterministic
  // product ordering and combines duplicate cart lines.
  const quantities =
    await aggregateProductQuantities(
      items
    );

  for (
    const [
      productId,
      quantity,
    ] of quantities
  ) {
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
          AND active = TRUE
          AND (
            stock - reserved_stock
          ) >= $1
        RETURNING
          id,
          stock,
          reserved_stock
        `,
        [
          quantity,
          productId,
        ]
      );

    if (
      result.rowCount !== 1
    ) {
      const error =
        new Error(
          "One or more products no longer have enough stock."
        );

      error.statusCode = 409;
      throw error;
    }
  }
}


// ===========================================================
// CREATE ORDER
//
// COD:
//   Creates order + reduces stock immediately.
//
// RAZORPAY:
//   Creates pending DESIGLOV order + Razorpay order.
//   Stock is NOT reduced until payment is verified.
// ===========================================================

router.post(
  "/",
  requireAuth,
  async (
    req,
    res,
    next
  ) => {
    const parsed =
      orderSchema.safeParse(
        req.body
      );

    if (!parsed.success) {
      return res
        .status(400)
        .json({
          error:
            parsed.error
              .issues[0]
              ?.message ||
            "Please check your order.",
        });
    }

    const {
      addressId,
      paymentMethod,
      items,
    } = parsed.data;

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

      const validation =
        await validateOrder(
          client,
          req.userId,
          addressId,
          items,
          paymentMethod,
          true
        );

      const {
        address,
        validatedItems,
        subtotal,
        shipping,
        paymentFee,
        total,
      } = validation;

      const orderId =
        crypto.randomUUID();

      const orderNumber =
        makeOrderNumber();


      // =====================================================
      // COD
      // =====================================================

      if (
        paymentMethod ===
        "COD"
      ) {
        const orderResult =
          await client.query(
            `
            INSERT INTO orders (
              id,
              order_number,
              user_id,
              address_id,
              status,
              payment_status,
              payment_method,
              subtotal_inr,
              shipping_inr,
              cod_fee_inr,
              total_inr
            )
            VALUES (
              $1,
              $2,
              $3,
              $4,
              'PLACED',
              'PENDING',
              'COD',
              $5,
              $6,
              $7,
              $8
            )
            RETURNING *
            `,
            [
              orderId,
              orderNumber,
              req.userId,
              addressId,
              subtotal,
              shipping,
              paymentFee,
              total,
            ]
          );

        await insertOrderItems(
          client,
          orderId,
          validatedItems
        );

        await reduceStock(
          client,
          items
        );

        await client.query(
          "COMMIT"
        );

        transactionOpen =
          false;

        return res
          .status(201)
          .json({
            message:
              "Order placed successfully.",

            order: {
              id:
                orderResult
                  .rows[0]
                  .id,

              orderNumber,

              status:
                "PLACED",

              paymentStatus:
                "PENDING",

              paymentMethod:
                "COD",

              subtotalINR:
                subtotal,

              shippingINR:
                shipping,

              codFeeINR:
                paymentFee,

              totalINR:
                total,
            },
          });
      }


      // =====================================================
      // RAZORPAY SAFETY SWITCH
      // =====================================================

      if (
        !razorpayPaymentsEnabled()
      ) {
        await client.query(
          "ROLLBACK"
        );

        transactionOpen =
          false;

        return res
          .status(503)
          .json({
            error:
              "Online payments are not enabled for the configured Razorpay mode.",
          });
      }


      // =====================================================
      // RESERVE STOCK + SAVE LOCAL PENDING ORDER
      // =====================================================

      // Keep this database transaction short.
      // Reserve availability and persist the local order
      // before making any external Razorpay API request.
      await reserveStock(
        client,
        items
      );

      await client.query(
        `
        INSERT INTO orders (
          id,
          order_number,
          user_id,
          address_id,
          status,
          payment_status,
          payment_method,
          subtotal_inr,
          shipping_inr,
          cod_fee_inr,
          total_inr,
          razorpay_order_id,
          stock_reserved,
          reservation_expires_at
        )
        VALUES (
          $1,
          $2,
          $3,
          $4,
          'PAYMENT_PENDING',
          'PENDING',
          'RAZORPAY',
          $5,
          $6,
          $7,
          $8,
          NULL,
          TRUE,
          NOW() + INTERVAL '15 minutes'
        )
        `,
        [
          orderId,
          orderNumber,
          req.userId,
          addressId,
          subtotal,
          shipping,
          paymentFee,
          total,
        ]
      );

      await insertOrderItems(
        client,
        orderId,
        validatedItems
      );

      await client.query(
        "COMMIT"
      );

      transactionOpen =
        false;


      // =====================================================
      // CREATE RAZORPAY ORDER OUTSIDE DB TRANSACTION
      // =====================================================

      let razorpayOrder;

      try {
        const razorpay =
          getRazorpay();

        razorpayOrder =
          await razorpay
            .orders
            .create({
              amount:
                total * 100,

              currency:
                "INR",

              receipt:
                orderNumber,

              notes: {
                desiglovOrderId:
                  orderId,

                desiglovOrderNumber:
                  orderNumber,
              },
            });
      } catch (razorpayError) {
        // Razorpay order creation failed after the local
        // reservation was committed. Compensate by releasing
        // the reservation in a new short transaction.
        await client.query(
          "BEGIN"
        );

        transactionOpen =
          true;

        try {
          await releaseReservedStock(
            client,
            orderId
          );

          await client.query(
            `
            UPDATE orders
            SET
              status =
                'PAYMENT_FAILED',
              payment_status =
                'FAILED',
              updated_at =
                NOW()
            WHERE
              id = $1
              AND payment_status =
                'PENDING'
            `,
            [orderId]
          );

          await client.query(
            "COMMIT"
          );

          transactionOpen =
            false;
        } catch (
          compensationError
        ) {
          try {
            await client.query(
              "ROLLBACK"
            );
          } catch {
            // Ignore rollback failure.
          }

          transactionOpen =
            false;

          console.error(
            "CRITICAL: Razorpay order creation failed and reservation compensation also failed.",
            {
              orderId,
              razorpayError,
              compensationError,
            }
          );

          throw compensationError;
        }

        throw razorpayError;
      }


      // =====================================================
      // ATTACH RAZORPAY ORDER ID
      // =====================================================
      //
      // A real Razorpay order now exists.
      //
      // Do NOT reuse the request's original PostgreSQL client
      // for retries. If that connection itself is unhealthy,
      // retrying on the same connection does not provide useful
      // recovery.
      //
      // Every attempt below gets a fresh pool connection.
      //
      // We also NEVER release the reservation merely because
      // attachment failed. The Razorpay order may still be
      // payable, so releasing its inventory blindly would create
      // an overselling/payment race.
      // =====================================================

      let razorpayOrderAttached =
        false;

      let attachError =
        null;


      for (
        let attempt = 1;
        attempt <= 3;
        attempt += 1
      ) {
        let attachClient =
          null;

        let attachTransactionOpen =
          false;

        try {
          attachClient =
            await pool.connect();

          await attachClient.query(
            "BEGIN"
          );

          attachTransactionOpen =
            true;


          const attachResult =
            await attachClient.query(
              `
              UPDATE orders
              SET
                razorpay_order_id =
                  $1,

                updated_at =
                  NOW()

              WHERE
                id = $2

                AND payment_method =
                  'RAZORPAY'

                AND payment_status =
                  'PENDING'

                AND stock_reserved =
                  TRUE

                AND (
                  razorpay_order_id
                    IS NULL

                  OR razorpay_order_id =
                    $1
                )

              RETURNING
                id,
                order_number,
                razorpay_order_id
              `,
              [
                razorpayOrder.id,
                orderId,
              ]
            );


          if (
            attachResult.rowCount !==
            1
          ) {
            // Before treating this as failure, inspect the order.
            // This makes the operation idempotent if an earlier
            // attempt actually committed but the application did
            // not receive the COMMIT response.

            const existingResult =
              await attachClient.query(
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
                  orderId,
                ]
              );


            const existing =
              existingResult.rows[0];


            if (
              existing &&
              existing.razorpay_order_id ===
                razorpayOrder.id
            ) {
              await attachClient.query(
                "COMMIT"
              );

              attachTransactionOpen =
                false;

              razorpayOrderAttached =
                true;

              console.log(
                "Razorpay order attachment already present.",
                {
                  orderId,
                  razorpayOrderId:
                    razorpayOrder.id,
                  attempt,
                }
              );

              break;
            }


            const error =
              new Error(
                "Could not attach the Razorpay order safely."
              );

            error.statusCode =
              409;

            throw error;
          }


          await attachClient.query(
            "COMMIT"
          );

          attachTransactionOpen =
            false;

          razorpayOrderAttached =
            true;


          console.log(
            "Razorpay order attached successfully.",
            {
              orderId,
              razorpayOrderId:
                razorpayOrder.id,
              attempt,
            }
          );


          break;

        } catch (error) {
          attachError =
            error;


          if (
            attachClient &&
            attachTransactionOpen
          ) {
            try {
              await attachClient.query(
                "ROLLBACK"
              );
            } catch {
              // Ignore rollback failure.
            }

            attachTransactionOpen =
              false;
          }


          console.error(
            "Razorpay order attachment attempt failed.",
            {
              orderId,
              razorpayOrderId:
                razorpayOrder.id,
              attempt,
              message:
                error?.message,
            }
          );


          if (
            attempt < 3
          ) {
            // Small bounded delay before obtaining another
            // fresh connection.

            await new Promise(
              (resolve) =>
                setTimeout(
                  resolve,
                  250 * attempt
                )
            );
          }

        } finally {
          if (
            attachClient
          ) {
            attachClient.release();
          }
        }
      }


      if (
        !razorpayOrderAttached
      ) {
        console.error(
          "CRITICAL: Razorpay order exists but could not be attached to the local order. Reservation retained for reconciliation.",
          {
            orderId,
            razorpayOrderId:
              razorpayOrder.id,
            attachError,
          }
        );

        const error =
          new Error(
            "Payment checkout could not be prepared safely. Please try again later."
          );

        error.statusCode = 503;
        throw error;
      }


      return res
        .status(201)
        .json({
          message:
            "Payment order created.",

          order: {
            id:
              orderId,

            orderNumber,

            status:
              "PAYMENT_PENDING",

            paymentStatus:
              "PENDING",

            paymentMethod:
              "RAZORPAY",

            subtotalINR:
              subtotal,

            shippingINR:
              shipping,

            codFeeINR:
              paymentFee,

            totalINR:
              total,
          },

          payment: {
            provider:
              "RAZORPAY",

            keyId:
              process.env
                .RAZORPAY_KEY_ID,

            razorpayOrderId:
              razorpayOrder.id,

            amount:
              razorpayOrder.amount,

            currency:
              razorpayOrder.currency,

            name:
              "DESIGLOV",

            description:
              `Order ${orderNumber}`,

            prefill: {
              name:
                address.full_name,

              contact:
                address.phone,
            },
          },
        });

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

      if (
        error.statusCode
      ) {
        return res
          .status(
            error.statusCode
          )
          .json({
            error:
              error.message,
          });
      }

      next(error);

    } finally {
      client.release();
    }
  }
);


// ===========================================================
// VERIFY RAZORPAY PAYMENT
//
// Browser callback flow:
//
// 1. Read local order without a DB transaction.
// 2. Verify Razorpay Checkout HMAC signature.
// 3. Fetch authoritative payment from Razorpay.
// 4. Call the shared atomic payment finaliser.
//
// No external network request happens while a DB transaction
// or product/order lock is held.
// ===========================================================

router.post(
  "/verify-payment",
  requireAuth,
  async (
    req,
    res,
    next
  ) => {
    const parsed =
      verifyPaymentSchema.safeParse(
        req.body
      );

    if (!parsed.success) {
      return res
        .status(400)
        .json({
          error:
            "Invalid payment verification data.",
        });
    }

    if (
      !razorpayPaymentsEnabled()
    ) {
      return res
        .status(503)
        .json({
          error:
            "Online payments are temporarily disabled.",
        });
    }

    const {
      orderId,
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = parsed.data;

    const keySecret =
      process.env
        .RAZORPAY_KEY_SECRET;

    if (!keySecret) {
      return next(
        new Error(
          "Razorpay payment verification is not configured."
        )
      );
    }

    try {
      // -----------------------------------------------------
      // Preliminary local lookup.
      // No transaction and no DB lock.
      // -----------------------------------------------------

      const preliminaryResult =
        await pool.query(
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
            AND user_id = $2
          `,
          [
            orderId,
            req.userId,
          ]
        );

      if (
        preliminaryResult.rowCount ===
        0
      ) {
        return res
          .status(404)
          .json({
            error:
              "Order not found.",
          });
      }

      const preliminaryOrder =
        preliminaryResult.rows[0];

      if (
        preliminaryOrder.payment_method !==
        "RAZORPAY"
      ) {
        return res
          .status(400)
          .json({
            error:
              "This order is not a Razorpay order.",
          });
      }

      // -----------------------------------------------------
      // Browser retry after another callback/webhook already
      // completed the exact same payment.
      // -----------------------------------------------------

      if (
        preliminaryOrder.payment_status ===
        "PAID"
      ) {
        if (
          preliminaryOrder.razorpay_payment_id &&
          preliminaryOrder.razorpay_payment_id !==
            razorpay_payment_id
        ) {
          return res
            .status(409)
            .json({
              error:
                "This order has already been paid using a different payment.",
            });
        }

        return res.json({
          message:
            "Payment already verified.",

          order: {
            id:
              preliminaryOrder.id,

            orderNumber:
              preliminaryOrder.order_number,

            status:
              preliminaryOrder.status,

            paymentStatus:
              preliminaryOrder.payment_status,

            paymentMethod:
              preliminaryOrder.payment_method,

            subtotalINR:
              preliminaryOrder.subtotal_inr,

            shippingINR:
              preliminaryOrder.shipping_inr,

            codFeeINR:
              0,

            totalINR:
              preliminaryOrder.total_inr,
          },
        });
      }

      if (
        !preliminaryOrder
          .razorpay_order_id ||
        preliminaryOrder
          .razorpay_order_id !==
          razorpay_order_id
      ) {
        return res
          .status(400)
          .json({
            error:
              "Payment order does not match the DESIGLOV order.",
          });
      }

      // -----------------------------------------------------
      // Verify Checkout HMAC.
      // -----------------------------------------------------

      const expectedSignature =
        crypto
          .createHmac(
            "sha256",
            keySecret
          )
          .update(
            `${preliminaryOrder.razorpay_order_id}|${razorpay_payment_id}`
          )
          .digest(
            "hex"
          );

      const suppliedBuffer =
        Buffer.from(
          razorpay_signature,
          "utf8"
        );

      const expectedBuffer =
        Buffer.from(
          expectedSignature,
          "utf8"
        );

      const signatureValid =
        suppliedBuffer.length ===
          expectedBuffer.length &&
        crypto.timingSafeEqual(
          suppliedBuffer,
          expectedBuffer
        );

      if (!signatureValid) {
        return res
          .status(400)
          .json({
            error:
              "Payment verification failed.",
          });
      }

      // -----------------------------------------------------
      // Authoritative Razorpay lookup.
      //
      // IMPORTANT:
      // There is no DB transaction open during this network
      // request.
      // -----------------------------------------------------

      const razorpay =
        getRazorpay();

      const payment =
        await razorpay
          .payments
          .fetch(
            razorpay_payment_id
          );

      if (
        payment.order_id !==
        preliminaryOrder
          .razorpay_order_id
      ) {
        return res
          .status(400)
          .json({
            error:
              "Razorpay payment does not belong to this order.",
          });
      }

      const expectedAmount =
        Number(
          preliminaryOrder.total_inr
        ) * 100;

      if (
        Number(payment.amount) !==
          expectedAmount ||
        payment.currency !== "INR"
      ) {
        return res
          .status(400)
          .json({
            error:
              "Payment amount verification failed.",
          });
      }

      if (
        payment.status !==
          "captured"
      ) {
        if (
          payment.status ===
            "authorized"
        ) {
          return res
            .status(202)
            .json({
              pending: true,

              paymentStatus:
                "AUTHORIZED",

              message:
                "Payment authorised and awaiting capture. Your order will be confirmed automatically after Razorpay captures the payment.",
            });
        }

        return res
          .status(400)
          .json({
            error:
              "Payment has not been captured successfully.",
          });
      }

      // -----------------------------------------------------
      // Shared short atomic transaction.
      // -----------------------------------------------------

      const result =
        await finaliseRazorpayPayment({
          orderId,
          payment,
          razorpaySignature:
            razorpay_signature,
          expectedUserId:
            req.userId,
        });

      return res.json({
        message:
          result.alreadyPaid
            ? "Payment already verified."
            : "Payment verified and order placed successfully.",

        order:
          result.order,
      });

    } catch (error) {
      if (
        error.statusCode
      ) {
        return res
          .status(
            error.statusCode
          )
          .json({
            error:
              error.message,
          });
      }

      next(error);
    }
  }
);


// ===========================================================
// CUSTOMER ORDER HISTORY
// ===========================================================

router.get(
  "/",
  requireAuth,
  async (
    req,
    res,
    next
  ) => {
    try {
      const orders =
        await pool.query(
          `
          SELECT
            o.id,
            o.order_number,
            o.status,
            o.payment_status,
            o.payment_method,
            o.subtotal_inr,
            o.shipping_inr,
            o.total_inr,
            o.created_at,
            a.full_name,
            a.phone,
            a.line1,
            a.line2,
            a.city,
            a.state,
            a.postal_code,
            a.country
          FROM orders o
          LEFT JOIN addresses a
            ON a.id =
              o.address_id
          WHERE
            o.user_id = $1
          ORDER BY
            o.created_at DESC
          `,
          [
            req.userId,
          ]
        );

      const output = [];

      for (
        const order of
        orders.rows
      ) {
        const itemResult =
          await pool.query(
            `
            SELECT
              product_id,
              product_name,
              product_slug,
              size,
              quantity,
              unit_price_inr
            FROM order_items
            WHERE
              order_id = $1
            ORDER BY
              created_at ASC
            `,
            [
              order.id,
            ]
          );

        output.push({
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

          totalINR:
            order.total_inr,

          createdAt:
            order.created_at,

          address: {
            fullName:
              order.full_name,

            phone:
              order.phone,

            line1:
              order.line1,

            line2:
              order.line2,

            city:
              order.city,

            state:
              order.state,

            postalCode:
              order.postal_code,

            country:
              order.country,
          },

          items:
            itemResult.rows.map(
              (item) => ({
                productId:
                  item.product_id,

                productName:
                  item.product_name,

                productSlug:
                  item.product_slug,

                size:
                  item.size,

                quantity:
                  item.quantity,

                unitPriceINR:
                  item.unit_price_inr,
              })
            ),
        });
      }

      return res.json({
        orders:
          output,
      });

    } catch (error) {
      next(error);
    }
  }
);


export default router;
