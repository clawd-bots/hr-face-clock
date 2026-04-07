import { NextResponse } from "next/server";
import { getSupabaseService } from "@/lib/supabase-service";

export async function GET() {
  try {
    const supabase = getSupabaseService();

    const { count, error } = await supabase
      .from("companies")
      .select("*", { count: "exact", head: true });

    if (error) {
      // Table might not exist yet (migrations not run)
      return NextResponse.json({ needsSetup: true });
    }

    return NextResponse.json({ needsSetup: !count || count === 0 });
  } catch {
    // If service key is missing or any other error, assume setup needed
    return NextResponse.json({ needsSetup: true });
  }
}
