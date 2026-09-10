# CyberRisk AI — SIH26105

**AI-Powered Continuous Cyber Risk Quantification and Investment Optimization Platform**

A pure front-end prototype, built for an Indian enterprise audience
---

## Problem Statement

Security teams struggle to answer a simple but critical question:

> "If we have a fixed cybersecurity budget, which security investments will reduce the most estimated financial risk?"

Most tools either stop at qualitative risk labels ("High / Medium / Low") or require expensive, backend-heavy GRC platforms to get financial risk numbers. **CyberRisk AI** demonstrates an explainable, end-to-end workflow — from raw asset data to a plain-English risk explanation and a budget-constrained investment recommendation — using nothing but the browser.

All financial figures produced by this prototype are **synthetic Prototype Estimates**, shown in Indian Rupees (₹) and clearly labeled throughout the UI. They are not real regulatory penalties, audited losses, or a compliance certification — see the disclaimer on the Framework Mapping panel.

---

## Features

- **Dashboard** — Expected Annual Loss, financial exposure, assets needing attention, recommended investment, estimated risk reduction, and ROSI, all calculated live from the underlying data, with a short plain-English summary of where the risk is concentrated.
- **Asset Risk** — 10 sample assets from fictional Indian organizations (a payments company, a bank, a hospital network, a retailer, and more), fully editable in the browser (add, edit, delete, reset), automatically saved to `localStorage`. Every risk column, including a Low/Moderate/High/Critical risk level, recalculates instantly.
- **Investment** — Tick individual investments to compare them directly (checkboxes update totals, remaining budget and ROSI live), or click "Optimize Budget" to let a 0/1 knapsack algorithm recommend the best combination for your budget.
- **Risk Analyst** — A rule-based (no API key, fully offline) chat assistant that answers cyber-risk questions using only numbers already produced by the risk engine — it never invents a financial figure.
- **Scenario Simulator** — Simulate implementing MFA, patching critical vulnerabilities, network segmentation, improving backups, or delaying remediation by 30 days, and see the current vs projected Expected Annual Loss.
- **Framework Mapping** — A small "prototype mapping" table linking common risk themes to ISO/IEC 27001, NIST CSF, CIS Controls, and the RBI and SEBI cybersecurity frameworks, for context — not a compliance claim.
- **Charts** (Chart.js) — Risk by Asset, Financial Exposure Distribution, Investment vs Risk Reduction, and Current vs Projected Risk, all with rupee-formatted tooltips.
- **Indian currency formatting** — every rupee figure uses the lakh/crore grouping (e.g. ₹12,50,000), never `$`, via a single `formatINR()` function.
- **Data persistence** — Asset edits, your investment selection, and your budget are all saved with `localStorage`, so they survive a page refresh. "Reset Demo Data" restores the original sample data at any time.

---

## Technology Used

- HTML5
- CSS3 (vanilla, no framework)
- Vanilla JavaScript (ES6+, no modules/bundlers)
- [Chart.js](https://www.chartjs.org/) via CDN (`<script>` tag only)
- Browser `localStorage` for persistence

No Node.js, Express, React, Angular, Vue, Python, PHP, MySQL, MongoDB, Firebase, Docker, backend servers, API keys, build tools, npm, or any other package manager are used or required.

---

## Project Structure

```
cyberrisk-ai/
│
├── index.html            # Page structure, all UI sections, modal, script tags
├── style.css              # Dark-blue & white dashboard theme
├── app.js                 # UI wiring / integration (renders data into the DOM)
├── data.js                # Sample data (Indian assets/vulnerabilities/investments), formatINR(), localStorage CRUD
├── riskEngine.js           # Core risk formulas + risk-level classification — the single source of truth
├── optimizer.js            # 0/1 knapsack budget optimizer, manual-selection evaluator, ROSI
├── aiAnalyst.js             # Rule-based natural-language risk explanations
├── scenarioSimulator.js     # "What-if" scenario engine (reuses riskEngine.js)
└── README.md
```

## Limitations

- All organizations, assets and financial figures are **fictional**, created for demonstration purposes — they do not represent real companies, and the numbers are not real regulatory penalties or audited losses.
- The risk model is intentionally simple and explainable (linear weighted formulas) rather than a statistically calibrated actuarial model.
- The Risk Analyst is rule-based (keyword/intent matching), not a large language model — it can only answer the categories of questions it was designed for.
- The 0/1 knapsack optimizer assumes investments are independent (no synergy or conflict between controls) and binary (fully implemented or not at all).
- The Framework Mapping panel is an illustrative "prototype mapping" only — it is **not** a compliance certification and does not assert conformance with RBI, SEBI, CERT-In, ISO/IEC 27001, NIST CSF or CIS Controls requirements.
- Data persistence is local to one browser (`localStorage`) — it is not shared across devices or users, and clearing browser data will remove it (use "Reset Demo Data" to restore the defaults at any time).
- No authentication, multi-user support, or audit logging is included, since this is a single-user, offline-capable prototype.

---

## Future Scope

- Replace the rule-based Risk Analyst with an LLM-powered assistant (with an optional, user-supplied API key) for open-ended questions.
- Support CSV/Excel import of real asset inventories and vulnerability scan results.
- Add Monte Carlo simulation for probabilistic (rather than point-estimate) financial risk ranges.
- Model interaction effects between investments (e.g. diminishing returns when multiple controls overlap).
- Multi-user accounts with a real backend and database for enterprise deployment, including SOC/CISO role-based views.
- Exportable PDF/Excel executive reports generated directly from dashboard data.
- Deeper, evidence-based mapping to RBI, SEBI and CERT-In requirements, reviewed by a compliance specialist.

---
