import express from "express";
import rateLimit from "express-rate-limit";
import { Resend } from "resend";

const router = express.Router();

const feedbackLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    error: "Too many feedback submissions. Please try again later.",
  },
});

function clean(value) {
  return String(value || "").trim();
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function validEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

router.post("/", feedbackLimiter, async (req, res) => {
  try {
    const name = clean(req.body?.name);
    const email = clean(req.body?.email).toLowerCase();
    const comments = clean(req.body?.comments);

    if (!name || !email || !comments) {
      return res.status(400).json({
        error: "Name, email and comments are required.",
      });
    }

    if (name.length > 100) {
      return res.status(400).json({
        error: "Please enter a shorter name.",
      });
    }

    if (!validEmail(email) || email.length > 320) {
      return res.status(400).json({
        error: "Please enter a valid email address.",
      });
    }

    if (comments.length > 3000) {
      return res.status(400).json({
        error: "Feedback must be 3000 characters or fewer.",
      });
    }

    const apiKey = process.env.RESEND_API_KEY;

    const recipient =
      process.env.FEEDBACK_TO_EMAIL ||
      process.env.ADMIN_EMAIL;

    if (!apiKey) {
      console.error("RESEND_API_KEY is missing.");

      return res.status(500).json({
        error: "Feedback service is temporarily unavailable.",
      });
    }

    if (!recipient) {
      console.error("Feedback recipient is missing.");

      return res.status(500).json({
        error: "Feedback service is temporarily unavailable.",
      });
    }

    const resend = new Resend(apiKey);

    const safeName = escapeHtml(name);
    const safeEmail = escapeHtml(email);
    const safeComments = escapeHtml(comments)
      .replace(/\n/g, "<br />");

    const { data, error } = await resend.emails.send({
      from: "DEsiglov Feedback <feedback@desiglov.com>",
      to: [recipient],
      replyTo: email,
      subject: `New DEsiglov feedback from ${name}`,

      text: [
        "New feedback received from the DEsiglov website.",
        "",
        `Name: ${name}`,
        `Email: ${email}`,
        "",
        "Comments:",
        comments,
      ].join("\n"),

      html: `
        <div style="font-family:Arial,sans-serif;max-width:640px;margin:auto;color:#222;">
          <h2>DEsiglov Feedback</h2>

          <p><strong>Name:</strong> ${safeName}</p>
          <p><strong>Email:</strong> ${safeEmail}</p>

          <p><strong>Comments:</strong></p>

          <div style="background:#f7f5f2;padding:18px;line-height:1.7;">
            ${safeComments}
          </div>

          <p style="margin-top:25px;color:#777;font-size:12px;">
            Sent from the DEsiglov website feedback form.
          </p>
        </div>
      `,
    });

    if (error) {
      console.error("Resend error:", error);

      return res.status(502).json({
        error: "We couldn't send your feedback. Please try again.",
      });
    }

    console.log(
      "Feedback email sent:",
      data?.id || "sent"
    );

    return res.status(201).json({
      ok: true,
      message: "Thank you for your feedback.",
    });
  } catch (error) {
    console.error("Feedback error:", error);

    return res.status(500).json({
      error: "We couldn't send your feedback. Please try again.",
    });
  }
});

export default router;
