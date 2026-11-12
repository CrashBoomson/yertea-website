export async function onRequestPost(context) {
  const { request, env } = context;

  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json"
  };

  try {
    if (!env.STRIPE_SECRET_KEY) {
      return new Response(
        JSON.stringify({ error: "Server configuration error: STRIPE_SECRET_KEY is missing in Cloudflare." }),
        { status: 500, headers: corsHeaders }
      );
    }

    const body = await request.json();
    const items = body.items;

    if (!Array.isArray(items) || items.length === 0) {
      return new Response(
        JSON.stringify({ error: "Your cart is empty." }),
        { status: 400, headers: corsHeaders }
      );
    }

    const origin = new URL(request.url).origin;

    // Encode line_items into Stripe's form-urlencoded format
    const params = new URLSearchParams();
    params.append("mode", "payment");
    params.append("success_url", `${origin}/?checkout=success`);
    params.append("cancel_url", `${origin}/?checkout=canceled#flavors`);
    params.append("billing_address_collection", "auto");
    params.append("shipping_address_collection[allowed_countries][0]", "US");
    params.append("allow_promotion_codes", "true");

    items.forEach((item, index) => {
      if (!item.price || !item.price.startsWith("price_")) {
        throw new Error(`Invalid Stripe Price ID for ${item.name || "item"}.`);
      }
      const qty = Math.max(1, Math.min(99, parseInt(item.quantity, 10) || 1));
      params.append(`line_items[${index}][price]`, item.price);
      params.append(`line_items[${index}][quantity]`, String(qty));
    });

    const stripeResponse = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${env.STRIPE_SECRET_KEY}`,
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: params.toString()
    });

    const session = await stripeResponse.json();

    if (!stripeResponse.ok) {
      return new Response(
        JSON.stringify({ error: session.error?.message || "Stripe failed to create checkout session." }),
        { status: stripeResponse.status, headers: corsHeaders }
      );
    }

    return new Response(
      JSON.stringify({ url: session.url }),
      { status: 200, headers: corsHeaders }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message || "Unexpected checkout error." }),
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    }
  });
}
