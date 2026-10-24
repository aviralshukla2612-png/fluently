export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { checkDatabaseConnection, isDatabaseConfigured } from "@/lib/db/prisma.js";
import { getOllamaConfig } from "@/lib/ai/ollamaClient.js";

const START_TIME = Date.now();

/**
 * GET /api/health
 * Production health and readiness endpoint.
 *
 * Query params:
 *   ?check=liveness  -> Lightweight ping verifying process is running (HTTP 200)
 *   ?check=readiness -> Verifies PostgreSQL connectivity (HTTP 200 or 503)
 *   default          -> Full system status report including database and optional Ollama
 */
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const check = searchParams.get("check");

  const uptimeSeconds = Math.floor((Date.now() - START_TIME) / 1000);

  // 1. Pure Liveness Check (Orchestrator ping)
  if (check === "liveness") {
    return NextResponse.json({
      status: "alive",
      uptime: uptimeSeconds,
      timestamp: new Date().toISOString(),
    });
  }

  // 2. Check Database Connectivity
  const dbStatus = await checkDatabaseConnection();

  // If readiness check is explicitly requested
  if (check === "readiness") {
    if (!dbStatus.connected && process.env.NODE_ENV === "production" && isDatabaseConfigured()) {
      return NextResponse.json(
        {
          status: "unready",
          error: "Database connection could not be established.",
          uptime: uptimeSeconds,
        },
        { status: 503 }
      );
    }

    return NextResponse.json({
      status: "ready",
      database: dbStatus.connected ? "connected" : "fallback_memory",
      uptime: uptimeSeconds,
    });
  }

  // 3. Optional Ollama Reachability Check (bounded 2s timeout)
  let ollamaStatus = "offline";
  const ollamaConfig = getOllamaConfig();

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);
    const ollamaRes = await fetch(`${ollamaConfig.baseUrl}/api/tags`, {
      method: "GET",
      signal: controller.signal,
    }).catch(() => null);
    clearTimeout(timeoutId);

    if (ollamaRes && ollamaRes.ok) {
      ollamaStatus = "connected";
    }
  } catch {
    ollamaStatus = "unavailable";
  }

  const isHealthy = !(process.env.NODE_ENV === "production" && isDatabaseConfigured() && !dbStatus.connected);

  return NextResponse.json(
    {
      status: isHealthy ? "ok" : "degraded",
      environment: process.env.NODE_ENV || "development",
      uptime: uptimeSeconds,
      timestamp: new Date().toISOString(),
      services: {
        database: {
          configured: isDatabaseConfigured(),
          connected: dbStatus.connected,
          mode: dbStatus.connected ? "postgresql" : "in_memory_fallback",
        },
        ai_inference: {
          service: "ollama",
          model: ollamaConfig.model,
          status: ollamaStatus,
          optional: true,
        },
      },
    },
    { status: isHealthy ? 200 : 503 }
  );
}
