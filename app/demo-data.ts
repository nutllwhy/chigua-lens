import rawDossier from "@/examples/demo/dossier.json";

export type ClaimStatus = "confirmed" | "conflicting" | "unverified" | "debunked";

export type DemoSource = {
  id: string;
  title: string;
  publisher: string;
  url: string;
  publishedAt: string;
  retrievedAt: string;
  type: string;
};

type DemoDossier = {
  title: string;
  topic: string;
  subtitle: string;
  generatedAt: string;
  demo: boolean;
  oneLiner: string;
  facts: Array<{
    label: string;
    text: string;
    status: ClaimStatus;
    sourceIds: string[];
  }>;
  people: Array<{ id: string; name: string; role: string }>;
  timeline: Array<{
    time: string;
    title: string;
    detail: string;
    status: ClaimStatus;
    sourceIds: string[];
  }>;
  claims: {
    sideA: { name: string; summary: string; sourceIds: string[] };
    sideB: { name: string; summary: string; sourceIds: string[] };
    commonGround: string;
  };
  evidence: Array<{
    id: string;
    title: string;
    summary: string;
    status: ClaimStatus;
    sourceIds: string[];
  }>;
  sources: DemoSource[];
};

export const demoDossier = rawDossier as DemoDossier;

const sourceMap = new Map(demoDossier.sources.map((source) => [source.id, source]));

export const getSources = (sourceIds: string[]) =>
  sourceIds
    .map((sourceId) => sourceMap.get(sourceId))
    .filter((source): source is DemoSource => Boolean(source));

const statusPresentation: Record<
  ClaimStatus,
  { tone: string; tag: string; evidenceClass: string; seal: string }
> = {
  confirmed: {
    tone: "origin",
    tag: "已确认",
    evidenceClass: "solid",
    seal: "可核验",
  },
  conflicting: {
    tone: "claim",
    tag: "说法冲突",
    evidenceClass: "conflict",
    seal: "待解释",
  },
  unverified: {
    tone: "spread",
    tag: "待验证",
    evidenceClass: "unverified",
    seal: "别急着信",
  },
  debunked: {
    tone: "update",
    tag: "已排除",
    evidenceClass: "debunked",
    seal: "已排除",
  },
};

export const demoTimeline = demoDossier.timeline.map((item, index) => {
  const [date, time] = item.time.split(" ");
  const sources = getSources(item.sourceIds);
  const presentation = statusPresentation[item.status];

  return {
    ...item,
    date,
    time,
    tone:
      item.status === "confirmed" && index === demoDossier.timeline.length - 1
        ? "update"
        : presentation.tone,
    tag: presentation.tag,
    sourceLabel: sources.map((source) => source.publisher).join(" + "),
  };
});

export const demoEvidence = demoDossier.evidence.map((item, index) => {
  const sources = getSources(item.sourceIds);
  const presentation = statusPresentation[item.status];

  return {
    ...item,
    index: String(index + 1).padStart(2, "0"),
    type: presentation.tag,
    evidenceClass: presentation.evidenceClass,
    seal: presentation.seal,
    sourceLabel: sources.map((source) => source.title).join(" + "),
  };
});

export const demoFacts = demoDossier.facts.map((fact) => ({
  ...fact,
  cardClass:
    fact.status === "confirmed"
      ? "confirmed"
      : fact.status === "conflicting"
        ? "conflict"
        : "pending",
  icon:
    fact.status === "confirmed"
      ? "✓"
      : fact.status === "conflicting"
        ? "↯"
        : "?",
  statusText:
    fact.status === "confirmed"
      ? "已确认"
      : fact.status === "conflicting"
        ? "有分歧"
        : fact.status === "debunked"
          ? "已排除"
          : "待验证",
}));
