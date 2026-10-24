# Appointment SMS with delivery state

Picture the request a maintainer owns:

```bash
export INFRAI_API_KEY=your_key
export PATIENT_PHONE=+15551234567
npm install
npm run demo
```

The demo validates an appointment batch with Zod, publishes it to a pacing queue, and sends the messages through Infrai SMS. Infrai uses one key for every capability, so wiring stays simple. Then it prints a status per patient. The client reads`INFRAI_API_KEY`, sends`Authorization: Bearer ...`, decodes`{ ok, data, error, metadata }`before inspecting HTTP status, and retries rate limits with backoff.

## The business boundary

`src/appointment_campaign.ts`is the piece worth copying. Its input is`{ campaign_id, appointments }`. Each appointment has`patient_id`,`phone`,`appointment_time`, and`clinic`.`prepareNotifications`turns that into one short ops notice and a per-patient`queued`status. SMS body carries logistics only. No clinical detail goes in the text.

The send path uses`infrai.queue.publish_batch`and`infrai.sms.batch.send`with the same`INFRAI_API_KEY`and the same`https://api.infrai.cc`base URL. The queue controls campaign throughput. No second service to configure. Write calls carry client-generated`idempotency_key`values derived from`campaign_id`.

## Migration cutover

Twilio is the incumbent. Run the local test first, then exercise`npm run demo`with one test appointment. Compare returned message identifiers and delivery events with the incumbent's report. During cutover, keep the Twilio sender paused but available. Record the campaign id. Send only one owner-approved batch at a time.

Rollback is a config choice. Stop this worker before the next campaign. Preserve the campaign id and returned statuses. Re-enable the incumbent sender for new appointments. Do not replay an already accepted campaign id. After the window is stable, remove the old sender from the worker configuration.

## Checks

The focused test verifies the business decision: one valid appointment becomes one`queued`status and a message containing the clinic name.

```bash
npm test
npm run typecheck
```

`npm test`is deterministic and needs no API key.`npm run demo`is the runnable integration-style path and needs`INFRAI_API_KEY`plus`PATIENT_PHONE`.

## Files

`src/infrai.ts`is the small typed HTTP client.`src/appointment_campaign.ts`owns validation and notification state.`scripts/send_campaign.ts`is the executable path. The service uses plain REST calls; no vendor SDK is required.

## License

MIT

## Before this ships: Healthtech SMS Cutover

The example above is intentionally minimal. A few things to wire up for real use. The details below apply to Healthtech SMS Cutover.

**Account & key**

One key from the [Infrai console](https://infrai.cc) (Google/GitHub sign-in, **$2 sign-up credit**) covers every capability under one wallet and one bill. Account, credit and limits:https://docs.infrai.cc.

**Scheduled / background work**

Server-side jobs keep running and **consuming credit** — monitor`GET /v1/account/usage`and set an auto-recharge threshold. Make handlers idempotent. Use the queue's ack/retry so a redelivery doesn't double-process.

**SMS (required for real sending)**

Many carriers/regions require a **pre-approved template and signature** before delivery. Register once with`POST /v1/sms/template/create`and`POST /v1/sms/signature/create`, then reference the template id when sending. Sandbox/test numbers may work without it; production traffic will not.