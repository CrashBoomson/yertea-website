export async function onRequestPost(context) {
  const { env, request } = context;

  if (!env.STRIPE_SECRET_KEY) {
    return new Response("Missing STRIPE_SECRET_KEY environment variable", { status: 500 });
  }

  // Parse the selected price_id from the form data
  const formData = await request.formData();
  const selectedPriceId = formData.get("price_id");

  if (!selectedPriceId) {
    return new Response("Missing price_id", { status: 400 });
  }

  const mode = "payment";
  const domain = env.DOMAIN || "https://www.yertea.co";

  const params = new URLSearchParams();
  params.append("ui_mode", "hosted_page");
  params.append("mode", mode);
  params.append("billing_address_collection", "auto");
  params.append("phone_number_collection[enabled]", "false");
  params.append("automatic_tax[enabled]", "false");
  params.append("allow_promotion_codes", "false");
  params.append("submit_type", "auto");
  params.append("integration_identifier", "hosted_web_0001");
  params.append("origin_context", "web");
  params.append("success_url", `${domain}/success?session_id={CHECKOUT_SESSION_ID}`);
  params.append("cancel_url", `${domain}`);
  params.append("line_items[0][price]", selectedPriceId);
  params.append("line_items[0][quantity]", "1");

  if (mode === "subscription") {
    params.append("payment_method_collection", "always");
  }

  try {
    const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${env.STRIPE_SECRET_KEY.trim()}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    const session = await response.json();

    if (!response.ok) {
      return new Response(JSON.stringify(session), {
        status: response.status,
        headers: { "Content-Type": "application/json" },
      });
    }

    return Response.redirect(session.url, 303);
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
