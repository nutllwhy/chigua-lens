import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { Presentation, PresentationFile } from "@oai/artifact-tool";

const W = 1280;
const H = 720;
const BODY_FONT = "Source Han Sans CN";
const VALID_STATUSES = new Set(["confirmed", "conflicting", "unverified", "debunked"]);
const VALID_CLAIM_MODES = new Set(["quote", "paraphrase"]);
const VALID_COLLECTION_METHODS = new Set(["weibo-cli", "public-web", "user-supplied", "mixed", "fictional-demo"]);
const C = {
  paper: "#F3EFE6",
  paperDeep: "#E7DFD1",
  ink: "#171712",
  muted: "#6D695F",
  red: "#EF4B35",
  redDeep: "#D63828",
  blue: "#3459E6",
  blueDeep: "#223DAD",
  lime: "#CDEB58",
  white: "#FFFDF8",
  gray: "#B9B2A5",
};

let shapeIndex = 0;

function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    const key = argv[index];
    if (!key.startsWith("--")) continue;
    args[key.slice(2)] = argv[index + 1];
    index += 1;
  }
  return args;
}

function required(value, label) {
  if (!value) throw new Error(`Missing required argument or field: ${label}`);
  return value;
}

function list(value) {
  return Array.isArray(value) ? value : [];
}

function text(value, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function truncate(value, max) {
  const str = text(value);
  return str.length > max ? `${str.slice(0, max - 1)}…` : str;
}

function isHttpUrl(value) {
  return /^https?:\/\//i.test(text(value));
}

function normalizeEntityName(value) {
  return text(value)
    .toLowerCase()
    .replace(/[\s·•,，。、“”‘’「」『』《》【】#_\-—–:：()（）]/g, "");
}

function relationForPerson(person, relations) {
  const directEventRelation = relations.find((relation) =>
    (relation.from === person.id && relation.to === "event") ||
    (relation.to === person.id && relation.from === "event"),
  );
  return directEventRelation || relations.find((relation) =>
    relation.from === person.id || relation.to === person.id,
  );
}

function relationCardLayout(count) {
  const colors = [C.blue, C.red, C.lime, C.blueDeep];
  const presets = {
    1: { width: 410, lefts: [435] },
    2: { width: 380, lefts: [145, 755] },
    3: { width: 330, lefts: [72, 475, 878] },
    4: { width: 270, lefts: [52, 347, 642, 937] },
  };
  const preset = presets[Math.min(Math.max(count, 1), 4)];
  return preset.lefts.map((left, index) => ({
    x: left,
    width: preset.width,
    color: colors[index],
  }));
}

function statusMeta(status) {
  const map = {
    confirmed: { label: "已确认", color: C.lime, ink: C.ink },
    conflicting: { label: "说法冲突", color: C.red, ink: C.white },
    unverified: { label: "尚未证实", color: C.paperDeep, ink: C.ink },
    debunked: { label: "已辟谣", color: C.blue, ink: C.white },
  };
  return map[status] || map.unverified;
}

function addBox(slide, x, y, width, height, fill, options = {}) {
  return slide.shapes.add({
    geometry: options.geometry || "rect",
    name: options.name || `box-${++shapeIndex}`,
    position: { left: x, top: y, width, height },
    fill,
    line: {
      style: "solid",
      fill: options.line || fill,
      width: options.lineWidth ?? 0,
    },
    ...(options.borderRadius ? { borderRadius: options.borderRadius } : {}),
  });
}

function addText(slide, value, x, y, width, height, options = {}) {
  const shape = slide.shapes.add({
    geometry: "textbox",
    name: options.name || `text-${++shapeIndex}`,
    position: { left: x, top: y, width, height },
    fill: "none",
    line: { style: "solid", fill: "none", width: 0 },
  });
  shape.text = value ?? "";
  shape.text.style = {
    fontSize: options.fontSize || 20,
    typeface: options.typeface || BODY_FONT,
    color: options.color || C.ink,
    bold: Boolean(options.bold),
    alignment: options.alignment || "left",
  };
  return shape;
}

function claimMode(side) {
  return VALID_CLAIM_MODES.has(side?.mode) ? side.mode : "paraphrase";
}

function claimText(side) {
  const value = truncate(side?.summary, 54);
  return claimMode(side) === "quote" ? `“${value}”` : value;
}

function claimLabel(side) {
  return claimMode(side) === "quote" ? "原话短引" : "材料摘要（转述）";
}

function addLine(slide, x, y, width, height, color = C.ink) {
  return addBox(slide, x, y, width, height, color, { name: `line-${++shapeIndex}` });
}

function addPageChrome(slide, kicker, title, page, dossier) {
  slide.background.fill = C.paper;
  addText(slide, kicker.toUpperCase(), 62, 40, 390, 24, {
    fontSize: 13,
    color: C.muted,
    bold: true,
  });
  addText(slide, title, 62, 76, 1085, 55, {
    fontSize: 38,
    color: C.ink,
    bold: true,
  });
  addLine(slide, 62, 142, 1156, 2, C.ink);
  addLine(slide, 62, 142, 118, 8, C.red);
  addText(slide, dossier.demo ? "CHIGUA LENS · FICTIONAL DEMO / 虚构演示数据" : "CHIGUA LENS · AI-ASSISTED PUBLIC SOURCE BRIEF", 62, 681, 500, 18, {
    fontSize: 11,
    color: C.muted,
    bold: true,
  });
  addText(slide, String(page).padStart(2, "0"), 1164, 674, 54, 24, {
    fontSize: 15,
    color: C.ink,
    bold: true,
    alignment: "right",
  });
}

function addStatusTag(slide, status, x, y, width = 104) {
  const meta = statusMeta(status);
  addBox(slide, x, y, width, 30, meta.color, {
    geometry: "roundRect",
    borderRadius: "rounded-xl",
  });
  addText(slide, meta.label, x + 7, y + 5, width - 14, 20, {
    fontSize: 13,
    color: meta.ink,
    bold: true,
    alignment: "center",
  });
}

function findSources(dossier, ids) {
  const sourceSet = new Set(list(ids));
  return list(dossier.sources).filter((source) => sourceSet.has(source.id));
}

function setSources(slide, dossier, ids = [], extra = []) {
  const lines = ["[Sources]"];
  for (const source of findSources(dossier, ids)) {
    lines.push(`- ${source.publisher || "未知发布者"}: ${source.title || source.id} — ${source.url || "无链接"}`);
  }
  for (const item of extra) lines.push(`- ${item}`);
  if (lines.length === 1) {
    lines.push(dossier.demo
      ? "- Fictional demonstration data from the bundled demo dossier; no real-world claim."
      : "- No external claim on this slide; structure derived from the supplied dossier.");
  }
  slide.speakerNotes.textFrame.setText(lines.join("\n"));
  slide.speakerNotes.setVisible(false);
}

function sourceIdsFrom(items) {
  return [...new Set(list(items).flatMap((item) => list(item?.sourceIds)))];
}

function addCover(presentation, dossier, coverImage) {
  const slide = presentation.slides.add();
  slide.background.fill = C.blue;
  if (coverImage) {
    slide.images.add({
      blob: coverImage,
      contentType: "image/png",
      alt: "抽象西瓜与证据线索组成的吃瓜神器封面插画",
      fit: "cover",
      position: { left: 0, top: 0, width: W, height: H },
    });
  }
  addBox(slide, 0, 0, 548, H, C.blueDeep);
  addBox(slide, 0, 0, 18, H, C.red);
  addText(slide, "CHIGUA LENS / EVIDENCE BRIEF", 58, 62, 430, 22, {
    fontSize: 13,
    color: C.lime,
    bold: true,
  });
  addText(slide, truncate(dossier.title, 18), 58, 136, 450, 176, {
    fontSize: 66,
    color: C.white,
    bold: true,
  });
  addLine(slide, 58, 326, 188, 10, C.red);
  addText(slide, truncate(dossier.oneLiner, 58), 58, 370, 420, 102, {
    fontSize: 24,
    color: C.white,
    bold: true,
  });
  addText(slide, text(dossier.topic, "公开热点整理"), 58, 526, 410, 28, {
    fontSize: 16,
    color: C.lime,
    bold: true,
  });
  addText(slide, text(dossier.generatedAt, "生成时间未提供"), 58, 574, 410, 22, {
    fontSize: 13,
    color: C.paperDeep,
  });
  addBox(slide, 58, 622, 202, 38, C.lime, {
    geometry: "roundRect",
    borderRadius: "rounded-xl",
  });
  addText(slide, dossier.demo ? "虚构数据 · 模板演示" : "公开信源 · AI 辅助整理", 70, 630, 178, 20, {
    fontSize: 13,
    color: C.ink,
    bold: true,
    alignment: "center",
  });
  setSources(slide, dossier, [], [
    "Cover illustration generated with OpenAI image generation for decorative use only.",
    dossier.demo ? "All event content is fictional demonstration data." : "Claims are attributed in later slides and the source ledger.",
  ]);
}

function addSummary(presentation, dossier) {
  const slide = presentation.slides.add();
  addPageChrome(slide, "30-second briefing", text(dossier.slideTitles?.summary, "先说结论：公开事实与网络解读需要分开"), 2, dossier);

  addText(slide, truncate(dossier.oneLiner, 62), 70, 180, 520, 202, {
    fontSize: 36,
    color: C.blueDeep,
    bold: true,
  });
  addText(slide, text(dossier.summaryNote, "先确认公开材料能证明什么，再说明哪些仍然只是转述或推测。"), 70, 416, 500, 92, {
    fontSize: 20,
    color: C.muted,
  });
  addLine(slide, 628, 180, 2, 414, C.ink);

  const facts = list(dossier.facts).slice(0, 3);
  facts.forEach((fact, index) => {
    const y = 178 + index * 136;
    addStatusTag(slide, fact.status, 674, y, 108);
    addText(slide, fact.label || `要点 ${index + 1}`, 808, y + 2, 320, 25, {
      fontSize: 16,
      color: C.muted,
      bold: true,
    });
    addText(slide, truncate(fact.text, 32), 674, y + 42, 490, 64, {
      fontSize: 25,
      color: C.ink,
      bold: true,
    });
    if (index < facts.length - 1) addLine(slide, 674, y + 116, 490, 1, C.gray);
  });
  setSources(slide, dossier, sourceIdsFrom(facts));
}

function addRelations(presentation, dossier) {
  const slide = presentation.slides.add();
  addPageChrome(slide, "who is involved", text(dossier.slideTitles?.relations, "人物、现场与发布者，角色不同"), 3, dossier);

  const centerTitle = text(dossier.relationCenter?.title, "热点事件");
  const centerKey = normalizeEntityName(centerTitle);
  const seenPeople = new Set();
  const people = list(dossier.people)
    .filter((person) => {
      const key = normalizeEntityName(person?.name);
      if (!key || key === centerKey || seenPeople.has(key)) return false;
      seenPeople.add(key);
      return true;
    })
    .slice(0, 4);
  const relations = list(dossier.relations);
  const positions = relationCardLayout(people.length || 1);
  const cardTop = 414;
  const busY = 364;
  const centerX = 640;
  const nodeCenters = positions.slice(0, people.length).map((position) => position.x + position.width / 2);

  if (people.length) {
    addLine(slide, centerX - 2, 318, 4, busY - 318, C.ink);
    if (nodeCenters.length > 1) {
      addLine(slide, nodeCenters[0], busY, nodeCenters[nodeCenters.length - 1] - nodeCenters[0], 3, C.ink);
    }
    nodeCenters.forEach((nodeCenter) => {
      addLine(slide, nodeCenter - 2, busY, 4, cardTop - busY, C.ink);
    });
  }

  addBox(slide, 400, 188, 480, 130, C.ink, {
    geometry: "roundRect",
    line: C.ink,
    lineWidth: 1,
    borderRadius: "rounded-xl",
  });
  addText(slide, truncate(centerTitle, 16), 436, 221, 408, 38, {
    fontSize: 30,
    color: C.white,
    bold: true,
    alignment: "center",
  });
  addText(slide, truncate(dossier.relationCenter?.subtitle, 22) || "公开信息交叉核对", 436, 269, 408, 24, {
    fontSize: 16,
    color: C.lime,
    bold: true,
    alignment: "center",
  });

  if (!people.length) {
    addText(slide, "当前档案没有可与中心事件区分的独立角色条目。", 320, 424, 640, 46, {
      fontSize: 20,
      color: C.muted,
      alignment: "center",
    });
  }

  people.forEach((person, index) => {
    const pos = positions[index];
    const relation = relationForPerson(person, relations);
    const labelWidth = people.length >= 4 ? 144 : 174;

    addBox(slide, pos.x, cardTop, pos.width, 168, C.white, {
      geometry: "roundRect",
      line: C.ink,
      lineWidth: 2,
      borderRadius: "rounded-xl",
    });
    addBox(slide, pos.x, cardTop, pos.width, 12, pos.color);
    addBox(slide, pos.x + (pos.width - labelWidth) / 2, 348, labelWidth, 32, C.paperDeep, {
      geometry: "roundRect",
      line: C.paperDeep,
      borderRadius: "rounded-xl",
    });
    addText(slide, truncate(relation?.label, people.length >= 4 ? 9 : 11) || "关联事件", pos.x + (pos.width - labelWidth) / 2 + 8, 354, labelWidth - 16, 19, {
      fontSize: 14,
      color: C.muted,
      bold: true,
      alignment: "center",
    });
    addText(slide, truncate(person.name, people.length >= 4 ? 10 : 13), pos.x + 20, cardTop + 40, pos.width - 40, 42, {
      fontSize: people.length >= 4 ? 22 : 25,
      color: C.ink,
      bold: true,
      alignment: "center",
    });
    addText(slide, truncate(person.role, people.length >= 4 ? 15 : 20), pos.x + 20, cardTop + 102, pos.width - 40, 36, {
      fontSize: 16,
      color: C.muted,
      alignment: "center",
    });
  });
  setSources(slide, dossier, sourceIdsFrom(list(dossier.timeline)));
}

function addTimeline(presentation, dossier) {
  const slide = presentation.slides.add();
  addPageChrome(slide, "timeline", text(dossier.slideTitles?.timeline, "时间线把原始发布与后续解读分开"), 4, dossier);
  const items = list(dossier.timeline).slice(0, 4);
  const left = 92;
  const span = 270;
  addLine(slide, left, 330, 1010, 4, C.ink);

  items.forEach((item, index) => {
    const x = left + index * span;
    const meta = statusMeta(item.status);
    addBox(slide, x, 313, 38, 38, meta.color, {
      geometry: "ellipse",
      line: C.ink,
      lineWidth: 2,
    });
    addText(slide, item.time || "时间未明", x - 4, 198, 226, 28, {
      fontSize: 16,
      color: C.blueDeep,
      bold: true,
    });
    addText(slide, truncate(item.title, 16), x - 4, 235, 226, 60, {
      fontSize: 23,
      color: C.ink,
      bold: true,
    });
    addStatusTag(slide, item.status, x - 4, 382, 102);
    addText(slide, truncate(item.detail, 46), x - 4, 432, 220, 98, {
      fontSize: 17,
      color: C.muted,
    });
  });
  addText(slide, "时间顺序能确认信息如何变化，但不能单独证明任何一方的动机。", 92, 584, 1010, 34, {
    fontSize: 18,
    color: C.ink,
    bold: true,
  });
  setSources(slide, dossier, sourceIdsFrom(items));
}

function addClaims(presentation, dossier) {
  const slide = presentation.slides.add();
  addPageChrome(slide, "claim vs claim", text(dossier.slideTitles?.claims, "视频能确认的事实，不等于网友给出的原因"), 5, dossier);
  const sideA = dossier.claims?.sideA || {};
  const sideB = dossier.claims?.sideB || {};

  addBox(slide, 70, 190, 525, 352, C.blue);
  addBox(slide, 685, 190, 525, 352, C.red);
  addText(slide, truncate(sideA.name, 12) || "说法 A", 106, 226, 430, 38, {
    fontSize: 27,
    color: C.lime,
    bold: true,
  });
  addText(slide, claimLabel(sideA), 106, 278, 430, 22, {
    fontSize: 13,
    color: C.paper,
    bold: true,
  });
  addText(slide, claimText(sideA), 106, 312, 430, 124, {
    fontSize: 31,
    color: C.white,
    bold: true,
  });
  addText(slide, `信源：${list(sideA.sourceIds).join(" / ") || "未提供"}`, 106, 482, 430, 23, {
    fontSize: 13,
    color: C.paper,
  });

  addText(slide, truncate(sideB.name, 12) || "说法 B", 721, 226, 430, 38, {
    fontSize: 27,
    color: C.white,
    bold: true,
  });
  addText(slide, claimLabel(sideB), 721, 278, 430, 22, {
    fontSize: 13,
    color: C.paper,
    bold: true,
  });
  addText(slide, claimText(sideB), 721, 312, 430, 124, {
    fontSize: 31,
    color: C.white,
    bold: true,
  });
  addText(slide, `信源：${list(sideB.sourceIds).join(" / ") || "未提供"}`, 721, 482, 430, 23, {
    fontSize: 13,
    color: C.paper,
  });

  addBox(slide, 292, 571, 696, 58, C.lime, {
    geometry: "roundRect",
    line: C.ink,
    lineWidth: 2,
    borderRadius: "rounded-xl",
  });
  addText(slide, `共同事实：${truncate(dossier.claims?.commonGround, 46)}`, 320, 587, 640, 28, {
    fontSize: 20,
    color: C.ink,
    bold: true,
    alignment: "center",
  });
  setSources(slide, dossier, [...list(sideA.sourceIds), ...list(sideB.sourceIds)]);
}

function addEvidence(presentation, dossier) {
  const slide = presentation.slides.add();
  addPageChrome(slide, "evidence board", text(dossier.slideTitles?.evidence, "把“大家都在说”拆成可以逐一检查的材料"), 6, dossier);
  const items = list(dossier.evidence).slice(0, 4);

  items.forEach((item, index) => {
    const y = 176 + index * 112;
    const meta = statusMeta(item.status);
    addBox(slide, 72, y, 82, 82, meta.color, {
      line: C.ink,
      lineWidth: 1,
    });
    addText(slide, String(index + 1).padStart(2, "0"), 79, y + 24, 68, 28, {
      fontSize: 22,
      color: meta.ink,
      bold: true,
      alignment: "center",
    });
    addText(slide, truncate(item.title, 18), 178, y + 4, 340, 34, {
      fontSize: 24,
      color: C.ink,
      bold: true,
    });
    addText(slide, truncate(item.summary, 52), 178, y + 44, 615, 38, {
      fontSize: 17,
      color: C.muted,
    });
    addStatusTag(slide, item.status, 862, y + 10, 112);
    addText(slide, `来源 ${list(item.sourceIds).join(" / ") || "待补"}`, 1000, y + 16, 196, 25, {
      fontSize: 14,
      color: C.muted,
      bold: true,
      alignment: "right",
    });
    if (index < items.length - 1) addLine(slide, 178, y + 96, 1018, 1, C.gray);
  });
  setSources(slide, dossier, sourceIdsFrom(items));
}

function addVerdicts(presentation, dossier) {
  const slide = presentation.slides.add();
  addPageChrome(slide, "verification", text(dossier.slideTitles?.verdicts, "一页看清：什么能说，什么暂时不能说"), 7, dossier);
  const columns = [
    { key: "confirmed", x: 70, title: "可以确认", color: C.lime, ink: C.ink },
    { key: "conflicting", x: 384, title: "仍有冲突", color: C.red, ink: C.white },
    { key: "unverified", x: 698, title: "尚未证实", color: C.paperDeep, ink: C.ink },
    { key: "debunked", x: 1012, title: "已经辟谣", color: C.blue, ink: C.white },
  ];
  columns.forEach((column) => {
    addBox(slide, column.x, 190, 244, 74, column.color);
    addText(slide, column.title, column.x + 18, 210, 208, 32, {
      fontSize: 24,
      color: column.ink,
      bold: true,
      alignment: "center",
    });
    const values = list(dossier.verdicts?.[column.key]).slice(0, 3);
    if (!values.length) {
      addText(slide, "当前没有条目", column.x + 18, 304, 208, 42, {
        fontSize: 18,
        color: C.gray,
        alignment: "center",
      });
    } else {
      values.forEach((value, index) => {
        const y = 294 + index * 94;
        addBox(slide, column.x + 16, y + 8, 14, 14, column.color, {
          geometry: "ellipse",
          line: C.ink,
          lineWidth: 1,
        });
        addText(slide, truncate(value, 22), column.x + 40, y, 190, 68, {
          fontSize: 16,
          color: C.ink,
          bold: true,
        });
        if (index < values.length - 1) addLine(slide, column.x + 40, y + 74, 174, 1, C.gray);
      });
    }
  });
  setSources(slide, dossier, sourceIdsFrom(list(dossier.evidence)));
}

function addNext(presentation, dossier) {
  const slide = presentation.slides.add();
  addPageChrome(slide, "what to watch", text(dossier.slideTitles?.next, "下一个真正有用的信息，不是更多猜测，而是可核验的新材料"), 8, dossier);
  addText(slide, "现在", 80, 196, 150, 34, { fontSize: 24, color: C.red, bold: true });
  addText(slide, truncate(dossier.oneLiner, 62), 80, 252, 480, 194, {
    fontSize: 33,
    color: C.ink,
    bold: true,
  });
  addText(slide, text(dossier.nextConclusion, "在新材料出现前，不把网络解读升级为本人确认。"), 80, 468, 470, 82, {
    fontSize: 20,
    color: C.muted,
  });
  addLine(slide, 618, 190, 2, 398, C.ink);

  addText(slide, "继续观察", 674, 196, 250, 34, { fontSize: 24, color: C.blue, bold: true });
  list(dossier.nextWatch).slice(0, 4).forEach((item, index) => {
    const y = 262 + index * 82;
    addBox(slide, 674, y, 42, 42, index === 0 ? C.red : C.lime, {
      geometry: "ellipse",
      line: C.ink,
      lineWidth: 1,
    });
    addText(slide, String(index + 1), 683, y + 8, 24, 23, {
      fontSize: 16,
      color: C.ink,
      bold: true,
      alignment: "center",
    });
    addText(slide, truncate(item, 28), 744, y + 4, 420, 42, {
      fontSize: 22,
      color: C.ink,
      bold: true,
    });
  });
  setSources(slide, dossier, sourceIdsFrom(list(dossier.timeline)));
}

function addSources(presentation, dossier, sourceImage) {
  const slide = presentation.slides.add();
  addPageChrome(slide, "source ledger", text(dossier.slideTitles?.sources, "这份简报能追到哪里，就只说到哪里"), 9, dossier);
  const sources = list(dossier.sources).slice(0, 8);
  const showSourceImage = Boolean(sourceImage) && sources.length <= 4;
  sources.forEach((source, index) => {
    const col = showSourceImage ? 0 : (index < 4 ? 0 : 1);
    const row = index % 4;
    const x = col === 0 ? 72 : 650;
    const y = 178 + row * 100;
    addText(slide, source.id || `s${index + 1}`, x, y, 46, 24, {
      fontSize: 14,
      color: C.red,
      bold: true,
    });
    addText(slide, truncate(source.title, 22), x + 52, y, 320, 28, {
      fontSize: 20,
      color: C.ink,
      bold: true,
    });
    addText(slide, `${truncate(source.publisher, 16)} · ${source.publishedAt || "时间未提供"}`, x + 52, y + 34, 420, 22, {
      fontSize: 14,
      color: C.muted,
    });
    const visibleUrl = truncate(source.url, 54);
    const urlShape = addText(slide, visibleUrl, x + 52, y + 60, 490, 20, {
      fontSize: 11,
      color: C.blueDeep,
    });
    if (visibleUrl && isHttpUrl(source.url)) {
      const range = urlShape.text.get(visibleUrl);
      range.link = { uri: source.url, isExternal: true };
    }
  });
  if (showSourceImage) {
    slide.images.add({
      blob: sourceImage,
      contentType: "image/png",
      alt: text(dossier.sourceImageAlt, "原始公开发布截图"),
      fit: "contain",
      position: { left: 650, top: 176, width: 558, height: 382 },
    });
    addText(slide, text(dossier.sourceImageCaption, "原始公开发布截图"), 680, 560, 498, 24, {
      fontSize: 13,
      color: C.muted,
      bold: true,
      alignment: "center",
    });
  }
  addBox(slide, 72, 596, 1136, 50, C.ink);
  addText(slide, dossier.demo
    ? "本案例完全虚构，只用于展示工作流与视觉模板。"
    : "公开信息整理不代表司法、监管或事实认定；发布前请人工复核。", 96, 610, 1088, 24, {
    fontSize: 17,
    color: C.white,
    bold: true,
    alignment: "center",
  });
  setSources(slide, dossier, sources.map((source) => source.id), [
    "Deck assembled with AI assistance; final publication requires human review.",
  ]);
}

function assertUniqueIds(items, label, { requiredId = true } = {}) {
  const seen = new Set();
  list(items).forEach((item, index) => {
    const id = text(item?.id);
    if (requiredId && !id) throw new Error(`${label}[${index}].id is required`);
    if (!id) return;
    if (seen.has(id)) throw new Error(`Duplicate ${label} id: ${id}`);
    seen.add(id);
  });
  return seen;
}

function validateReferencedItem(item, label, sourceIds, { requireStatus = true } = {}) {
  if (!item || typeof item !== "object") throw new Error(`${label} must be an object`);
  if (requireStatus && !VALID_STATUSES.has(item.status)) {
    throw new Error(`${label}.status must be one of: ${[...VALID_STATUSES].join(", ")}`);
  }
  if (!Array.isArray(item.sourceIds) || item.sourceIds.length === 0) {
    throw new Error(`${label}.sourceIds must contain at least one source id`);
  }
  const localIds = new Set();
  item.sourceIds.forEach((sourceId, index) => {
    if (typeof sourceId !== "string" || !sourceId.trim()) {
      throw new Error(`${label}.sourceIds[${index}] must be a non-empty string`);
    }
    if (localIds.has(sourceId)) throw new Error(`${label}.sourceIds contains duplicate id: ${sourceId}`);
    localIds.add(sourceId);
    if (!sourceIds.has(sourceId)) throw new Error(`${label} references unknown sourceId: ${sourceId}`);
  });
}

function validateDossier(dossier) {
  if (!dossier || typeof dossier !== "object" || Array.isArray(dossier)) {
    throw new Error("Dossier must be a JSON object");
  }
  required(dossier.title, "dossier.title");
  required(dossier.oneLiner, "dossier.oneLiner");
  if (!list(dossier.timeline).length) throw new Error("dossier.timeline must contain at least one item");
  if (!list(dossier.evidence).length) throw new Error("dossier.evidence must contain at least one item");
  if (!list(dossier.sources).length) throw new Error("dossier.sources must contain at least one item");

  const sourceIds = assertUniqueIds(dossier.sources, "source");
  list(dossier.sources).forEach((source, index) => {
    required(source?.url, `sources[${index}].url`);
  });
  assertUniqueIds(dossier.evidence, "evidence");
  assertUniqueIds(dossier.people, "person", { requiredId: false });

  list(dossier.facts).forEach((item, index) =>
    validateReferencedItem(item, `facts[${index}]`, sourceIds));
  list(dossier.timeline).forEach((item, index) =>
    validateReferencedItem(item, `timeline[${index}]`, sourceIds));
  list(dossier.evidence).forEach((item, index) =>
    validateReferencedItem(item, `evidence[${index}]`, sourceIds));

  for (const [sideKey, side] of [["sideA", dossier.claims?.sideA], ["sideB", dossier.claims?.sideB]]) {
    if (!side) continue;
    validateReferencedItem(side, `claims.${sideKey}`, sourceIds, { requireStatus: false });
    if (side.mode !== undefined && !VALID_CLAIM_MODES.has(side.mode)) {
      throw new Error(`claims.${sideKey}.mode must be quote or paraphrase`);
    }
  }

  if (dossier.collection !== undefined) {
    if (!dossier.collection || typeof dossier.collection !== "object" || Array.isArray(dossier.collection)) {
      throw new Error("collection must be an object");
    }
    if (!VALID_COLLECTION_METHODS.has(dossier.collection.method)) {
      throw new Error(`collection.method must be one of: ${[...VALID_COLLECTION_METHODS].join(", ")}`);
    }
    const cli = dossier.collection.weiboCli;
    if (cli !== undefined) {
      if (!cli || typeof cli !== "object" || Array.isArray(cli)) throw new Error("collection.weiboCli must be an object");
      if (typeof cli.used !== "boolean") throw new Error("collection.weiboCli.used must be boolean");
      if (!Array.isArray(cli.commands) || cli.commands.some((command) => typeof command !== "string" || !command.trim())) {
        throw new Error("collection.weiboCli.commands must be an array of non-empty strings");
      }
      if (!cli.used && cli.commands.length) {
        throw new Error("collection.weiboCli.commands must be empty when used is false");
      }
    }
  }
}

function collectWarnings(dossier) {
  const warnings = [];
  const warnLimit = (label, values, limit) => {
    const count = list(values).length;
    if (count > limit) warnings.push(`${label} has ${count} items; only the first ${limit} are rendered`);
  };
  warnLimit("facts", dossier.facts, 3);
  warnLimit("people", dossier.people, 4);
  warnLimit("timeline", dossier.timeline, 4);
  warnLimit("evidence", dossier.evidence, 4);
  warnLimit("sources", dossier.sources, 8);
  warnLimit("nextWatch", dossier.nextWatch, 4);
  for (const key of VALID_STATUSES) warnLimit(`verdicts.${key}`, dossier.verdicts?.[key], 3);
  if (dossier.sourceImage && list(dossier.sources).length > 4) {
    warnings.push("sourceImage is present but will not be rendered when sources has more than 4 items");
  }
  if (dossier.collection?.weiboCli?.used && !list(dossier.collection.weiboCli.commands).length) {
    warnings.push("collection.weiboCli.used is true but no successful command is recorded");
  }
  return warnings;
}

function createLedger(dossier) {
  const collection = dossier.collection || {};
  const cli = collection.weiboCli || {};
  const collectionBlock = collection.method
    ? `采集方式：${collection.method}\n\n` +
      `weibo-cli：${cli.used ? "已使用" : "未使用"}${list(cli.commands).length ? `（${cli.commands.join("；")}）` : ""}\n\n` +
      `${collection.coverageNote ? `覆盖说明：${collection.coverageNote}\n\n` : ""}`
    : "";
  const rows = list(dossier.evidence).map((item) => {
    const meta = statusMeta(item.status);
    return `| ${item.id || "-"} | ${item.title || "-"} | ${meta.label} | ${list(item.sourceIds).join(", ") || "待补"} |`;
  });
  const timelineRows = list(dossier.timeline).map((item) => {
    const meta = statusMeta(item.status);
    return `| ${item.time || "-"} | ${item.title || "-"} | ${meta.label} | ${list(item.sourceIds).join(", ") || "待补"} |`;
  });
  const sourceRows = list(dossier.sources).map((source) =>
    `| ${source.id || "-"} | ${source.publisher || "-"} | ${source.title || "-"} | ${source.publishedAt || "-"} | ${source.url || "-"} |`,
  );
  return `# ${dossier.title}｜信源台账\n\n` +
    `生成时间：${dossier.generatedAt || "未提供"}\n\n` +
    collectionBlock +
    `> ${dossier.oneLiner}\n\n` +
    `${dossier.demo ? "**注意：本档案为完全虚构的模板演示。**\n\n" : ""}` +
    `## 完整时间线\n\n| 时间 | 节点 | 状态 | 信源 |\n| --- | --- | --- | --- |\n${timelineRows.join("\n")}\n\n` +
    `## 证据分级\n\n| 编号 | 材料 | 状态 | 信源 |\n| --- | --- | --- | --- |\n${rows.join("\n")}\n\n` +
    `## 信源\n\n| ID | 发布者 | 标题 | 发布时间 | 链接 |\n| --- | --- | --- | --- | --- |\n${sourceRows.join("\n")}\n\n` +
    `## 边界\n\n- 公开信息整理不代表司法、监管或事实认定。\n- 未证实内容不得改写为肯定陈述。\n- 发布前应人工复核原文、链接、时间与上下文。\n`;
}

async function readImage(imagePath) {
  if (!imagePath) return null;
  const bytes = await fs.readFile(imagePath);
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
}

async function writeBlob(filePath, blob) {
  await fs.writeFile(filePath, new Uint8Array(await blob.arrayBuffer()));
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const inputPath = path.resolve(required(args.input, "--input"));
  const outputPath = path.resolve(required(args.output, "--output"));
  const ledgerPath = args.ledger ? path.resolve(args.ledger) : null;
  const previewDir = args["preview-dir"] ? path.resolve(args["preview-dir"]) : null;
  const coverPath = args.cover ? path.resolve(args.cover) : null;

  const dossier = JSON.parse(await fs.readFile(inputPath, "utf8"));
  validateDossier(dossier);
  const warnings = collectWarnings(dossier);
  for (const warning of warnings) console.warn(`[chigua-deck warning] ${warning}`);
  const sourceImagePath = args["source-image"]
    ? path.resolve(args["source-image"])
    : dossier.sourceImage
      ? path.resolve(path.dirname(inputPath), dossier.sourceImage)
      : null;

  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  if (ledgerPath) await fs.mkdir(path.dirname(ledgerPath), { recursive: true });
  if (previewDir) await fs.mkdir(previewDir, { recursive: true });

  const presentation = Presentation.create({ slideSize: { width: W, height: H } });
  const coverImage = await readImage(coverPath);
  const sourceImage = await readImage(sourceImagePath);
  addCover(presentation, dossier, coverImage);
  addSummary(presentation, dossier);
  addRelations(presentation, dossier);
  addTimeline(presentation, dossier);
  addClaims(presentation, dossier);
  addEvidence(presentation, dossier);
  addVerdicts(presentation, dossier);
  addNext(presentation, dossier);
  addSources(presentation, dossier, sourceImage);

  if (previewDir) {
    for (const [index, slide] of presentation.slides.items.entries()) {
      const stem = `slide-${String(index + 1).padStart(2, "0")}`;
      await writeBlob(path.join(previewDir, `${stem}.png`), await presentation.export({ slide, format: "png", scale: 1 }));
      const layout = await slide.export({ format: "layout" });
      await fs.writeFile(path.join(previewDir, `${stem}.layout.json`), await layout.text());
    }
    await writeBlob(path.join(previewDir, "deck-montage.webp"), await presentation.export({ format: "webp", montage: true, scale: 1 }));
  }

  const pptx = await PresentationFile.exportPptx(presentation);
  await pptx.save(outputPath);
  if (ledgerPath) await fs.writeFile(ledgerPath, createLedger(dossier), "utf8");

  console.log(JSON.stringify({
    ok: true,
    slides: presentation.slides.items.length,
    output: outputPath,
    ledger: ledgerPath,
    previewDir,
    warnings,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
