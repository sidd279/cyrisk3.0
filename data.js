/* =========================================================
   FILE: data.js
   TEAM MEMBER 2 — DATA MANAGEMENT
   =========================================================
   PURPOSE:
   This file is the single source of "raw" data for the whole
   prototype. It holds:
     - 10 synthetic (fake but realistic) Indian enterprise IT
       assets, spread across fictional organizations
     - 15 synthetic vulnerabilities relevant to Indian
       enterprise environments
     - 5 synthetic security investment options with Indian
       rupee costs
     - a small "prototype mapping" of common risk themes to
       recognised security frameworks (ISO/IEC 27001, NIST CSF,
       CIS Controls, RBI and SEBI cybersecurity frameworks)

   It also provides small helper functions so the rest of the
   app (app.js, riskEngine.js, optimizer.js, aiAnalyst.js,
   scenarioSimulator.js) can load, edit, add, delete and reset
   this data WITHOUT needing a backend or database, and a
   shared formatINR() function used everywhere a rupee value
   is displayed.

   Persistence is done with the browser's built-in
   localStorage, so edits survive a page refresh.

   IMPORTANT: All organizations and financial figures in this
   file are FICTIONAL and used purely to demonstrate the
   platform's methodology. They are not real companies, and
   the numbers are not real regulatory penalties or audited
   losses — see the "Prototype Estimates" labelling used
   throughout the UI.

   HOW IT CONNECTS TO OTHER FILES:
     - index.html loads this file first (before riskEngine.js)
       using <script src="data.js"></script>
     - riskEngine.js reads the "assets" array returned by
       loadAssets() and calculates risk for each asset.
     - optimizer.js reads the "investments" array returned by
       loadInvestments().
     - app.js calls addAsset(), updateAsset(), deleteAsset(),
       resetSampleData(), formatINR() and the selection/budget
       persistence helpers below.
     - aiAnalyst.js uses formatINR() so every rupee figure it
       prints matches the rest of the dashboard.
   ========================================================= */

/* ---------------------------------------------------------
   1. SAMPLE (DEFAULT) ASSET DATA
   ---------------------------------------------------------
   Each asset represents a piece of IT infrastructure belonging
   to a fictional Indian organization that could be affected by
   a cyber incident.

   Field meanings (all on a simple 1-5 scale unless noted):
     criticality           -> how important this asset is to the business
     vulnerabilitySeverity -> how severe the worst known vulnerability is
     exposure              -> how exposed/reachable the asset is
                               (e.g. internet-facing = high)
     controlEffectiveness  -> 0.0 - 1.0, how well existing
                               security controls reduce the
                               probability of a successful attack
                               (0 = no protection, 1 = perfect protection)
     downtimeCost          -> estimated cost (INR) if the asset goes
                               down for a typical incident
     dataLossCost          -> estimated cost (INR) of a data breach/
                               loss event, including regulatory and
                               customer-notification exposure
     recoveryCost          -> estimated cost (INR) to investigate &
                               recover
   --------------------------------------------------------- */
const DEFAULT_ASSETS = [
  {
    id: "A001",
    name: "UPI Transaction API",
    type: "Application",
    organization: "BharatPay Services",
    criticality: 5,
    vulnerabilitySeverity: 5,
    exposure: 5,
    controlEffectiveness: 0.45,
    downtimeCost: 850000,
    dataLossCost: 1800000,
    recoveryCost: 400000
  },
  {
    id: "A002",
    name: "Internet Banking Server",
    type: "Server",
    organization: "Shakti Bank",
    criticality: 5,
    vulnerabilitySeverity: 4,
    exposure: 4,
    controlEffectiveness: 0.5,
    downtimeCost: 900000,
    dataLossCost: 1500000,
    recoveryCost: 350000
  },
  {
    id: "A003",
    name: "Customer Database",
    type: "Database",
    organization: "MetroMart India",
    criticality: 5,
    vulnerabilitySeverity: 4,
    exposure: 3,
    controlEffectiveness: 0.5,
    downtimeCost: 300000,
    dataLossCost: 1200000,
    recoveryCost: 150000
  },
  {
    id: "A004",
    name: "Corporate Email System",
    type: "Server",
    organization: "National Retail Services",
    criticality: 3,
    vulnerabilitySeverity: 3,
    exposure: 4,
    controlEffectiveness: 0.5,
    downtimeCost: 120000,
    dataLossCost: 300000,
    recoveryCost: 70000
  },
  {
    id: "A005",
    name: "Employee HR Portal",
    type: "Application",
    organization: "Vidya Education Services",
    criticality: 3,
    vulnerabilitySeverity: 3,
    exposure: 2,
    controlEffectiveness: 0.55,
    downtimeCost: 80000,
    dataLossCost: 250000,
    recoveryCost: 50000
  },
  {
    id: "A006",
    name: "Hospital Management Server",
    type: "Server",
    organization: "Aarogya Health Network",
    criticality: 5,
    vulnerabilitySeverity: 4,
    exposure: 3,
    controlEffectiveness: 0.4,
    downtimeCost: 600000,
    dataLossCost: 1600000,
    recoveryCost: 300000
  },
  {
    id: "A007",
    name: "Public E-Commerce Website",
    type: "Web Application",
    organization: "MetroMart India",
    criticality: 4,
    vulnerabilitySeverity: 5,
    exposure: 5,
    controlEffectiveness: 0.4,
    downtimeCost: 500000,
    dataLossCost: 700000,
    recoveryCost: 150000
  },
  {
    id: "A008",
    name: "Warehouse Management System",
    type: "Application",
    organization: "Bharat Logistics",
    criticality: 3,
    vulnerabilitySeverity: 3,
    exposure: 3,
    controlEffectiveness: 0.5,
    downtimeCost: 200000,
    dataLossCost: 150000,
    recoveryCost: 80000
  },
  {
    id: "A009",
    name: "Active Directory Server",
    type: "Server",
    organization: "National Retail Services",
    criticality: 4,
    vulnerabilitySeverity: 3,
    exposure: 2,
    controlEffectiveness: 0.6,
    downtimeCost: 250000,
    dataLossCost: 400000,
    recoveryCost: 100000
  },
  {
    id: "A010",
    name: "Backup Storage Server",
    type: "Server",
    organization: "Bharat Logistics",
    criticality: 4,
    vulnerabilitySeverity: 2,
    exposure: 1,
    controlEffectiveness: 0.7,
    downtimeCost: 150000,
    dataLossCost: 500000,
    recoveryCost: 80000
  }
];

/* ---------------------------------------------------------
   2. SAMPLE VULNERABILITY DATA (15 vulnerabilities)
   ---------------------------------------------------------
   These are descriptive/contextual records used mainly by the
   AI Risk Analyst and the compliance mapping to explain WHY an
   asset is risky. They are linked to assets via assetId.
   severity is on a 1-5 scale (5 = critical).
   --------------------------------------------------------- */
const DEFAULT_VULNERABILITIES = [
  { id: "V001", assetId: "A001", name: "Weak API authentication on partner endpoints", severity: 4, category: "Access Control", description: "Third-party integrations authenticate with static API keys instead of short-lived tokens." },
  { id: "V002", assetId: "A001", name: "Missing multi-factor authentication on admin console", severity: 5, category: "Access Control", description: "Operations staff can access the transaction admin console with a password only." },
  { id: "V003", assetId: "A002", name: "Outdated TLS configuration", severity: 4, category: "Encryption", description: "Internet Banking Server still accepts deprecated TLS versions vulnerable to downgrade attacks." },
  { id: "V004", assetId: "A002", name: "Weak privileged-account authentication", severity: 4, category: "Access Control", description: "No enforced MFA or rotation policy for database administrator accounts." },
  { id: "V005", assetId: "A003", name: "Exposed database service", severity: 5, category: "Network Security", description: "Database port is reachable from outside the corporate network due to a firewall misconfiguration." },
  { id: "V006", assetId: "A003", name: "Excessive IAM privileges on service accounts", severity: 3, category: "Access Control", description: "Several service accounts have unnecessary write access to production customer data." },
  { id: "V007", assetId: "A004", name: "Phishing exposure", severity: 3, category: "Email Security", description: "Lack of DMARC/SPF enforcement makes spoofed emails more likely to reach employee inboxes." },
  { id: "V008", assetId: "A004", name: "Outdated mail transfer agent", severity: 3, category: "Patch Management", description: "Mail server software has not been patched in over 12 months." },
  { id: "V009", assetId: "A005", name: "Legacy authentication protocol", severity: 2, category: "Access Control", description: "HR portal still supports basic authentication over an internal HTTP endpoint." },
  { id: "V010", assetId: "A006", name: "Critical RCE vulnerability in patient records module", severity: 5, category: "Application Security", description: "An unpatched remote code execution flaw could allow an attacker to access patient health records." },
  { id: "V011", assetId: "A006", name: "Inadequate backup protection for patient data", severity: 3, category: "Backup & Recovery", description: "Backups are stored on the same network segment as production, increasing ransomware exposure." },
  { id: "V012", assetId: "A007", name: "Web application vulnerability in checkout flow", severity: 5, category: "Application Security", description: "Unsanitized input allows attackers to query the underlying order database directly." },
  { id: "V013", assetId: "A007", name: "Misconfigured cloud storage", severity: 4, category: "Cloud Configuration", description: "A cloud storage bucket holding order exports is publicly readable." },
  { id: "V014", assetId: "A008", name: "Unpatched VPN appliance", severity: 4, category: "Network Security", description: "The VPN appliance used for vendor and remote-warehouse access is missing a critical security patch." },
  { id: "V015", assetId: "A009", name: "Excessive privileged group membership", severity: 3, category: "IAM", description: "More accounts than necessary hold Domain Admin rights on the Active Directory server." }
];

/* ---------------------------------------------------------
   3. SAMPLE SECURITY INVESTMENT DATA (5 investments)
   ---------------------------------------------------------
   Each investment is a candidate control the organization
   could purchase/implement. cost and riskReduction are in
   Indian Rupees (INR). These numbers are prototype estimates
   used to feed the Investment Optimizer (optimizer.js).
   --------------------------------------------------------- */
const DEFAULT_INVESTMENTS = [
  {
    id: "I001",
    name: "Enable MFA for Privileged Accounts",
    cost: 300000,
    riskReduction: 650000,
    description: "Reduce account takeover risk across privileged and remote-access accounts."
  },
  {
    id: "I002",
    name: "Patch Critical Internet-Facing Systems",
    cost: 250000,
    riskReduction: 600000,
    description: "Remediate known critical vulnerabilities on internet-facing servers and APIs."
  },
  {
    id: "I003",
    name: "Deploy Network Segmentation",
    cost: 600000,
    riskReduction: 900000,
    description: "Isolate payment and customer-data systems from the general corporate network."
  },
  {
    id: "I004",
    name: "Improve Backup & Recovery",
    cost: 400000,
    riskReduction: 550000,
    description: "Harden backup infrastructure and test recovery procedures to limit ransomware impact."
  },
  {
    id: "I005",
    name: "Deploy Additional SOC Monitoring",
    cost: 500000,
    riskReduction: 700000,
    description: "Add extended monitoring and alerting to reduce time-to-detect and time-to-contain."
  }
];

/* ---------------------------------------------------------
   4. PROTOTYPE FRAMEWORK MAPPING (for the Compliance panel)
   ---------------------------------------------------------
   A small, static reference table linking common risk themes
   seen in this data set to widely used security frameworks.
   This is illustrative only — see the disclaimer shown next to
   it in the UI. It is NOT a compliance certification and does
   not assert conformance with RBI or SEBI requirements.
   --------------------------------------------------------- */
const COMPLIANCE_MAPPING = [
  {
    riskTheme: "Privileged account exposure",
    iso27001: "A.9 Access Control",
    nistCsf: "Protect – Identity Management & Access Control",
    cisControls: "CIS Control 5 – Account Management",
    rbi: "Identity and Access Management",
    sebi: "Access Controls"
  },
  {
    riskTheme: "Missing multi-factor authentication",
    iso27001: "A.9.4 System & Application Access Control",
    nistCsf: "Protect – Identity Management & Access Control",
    cisControls: "CIS Control 6 – Access Control Management",
    rbi: "Authentication Framework for Digital Payments",
    sebi: "Access Controls"
  },
  {
    riskTheme: "Unpatched internet-facing systems",
    iso27001: "A.12.6 Technical Vulnerability Management",
    nistCsf: "Protect – Maintenance",
    cisControls: "CIS Control 7 – Continuous Vulnerability Management",
    rbi: "Patch & Vulnerability Management",
    sebi: "Vulnerability Assessment & Penetration Testing"
  },
  {
    riskTheme: "Exposed database / cloud storage",
    iso27001: "A.13 Communications Security",
    nistCsf: "Protect – Data Security",
    cisControls: "CIS Control 3 – Data Protection",
    rbi: "Network & Database Security",
    sebi: "Data Security & Data Localisation"
  },
  {
    riskTheme: "Ransomware / backup gaps",
    iso27001: "A.12.3 Backup",
    nistCsf: "Recover – Recovery Planning",
    cisControls: "CIS Control 11 – Data Recovery",
    rbi: "Business Continuity & Disaster Recovery",
    sebi: "Business Continuity Planning"
  },
  {
    riskTheme: "Third-party / remote vendor access",
    iso27001: "A.15 Supplier Relationships",
    nistCsf: "Identify – Supply Chain Risk Management",
    cisControls: "CIS Control 15 – Service Provider Management",
    rbi: "Third-Party / Vendor Risk Management",
    sebi: "Third-Party Risk Management"
  }
];

/* ---------------------------------------------------------
   5. localStorage KEYS
   --------------------------------------------------------- */
const STORAGE_KEYS = {
  ASSETS: "cyberrisk_ai_assets",
  VULNERABILITIES: "cyberrisk_ai_vulnerabilities",
  INVESTMENTS: "cyberrisk_ai_investments",
  SELECTED_INVESTMENTS: "cyberrisk_ai_selected_investments",
  BUDGET: "cyberrisk_ai_budget"
};

/* ---------------------------------------------------------
   6. CORE DATA FUNCTIONS (globally accessible)
   ---------------------------------------------------------
   These act as the "API layer" of the app since there is no
   real backend. app.js and other modules call these instead
   of touching localStorage directly.
   --------------------------------------------------------- */

/**
 * Loads assets from localStorage. If nothing is saved yet,
 * seeds localStorage with DEFAULT_ASSETS and returns those.
 * @returns {Array<Object>} array of asset objects
 */
function loadAssets() {
  const stored = localStorage.getItem(STORAGE_KEYS.ASSETS);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (e) {
      console.warn("Could not parse stored assets, falling back to defaults.", e);
    }
  }
  // Nothing valid stored yet -> seed with defaults
  saveAssets(DEFAULT_ASSETS);
  return JSON.parse(JSON.stringify(DEFAULT_ASSETS));
}

/**
 * Saves the full assets array to localStorage.
 * @param {Array<Object>} assets
 */
function saveAssets(assets) {
  localStorage.setItem(STORAGE_KEYS.ASSETS, JSON.stringify(assets));
}

/**
 * Loads vulnerabilities from localStorage (seeding defaults on first run).
 * @returns {Array<Object>}
 */
function loadVulnerabilities() {
  const stored = localStorage.getItem(STORAGE_KEYS.VULNERABILITIES);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (e) {
      console.warn("Could not parse stored vulnerabilities, falling back to defaults.", e);
    }
  }
  saveVulnerabilities(DEFAULT_VULNERABILITIES);
  return JSON.parse(JSON.stringify(DEFAULT_VULNERABILITIES));
}

/**
 * Saves vulnerabilities array to localStorage.
 * @param {Array<Object>} vulnerabilities
 */
function saveVulnerabilities(vulnerabilities) {
  localStorage.setItem(STORAGE_KEYS.VULNERABILITIES, JSON.stringify(vulnerabilities));
}

/**
 * Loads investments from localStorage (seeding defaults on first run).
 * @returns {Array<Object>}
 */
function loadInvestments() {
  const stored = localStorage.getItem(STORAGE_KEYS.INVESTMENTS);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (e) {
      console.warn("Could not parse stored investments, falling back to defaults.", e);
    }
  }
  saveInvestments(DEFAULT_INVESTMENTS);
  return JSON.parse(JSON.stringify(DEFAULT_INVESTMENTS));
}

/**
 * Saves investments array to localStorage.
 * @param {Array<Object>} investments
 */
function saveInvestments(investments) {
  localStorage.setItem(STORAGE_KEYS.INVESTMENTS, JSON.stringify(investments));
}

/**
 * Returns the static prototype framework mapping (not user-editable).
 * @returns {Array<Object>}
 */
function loadComplianceMapping() {
  return JSON.parse(JSON.stringify(COMPLIANCE_MAPPING));
}

/**
 * Adds a new asset to the stored assets array.
 * @param {Object} newAsset - must include at least a "name" field.
 *   Any missing numeric fields default to safe values.
 * @returns {Array<Object>} the updated assets array
 */
function addAsset(newAsset) {
  const assets = loadAssets();

  const asset = {
    id: newAsset.id || generateAssetId(assets),
    name: newAsset.name || "Unnamed Asset",
    type: newAsset.type || "Other",
    organization: newAsset.organization || "Unassigned Business Unit",
    criticality: clampScale(newAsset.criticality, 3),
    vulnerabilitySeverity: clampScale(newAsset.vulnerabilitySeverity, 3),
    exposure: clampScale(newAsset.exposure, 3),
    controlEffectiveness: clampProbability(newAsset.controlEffectiveness, 0.5),
    downtimeCost: toNonNegativeNumber(newAsset.downtimeCost, 0),
    dataLossCost: toNonNegativeNumber(newAsset.dataLossCost, 0),
    recoveryCost: toNonNegativeNumber(newAsset.recoveryCost, 0)
  };

  assets.push(asset);
  saveAssets(assets);
  return assets;
}

/**
 * Updates an existing asset (by id) with new field values.
 * @param {string} assetId
 * @param {Object} updatedFields - partial object of fields to overwrite
 * @returns {Array<Object>} the updated assets array
 */
function updateAsset(assetId, updatedFields) {
  const assets = loadAssets();
  const index = assets.findIndex(a => a.id === assetId);
  if (index === -1) {
    console.warn(`updateAsset: no asset found with id ${assetId}`);
    return assets;
  }

  const merged = Object.assign({}, assets[index], updatedFields);

  // Re-validate numeric fields so bad input never breaks calculations
  merged.criticality = clampScale(merged.criticality, assets[index].criticality);
  merged.vulnerabilitySeverity = clampScale(merged.vulnerabilitySeverity, assets[index].vulnerabilitySeverity);
  merged.exposure = clampScale(merged.exposure, assets[index].exposure);
  merged.controlEffectiveness = clampProbability(merged.controlEffectiveness, assets[index].controlEffectiveness);
  merged.downtimeCost = toNonNegativeNumber(merged.downtimeCost, assets[index].downtimeCost);
  merged.dataLossCost = toNonNegativeNumber(merged.dataLossCost, assets[index].dataLossCost);
  merged.recoveryCost = toNonNegativeNumber(merged.recoveryCost, assets[index].recoveryCost);

  assets[index] = merged;
  saveAssets(assets);
  return assets;
}

/**
 * Deletes an asset by id.
 * @param {string} assetId
 * @returns {Array<Object>} the updated assets array
 */
function deleteAsset(assetId) {
  const assets = loadAssets().filter(a => a.id !== assetId);
  saveAssets(assets);
  return assets;
}

/**
 * Resets assets, vulnerabilities and investments back to the
 * original sample data set, and clears manual investment
 * selections/budget. Used by the "Reset Demo Data" button.
 */
function resetSampleData() {
  saveAssets(DEFAULT_ASSETS);
  saveVulnerabilities(DEFAULT_VULNERABILITIES);
  saveInvestments(DEFAULT_INVESTMENTS);
  localStorage.removeItem(STORAGE_KEYS.SELECTED_INVESTMENTS);
  localStorage.removeItem(STORAGE_KEYS.BUDGET);
}

/* ---------------------------------------------------------
   7. BUDGET & INVESTMENT SELECTION PERSISTENCE
   ---------------------------------------------------------
   The Investment page lets a user tick individual investments
   by hand (see app.js), independent of the automatic optimizer.
   These two helpers persist that manual selection and the
   current budget so they survive a page refresh.
   --------------------------------------------------------- */

/**
 * @returns {Array<string>} array of selected investment ids
 */
function loadSelectedInvestmentIds() {
  const stored = localStorage.getItem(STORAGE_KEYS.SELECTED_INVESTMENTS);
  if (!stored) return [];
  try {
    return JSON.parse(stored);
  } catch (e) {
    return [];
  }
}

/**
 * @param {Array<string>} ids
 */
function saveSelectedInvestmentIds(ids) {
  localStorage.setItem(STORAGE_KEYS.SELECTED_INVESTMENTS, JSON.stringify(ids));
}

/**
 * @returns {number} the last budget the user entered, or the
 *   default demo budget of ₹10,00,000 if none was saved yet.
 */
function loadBudget() {
  const stored = localStorage.getItem(STORAGE_KEYS.BUDGET);
  const num = Number(stored);
  return stored && !isNaN(num) ? num : 1000000;
}

/**
 * @param {number} budget
 */
function saveBudget(budget) {
  localStorage.setItem(STORAGE_KEYS.BUDGET, String(Number(budget) || 0));
}

/* ---------------------------------------------------------
   8. INDIAN CURRENCY FORMATTING
   ---------------------------------------------------------
   All financial values in this application are displayed in
   Indian Rupees using the Indian numbering system (lakh/crore
   grouping), never $ / USD / EUR / GBP.

   Examples:
     formatINR(500000)    -> "₹5,00,000"
     formatINR(1250000)   -> "₹12,50,000"
     formatINR(10000000)  -> "₹1,00,00,000"

   This function is used by app.js and aiAnalyst.js everywhere
   a rupee amount is shown, so formatting stays consistent
   across the whole dashboard.
   --------------------------------------------------------- */
function formatINR(value) {
  const num = Number(value) || 0;
  const isNegative = num < 0;
  const rounded = Math.round(Math.abs(num));

  const str = String(rounded);
  const lastThree = str.substring(str.length - 3);
  const otherNumbers = str.substring(0, str.length - 3);

  let formatted;
  if (otherNumbers !== "") {
    // Insert a comma every 2 digits (from the right) in the "other" part,
    // which is how the Indian numbering system groups lakhs and crores.
    formatted = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + "," + lastThree;
  } else {
    formatted = lastThree;
  }

  return (isNegative ? "-₹" : "₹") + formatted;
}

/* ---------------------------------------------------------
   9. SMALL VALIDATION / UTILITY HELPERS
   --------------------------------------------------------- */

/**
 * Generates the next sequential asset id (e.g. A011, A012...).
 * @param {Array<Object>} existingAssets
 * @returns {string}
 */
function generateAssetId(existingAssets) {
  let max = 0;
  existingAssets.forEach(a => {
    const num = parseInt(String(a.id).replace(/\D/g, ""), 10);
    if (!isNaN(num) && num > max) max = num;
  });
  const next = max + 1;
  return "A" + String(next).padStart(3, "0");
}

/**
 * Clamps a 1-5 style rating field. Falls back to fallbackValue
 * if the input is not a valid number.
 */
function clampScale(value, fallbackValue) {
  const num = Number(value);
  if (isNaN(num)) return fallbackValue;
  return Math.min(5, Math.max(1, num));
}

/**
 * Clamps a 0-1 probability/effectiveness field.
 */
function clampProbability(value, fallbackValue) {
  const num = Number(value);
  if (isNaN(num)) return fallbackValue;
  return Math.min(1, Math.max(0, num));
}

/**
 * Ensures a currency/cost field is a non-negative number.
 */
function toNonNegativeNumber(value, fallbackValue) {
  const num = Number(value);
  if (isNaN(num) || num < 0) return fallbackValue;
  return num;
}

/**
 * Returns the vulnerabilities that belong to a specific asset.
 * Used by the AI Risk Analyst to explain "why" an asset is risky.
 * @param {string} assetId
 * @returns {Array<Object>}
 */
function getVulnerabilitiesForAsset(assetId) {
  return loadVulnerabilities().filter(v => v.assetId === assetId);
}
