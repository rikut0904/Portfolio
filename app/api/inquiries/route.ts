import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "../../../lib/firebase/admin";
import { checkAdminAuth } from "../../../lib/auth/admin-auth";
import { writeAdminLog } from "../../../lib/admin/logs";

const normalize = (value: unknown) => (typeof value === "string" ? value.trim() : "");

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const category = normalize(data?.category);
    const subject = normalize(data?.subject);
    const message = normalize(data?.message);
    const contactName = normalize(data?.contactName);
    const contactEmail = normalize(data?.contactEmail);

    if (!subject || !message || !contactEmail) {
      return NextResponse.json(
        { error: "subject, message, contactEmail are required" },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();
    const docRef = await adminDb.collection("inquiries").add({
      category,
      subject,
      message,
      contactName,
      contactEmail,
      status: "pending",
      replies: [],
      createdAt: now,
      updatedAt: now,
    });

    return NextResponse.json({ id: docRef.id }, { status: 201 });
  } catch (error) {
    console.error("Error creating inquiry:", error);
    return NextResponse.json({ error: "Failed to create inquiry" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const user = await checkAdminAuth(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const snapshot = await adminDb
      .collection("inquiries")
      .orderBy("createdAt", "desc")
      .get();

    const inquiries = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt,
      };
    });

    await writeAdminLog({
      action: "read",
      entity: "inquiries",
      user,
    });

    return NextResponse.json({ inquiries });
  } catch (error) {
    console.error("Error fetching inquiries:", error);
    return NextResponse.json({ error: "Failed to fetch inquiries" }, { status: 500 });
  }
}
