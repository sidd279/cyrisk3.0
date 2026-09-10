/*
   FILE: riskEngine.js

   PURPOSE:
   This is the source of truth for every risk number
   shown anywhere in the dashboard. No other file is allowed
   to invent or duplicate a risk formula — they all call into
   the functions defined here.

   MODEL USED:

     Financial Impact =
         Downtime Cost + Data Loss Cost + Recovery Cost

     Probability =
         0.02 * Vulnerability Severity
       + 0.02 * Exposure Level
       + 0.01 * Asset Criticality

     Residual Probability =
         Probability * (1 - Control Effectiveness)

     Expected Annual Loss (EAL) =
         Residual Probability * Financial Impact

     Risk Score =
         Severity * Exposure * Criticality

   All probability values are between 0 and 1 so the
   model never produces nonsensical (>100%) chances.

   In addition to the numeric EAL, this file also classifies
   each asset into one of fourrisk levels (Low,
   Moderate, High, Critical) so the dashboard can show a simple
   label instead of asking a user to interpret a raw
   figure. The classification is relative to the riskiest asset
   in the current data set, so it stays meaningful whether the
   organization has 10 assets or 200.

   */


function calculateRisk(asset) {
  const financialImpact = calculateFinancialImpact(asset);

  
  let probability =
    0.02 * asset.vulnerabilitySeverity +
    0.02 * asset.exposure +
    0.01 * asset.criticality;
  probability = clampProbabilityValue(probability);

  
  const controlEffectiveness = clampProbabilityValue(asset.controlEffectiveness);
  let residualProbability = probability * (1 - controlEffectiveness);
  residualProbability = clampProbabilityValue(residualProbability);

  // --- Expected Annual Loss ---
  const expectedAnnualLoss = residualProbability * financialImpact;

 
  const inherentAnnualLoss = probability * financialImpact;

  // --- Risk Score: ---
  const riskScore =
    asset.vulnerabilitySeverity * asset.exposure * asset.criticality;

  return {
    assetId: asset.id,
    assetName: asset.name,
    assetType: asset.type,
    financialImpact: round2(financialImpact),
    probability: round4(probability),
    residualProbability: round4(residualProbability),
    expectedAnnualLoss: round2(expectedAnnualLoss),
    inherentAnnualLoss: round2(inherentAnnualLoss),
    riskScore: riskScore,
    controlEffectiveness: controlEffectiveness
  };
}


function calculateFinancialImpact(asset) {
  const downtime = Number(asset.downtimeCost) || 0;
  const dataLoss = Number(asset.dataLossCost) || 0;
  const recovery = Number(asset.recoveryCost) || 0;
  return downtime + dataLoss + recovery;
}


function calculateEnterpriseRisk(assets) {
  
  const perAssetRisk = rankAssetsByRisk(assets);

  const totalExpectedAnnualLoss = perAssetRisk.reduce(
    (sum, r) => sum + r.expectedAnnualLoss, 0
  );
  const totalFinancialExposure = perAssetRisk.reduce(
    (sum, r) => sum + r.financialImpact, 0
  );
  const totalInherentAnnualLoss = perAssetRisk.reduce(
    (sum, r) => sum + r.inherentAnnualLoss, 0
  );


  const highRiskAssetCount = perAssetRisk.filter(
    r => r.riskLevel === "Critical" || r.riskLevel === "High"
  ).length;

  const highestRiskAsset = perAssetRisk.length > 0 ? perAssetRisk[0] : null;

  return {
    totalExpectedAnnualLoss: round2(totalExpectedAnnualLoss),
    totalFinancialExposure: round2(totalFinancialExposure),
    totalInherentAnnualLoss: round2(totalInherentAnnualLoss),
    highRiskAssetCount: highRiskAssetCount,
    perAssetRisk: perAssetRisk,
    highestRiskAsset: highestRiskAsset
  };
}


function rankAssetsByRisk(assets) {
  const results = assets.map(calculateRisk);
  results.sort((a, b) => b.expectedAnnualLoss - a.expectedAnnualLoss);

  const maxEAL = results.length > 0 ? results[0].expectedAnnualLoss : 0;
  results.forEach((r, index) => {
    r.rank = index + 1;
    r.riskLevel = classifyRiskLevel(r.expectedAnnualLoss, maxEAL);
  });
  return results;

function classifyRiskLevel(eal, maxEAL) {
  if (!maxEAL || maxEAL <= 0) return "Low";
  const ratio = eal / maxEAL;
  if (ratio >= 0.65) return "Critical";
  if (ratio >= 0.35) return "High";
  if (ratio >= 0.09) return "Moderate";
  return "Low";
}


function identifyTopRiskContributors(assets, topN) {
  const n = topN || 3;
  return rankAssetsByRisk(assets).slice(0, n);
}


function clampProbabilityValue(value) {
  const num = Number(value);
  if (isNaN(num)) return 0;
  return Math.min(1, Math.max(0, num));
}

function round2(value) {
  return Math.round(value * 100) / 100;
}

function round4(value) {
  return Math.round(value * 10000) / 10000;
}


function calculateAllRisk() {
  const assets = loadAssets();
  return calculateEnterpriseRisk(assets);
}
