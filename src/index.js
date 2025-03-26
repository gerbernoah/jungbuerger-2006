const { Hono } = require("hono");
const { env } = require("hono/adapter");
const Stripe = require("stripe");
const app = new Hono();

const punycodeDomain = "xn--jungbrger-u9a.ch";

/**
 * Setup Stripe SDK prior to handling a request
 */
app.use('*', async (context, next) => {
  // Load the Stripe API key from context.
  const { STRIPE_API_KEY: stripeKey } = env(context);

  // Instantiate the Stripe client object 
  const stripe = new Stripe(stripeKey, {
    appInfo: {
      // For sample support and debugging, not required for production:
      name: "stripe-samples/stripe-node-cloudflare-worker-template",
      version: "0.0.1",
      url: "https://github.com/stripe-samples"
    },
    maxNetworkRetries: 3,
    timeout: 30 * 1000,
  });

  // Set the Stripe client to the Variable context object
  context.set("stripe", stripe);

  await next();
});

app.get("/success", async (context) => {
  return context.html(successPage);
});

app.get("/cancel", async (context) => {
  return context.html(cancelPage);
});

app.get("/legal", async (context) => {
  return context.html(legalPage);
})


app.get("/", async (context) => {
  /**
   * Load the Stripe client from the context
   */
  const stripe = context.get('stripe');
  /*
   * Sample checkout integration which redirects a customer to a checkout page
   * for the specified line items.
   *
   * See https://stripe.com/docs/payments/accept-a-payment?integration=checkout.
   */
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["twint"],
    billing_address_collection: 'required',
    line_items: [
      {
        price_data: {
          currency: "chf",
          product_data: {
            name: "Sticker",
          },
          unit_amount: 500,
        },
        quantity: 1,
      },
    ],
    mode: "payment",
    success_url: encodeURI(`https://${punycodeDomain}/success`),
    cancel_url: encodeURI(`https://${punycodeDomain}/cancel`),
  });
  return context.redirect(session.url, 303);
});

app.post("/webhook", async (context) => {
  // Load the Stripe API key from context.
  const { STRIPE_WEBHOOK_SECRET } = env(context);
  /**
   * Load the Stripe client from the context
   */
  const stripe = context.get('stripe');
  const signature = context.req.raw.headers.get("stripe-signature");
  try {
    if (!signature) {
      return context.text("", 400);
    }
    const body = await context.req.text();
    const event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      STRIPE_WEBHOOK_SECRET
    );
    switch (event.type) {
      case "payment_intent.created": {
        console.log(event.data.object)
        break
      }
      default:
        break
    }
    return context.text("", 200);
  } catch (err) {
    const errorMessage = `⚠️  Webhook signature verification failed. ${err instanceof Error ? err.message : "Internal server error"}`
    console.log(errorMessage);
    return context.text(errorMessage, 400);
  }
})

export default app;

const successPage = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Zahlung Erfolgreich</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: Arial, sans-serif;
            background-color: #f4f4f9;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            text-align: center;
        }
        .container {
            background-color: white;
            padding: 40px;
            border-radius: 10px;
            box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
            width: 90%;
            max-width: 500px;
        }
        h1 {
            font-size: 2.5rem;
            color: #28a745;
            margin-bottom: 20px;
        }
        p {
            font-size: 1.2rem;
            color: #333;
            margin-bottom: 30px;
        }
        a {
            font-size: 1rem;
            color: white;
            background-color: #007bff;
            padding: 12px 30px;
            border-radius: 5px;
            text-decoration: none;
            transition: background-color 0.3s ease;
        }
        a:hover {
            background-color: #0056b3;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>Vielen Dank!</h1>
        <p>Wir werden Ihnen den Sticker zukommen lassen :)</p>
        <a href="/">Home</a>
    </div>
</body>
</html>
`;

const cancelPage = `
<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Zahlung Storniert</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: Arial, sans-serif;
            background-color: #f4f4f9;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            text-align: center;
        }
        .container {
            background-color: white;
            padding: 40px;
            border-radius: 10px;
            box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
            width: 90%;
            max-width: 500px;
        }
        h1 {
            font-size: 2.5rem;
            color: #dc3545;
            margin-bottom: 20px;
        }
        p {
            font-size: 1.2rem;
            color: #333;
            margin-bottom: 30px;
        }
        a {
            font-size: 1rem;
            color: white;
            background-color: #007bff;
            padding: 12px 30px;
            border-radius: 5px;
            text-decoration: none;
            transition: background-color 0.3s ease;
        }
        a:hover {
            background-color: #0056b3;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>Zahlung Storniert ❌</h1>
        <p>Ihre Zahlung wurde nicht abgeschlossen.</p>
        <a href="/">Erneut Versuchen</a>
    </div>
</body>
</html>
`;

const legalPage = `
<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Jungbürger.ch - Information</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: Arial, sans-serif;
            background-color: #f4f4f9;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            text-align: center;
        }
        .container {
            background-color: white;
            padding: 40px;
            border-radius: 10px;
            box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
            width: 90%;
            max-width: 800px;
            margin: 20px;
        }
        h1 {
            font-size: 2.5rem;
            color: #28a745;
            margin-bottom: 20px;
        }
        h2 {
            font-size: 1.8rem;
            color: #333;
            margin-top: 20px;
            margin-bottom: 10px;
        }
        p {
            font-size: 1.2rem;
            color: #333;
            margin-bottom: 20px;
        }
        a {
            font-size: 1rem;
            color: white;
            background-color: #007bff;
            padding: 2px 5px;
            border-radius: 5px;
            text-decoration: none;
            transition: background-color 0.3s ease;
        }
        a:hover {
            background-color: #0056b3;
        }
        .section {
            margin-bottom: 30px;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>Informationen zu unseren Dienstleistungen</h1>
        
        <div class="section">
            <h2>Rechtliches</h2>
            <p>Die Dienstleistungen und Produkte werden von <strong>Gerber Services</strong>, dem Betreiber von <strong>jungbürger.ch</strong>, angeboten.</p>
        </div>

        <div class="section">
            <h2>Über unsere Dienstleistungen</h2>
            <p>Auf <strong>jungbürger.ch</strong> bieten wir eine Plattform, auf der Kunden hochwertige Aufkleber entdecken und kaufen können. Unsere Serviceplattform ermöglicht es den Nutzern, einfach durch unsere Kollektion zu blättern, Aufkleber in den Warenkorb zu legen und den Kauf sicher abzuschließen. Zahlungen werden über <strong>Stripe</strong> verarbeitet, um ein nahtloses und sicheres Zahlungserlebnis zu gewährleisten.</p>
        </div>

        <div class="section">
            <h2>Kundendienst-Kontaktdaten</h2>
            <p>Für Unterstützung können Sie uns per E-Mail erreichen unter: <a href="mailto:support@jungbürger.ch">support@jungbürger.ch</a></p>
        </div>

        <div class="section">
            <h2>Garantie</h2>
            <p>Wir garantieren die Lieferung der über unsere Plattform gekauften Aufkleber. Bei Problemen mit der Qualität oder Lieferung Ihres Aufklebers, kontaktieren Sie uns bitte und wir werden das Problem lösen. Bitte beachten Sie, dass Rückerstattungen oder Rückbuchungen normalerweise nicht möglich sind, es sei denn, dies wird nach Schweizer Recht festgelegt.</p>
        </div>

        <div class="section">
            <h2>Stornierungsrichtlinie</h2>
            <p>Wegen der Art der Produkte (Aufkleber) können Bestellungen nach Bestätigung der Zahlung nicht mehr storniert oder geändert werden. Wir empfehlen Ihnen, Ihre Bestellung vor dem Abschluss zu überprüfen.</p>
            <p>Rückerstattungen werden nur in Fällen gewährt, in denen das Produkt defekt, während des Versands beschädigt oder ein falscher Artikel versendet wurde. Bitte kontaktieren Sie unseren Kundensupport, wenn Sie solche Probleme haben.</p>
        </div>

        <div class="section">
            <h2>Datenschutz</h2>
            <p>Wir verpflichten uns, Ihre Privatsphäre zu schützen und Ihre persönlichen Daten verantwortungsbewusst zu behandeln. Alle über unsere Plattform gesammelten Daten werden ausschließlich verwendet, um Bestellungen zu bearbeiten, Unterstützung bereitzustellen und Ihre Erfahrung mit unseren Dienstleistungen zu verbessern. Wir stellen sicher, dass Ihre Daten sicher gespeichert und gemäß den geltenden Datenschutzgesetzen verarbeitet werden, einschließlich des Schweizer Bundesgesetzes über den Datenschutz (DSG).</p>
            <p>Wir teilen oder verkaufen Ihre persönlichen Daten nicht an Dritte ohne Ihre Zustimmung, es sei denn, dies ist gesetzlich erforderlich.</p>
        </div>

        <div class="section">
            <h2>Anwendbares Recht und Gerichtsstand</h2>
            <p>Im Falle eines Rechtsstreits ist das zuständige Gericht in der Schweiz zuständig, und es gelten die schweizerischen Gesetze, sofern nicht anders in unseren <a href="#">AGB</a> festgelegt.</p>
        </div>
    </div>
</body>
</html>
`