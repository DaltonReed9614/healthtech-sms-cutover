import { sendAppointmentCampaign } from "../src/appointment_campaign.js";

const input = {
  campaign_id: process.env.CAMPAIGN_ID ?? "clinic-demo-2026-10-22",
  appointments: [{
    patient_id: process.env.PATIENT_ID ?? "patient-demo",
    phone: process.env.PATIENT_PHONE,
    appointment_time: "2026-10-23 09:30",
    clinic: "North Clinic",
  }],
};

if (!input.appointments[0].phone) throw new Error("PATIENT_PHONE is required");
console.log(await sendAppointmentCampaign(input));
