import Stripe from "stripe";
import { redirect } from "next/navigation";
import { updateOrganizationSubscription } from "@/lib/db/queries";
import { auth } from "../auth";
import { headers } from "next/headers";
import { db } from "../db/drizzle";
import { Subscription } from "../db/schema";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
});

export async function createCheckoutSession({ priceId }: { priceId: string }) {
  const user = await auth.api.getSession({
    headers: headers(),
  });

  if (!user || !user.session.activeOrganizationId) {
    throw redirect(`/sign-up?redirect=checkout&priceId=${priceId}`);
  }

  const organization = await db.query.organizations.findFirst({
    where(fields, operators) {
      return operators.eq(fields.id, user.session.activeOrganizationId!);
    },
  });
  if (!organization) {
    throw new Error("Organization not found");
  }
  const sub = organization.metadata
    ? (JSON.parse(organization.metadata || "")?.subscription as
        | Subscription
        | undefined)
    : null;

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    mode: "subscription",
    success_url: `${process.env.BASE_URL}/api/stripe/checkout?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.BASE_URL}/pricing`,
    customer: sub?.stripeCustomerId || undefined,
    client_reference_id: user.session.activeOrganizationId,
    allow_promotion_codes: true,
    subscription_data: {
      trial_period_days: 14,
    },
  });

  redirect(session.url!);
}

export async function createCustomerPortalSession() {
  const session = await auth.api.getSession({
    headers: headers(),
  });
  if (!session) {
    throw new Error("User not found");
  }
  const organization = await db.query.organizations.findFirst({
    where(fields, operators) {
      return operators.eq(fields.id, session.session.activeOrganizationId!);
    },
  });
  if (!organization) {
    throw new Error("Organization not found");
  }
  const sub = organization.metadata
    ? (JSON.parse(organization.metadata || "")?.subscription as
        | Subscription
        | undefined)
    : null;

  if (!sub || !sub.stripeCustomerId || !sub.stripeProductId) {
    redirect("/pricing");
  }

  let configuration: Stripe.BillingPortal.Configuration;
  const configurations = await stripe.billingPortal.configurations.list();

  if (configurations.data.length > 0) {
    configuration = configurations.data[0];
  } else {
    const product = await stripe.products.retrieve(sub.stripeProductId);
    if (!product.active) {
      throw new Error("Team's product is not active in Stripe");
    }

    const prices = await stripe.prices.list({
      product: product.id,
      active: true,
    });
    if (prices.data.length === 0) {
      throw new Error("No active prices found for the team's product");
    }

    configuration = await stripe.billingPortal.configurations.create({
      business_profile: {
        headline: "Manage your subscription",
      },
      features: {
        subscription_update: {
          enabled: true,
          default_allowed_updates: ["price", "quantity", "promotion_code"],
          proration_behavior: "create_prorations",
          products: [
            {
              product: product.id,
              prices: prices.data.map((price) => price.id),
            },
          ],
        },
        subscription_cancel: {
          enabled: true,
          mode: "at_period_end",
          cancellation_reason: {
            enabled: true,
            options: [
              "too_expensive",
              "missing_features",
              "switched_service",
              "unused",
              "other",
            ],
          },
        },
      },
    });
  }

  return stripe.billingPortal.sessions.create({
    customer: sub.stripeCustomerId,
    return_url: `${process.env.BASE_URL}/dashboard`,
    configuration: configuration.id,
  });
}

export async function handleSubscriptionChange(
  subscription: Stripe.Subscription
) {
  const customerId = subscription.customer as string;
  const orgId = subscription.metadata.client_reference_id as string;
  const status = subscription.status;
  const subscriptionId = subscription.id;

  const organization = await db.query.organizations.findFirst({
    where(fields, operators) {
      return operators.eq(fields.id, orgId);
    },
  });

  if (!organization) {
    console.error("Team not found for Stripe customer:", customerId);
    return;
  }

  if (status === "active" || status === "trialing") {
    const plan = subscription.items.data[0]?.plan;
    await updateOrganizationSubscription(organization.id, {
      stripeSubscriptionId: subscriptionId,
      stripeProductId: plan?.product as string,
      planName: (plan?.product as Stripe.Product).name,
      subscriptionStatus: status,
    });
  } else if (status === "canceled" || status === "unpaid") {
    await updateOrganizationSubscription(organization.id, {
      stripeSubscriptionId: null,
      stripeProductId: null,
      planName: null,
      subscriptionStatus: status,
    });
  }
}

export async function getStripePrices() {
  const prices = await stripe.prices.list({
    expand: ["data.product"],
    active: true,
    type: "recurring",
  });

  return prices.data.map((price) => ({
    id: price.id,
    productId:
      typeof price.product === "string" ? price.product : price.product.id,
    unitAmount: price.unit_amount,
    currency: price.currency,
    interval: price.recurring?.interval,
    trialPeriodDays: price.recurring?.trial_period_days,
  }));
}

export async function getStripeProducts() {
  const products = await stripe.products.list({
    active: true,
    expand: ["data.default_price"],
  });

  return products.data.map((product) => ({
    id: product.id,
    name: product.name,
    description: product.description,
    defaultPriceId:
      typeof product.default_price === "string"
        ? product.default_price
        : product.default_price?.id,
  }));
}
