import { adminDb } from "../firebase/admin";

type AdminLogUser = {
  uid?: string;
  email?: string | null;
};

type AdminLogParams = {
  action: string;
  entity?: string;
  entityId?: string;
  user?: AdminLogUser | null;
  details?: Record<string, unknown>;
};

function compactObject<T extends Record<string, unknown>>(value: T) {
  return Object.fromEntries(
    Object.entries(value).filter(([, entryValue]) => entryValue !== undefined)
  );
}

export async function writeAdminLog({
  action,
  entity,
  entityId,
  user,
  details,
}: AdminLogParams) {
  const baseLog = compactObject({
    action,
    entity,
    entityId,
    userId: user?.uid,
    userEmail: user?.email ?? undefined,
    details: details && Object.keys(details).length > 0 ? details : undefined,
    createdAt: new Date().toISOString(),
  });

  await adminDb.collection("adminLogs").add(baseLog);
}
