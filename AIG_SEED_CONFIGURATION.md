# AIG Hospital — WhatsApp Automation Seed Configuration Guide

> **Project:** AIG WA BOT (Configuration-Driven Multi-Agent WhatsApp Automation Platform)  
> **Tenant / Deployment:** AIG Hospitals (Hyderabad) — Patient Assistance Center Bangladesh (PACB)  
> **Architecture Principle:**  
> - **Tools & APIs:** For dynamic, real-time data (Doctor Rosters, Live OPD Schedules, Dynamic Treatment Cost Estimates, Appointment Registration).  
> - **Knowledge Base:** For fixed, permanent organizational knowledge (Hospital Campus Logistics, Bangladesh PACB Desks, Medical Visa Regulations, In-Patient Policies, First Visit FAQs).

---

## 1. AI Agents (`ai_agents`)

Configure these agents in **Dashboard > AI Agents > Create Agent**:

### Agent 1: AIG Main Assistant
* **Name:** `AIG Main Assistant`
* **Model:** `openai/gpt-oss-20b`
* **Temperature:** `0.3`
* **Language:** `english`
* **Description:** Primary assistant for hospital inquiries, doctor discovery, consultation costs, and appointments.
* **System Prompt:**
```text
You are the primary AI Assistant for AIG Hospitals (Asian Institute of Gastroenterology, Hyderabad) - Patient Assistance Center Bangladesh (PACB).

Your responsibilities:
1. Provide accurate, welcoming, and professional assistance to patients and attendants in English.
2. For Doctor Schedules and Availability: Call the `search_doctors` API tool to retrieve real-time specialist profiles and OPD timings.
3. For Treatment and Procedure Costs: Call the `get_cost_estimate` API tool to provide up-to-date pricing quotes.
4. For Hospital Logistics, Visa Guidelines, and Local Desk details: Refer to your Knowledge Base.
5. If a user wants to book an appointment or request a medical visa, guide them to complete the respective automated workflow.
6. If a patient expresses urgent distress or explicitly requests human assistance, transfer them to a human coordinator.

STRICT MEDICAL GUARDRAILS:
- You MUST NOT provide clinical prescriptions, drug dosages, or diagnostic medical opinions.
- Always recommend consulting an AIG specialist doctor in person or via teleconsultation with official medical reports.
```

---

### Agent 2: Visa & Coordination Specialist
* **Name:** `Visa & Coordination Specialist`
* **Model:** `openai/gpt-oss-20b`
* **Temperature:** `0.2`
* **Language:** `english`
* **Description:** Specialist agent handling medical visa invitation letters, required travel documents, and Bangladesh desk inquiries.
* **System Prompt:**
```text
You are the dedicated Medical Visa & Travel Coordinator for AIG Hospitals Hyderabad - Bangladesh Patient Assistance Center.

Your responsibilities:
1. Explain the step-by-step procedure for obtaining an official AIG Medical Visa Invitation Letter using Knowledge Base guidelines.
2. Outline the exact required documents:
   - Clear passport copies of the patient and up to two attendants (minimum 6 months validity).
   - Recent doctor prescription/medical summary from a registered doctor in Bangladesh (issued within the last 3 months).
   - Proposed date of arrival in Hyderabad.
3. Assist patients with local Bangladesh desk addresses (Dhaka & Chittagong) for document submission and physical verification.
4. Keep answers concise, bulleted, and easy to read on WhatsApp.
```

---

## 2. Skills & Teams (`agent_teams`)

Configure these in **Dashboard > Team & Agents > Skills & Teams > Add Team / Skill**:

| Team / Skill Name | Description |
| :--- | :--- |
| **Patient Coordination Desk** | General patient inquiries, OPD schedules, doctor discovery, and booking confirmations. |
| **Medical Visa Team** | Document verification, passport scrutiny, and issuing hospital visa invitation letters. |
| **Bangladesh Regional Desk** | In-person support and local inquiries for Dhaka and Chittagong assistance centers. |

---

## 3. Human Agents (`human_agents`)

Configure these in **Dashboard > Team & Agents > Add Agent**:

| Name | Email | Assigned Team | Max Concurrent Chats |
| :--- | :--- | :--- | :--- |
| **Kazi Tanvir (Coordinator)** | `tanvir.pacb@aig.com` | Patient Coordination Desk | 10 |
| **Nusrat Jahan (Visa Specialist)** | `visa.bangladesh@aig.com` | Medical Visa Team | 10 |
| **AIG Dhaka Desk Manager** | `dhaka.office@aig.com` | Bangladesh Regional Desk | 15 |

---

## 4. Intents (`intents`)

Configure these in **Dashboard > Intents > Add Intent**:

### 1. Doctor Information
* **Name:** `Doctor Information`
* **Slug:** `doctor_information`
* **Router Description:** `Trigger when the user asks about doctors, consultants, hepatologists, gastroenterologists, specialists, or OPD days and times.`
* **Action when matched:** `Route to AI Agent` -> Select `AIG Main Assistant`

### 2. Doctor Appointment
* **Name:** `Doctor Appointment`
* **Slug:** `doctor_appointment`
* **Router Description:** `Trigger when the user wants to book, schedule, or request an appointment with a doctor or department.`
* **Action when matched:** `Run Workflow` -> Select `Book Doctor Appointment`

### 3. Medical Visa Assistance
* **Name:** `Medical Visa Assistance`
* **Slug:** `medical_visa`
* **Router Description:** `Trigger when the user asks about Indian medical visa requirements, invitation letters, travel documents, or visa processing.`
* **Action when matched:** `Run Workflow` -> Select `Medical Visa Assistance`

### 4. Treatment Cost Estimate
* **Name:** `Treatment Cost Estimate`
* **Slug:** `cost_estimation`
* **Router Description:** `Trigger when the user asks about treatment packages, OPD consultation charges, surgery cost estimates, endoscopy/colonoscopy pricing, or payment modes.`
* **Action when matched:** `Route to AI Agent` -> Select `AIG Main Assistant`

### 5. Bangladesh Regional Office
* **Name:** `Bangladesh Regional Office`
* **Slug:** `bangladesh_office`
* **Router Description:** `Trigger when the user asks for Dhaka or Chittagong office address, local contact phone number, or meeting representatives in Bangladesh.`
* **Action when matched:** `Route to AI Agent` -> Select `AIG Main Assistant`

### 6. Human Handoff / Talk to Agent
* **Name:** `Talk to Human Agent`
* **Slug:** `human_handoff`
* **Router Description:** `Trigger when the user specifically requests to talk to a human agent, coordinator, representative, or has an emergency situation.`
* **Action when matched:** `No Action` *(Backend automatically executes handoff escalation)*

---

## 5. Workflows & Steps (`workflows` & `workflow_steps`)

Configure these in **Dashboard > Workflows > Create Workflow**:

### Workflow 1: Book Doctor Appointment
* **Name:** `Book Doctor Appointment`
* **Trigger Type:** `INTENT`
* **Description:** Step-by-step patient intake workflow for appointment bookings.
* **Steps:**
  1. **Step 1 (Ask Question):**
     - Prompt: `Please provide the patient's full name and age.`
     - Variable Name: `patient_name_age`
  2. **Step 2 (Ask Question):**
     - Prompt: `Which department or specialist doctor would you like to consult?`
     - Variable Name: `preferred_doctor_dept`
  3. **Step 3 (Ask Question):**
     - Prompt: `What is your preferred appointment date or time window?`
     - Variable Name: `preferred_date`
  4. **Step 4 (Send Message):**
     - Message: `Thank you! Your appointment request has been recorded. Our Patient Assistance Team will contact you shortly with confirmation details.`

### Workflow 2: Medical Visa Assistance
* **Name:** `Medical Visa Assistance`
* **Trigger Type:** `INTENT`
* **Description:** Collects passenger and attendant details for visa invitation letter processing.
* **Steps:**
  1. **Step 1 (Send Message):**
     - Message: `To issue an official AIG Hospital Medical Visa Invitation Letter, we require clear passport copies of the patient and attendant, along with a recent doctor's prescription.`
  2. **Step 2 (Ask Question):**
     - Prompt: `Will any attendants be accompanying the patient? If yes, please provide their number and full names as written on their passports.`
     - Variable Name: `attendant_details`
  3. **Step 3 (Send Message):**
     - Message: `Thank you! Your information has been forwarded to our Visa Desk. Our coordinators will review your documents and prepare the official visa invitation letter within 24 hours.`

---

## 6. Tools & APIs (`tools`) — Dynamic Data Layer

Configure these in **Dashboard > Tools & APIs > Create Tool**:

> **Note:** Real-time, fluctuating data such as live doctor rosters, changing OPD days, and exact package cost estimates are delegated to APIs rather than static text.

### Tool 1: `search_doctors`
* **Name:** `search_doctors`
* **Tool Type:** `REST_API`
* **Description:** `Queries the live AIG Hospital physician directory by specialty, department, or doctor name. Returns active consultants, qualifications, OPD days, and chamber timings.`
* **Input Parameters:**
  - `department` (string, optional): e.g. "Gastroenterology", "Hepatology"
  - `doctor_name` (string, optional): e.g. "Dr. Nageshwar Reddy"
* **Status:** Enabled

### Tool 2: `get_cost_estimate`
* **Name:** `get_cost_estimate`
* **Tool Type:** `REST_API`
* **Description:** `Retrieves real-time official cost estimates for outpatient investigations, procedures (Endoscopy, Colonoscopy, ERCP, FibroScan), surgeries, and room packages.`
* **Input Parameters:**
  - `procedure_name` (string): e.g. "Endoscopy", "Colonoscopy", "OPD Consultation"
* **Status:** Enabled

### Tool 3: `book_appointment`
* **Name:** `book_appointment`
* **Tool Type:** `REST_API`
* **Description:** `Submits verified patient appointment intake details directly to the hospital scheduling gateway.`
* **Input Parameters:**
  - `patient_name` (string)
  - `doctor_id` (string)
  - `preferred_date` (string)
* **Status:** Enabled

---

## 7. Knowledge Base (`knowledge_sources`) — Fixed Static Knowledge

Configure these in **Dashboard > Knowledge Base > Add Knowledge**:

> **Note:** Only fixed, stable hospital policies, office locations, visa guidelines, and travel logistics are stored here.

### Source 1: Hospital Campus & Location Guidelines
* **Name:** `AIG Campus Location & Travel Logistics`
* **Category:** `General`
* **Type:** `TEXT`
* **Content:**
```text
AIG Hospitals Main Campus Overview:
- Full Name: Asian Institute of Gastroenterology (AIG Hospitals).
- Main Address: 1-66/AIG/2 to 9, Mindspace Road, Gachibowli, Hyderabad, Telangana 500032, India.
- Operating Hours: Outpatient Clinics (Monday - Saturday: 8:00 AM - 6:00 PM). Emergency & Trauma: 24/7.

Travel & Commute Details:
- Distance from Rajiv Gandhi International Airport (HYD): Approximately 30 km (35-45 minutes via Outer Ring Road).
- Pre-paid Taxi & Ride-sharing: Uber, Ola, and airport pre-paid taxis operate directly to AIG Hospitals Gachibowli.
- Landmark: Near IKEA Hyderabad & Mindspace IT Park.
```

### Source 2: Bangladesh PACB Information Desks
* **Name:** `Bangladesh Patient Assistance Centers (PACB)`
* **Category:** `General`
* **Type:** `TEXT`
* **Content:**
```text
AIG Hospitals - Patient Assistance Center Bangladesh (PACB):

Dhaka Regional Center:
- Address: House #12, Road #4, Dhanmondi R/A, Dhaka-1205, Bangladesh.
- Operating Hours: Saturday - Thursday, 10:00 AM - 6:00 PM (Closed on Friday).
- In-person Services: Document verification, Medical Visa Invitation Letter collection, and appointment guidance.

Chittagong Regional Help Desk:
- Address: GEC Circle, O.R. Nizam Road, Chittagong, Bangladesh.
- Operating Hours: Sunday - Thursday, 10:00 AM - 5:00 PM.

Helplines:
- Official WhatsApp / Contact: +880 1700-000000 / +880 1800-000000
- Official Support Email: bangladesh.desk@aighospitals.com
```

### Source 3: Indian Medical Visa & Attendant Protocol
* **Name:** `Medical Visa Regulations & Checklist`
* **Category:** `Visa`
* **Type:** `TEXT`
* **Content:**
```text
Guidelines for Indian Medical Visa (MED) & Medical Attendant Visa (MED X):

Visa Invitation Letter Eligibility:
1. Patient must hold a valid passport with at least 6 months validity from date of travel.
2. Patient must provide a recent medical prescription/summary from a registered doctor in Bangladesh (issued within the last 3 months).
3. Maximum 2 medical attendants (family members) are permitted per patient under MED X visa category.

Process:
- Once documents are submitted via WhatsApp or the Bangladesh desk, AIG International Patient Care issues the official Visa Invitation Letter on hospital letterhead within 24 business hours.
- This letter must be submitted along with the visa application at the nearest Indian Visa Application Center (IVAC).
```

### Source 4: In-Patient Facilities & International Patient Services
* **Name:** `Hospital Amenities & International Patient Support`
* **Category:** `Facilities`
* **Type:** `TEXT`
* **Content:**
```text
AIG Hospitals International Patient Services:

1. Language Assistance:
- Multilingual patient coordinators fluent in Bengali, Hindi, and English are present at the International Patient Lounge to assist Bangladeshi patients throughout their visit.

2. Financial & Currency Services:
- Authorized Foreign Exchange (Forex) counter available on the ground floor for INR conversion (USD, BDT).
- International Credit and Debit Cards (Visa, MasterCard, American Express) are accepted at all billing counters.

3. Accommodation & Food:
- Dedicated international cafeteria serving hygienic meals suitable for international diets.
- Numerous budget hotels and serviced guest houses within 1 km walking distance of the hospital in Gachibowli.
```

### Source 5: First Visit Preparation Checklist
* **Name:** `First Consultation Patient Checklist`
* **Category:** `Preparation`
* **Type:** `TEXT`
* **Content:**
```text
Checklist for Your First Visit to AIG Hospitals:

What to Bring:
1. Original Passport, Indian Visa, and 2 passport-sized photographs.
2. Complete historical medical files, previous discharge summaries, and prescriptions.
3. Radiology CD/DVDs (CT Scan, MRI, Ultrasound) and original biopsy glass slides/blocks (if applicable).

Preparation Advice:
- Fasting: For routine abdominal ultrasound, endoscopy, or morning blood tests, please arrive with 8 hours of overnight fasting (water is usually permitted unless instructed otherwise).
```

---

## 8. Summary of Dynamic vs Static Flow

```text
                                [WhatsApp User Message]
                                           │
                                           ▼
                                    [Router Agent]
                                           │
                 ┌─────────────────────────┴────────────────────────┐
                 ▼                                                  ▼
     [Dynamic Intent / Query]                           [Fixed Information Intent]
   (Doctors, Costs, Booking)                          (Location, Visa Rules, Desks)
                 │                                                  │
                 ▼                                                  ▼
        [Tools & APIs Layer]                            [Knowledge Base Layer]
  - search_doctors (Live API)                      - Campus Address & Airport Route
  - get_cost_estimate (Live API)                   - Bangladesh Dhaka/Ctg Desks
  - book_appointment (Booking Engine)              - Medical Visa & Attendant Rules
                 │                                 - Amenities & Bengali Translators
                 │                                                  │
                 └─────────────────────────┬────────────────────────┘
                                           ▼
                            [AIG Main Assistant Response]
                                           │
                                           ▼
                                 [WhatsApp User Reply]
```
