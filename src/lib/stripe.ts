import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not set');
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2026-05-27.dahlia' as any,
  typescript: true,
});

// Precios en Stripe (MXN) — crear en Stripe Dashboard o via API
// Los IDs se configuran como variables de entorno
export const STRIPE_PRICES = {
  FREE_MONTHLY:       process.env.STRIPE_PRICE_FREE_MONTHLY       || '',
  FREE_ANNUAL:        process.env.STRIPE_PRICE_FREE_ANNUAL        || '',
  PRO_MONTHLY:        process.env.STRIPE_PRICE_PRO_MONTHLY        || '',
  PRO_ANNUAL:         process.env.STRIPE_PRICE_PRO_ANNUAL         || '',
  BUSINESS_MONTHLY:   process.env.STRIPE_PRICE_BUSINESS_MONTHLY   || '',
  BUSINESS_ANNUAL:    process.env.STRIPE_PRICE_BUSINESS_ANNUAL    || '',
  AI_MEDIUM_MONTHLY:  process.env.STRIPE_PRICE_AI_MEDIUM_MONTHLY  || '',
  AI_PREMIUM_MONTHLY: process.env.STRIPE_PRICE_AI_PREMIUM_MONTHLY || '',
  EXTRA_CLIENTS:      process.env.STRIPE_PRICE_EXTRA_CLIENTS      || '',
} as const;

export type StripePrice = keyof typeof STRIPE_PRICES;
