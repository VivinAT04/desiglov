import express from "express";
import crypto from "crypto";

import {
  z,
} from "zod";

import {
  pool,
} from "./db.js";

import {
  requireAuth,
} from "./auth.js";


const router =
  express.Router();


const orderSchema =
  z.object({

    addressId:
      z
        .string()
        .uuid(),

    paymentMethod:
      z.enum([
        "COD",
      ]),

    items:
      z
        .array(
          z.object({

            productId:
              z
                .number()
                .int()
                .positive(),

            size:
              z
                .string()
                .min(1)
                .max(50),

            quantity:
              z
                .number()
                .int()
                .min(1)
                .max(10),
          })
        )
        .min(
          1,
          "Your bag is empty."
        ),
  });


function makeOrderNumber() {

  const now =
    new Date();


  const date =
    [
      now.getFullYear(),

      String(
        now.getMonth() +
        1
      ).padStart(
        2,
        "0"
      ),

      String(
        now.getDate()
      ).padStart(
        2,
        "0"
      ),
    ].join("");


  const random =
    crypto
      .randomBytes(3)
      .toString("hex")
      .toUpperCase();


  return `DG-${date}-${random}`;
}


// ===========================================================
// CREATE ORDER
// ===========================================================

router.post(
  "/",
  requireAuth,
  async (
    req,
    res,
    next
  ) => {

    const client =
      await pool.connect();


    try {

      const parsed =
        orderSchema.safeParse(
          req.body
        );


      if (
        !parsed.success
      ) {

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
      } =
        parsed.data;


      await client.query(
        "BEGIN"
      );


      // =====================================================
      // ADDRESS OWNERSHIP
      // =====================================================

      const addressResult =
        await client.query(
          `
          SELECT id

          FROM addresses

          WHERE
            id = $1
            AND user_id = $2

          LIMIT 1
          `,
          [
            addressId,
            req.userId,
          ]
        );


      if (
        addressResult.rowCount ===
        0
      ) {

        await client.query(
          "ROLLBACK"
        );


        return res
          .status(400)
          .json({
            error:
              "Please select a valid delivery address.",
          });
      }


      // =====================================================
      // DATABASE PRODUCT VALIDATION
      // =====================================================

      let subtotal =
        0;


      const validatedItems =
        [];


      for (
        const item of items
      ) {

        const result =
          await client.query(
            `
            SELECT
              id,
              slug,
              name,
              price_inr,
              stock,
              active,
              sizes

            FROM products

            WHERE id = $1

            FOR UPDATE
            `,
            [
              item.productId,
            ]
          );


        if (
          result.rowCount ===
          0
        ) {

          await client.query(
            "ROLLBACK"
          );


          return res
            .status(400)
            .json({
              error:
                "One of the products in your bag no longer exists.",
            });
        }


        const product =
          result.rows[0];


        if (
          !product.active
        ) {

          await client.query(
            "ROLLBACK"
          );


          return res
            .status(400)
            .json({
              error:
                `${product.name} is currently unavailable.`,
            });
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

          await client.query(
            "ROLLBACK"
          );


          return res
            .status(400)
            .json({
              error:
                `Please select a valid size for ${product.name}.`,
            });
        }


        if (
          product.stock <
          item.quantity
        ) {

          await client.query(
            "ROLLBACK"
          );


          return res
            .status(400)
            .json({
              error:
                `Only ${product.stock} ${product.name} item(s) are currently available.`,
            });
        }


        subtotal +=
          product.price_inr *
          item.quantity;


        validatedItems.push({
          requested:
            item,

          product,
        });
      }


      // =====================================================
      // DELIVERY
      // =====================================================

      const shipping =
        subtotal >= 2999
          ? 0
          : 99;


      const total =
        subtotal +
        shipping;


      // =====================================================
      // ORDER
      // =====================================================

      const orderId =
        crypto.randomUUID();


      const orderNumber =
        makeOrderNumber();


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
            total_inr
          )

          VALUES (
            $1,
            $2,
            $3,
            $4,
            'PLACED',
            'PENDING',
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
            paymentMethod,
            subtotal,
            shipping,
            total,
          ]
        );


      // =====================================================
      // ORDER ITEMS + STOCK REDUCTION
      // =====================================================

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


        await client.query(
          `
          UPDATE products

          SET
            stock =
              stock - $1,

            updated_at =
              NOW()

          WHERE id = $2
          `,
          [
            item.requested.quantity,
            item.product.id,
          ]
        );
      }


      await client.query(
        "COMMIT"
      );


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

            paymentMethod,

            subtotalINR:
              subtotal,

            shippingINR:
              shipping,

            totalINR:
              total,
          },
        });

    } catch (error) {

      try {

        await client.query(
          "ROLLBACK"
        );

      } catch {

        // Ignore rollback failure.
      }


      next(error);

    } finally {

      client.release();
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


      const output =
        [];


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
