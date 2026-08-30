"use client";

import { useRef, useState } from "react";
import { toPng } from "html-to-image";
import {
  demoDossier,
  demoEvidence,
  demoFacts,
  demoTimeline,
  getSources,
  type DemoSource,
} from "./demo-data";

const analysisSteps = [
  "加载虚构信源台账",
  "整理事件节点",
  "比对两方说法",
  "标注证据状态",
  "生成虚构案例档案",
];

export default function Home() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisStep, setAnalysisStep] = useState(0);
  const [hasReport, setHasReport] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [activeSources, setActiveSources] = useState<DemoSource[]>([]);
  const reportRef = useRef<HTMLDivElement>(null);

  const showSources = (sourceIds: string[]) => {
    setActiveSources(getSources(sourceIds));
  };

  const runDemo = async () => {
    if (isAnalyzing) return;
    setHasReport(false);
    setIsAnalyzing(true);
    setAnalysisStep(0);

    for (let i = 0; i < analysisSteps.length; i += 1) {
      setAnalysisStep(i);
      await new Promise((resolve) => setTimeout(resolve, 360));
    }

    setIsAnalyzing(false);
    setHasReport(true);
    window.setTimeout(() => {
      reportRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 120);
  };

  const jumpTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  const exportReport = async () => {
    if (!reportRef.current || isExporting) return;
    setIsExporting(true);
    try {
      const dataUrl = await toPng(reportRef.current, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: "#f3efe6",
      });
      const download = document.createElement("a");
      download.download = "吃瓜神器-虚构案例-事件档案.png";
      download.href = dataUrl;
      download.click();
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <main>
      <header className="topbar">
        <a className="brand" href="#top" aria-label="吃瓜神器首页">
          <span className="brand-mark" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
          <span>吃瓜神器</span>
        </a>
        <div className="topbar-meta">
          <span className="live-dot" />
          <span>微博热点图解引擎</span>
          <span className="beta-pill">VibeLab DEMO</span>
        </div>
      </header>

      <section className="hero" id="top">
        <div className="hero-copy">
          <div className="eyebrow">
            <span>WEIBO STORY INTELLIGENCE</span>
            <span className="eyebrow-line" />
            <span>2026</span>
          </div>
          <h1>
            别刷 200 条微博，
            <br />
            <em>30 秒吃完一个瓜。</em>
          </h1>
          <p className="hero-description">
            这是一个固定虚构案例的产品 Demo，用来展示如何把零散公开信息整理成
            人物、时间线、争议说法与可追溯来源。
          </p>

          <div className="search-shell" aria-describedby="demo-scope-note">
            <div className="search-label">
              <span>固定虚构案例</span>
              <span className="demo-tag">CONCEPT DEMO</span>
            </div>
            <div className="search-row">
              <span className="search-icon" aria-hidden="true">
                ↗
              </span>
              <output className="demo-topic" aria-label="当前虚构案例">
                {demoDossier.topic}
              </output>
              <button
                className="primary-button"
                type="button"
                onClick={runDemo}
                disabled={isAnalyzing}
              >
                {isAnalyzing ? "正在顺藤摸瓜" : "运行固定示例"}
                <span aria-hidden="true">→</span>
              </button>
            </div>
            <div className="sample-row">
              <span>网页不会抓取或分析你输入的真实热点。真实任务请使用开源 Codex Skill。</span>
            </div>
          </div>

          <p className="demo-note" id="demo-scope-note">
            虚构案例：人物、活动、微博与来源全部为产品演示设定，不对应任何真实事件。
          </p>
        </div>

        <aside className="hero-poster" aria-label="产品能力预览">
          <div className="poster-index">NO. 001</div>
          <div className="poster-stamp">正在发酵</div>
          <div className="poster-orbit orbit-one" />
          <div className="poster-orbit orbit-two" />
          <div className="watermelon-core">
            <span className="seed seed-one" />
            <span className="seed seed-two" />
            <span className="seed seed-three" />
            <strong>瓜</strong>
          </div>
          <div className="poster-caption">
            <span>快速吃瓜</span>
            <span>顺藤摸瓜</span>
            <span>有锤看锤</span>
          </div>
          <p>PUBLIC POSTS / TIMELINE / SOURCE TRACE</p>
        </aside>
      </section>

      {isAnalyzing && (
        <section className="analyzing-panel" aria-live="polite">
          <div className="scan-line" />
          <div className="analyzing-title">
            <span className="spinner" />
            <strong>{analysisSteps[analysisStep]}</strong>
          </div>
          <div className="progress-track">
            <span
              style={{
                width: `${((analysisStep + 1) / analysisSteps.length) * 100}%`,
              }}
            />
          </div>
          <div className="analysis-steps">
            {analysisSteps.map((step, index) => (
              <span key={step} className={index <= analysisStep ? "done" : ""}>
                {index < analysisStep ? "✓" : String(index + 1).padStart(2, "0")} {step}
              </span>
            ))}
          </div>
        </section>
      )}

      {hasReport && (
        <section className="report-section" aria-label="吃瓜神器虚构案例档案">
          <div className="report-actions">
            <div className="view-switcher" aria-label="查看模式">
              <button type="button" onClick={() => jumpTo("quick-read")}>
                快速吃瓜
              </button>
              <button type="button" onClick={() => jumpTo("timeline")}>
                顺藤摸瓜
              </button>
              <button type="button" onClick={() => jumpTo("evidence")}>
                有锤看锤
              </button>
            </div>
            <button className="export-button" type="button" onClick={exportReport}>
              {isExporting ? "正在生成长图…" : "导出吃瓜长图 ↓"}
            </button>
          </div>

          {activeSources.length > 0 && (
            <aside
              className="source-detail"
              id="source-details"
              role="dialog"
              aria-modal="false"
              aria-labelledby="source-detail-title"
            >
              <div className="source-detail-heading">
                <div>
                  <span>VIRTUAL SOURCE RECORD</span>
                  <h3 id="source-detail-title">虚构来源详情</h3>
                </div>
                <button
                  type="button"
                  aria-label="关闭虚构来源详情"
                  onClick={() => setActiveSources([])}
                >
                  关闭 ×
                </button>
              </div>
              <p className="source-detail-warning">
                这些 demo:// 条目仅用于演示来源台账的结构，不是真实网页或微博。
              </p>
              <div className="source-detail-grid">
                {activeSources.map((source) => (
                  <article key={source.id}>
                    <span>{source.type}</span>
                    <h4>{source.title}</h4>
                    <p>{source.publisher} · 发布 {source.publishedAt}</p>
                    <code>{source.url}</code>
                  </article>
                ))}
              </div>
            </aside>
          )}

          <div className="report" ref={reportRef}>
            <div className="report-masthead">
              <div>
                <span className="report-kicker">吃瓜神器 · VIRTUAL EVENT FILE 001</span>
                <h2>{demoDossier.title}</h2>
                <p>{demoDossier.subtitle} · 固定虚构案例</p>
              </div>
              <div className="report-status">
                <span>示例生成时间</span>
                <strong>{demoDossier.generatedAt}</strong>
                <em>虚构案例</em>
              </div>
            </div>

            <div className="source-strip">
              <span><b>{demoDossier.sources.length}</b> 条虚构来源</span>
              <span><b>{demoDossier.timeline.length}</b> 个关键节点</span>
              <span><b>2</b> 方公开说法</span>
              <span><b>{demoDossier.people.length}</b> 个参与角色</span>
            </div>

            <section className="quick-read" id="quick-read">
              <div className="section-label">
                <span>PART 01</span>
                <strong>30 秒吃瓜</strong>
              </div>
              <div className="lead-card">
                <div className="lead-number">01</div>
                <div>
                  <span className="tag tag-hot">一句话讲清</span>
                  <h3>{demoDossier.oneLiner}</h3>
                </div>
              </div>

              <div className="truth-grid">
                {demoFacts.map((fact) => (
                  <article className={`truth-card ${fact.cardClass}`} key={fact.text}>
                    <span className="truth-icon">{fact.icon}</span>
                    <span className="truth-label">{fact.label}</span>
                    <strong>{fact.text}</strong>
                    <p>状态：{fact.statusText}</p>
                  </article>
                ))}
              </div>

              <div className="relation-card">
                <div className="relation-copy">
                  <span className="mini-label">人物关系</span>
                  <h3>一张图看懂谁在说什么</h3>
                  <p>实线代表已公开回应，虚线代表网友猜测。</p>
                </div>
                <div className="relation-map" aria-label="事件人物关系图">
                  <div className="person person-a">
                    <span>{demoDossier.claims.sideA.name}</span>
                    <strong>{demoDossier.people[0]?.name}</strong>
                    <small>{demoDossier.claims.sideA.summary}</small>
                  </div>
                  <div className="relation-center">
                    <span>核心争议</span>
                    <strong>为何取消？</strong>
                  </div>
                  <div className="person person-b">
                    <span>{demoDossier.claims.sideB.name}</span>
                    <strong>{demoDossier.people[1]?.name}</strong>
                    <small>{demoDossier.claims.sideB.summary}</small>
                  </div>
                  <div className="connector connector-left">公开声明</div>
                  <div className="connector connector-right">公开回应</div>
                </div>
              </div>
            </section>

            <section className="timeline-section" id="timeline">
              <div className="section-label light">
                <span>PART 02</span>
                <strong>瓜脉时间线</strong>
              </div>
              <div className="timeline-intro">
                <h3>从首次公告到退款方案，关键信息如何演变？</h3>
                <p>按原始发布时间排序，转述内容不改变时间顺序。</p>
              </div>
              <div className="timeline-list">
                {demoTimeline.map((item, index) => (
                  <article className={`timeline-item ${item.tone}`} key={`${item.time}-${item.title}`}>
                    <div className="timeline-time">
                      <span>{item.date}</span>
                      <strong>{item.time}</strong>
                    </div>
                    <div className="timeline-dot">{String(index + 1).padStart(2, "0")}</div>
                    <div className="timeline-content">
                      <span className="timeline-tag">{item.tag}</span>
                      <h4>{item.title}</h4>
                      <p>{item.detail}</p>
                      <button
                        type="button"
                        aria-haspopup="dialog"
                        aria-controls="source-details"
                        aria-label={`查看虚构来源：${item.sourceLabel}`}
                        onClick={() => showSources(item.sourceIds)}
                      >
                        虚构来源：{item.sourceLabel} ↗
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <section className="evidence-section" id="evidence">
              <div className="section-label">
                <span>PART 03</span>
                <strong>有锤看锤</strong>
              </div>
              <div className="evidence-heading">
                <div>
                  <h3>把事实、冲突和传言分开摆</h3>
                  <p>不替任何一方下结论，只标注来源与可验证程度。</p>
                </div>
                <div className="legend">
                  <span><i className="legend-solid" /> 已确认</span>
                  <span><i className="legend-conflict" /> 有冲突</span>
                  <span><i className="legend-open" /> 待验证</span>
                </div>
              </div>
              <div className="evidence-list">
                {demoEvidence.map((item) => (
                  <article className={`evidence-card ${item.evidenceClass}`} key={item.id}>
                    <span className="evidence-index">{item.index}</span>
                    <div>
                      <span className="evidence-type">{item.type}</span>
                      <h4>{item.title}</h4>
                      <p>{item.summary}</p>
                      <button
                        type="button"
                        aria-haspopup="dialog"
                        aria-controls="source-details"
                        aria-label={`查看虚构来源：${item.sourceLabel}`}
                        onClick={() => showSources(item.sourceIds)}
                      >
                        {item.sourceLabel} ↗
                      </button>
                    </div>
                    <span className="evidence-seal">{item.seal}</span>
                  </article>
                ))}
              </div>
            </section>

            <footer className="report-footer">
              <div className="footer-brand">
                <span className="mini-watermelon" />
                <strong>吃瓜神器</strong>
              </div>
              <p>
                本页由固定结构化样例渲染。人物、活动、内容与 demo:// 来源均为虚构设定，
                不对应任何真实事件。
              </p>
              <div className="footer-code">CASE / 2026-0808-001</div>
            </footer>
          </div>
        </section>
      )}

      <section className="principles">
        <div className="principles-heading">
          <span>OUR RULES</span>
          <h2>好玩，但不瞎编。</h2>
        </div>
        <div className="principle-list">
          <article>
            <span>01</span>
            <strong>原博可追溯</strong>
            <p>每个关键说法都保留发布者、时间与原始链接。</p>
          </article>
          <article>
            <span>02</span>
            <strong>事实分层</strong>
            <p>当事人确认、媒体报道、网友爆料绝不混为一谈。</p>
          </article>
          <article>
            <span>03</span>
            <strong>不生成伪证</strong>
            <p>不用 AI 补画现场、伪造聊天记录或杜撰人物发言。</p>
          </article>
        </div>
      </section>

      <footer className="site-footer">
        <span>吃瓜神器 / CHIGUA LENS</span>
        <span>#微博VibeLab# · #VibeSocial# · #weibo-cli#</span>
        <span>MADE FOR WEIBO · 2026</span>
      </footer>
    </main>
  );
}
