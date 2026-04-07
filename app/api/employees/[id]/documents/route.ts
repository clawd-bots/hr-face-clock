import { NextRequest, NextResponse } from "next/server";
import { getSupabaseService } from "@/lib/supabase-service";
import { getSupabaseServer } from "@/lib/supabase-server";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = getSupabaseService();

  const { data, error } = await supabase
    .from("employee_documents")
    .select("*")
    .eq("employee_id", id)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = getSupabaseService();

  // Get user context
  let userId: string | null = null;
  let companyId: string | null = null;
  try {
    const serverClient = await getSupabaseServer();
    const { data: { user } } = await serverClient.auth.getUser();
    if (user) {
      userId = user.id;
      const { data: profile } = await serverClient
        .from("user_profiles")
        .select("company_id")
        .eq("id", user.id)
        .single();
      companyId = profile?.company_id ?? null;
    }
  } catch { /* unauthenticated */ }

  if (!userId || !companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File;
  const documentType = formData.get("document_type") as string;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  // Upload to Supabase Storage
  const filePath = `${companyId}/${id}/${documentType}/${Date.now()}-${file.name}`;
  const arrayBuffer = await file.arrayBuffer();

  const { error: uploadError } = await supabase.storage
    .from("employee-documents")
    .upload(filePath, arrayBuffer, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  // Create metadata record
  const { data, error } = await supabase
    .from("employee_documents")
    .insert({
      company_id: companyId,
      employee_id: id,
      document_type: documentType,
      document_name: file.name,
      file_path: filePath,
      file_size: file.size,
      mime_type: file.type,
      uploaded_by: userId,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const docId = searchParams.get("docId");
  if (!docId) return NextResponse.json({ error: "Missing docId" }, { status: 400 });

  const supabase = getSupabaseService();

  // Get file path before deleting record
  const { data: doc } = await supabase
    .from("employee_documents")
    .select("file_path")
    .eq("id", docId)
    .single();

  if (doc?.file_path) {
    await supabase.storage
      .from("employee-documents")
      .remove([doc.file_path]);
  }

  const { error } = await supabase
    .from("employee_documents")
    .delete()
    .eq("id", docId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
