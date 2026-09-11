export default function FAQ() {
  const faqs = [
    {
      question:
        "How do I place an order?",
      answer:
        "Choose your product, select the required size where applicable, add it to your bag and proceed through checkout."
    },
    {
      question:
        "How can I track my order?",
      answer:
        "Live tracking will be available once our shipping integration and backend are connected."
    },
    {
      question:
        "Can I change my order?",
      answer:
        "Order modification rules will depend on fulfilment status and will be finalised before launch."
    },
    {
      question:
        "How do I find my size?",
      answer:
        "Use our Size Guide before purchasing clothing. Product-specific measurements can also be added later."
    },
    {
      question:
        "Is Desiglov jewellery anti-tarnish?",
      answer:
        "Selected jewellery products are listed as anti-tarnish where applicable. Product details should always be checked before ordering."
    }
  ];

  return (
    <section className="policy-page">

      <div className="policy-heading">
        <p className="eyebrow">
          NEED SOME HELP?
        </p>

        <h1>
          Frequently Asked Questions
        </h1>
      </div>

      <div className="faq-list">
        {faqs.map(
          (faq, index) => (
            <details
              key={faq.question}
              open={index === 0}
            >
              <summary>
                {faq.question}
              </summary>

              <p>
                {faq.answer}
              </p>
            </details>
          )
        )}
      </div>

    </section>
  );
}
