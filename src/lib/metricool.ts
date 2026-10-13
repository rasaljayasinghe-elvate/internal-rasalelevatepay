// Metricool's API reports a brand you have connected (the blogId in the
// brand URL). Creator posts live on the creator's own accounts, so these
// totals are the brand's analytics for the campaign dates, not a substitute
// for the views typed in on each post.
// Docs: https://app.metricool.com/resources/apidocs/index.html

const API = "https://app.metricool.com/api";

export type MetricoolPoint = {
  network: string;
  metric: string;
  total: number;
};

export type MetricoolSnapshot = {
  syncedAt: string;
  blogId: string;
  from: string;
  to: string;
  series: MetricoolPoint[];
  error?: string;
};

const NETWORK_METRICS: Record<string, string[]> = {
  instagram: ["views", "impressions", "reach"],
  tiktok: ["views", "videoViews"],
  facebook: ["impressions", "reach"],
  youtube: ["views"],
};

export function metricoolConfig() {
  const token = process.env.METRICOOL_TOKEN?.trim() || "";
  const userId = process.env.METRICOOL_USER_ID?.trim() || "";
  const blogId = process.env.METRICOOL_BLOG_ID?.trim() || "";
  return {
    token,
    userId,
    blogId,
    configured: token !== "" && userId !== "",
  };
}

export async function pullBrandTotals(input: {
  blogId: string;
  from: string;
  to: string;
  networks: string[];
}): Promise<MetricoolSnapshot> {
  const { token, userId } = metricoolConfig();
  if (!token || !userId) {
    throw new Error("Metricool is not connected.");
  }

  const series: MetricoolPoint[] = [];
  const failures: string[] = [];
  const networks = input.networks.length > 0 ? input.networks : ["instagram"];

  for (const network of networks) {
    const metrics = NETWORK_METRICS[network] ?? ["views"];
    let recorded = false;
    for (const metric of metrics) {
      try {
        const payload = await metricoolGet(
          "/v2/analytics/timelines",
          {
            blogId: input.blogId,
            from: `${input.from}T00:00:00`,
            to: `${input.to}T23:59:59`,
            timezone: "Asia/Colombo",
            metric,
            network,
          },
          token,
          userId,
        );
        const total = sumSeries(payload);
        if (total == null) continue;
        series.push({ network, metric, total });
        recorded = true;
        break;
      } catch (err) {
        failures.push(`${network} ${metric}: ${err instanceof Error ? err.message : "request failed"}`);
      }
    }
    if (!recorded && failures.length === 0) {
      failures.push(`${network}: Metricool returned no totals.`);
    }
  }

  return {
    syncedAt: new Date().toISOString(),
    blogId: input.blogId,
    from: input.from,
    to: input.to,
    series,
    error: series.length === 0 ? failures[0] ?? "Metricool returned no totals." : undefined,
  };
}

async function metricoolGet(
  path: string,
  params: Record<string, string>,
  token: string,
  userId: string,
): Promise<unknown> {
  const url = new URL(API + path);
  url.searchParams.set("userId", userId);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);

  const response = await fetch(url, {
    headers: { "X-Mc-Auth": token },
    cache: "no-store",
    signal: AbortSignal.timeout(20_000),
  });
  const body = await response.text();
  if (!response.ok) {
    throw new Error(redact(body, token).slice(0, 180) || `HTTP ${response.status}`);
  }
  try {
    return JSON.parse(body) as unknown;
  } catch {
    throw new Error("Metricool did not return JSON.");
  }
}

function redact(body: string, token: string): string {
  return token ? body.replaceAll(token, "[token]") : body;
}

/** Sum a timeline. Prefers arrays of numbers or objects with a value field. */
function sumSeries(payload: unknown): number | null {
  const values = seriesValues(payload);
  if (values.length === 0) return null;
  return values.reduce((sum, n) => sum + n, 0);
}

function seriesValues(payload: unknown): number[] {
  if (Array.isArray(payload)) {
    if (payload.every((item) => typeof item === "number")) return payload.filter((n) => Number.isFinite(n));
    return payload.flatMap((item) => seriesValues(item));
  }
  if (!payload || typeof payload !== "object") return [];
  const record = payload as Record<string, unknown>;
  if (typeof record.value === "number") return [record.value];
  if (typeof record.total === "number" && !("values" in record) && !("data" in record)) return [record.total];
  for (const key of ["values", "data", "timeline", "metrics", "series"]) {
    if (key in record) {
      const found = seriesValues(record[key]);
      if (found.length > 0) return found;
    }
  }
  return [];
}
