import { adminDb } from "../firebase/admin";

type AdminLogUser = {
  uid?: string;
  email?: string | null;
};

type AdminLogLevel = "info" | "warn" | "error";

type AdminLogParams = {
  action: string;
  entity?: string;
  entityId?: string;
  user?: AdminLogUser | null;
  level?: AdminLogLevel;
  details?: Record<string, unknown>;
};

function compactObject<T extends Record<string, unknown>>(value: T) {
  return Object.fromEntries(
    Object.entries(value).filter(([, entryValue]) => entryValue !== undefined)
  );
}

export async function pruneOldAdminLogs() {
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - 2);
  const cutoffIso = cutoff.toISOString();

  let snapshot = await adminDb
    .collection("adminLogs")
    .where("createdAt", "<", cutoffIso)
    .limit(500)
    .get();

  while (!snapshot.empty) {
    const batch = adminDb.batch();
    snapshot.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();

    snapshot = await adminDb
      .collection("adminLogs")
      .where("createdAt", "<", cutoffIso)
      .limit(500)
      .get();
  }
}

export async function writeAdminLog({
  action,
  entity,
  entityId,
  user,
  level = "info",
  details,
}: AdminLogParams) {
  const baseLog = compactObject({
    action,
    entity,
    entityId,
    userId: user?.uid,
    userEmail: user?.email ?? undefined,
    level,
    details: details && Object.keys(details).length > 0 ? details : undefined,
    createdAt: new Date().toISOString(),
  });

  await adminDb.collection("adminLogs").add(baseLog);
  await pruneOldAdminLogs();
}
