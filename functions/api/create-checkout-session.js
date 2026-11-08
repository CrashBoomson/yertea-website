import Stripe from "stripe";

export async function onRequestPost(context) {
  const { env, request } = context;

  // Uses your secret key set in Cloudflare's dashboard
  const stripe = new Stripe(env.STRIPE_SECRET_KEY);

  const mode = "payment";

  const sessionParams = {
    ui_mode: "hosted_page",
    mode,
    billing_address_collection: "auto",
    phone_number_collection: {
      enabled: false,
    },
    automatic_tax: {
      enabled: false,
    },
    allow_promotion_codes: false,
    submit_type: "auto",
    integration_identifier: "hosted_web_0001",
    origin_context: "web",
    success_url: `${env.DOMAIN || "https://www.yertea.co"}/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${env.DOMAIN || "https://www.yertea.co"}`,
    line_items: [
      {
        price: "price_placeholder_case_or_pack",
        quantity: 1,
      },
    ],
  };

  if (mode === "subscription") {
    sessionParams.payment_method_collection = "always";
  }

  try {
    const session = await stripe.checkout.sessions.create(sessionParams);
    return Response.redirect(session.url, 303);
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
