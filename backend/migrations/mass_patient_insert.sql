-- Mass Patient Entry Script for Sahatak Database
-- 28 Sudanese Patients with Full Information
-- Created: 2025-01-28

-- Insert Users (Arabic and English names)
INSERT INTO users (full_name, email, phone, password_hash, user_type, email_verified, is_active, created_at) VALUES
-- Arabic Names (14 patients)
('أحمد محمد عبدالله', 'ahmed.mohamed@email.com', '+249123456789', '$2b$12$hashedpassword1', 'patient', true, true, NOW()),
('فاطمة عبدالرحمن علي', 'fatima.ali@email.com', '+249123456790', '$2b$12$hashedpassword2', 'patient', true, true, NOW()),
('محمد عثمان حسن', 'mohamed.osman@email.com', '+249123456791', '$2b$12$hashedpassword3', 'patient', true, true, NOW()),
('عائشة إبراهيم محمد', 'aisha.ibrahim@email.com', '+249123456792', '$2b$12$hashedpassword4', 'patient', true, true, NOW()),
('عبدالله أحمد السيد', 'abdullah.ahmed@email.com', '+249123456793', '$2b$12$hashedpassword5', 'patient', true, true, NOW()),
('خديجة محمد صالح', 'khadija.saleh@email.com', '+249123456794', '$2b$12$hashedpassword6', 'patient', true, true, NOW()),
('عمر عبدالعزيز يوسف', 'omar.youssef@email.com', '+249123456795', '$2b$12$hashedpassword7', 'patient', true, true, NOW()),
('مريم حسن عبدالله', 'maryam.hassan@email.com', '+249123456796', '$2b$12$hashedpassword8', 'patient', true, true, NOW()),
('يوسف محمود أحمد', 'youssef.mahmoud@email.com', '+249123456797', '$2b$12$hashedpassword9', 'patient', true, true, NOW()),
('زينب عبدالرحيم علي', 'zeinab.ali@email.com', '+249123456798', '$2b$12$hashedpassword10', 'patient', true, true, NOW()),
('إبراهيم عبدالله محمد', 'ibrahim.abdullah@email.com', '+249123456799', '$2b$12$hashedpassword11', 'patient', true, true, NOW()),
('سارة أحمد حسن', 'sarah.ahmed@email.com', '+249123456800', '$2b$12$hashedpassword12', 'patient', true, true, NOW()),
('حسن علي عبدالرحمن', 'hassan.ali@email.com', '+249123456801', '$2b$12$hashedpassword13', 'patient', true, true, NOW()),
('نادية محمد عثمان', 'nadia.mohamed@email.com', '+249123456802', '$2b$12$hashedpassword14', 'patient', true, true, NOW()),

-- English Names (14 patients)
('Ahmed Mohammed Abdullah', 'ahmed.abdullah@email.com', '+249123456803', '$2b$12$hashedpassword15', 'patient', true, true, NOW()),
('Fatima Abdulrahman Ali', 'fatima.abdulrahman@email.com', '+249123456804', '$2b$12$hashedpassword16', 'patient', true, true, NOW()),
('Mohamed Osman Hassan', 'mohamed.hassan@email.com', '+249123456805', '$2b$12$hashedpassword17', 'patient', true, true, NOW()),
('Aisha Ibrahim Mohammed', 'aisha.mohammed@email.com', '+249123456806', '$2b$12$hashedpassword18', 'patient', true, true, NOW()),
('Abdullah Ahmed Elsayed', 'abdullah.elsayed@email.com', '+249123456807', '$2b$12$hashedpassword19', 'patient', true, true, NOW()),
('Khadija Mohammed Saleh', 'khadija.mohammed@email.com', '+249123456808', '$2b$12$hashedpassword20', 'patient', true, true, NOW()),
('Omar Abdelaziz Youssef', 'omar.abdelaziz@email.com', '+249123456809', '$2b$12$hashedpassword21', 'patient', true, true, NOW()),
('Maryam Hassan Abdullah', 'maryam.abdullah@email.com', '+249123456810', '$2b$12$hashedpassword22', 'patient', true, true, NOW()),
('Youssef Mahmoud Ahmed', 'youssef.ahmed@email.com', '+249123456811', '$2b$12$hashedpassword23', 'patient', true, true, NOW()),
('Zeinab Abdelrahim Ali', 'zeinab.abdelrahim@email.com', '+249123456812', '$2b$12$hashedpassword24', 'patient', true, true, NOW()),
('Ibrahim Abdullah Mohammed', 'ibrahim.mohammed@email.com', '+249123456813', '$2b$12$hashedpassword25', 'patient', true, true, NOW()),
('Sarah Ahmed Hassan', 'sarah.hassan@email.com', '+249123456814', '$2b$12$hashedpassword26', 'patient', true, true, NOW()),
('Hassan Ali Abdulrahman', 'hassan.abdulrahman@email.com', '+249123456815', '$2b$12$hashedpassword27', 'patient', true, true, NOW()),
('Nadia Mohammed Osman', 'nadia.osman@email.com', '+249123456816', '$2b$12$hashedpassword28', 'patient', true, true, NOW());

-- Insert Patient Information
INSERT INTO patients (user_id, age, gender, blood_type, height, weight, emergency_contact, medical_history_completed, created_at) VALUES
-- Corresponding to users 1-28
(1, 34, 'male', 'A+', 175, 78, '+249987654321', true, NOW()),
(2, 28, 'female', 'B+', 162, 58, '+249987654322', true, NOW()),
(3, 42, 'male', 'O+', 180, 85, '+249987654323', true, NOW()),
(4, 31, 'female', 'AB+', 158, 62, '+249987654324', true, NOW()),
(5, 38, 'male', 'A-', 177, 82, '+249987654325', true, NOW()),
(6, 45, 'female', 'O-', 165, 68, '+249987654326', true, NOW()),
(7, 29, 'male', 'B-', 172, 75, '+249987654327', true, NOW()),
(8, 36, 'female', 'A+', 160, 55, '+249987654328', true, NOW()),
(9, 33, 'male', 'O+', 178, 80, '+249987654329', true, NOW()),
(10, 27, 'female', 'B+', 163, 60, '+249987654330', true, NOW()),
(11, 41, 'male', 'AB-', 176, 77, '+249987654331', true, NOW()),
(12, 30, 'female', 'A+', 159, 57, '+249987654332', true, NOW()),
(13, 37, 'male', 'O+', 174, 79, '+249987654333', true, NOW()),
(14, 35, 'female', 'B+', 161, 63, '+249987654334', true, NOW()),
(15, 26, 'male', 'A+', 179, 83, '+249987654335', true, NOW()),
(16, 32, 'female', 'O+', 164, 59, '+249987654336', true, NOW()),
(17, 39, 'male', 'B+', 181, 88, '+249987654337', true, NOW()),
(18, 25, 'female', 'AB+', 157, 54, '+249987654338', true, NOW()),
(19, 43, 'male', 'A-', 173, 76, '+249987654339', true, NOW()),
(20, 29, 'female', 'O-', 166, 64, '+249987654340', true, NOW()),
(21, 31, 'male', 'B-', 175, 81, '+249987654341', true, NOW()),
(22, 28, 'female', 'A+', 162, 56, '+249987654342', true, NOW()),
(23, 40, 'male', 'O+', 177, 84, '+249987654343', true, NOW()),
(24, 33, 'female', 'B+', 160, 61, '+249987654344', true, NOW()),
(25, 36, 'male', 'AB+', 178, 79, '+249987654345', true, NOW()),
(26, 27, 'female', 'A+', 163, 58, '+249987654346', true, NOW()),
(27, 44, 'male', 'O+', 176, 86, '+249987654347', true, NOW()),
(28, 30, 'female', 'B+', 159, 62, '+249987654348', true, NOW());

-- Insert Medical History (All in English as doctors enter in English)
INSERT INTO medical_history (patient_id, medical_history, allergies, current_medications, chronic_conditions, family_history, surgical_history, smoking_status, alcohol_consumption, exercise_frequency, notes, created_at) VALUES
-- Patient 1 - Ahmed Mohammed Abdullah
(1, 'Previous episodes of gastritis in 2020. Treated successfully with medication.', 'Penicillin allergy, mild reaction (rash)', 'Omeprazole 20mg daily, Vitamin D supplements', NULL, 'Father has diabetes mellitus type 2, Mother hypertensive', NULL, 'never', 'none', 'weekly', 'Patient is compliant with medications and follow-up appointments', NOW()),

-- Patient 2 - Fatima Abdulrahman Ali
(2, 'History of iron deficiency anemia during pregnancy in 2022. Currently resolved.', 'No known allergies', 'Iron supplements, Folic acid', NULL, 'Maternal history of breast cancer', NULL, 'never', 'none', 'daily', 'Regular exercise routine, good nutritional habits', NOW()),

-- Patient 3 - Mohamed Osman Hassan
(3, 'Hypertension diagnosed in 2019, well controlled with medication. No complications.', 'Aspirin - causes stomach upset', 'Amlodipine 5mg daily, Metformin 500mg twice daily', 'Hypertension, Pre-diabetes', 'Strong family history of cardiovascular disease', NULL, 'former', 'occasional', 'rare', 'Quit smoking 3 years ago. Needs lifestyle counseling', NOW()),

-- Patient 4 - Aisha Ibrahim Mohammed
(4, 'Recurrent UTIs, last episode 6 months ago. No underlying urological abnormalities found.', 'Sulfonamides', 'Cranberry supplements, Probiotics', NULL, 'Mother had kidney stones', NULL, 'never', 'none', 'weekly', 'Increased fluid intake, good hygiene practices', NOW()),

-- Patient 5 - Abdullah Ahmed Elsayed
(5, 'Appendectomy performed in 2018. Recovery was uncomplicated. No other significant history.', 'No known allergies', 'Multivitamin complex', NULL, 'Father deceased from myocardial infarction at age 60', 'Appendectomy (2018)', 'current', 'moderate', 'none', 'Counseled about smoking cessation multiple times', NOW()),

-- Patient 6 - Khadija Mohammed Saleh
(6, 'Type 2 diabetes mellitus diagnosed 2 years ago. HbA1c last check was 7.2%.', 'No known allergies', 'Metformin 1000mg twice daily, Glibenclamide 5mg daily', 'Type 2 Diabetes Mellitus', 'Both parents diabetic, sister has thyroid disease', NULL, 'never', 'none', 'daily', 'Good diabetes self-management skills, regular glucose monitoring', NOW()),

-- Patient 7 - Omar Abdelaziz Youssef
(7, 'Asthma since childhood, well controlled. Last exacerbation was 2 years ago.', 'Dust mites, Pollen', 'Salbutamol inhaler PRN, Beclomethasone inhaler daily', 'Bronchial Asthma', 'Brother has asthma, mother allergic rhinitis', NULL, 'never', 'none', 'weekly', 'Uses peak flow meter regularly, good inhaler technique', NOW()),

-- Patient 8 - Maryam Hassan Abdullah
(8, 'PCOS diagnosed in 2021. Managed with lifestyle modifications and medication.', 'No known allergies', 'Metformin 500mg twice daily, Oral contraceptive pills', 'Polycystic Ovary Syndrome (PCOS)', 'Mother has PCOS, aunt has endometriosis', NULL, 'never', 'none', 'daily', 'Regular gynecological follow-up, weight management program', NOW()),

-- Patient 9 - Youssef Mahmoud Ahmed
(9, 'Lower back pain due to disc herniation L4-L5. Managed conservatively with physiotherapy.', 'NSAIDs cause gastric irritation', 'Paracetamol 500mg PRN, Muscle relaxants PRN', NULL, 'Father has rheumatoid arthritis', NULL, 'never', 'occasional', 'weekly', 'Regular physiotherapy sessions, ergonomic workplace setup', NOW()),

-- Patient 10 - Zeinab Abdelrahim Ali
(10, 'Hyperthyroidism diagnosed 6 months ago. Currently on anti-thyroid medication.', 'Iodine contrast agents', 'Carbimazole 10mg daily', 'Hyperthyroidism (Graves disease)', 'Mother has hypothyroidism', NULL, 'never', 'none', 'weekly', 'Regular thyroid function monitoring, ophthalmology follow-up', NOW()),

-- Patient 11 - Ibrahim Abdullah Mohammed
(11, 'Chronic kidney stones, last episode 1 year ago. Follows low-sodium diet.', 'No known allergies', 'Potassium citrate, High fluid intake', 'Recurrent nephrolithiasis', 'Father had kidney stones', NULL, 'never', 'none', 'daily', 'Dietary counseling completed, regular urology follow-up', NOW()),

-- Patient 12 - Sarah Ahmed Hassan
(12, 'Migraine headaches since teenage years. Frequency reduced with preventive medication.', 'Triptans - cause chest tightness', 'Propranolol 40mg daily, Paracetamol PRN', NULL, 'Mother and sister have migraines', NULL, 'never', 'none', 'weekly', 'Headache diary maintained, stress management techniques learned', NOW()),

-- Patient 13 - Hassan Ali Abdulrahman
(13, 'Peptic ulcer disease H.pylori positive, eradicated successfully in 2023.', 'No known allergies', 'Omeprazole 20mg daily', NULL, 'No significant family history', NULL, 'former', 'heavy', 'none', 'Alcohol counseling provided, needs regular follow-up', NOW()),

-- Patient 14 - Nadia Mohammed Osman
(14, 'Osteoporosis diagnosed after menopause. On calcium and vitamin D supplementation.', 'No known allergies', 'Calcium carbonate 1200mg daily, Vitamin D3 1000 IU daily', 'Osteoporosis', 'Mother had hip fracture at age 70', NULL, 'never', 'none', 'weekly', 'DEXA scan scheduled annually, fall prevention counseling given', NOW()),

-- Patient 15 - Ahmed Mohammed Abdullah (English)
(15, 'Anxiety disorder diagnosed 2 years ago. Well controlled with medication and therapy.', 'No known allergies', 'Sertraline 50mg daily', 'Generalized Anxiety Disorder', 'Family history of depression and anxiety', NULL, 'never', 'none', 'daily', 'Regular psychotherapy sessions, stress management techniques', NOW()),

-- Patient 16 - Fatima Abdulrahman Ali (English)
(16, 'Rheumatoid arthritis diagnosed 3 years ago. Disease activity well controlled.', 'Methotrexate - causes nausea', 'Sulfasalazine 1g twice daily, Folic acid 5mg weekly', 'Rheumatoid Arthritis', 'Aunt has lupus, grandmother had RA', NULL, 'never', 'none', 'weekly', 'Regular rheumatology follow-up, joint protection education provided', NOW()),

-- Patient 17 - Mohamed Osman Hassan (English)
(17, 'Coronary artery disease, MI in 2022. Underwent PCI with stent placement.', 'No known allergies', 'Aspirin 75mg daily, Atorvastatin 40mg daily, Metoprolol 50mg daily', 'Coronary Artery Disease, Post-MI', 'Father died of heart attack at age 55', 'Percutaneous Coronary Intervention (2022)', 'former', 'none', 'daily', 'Cardiac rehabilitation completed, lifestyle modifications implemented', NOW()),

-- Patient 18 - Aisha Ibrahim Mohammed (English)
(18, 'Fibromyalgia diagnosed 18 months ago. Symptoms managed with multimodal approach.', 'Tramadol - causes dizziness', 'Pregabalin 75mg twice daily, Duloxetine 30mg daily', 'Fibromyalgia', 'Mother has chronic pain syndrome', NULL, 'never', 'none', 'weekly', 'Pain management program, cognitive behavioral therapy', NOW()),

-- Patient 19 - Abdullah Ahmed Elsayed (English)
(19, 'Benign prostatic hyperplasia, symptoms mild. Managed with alpha-blocker.', 'No known allergies', 'Tamsulosin 0.4mg daily', 'Benign Prostatic Hyperplasia', 'Father had prostate cancer', NULL, 'never', 'occasional', 'weekly', 'Regular PSA monitoring, urological follow-up', NOW()),

-- Patient 20 - Khadija Mohammed Saleh (English)
(20, 'Endometriosis diagnosed via laparoscopy. Pain well controlled with hormonal therapy.', 'No known allergies', 'Continuous oral contraceptive pills', 'Endometriosis', 'Sister has endometriosis', 'Diagnostic laparoscopy (2023)', 'never', 'none', 'weekly', 'Regular gynecological follow-up, fertility counseling provided', NOW()),

-- Patient 21 - Omar Abdelaziz Youssef (English)
(21, 'Chronic obstructive pulmonary disease due to smoking. Currently on bronchodilators.', 'No known allergies', 'Tiotropium daily, Salbutamol PRN', 'COPD (Moderate)', 'Father was heavy smoker, died from lung disease', NULL, 'former', 'none', 'weekly', 'Pulmonary rehabilitation, smoking cessation 1 year ago', NOW()),

-- Patient 22 - Maryam Hassan Abdullah (English)
(22, 'Hypothyroidism diagnosed during pregnancy, continues on levothyroxine.', 'No known allergies', 'Levothyroxine 75mcg daily', 'Hypothyroidism', 'Mother and aunt have thyroid disorders', NULL, 'never', 'none', 'weekly', 'Regular thyroid function monitoring, pregnancy counseling given', NOW()),

-- Patient 23 - Youssef Mahmoud Ahmed (English)
(23, 'Gout, first attack 2 years ago. Uric acid levels well controlled with medication.', 'Allopurinol - causes skin rash', 'Febuxostat 80mg daily', 'Gout', 'Uncle has gout', NULL, 'occasional', 'moderate', 'rare', 'Dietary counseling provided, alcohol limitation advised', NOW()),

-- Patient 24 - Zeinab Abdelrahim Ali (English)
(24, 'Irritable bowel syndrome with mixed symptoms. Managed with dietary modifications.', 'No known allergies', 'Mebeverine 135mg PRN, Probiotics daily', 'Irritable Bowel Syndrome', 'Mother has IBS, sister has Crohn disease', NULL, 'never', 'none', 'weekly', 'FODMAP diet education, stress management counseling', NOW()),

-- Patient 25 - Ibrahim Abdullah Mohammed (English)
(25, 'Sleep apnea diagnosed via sleep study. Currently using CPAP machine nightly.', 'No known allergies', 'CPAP therapy', 'Obstructive Sleep Apnea', 'Father snores heavily', NULL, 'never', 'none', 'rare', 'Weight loss program initiated, CPAP compliance good', NOW()),

-- Patient 26 - Sarah Ahmed Hassan (English)
(26, 'Systemic lupus erythematosus diagnosed 4 years ago. Disease activity low.', 'Hydroxychloroquine - retinal toxicity concern', 'Prednisolone 5mg daily, Methotrexate 15mg weekly', 'Systemic Lupus Erythematosus', 'Aunt has autoimmune disease', NULL, 'never', 'none', 'weekly', 'Regular ophthalmology screening, sun protection education', NOW()),

-- Patient 27 - Hassan Ali Abdulrahman (English)
(27, 'Peripheral arterial disease with claudication. Managed with antiplatelet therapy.', 'Clopidogrel - causes bleeding', 'Aspirin 75mg daily, Atorvastatin 20mg daily', 'Peripheral Arterial Disease', 'Strong family history of vascular disease', NULL, 'former', 'none', 'daily', 'Walking program, vascular surgery consultation planned', NOW()),

-- Patient 28 - Nadia Mohammed Osman (English)
(28, 'Bipolar disorder type II, stable on mood stabilizer. Last episode 18 months ago.', 'Lithium - causes tremor', 'Lamotrigine 200mg daily', 'Bipolar Disorder Type II', 'Brother has schizophrenia, mother had depression', NULL, 'never', 'none', 'weekly', 'Regular psychiatric follow-up, mood monitoring chart maintained', NOW());

-- Verify the inserts
SELECT 'Users inserted:' as status, COUNT(*) as count FROM users WHERE user_type = 'patient'
UNION ALL
SELECT 'Patients inserted:' as status, COUNT(*) as count FROM patients
UNION ALL  
SELECT 'Medical histories inserted:' as status, COUNT(*) as count FROM medical_history;

-- Sample query to verify data
SELECT 
    u.full_name,
    p.age,
    p.gender,
    p.blood_type,
    LEFT(mh.medical_history, 50) as medical_history_preview
FROM users u
JOIN patients p ON u.id = p.user_id
JOIN medical_history mh ON p.id = mh.patient_id
LIMIT 5;