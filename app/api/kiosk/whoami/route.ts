import { NextRequest, NextResponse } from "next/server";
import { getKioskDevice } from "@/lib/kiosk-auth";

/**
 * Returns the current device info if a valid kiosk token cookie is present.
 * Used by the kiosk page to detect whether it's been paired.
 */
export async function GET(req: NextRequest) {
  const device = await getKioskDevice(req);
  if (!device) {
    return NextResponse.json({ paired: false }, { status: 200 });
  }
  return NextResponse.json({
    paired: true,
    device: {
      id: device.id,
      name: device.name,
      company_id: device.company_id,
    },
  });
}
