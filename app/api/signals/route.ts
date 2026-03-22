import { NextResponse } from \"next/server\";
import { createClientSafe } from \"@/lib/supabase/server\";
import type { SubscriptionTier } from \"@/types/database\";

export const dynamic = \"force-dynamic\";
export const runtime = \"nodejs\";

export async function GET() {
  const supabase = await createClientSafe();
  
  // Obter sinais reais do banco de dados (inseridos pelo worker)
  const { data: signals, error } = await supabase
    .from(\"signals\")
    .select(\"*\")
    .order(\"updatedAt\", { ascending: false })
    .limit(100);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    signals: signals || [],
    meta: {
      engine: \"Ensemble IA (GB + LSTM)\",
      yahooConnected: true,
      lastUpdate: new Date().toISOString()
    }
  });
}
