import Stripe from "stripe";

function requireStripeKey() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("Die Stripe-Anbindung ist noch nicht vollständig eingerichtet.");
  return key;
}

export function getStripe() {
  return new Stripe(requireStripeKey(), { typescript: true });
}

export function getStripePriceId() {
  const priceId = process.env.STRIPE_PRICE_ID;
  if (!priceId) throw new Error("Der Jahrespreis für AI Music Rebels ist noch nicht eingerichtet.");
  return priceId;
}
