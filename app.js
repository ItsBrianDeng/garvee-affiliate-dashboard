(function () {
  const data = window.PUBLIC_AFFILIATE_DATA;
  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => [...document.querySelectorAll(selector)];
  const esc = (value) => String(value ?? "").replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character]);
  const parse = (value) => new Date(`${value}T00:00:00Z`);
  const iso = (date) => date.toISOString().slice(0, 10);
  const addDays = (value, amount) => { const date = parse(value); date.setUTCDate(date.getUTCDate() + amount); return iso(date); };
  const days = (start, end) => Math.round((parse(end) - parse(start)) / 86400000) + 1;
  const pct = (current, previous) => previous ? (current - previous) / previous : null;
  const money = (value) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", notation: value >= 1000000 ? "compact" : "standard", maximumFractionDigits: value >= 1000 ? 0 : 1 }).format(value || 0);
  const integer = (value) => new Intl.NumberFormat("en-US").format(Math.round(value || 0));
  const percent = (value, signed = false) => value == null ? "—" : `${signed && value > 0 ? "+" : ""}${(value * 100).toFixed(1)}%`;
  const ratio = (value) => value == null ? "—" : `${value.toFixed(2)}x`;
  const dateLabel = (value) => new Intl.DateTimeFormat("zh-CN", { month: "short", day: "numeric", timeZone: "UTC" }).format(parse(value));
  let state = { dimension: "platform", result: null, baseline: null };

  function summarize(rows) {
    const totals = rows.reduce((sum, row) => ({ gmv: sum.gmv + row.gmv, orders: sum.orders + row.orders, cost: sum.cost + row.cost, sessions: sum.sessions + row.sessions }), { gmv: 0, orders: 0, cost: 0, sessions: 0 });
    return { ...totals, roas: totals.cost ? totals.gmv / totals.cost : null, aov: totals.orders ? totals.gmv / totals.orders : null, cr: totals.sessions ? totals.orders / totals.sessions : null, newRate: .32 };
  }
  function settings() {
    return { start: $("#startDate").value, end: $("#endDate").value, model: $("#modelFilter").value, market: $("#marketFilter").value, platform: $("#platformFilter").value, category: $("#drillCategory").value, type: $("#drillType").value, publisherId: $("#drillPublisher").value };
  }
  function select(config, start, end) {
    const allowed = new Set(data.partners.filter((partner) => (config.market === "All" || partner.market === config.market) && (config.platform === "All" || partner.platform === config.platform) && (config.type === "All" || partner.type === config.type) && (config.publisherId === "All" || partner.id === config.publisherId)).map((partner) => partner.id));
    return data.daily.filter((row) => row.model === config.model && row.date >= start && row.date <= end && allowed.has(row.publisherId) && (config.category === "All" || row.category === config.category));
  }
  function group(rows, previousRows, dimension) {
    const partnerMap = Object.fromEntries(data.partners.map((partner) => [partner.id, partner]));
    const keyOf = (row) => dimension === "publisher" ? row.publisherId : dimension === "category" ? row.category : partnerMap[row.publisherId][dimension];
    const keys = new Set([...rows, ...previousRows].map(keyOf));
    return [...keys].map((key) => {
      const current = summarize(rows.filter((row) => keyOf(row) === key));
      const previous = summarize(previousRows.filter((row) => keyOf(row) === key));
      const partner = dimension === "publisher" ? partnerMap[key] : null;
      return { key, label: partner?.name || key, meta: partner ? `${partner.platform} · ${partner.type}` : "", current, previous, delta: current.gmv - previous.gmv, change: pct(current.gmv, previous.gmv), reason: partner?.signal || "模拟组合变化" };
    }).sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
  }
  function compare(config) {
    const length = days(config.start, config.end);
    const priorEnd = addDays(config.start, -1);
    const priorStart = addDays(priorEnd, 1 - length);
    const currentRows = select(config, config.start, config.end);
    const previousRows = select(config, priorStart, priorEnd);
    const current = summarize(currentRows); const previous = summarize(previousRows);
    const metrics = ["gmv", "orders", "cost", "roas", "aov", "cr", "newRate"].map((key) => ({ key, current: current[key], previous: previous[key], change: pct(current[key], previous[key]) }));
    const trend = (rows, start) => Array.from({ length }, (_, index) => summarize(rows.filter((row) => row.date === addDays(start, index))).gmv);
    return { config, prior: { start: priorStart, end: priorEnd }, currentRows, previousRows, current, previous, metrics, drivers: { platform: group(currentRows, previousRows, "platform"), publisher: group(currentRows, previousRows, "publisher"), type: group(currentRows, previousRows, "type"), category: group(currentRows, previousRows, "category") }, trend: { current: trend(currentRows, config.start), previous: trend(previousRows, priorStart) } };
  }
  function renderRelease() {
    $("#releaseCopy").textContent = "该站点仅展示匿名模拟数据、产品布局和交互能力；不连接任何数据库，也不包含正式联盟客、员工、联系方式或经营结论。";
    $("#releaseQaScope").textContent = "Public demonstration · Anonymous publishers · Deterministic sample data";
    $("#releaseGateBadge").textContent = "公开演示版";
    $("#releaseMetrics").innerHTML = [["正式业务数据", "0", "未加载"], ["真实联盟客", "0", "全部匿名"], ["真实联系方式", "0", "全部为示例域名"], ["数据库连接", "关闭", "纯静态页面"], ["订单明细", "0", "从不展示"], ["用途", "Demo", "界面与交互演示"]].map((item) => `<article><span>${item[0]}</span><strong>${item[1]}</strong><small>${item[2]}</small></article>`).join("");
    $("#releaseBoundary").textContent = "可以公开浏览、筛选和导出；所有数字及判断均为模拟内容，不应用于经营决策。正式业务版保留在私有系统。";
    $$(".metric-source-badge").forEach((badge) => { badge.textContent = "匿名演示"; });
  }
  function renderHero(result) {
    const change = pct(result.current.gmv, result.previous.gmv); const top = result.drivers.publisher[0];
    $("#heroTitle").textContent = `${dateLabel(result.config.start)} – ${dateLabel(result.config.end)}：匿名组合 GMV ${change >= 0 ? "增长" : "回落"} ${percent(Math.abs(change || 0))}`;
    $("#heroNarrative").textContent = `公开演示数据：本期 GMV ${money(result.current.gmv)}，订单 ${integer(result.current.orders)}。${top ? `${top.label}呈现最大模拟变化。` : "当前范围暂无变化。"}`;
    $("#heroTags").innerHTML = `<span>${result.config.model === "u" ? "U 型归因" : "Last Click"}</span><span>ROAS ${ratio(result.current.roas)}</span><span>${result.config.market === "All" ? "全市场" : result.config.market}</span><span>匿名数据</span>`;
    $("#decisionTitle").textContent = "演示建议 · 聚焦结构变化";
    $("#decisionCopy").textContent = top ? `${top.label}在当前组合中变化最明显；正式系统上线后可沿相同路径定位真实驱动。` : "调整筛选条件以查看不同组合。";
  }
  function renderKpis(result) {
    const meta = { gmv: ["GMV", money], orders: ["订单", integer], cost: ["联盟成本", money], roas: ["ROAS", ratio], aov: ["客单价", money], cr: ["转化率", percent], newRate: ["新客率", percent] };
    $("#kpiGrid").innerHTML = result.metrics.map((metric) => { const [label, formatter] = meta[metric.key]; return `<article class="kpi-card"><span>${label}</span><div class="kpi-value">${formatter(metric.current)}</div><b class="delta ${(metric.change || 0) >= 0 ? "up" : "down"}">${percent(metric.change, true)}</b><small>vs ${formatter(metric.previous)}</small></article>`; }).join("");
  }
  function drawTrend(result) {
    const canvas = $("#trendCanvas"); const dpr = window.devicePixelRatio || 1; const width = Math.max(600, canvas.getBoundingClientRect().width); const height = 260; canvas.width = width * dpr; canvas.height = height * dpr;
    const ctx = canvas.getContext("2d"); ctx.scale(dpr, dpr); const pad = { l: 42, r: 16, t: 15, b: 30 }; const maximum = Math.max(...result.trend.current, ...result.trend.previous, 1) * 1.1;
    ctx.clearRect(0, 0, width, height); ctx.font = "10px sans-serif"; ctx.fillStyle = "#8493a2"; ctx.strokeStyle = "#e3ebf1";
    for (let i = 0; i <= 4; i += 1) { const y = pad.t + (height - pad.t - pad.b) * i / 4; ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(width - pad.r, y); ctx.stroke(); ctx.fillText(money(maximum * (1 - i / 4)), 0, y + 3); }
    const plot = (values, color, dashed) => { ctx.beginPath(); ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.setLineDash(dashed ? [5, 5] : []); values.forEach((value, index) => { const x = pad.l + (width - pad.l - pad.r) * index / Math.max(values.length - 1, 1); const y = pad.t + (height - pad.t - pad.b) * (1 - value / maximum); index ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }); ctx.stroke(); ctx.setLineDash([]); };
    plot(result.trend.previous, "#a9bac8", true); plot(result.trend.current, "#1d8fbf", false);
    $("#trendSubtitle").textContent = `${days(result.config.start, result.config.end)} 天按周期第 N 天对齐。`;
  }
  function renderDrivers(result) {
    const rows = result.drivers[state.dimension];
    $("#anomalyGrid").innerHTML = result.drivers.publisher.slice(0, 4).map((item) => `<article class="anomaly-card ${item.delta < 0 ? "risk" : ""}"><b class="delta ${item.delta >= 0 ? "up" : "down"}">${percent(item.change, true)}</b><strong>${esc(item.label)}</strong><p>${esc(item.reason)} · 匿名演示信号</p></article>`).join("");
    const totalDelta = Math.abs(result.current.gmv - result.previous.gmv) || 1;
    $("#driverTable").innerHTML = rows.slice(0, 10).map((item) => `<tr><td><strong>${esc(item.label)}</strong><small>${esc(item.meta)}</small></td><td>${money(item.current.gmv)}</td><td>${money(item.previous.gmv)}</td><td><b class="delta ${item.delta >= 0 ? "up" : "down"}">${money(item.delta)} · ${percent(item.change, true)}</b></td><td><div class="contribution"><i style="width:${Math.min(100, Math.abs(item.delta) / totalDelta * 100)}%"></i></div></td><td>${esc(item.reason)}</td></tr>`).join("");
  }
  function renderDrill(result) {
    const partner = data.partners.find((item) => item.id === result.config.publisherId); const count = new Set(result.currentRows.map((row) => row.publisherId)).size; const share = state.baseline.current.gmv ? result.current.gmv / state.baseline.current.gmv : null;
    $("#drillPath").textContent = [result.config.category === "All" ? "全部品类" : result.config.category, result.config.type === "All" ? "全部类型" : result.config.type, partner?.name || "全部联盟客"].join("  /  ");
    $("#drillSummary").innerHTML = [["下探 GMV", money(result.current.gmv), percent(pct(result.current.gmv, result.previous.gmv), true), "vs 前序周期"], ["整体 GMV 占比", percent(share), money(state.baseline.current.gmv), "当前基线"], ["涉及联盟客", integer(count), "匿名档案", "有模拟成交"], ["下探 ROAS", ratio(result.current.roas), percent(pct(result.current.roas, result.previous.roas), true), "GMV / 成本"]].map((item) => `<article class="kpi-card"><span>${item[0]}</span><div class="kpi-value">${item[1]}</div><b class="delta">${item[2]}</b><small>${item[3]}</small></article>`).join("");
    $("#drillCount").textContent = `${count} 个联盟客`; $("#drillTableTitle").textContent = result.config.type === "All" ? "联盟客表现明细" : `${result.config.type} 类型下全部联盟客`; $("#drillTableSubtitle").textContent = `${dateLabel(result.config.start)} – ${dateLabel(result.config.end)} · 匿名演示`;
    $("#drillTable").innerHTML = result.drivers.publisher.map((item) => { const profile = data.partners.find((entry) => entry.id === item.key); return `<tr><td><strong>${esc(item.label)}</strong><small>${profile.platform} · ${profile.market}</small></td><td>${esc(profile.type)}</td><td><span class="category-chip">模拟组合</span></td><td>${esc(profile.owner)}</td><td>${money(item.current.gmv)}</td><td>${integer(item.current.orders)}</td><td>${money(item.current.cost)}</td><td>${ratio(item.current.roas)}</td><td>${percent(item.current.cr)}</td><td><b class="delta ${item.delta >= 0 ? "up" : "down"}">${percent(item.change, true)}</b></td><td>${esc(item.reason)}</td></tr>`; }).join("") || '<tr><td colspan="11">当前组合暂无演示数据。</td></tr>';
  }
  function renderPublishers(result) {
    const query = $("#publisherSearch").value.trim().toLowerCase(); const type = $("#typeFilter").value; const owner = $("#publisherOwnerFilter").value; const status = $("#statusFilter").value; const contact = $("#contactFilter").value; const performance = new Map(result.drivers.publisher.map((item) => [item.key, item]));
    const scoped = data.partners.filter((partner) => (result.config.platform === "All" || partner.platform === result.config.platform) && (result.config.market === "All" || partner.market === result.config.market));
    const rows = scoped.filter((partner) => (!query || `${partner.name} ${partner.campaignId}`.toLowerCase().includes(query)) && (type === "全部类型" || partner.type === type) && (owner === "全部负责人" || partner.owner === owner) && (status === "全部状态" || partner.status === status) && contact !== "Missing");
    $("#publisherSummary").innerHTML = [["联盟客总数", scoped.length, "匿名演示范围"], ["Active", scoped.filter((p) => p.status === "Active").length, "模拟状态"], ["Paused / Sleep", `${scoped.filter((p) => p.status === "Paused").length} / ${scoped.filter((p) => p.status === "Sleep").length}`, "模拟状态"], ["演示信号", scoped.length, "非正式风险判断"], ["真实联系方式", 0, "仅示例域名"]].map((item) => `<article class="kpi-card"><span>${item[0]}</span><div class="kpi-value">${item[1]}</div><small>${item[2]}</small></article>`).join("");
    $("#publisherTable").innerHTML = rows.map((partner) => { const item = performance.get(partner.id); return `<tr><td><strong>${partner.name}</strong><small>#${partner.campaignId} · Demo</small></td><td><span class="contact-missing">${partner.contact}</span></td><td>${partner.platform}<small>${partner.market}</small></td><td>${partner.type}</td><td>${partner.owner}</td><td><span class="pill ${partner.status.toLowerCase()}">${partner.status}</span></td><td>${item ? money(item.current.gmv) : "—"}</td><td>—</td><td><b class="delta ${item?.delta >= 0 ? "up" : "down"}">${item ? percent(item.change, true) : "—"}</b></td><td>${item ? integer(item.current.orders) : "—"}</td><td>${item ? ratio(item.current.roas) : "—"}</td><td>—</td><td>32.0%</td><td>—</td><td><div class="funnel-mini"><strong>公开版隐藏</strong><small>内部版可用</small></div></td><td><span class="risk-tag low">${partner.signal}</span></td><td><span class="local-badge">Demo</span></td></tr>`; }).join("");
    $("#publisherResultCount").textContent = `已显示 ${rows.length} / ${rows.length} 条 · 全部为匿名演示档案`; $("#loadMorePublishers").hidden = true;
  }
  function renderPortfolio(result) {
    const total = result.current.gmv || 1;
    $("#typeBars").innerHTML = result.drivers.type.map((item) => `<div class="bar-row"><span>${esc(item.label)}</span><div class="bar-track"><i style="width:${item.current.gmv / total * 100}%"></i></div><strong>${percent(item.current.gmv / total)}</strong></div>`).join("");
    $("#categoryBars").innerHTML = result.drivers.category.map((item) => `<div class="bar-row"><span>${esc(item.label)}</span><div class="bar-track"><i style="width:${item.current.gmv / total * 100}%"></i></div><strong class="${item.delta >= 0 ? "delta up" : "delta down"}">${percent(item.change, true)}</strong></div>`).join("");
    $("#activityTimeline").innerHTML = data.activities.map((item) => `<article class="timeline-item"><span>${item.status} · ${item.uplift}</span><strong>${item.name}</strong><small>${dateLabel(item.start)} – ${dateLabel(item.end)}</small></article>`).join("");
  }
  function renderOversight(result) {
    const top = result.drivers.publisher[0]; const weak = result.drivers.publisher.find((item) => item.delta < 0);
    $("#oversightGrid").innerHTML = [["演示边界", "公开匿名数据", "不连接数据库，不包含正式经营结论"], ["模拟机会", top ? `关注 ${top.label}` : "保持观察", top?.reason || "无集中变化"], ["模拟关注", weak ? `观察 ${weak.label}` : "暂无变化", weak?.reason || "当前组合稳定"], ["正式动作", "进入私有业务版", "真实数据、联系人和规则仅在授权环境使用"]].map((card) => `<article class="oversight-card"><span>${card[0]}</span><strong>${card[1]}</strong><p>${card[2]}</p></article>`).join("");
    $("#responsibilityGrid").innerHTML = [["Awin", "US · CA", "Awin 运营"], ["CJ", "US · CA", "CJ 运营"], ["Impact", "US", "Impact 运营"]].map((item) => `<article class="responsibility-card"><header><strong>${item[0]}</strong><span>演示角色</span></header><dl><div><dt>站点</dt><dd>${item[1]}</dd></div><div><dt>运营</dt><dd>${item[2]}</dd></div></dl></article>`).join("");
    $("#governanceModel").textContent = `${result.config.model === "u" ? "U 型归因" : "Last Click"} · Demo`; $("#mappingCoverage").textContent = "不展示正式映射"; $("#costCoverage").textContent = "匿名模拟"; $("#timezone").textContent = data.meta.timezone;
  }
  function render() { const result = state.result; renderRelease(); renderHero(result); renderKpis(result); drawTrend(result); renderDrivers(result); renderDrill(result); renderPublishers(result); renderPortfolio(result); renderOversight(result); }
  function apply() {
    const config = settings(); if (!config.start || !config.end || config.start > config.end) return;
    state.baseline = compare({ ...config, category: "All", type: "All", publisherId: "All" }); state.result = compare(config); $("#priorLabel").textContent = `${dateLabel(state.result.prior.start)} – ${dateLabel(state.result.prior.end)}`; render();
  }
  function refreshPublishers() {
    const current = $("#drillPublisher").value || "All"; const list = data.partners.filter((partner) => ($("#drillType").value === "All" || partner.type === $("#drillType").value) && ($("#platformFilter").value === "All" || partner.platform === $("#platformFilter").value) && ($("#marketFilter").value === "All" || partner.market === $("#marketFilter").value));
    $("#drillPublisher").innerHTML = '<option value="All">全部联盟客</option>' + list.map((partner) => `<option value="${partner.id}">${partner.name} · ${partner.platform}/${partner.market}</option>`).join(""); $("#drillPublisher").value = list.some((partner) => partner.id === current) ? current : "All";
  }
  function init() {
    $("#startDate").min = $("#endDate").min = data.meta.minDate; $("#startDate").max = $("#endDate").max = data.meta.maxDate; $("#startDate").value = addDays(data.meta.maxDate, -13); $("#endDate").value = data.meta.maxDate; $("#generatedAt").textContent = data.meta.generatedAt; $("#publisherDataBadge").textContent = "8 条匿名演示档案"; $("#dataStatus").textContent = "公开脱敏演示";
    const types = [...new Set(data.partners.map((partner) => partner.type))].sort(); const owners = [...new Set(data.partners.map((partner) => partner.owner))].sort(); $("#typeFilter").innerHTML += types.map((type) => `<option>${type}</option>`).join(""); $("#publisherOwnerFilter").innerHTML += owners.map((owner) => `<option>${owner}</option>`).join(""); $("#drillType").innerHTML += types.map((type) => `<option value="${type}">${type}</option>`).join(""); $("#drillCategory").innerHTML += data.categories.map((category) => `<option value="${category}">${category}</option>`).join(""); refreshPublishers();
    $("#applyBtn").addEventListener("click", apply); $("#drillApplyBtn").addEventListener("click", apply); $("#drillResetBtn").addEventListener("click", () => { $("#drillCategory").value = "All"; $("#drillType").value = "All"; refreshPublishers(); apply(); }); $("#drillType").addEventListener("change", refreshPublishers); $("#platformFilter").addEventListener("change", refreshPublishers); $("#marketFilter").addEventListener("change", refreshPublishers);
    ["#publisherSearch", "#typeFilter", "#publisherOwnerFilter", "#statusFilter", "#contactFilter", "#riskFilter"].forEach((selector) => $(selector).addEventListener(selector === "#publisherSearch" ? "input" : "change", () => renderPublishers(state.result)));
    $("#presets").addEventListener("click", (event) => { const button = event.target.closest("button"); if (!button) return; $$("#presets button").forEach((item) => item.classList.toggle("active", item === button)); $("#endDate").value = data.meta.maxDate; $("#startDate").value = addDays(data.meta.maxDate, 1 - Number(button.dataset.days)); apply(); });
    $("#driverTabs").addEventListener("click", (event) => { const button = event.target.closest("button"); if (!button) return; state.dimension = button.dataset.dimension; $$("#driverTabs button").forEach((item) => item.classList.toggle("active", item === button)); renderDrivers(state.result); });
    $$('[data-scroll]').forEach((button) => button.addEventListener("click", () => document.getElementById(button.dataset.scroll).scrollIntoView())); $("#exportBtn").addEventListener("click", () => window.print()); window.addEventListener("resize", () => state.result && drawTrend(state.result));
    const observer = new IntersectionObserver((entries) => entries.forEach((entry) => { if (entry.isIntersecting) $$('nav a').forEach((link) => link.classList.toggle("active", link.getAttribute("href") === `#${entry.target.id}`)); }), { rootMargin: "-35% 0px -55%" }); $$('main section[id]').forEach((section) => observer.observe(section)); apply();
  }
  init();
})();
