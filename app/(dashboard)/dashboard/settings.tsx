"use client";

import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { customerPortalAction } from "@/lib/payments/actions";
import { InviteTeamMember } from "./invite-team";
import { authClient } from "@/lib/auth-client";
import { useState } from "react";
import type { Subscription } from "@/lib/db/schema";
import { Skeleton } from "@/components/ui/skeleton";

export function Settings() {
  const activeOrg = authClient.useActiveOrganization();
  const [isRemoving, setIsRemoving] = useState(false);

  const subscriptionData = activeOrg?.data?.metadata?.subscription as
    | Subscription
    | undefined;

  const MemberSkeleton = () => (
    <div className="flex items-center justify-between">
      <div className="flex items-center space-x-4">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div>
          <Skeleton className="h-4 w-[100px] mb-2" />
          <Skeleton className="h-3 w-[60px]" />
        </div>
      </div>
      <Skeleton className="h-8 w-[60px]" />
    </div>
  );

  return (
    <section className="flex-1 p-4 lg:p-8">
      <h1 className="text-lg lg:text-2xl font-medium mb-6">Team Settings</h1>
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Team Subscription</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
              <div className="mb-4 sm:mb-0">
                <p className="font-medium">Current Plan:</p>
                <p className="text-sm text-muted-foreground">
                  {subscriptionData?.subscriptionStatus === "active"
                    ? "Billed monthly"
                    : subscriptionData?.subscriptionStatus === "trialing"
                    ? "Trial period"
                    : "No active subscription"}
                </p>
              </div>
              <form action={customerPortalAction}>
                <Button type="submit" variant="outline">
                  Manage Subscription
                </Button>
              </form>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Team Members</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-4">
            {activeOrg.isPending ? (
              <>
                <MemberSkeleton />
                <MemberSkeleton />
                <MemberSkeleton />
              </>
            ) : (
              activeOrg.data?.members?.map((member) => (
                <li
                  key={member.id}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center space-x-4">
                    <Avatar>
                      <AvatarImage
                        src={
                          member.user.image ||
                          `/placeholder.svg?height=32&width=32`
                        }
                        alt={member.user.name}
                      />
                      <AvatarFallback>
                        {member.user.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{member.user.name} </p>
                      <p className="text-sm text-muted-foreground capitalize">
                        {member.role}
                      </p>
                    </div>
                  </div>
                  <Button
                    type="submit"
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      await authClient.organization.removeMember(
                        {
                          memberIdOrEmail: member.id,
                        },
                        {
                          onRequest() {
                            setIsRemoving(true);
                          },
                          onResponse() {
                            setIsRemoving(false);
                          },
                          onError(context) {
                            setIsRemoving(false);
                            alert(context.error.message);
                          },
                        }
                      );
                    }}
                    disabled={isRemoving}
                  >
                    Remove
                  </Button>
                </li>
              ))
            )}
          </ul>
        </CardContent>
      </Card>
      <InviteTeamMember />
    </section>
  );
}
