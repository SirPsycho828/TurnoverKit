import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { onRequest } from "firebase-functions/v2/https";
import { onDocumentDeleted } from "firebase-functions/v2/firestore";

initializeApp();

const db = getFirestore();
const auth = getAuth();

// ============================================================
// 1. Portal Token Exchange
//    Tenant visits /portal/:token → client calls this function
//    to get a custom Firebase Auth token for limited access.
// ============================================================
export const exchangePortalToken = onRequest(
  { cors: true },
  async (req, res) => {
    const { token } = req.body;

    if (!token || typeof token !== "string") {
      res.status(400).json({ error: "Missing token" });
      return;
    }

    try {
      // Find turnover by portal token
      const snap = await db
        .collection("turnovers")
        .where("portalToken", "==", token)
        .limit(1)
        .get();

      if (snap.empty) {
        res.status(404).json({ error: "Invalid token" });
        return;
      }

      const turnover = snap.docs[0].data();
      const turnoverId = snap.docs[0].id;

      // Check expiry
      if (turnover.portalExpiresAt.toDate() < new Date()) {
        res.status(410).json({ error: "Token expired" });
        return;
      }

      // Create a custom token with limited claims
      const customToken = await auth.createCustomToken(
        `tenant_${turnoverId}`,
        {
          portalToken: token,
          turnoverId,
          role: "tenant",
        }
      );

      res.json({ customToken, turnoverId });
    } catch (err) {
      console.error("Token exchange error:", err);
      res.status(500).json({ error: "Internal error" });
    }
  }
);

// ============================================================
// 2. Cascading Delete — Property
//    When a property is deleted, clean up associated storage.
// ============================================================
export const onPropertyDeleted = onDocumentDeleted(
  "properties/{propertyId}",
  async (event) => {
    const propertyId = event.params.propertyId;
    const data = event.data?.data();
    if (!data) return;

    // Delete move-in photos from Storage
    const bucket = getStorage().bucket();
    try {
      const [files] = await bucket.getFiles({
        prefix: `properties/${propertyId}/`,
      });
      await Promise.all(files.map((f) => f.delete()));
    } catch (err) {
      console.error(`Failed to delete storage for property ${propertyId}:`, err);
    }
  }
);

// ============================================================
// 3. Cascading Delete — Turnover
//    When a turnover is deleted, remove subcollections and storage.
// ============================================================
export const onTurnoverDeleted = onDocumentDeleted(
  "turnovers/{turnoverId}",
  async (event) => {
    const turnoverId = event.params.turnoverId;

    // Delete subcollections
    const subcollections = [
      "rooms",
      "deductions",
      "tenantResponses",
      "signatures",
    ];

    for (const sub of subcollections) {
      const snap = await db
        .collection(`turnovers/${turnoverId}/${sub}`)
        .listDocuments();
      const batch = db.batch();
      snap.forEach((docRef) => batch.delete(docRef));
      await batch.commit();
    }

    // Delete inspection photos from Storage
    const bucket = getStorage().bucket();
    try {
      const [files] = await bucket.getFiles({
        prefix: `turnovers/${turnoverId}/`,
      });
      await Promise.all(files.map((f) => f.delete()));
    } catch (err) {
      console.error(
        `Failed to delete storage for turnover ${turnoverId}:`,
        err
      );
    }
  }
);

// ============================================================
// 4. Deposit Deadline Reminder (callable via Cloud Scheduler)
//    Checks all active turnovers and logs reminders.
//    In production, this would send FCM push or email.
// ============================================================
export const checkDepositDeadlines = onRequest(
  { cors: false },
  async (_req, res) => {
    const now = new Date();
    const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

    const snap = await db
      .collection("turnovers")
      .where("status", "not-in", ["finalized", "archived"])
      .get();

    const reminders: string[] = [];

    snap.forEach((doc) => {
      const data = doc.data();
      const depositDue = data.depositDueDate?.toDate();
      if (!depositDue) return;

      if (depositDue < now) {
        reminders.push(
          `OVERDUE: ${data.tenantName} (${doc.id}) — deposit was due ${depositDue.toISOString()}`
        );
      } else if (depositDue < threeDaysFromNow) {
        reminders.push(
          `URGENT: ${data.tenantName} (${doc.id}) — deposit due ${depositDue.toISOString()}`
        );
      }
    });

    console.log(`Deposit deadline check: ${reminders.length} reminders`);
    reminders.forEach((r) => console.log(r));

    res.json({ checked: snap.size, reminders: reminders.length });
  }
);
