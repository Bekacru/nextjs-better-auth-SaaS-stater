import { auth } from "@/lib/auth";
import { Header } from "./header";
import { headers } from "next/headers";

export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth.api.getSession({
    headers: headers(),
  });
  return (
    <section className="flex flex-col min-h-screen">
      <Header initialSession={session} />
      {children}
    </section>
  );
}
