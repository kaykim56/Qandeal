import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { updateParticipationStatus } from "@/lib/google-sheets";

// PATCH /api/admin/participations/[id] - 참여 상태 업데이트
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const { status } = await request.json();

    if (!["approved", "rejected"].includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const success = await updateParticipationStatus(id, status, session.user.email);

    if (!success) {
      return NextResponse.json({ error: "Participation not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to update participation:", error);
    return NextResponse.json(
      { error: "Failed to update participation" },
      { status: 500 }
    );
  }
}
