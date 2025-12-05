# 🏥 Project: Healthcare Ad Compliance Validator (Bounty 2500)

**Mission:** Build an AI compliance gate that checks healthcare ads against strict policies (ASC/Meta) before they go live.
**Status:** 🚧 In Progress

---

## 🔴 Phase 1: MVP Requirements (Must-Haves)
*Required to mark the bounty as "Solved". Focus on getting these green first.*

### 1. Inputs & Frontend Form
- [ ] **Submission Form:** Create a UI with fields for:
  - [ ] Marketing Copy (Text Area)
  - [ ] Image Input (File Upload or URL)
- [ ] **Context Fields:** Add dropdowns for:
  - [ ] `Platform Target` (e.g., Meta, TikTok, Google Ads)
  - [ ] `Product Category` (e.g., Weight Loss, Skin Care)

### 2. Core Logic (The Brain)
- [ ] **Vision API Integration (General):** Detect "Potential Nudity" or "Sensitive Visuals" (SafeSearch).
- [ ] **Vision API Integration (Specific):** Implement logic to detect:
  - [ ] "Before/After" comparisons (Text OCR or Layout analysis).
  - [ ] "Overly negative body imagery" (Face emotion/Medical detection).
- [ ] **LLM Policy Rules:** System prompt must encode "Prohibited claims" (e.g., *cure, miracle, guaranteed*).
- [ ] **LLM Disclaimers:** Logic to enforce required disclaimers (e.g., *"Consult your doctor"*, *"Rx required"*).
- [ ] **Platform Specifics:** Apply stricter system prompt rules if "Meta" is selected.
- [ ] **Structured Output:** Ensure backend returns strict JSON containing:
  - `severity`, `policy_reference`, and `fix_suggestion`.

### 3. UI / Reporting
- [ ] **Compliance Score:** Display an Overall Score (0–100%) and a clear **Pass/Fail** status.
- [ ] **Quality Gate Visuals:** UI must show clear **Red / Yellow / Green** states based on the score.
- [ ] **Violation List:** Render a list of violations with Severity Tags (**Critical** / **Warning** / **Info**).
- [ ] **Fix Suggestions:** Display the AI's "Suggested alternative wording" (Don't just say 'No').
- [ ] **Policy References:** Display the specific rule cited (e.g., *"Policy 4.2 – Prohibited cure claims"*).

### 4. Demo & Validation
- [ ] **End-to-End Run:** Verify the tool correctly flags a known **non-compliant** ad and suggests valid changes.

---

## 🟡 Phase 2: Bonus / Advanced (Optional)
*Tackle these for extra credit only after Phase 1 is stable.*

### Backend Enhancements
- [ ] **Formal JSON Schema:** Implement strict schema validation (e.g., Pydantic) for violation outputs.
- [ ] **Policy Database:** Use **SQLite/JSON** to store rules that inject into the prompt (making them updatable without code changes).
- [ ] **API Endpoint:** Create a simple REST endpoint to allow integration with "Content Studio" (Bounty 2).

### UX & Analytics
- [ ] **Visual Highlighting:** Add inline text highlighting or image bounding boxes for violations.
- [ ] **Batch Processing:** Allow checking multiple ad variants in a single request/CSV.
- [ ] **History / Dashboard:** Show basic stats on "Most common violation types" or trends over time.

---

## 🛠 Developer Notes
* **Tech Stack:** Python (FastAPI/Flask + Streamlit recommended for speed).
* **Vision API:** Use Google Cloud Vision for best OCR (Before/After text) and SafeSearch.
* **LLM:** Use a model capable of strong instruction following (e.g., GPT-4o or Claude 3.5) to adhere to the JSON schema.