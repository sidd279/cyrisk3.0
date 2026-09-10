/* 
   FILE: aiAnalyst.js
   
   PURPOSE:
   Provides a chat-style "Risk Analyst" that answers cyber risk
   questions .This is a RULE-BASED natural language
   generator: it detects the intent of a question using simple
   keyword matching, then plugs REAL calculated numbers (from
   riskEngine.js / optimizer.js / scenarioSimulator.js) into a
   pre-written explanation template.
 */
function generateRiskExplanation(question, riskData) {
  const q = (question || "").toLowerCase().trim();
  const data = riskData || calculateAllRisk();

  if (!q) {
    return "Ask me something about the current risk picture — for example, \"What is our highest financial cyber risk?\"";
  }

  // highest financial risk 
  if (isHighestRiskQuestion(q)) {
    return answerHighestRisk(data);
  }

  // which vulnerabilities contribute most
  if (isVulnerabilityContributionQuestion(q)) {
    return answerVulnerabilityContribution(data);
  }

  //what should we fix first 
  if (isFixFirstQuestion(q)) {
    return answerFixFirst(data);
  }

  // what-if / scenario questions 
  const scenarioKey = detectScenarioKeyword(q);
  if (scenarioKey) {
    return answerScenarioQuestion(scenarioKey);
  }

  // "why is <asset> high-risk?" 
  const matchedAsset = findAssetMentionedInQuestion(q, data);
  if (matchedAsset) {
    return answerWhyAssetIsRisky(matchedAsset, data);
  }

  // budget / investment questions 
  if (isBudgetQuestion(q)) {
    return answerBudgetQuestion(q);
  }

  // Fallback: no confident match, guide the user
  return fallbackAnswer();
}

/*
   INTENT DETECTION HELPERS
 */

function isHighestRiskQuestion(q) {
  return (q.includes("highest") && (q.includes("risk") || q.includes("financial")));
}

function isVulnerabilityContributionQuestion(q) {
  return q.includes("vulnerab") && (q.includes("contribute") || q.includes("most") || q.includes("expected loss"));
}

function isFixFirstQuestion(q) {
  return q.includes("fix first") || q.includes("prioriti") || q.includes("what should we fix") || q.includes("remediat");
}

function isBudgetQuestion(q) {
  return q.includes("budget") || q.includes("invest") || q.includes("rosi");
}

/**
 * Detects whether the question refers to one of the known
 * what-if scenarios, and returns its scenario key if so.
 */
function detectScenarioKeyword(q) {
  const mentionsWhatIf = q.includes("what happens if") || q.includes("what if") || q.includes("what would happen");

  if (q.includes("mfa") || q.includes("multi-factor") || q.includes("multi factor")) {
    return "mfa";
  }
  if (q.includes("patch")) {
    return "patchCritical";
  }
  if (q.includes("segment")) {
    return "networkSegmentation";
  }
  if (q.includes("backup")) {
    return "improveBackups";
  }
  if (q.includes("delay")) {
    return "delayRemediation";
  }
  // If the question is clearly a "what if" question but doesn't name
  // a specific control, default to no match so the fallback can help.
  if (mentionsWhatIf) {
    return null;
  }
  return null;
}

/**
 * Looks for any asset's name (or id) mentioned inside the question.
 * Returns the matching per-asset risk object, or null.
 */
function findAssetMentionedInQuestion(q, data) {
  const perAssetRisk = data.perAssetRisk || [];
  let bestMatch = null;

  perAssetRisk.forEach(asset => {
    const nameLower = asset.assetName.toLowerCase();
    const idLower = asset.assetId.toLowerCase();
    if (q.includes(nameLower) || q.includes(idLower)) {
      bestMatch = asset;
    } else {
      // Also try matching on individual significant words of the asset
      // name (e.g. "UPI Transaction API" -> question mentions just "UPI")
      const words = nameLower.split(" ").filter(w => w.length > 3);
      if (words.some(w => q.includes(w))) {
        bestMatch = bestMatch || asset;
      }
    }
  });

  return bestMatch;
}

function answerHighestRisk(data) {
  const top = data.highestRiskAsset;
  if (!top) {
    return "I don't have enough asset data yet to determine the highest financial risk. Try loading sample data first.";
  }
  return (
    `${top.assetName} is currently our highest financial cyber risk, with an Expected Annual Loss ` +
    `of ${formatINR(top.expectedAnnualLoss)} (prototype estimate). Its risk level is classified as ${top.riskLevel.toLowerCase()}, ` +
    `driven by a residual incident probability of ${formatPercent(top.residualProbability)} against a total financial impact ` +
    `of ${formatINR(top.financialImpact)} if an incident occurred (downtime, data loss and recovery combined).`
  );
}

function answerVulnerabilityContribution(data) {
  const vulnerabilities = loadVulnerabilities();
  const perAssetRisk = data.perAssetRisk || [];

  // Attribute each asset's EAL to its associated vulnerabilities so we
  // can show which vulnerabilities sit on the highest-loss assets.
  const scored = vulnerabilities.map(v => {
    const assetRisk = perAssetRisk.find(a => a.assetId === v.assetId);
    return {
      vulnerability: v,
      assetName: assetRisk ? assetRisk.assetName : "an unlisted asset",
      assetEAL: assetRisk ? assetRisk.expectedAnnualLoss : 0
    };
  });

  scored.sort((a, b) => (b.vulnerability.severity - a.vulnerability.severity) || (b.assetEAL - a.assetEAL));

  const top3 = scored.slice(0, 3);
  const lines = top3.map((s, i) =>
    `${i + 1}. ${s.vulnerability.name} on ${s.assetName} — severity ${s.vulnerability.severity}/5, ` +
    `sitting on an asset carrying ${formatINR(s.assetEAL)} of Expected Annual Loss.`
  );

  return (
    `Based on severity and where they sit, these vulnerabilities are contributing most to our expected losses:\n\n` +
    lines.join("\n") +
    `\n\nAll figures are prototype estimates from the current risk model.`
  );
}

function answerFixFirst(data) {
  const top = identifyTopRiskContributors(loadAssets(), 3);
  const lines = top.map((r, i) =>
    `${i + 1}. ${r.assetName} — ${formatINR(r.expectedAnnualLoss)} in Expected Annual Loss (${r.riskLevel.toLowerCase()} risk)`
  );
  return (
    `In order of Expected Annual Loss, this is where remediation effort should go first:\n\n` +
    lines.join("\n") +
    `\n\nAddressing the top item typically has the biggest effect on overall exposure, since it currently accounts for ` +
    `the largest share of expected loss across the estate.`
  );
}

function answerWhyAssetIsRisky(assetRisk, data) {
  const relatedVulns = getVulnerabilitiesForAsset(assetRisk.assetId);
  const worstVuln = relatedVulns.slice().sort((a, b) => b.severity - a.severity)[0];

  let vulnSentence = "";
  if (worstVuln) {
    vulnSentence = ` The most severe known issue on it is "${worstVuln.name}" (severity ${worstVuln.severity}/5).`;
  }

  return (
    `${assetRisk.assetName} is classified as ${assetRisk.riskLevel.toLowerCase()} risk because it combines high business ` +
    `criticality, meaningful vulnerability exposure and a significant financial impact if it were compromised.` +
    vulnSentence +
    ` Its residual probability of an incident is ${formatPercent(assetRisk.residualProbability)}, and the total financial impact ` +
    `(downtime, data loss and recovery combined) is ${formatINR(assetRisk.financialImpact)}, giving an Expected Annual Loss of ` +
    `${formatINR(assetRisk.expectedAnnualLoss)}. Based on the prototype model, this should be treated as a priority remediation item.`
  );
}

function answerScenarioQuestion(scenarioKey) {
  const result = runScenario(scenarioKey);
  if (!result) {
    return "I couldn't run that scenario. Try asking about MFA, patching, network segmentation, backups, or delaying remediation.";
  }
  return (
    `If we ${result.scenarioLabel.toLowerCase()}, the model projects:\n\n` +
    `Current EAL: ${formatINR(result.beforeEAL)}\n` +
    `Projected EAL: ${formatINR(result.afterEAL)}\n\n` +
    `That's a risk reduction of ${formatINR(result.riskReduction)}, or ${formatPercent(result.percentageReduction / 100)} ` +
    `of current total risk — a prototype estimate, based on the same risk model used across this dashboard.`
  );
}

function answerBudgetQuestion(q) {
  // Try to extract a rupee amount from the question to use as a budget,
  // otherwise fall back to the default demo budget so the answer is
  // still useful.
  const numberMatch = q.match(/[\d,]{4,}/);
  const budget = numberMatch ? Number(numberMatch[0].replace(/,/g, "")) : loadBudget();

  const result = runOptimization(budget);
  if (!result || result.selectedInvestments.length === 0) {
    return (
      `With a budget of ${formatINR(budget)}, I couldn't fit any investments. ` +
      `Try increasing the budget or use the checkboxes on the Investment page to compare options directly.`
    );
  }

  const names = result.selectedInvestments.map(inv => inv.name).join(", ");
  return (
    `With a budget of ${formatINR(budget)}, the recommended combination is: ${names}.\n\n` +
    `Total investment: ${formatINR(result.totalInvestment)}\n` +
    `Estimated risk reduction: ${formatINR(result.totalRiskReduction)}\n` +
    `Remaining budget: ${formatINR(result.remainingBudget)}\n` +
    `ROSI: ${result.rosi}%\n\n` +
    `You can also tick investments manually on the Investment page to compare a different combination.`
  );
}

function fallbackAnswer() {
  return (
    `I can only answer questions grounded in this dashboard's data. Try asking me:\n\n` +
    `- "What is our highest financial cyber risk?"\n` +
    `- "Which vulnerabilities contribute most to our expected losses?"\n` +
    `- "What should we fix first?"\n` +
    `- "Why is the UPI Transaction API high-risk?"\n` +
    `- "What happens if MFA is implemented?"\n` +
    `- "What can we do with a budget of 10,00,000?"`
  );
}

/* 
   FORMATTING HELPERS
*/

function formatPercent(fraction) {
  const num = Number(fraction) || 0;
  return (num * 100).toFixed(1) + "%";
}

function askAI(question) {
  const riskData = calculateAllRisk();
  return generateRiskExplanation(question, riskData);
}
