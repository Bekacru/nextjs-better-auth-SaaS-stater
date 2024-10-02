"use server";
import { redirect } from "next/navigation";
import { createCheckoutSession, createCustomerPortalSession } from "./stripe";

export const checkoutAction = async function (formData: FormData) {
  const priceId = formData.get("priceId") as string;
  await createCheckoutSession({
    priceId,
  });
};

export const customerPortalAction = async function () {
  const portalSession = await createCustomerPortalSession();
  redirect(portalSession.url);
};
