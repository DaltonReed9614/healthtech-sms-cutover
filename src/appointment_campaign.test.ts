import assert from "node:assert/strict";
import test from "node:test";
import { prepareNotifications } from "./appointment_campaign.js";

test("prepares one queued notification per appointment with no patient detail in the status", () => {
  const result = prepareNotifications({
    campaign_id: "clinic-2026-10-22",
    appointments: [{ patient_id: "p-17", phone: "+15551234567", appointment_time: "09:30", clinic: "North" }],
  });
  assert.deepEqual(result.statuses, [{ patient_id: "p-17", status: "queued" }]);
  assert.equal(result.messages[0]?.to, "+15551234567");
  assert.match(result.messages[0]?.body ?? "", /North/);
});
