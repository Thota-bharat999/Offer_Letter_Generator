# Onboarding System Implementation TODO

## 1. Create Onboarding Model
- [x] Create `offer_letter/models/Onboarding.js` with schema for candidate info, type (fresher/experienced), conditional fields, status, attachments array, etc.

## 2. Create Onboarding Controller
- [x] Create `offer_letter/controllers/onboardingController.js` with methods:
  - [x] createCandidate (POST /api/onboarding)
  - [x] updateCandidate (PATCH /api/onboarding/:id)
  - [x] getCandidate (GET /api/onboarding/:id)
  - [x] getAllCandidates (GET /api/onboarding with filters)
  - [x] deleteCandidate (DELETE /api/onboarding/:id)
  - [x] uploadDocument (POST /api/onboarding/:id/upload)
  - [x] generateOfferPDF (POST /api/onboarding/:id/generate-offer)
  - [x] updateStatus (PATCH /api/onboarding/:id/status)
  - [x] getDashboardSummary (GET /api/onboarding/dashboard/summary)
  - [x] generateFullPacket (POST /api/onboarding/:id/generate-full-packet)

## 3. Create Onboarding Routes
- [x] Create `offer_letter/routes/onboardingRoutes.js` with all routes, using verifyToken middleware.

## 4. Update Server.js
- [x] Add onboarding routes to server.js: `app.use('/api/onboarding', onboardingRoutes)`

## 5. Create Full Packet PDF Generator
- [x] Create `offer_letter/utils/fullPacketPdfGenerator.js` to generate PDF with offer + attachments.

## 6. Create Full Packet EJS Template
- [x] Create `offer_letter/templates/fullPacket.ejs` for rendering offer with attachments.

## 7. Ensure Uploads Folder
- [x] Create `offer_letter/uploads/onboarding/` folder for attachments.

## 8. Testing and Integration
- [x] Test all APIs, file uploads, PDF generations.
- [x] Ensure no changes to existing offer, relieving, appointment systems.
