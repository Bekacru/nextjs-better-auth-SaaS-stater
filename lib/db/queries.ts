import { desc, eq } from "drizzle-orm";
import { db } from "./drizzle";
import { activityLogs, members, organizations, users } from "./schema";
import { headers } from "next/headers";
import { auth } from "../auth";

export async function updateOrganizationSubscription(
  organizationId: string,
  subscriptionData: {
    stripeSubscriptionId: string | null;
    stripeProductId: string | null;
    planName: string | null;
    subscriptionStatus: string;
  }
) {
  await db
    .update(subscriptions)
    .set({
      ...subscriptionData,
      updatedAt: new Date(),
    })
    .where(eq(organizations.id, organizationId));
}

export async function getUserWithTeam(userId: string) {
  const result = await db
    .select({
      user: users,
      organizationId: members.organizationId,
    })
    .from(users)
    .leftJoin(members, eq(users.id, members.userId))
    .where(eq(users.id, userId))
    .limit(1);

  return result[0];
}

export async function getActivityLogs() {
  const user = await auth.api.getSession({
    headers: headers(),
  });

  if (!user) {
    throw new Error("User not found");
  }
  return await db
    .select({
      id: activityLogs.id,
      action: activityLogs.action,
      timestamp: activityLogs.timestamp,
      ipAddress: activityLogs.ipAddress,
      userName: users.name,
    })
    .from(activityLogs)
    .leftJoin(users, eq(activityLogs.userId, users.id))
    .where(eq(activityLogs.userId, user.user.id))
    .orderBy(desc(activityLogs.timestamp))
    .limit(10);
}

export async function getTeamForUser(userId: string) {
  const result = await db.query.users.findFirst({
    where: eq(users.id, userId),
    with: {
      members: {
        with: {
          team: {
            with: {
              members: {
                with: {
                  user: {
                    columns: {
                      id: true,
                      name: true,
                      email: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  return result?.members[0]?.team || null;
}
