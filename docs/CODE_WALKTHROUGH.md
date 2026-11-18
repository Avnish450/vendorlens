# VendorLens — Code Walkthrough & 5-Minute Demo Script

> This document guides you through the VendorLens codebase architecture and provides an exact 5-minute click-through demonstration sequence.

---

## 🧭 Architecture Walkthrough by Layer

### 1. The Database Layer (`prisma/schema.prisma` & `lib/db.ts`)
- **Single-File Zero Setup**: Uses SQLite via Prisma (`prisma/vendorlens.db`). Zero external database processes or Docker containers needed.
- **Data Models**:
  - `Vendor`: Core vendor metadata, category, declared products, and business criticality (`Low`, `Medium`, `High`).
  - `ScanResult`: Stores historical snapshots of overall score, letter grade, signal coverage %, risk tier, and offline cache flags.
  - `Finding`: Stores individual security checks with raw values, factual evidence, confidence level, timestamp, and recommended fixes.
  - `ScoreHistory`: Tracks 60 days of historical scores for line trend visualizations.
  - `Alert`: Real-time notifications for score drops, CISA KEV detections, or expiring certificates.
  - `RemediationItem`: Prioritized action items derived from failing findings.
  - `CachedSnapshot`: Offline backup ensuring demo reliability even without internet access.

### 2. The Data Collectors (`lib/collectors/`)
- Every collector implements `CollectorResult`:
  ```typescript
  {
    checkName: string;
    category: 'email_dns' | 'transport' | 'web_hardening' | 'vulnerabilities' | 'exposure';
    status: 'PASS' | 'FAIL' | 'UNKNOWN';
    severity: 'Critical' | 'High' | 'Medium' | 'Low' | 'Info';
    evidence: string;
    sourceUrl: string;
    rawValue: string;
    confidence: 'High' | 'Medium' | 'Low';
    whyItMatters: string;
    recommendedFix: string;
  }
  ```
- **Error Isolation**: Built around `Promise.allSettled` in `orchestrator.ts`. An outage in one public API (e.g. `crt.sh`) never crashes the other checks.
- **SSRF Protection (`lib/ssrf.ts`)**: Resolves hostnames and blocks private RFC 1918 subnets, loopbacks, and link-local cloud metadata IPs.

### 3. The Deterministic Scoring Engine (`lib/scoring.ts`)
- Single, well-documented file implementing the exact weighted formula:
  - Email & DNS: 20%
  - Transport Security: 20%
  - Web Hardening: 15%
  - Known Exploited Vulnerabilities: 30%
  - Exposure & Hygiene: 15%
- `UNKNOWN` signals never cause point deductions; they lower the `coverage` percentage instead.

### 4. Grounded AI & Template Briefing (`lib/ai-summary.ts`)
- If `ANTHROPIC_API_KEY` or `GEMINI_API_KEY` is present, prompts the LLM with strict grounding constraints: "Base statements ONLY on verified findings. Cite check names. State 'Insufficient data' if unknown. Never speculate."
- If no key is set, generates a deterministic, professional executive summary template.

### 5. Report Generators (`lib/pdf.ts` & `lib/csv.ts`)
- `generateVendorPdf`: Uses `jspdf` and `jspdf-autotable` to format a vector PDF with score banners, grade badges, metadata, and full findings tables.
- `generatePortfolioCsv`: Produces an RFC 4180 CSV export of all vendors and scores.

---

## 🎬 Suggested 5-Minute Demo Script

Follow this exact sequence for a high-impact presentation:

### [0:00 – 1:00] Screen 1: Dashboard (`/`)
1. **Explain the Problem**: *"Companies rely on hundreds of third-party vendors, but questionnaires take 4 weeks and go stale immediately."*
2. **Point out the KPIs**: Show **Average Risk Score (81/100)**, **Active Vendors (12)**, and **Critical Attention (2)**.
3. **Show Portfolio Gauge & Donut Chart**: Highlight the deterministic score and breakdown across Low, Medium, and High risk tiers.
4. **Point to 30-Day Score Drops**: Point to **Epic Systems (-16 pts drop)** caused by newly published CISA KEV vulnerability data.
5. **Point to Top Priority Queue**: Show how vendors with High business criticality are ranked first.

### [1:00 – 2:00] Screen 2: Vendor Directory (`/vendors`)
1. **Search & Filter**: Type `"Cloudflare"` in the search bar. Show instant filtering.
2. **Filter by Criticality**: Select `"High Criticality"` to view core payment and healthcare vendors.
3. **Filter by Risk Tier**: Select `"High Risk (40-64)"` to immediately isolate **Epic Systems** and **Braintree**.
4. **Show Stale Indicator**: Point out the clock icon highlighting scans older than 7 days.
5. **Click "Inspect"** on **Epic Systems**.

### [2:00 – 3:15] Screen 3: Vendor Risk Dossier (`/vendors/[id]`)
1. **Explain the Semi-Circular Score Gauge**: Show the score (56/100, Grade D, High Risk).
2. **Show the 60-Day Score Trajectory**: Point to the drop in the line chart where the score decreased from 72 to 56.
3. **Show Category Breakdown**: Explain how **Known Exploited Vulnerabilities (0/100)** dragged down the weighted score.
4. **Generate Executive Brief**: Click **"Generate Brief"**. Show the grounded summary citing exact check findings without speculation.
5. **Explore Findings Table**:
   - Filter by **"Failing"** checks.
   - Click to expand **"CISA KEV Match"**.
   - Show the raw evidence (`CVE-2023-38606`), why it matters, and recommended fix.
6. **Trigger "Live Re-Scan"**: Click the **Live Re-Scan** button. Watch the animated progress bar run through all 7 collectors with offline fallback safety net.
7. **Download PDF Report**: Click **"Export PDF Report"** and show the downloaded report.

### [3:15 – 4:00] Screen 4: Prioritized Remediation Queue (`/remediation`)
1. **Explain Priority Ranking**: Highlight that `Priority = Check Severity × Vendor Criticality`.
2. **Show Actionable Cards**: The top item is the critical CISA KEV match on Epic Systems because Epic has **High** criticality.
3. **Interactive Status Update**: Switch the status from **Open** to **In Review**.
4. **Attach Internal Audit Note**: Click **Edit Note**, type `"Ticket SEC-1049 assigned to Cloud Sec team"`, and click **Save**.

### [4:00 – 4:30] Screen 5: Comparison Matrix (`/compare`)
1. **Side-by-Side Evaluation**: View **Cloudflare (95)** vs **Stripe (97)** vs **Zoom (74)**.
2. **Parity Matrix**: Scroll down to the signal-by-signal verification matrix showing PASS/FAIL indicators side-by-side.

### [4:30 – 5:00] Screen 6: Scoring Methodology & About (`/scoring` & `/about`)
1. **Transparency**: Open **/scoring** and show the documented weights and deduction formulas.
2. **Pricing & Value**: Open **/about** and highlight the 90% reduction in assessment time and predictable tiers.
3. **Closing**: *"VendorLens turns third-party governance from a subjective questionnaire into an automated, verifiable security signal."*
