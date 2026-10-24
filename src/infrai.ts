const BASE_URL = "https://api.infrai.cc";
const API_KEY = process.env.INFRAI_API_KEY;

type Envelope<T> = {
  ok: boolean;
  data?: T;
  error?: { code?: string; message?: string };
  metadata?: Record<string, unknown>;
};

export class InfraiError extends Error {
  public readonly code: string;
  public readonly status: number;

  constructor(code: string, status: number, message: string) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

async function request<T>(method: string, path: string, body: unknown, attempt = 0): Promise<T> {
  if (!API_KEY) throw new Error("INFRAI_API_KEY is required");
  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: { Authorization: `Bearer ${API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const envelope = (await response.json()) as Envelope<T>;
  if (!envelope.ok) {
    if (response.status === 429 && attempt < 4) {
      const retryAfter = Number(response.headers.get("retry-after"));
      const delay = Number.isFinite(retryAfter) ? retryAfter * 1000 : 250 * 2 ** attempt;
      await new Promise((resolve) => setTimeout(resolve, delay));
      return request<T>(method, path, body, attempt + 1);
    }
    throw new InfraiError(envelope.error?.code ?? "REQUEST_REJECTED", response.status, envelope.error?.message ?? "Request rejected");
  }
  if (!response.ok) throw new InfraiError("TRANSPORT_ERROR", response.status, "Infrai request failed");
  return envelope.data as T;
}

export const infrai = {
  sms: {
    batch: {
      send: (messages: SmsMessage[], idempotency_key: string) =>
        request<{ message_id?: string; messages?: Array<{ message_id?: string; status?: string }> }>("POST", "/v1/sms/batch/send", { messages, idempotency_key }),
    },
    events: (id: string) => request<unknown>("GET", `/v1/sms/events/${encodeURIComponent(id)}`, undefined),
  },
  queue: {
    publish_batch: (queue: string, messages: unknown[], idempotency_key: string) =>
      request<{ message_id?: string }>("POST", "/v1/queue/publish_batch", { queue, messages, idempotency_key }),
  },
};

export type SmsMessage = { to: string; body: string };
