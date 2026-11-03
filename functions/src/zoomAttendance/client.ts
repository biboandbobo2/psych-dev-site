export interface ZoomCredentials {
  accountId: string;
  clientId: string;
  clientSecret: string;
}

export interface ZoomReportParticipant {
  id?: string;
  participant_user_id?: string;
  user_id?: string;
  name?: string;
  user_email?: string;
  join_time?: string;
  leave_time?: string;
  duration?: number;
  status?: string;
}

export interface ZoomReport {
  uuid: string;
  start_time: string;
  end_time: string;
  participants: ZoomReportParticipant[];
}

export interface ZoomMeetingInstance {
  uuid: string;
  start_time: string;
}

export class ZoomApiError extends Error {
  readonly status: number | null;
  readonly code: string | number | null;
  readonly retryAfterSec: number | null;

  constructor(
    status: number | null,
    code: string | number | null = null,
    retryAfterSec: number | null = null,
  ) {
    super(
      status === 429 || (status !== null && status >= 500)
        ? "Zoom временно недоступен"
        : "Не удалось получить данные Zoom",
    );
    this.name = "ZoomApiError";
    this.status = status;
    this.code = code;
    this.retryAfterSec = retryAfterSec;
  }
}

const API_BASE = "https://api.zoom.us/v2";
const TOKEN_URL = "https://zoom.us/oauth/token";
const REQUEST_TIMEOUT_MS = 20_000;
const MAX_PAGES = 100;
const MAX_PARTICIPANTS = 10_000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requiredString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function isParticipant(value: unknown): value is ZoomReportParticipant {
  if (!isRecord(value)) return false;
  const stringFields = [
    "id",
    "participant_user_id",
    "user_id",
    "name",
    "user_email",
    "join_time",
    "leave_time",
    "status",
  ];
  return (
    stringFields.every(
      (field) => value[field] === undefined || typeof value[field] === "string",
    ) &&
    (value.duration === undefined ||
      (typeof value.duration === "number" && Number.isFinite(value.duration)))
  );
}

function safeCode(body: unknown): string | number | null {
  if (!isRecord(body)) return null;
  const code = body.code;
  if (typeof code === "number" && Number.isFinite(code)) return code;
  return typeof code === "string" && /^\d{1,10}$/.test(code) ? code : null;
}

function retryAfter(response: Response): number | null {
  const value = response.headers.get("retry-after");
  if (!value) return null;
  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) return seconds;
  const date = Date.parse(value);
  return Number.isNaN(date)
    ? null
    : Math.max(0, Math.ceil((date - Date.now()) / 1000));
}

function encodeMeetingUuid(uuid: string): string {
  const encoded = encodeURIComponent(uuid);
  return uuid.startsWith("/") || uuid.includes("//")
    ? encodeURIComponent(encoded)
    : encoded;
}

export class ZoomClient {
  private token: string | null = null;
  private tokenExpiresAt = 0;
  private tokenRequest: Promise<string> | null = null;

  constructor(
    private readonly credentials: ZoomCredentials,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  async instances(
    meetingId: string,
    fromMs: number,
    toMs: number,
  ): Promise<ZoomMeetingInstance[]> {
    const from = new Date(fromMs).toISOString().slice(0, 10);
    const to = new Date(toMs).toISOString().slice(0, 10);
    const params = new URLSearchParams({ from, to });
    const body = await this.apiJson(
      `/past_meetings/${encodeURIComponent(meetingId)}/instances?${params}`,
    );
    if (!isRecord(body) || !Array.isArray(body.meetings))
      throw new ZoomApiError(null);
    return body.meetings.map((item) => {
      if (
        !isRecord(item) ||
        !requiredString(item.uuid) ||
        !requiredString(item.start_time)
      ) {
        throw new ZoomApiError(null);
      }
      return { uuid: item.uuid, start_time: item.start_time };
    });
  }

  async report(uuid: string): Promise<ZoomReport> {
    const pathUuid = encodeMeetingUuid(uuid);
    const detail = await this.apiJson(`/report/meetings/${pathUuid}`);
    if (
      !isRecord(detail) ||
      !requiredString(detail.uuid) ||
      !requiredString(detail.start_time) ||
      !requiredString(detail.end_time)
    ) {
      throw new ZoomApiError(null);
    }

    const participants: ZoomReportParticipant[] = [];
    const seenTokens = new Set<string>();
    let nextPageToken: string | undefined;
    let expectedRecords: number | undefined;
    let pageCount = 0;
    do {
      if (pageCount >= MAX_PAGES) throw new ZoomApiError(null);
      const params = new URLSearchParams({ page_size: "300" });
      if (nextPageToken) params.set("next_page_token", nextPageToken);
      const page = await this.apiJson(
        `/report/meetings/${pathUuid}/participants?${params}`,
      );
      if (!isRecord(page) || !Array.isArray(page.participants))
        throw new ZoomApiError(null);
      if (
        typeof page.next_page_token !== "string" ||
        typeof page.total_records !== "number" ||
        !Number.isInteger(page.total_records) ||
        page.total_records < 0
      )
        throw new ZoomApiError(null);
      if (
        expectedRecords !== undefined &&
        expectedRecords !== page.total_records
      )
        throw new ZoomApiError(null);
      expectedRecords = page.total_records;
      for (const item of page.participants) {
        if (!isParticipant(item)) throw new ZoomApiError(null);
        participants.push(item as ZoomReportParticipant);
        if (participants.length > MAX_PARTICIPANTS)
          throw new ZoomApiError(null);
      }
      nextPageToken =
        typeof page.next_page_token === "string" && page.next_page_token
          ? page.next_page_token
          : undefined;
      if (nextPageToken && seenTokens.has(nextPageToken))
        throw new ZoomApiError(null);
      if (nextPageToken) seenTokens.add(nextPageToken);
      if (!nextPageToken && participants.length !== expectedRecords) {
        throw new ZoomApiError(null);
      }
      pageCount += 1;
    } while (nextPageToken);

    return {
      uuid: detail.uuid,
      start_time: detail.start_time,
      end_time: detail.end_time,
      participants,
    };
  }

  private async apiJson(path: string): Promise<unknown> {
    let token = await this.getToken();
    let response = await this.request(`${API_BASE}${path}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (response.status === 401) {
      token = await this.getToken(true);
      response = await this.request(`${API_BASE}${path}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
    }
    return this.readJson(response);
  }

  private async getToken(force = false): Promise<string> {
    if (!force && this.token && Date.now() < this.tokenExpiresAt - 60_000)
      return this.token;
    if (this.tokenRequest) return this.tokenRequest;
    this.tokenRequest = this.fetchToken();
    try {
      return await this.tokenRequest;
    } finally {
      this.tokenRequest = null;
    }
  }

  private async fetchToken(): Promise<string> {
    const params = new URLSearchParams({
      grant_type: "account_credentials",
      account_id: this.credentials.accountId,
    });
    const basic = Buffer.from(
      `${this.credentials.clientId}:${this.credentials.clientSecret}`,
    ).toString("base64");
    const response = await this.request(TOKEN_URL, {
      method: "POST",
      headers: {
        Authorization: `Basic ${basic}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });
    const body = await this.readJson(response);
    if (
      !isRecord(body) ||
      !requiredString(body.access_token) ||
      typeof body.expires_in !== "number" ||
      !Number.isFinite(body.expires_in)
    ) {
      throw new ZoomApiError(null);
    }
    this.token = body.access_token;
    this.tokenExpiresAt = Date.now() + Math.max(0, body.expires_in) * 1000;
    return this.token;
  }

  private async request(url: string, init: RequestInit): Promise<Response> {
    try {
      return await this.fetchImpl(url, {
        ...init,
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
    } catch {
      throw new ZoomApiError(null);
    }
  }

  private async readJson(response: Response): Promise<unknown> {
    let body: unknown;
    try {
      body = await response.json();
    } catch {
      throw new ZoomApiError(response.status, null, retryAfter(response));
    }
    if (!response.ok)
      throw new ZoomApiError(
        response.status,
        safeCode(body),
        retryAfter(response),
      );
    return body;
  }
}
