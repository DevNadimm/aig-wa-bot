# AIG Hospital — WhatsApp Automation Seed Configuration Guide

> **Project:** AIG WA BOT (Configuration-Driven Multi-Agent WhatsApp Automation Platform)  
> **Tenant / Deployment:** AIG Hospitals (Hyderabad) — Patient Assistance Center Bangladesh (PACB)  
> **Modules Covered:** Doctor Discovery, Appointment Booking, Medical Visa Assistance, Treatment Cost Estimation, Regional Office Information, Smart Human Handoff.

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
2. Guide patients to the appropriate medical departments (e.g., Medical Gastroenterology, Surgical Gastroenterology, Hepatology/Liver Care, Medical Oncology, Cardiology).
3. Provide OPD consultation schedules, estimated treatment/investigation costs, and hospital location guidelines based on your Knowledge Base.
4. If a user wants to book an appointment or request a medical visa, guide them to complete the respective automated workflow.
5. If a patient expresses urgent distress or explicitly requests human assistance, transfer them to a human coordinator.

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
1. Explain the step-by-step procedure for obtaining an official AIG Medical Visa Invitation Letter.
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

## 6. Tools & APIs (`tools`)

Configure these in **Dashboard > Tools & APIs > Create Tool**:

| Tool Name | Tool Type | Description |
| :--- | :--- | :--- |
| **`search_doctors`** | `REST_API` | Searches AIG Hospital doctor directory by department, specialty, or condition and returns OPD consultation days and timings. |
| **`book_appointment`** | `REST_API` | Submits validated patient appointment intake information to the hospital booking gateway. |
| **`get_cost_estimate`** | `REST_API` | Fetches standard price estimates for procedures (Endoscopy, Colonoscopy, ERCP, FibroScan, Liver Biopsy). |

---

## 7. Knowledge Base (`knowledge_sources` & `knowledge_documents`)

Configure these in **Dashboard > Knowledge Base > Add Knowledge**:

### Source 1: Doctor Roster & Specialties
* **Name:** `AIG Specialist Doctors & Departments`
* **Category:** `Doctors`
* **Type:** `TEXT`
* **Content:**
```text
AIG Hospitals (Gachibowli, Hyderabad) Leading Specialists:

1. Dr. D. Nageshwar Reddy
- Designation: Chairman & Chief of Gastroenterology
- Expertise: Therapeutic Endoscopy, Advanced Pancreato-Biliary disorders, ERCP
- OPD Schedule: Monday - Saturday (By prior appointment)

2. Dr. Rupa Banerjee
- Designation: Director, IBD Center
- Expertise: Crohn's Disease, Ulcerative Colitis, Inflammatory Bowel Disease
- OPD Schedule: Monday, Wednesday, Friday

3. Dr. P. N. Rao
- Designation: Chief of Hepatology & Liver Care
- Expertise: Chronic Hepatitis, Liver Cirrhosis, Pre & Post Liver Transplant Care
- OPD Schedule: Tuesday, Thursday, Saturday

Consultation Charges:
- General OPD Specialist: ₹1,000 INR
- Senior Consultant / Chief: ₹1,500 INR
- Follow-up within 7 days: Complimentary / Reduced fee
```

### Source 2: Bangladesh PACB Information Desk
* **Name:** `Patient Assistance Center Bangladesh (PACB)`
* **Category:** `General`
* **Type:** `TEXT`
* **Content:**
```text
AIG Hospitals - Patient Assistance Center Bangladesh (PACB):

Dhaka Regional Center:
- Address: House #12, Road #4, Dhanmondi R/A, Dhaka-1205, Bangladesh.
- Hours: Saturday - Thursday, 10:00 AM - 6:00 PM (Closed on Friday).
- Services: Document verification, Medical Visa Invitation Letter collection, Tele-consultation booking.

Chittagong Help Desk:
- Address: GEC Circle, O.R. Nizam Road, Chittagong.
- Hours: Sunday - Thursday, 10:00 AM - 5:00 PM.

Helplines:
- Official WhatsApp: +880 1700-000000 / +880 1800-000000
- Email: bangladesh.desk@aighospitals.com
```

### Source 3: Treatment Cost Estimates & Payment Guidelines
* **Name:** `Diagnostic & Procedure Cost Guide`
* **Category:** `Billing`
* **Type:** `TEXT`
* **Content:**
```text
AIG Hospitals Hyderabad Estimated Diagnostic & Procedure Costs (INR):

Common Diagnostics:
- Outpatient Consultation: ₹1,000 - ₹1,500
- Upper GI Endoscopy (Diagnostic): ₹3,500 - ₹5,500
- Colonoscopy: ₹7,000 - ₹12,000
- FibroScan (Liver stiffness): ₹4,000 - ₹6,000
- Abdominal Ultrasound: ₹1,800 - ₹2,500
- CT Scan (Abdomen with Contrast): ₹8,000 - ₹14,000

Advanced Procedures:
- ERCP (Endoscopic Retrograde Cholangiopancreatography): ₹40,000 - ₹75,000
- Endoscopic Ultrasound (EUS): ₹18,000 - ₹30,000

Payment Policy:
- Accepted: International Credit/Debit Cards (Visa/Mastercard), Wire Transfer (SWIFT), Cash in INR or USD.
- Note: Foreign exchange facilitation desk is available in the main hospital lobby.
```

---

## 8. Summary of Workflow Execution Flow

```text
[WhatsApp User Message]
         │
         ▼
[Router Agent] ─── Classifies Intent
         │
         ├─── "doctor_information"  ──► [AIG Main Assistant] ──► Reads Knowledge Base ──► Answers User
         ├─── "doctor_appointment"  ──► [Book Doctor Appointment Workflow] ──► Collects Name/Date ──► Saves Lead
         ├─── "medical_visa"        ──► [Medical Visa Assistance Workflow] ──► Checklist & Attendant info
         ├─── "cost_estimation"     ──► [AIG Main Assistant] ──► Returns procedure costs
         ├─── "bangladesh_office"   ──► [AIG Main Assistant] ──► Shares Dhaka/Ctg desk addresses
         └─── "human_handoff"       ──► [Handoff Engine] ──► Assigns Human Coordinator in Admin Panel
```
