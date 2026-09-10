/* 
   FILE: app.js
   PURPOSE:
   This is the "glue" file. It does NOT contain any risk,
   optimization, simulation, or AI logic itself — it only:
     1. Reads data using data.js / riskEngine.js / optimizer.js /
        scenarioSimulator.js / aiAnalyst.js function calls.
     2. Renders that data into the DOM (cards, tables, charts),
        formatting every rupee figure with formatINR() from data.js.
     3. Wires up buttons, forms, checkboxes and the chat box to
        those same functions.
 */
/*  GLOBAL APP STATE */
const chartInstances = {}; // keeps references so we can destroy/recreate charts
let currentBudget = loadBudget(); // persisted in localStorage, defaults to ₹10,00,000
let selectedInvestmentIds = new Set(); // investments the user has ticked on the Investment page

/*  INITIALIZATION */
document.addEventListener("DOMContentLoaded", function () {
  // Make sure sample data exists on first-ever visit
  loadAssets();
  loadVulnerabilities();
  loadInvestments();

  initInvestmentSelection();

  document.getElementById("budgetInput").value = currentBudget;

  setupNavigation();
  setupAssetTableToolbar();
  setupAssetModal();
  setupOptimizer();
  setupChat();
  setupScenarioSimulator();
  setupResetButton();

  renderEverything();
});


function initInvestmentSelection() {
  const hasSavedSelection = localStorage.getItem(STORAGE_KEYS.SELECTED_INVESTMENTS) !== null;

  if (hasSavedSelection) {
    selectedInvestmentIds = new Set(loadSelectedInvestmentIds());
  } else {
    const recommendation = runOptimization(currentBudget); // optimizer.js
    selectedInvestmentIds = new Set(recommendation.selectedInvestments.map(inv => inv.id));
    persistSelection();
  }
}

function persistSelection() {
  saveSelectedInvestmentIds(Array.from(selectedInvestmentIds));
}

function renderEverything() {
  // Each section is rendered independently so that an unexpected error
  // in one never prevents the others
  // from showing up — important during a live demo.
  safeRun(renderDashboard);
  safeRun(renderAssetTable);
  safeRun(renderComplianceTable);
  safeRun(renderInvestmentSection);
  safeRun(renderScenarioCards);
}

function safeRun(fn) {
  try {
    fn();
  } catch (err) {
    console.error("Render step failed:", err);
  }
}

/**
 Returns the current investment evaluation (totals + ROSI) based on
 whatever the user has ticked on the Investment page, at the current
 budget. Both the Dashboard and the Investment page read from this
 single function so their numbers never disagree.
 */
function getCurrentInvestmentEvaluation() {
  const investments = loadInvestments();
  return evaluateInvestmentSelection(Array.from(selectedInvestmentIds), investments, currentBudget); // optimizer.js
}

/*  NAVIGATION (sidebar tab switching) */
function setupNavigation() {
  const navItems = document.querySelectorAll(".nav-item");
  navItems.forEach(item => {
    item.addEventListener("click", function () {
      navItems.forEach(i => i.classList.remove("active"));
      item.classList.add("active");

      const targetId = item.getAttribute("data-target");
      document.querySelectorAll(".panel").forEach(panel => {
        panel.classList.toggle("active", panel.id === targetId);
      });
    });
  });
}

/*   DASHBOARD */
function renderDashboard() {
  const enterpriseRisk = calculateAllRisk(); // riskEngine.js

  document.getElementById("cardTotalEAL").textContent = formatINR(enterpriseRisk.totalExpectedAnnualLoss);
  document.getElementById("cardTotalExposure").textContent = formatINR(enterpriseRisk.totalFinancialExposure);
  document.getElementById("cardHighRiskCount").textContent = enterpriseRisk.highRiskAssetCount;

  document.getElementById("execSummary").textContent = buildExecutiveHeadline(enterpriseRisk);
  document.getElementById("highestRiskSummary").textContent = buildRiskConcentrationSummary(enterpriseRisk);

  // Recommended investment / risk reduction / ROSI cards reflect whatever
  // is currently ticked on the Investment page.
  const evaluation = getCurrentInvestmentEvaluation();
  document.getElementById("cardRecommendedInvestment").textContent = describeSelection(evaluation.selectedInvestments);
  document.getElementById("cardRiskReduction").textContent = formatINR(evaluation.totalRiskReduction);
  document.getElementById("cardROSI").textContent = evaluation.rosi + "%";

  renderRiskByAssetChart(enterpriseRisk.perAssetRisk);
  renderExposureDistributionChart(enterpriseRisk.perAssetRisk);
}

function describeSelection(selectedInvestments) {
  if (!selectedInvestments || selectedInvestments.length === 0) return "None selected";
  if (selectedInvestments.length === 1) return selectedInvestments[0].name;
  return selectedInvestments.length + " investments";
}

/**
 * Builds a short, natural-language headline for the top of the
 * dashboard, using only real calculated numbers.
 */
function buildExecutiveHeadline(enterpriseRisk) {
  const count = enterpriseRisk.highRiskAssetCount;
  if (count === 0) {
    return "Here's the current risk picture across your organisation — nothing is classified High or Critical right now.";
  }
  const assetsWord = count === 1 ? "asset needs" : "assets need";
  return `Here's the current risk picture across your organisation. ${count} ${assetsWord} attention right now.`;
}

/**
 * Builds a slightly longer summary naming the top risk contributors,
 * for the "Where the risk is concentrated" panel.
 */
function buildRiskConcentrationSummary(enterpriseRisk) {
  const top = enterpriseRisk.highestRiskAsset;
  if (!top) return "No asset data is available yet.";

  const topContributors = identifyTopRiskContributors(loadAssets(), 3); // riskEngine.js
  const names = topContributors.map(a => a.assetName).join(", ");

  return (
    `Most of the current financial exposure is concentrated in ${topContributors.length} business-critical systems — ` +
    `${names}. ${top.assetName} carries the largest share, at ${formatINR(top.expectedAnnualLoss)} in expected annual loss. ` +
    `Recommended next step: prioritise remediation there first.`
  );
}

function renderRiskByAssetChart(perAssetRisk) {
  const sorted = [...perAssetRisk].sort((a, b) => b.expectedAnnualLoss - a.expectedAnnualLoss);
  const labels = sorted.map(r => r.assetName);
  const values = sorted.map(r => r.expectedAnnualLoss);
  const colors = sorted.map(r => levelColor(r.riskLevel));

  renderChart("chartRiskByAsset", {
    type: "bar",
    data: {
      labels,
      datasets: [{
        label: "Expected Annual Loss",
        data: values,
        backgroundColor: colors,
        borderRadius: 4
      }]
    },
    options: baseChartOptions({ indexAxis: "y" }, { rupeeTooltip: true })
  });
}

function renderExposureDistributionChart(perAssetRisk) {
  const sorted = [...perAssetRisk].sort((a, b) => b.financialImpact - a.financialImpact);
  const labels = sorted.map(r => r.assetName);
  const values = sorted.map(r => r.financialImpact);

  renderChart("chartExposureDistribution", {
    type: "doughnut",
    data: {
      labels,
      datasets: [{
        data: values,
        backgroundColor: palette(labels.length)
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: "right", labels: { boxWidth: 12, font: { size: 11 } } },
        tooltip: { callbacks: { label: ctx => `${ctx.label}: ${formatINR(ctx.parsed)}` } }
      }
    }
  });
}

/*  ASSET RISK TABLE */
function setupAssetTableToolbar() {
  document.getElementById("loadSampleBtn").addEventListener("click", function () {
    resetSampleData();
    selectedInvestmentIds = new Set();
    initInvestmentSelection();
    renderEverything();
  });

  document.getElementById("addAssetBtn").addEventListener("click", function () {
    openAssetModal(null);
  });
}

function renderAssetTable() {
  const assets = loadAssets();
  const ranked = rankAssetsByRisk(assets); // riskEngine.js — includes rank, riskLevel + all computed fields
  const tbody = document.getElementById("assetTableBody");
  tbody.innerHTML = "";

  ranked.forEach(risk => {
    const asset = assets.find(a => a.id === risk.assetId);
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${risk.rank}</td>
      <td>${risk.assetId}</td>
      <td>${escapeHtml(risk.assetName)}</td>
      <td>${escapeHtml(asset.organization || "")}</td>
      <td>${escapeHtml(asset.type || "")}</td>
      <td>${asset.criticality}</td>
      <td>${asset.vulnerabilitySeverity}</td>
      <td>${asset.exposure}</td>
      <td>${(asset.controlEffectiveness * 100).toFixed(0)}%</td>
      <td>${formatINR(risk.financialImpact)}</td>
      <td>${formatINR(risk.expectedAnnualLoss)}</td>
      <td><span class="badge ${levelBadgeClass(risk.riskLevel)}">${risk.riskLevel}</span></td>
      <td>
        <button class="btn-icon" title="Edit" data-edit="${asset.id}">✏️</button>
        <button class="btn-icon" title="Delete" data-delete="${asset.id}">🗑️</button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  tbody.querySelectorAll("[data-edit]").forEach(btn => {
    btn.addEventListener("click", () => openAssetModal(btn.getAttribute("data-edit")));
  });
  tbody.querySelectorAll("[data-delete]").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-delete");
      if (confirm("Delete this asset? This cannot be undone.")) {
        deleteAsset(id);
        renderEverything();
      }
    });
  });
}

function levelBadgeClass(level) {
  switch (level) {
    case "Critical": return "level-critical";
    case "High": return "level-high";
    case "Moderate": return "level-moderate";
    default: return "level-low";
  }
}

function levelColor(level) {
  switch (level) {
    case "Critical": return "#c4362d";
    case "High": return "#d98324";
    case "Moderate": return "#2f6fed";
    default: return "#1d8a56";
  }
}

/*   COMPLIANCE / FRAMEWORK MAPPING  */
function renderComplianceTable() {
  const rows = loadComplianceMapping(); // data.js
  const tbody = document.getElementById("complianceTableBody");
  if (!tbody) return;
  tbody.innerHTML = "";

  rows.forEach(row => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${escapeHtml(row.riskTheme)}</td>
      <td>${escapeHtml(row.iso27001)}</td>
      <td>${escapeHtml(row.nistCsf)}</td>
      <td>${escapeHtml(row.cisControls)}</td>
      <td>${escapeHtml(row.rbi)}</td>
      <td>${escapeHtml(row.sebi)}</td>
    `;
    tbody.appendChild(tr);
  });
}

/*   ADD / EDIT ASSET MODAL */
function setupAssetModal() {
  document.getElementById("assetModalCancel").addEventListener("click", closeAssetModal);
  document.getElementById("assetModalOverlay").addEventListener("click", function (e) {
    if (e.target === this) closeAssetModal();
  });
  document.getElementById("assetForm").addEventListener("submit", function (e) {
    e.preventDefault();
    saveAssetFromForm();
  });
}

function openAssetModal(assetId) {
  const overlay = document.getElementById("assetModalOverlay");
  const form = document.getElementById("assetForm");
  form.reset();

  if (assetId) {
    const asset = loadAssets().find(a => a.id === assetId);
    if (!asset) return;
    document.getElementById("assetModalTitle").textContent = "Edit Asset";
    document.getElementById("assetFormId").value = asset.id;
    document.getElementById("assetFormName").value = asset.name;
    document.getElementById("assetFormType").value = asset.type;
    document.getElementById("assetFormOrganization").value = asset.organization || "";
    document.getElementById("assetFormCriticality").value = asset.criticality;
    document.getElementById("assetFormSeverity").value = asset.vulnerabilitySeverity;
    document.getElementById("assetFormExposure").value = asset.exposure;
    document.getElementById("assetFormControl").value = asset.controlEffectiveness;
    document.getElementById("assetFormDowntime").value = asset.downtimeCost;
    document.getElementById("assetFormDataLoss").value = asset.dataLossCost;
    document.getElementById("assetFormRecovery").value = asset.recoveryCost;
  } else {
    document.getElementById("assetModalTitle").textContent = "Add Asset";
    document.getElementById("assetFormId").value = "";
  }

  overlay.classList.add("active");
}

function closeAssetModal() {
  document.getElementById("assetModalOverlay").classList.remove("active");
}

function saveAssetFromForm() {
  const id = document.getElementById("assetFormId").value;
  const fields = {
    name: document.getElementById("assetFormName").value,
    type: document.getElementById("assetFormType").value,
    organization: document.getElementById("assetFormOrganization").value,
    criticality: Number(document.getElementById("assetFormCriticality").value),
    vulnerabilitySeverity: Number(document.getElementById("assetFormSeverity").value),
    exposure: Number(document.getElementById("assetFormExposure").value),
    controlEffectiveness: Number(document.getElementById("assetFormControl").value),
    downtimeCost: Number(document.getElementById("assetFormDowntime").value),
    dataLossCost: Number(document.getElementById("assetFormDataLoss").value),
    recoveryCost: Number(document.getElementById("assetFormRecovery").value)
  };

  if (id) {
    updateAsset(id, fields);
  } else {
    addAsset(fields);
  }

  closeAssetModal();
  renderEverything();
}

/* INVESTMENT PAGE */
function setupOptimizer() {
  document.getElementById("optimizeBtn").addEventListener("click", function () {
    const result = runOptimization(currentBudget); // optimizer.js — 0/1 knapsack
    selectedInvestmentIds = new Set(result.selectedInvestments.map(i => i.id));
    persistSelection();
    renderDashboard();
    renderInvestmentSection();
  });

  const budgetInput = document.getElementById("budgetInput");
  budgetInput.addEventListener("input", function () {
    updateBudget(Number(budgetInput.value) || 0);
  });

  document.querySelectorAll("#budgetPresets .preset-chip").forEach(btn => {
    btn.addEventListener("click", function () {
      const value = Number(btn.getAttribute("data-budget"));
      budgetInput.value = value;
      updateBudget(value);
    });
  });
}

function updateBudget(newBudget) {
  currentBudget = Math.max(0, newBudget || 0);
  saveBudget(currentBudget);
  renderDashboard();
  renderInvestmentSection();
}

function renderInvestmentSection() {
  const evaluation = getCurrentInvestmentEvaluation();

  document.getElementById("optTotalInvestment").textContent = formatINR(evaluation.totalInvestment);
  document.getElementById("optRiskReduction").textContent = formatINR(evaluation.totalRiskReduction);

  const remainingEl = document.getElementById("optRemainingBudget");
  remainingEl.textContent = formatINR(evaluation.remainingBudget);
  remainingEl.classList.toggle("risk-high", evaluation.overBudget);

  document.getElementById("optROSI").textContent = evaluation.rosi + "%";

  renderInvestmentTable();
  renderInvestmentChart();
}

function renderInvestmentTable() {
  const investments = loadInvestments();
  const tbody = document.getElementById("investmentTableBody");
  tbody.innerHTML = "";

  investments.forEach(inv => {
    const rosi = calculateROSI(inv.cost, inv.riskReduction); // optimizer.js
    const priority = classifyInvestmentPriority(rosi); // optimizer.js
    const isChecked = selectedInvestmentIds.has(inv.id);

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td class="checkbox-cell">
        <input type="checkbox" class="investment-checkbox" data-id="${inv.id}" ${isChecked ? "checked" : ""} />
      </td>
      <td>${escapeHtml(inv.name)}</td>
      <td class="description-cell">${escapeHtml(inv.description)}</td>
      <td>${formatINR(inv.cost)}</td>
      <td>${formatINR(inv.riskReduction)}</td>
      <td>${rosi}%</td>
      <td><span class="badge ${priorityBadgeClass(priority)}">${priority}</span></td>
    `;
    tbody.appendChild(tr);
  });

  tbody.querySelectorAll(".investment-checkbox").forEach(checkbox => {
    checkbox.addEventListener("change", function () {
      const id = this.getAttribute("data-id");
      if (this.checked) {
        selectedInvestmentIds.add(id);
      } else {
        selectedInvestmentIds.delete(id);
      }
      persistSelection();
      renderDashboard();
      // Re-render totals/chart without rebuilding every row (keeps focus
      // on the checkbox the user just touched); the table itself only
      // needs the checked states, which are already correct in the DOM.
      const evaluation = getCurrentInvestmentEvaluation();
      document.getElementById("optTotalInvestment").textContent = formatINR(evaluation.totalInvestment);
      document.getElementById("optRiskReduction").textContent = formatINR(evaluation.totalRiskReduction);
      const remainingEl = document.getElementById("optRemainingBudget");
      remainingEl.textContent = formatINR(evaluation.remainingBudget);
      remainingEl.classList.toggle("risk-high", evaluation.overBudget);
      document.getElementById("optROSI").textContent = evaluation.rosi + "%";
      renderInvestmentChart();
    });
  });
}

function priorityBadgeClass(priority) {
  switch (priority) {
    case "High": return "priority-high";
    case "Medium": return "priority-medium";
    default: return "priority-low";
  }
}

function renderInvestmentChart() {
  const investments = loadInvestments();
  const labels = investments.map(i => i.name);
  const costs = investments.map(i => i.cost);
  const reductions = investments.map(i => i.riskReduction);
  const borderColors = investments.map(i => (selectedInvestmentIds.has(i.id) ? "#101828" : "transparent"));

  renderChart("chartInvestmentVsReduction", {
    type: "bar",
    data: {
      labels,
      datasets: [
        { label: "Cost", data: costs, backgroundColor: "#94a3b8", borderRadius: 4, borderColor: borderColors, borderWidth: 2 },
        { label: "Risk Reduction", data: reductions, backgroundColor: "#2f6fed", borderRadius: 4, borderColor: borderColors, borderWidth: 2 }
      ]
    },
    options: baseChartOptions({ indexAxis: "y" }, { rupeeTooltip: true })
  });
}

/*  AI RISK ANALYST (chat interface) */
function setupChat() {
  const sendBtn = document.getElementById("chatSendBtn");
  const input = document.getElementById("chatInput");

  sendBtn.addEventListener("click", handleChatSend);
  input.addEventListener("keydown", function (e) {
    if (e.key === "Enter") handleChatSend();
  });

  document.querySelectorAll("#chatSuggestions .chip").forEach(chip => {
    chip.addEventListener("click", function () {
      const question = chip.getAttribute("data-question");
      appendChatMessage(question, "user");
      const answer = askAI(question); // aiAnalyst.js
      appendChatMessage(answer, "bot");
    });
  });
}

function handleChatSend() {
  const input = document.getElementById("chatInput");
  const question = input.value.trim();
  if (!question) return;

  appendChatMessage(question, "user");
  const answer = askAI(question); // aiAnalyst.js
  appendChatMessage(answer, "bot");
  input.value = "";
}

function appendChatMessage(text, sender) {
  const chatWindow = document.getElementById("chatWindow");
  const msg = document.createElement("div");
  msg.className = `chat-message ${sender}`;
  msg.textContent = text;
  chatWindow.appendChild(msg);
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

/*   SCENARIO SIMULATOR */
function setupScenarioSimulator() {
  // Scenario cards are rendered dynamically; click handlers are
  // attached inside renderScenarioCards() since the cards are
  // (re)created there.
}

function renderScenarioCards() {
  const grid = document.getElementById("scenarioGrid");
  grid.innerHTML = "";

  getAvailableScenarios().forEach(scenario => { // scenarioSimulator.js
    const card = document.createElement("div");
    card.className = "scenario-card";
    card.innerHTML = `<h4>${escapeHtml(scenario.label)}</h4><p>${escapeHtml(scenario.description)}</p>`;
    card.addEventListener("click", () => runScenarioAndRender(scenario.key));
    grid.appendChild(card);
  });
}

function runScenarioAndRender(scenarioKey) {
  const result = runScenario(scenarioKey); // scenarioSimulator.js
  if (!result) return;

  document.getElementById("scenarioResult").style.display = "block";
  document.getElementById("scenarioResultTitle").textContent = result.scenarioLabel;
  document.getElementById("scenarioResultDescription").textContent = result.description;
  document.getElementById("scenarioBeforeEAL").textContent = formatINR(result.beforeEAL);
  document.getElementById("scenarioAfterEAL").textContent = formatINR(result.afterEAL);
  document.getElementById("scenarioReduction").textContent = formatINR(result.riskReduction);
  document.getElementById("scenarioPercentReduction").textContent = result.percentageReduction + "%";

  renderChart("chartBeforeAfter", {
    type: "bar",
    data: {
      labels: ["Current", "Projected"],
      datasets: [{
        label: "Expected Annual Loss",
        data: [result.beforeEAL, result.afterEAL],
        backgroundColor: ["#c4362d", "#1d8a56"],
        borderRadius: 4
      }]
    },
    options: baseChartOptions({}, { rupeeTooltip: true })
  });

  document.getElementById("scenarioResult").scrollIntoView({ behavior: "smooth", block: "nearest" });
}

/*   RESET DEMO DATA (sidebar button) */
function setupResetButton() {
  document.getElementById("resetDataBtn").addEventListener("click", function () {
    if (confirm("Reset ALL data back to the original demo data set? Your edits and investment selection will be lost.")) {
      resetSampleData();
      currentBudget = loadBudget();
      document.getElementById("budgetInput").value = currentBudget;
      selectedInvestmentIds = new Set();
      initInvestmentSelection();
      renderEverything();
    }
  });
}

/*   CHART.JS HELPERS */
function renderChart(canvasId, config) {
  const ctx = document.getElementById(canvasId);
  if (!ctx) return;

  // Defensive: if Chart.js failed to load (e.g. no internet connection
  // to the CDN during a live demo), don't let that break the rest of
  // the dashboard. Every number on the page already comes from the
  // tables/cards, so charts are a nice-to-have, not a hard dependency.
  if (typeof Chart === "undefined") {
    console.warn(`Chart.js is not available — skipping chart "${canvasId}". Check your internet connection (Chart.js loads from a CDN).`);
    const container = ctx.closest(".chart-box");
    if (container && !container.querySelector(".chart-fallback-note")) {
      const note = document.createElement("p");
      note.className = "muted chart-fallback-note";
      note.textContent = "Chart unavailable offline — Chart.js could not be loaded from the CDN.";
      container.appendChild(note);
    }
    return;
  }

  try {
    if (chartInstances[canvasId]) {
      chartInstances[canvasId].destroy();
    }
    chartInstances[canvasId] = new Chart(ctx, config);
  } catch (err) {
    console.error(`Failed to render chart "${canvasId}":`, err);
  }
}

function baseChartOptions(extra, tooltipConfig) {
  const options = Object.assign({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: true, labels: { font: { size: 11 } } }
    },
    scales: {
      x: { ticks: { font: { size: 10 } } },
      y: { ticks: { font: { size: 10 } } }
    }
  }, extra);

  if (tooltipConfig && tooltipConfig.rupeeTooltip) {
    options.plugins.tooltip = {
      callbacks: {
        label: ctx => `${ctx.dataset.label || ""}: ${formatINR(ctx.parsed.x != null ? ctx.parsed.x : ctx.parsed.y)}`.trim()
      }
    };
  }

  return options;
}

function palette(count) {
  const base = ["#2f6fed", "#4c8dff", "#1d8a56", "#d98324", "#c4362d", "#7c5cff", "#0d1f3c", "#94a3b8", "#1a3a6b", "#2fb1ed"];
  const colors = [];
  for (let i = 0; i < count; i++) {
    colors.push(base[i % base.length]);
  }
  return colors;
}

/* MISC HELPERS */
function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = String(str == null ? "" : str);
  return div.innerHTML;
}
