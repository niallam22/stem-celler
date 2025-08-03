import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function UnauthorizedPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <Card className="w-[420px]">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Unauthorized Access</CardTitle>
          <CardDescription>
            You don't have permission to access the admin panel.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground text-center">
            This area is restricted to administrators only. If you believe you should have access,
            please contact your system administrator.
          </p>
          <div className="flex justify-center">
            <Button asChild>
              <Link href="/">Return to Home</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}