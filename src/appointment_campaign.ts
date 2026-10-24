import { z } from "zod";
import { infrai, type SmsMessage } from "./infrai.js";

export const appointmentSchema = z.object({
  campaign_id: z.string().min(1),
  appointments: z.array(z.object({
    patient_id: z.string().min(1),
    phone: z.string().min(7),
    appointment_time: z.string().min(1),
    clinic: z.string().min(1),
  })).min(1),
});

export type AppointmentRequest = z.infer<typeof appointmentSchema>;
export type DeliveryStatus = { patient_id: string; status: "queued" | "rejected"; reason?: string };

export function prepareNotifications(input: unknown): { messages: SmsMessage[]; statuses: DeliveryStatus[] } {
  const request = appointmentSchema.parse(input);
  const statuses: DeliveryStatus[] = [];
  const messages = request.appointments.map((appointment) => {
    const body = `Appointment at ${appointment.clinic} on ${appointment.appointment_time}. Reply to your clinic for changes.`;
    statuses.push({ patient_id: appointment.patient_id, status: "queued" });
    return { to: appointment.phone, body };
  });
  return { messages, statuses };
}

export async function sendAppointmentCampaign(input: unknown) {
  const request = appointmentSchema.parse(input);
  const prepared = prepareNotifications(request);
  await infrai.queue.publish_batch("appointment-sms", prepared.messages, `${request.campaign_id}:queue`);
  const delivery = await infrai.sms.batch.send(prepared.messages, `${request.campaign_id}:sms`);
  return { campaign_id: request.campaign_id, statuses: prepared.statuses, delivery };
}
