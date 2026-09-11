import {
  Instagram,
  Mail,
  MessageCircle
} from "lucide-react";

export default function Contact() {
  return (
    <section className="contact-page">

      <div className="contact-heading">

        <p className="eyebrow">
          WE'RE HERE TO HELP
        </p>

        <h1>
          Get in touch.
        </h1>

        <p>
          Questions about an order,
          product or the Desiglov
          collection? Reach out to us.
        </p>

      </div>

      <div className="contact-grid">

        <a
          href="https://www.instagram.com/itz_desiglov/"
          target="_blank"
          rel="noreferrer"
          className="contact-card"
        >
          <Instagram size={26} />

          <h2>
            Instagram
          </h2>

          <p>
            Follow the latest drops
            and send us a message.
          </p>

          <span>
            VISIT INSTAGRAM →
          </span>
        </a>

        <div className="contact-card">

          <Mail size={26} />

          <h2>
            Email
          </h2>

          <p>
            Customer support email
            will be added before
            launch.
          </p>

          <span>
            DESIGLOV SUPPORT
          </span>

        </div>

        <div className="contact-card">

          <MessageCircle size={26} />

          <h2>
            WhatsApp
          </h2>

          <p>
            WhatsApp support can be
            connected when the store
            goes live.
          </p>

          <span>
            COMING SOON
          </span>

        </div>

      </div>

    </section>
  );
}
