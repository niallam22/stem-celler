import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getWorkerInstance } from "@/lib/worker/queue-worker";

export async function POST(req: Request) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { action } = await req.json();
    const worker = getWorkerInstance();

    switch (action) {
      case "start":
        await worker.start();
        return NextResponse.json({ message: "Worker started" });
      
      case "stop":
        await worker.stop();
        return NextResponse.json({ message: "Worker stopped" });
      
      case "cleanup":
        const cleanedCount = await worker.cleanup();
        return NextResponse.json({ 
          message: `Cleaned up ${cleanedCount} old jobs` 
        });
      
      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("Worker API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Return worker status (this is basic - you could expand this)
    return NextResponse.json({ 
      status: "Worker API available",
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("Worker API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}