import { nanoid } from "nanoid";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { betterAuth } from "better-auth";
import { db } from "./db/drizzle";
import { organization } from "better-auth/plugins";
import * as schema from "./db/schema";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    usePlural: true,
  }),

  emailAndPassword: {
    enabled: true,
  },
  logger: {
    verboseLogging: true,
  },
  plugins: [
    organization({
      async sendInvitationEmail(data) {
        console.log(data);
      },
      allowUserToCreateOrganization: false,
    }),
  ],
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          const orgs = await db
            .insert(schema.organizations)
            .values({
              id: user.id,
              name: "Personal",
              slug: user.id,
              logo: null,
              createdAt: new Date(),
              updatedAt: new Date(),
            })
            .returning();
          const org = orgs[0];
          await db.insert(schema.members).values({
            id: nanoid(),
            userId: user.id,
            organizationId: org.id,
            email: user.email,
            role: "owner",
            createdAt: new Date(),
          });
        },
      },
    },
  },
});
