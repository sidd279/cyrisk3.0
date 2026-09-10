/* 
   FILE: optimizer.js
   
   PURPOSE:
   Given a fixed cybersecurity budget, this module figures out
   WHICH combination of security investments gives the biggest
   total risk reduction without going over budget. This directly
   answers the platform's core question:

     "If an organization has a fixed cybersecurity budget,
      which security investments will reduce the most
      estimated financial risk?"

     - "Weight" of each item  = investment cost
     - "Value" of each item   = risk reduction
     - Constraint             = total cost <= budget
     - Objective              = maximize total risk reduction

*/

function optimizeBudget(budget, investments) {
  const safeBudget = Math.max(0, Number(budget) || 0);
  const items = (investments || []).filter(inv => Number(inv.cost) > 0);

  // Evaluate every individual investment's own ROSI 
  const allEvaluated = items.map(inv => ({
    ...inv,
    rosi: calculateROSI(inv.cost, inv.riskReduction)
  }));

  if (items.length === 0 || safeBudget <= 0) {
    return {
      selectedInvestments: [],
      totalInvestment: 0,
      totalRiskReduction: 0,
      remainingBudget: safeBudget,
      rosi: 0,
      allEvaluated: allEvaluated
    };
  }

  //  Scale costs down to keep the DP table small & fast 
  const scaleStep = pickScaleStep(items, safeBudget);
  const scaledBudget = Math.floor(safeBudget / scaleStep);
  const scaledItems = items.map(inv => ({
    ...inv,
    scaledCost: Math.floor(inv.cost / scaleStep)
  }));

  const n = scaledItems.length;

  // dp[i][b] = best total risk reduction using the first i items
  //            with scaled budget b
  const dp = Array.from({ length: n + 1 }, () => new Array(scaledBudget + 1).fill(0));

  for (let i = 1; i <= n; i++) {
    const item = scaledItems[i - 1];
    for (let b = 0; b <= scaledBudget; b++) {
      // Option 1: don't take item i
      let best = dp[i - 1][b];
      // Option 2: take item i (if it fits)
      if (item.scaledCost <= b) {
        const candidate = dp[i - 1][b - item.scaledCost] + item.riskReduction;
        if (candidate > best) best = candidate;
      }
      dp[i][b] = best;
    }
  }

  //  Backtrack to find which items were actually selected 
  const selected = [];
  let remaining = scaledBudget;
  for (let i = n; i >= 1; i--) {
    if (dp[i][remaining] !== dp[i - 1][remaining]) {
      const item = scaledItems[i - 1];
      selected.push(item);
      remaining -= item.scaledCost;
    }
  }
  selected.reverse();

  const selectedInvestments = selected.map(s => {
    // Strip the temporary scaledCost field before returning to caller
    const { scaledCost, ...original } = s;
    return original;
  });

  const totalInvestment = selectedInvestments.reduce((sum, inv) => sum + inv.cost, 0);
  const totalRiskReduction = selectedInvestments.reduce((sum, inv) => sum + inv.riskReduction, 0);
  const remainingBudget = safeBudget - totalInvestment;
  const rosi = calculateROSI(totalInvestment, totalRiskReduction);

  return {
    selectedInvestments,
    totalInvestment: round2(totalInvestment),
    totalRiskReduction: round2(totalRiskReduction),
    remainingBudget: round2(remainingBudget),
    rosi: round2(rosi),
    allEvaluated: allEvaluated
  };
}

function evaluateInvestmentSelection(selectedIds, investments, budget) {
  const idSet = new Set(selectedIds || []);
  const selectedInvestments = (investments || []).filter(inv => idSet.has(inv.id));

  const totalInvestment = selectedInvestments.reduce((sum, inv) => sum + inv.cost, 0);
  const totalRiskReduction = selectedInvestments.reduce((sum, inv) => sum + inv.riskReduction, 0);
  const safeBudget = Math.max(0, Number(budget) || 0);
  const remainingBudget = safeBudget - totalInvestment;

  return {
    selectedInvestments,
    totalInvestment: round2(totalInvestment),
    totalRiskReduction: round2(totalRiskReduction),
    remainingBudget: round2(remainingBudget),
    rosi: calculateROSI(totalInvestment, totalRiskReduction),
    overBudget: totalInvestment > safeBudget
  };
}

/**
 * Calculates Return on Security Investment (ROSI) as a percentage.
 * ROSI = (Risk Reduction - Investment Cost) / Investment Cost * 100
 */
function calculateROSI(investmentCost, riskReduction) {
  const cost = Number(investmentCost);
  const reduction = Number(riskReduction);
  if (!cost || cost <= 0) return 0;
  return round2(((reduction - cost) / cost) * 100);
}

function classifyInvestmentPriority(rosi) {
  if (rosi >= 100) return "High";
  if (rosi >= 40) return "Medium";
  return "Low";
}

/* HELPERS */

function pickScaleStep(items, budget) {
  const minCost = Math.min(budget, ...items.map(i => i.cost));
  // Aim for at most ~2000 columns in the DP table.
  const target = Math.max(1, Math.floor(budget / 2000));
  const step = Math.max(1, Math.min(minCost || 1, target || 1));
  return step;
}

function round2(value) {
  return Math.round(value * 100) / 100;
}

function runOptimization(budget) {
  const investments = loadInvestments();
  return optimizeBudget(budget, investments);
}
