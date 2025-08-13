#!/usr/bin/env tsx

import { getWorkerInstance } from "@/lib/worker/queue-worker";

async function startWorker() {
  console.log("Starting document extraction worker...");
  
  const worker = getWorkerInstance();
  
  // Start the worker
  await worker.start();
  
  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    console.log('Received SIGINT, shutting down gracefully...');
    await worker.stop();
    process.exit(0);
  });
  
  process.on('SIGTERM', async () => {
    console.log('Received SIGTERM, shutting down gracefully...');
    await worker.stop();
    process.exit(0);
  });
  
  // Keep the process running
  console.log("Worker is running. Press Ctrl+C to stop.");
}

// Run if this script is executed directly
startWorker().catch(console.error);

export { startWorker };