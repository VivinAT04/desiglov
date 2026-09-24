import "dotenv/config";

import path from "path";

import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import rateLimit from "express-rate-limit";

import {
  initialiseDatabase,
  pool,
} from "./db.js";

import authRoutes from "./authRoutes.js";

import addressRoutes from "./addressRoutes.js";

import orderRoutes from "./orderRoutes.js";
import razorpayWebhook from "./razorpayWebhook.js";
import {
  startRazorpayReconciliation,
} from "./razorpayReconciliation.js";

import productRoutes from "./productRoutes.js";

import adminRoutes from "./adminRoutes.js";
import feedbackRoutes from "./feedbackRoutes.js";
import reviewRoutes from "./reviewRoutes.js";


const app =
  express();

const PORT =
  Number(
    process.env.PORT
  ) || 4000;


app.disable(
  "x-powered-by"
);


app.use(
  helmet({
    crossOriginResourcePolicy:
      false,
  })
);


app.use(
  cors({
    origin:
      process.env
        .FRONTEND_URL,
    credentials: true,
  })
);


// Razorpay webhook MUST be mounted before express.json().
//
// Razorpay signs the exact raw HTTP request body. If the global
// JSON parser runs first, signature verification is no longer
// performed against the original raw bytes.
app.use(
  "/api/webhooks",
  razorpayWebhook
);


app.use(
  express.json({
    limit: "100kb",
  })
);


app.use(
  cookieParser()
);


app.use(
  (
    req,
    res,
    next
  ) => {

    if (
      req.path.startsWith(
        "/api/admin"
      ) ||
      req.path.startsWith(
        "/api/auth"
      )
    ) {

      res.set(
        "Cache-Control",
        "no-store"
      );
    }


    next();
  }
);


app.use(
  "/uploads",
  express.static(
    path.resolve(
      "uploads"
    )
  )
);


const authLimiter =
  rateLimit({
    windowMs:
      15 *
      60 *
      1000,

    limit: 100,

    standardHeaders:
      "draft-8",

    legacyHeaders:
      false,

    message: {
      error:
        "Too many requests. Please try again shortly.",
    },
  });


app.get(
  "/api/health",
  async (
    req,
    res
  ) => {
    try {
      await pool.query(
        "SELECT 1"
      );

      res.json({
        ok: true,
        service:
          "DEsiglov API",
      });
    } catch {
      res.status(500).json({
        ok: false,
      });
    }
  }
);


app.use(
  "/api/auth",
  authLimiter,
  authRoutes
);


app.use(
  "/api/addresses",
  addressRoutes
);


app.use(
  "/api/orders",
  orderRoutes
);


app.use(
  "/api/products",
  productRoutes
);


app.use(
  "/api/admin",
  adminRoutes
);


app.use(
  "/api/feedback",
  feedbackRoutes
);


app.use(
  "/api/reviews",
  reviewRoutes
);


app.use(
  (
    req,
    res
  ) => {
    res.status(404).json({
      error:
        "Route not found.",
    });
  }
);


app.use(
  (
    error,
    req,
    res,
    next
  ) => {
    console.error(error);

    const statusCode =
      Number(error?.statusCode) || 500;

    const safeMessage =
      statusCode >= 400 &&
      statusCode < 500 &&
      error?.message
        ? error.message
        : "Something went wrong. Please try again.";

    res
      .status(statusCode)
      .json({
        error: safeMessage,
      });
  }
);


async function start() {
  try {
    await initialiseDatabase();

  startRazorpayReconciliation();

    app.listen(
      PORT,
      () => {
        console.log("");
        console.log(
          "================================"
        );

        console.log(
          " DESIGLOV BACKEND RUNNING"
        );

        console.log(
          "================================"
        );

        console.log(
          `http://localhost:${PORT}`
        );

        console.log("");
      }
    );
  } catch (error) {
    console.error(
      "Could not start server:"
    );

    console.error(error);

    process.exit(1);
  }
}


start();
