"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Lock, Trash2, Loader2, Laptop } from "lucide-react";
import { useState } from "react";
import { authClient, useSession } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import UAParser from "ua-parser-js";
import useSwr from "swr";
import { MobileIcon } from "@radix-ui/react-icons";

export default function SecurityPage() {
  const [isPasswordPending, setIsPasswordPending] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [toDeletePassword, setToDeletePassword] = useState("");
  const [logoutOtherDevices, setLogoutOtherDevices] = useState(false);
  const [isDeletePending, setIsDeletePending] = useState(false);
  const router = useRouter();
  const { data: sessions } = useSwr("/api/sessions", async (url) => {
    return await authClient.user.listSessions();
  });
  const data = useSession();
  const [isTerminating, setIsTerminating] = useState<string | undefined>();
  return (
    <section className="flex-1 p-4 lg:p-8">
      <h1 className="text-lg lg:text-2xl font-medium bold text-gray-900 mb-6">
        Security Settings
      </h1>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Password</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label htmlFor="current-password">Current Password</Label>
              <Input
                id="current-password"
                name="currentPassword"
                type="password"
                autoComplete="current-password"
                required
                minLength={8}
                maxLength={100}
                onChange={(e) => setCurrentPassword(e.target.value)}
                value={currentPassword}
              />
            </div>
            <div>
              <Label htmlFor="new-password">New Password</Label>
              <Input
                id="new-password"
                name="newPassword"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                maxLength={100}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="confirm-password">Confirm New Password</Label>
              <Input
                id="confirm-password"
                name="confirmPassword"
                type="password"
                autoComplete="confirm-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={8}
                maxLength={100}
              />
            </div>
            <div className="flex gap-2 items-center">
              <input
                id="logout-all"
                name="logoutAll"
                checked={logoutOtherDevices}
                onChange={(e) => setLogoutOtherDevices(e.target.checked)}
                type="checkbox"
                className="border rounded-md outline-none"
              />
              <p className="text-sm">Logout from other devices</p>
            </div>
            <Button
              className="bg-orange-500 hover:bg-orange-600 text-white"
              disabled={isPasswordPending}
              onClick={async () => {
                if (newPassword !== confirmPassword) {
                  alert("Passwords do not match");
                  return;
                }

                await authClient.user.changePassword(
                  {
                    currentPassword,
                    newPassword,
                    revokeOtherSessions: logoutOtherDevices,
                  },
                  {
                    onRequest() {
                      setIsPasswordPending(true);
                    },
                    onSuccess(context) {
                      setIsPasswordPending(false);
                      alert("Password updated successfully!");
                    },
                    onError(context) {
                      setIsPasswordPending(false);
                      alert(context.error.message);
                    },
                  }
                );
              }}
            >
              {isPasswordPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  <Lock className="mr-2 h-4 w-4" />
                  Update Password
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
      <Card className="my-8">
        <CardHeader>
          <CardTitle>Sessions</CardTitle>
        </CardHeader>
        <CardContent>
          {sessions?.data?.map((session) => {
            return (
              <div key={session.id}>
                <div className="flex items-center gap-2 text-sm  text-black font-medium dark:text-white">
                  {new UAParser(session.userAgent).getDevice().type ===
                  "mobile" ? (
                    <MobileIcon />
                  ) : (
                    <Laptop size={16} />
                  )}
                  {new UAParser(session.userAgent).getOS().name},{" "}
                  {new UAParser(session.userAgent).getBrowser().name}
                  <button
                    className="text-red-500 opacity-80  cursor-pointer text-xs border-muted-foreground border-red-600  underline "
                    onClick={async () => {
                      setIsTerminating(session.id);
                      const res = await authClient.user.revokeSession({
                        id: session.id,
                      });

                      if (res.error) {
                        alert(res.error.message);
                      } else {
                        alert("Session terminated successfully");
                      }
                      router.refresh();
                      setIsTerminating(undefined);
                    }}
                  >
                    {isTerminating === session.id ? (
                      <Loader2 size={15} className="animate-spin" />
                    ) : session.id === data.data?.session.id ? (
                      "Sign Out"
                    ) : (
                      "Terminate"
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Delete Account</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500 mb-4">
            Account deletion is non-reversible. Please proceed with caution.
          </p>
          <div className="space-y-4">
            <div>
              <Label htmlFor="delete-password">Confirm Password</Label>
              <Input
                id="delete-password"
                name="password"
                type="password"
                onChange={(e) => setToDeletePassword(e.target.value)}
                value={toDeletePassword}
                required
                minLength={8}
                maxLength={100}
              />
            </div>
            <Button
              onClick={async () => {
                await authClient.user.delete(
                  {
                    password: toDeletePassword,
                  },
                  {
                    onRequest() {
                      setIsDeletePending(true);
                    },
                    onSuccess() {
                      setIsDeletePending(false);
                      router.push("/");
                    },
                    onError(context) {
                      setIsDeletePending(false);
                      alert(context.error.message);
                    },
                  }
                );
              }}
              variant="destructive"
              className="bg-red-600 hover:bg-red-700"
              disabled={isDeletePending}
            >
              {isDeletePending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Account
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
