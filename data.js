(function () {
  const partners = [
    { id: "awin-a", campaignId: "DEMO-101", name: "Publisher A", platform: "Awin", type: "Content / SEO", market: "US", owner: "Awin 运营", status: "Active", contact: "contact@publisher-a.example", base: 9200, aov: 235, rate: .078, lc: .91, signal: "内容贡献提升" },
    { id: "awin-b", campaignId: "DEMO-102", name: "Publisher B", platform: "Awin", type: "Coupon / Deal", market: "CA", owner: "Awin 运营", status: "Paused", contact: "contact@publisher-b.example", base: 4800, aov: 198, rate: .068, lc: 1.07, signal: "近期变化待观察" },
    { id: "impact-c", campaignId: "DEMO-201", name: "Publisher C", platform: "Impact", type: "Loyalty / Rewards", market: "US", owner: "Impact 运营", status: "Active", contact: "contact@publisher-c.example", base: 11200, aov: 246, rate: .082, lc: .88, signal: "规模贡献稳定" },
    { id: "impact-d", campaignId: "DEMO-202", name: "Publisher D", platform: "Impact", type: "Review", market: "US", owner: "Impact 运营", status: "Active", contact: "contact@publisher-d.example", base: 6100, aov: 272, rate: .093, lc: .76, signal: "上游价值突出" },
    { id: "cj-e", campaignId: "DEMO-301", name: "Publisher E", platform: "CJ", type: "Cashback", market: "US", owner: "CJ 运营", status: "Active", contact: "contact@publisher-e.example", base: 10300, aov: 229, rate: .087, lc: .95, signal: "活动期增长" },
    { id: "cj-f", campaignId: "DEMO-302", name: "Publisher F", platform: "CJ", type: "Sub-network", market: "CA", owner: "CJ 运营", status: "Sleep", contact: "contact@publisher-f.example", base: 3500, aov: 214, rate: .081, lc: .83, signal: "长期未产生新贡献" },
    { id: "awin-g", campaignId: "DEMO-103", name: "Publisher G", platform: "Awin", type: "Technology", market: "US", owner: "Awin 运营", status: "Active", contact: "contact@publisher-g.example", base: 7600, aov: 220, rate: .073, lc: 1.03, signal: "效率表现良好" },
    { id: "impact-h", campaignId: "DEMO-203", name: "Publisher H", platform: "Impact", type: "Content / SEO", market: "US", owner: "Impact 运营", status: "Active", contact: "contact@publisher-h.example", base: 5700, aov: 258, rate: .089, lc: .79, signal: "新客贡献提升" }
  ];
  const categories = ["Home & Garden", "Tools", "Furniture", "Outdoor", "Other"];
  const daily = [];
  const start = new Date("2026-06-01T00:00:00Z");
  const end = new Date("2026-08-23T00:00:00Z");
  for (let cursor = new Date(start), day = 0; cursor <= end; cursor.setUTCDate(cursor.getUTCDate() + 1), day += 1) {
    const date = cursor.toISOString().slice(0, 10);
    partners.forEach((partner, index) => {
      const weekend = [0, 6].includes(cursor.getUTCDay()) ? .86 : 1;
      const event = date >= "2026-08-10" ? (1.04 + (index % 3) * .06) : 1;
      const softening = partner.id === "awin-b" && date >= "2026-08-17" ? .18 : 1;
      const sleeping = partner.id === "cj-f" && date >= "2026-07-25" ? 0 : 1;
      const wave = .94 + ((day * 5 + index * 7) % 14) / 100;
      ["u", "lc"].forEach((model) => {
        const gmv = Math.round(partner.base * weekend * event * softening * sleeping * wave * (model === "lc" ? partner.lc : 1));
        const orders = gmv ? Math.max(1, Math.round(gmv / partner.aov)) : 0;
        const cost = Math.round(gmv * partner.rate);
        categories.forEach((category, categoryIndex) => {
          const weights = [.31, .24, .18, .16, .11];
          daily.push({ date, publisherId: partner.id, model, category, gmv: Math.round(gmv * weights[categoryIndex]), orders: Math.round(orders * weights[categoryIndex]), cost: Math.round(cost * weights[categoryIndex]), sessions: Math.round((orders * 34 + index * 11) * weights[categoryIndex]) });
        });
      });
    });
  }
  window.PUBLIC_AFFILIATE_DATA = {
    meta: { minDate: "2026-06-01", maxDate: "2026-08-23", timezone: "America/Los_Angeles", generatedAt: "Anonymous demo · 2026-08-26" },
    partners, categories, daily,
    activities: [
      { name: "Seasonal Promotion", start: "2026-07-06", end: "2026-07-12", status: "Completed", uplift: "+18%" },
      { name: "Category Growth Week", start: "2026-07-27", end: "2026-08-02", status: "Completed", uplift: "+11%" },
      { name: "Back-to-School Demo", start: "2026-08-10", end: "2026-08-23", status: "Live", uplift: "+14%" }
    ]
  };
})();
