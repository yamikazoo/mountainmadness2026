import { redirect } from "next/navigation";
import { auth, signIn } from "@/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function Home() {
  const session = await auth();

  if (session?.user) {
    redirect("/dashboard");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6 py-10">
      <Card className="w-full max-w-lg border-slate-200 bg-white shadow-sm">
        <CardHeader className="space-y-2">
          <CardTitle className="text-2xl">NOMI Pivot</CardTitle>
          <p className="text-sm text-slate-600">
            Intercept your schedule and forecast spending before it happens.
          </p>
        </CardHeader>
        <CardContent className="space-y-5">
          <p className="text-sm text-slate-700">
            Connect Google Calendar to see your next 7 days and unlock proactive
            budget pivots for Mountain Madness demos.
          </p>
          <form
            action={async () => {
              "use server";
              await signIn("google", { redirectTo: "/dashboard" });
            }}
          >
            <Button className="w-full" type="submit">
              Sign in with Google
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
