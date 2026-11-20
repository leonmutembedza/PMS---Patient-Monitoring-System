use crate::clinical::{calculate_news2, evaluate_confidence, generate_explainability};
use crate::models::{LabResults, MedicationEvent, PatientCohortRecord, PatientSnapshot, VitalSigns};

pub fn generate_mimic_cohort() -> Vec<PatientCohortRecord> {
    let mut cohort = Vec::new();

    // Bed 01: Rapid Septic Shock Decompensation (Escalating High Acuity)
    cohort.push(PatientCohortRecord {
        id: "p-1001".to_string(),
        bed: "ICU-01".to_string(),
        name: "Arthur Pendelton".to_string(),
        age: 68,
        gender: "M".to_string(),
        department: "ICU".to_string(),
        admission_diagnosis: "Severe Sepsis secondary to Necrotizing Fasciitis".to_string(),
        medications: vec![
            MedicationEvent { time_offset_min: 0, name: "Piperacillin-Tazobactam".to_string(), dose: "4.5g IV".to_string(), route: "IVPB".to_string(), category: "ANTIBIOTIC".to_string() },
            MedicationEvent { time_offset_min: 180, name: "Norepinephrine".to_string(), dose: "0.15 mcg/kg/min".to_string(), route: "Continuous Infusion".to_string(), category: "VASOPRESSOR".to_string() },
            MedicationEvent { time_offset_min: 720, name: "Vasopressin".to_string(), dose: "0.03 units/min".to_string(), route: "Continuous Infusion".to_string(), category: "VASOPRESSOR".to_string() },
            MedicationEvent { time_offset_min: 1080, name: "Hydrocortisone".to_string(), dose: "100mg IV".to_string(), route: "IV Push".to_string(), category: "STEROID".to_string() },
        ],
        baseline_trajectory: build_trajectory_24h(
            &[(0, 92.0, 20.0, 115.0, 70.0, 85.0, 96.0, 38.2, false, "ALERT", 1.8, 13.5, 1.1, 210.0, 5, 2),
              (360, 110.0, 24.0, 98.0, 60.0, 72.0, 93.0, 38.8, true, "ALERT", 2.8, 17.2, 1.4, 180.0, 4, 5),
              (720, 128.0, 28.0, 84.0, 50.0, 61.0, 91.0, 39.4, true, "VOICE", 4.2, 22.0, 1.9, 135.0, 2, 8),
              (1080, 142.0, 34.0, 74.0, 42.0, 52.0, 88.0, 39.8, true, "PAIN", 5.9, 27.5, 2.6, 90.0, 1, 11),
              (1440, 148.0, 36.0, 70.0, 38.0, 48.0, 86.0, 35.1, true, "UNRESPONSIVE", 7.4, 31.0, 3.4, 70.0, 1, 14)],
        ),
    });

    // Bed 02: Severe ARDS / Acute Respiratory Failure
    cohort.push(PatientCohortRecord {
        id: "p-1002".to_string(),
        bed: "ICU-02".to_string(),
        name: "Eleanor Vance".to_string(),
        age: 74,
        gender: "F".to_string(),
        department: "ICU".to_string(),
        admission_diagnosis: "Acute Hypoxemic Respiratory Failure / Severe ARDS".to_string(),
        medications: vec![
            MedicationEvent { time_offset_min: 0, name: "Methylprednisolone".to_string(), dose: "60mg IV".to_string(), route: "IV Push".to_string(), category: "STEROID".to_string() },
            MedicationEvent { time_offset_min: 240, name: "Propofol".to_string(), dose: "25 mcg/kg/min".to_string(), route: "Continuous Infusion".to_string(), category: "SEDATIVE".to_string() },
            MedicationEvent { time_offset_min: 600, name: "Cisatracurium".to_string(), dose: "2 mcg/kg/min".to_string(), route: "Continuous Infusion".to_string(), category: "PARALYTIC".to_string() },
        ],
        baseline_trajectory: build_trajectory_24h(
            &[(0, 88.0, 22.0, 130.0, 82.0, 98.0, 93.0, 37.4, true, "ALERT", 1.4, 9.8, 0.9, 280.0, 8, 2),
              (360, 104.0, 28.0, 138.0, 88.0, 104.0, 89.0, 37.9, true, "ALERT", 1.9, 11.0, 1.1, 260.0, 5, 4),
              (720, 122.0, 32.0, 148.0, 94.0, 112.0, 85.0, 38.3, true, "VOICE", 2.6, 12.4, 1.2, 245.0, 3, 7),
              (1080, 130.0, 36.0, 156.0, 98.0, 117.0, 82.0, 38.7, true, "VOICE", 3.2, 13.5, 1.3, 230.0, 2, 9),
              (1440, 115.0, 22.0, 120.0, 75.0, 90.0, 92.0, 37.2, true, "UNRESPONSIVE", 2.8, 12.0, 1.2, 220.0, 1, 8)],
        ),
    });

    // Bed 03: Anterior STEMI / Cardiogenic Shock
    cohort.push(PatientCohortRecord {
        id: "p-1003".to_string(),
        bed: "ICU-03".to_string(),
        name: "Marcus Aurelius Thorne".to_string(),
        age: 62,
        gender: "M".to_string(),
        department: "ICU".to_string(),
        admission_diagnosis: "Anterior STEMI s/p Emergent PCI / Cardiogenic Shock".to_string(),
        medications: vec![
            MedicationEvent { time_offset_min: 0, name: "Heparin Infusion".to_string(), dose: "18 units/kg/hr".to_string(), route: "Continuous Infusion".to_string(), category: "ANTICOAGULANT".to_string() },
            MedicationEvent { time_offset_min: 180, name: "Dobutamine".to_string(), dose: "5 mcg/kg/min".to_string(), route: "Continuous Infusion".to_string(), category: "INOTROPE".to_string() },
            MedicationEvent { time_offset_min: 720, name: "Milrinone".to_string(), dose: "0.375 mcg/kg/min".to_string(), route: "Continuous Infusion".to_string(), category: "INOTROPE".to_string() },
        ],
        baseline_trajectory: build_trajectory_24h(
            &[(0, 84.0, 18.0, 110.0, 72.0, 84.0, 97.0, 36.8, false, "ALERT", 1.2, 8.5, 1.2, 220.0, 6, 1),
              (360, 98.0, 20.0, 94.0, 62.0, 72.0, 94.0, 36.5, true, "ALERT", 1.8, 9.2, 1.5, 210.0, 4, 3),
              (720, 114.0, 24.0, 86.0, 56.0, 66.0, 92.0, 36.2, true, "ALERT", 2.9, 9.8, 1.9, 195.0, 3, 5),
              (1080, 126.0, 26.0, 80.0, 52.0, 61.0, 91.0, 35.9, true, "VOICE", 3.8, 10.4, 2.3, 180.0, 2, 7),
              (1440, 108.0, 22.0, 92.0, 60.0, 70.0, 94.0, 36.5, true, "ALERT", 2.4, 9.6, 1.8, 190.0, 1, 4)],
        ),
    });

    // Bed 04: Post-Op Laparotomy (Gradual Recovery & Extubation)
    cohort.push(PatientCohortRecord {
        id: "p-1004".to_string(),
        bed: "ICU-04".to_string(),
        name: "Claire Dupont".to_string(),
        age: 55,
        gender: "F".to_string(),
        department: "ICU".to_string(),
        admission_diagnosis: "Post-Op Exploratory Laparotomy / Bowel Resection".to_string(),
        medications: vec![
            MedicationEvent { time_offset_min: 0, name: "Cefazolin".to_string(), dose: "2g IV".to_string(), route: "IVPB".to_string(), category: "ANTIBIOTIC".to_string() },
            MedicationEvent { time_offset_min: 120, name: "Hydromorphone".to_string(), dose: "0.5mg IV".to_string(), route: "IV Push PRN".to_string(), category: "ANALGESIC".to_string() },
        ],
        baseline_trajectory: build_trajectory_24h(
            &[(0, 102.0, 20.0, 108.0, 70.0, 82.0, 95.0, 36.6, true, "ALERT", 1.7, 12.5, 0.9, 240.0, 6, 3),
              (360, 92.0, 18.0, 114.0, 72.0, 86.0, 96.0, 36.7, true, "ALERT", 1.4, 11.8, 0.8, 245.0, 5, 2),
              (720, 86.0, 16.0, 118.0, 75.0, 89.0, 97.0, 36.8, false, "ALERT", 1.2, 11.0, 0.8, 255.0, 4, 0),
              (1080, 80.0, 15.0, 122.0, 78.0, 92.0, 98.0, 37.0, false, "ALERT", 1.0, 9.5, 0.8, 265.0, 2, 0),
              (1440, 74.0, 14.0, 124.0, 80.0, 94.0, 99.0, 36.9, false, "ALERT", 0.9, 8.2, 0.7, 275.0, 2, 0)],
        ),
    });

    // Bed 05: Telemetry Lead Disconnect & Sensor Artifact (Honest Uncertainty)
    cohort.push(PatientCohortRecord {
        id: "p-1005".to_string(),
        bed: "ICU-05".to_string(),
        name: "David K. Henderson".to_string(),
        age: 79,
        gender: "M".to_string(),
        department: "ICU".to_string(),
        admission_diagnosis: "Acute Encephalopathy / Hyponatremia".to_string(),
        medications: vec![
            MedicationEvent { time_offset_min: 0, name: "3% Sodium Chloride".to_string(), dose: "50 mL/hr".to_string(), route: "IV Infusion".to_string(), category: "ELECTROLYTE".to_string() },
        ],
        baseline_trajectory: build_trajectory_unreliable_24h(),
    });

    // Bed 06: DKA Resolving (Stable Step-Down Candidate)
    cohort.push(PatientCohortRecord {
        id: "p-1006".to_string(),
        bed: "ICU-06".to_string(),
        name: "Hannah Lindqvist".to_string(),
        age: 41,
        gender: "F".to_string(),
        department: "ICU".to_string(),
        admission_diagnosis: "DKA Resolved / Transitioning to Subcutaneous Insulin".to_string(),
        medications: vec![
            MedicationEvent { time_offset_min: 0, name: "Insulin Glargine".to_string(), dose: "24 units".to_string(), route: "SubQ".to_string(), category: "ANTIDIABETIC".to_string() },
        ],
        baseline_trajectory: build_trajectory_24h(
            &[(0, 72.0, 14.0, 118.0, 76.0, 90.0, 98.0, 36.7, false, "ALERT", 0.8, 6.2, 0.8, 290.0, 8, 0),
              (360, 70.0, 15.0, 120.0, 78.0, 92.0, 98.0, 36.8, false, "ALERT", 0.8, 6.0, 0.8, 295.0, 6, 0),
              (720, 68.0, 14.0, 116.0, 74.0, 88.0, 99.0, 36.6, false, "ALERT", 0.7, 5.8, 0.7, 300.0, 5, 0),
              (1080, 72.0, 16.0, 118.0, 76.0, 90.0, 98.0, 36.7, false, "ALERT", 0.7, 5.7, 0.7, 305.0, 4, 0),
              (1440, 70.0, 14.0, 122.0, 78.0, 92.0, 99.0, 36.8, false, "ALERT", 0.7, 5.5, 0.7, 310.0, 2, 0)],
        ),
    });

    // Bed 07: Acute Upper GI Bleed / Hemorrhagic Shock
    cohort.push(PatientCohortRecord {
        id: "p-1007".to_string(),
        bed: "ICU-07".to_string(),
        name: "Robert Chen".to_string(),
        age: 64,
        gender: "M".to_string(),
        department: "ICU".to_string(),
        admission_diagnosis: "Massive Upper GI Bleed / Bleeding Duodenal Ulcer".to_string(),
        medications: vec![
            MedicationEvent { time_offset_min: 0, name: "Pantoprazole Infusion".to_string(), dose: "8 mg/hr".to_string(), route: "IV Infusion".to_string(), category: "PPI".to_string() },
            MedicationEvent { time_offset_min: 180, name: "Packed Red Blood Cells".to_string(), dose: "2 Units".to_string(), route: "Rapid Infuser".to_string(), category: "BLOOD_PRODUCT".to_string() },
            MedicationEvent { time_offset_min: 400, name: "Octreotide".to_string(), dose: "50 mcg/hr".to_string(), route: "IV Infusion".to_string(), category: "VASOACTIVE".to_string() },
        ],
        baseline_trajectory: build_trajectory_24h(
            &[(0, 114.0, 22.0, 95.0, 58.0, 70.0, 95.0, 36.5, true, "ALERT", 2.4, 11.5, 1.4, 175.0, 5, 3),
              (360, 132.0, 26.0, 82.0, 50.0, 60.0, 92.0, 36.1, true, "VOICE", 4.1, 13.0, 1.8, 140.0, 3, 7),
              (720, 106.0, 20.0, 102.0, 65.0, 77.0, 96.0, 36.7, true, "ALERT", 2.2, 11.8, 1.5, 160.0, 4, 3),
              (1080, 92.0, 18.0, 112.0, 70.0, 84.0, 97.0, 36.9, false, "ALERT", 1.5, 10.2, 1.3, 180.0, 3, 1),
              (1440, 82.0, 16.0, 120.0, 76.0, 90.0, 98.0, 37.0, false, "ALERT", 1.1, 9.4, 1.1, 195.0, 2, 0)],
        ),
    });

    // Bed 08: Severe Acute Necrotizing Pancreatitis / SIRS
    cohort.push(PatientCohortRecord {
        id: "p-1008".to_string(),
        bed: "ICU-08".to_string(),
        name: "Beatrice Morales".to_string(),
        age: 51,
        gender: "F".to_string(),
        department: "ICU".to_string(),
        admission_diagnosis: "Severe Acute Gallstone Pancreatitis / SIRS".to_string(),
        medications: vec![
            MedicationEvent { time_offset_min: 0, name: "Lactated Ringer's".to_string(), dose: "200 mL/hr".to_string(), route: "IV Infusion".to_string(), category: "FLUID".to_string() },
            MedicationEvent { time_offset_min: 360, name: "Meropenem".to_string(), dose: "1g IV".to_string(), route: "IVPB".to_string(), category: "ANTIBIOTIC".to_string() },
        ],
        baseline_trajectory: build_trajectory_24h(
            &[(0, 102.0, 24.0, 108.0, 66.0, 80.0, 94.0, 38.6, true, "ALERT", 2.6, 18.4, 1.6, 220.0, 6, 4),
              (360, 116.0, 26.0, 98.0, 60.0, 72.0, 93.0, 39.1, true, "ALERT", 3.4, 21.0, 1.9, 190.0, 4, 6),
              (720, 124.0, 28.0, 92.0, 56.0, 68.0, 91.0, 39.3, true, "VOICE", 4.3, 24.5, 2.3, 165.0, 3, 8),
              (1080, 118.0, 24.0, 100.0, 62.0, 74.0, 93.0, 38.9, true, "ALERT", 3.5, 22.0, 2.0, 175.0, 2, 6),
              (1440, 105.0, 20.0, 110.0, 70.0, 83.0, 95.0, 38.2, true, "ALERT", 2.7, 19.0, 1.7, 190.0, 2, 4)],
        ),
    });

    // Bed 09: Subarachnoid Hemorrhage / Neuro ICU
    cohort.push(PatientCohortRecord {
        id: "p-1009".to_string(),
        bed: "ICU-09".to_string(),
        name: "Samuel O'Connor".to_string(),
        age: 58,
        gender: "M".to_string(),
        department: "ICU".to_string(),
        admission_diagnosis: "Aneurysmal Subarachnoid Hemorrhage Hunt-Hess Grade III".to_string(),
        medications: vec![
            MedicationEvent { time_offset_min: 0, name: "Nimodipine".to_string(), dose: "60mg".to_string(), route: "NG Tube".to_string(), category: "CALCIUM_CHANNEL_BLOCKER".to_string() },
            MedicationEvent { time_offset_min: 300, name: "Nicardipine Infusion".to_string(), dose: "5 mg/hr".to_string(), route: "IV Infusion".to_string(), category: "ANTIHYPERTENSIVE".to_string() },
        ],
        baseline_trajectory: build_trajectory_24h(
            &[(0, 68.0, 16.0, 158.0, 92.0, 114.0, 98.0, 37.1, false, "VOICE", 1.1, 9.0, 0.9, 210.0, 8, 2),
              (360, 62.0, 14.0, 172.0, 102.0, 125.0, 97.0, 37.5, false, "PAIN", 1.3, 9.4, 0.9, 205.0, 5, 4),
              (720, 54.0, 12.0, 184.0, 110.0, 134.0, 96.0, 37.8, false, "PAIN", 1.6, 10.1, 1.0, 200.0, 3, 6),
              (1080, 66.0, 16.0, 146.0, 86.0, 106.0, 98.0, 37.2, false, "VOICE", 1.2, 9.6, 0.9, 205.0, 2, 3),
              (1440, 72.0, 16.0, 138.0, 82.0, 100.0, 98.0, 37.0, false, "ALERT", 1.0, 9.0, 0.9, 215.0, 2, 1)],
        ),
    });

    // Bed 10: Massive Pulmonary Embolism
    cohort.push(PatientCohortRecord {
        id: "p-1010".to_string(),
        bed: "ICU-10".to_string(),
        name: "Fatima Al-Mansoor".to_string(),
        age: 47,
        gender: "F".to_string(),
        department: "ICU".to_string(),
        admission_diagnosis: "Submassive Pulmonary Embolism with RV Strain".to_string(),
        medications: vec![
            MedicationEvent { time_offset_min: 0, name: "Unfractionated Heparin".to_string(), dose: "80 units/kg bolus".to_string(), route: "IV Push".to_string(), category: "ANTICOAGULANT".to_string() },
            MedicationEvent { time_offset_min: 240, name: "Alteplase (tPA)".to_string(), dose: "100mg".to_string(), route: "IV Infusion over 2hr".to_string(), category: "THROMBOLYTIC".to_string() },
        ],
        baseline_trajectory: build_trajectory_24h(
            &[(0, 126.0, 30.0, 102.0, 68.0, 79.0, 89.0, 37.2, true, "ALERT", 2.8, 10.5, 1.1, 230.0, 5, 4),
              (360, 138.0, 34.0, 88.0, 54.0, 65.0, 86.0, 37.0, true, "ALERT", 4.2, 11.2, 1.3, 210.0, 3, 8),
              (720, 110.0, 24.0, 112.0, 72.0, 85.0, 94.0, 37.1, true, "ALERT", 2.1, 10.0, 1.0, 215.0, 4, 3),
              (1080, 94.0, 18.0, 120.0, 78.0, 92.0, 97.0, 36.9, true, "ALERT", 1.4, 9.2, 0.9, 220.0, 3, 1),
              (1440, 82.0, 16.0, 124.0, 80.0, 94.0, 98.0, 36.8, false, "ALERT", 1.0, 8.5, 0.8, 230.0, 2, 0)],
        ),
    });

    // Bed 11: Post-Op CABG x4 (Labile Hemodynamics)
    cohort.push(PatientCohortRecord {
        id: "p-1011".to_string(),
        bed: "ICU-11".to_string(),
        name: "Gregory Kowalski".to_string(),
        age: 71,
        gender: "M".to_string(),
        department: "ICU".to_string(),
        admission_diagnosis: "Post-Op Coronary Artery Bypass Graft x4 (LIMA-LAD, SVG-OM, SVG-RCA)".to_string(),
        medications: vec![
            MedicationEvent { time_offset_min: 0, name: "Epinephrine Infusion".to_string(), dose: "0.04 mcg/kg/min".to_string(), route: "IV Infusion".to_string(), category: "INOTROPE".to_string() },
            MedicationEvent { time_offset_min: 480, name: "Furosemide".to_string(), dose: "40mg IV".to_string(), route: "IV Push".to_string(), category: "DIURETIC".to_string() },
        ],
        baseline_trajectory: build_trajectory_24h(
            &[(0, 95.0, 16.0, 100.0, 62.0, 74.0, 97.0, 35.6, true, "VOICE", 2.5, 12.0, 1.3, 180.0, 7, 3),
              (360, 90.0, 16.0, 114.0, 70.0, 84.0, 98.0, 36.5, true, "ALERT", 1.8, 11.2, 1.2, 190.0, 5, 2),
              (720, 86.0, 15.0, 122.0, 74.0, 90.0, 98.0, 36.8, false, "ALERT", 1.3, 10.4, 1.1, 205.0, 4, 0),
              (1080, 80.0, 14.0, 126.0, 78.0, 94.0, 99.0, 36.9, false, "ALERT", 1.0, 9.8, 1.0, 220.0, 3, 0),
              (1440, 76.0, 14.0, 124.0, 76.0, 92.0, 99.0, 36.9, false, "ALERT", 0.9, 9.1, 0.9, 235.0, 2, 0)],
        ),
    });

    // Bed 12: Fulminant Hepatic Failure / Hepatorenal Syndrome
    cohort.push(PatientCohortRecord {
        id: "p-1012".to_string(),
        bed: "ICU-12".to_string(),
        name: "Evelyn Reed".to_string(),
        age: 39,
        gender: "F".to_string(),
        department: "ICU".to_string(),
        admission_diagnosis: "Acute Liver Failure secondary to Acetaminophen Toxicity / HRS".to_string(),
        medications: vec![
            MedicationEvent { time_offset_min: 0, name: "Acetylcysteine (NAC)".to_string(), dose: "100 mg/kg".to_string(), route: "Continuous Infusion".to_string(), category: "ANTIDOTE".to_string() },
            MedicationEvent { time_offset_min: 360, name: "Lactulose".to_string(), dose: "30 mL".to_string(), route: "NG Tube".to_string(), category: "LAXATIVE".to_string() },
        ],
        baseline_trajectory: build_trajectory_24h(
            &[(0, 106.0, 22.0, 98.0, 58.0, 71.0, 95.0, 37.6, true, "VOICE", 3.6, 14.2, 2.8, 85.0, 6, 7),
              (360, 114.0, 24.0, 92.0, 52.0, 65.0, 93.0, 38.0, true, "PAIN", 4.8, 16.0, 3.4, 70.0, 4, 10),
              (720, 122.0, 26.0, 86.0, 48.0, 60.0, 91.0, 38.4, true, "PAIN", 6.1, 18.2, 4.1, 60.0, 3, 12),
              (1080, 110.0, 22.0, 94.0, 56.0, 68.0, 94.0, 37.8, true, "VOICE", 4.9, 15.8, 3.6, 68.0, 2, 9),
              (1440, 100.0, 18.0, 104.0, 64.0, 77.0, 96.0, 37.3, true, "ALERT", 3.8, 13.5, 3.0, 78.0, 2, 6)],
        ),
    });

    // Bed 13: Severe Community-Acquired Pneumonia / Legionella
    cohort.push(PatientCohortRecord {
        id: "p-1013".to_string(),
        bed: "ICU-13".to_string(),
        name: "Tariq Haddad".to_string(),
        age: 59,
        gender: "M".to_string(),
        department: "ICU".to_string(),
        admission_diagnosis: "Severe Legionella Pneumonia / Septic Respiratory Distress".to_string(),
        medications: vec![
            MedicationEvent { time_offset_min: 0, name: "Levofloxacin".to_string(), dose: "750mg IV".to_string(), route: "IVPB Daily".to_string(), category: "ANTIBIOTIC".to_string() },
            MedicationEvent { time_offset_min: 0, name: "Azithromycin".to_string(), dose: "500mg IV".to_string(), route: "IVPB Daily".to_string(), category: "ANTIBIOTIC".to_string() },
        ],
        baseline_trajectory: build_trajectory_24h(
            &[(0, 112.0, 26.0, 105.0, 65.0, 78.0, 91.0, 39.6, true, "ALERT", 2.5, 19.0, 1.3, 190.0, 5, 5),
              (360, 120.0, 30.0, 98.0, 60.0, 72.0, 89.0, 39.8, true, "ALERT", 3.2, 22.5, 1.5, 175.0, 3, 8),
              (720, 114.0, 26.0, 104.0, 66.0, 78.0, 92.0, 39.1, true, "ALERT", 2.6, 20.0, 1.4, 185.0, 4, 6),
              (1080, 102.0, 22.0, 112.0, 70.0, 84.0, 94.0, 38.4, true, "ALERT", 1.9, 16.8, 1.2, 200.0, 3, 3),
              (1440, 90.0, 18.0, 118.0, 74.0, 88.0, 96.0, 37.8, false, "ALERT", 1.3, 14.0, 1.0, 220.0, 2, 1)],
        ),
    });

    // Bed 14: Myasthenia Gravis Crisis (Insidious Diaphragm Fatigue)
    cohort.push(PatientCohortRecord {
        id: "p-1014".to_string(),
        bed: "ICU-14".to_string(),
        name: "Grace Montgomery".to_string(),
        age: 63,
        gender: "F".to_string(),
        department: "ICU".to_string(),
        admission_diagnosis: "Myasthenia Gravis Crisis with Impending Ventilatory Arrest".to_string(),
        medications: vec![
            MedicationEvent { time_offset_min: 0, name: "IVIG".to_string(), dose: "2 g/kg over 5 days".to_string(), route: "IV Infusion".to_string(), category: "IMMUNOGLOBULIN".to_string() },
            MedicationEvent { time_offset_min: 180, name: "Pyridostigmine".to_string(), dose: "60mg".to_string(), route: "NG Tube".to_string(), category: "CHOLINESTERASE_INHIBITOR".to_string() },
        ],
        baseline_trajectory: build_trajectory_24h(
            &[(0, 88.0, 22.0, 128.0, 80.0, 96.0, 95.0, 37.0, false, "ALERT", 1.2, 7.8, 0.8, 250.0, 8, 1),
              (360, 96.0, 28.0, 136.0, 86.0, 102.0, 92.0, 37.1, true, "ALERT", 1.8, 8.2, 0.9, 245.0, 5, 4),
              (720, 110.0, 36.0, 148.0, 94.0, 112.0, 88.0, 37.2, true, "VOICE", 2.6, 8.9, 1.0, 235.0, 3, 7),
              (1080, 92.0, 20.0, 124.0, 78.0, 93.0, 96.0, 36.9, true, "ALERT", 1.6, 8.4, 0.9, 240.0, 3, 2),
              (1440, 80.0, 16.0, 122.0, 76.0, 91.0, 98.0, 36.8, false, "ALERT", 1.1, 7.9, 0.8, 255.0, 2, 0)],
        ),
    });

    // Bed 15: Polytrauma / Flail Chest & Pulmonary Contusion
    cohort.push(PatientCohortRecord {
        id: "p-1015".to_string(),
        bed: "ICU-15".to_string(),
        name: "Lucas Silva".to_string(),
        age: 32,
        gender: "M".to_string(),
        department: "ICU".to_string(),
        admission_diagnosis: "Motor Vehicle Collision / Flail Chest & Splenic Laceration Grade II".to_string(),
        medications: vec![
            MedicationEvent { time_offset_min: 0, name: "Fentanyl Infusion".to_string(), dose: "50 mcg/hr".to_string(), route: "IV Infusion".to_string(), category: "ANALGESIC".to_string() },
            MedicationEvent { time_offset_min: 0, name: "Tranexamic Acid (TXA)".to_string(), dose: "1g IV".to_string(), route: "IVPB".to_string(), category: "ANTIFIBRINOLYTIC".to_string() },
        ],
        baseline_trajectory: build_trajectory_24h(
            &[(0, 108.0, 24.0, 112.0, 70.0, 84.0, 93.0, 36.8, true, "ALERT", 2.1, 15.0, 1.0, 180.0, 6, 3),
              (360, 116.0, 26.0, 104.0, 66.0, 78.0, 91.0, 37.2, true, "ALERT", 2.7, 16.2, 1.1, 165.0, 4, 5),
              (720, 104.0, 22.0, 116.0, 74.0, 88.0, 94.0, 37.0, true, "ALERT", 1.9, 14.5, 1.0, 175.0, 4, 3),
              (1080, 92.0, 18.0, 120.0, 76.0, 90.0, 96.0, 36.9, false, "ALERT", 1.4, 13.0, 0.9, 190.0, 3, 1),
              (1440, 84.0, 16.0, 122.0, 78.0, 92.0, 98.0, 36.8, false, "ALERT", 1.0, 11.8, 0.8, 210.0, 2, 0)],
        ),
    });

    // Bed 16: Post-Carotid Endarterectomy (Routine Stable Neuro Monitoring)
    cohort.push(PatientCohortRecord {
        id: "p-1016".to_string(),
        bed: "ICU-16".to_string(),
        name: "Sophia Zhao".to_string(),
        age: 67,
        gender: "F".to_string(),
        department: "ICU".to_string(),
        admission_diagnosis: "Post-Right Carotid Endarterectomy / Strict SBP < 140 Goal".to_string(),
        medications: vec![
            MedicationEvent { time_offset_min: 0, name: "Aspirin".to_string(), dose: "81mg".to_string(), route: "PO".to_string(), category: "ANTIPLATELET".to_string() },
            MedicationEvent { time_offset_min: 0, name: "Atorvastatin".to_string(), dose: "80mg".to_string(), route: "PO".to_string(), category: "STATIN".to_string() },
        ],
        baseline_trajectory: build_trajectory_24h(
            &[(0, 68.0, 14.0, 132.0, 78.0, 96.0, 98.0, 36.7, false, "ALERT", 0.9, 7.0, 0.9, 240.0, 8, 0),
              (360, 66.0, 14.0, 130.0, 76.0, 94.0, 99.0, 36.8, false, "ALERT", 0.8, 6.8, 0.9, 245.0, 6, 0),
              (720, 64.0, 14.0, 128.0, 76.0, 93.0, 99.0, 36.6, false, "ALERT", 0.8, 6.7, 0.8, 250.0, 5, 0),
              (1080, 68.0, 15.0, 134.0, 80.0, 98.0, 98.0, 36.7, false, "ALERT", 0.7, 6.5, 0.8, 255.0, 4, 0),
              (1440, 65.0, 14.0, 126.0, 74.0, 91.0, 99.0, 36.8, false, "ALERT", 0.7, 6.4, 0.8, 260.0, 2, 0)],
        ),
    });

    cohort.push(PatientCohortRecord {
        id: "p-2001".to_string(),
        bed: "ED-01".to_string(),
        name: "James R. Kelly".to_string(),
        age: 48,
        gender: "M".to_string(),
        department: "ED".to_string(),
        admission_diagnosis: "Acute Anaphylaxis / Upper Airway Stridor".to_string(),
        medications: vec![
            MedicationEvent { time_offset_min: 0, name: "Epinephrine".to_string(), dose: "0.3mg IM".to_string(), route: "Intramuscular".to_string(), category: "VASOPRESSOR".to_string() },
            MedicationEvent { time_offset_min: 30, name: "Methylprednisolone".to_string(), dose: "125mg IV".to_string(), route: "IV Push".to_string(), category: "STEROID".to_string() },
            MedicationEvent { time_offset_min: 60, name: "Diphenhydramine".to_string(), dose: "50mg IV".to_string(), route: "IV Push".to_string(), category: "ANTIHISTAMINE".to_string() },
        ],
        baseline_trajectory: build_trajectory_24h(
            &[(0, 132.0, 32.0, 85.0, 52.0, 63.0, 89.0, 37.1, true, "VOICE", 3.1, 14.2, 1.1, 230.0, 2, 4),
              (180, 110.0, 24.0, 105.0, 68.0, 80.0, 94.0, 37.0, true, "ALERT", 2.2, 12.0, 1.0, 235.0, 2, 2),
              (360, 92.0, 18.0, 118.0, 74.0, 88.0, 97.0, 36.9, false, "ALERT", 1.6, 10.5, 0.9, 240.0, 3, 1),
              (720, 82.0, 16.0, 122.0, 78.0, 92.0, 98.0, 36.8, false, "ALERT", 1.2, 9.1, 0.9, 245.0, 4, 0),
              (1440, 76.0, 14.0, 124.0, 80.0, 94.0, 99.0, 36.7, false, "ALERT", 1.0, 8.2, 0.8, 250.0, 2, 0)],
        ),
    });

    cohort.push(PatientCohortRecord {
        id: "p-2002".to_string(),
        bed: "ED-02".to_string(),
        name: "Sofia Rodriguez".to_string(),
        age: 29,
        gender: "F".to_string(),
        department: "ED".to_string(),
        admission_diagnosis: "Acute Severe Asthma Exacerbation".to_string(),
        medications: vec![
            MedicationEvent { time_offset_min: 0, name: "Albuterol-Ipratropium".to_string(), dose: "3 mL Neb".to_string(), route: "Inhalation".to_string(), category: "BRONCHODILATOR".to_string() },
            MedicationEvent { time_offset_min: 60, name: "Magnesium Sulfate".to_string(), dose: "2g IV".to_string(), route: "IV Infusion".to_string(), category: "BRONCHODILATOR".to_string() },
            MedicationEvent { time_offset_min: 120, name: "Dexamethasone".to_string(), dose: "10mg IV".to_string(), route: "IV Push".to_string(), category: "STEROID".to_string() },
        ],
        baseline_trajectory: build_trajectory_24h(
            &[(0, 128.0, 30.0, 142.0, 88.0, 106.0, 91.0, 37.2, true, "ALERT", 2.4, 11.2, 0.8, 260.0, 3, 2),
              (360, 112.0, 24.0, 134.0, 84.0, 100.0, 94.0, 37.1, true, "ALERT", 1.8, 10.0, 0.8, 255.0, 3, 1),
              (720, 96.0, 20.0, 126.0, 80.0, 95.0, 96.0, 36.9, false, "ALERT", 1.3, 9.2, 0.7, 250.0, 4, 0),
              (1080, 84.0, 16.0, 120.0, 76.0, 90.0, 98.0, 36.8, false, "ALERT", 1.0, 8.5, 0.7, 250.0, 2, 0),
              (1440, 78.0, 15.0, 118.0, 74.0, 88.0, 99.0, 36.7, false, "ALERT", 0.9, 7.8, 0.7, 250.0, 2, 0)],
        ),
    });

    cohort.push(PatientCohortRecord {
        id: "p-2003".to_string(),
        bed: "ED-03".to_string(),
        name: "Frank Kowalski".to_string(),
        age: 72,
        gender: "M".to_string(),
        department: "ED".to_string(),
        admission_diagnosis: "Acute Unstable Angina / Non-STEMI Rule-Out".to_string(),
        medications: vec![
            MedicationEvent { time_offset_min: 0, name: "Aspirin".to_string(), dose: "324mg PO".to_string(), route: "Oral Chewed".to_string(), category: "ANTIPLATELET".to_string() },
            MedicationEvent { time_offset_min: 15, name: "Nitroglycerin Sublingual".to_string(), dose: "0.4mg SL".to_string(), route: "Sublingual".to_string(), category: "VASODILATOR".to_string() },
            MedicationEvent { time_offset_min: 60, name: "Atorvastatin".to_string(), dose: "80mg PO".to_string(), route: "Oral".to_string(), category: "STATIN".to_string() },
        ],
        baseline_trajectory: build_trajectory_24h(
            &[(0, 98.0, 20.0, 168.0, 96.0, 120.0, 95.0, 36.8, false, "ALERT", 1.4, 9.8, 1.2, 210.0, 4, 1),
              (360, 88.0, 18.0, 148.0, 86.0, 106.0, 96.0, 36.7, false, "ALERT", 1.2, 9.2, 1.1, 215.0, 3, 1),
              (720, 82.0, 16.0, 136.0, 82.0, 100.0, 97.0, 36.7, false, "ALERT", 1.1, 8.8, 1.1, 220.0, 3, 0),
              (1080, 76.0, 16.0, 130.0, 78.0, 95.0, 98.0, 36.6, false, "ALERT", 1.0, 8.2, 1.0, 225.0, 2, 0),
              (1440, 72.0, 15.0, 126.0, 76.0, 92.0, 98.0, 36.6, false, "ALERT", 0.9, 7.9, 1.0, 230.0, 2, 0)],
        ),
    });

    cohort.push(PatientCohortRecord {
        id: "p-2004".to_string(),
        bed: "ED-04".to_string(),
        name: "Brenda Miller".to_string(),
        age: 53,
        gender: "F".to_string(),
        department: "ED".to_string(),
        admission_diagnosis: "Renal Colic / Obstructive Nephrolithiasis".to_string(),
        medications: vec![
            MedicationEvent { time_offset_min: 0, name: "Ketorolac".to_string(), dose: "30mg IV".to_string(), route: "IV Push".to_string(), category: "NSAID".to_string() },
            MedicationEvent { time_offset_min: 30, name: "Ondansetron".to_string(), dose: "4mg IV".to_string(), route: "IV Push".to_string(), category: "ANTIEMETIC".to_string() },
            MedicationEvent { time_offset_min: 120, name: "Normal Saline 0.9%".to_string(), dose: "1000 mL".to_string(), route: "IV Infusion".to_string(), category: "HYDRATION".to_string() },
        ],
        baseline_trajectory: build_trajectory_24h(
            &[(0, 106.0, 22.0, 152.0, 92.0, 112.0, 98.0, 37.1, false, "ALERT", 1.3, 11.4, 1.5, 240.0, 5, 1),
              (360, 90.0, 18.0, 138.0, 84.0, 102.0, 98.0, 36.9, false, "ALERT", 1.1, 10.2, 1.3, 245.0, 4, 0),
              (720, 78.0, 16.0, 128.0, 80.0, 96.0, 99.0, 36.8, false, "ALERT", 1.0, 9.4, 1.2, 250.0, 3, 0),
              (1080, 74.0, 15.0, 122.0, 78.0, 92.0, 99.0, 36.8, false, "ALERT", 0.9, 8.8, 1.1, 255.0, 2, 0),
              (1440, 70.0, 14.0, 120.0, 76.0, 90.0, 99.0, 36.7, false, "ALERT", 0.8, 8.1, 1.0, 260.0, 2, 0)],
        ),
    });

    cohort.push(PatientCohortRecord {
        id: "p-3001".to_string(),
        bed: "MED-12".to_string(),
        name: "Evelyn G. Clark".to_string(),
        age: 79,
        gender: "F".to_string(),
        department: "WARD".to_string(),
        admission_diagnosis: "Hospital-Acquired Pneumonia / Frailty".to_string(),
        medications: vec![
            MedicationEvent { time_offset_min: 0, name: "Ceftriaxone".to_string(), dose: "1g IV".to_string(), route: "IVPB Daily".to_string(), category: "ANTIBIOTIC".to_string() },
            MedicationEvent { time_offset_min: 120, name: "Azithromycin".to_string(), dose: "500mg IV".to_string(), route: "IVPB Daily".to_string(), category: "ANTIBIOTIC".to_string() },
            MedicationEvent { time_offset_min: 720, name: "Guaifenesin".to_string(), dose: "400mg PO".to_string(), route: "Oral".to_string(), category: "EXPECTORANT".to_string() },
        ],
        baseline_trajectory: build_trajectory_24h(
            &[(0, 88.0, 22.0, 126.0, 78.0, 94.0, 93.0, 38.3, true, "ALERT", 1.6, 13.8, 1.1, 210.0, 8, 1),
              (360, 94.0, 24.0, 122.0, 74.0, 90.0, 92.0, 38.5, true, "ALERT", 1.8, 14.5, 1.2, 200.0, 6, 2),
              (720, 102.0, 26.0, 114.0, 68.0, 83.0, 90.0, 38.7, true, "VOICE", 2.3, 16.2, 1.3, 185.0, 4, 3),
              (1080, 110.0, 28.0, 106.0, 64.0, 78.0, 89.0, 38.9, true, "VOICE", 2.8, 17.8, 1.5, 175.0, 3, 5),
              (1440, 118.0, 30.0, 98.0, 60.0, 72.0, 88.0, 39.1, true, "VOICE", 3.4, 19.5, 1.7, 160.0, 2, 7)],
        ),
    });

    cohort.push(PatientCohortRecord {
        id: "p-3002".to_string(),
        bed: "MED-14".to_string(),
        name: "Harold P. Turner".to_string(),
        age: 67,
        gender: "M".to_string(),
        department: "WARD".to_string(),
        admission_diagnosis: "Acute Exacerbation of COPD (GOLD Stage 3)".to_string(),
        medications: vec![
            MedicationEvent { time_offset_min: 0, name: "Prednisone".to_string(), dose: "40mg PO".to_string(), route: "Oral Daily".to_string(), category: "STEROID".to_string() },
            MedicationEvent { time_offset_min: 60, name: "Ipratropium-Albuterol".to_string(), dose: "3 mL Neb".to_string(), route: "Inhalation Q4H".to_string(), category: "BRONCHODILATOR".to_string() },
            MedicationEvent { time_offset_min: 180, name: "Doxycycline".to_string(), dose: "100mg PO".to_string(), route: "Oral BID".to_string(), category: "ANTIBIOTIC".to_string() },
        ],
        baseline_trajectory: build_trajectory_24h(
            &[(0, 96.0, 24.0, 138.0, 84.0, 102.0, 90.0, 37.3, true, "ALERT", 1.5, 11.2, 1.2, 230.0, 6, 2),
              (360, 92.0, 22.0, 134.0, 82.0, 99.0, 91.0, 37.1, true, "ALERT", 1.4, 10.8, 1.2, 235.0, 5, 1),
              (720, 86.0, 20.0, 130.0, 80.0, 96.0, 92.0, 37.0, true, "ALERT", 1.2, 10.0, 1.1, 240.0, 4, 1),
              (1080, 80.0, 18.0, 126.0, 78.0, 94.0, 93.0, 36.9, true, "ALERT", 1.1, 9.4, 1.1, 245.0, 3, 0),
              (1440, 76.0, 17.0, 124.0, 76.0, 92.0, 94.0, 36.8, true, "ALERT", 1.0, 8.8, 1.0, 250.0, 2, 0)],
        ),
    });

    cohort.push(PatientCohortRecord {
        id: "p-3003".to_string(),
        bed: "MED-18".to_string(),
        name: "Miriam S. Cohen".to_string(),
        age: 71,
        gender: "F".to_string(),
        department: "WARD".to_string(),
        admission_diagnosis: "Acute Pyelonephritis / Mild Acute Kidney Injury".to_string(),
        medications: vec![
            MedicationEvent { time_offset_min: 0, name: "Ciprofloxacin".to_string(), dose: "400mg IV".to_string(), route: "IVPB Q12H".to_string(), category: "ANTIBIOTIC".to_string() },
            MedicationEvent { time_offset_min: 60, name: "Acetaminophen".to_string(), dose: "650mg PO".to_string(), route: "Oral PRN".to_string(), category: "ANTIPYRETIC".to_string() },
            MedicationEvent { time_offset_min: 120, name: "D5 0.45% NS + 20 mEq KCl".to_string(), dose: "100 mL/hr".to_string(), route: "IV Infusion".to_string(), category: "HYDRATION".to_string() },
        ],
        baseline_trajectory: build_trajectory_24h(
            &[(0, 104.0, 20.0, 118.0, 72.0, 87.0, 97.0, 38.6, false, "ALERT", 1.9, 15.4, 1.7, 240.0, 7, 2),
              (360, 96.0, 18.0, 122.0, 74.0, 90.0, 97.0, 38.1, false, "ALERT", 1.6, 13.8, 1.5, 245.0, 5, 1),
              (720, 88.0, 17.0, 126.0, 78.0, 94.0, 98.0, 37.6, false, "ALERT", 1.3, 12.0, 1.3, 255.0, 4, 1),
              (1080, 80.0, 16.0, 124.0, 76.0, 92.0, 98.0, 37.1, false, "ALERT", 1.1, 10.5, 1.2, 260.0, 3, 0),
              (1440, 74.0, 15.0, 120.0, 74.0, 89.0, 99.0, 36.8, false, "ALERT", 0.9, 9.2, 1.1, 265.0, 2, 0)],
        ),
    });

    cohort.push(PatientCohortRecord {
        id: "p-3004".to_string(),
        bed: "MED-21".to_string(),
        name: "Robert C. Daniels".to_string(),
        age: 62,
        gender: "M".to_string(),
        department: "WARD".to_string(),
        admission_diagnosis: "Acute Uncomplicated Cellulitis Left Lower Extremity".to_string(),
        medications: vec![
            MedicationEvent { time_offset_min: 0, name: "Cefazolin".to_string(), dose: "1g IV".to_string(), route: "IVPB Q8H".to_string(), category: "ANTIBIOTIC".to_string() },
            MedicationEvent { time_offset_min: 120, name: "Ibuprofen".to_string(), dose: "400mg PO".to_string(), route: "Oral TID".to_string(), category: "NSAID".to_string() },
        ],
        baseline_trajectory: build_trajectory_24h(
            &[(0, 78.0, 16.0, 130.0, 82.0, 98.0, 98.0, 37.6, false, "ALERT", 1.0, 11.2, 0.9, 270.0, 6, 0),
              (360, 74.0, 15.0, 128.0, 80.0, 96.0, 99.0, 37.3, false, "ALERT", 0.9, 10.4, 0.9, 275.0, 5, 0),
              (720, 72.0, 15.0, 125.0, 78.0, 93.0, 99.0, 37.0, false, "ALERT", 0.9, 9.6, 0.8, 280.0, 4, 0),
              (1080, 70.0, 14.0, 122.0, 76.0, 91.0, 99.0, 36.8, false, "ALERT", 0.8, 8.8, 0.8, 285.0, 3, 0),
              (1440, 68.0, 14.0, 120.0, 75.0, 90.0, 99.0, 36.7, false, "ALERT", 0.8, 8.1, 0.8, 290.0, 2, 0)],
        ),
    });

    cohort.push(PatientCohortRecord {
        id: "p-4001".to_string(),
        bed: "SURG-05".to_string(),
        name: "Anthony V. Rossi".to_string(),
        age: 58,
        gender: "M".to_string(),
        department: "SURG".to_string(),
        admission_diagnosis: "Post-Op Open Cholecystectomy / Surgical Site Surveillance".to_string(),
        medications: vec![
            MedicationEvent { time_offset_min: 0, name: "Cefoxitin".to_string(), dose: "2g IV".to_string(), route: "IVPB Q8H".to_string(), category: "ANTIBIOTIC".to_string() },
            MedicationEvent { time_offset_min: 60, name: "Morphine Sulfate".to_string(), dose: "4mg IV".to_string(), route: "IV Push PRN".to_string(), category: "ANALGESIC".to_string() },
            MedicationEvent { time_offset_min: 360, name: "Enoxaparin".to_string(), dose: "40mg SQ".to_string(), route: "Subcutaneous Daily".to_string(), category: "ANTICOAGULANT".to_string() },
        ],
        baseline_trajectory: build_trajectory_24h(
            &[(0, 92.0, 19.0, 136.0, 84.0, 101.0, 96.0, 37.5, false, "ALERT", 1.4, 12.0, 1.0, 230.0, 6, 1),
              (360, 86.0, 17.0, 132.0, 82.0, 98.0, 97.0, 37.2, false, "ALERT", 1.2, 11.2, 0.9, 240.0, 4, 1),
              (720, 80.0, 16.0, 128.0, 80.0, 96.0, 98.0, 36.9, false, "ALERT", 1.0, 10.4, 0.9, 250.0, 3, 0),
              (1080, 75.0, 15.0, 124.0, 78.0, 93.0, 98.0, 36.8, false, "ALERT", 0.9, 9.6, 0.8, 260.0, 2, 0),
              (1440, 72.0, 14.0, 120.0, 76.0, 90.0, 99.0, 36.7, false, "ALERT", 0.8, 8.8, 0.8, 270.0, 2, 0)],
        ),
    });

    cohort.push(PatientCohortRecord {
        id: "p-4002".to_string(),
        bed: "SURG-08".to_string(),
        name: "Margaret J. Walsh".to_string(),
        age: 73,
        gender: "F".to_string(),
        department: "SURG".to_string(),
        admission_diagnosis: "Post-Op Total Hip Arthroplasty / Deep Vein Thrombosis Watch".to_string(),
        medications: vec![
            MedicationEvent { time_offset_min: 0, name: "Cefazolin".to_string(), dose: "2g IV".to_string(), route: "IVPB Q8H".to_string(), category: "ANTIBIOTIC".to_string() },
            MedicationEvent { time_offset_min: 120, name: "Oxycodone".to_string(), dose: "5mg PO".to_string(), route: "Oral Q4H PRN".to_string(), category: "ANALGESIC".to_string() },
            MedicationEvent { time_offset_min: 360, name: "Apixaban".to_string(), dose: "2.5mg PO".to_string(), route: "Oral BID".to_string(), category: "ANTICOAGULANT".to_string() },
        ],
        baseline_trajectory: build_trajectory_24h(
            &[(0, 84.0, 18.0, 140.0, 82.0, 101.0, 96.0, 37.0, false, "ALERT", 1.2, 9.8, 1.1, 240.0, 5, 0),
              (360, 88.0, 19.0, 138.0, 80.0, 99.0, 95.0, 37.2, false, "ALERT", 1.3, 10.4, 1.1, 235.0, 4, 1),
              (720, 98.0, 22.0, 132.0, 78.0, 96.0, 94.0, 37.6, false, "ALERT", 1.6, 11.5, 1.2, 225.0, 3, 2),
              (1080, 112.0, 26.0, 120.0, 72.0, 88.0, 91.0, 38.2, true, "VOICE", 2.4, 13.8, 1.4, 205.0, 2, 4),
              (1440, 124.0, 30.0, 102.0, 62.0, 75.0, 89.0, 38.7, true, "VOICE", 3.2, 16.5, 1.6, 185.0, 2, 7)],
        ),
    });

    cohort.push(PatientCohortRecord {
        id: "p-4003".to_string(),
        bed: "SURG-11".to_string(),
        name: "Gregory S. Evans".to_string(),
        age: 64,
        gender: "M".to_string(),
        department: "SURG".to_string(),
        admission_diagnosis: "Post-Op Anterior Resection / Anastomotic Leak Rule-Out".to_string(),
        medications: vec![
            MedicationEvent { time_offset_min: 0, name: "Piperacillin-Tazobactam".to_string(), dose: "3.375g IV".to_string(), route: "IVPB Q6H".to_string(), category: "ANTIBIOTIC".to_string() },
            MedicationEvent { time_offset_min: 60, name: "Hydromorphone PCA".to_string(), dose: "0.2mg Lockout 6m".to_string(), route: "IV PCA".to_string(), category: "ANALGESIC".to_string() },
        ],
        baseline_trajectory: build_trajectory_24h(
            &[(0, 82.0, 16.0, 128.0, 78.0, 94.0, 97.0, 37.1, false, "ALERT", 1.1, 10.5, 1.0, 250.0, 5, 0),
              (360, 88.0, 18.0, 122.0, 74.0, 90.0, 96.0, 37.5, false, "ALERT", 1.4, 11.8, 1.1, 240.0, 4, 1),
              (720, 100.0, 22.0, 114.0, 68.0, 83.0, 94.0, 38.3, true, "ALERT", 2.1, 14.6, 1.3, 220.0, 3, 3),
              (1080, 118.0, 28.0, 100.0, 58.0, 72.0, 91.0, 39.0, true, "VOICE", 3.5, 18.4, 1.7, 190.0, 2, 6),
              (1440, 130.0, 32.0, 88.0, 50.0, 62.0, 88.0, 39.4, true, "VOICE", 4.8, 22.1, 2.1, 165.0, 1, 9)],
        ),
    });

    cohort.push(PatientCohortRecord {
        id: "p-5001".to_string(),
        bed: "CCU-02".to_string(),
        name: "Salvatore DeLuca".to_string(),
        age: 69,
        gender: "M".to_string(),
        department: "CARD".to_string(),
        admission_diagnosis: "Acute Decompensated Heart Failure (NYHA Class IV)".to_string(),
        medications: vec![
            MedicationEvent { time_offset_min: 0, name: "Furosemide".to_string(), dose: "80mg IV".to_string(), route: "IV Push Q12H".to_string(), category: "DIURETIC".to_string() },
            MedicationEvent { time_offset_min: 60, name: "Nitroglycerin Infusion".to_string(), dose: "20 mcg/min".to_string(), route: "Continuous Infusion".to_string(), category: "VASODILATOR".to_string() },
            MedicationEvent { time_offset_min: 360, name: "Metoprolol Succinate".to_string(), dose: "25mg PO".to_string(), route: "Oral Daily".to_string(), category: "BETA BLOCKER".to_string() },
        ],
        baseline_trajectory: build_trajectory_24h(
            &[(0, 108.0, 28.0, 168.0, 96.0, 120.0, 90.0, 36.8, true, "ALERT", 2.1, 9.4, 1.6, 220.0, 4, 3),
              (360, 98.0, 24.0, 150.0, 88.0, 108.0, 92.0, 36.8, true, "ALERT", 1.8, 9.2, 1.5, 225.0, 3, 2),
              (720, 88.0, 20.0, 136.0, 82.0, 100.0, 95.0, 36.7, true, "ALERT", 1.5, 8.8, 1.4, 230.0, 3, 1),
              (1080, 80.0, 18.0, 128.0, 78.0, 94.0, 96.0, 36.7, false, "ALERT", 1.2, 8.4, 1.3, 235.0, 2, 0),
              (1440, 74.0, 16.0, 122.0, 76.0, 91.0, 98.0, 36.6, false, "ALERT", 1.0, 8.0, 1.2, 240.0, 2, 0)],
        ),
    });

    cohort.push(PatientCohortRecord {
        id: "p-5002".to_string(),
        bed: "CCU-05".to_string(),
        name: "Diane K. Montgomery".to_string(),
        age: 65,
        gender: "F".to_string(),
        department: "CARD".to_string(),
        admission_diagnosis: "Rapid Atrial Fibrillation with Hemodynamic Instability".to_string(),
        medications: vec![
            MedicationEvent { time_offset_min: 0, name: "Diltiazem Infusion".to_string(), dose: "5 mg/hr".to_string(), route: "Continuous Infusion".to_string(), category: "ANTIARRHYTHMIC".to_string() },
            MedicationEvent { time_offset_min: 30, name: "Heparin Continuous".to_string(), dose: "14 units/kg/hr".to_string(), route: "Continuous Infusion".to_string(), category: "ANTICOAGULANT".to_string() },
            MedicationEvent { time_offset_min: 180, name: "Digoxin".to_string(), dose: "0.25mg IV".to_string(), route: "IV Push".to_string(), category: "INOTROPE".to_string() },
        ],
        baseline_trajectory: build_trajectory_24h(
            &[(0, 152.0, 24.0, 96.0, 62.0, 73.0, 94.0, 36.9, true, "ALERT", 2.3, 9.8, 1.1, 210.0, 3, 3),
              (360, 128.0, 20.0, 108.0, 70.0, 82.0, 95.0, 36.8, false, "ALERT", 1.8, 9.4, 1.1, 215.0, 3, 2),
              (720, 104.0, 18.0, 118.0, 74.0, 88.0, 97.0, 36.7, false, "ALERT", 1.4, 9.0, 1.0, 220.0, 2, 1),
              (1080, 88.0, 16.0, 124.0, 78.0, 93.0, 98.0, 36.7, false, "ALERT", 1.1, 8.6, 1.0, 225.0, 2, 0),
              (1440, 78.0, 15.0, 126.0, 80.0, 95.0, 98.0, 36.6, false, "ALERT", 0.9, 8.2, 0.9, 230.0, 2, 0)],
        ),
    });

    cohort.push(PatientCohortRecord {
        id: "p-5003".to_string(),
        bed: "CCU-08".to_string(),
        name: "Patrick J. O'Connor".to_string(),
        age: 77,
        gender: "M".to_string(),
        department: "CARD".to_string(),
        admission_diagnosis: "Complete Heart Block / Transvenous Pacing in Situ".to_string(),
        medications: vec![
            MedicationEvent { time_offset_min: 0, name: "Isoproterenol Infusion".to_string(), dose: "2 mcg/min".to_string(), route: "Continuous Infusion".to_string(), category: "CHRONOTROPE".to_string() },
            MedicationEvent { time_offset_min: 120, name: "Cefazolin".to_string(), dose: "1g IV".to_string(), route: "IVPB Prophylaxis".to_string(), category: "ANTIBIOTIC".to_string() },
        ],
        baseline_trajectory: build_trajectory_24h(
            &[(0, 38.0, 16.0, 86.0, 52.0, 63.0, 95.0, 36.5, false, "ALERT", 1.9, 8.5, 1.4, 210.0, 4, 3),
              (360, 60.0, 16.0, 110.0, 68.0, 82.0, 97.0, 36.7, false, "ALERT", 1.4, 8.4, 1.3, 215.0, 3, 1),
              (720, 72.0, 15.0, 122.0, 74.0, 90.0, 98.0, 36.8, false, "ALERT", 1.1, 8.2, 1.2, 220.0, 2, 0),
              (1080, 72.0, 14.0, 125.0, 76.0, 92.0, 98.0, 36.8, false, "ALERT", 1.0, 8.0, 1.1, 225.0, 2, 0),
              (1440, 72.0, 14.0, 126.0, 78.0, 94.0, 99.0, 36.8, false, "ALERT", 0.9, 7.8, 1.1, 230.0, 2, 0)],
        ),
    });

    cohort.push(PatientCohortRecord {
        id: "p-6001".to_string(),
        bed: "NEURO-02".to_string(),
        name: "Anastasia Volkova".to_string(),
        age: 54,
        gender: "F".to_string(),
        department: "NEURO".to_string(),
        admission_diagnosis: "Acute Ischemic Stroke / s/p Tenecteplase Thrombolysis".to_string(),
        medications: vec![
            MedicationEvent { time_offset_min: 0, name: "Tenecteplase".to_string(), dose: "0.25 mg/kg IV".to_string(), route: "IV Bolus".to_string(), category: "THROMBOLYTIC".to_string() },
            MedicationEvent { time_offset_min: 30, name: "Nicardipine Infusion".to_string(), dose: "5 mg/hr".to_string(), route: "Continuous Titration".to_string(), category: "ANTIHYPERTENSIVE".to_string() },
            MedicationEvent { time_offset_min: 720, name: "Aspirin".to_string(), dose: "300mg PO".to_string(), route: "Enteric Coated".to_string(), category: "ANTIPLATELET".to_string() },
        ],
        baseline_trajectory: build_trajectory_24h(
            &[(0, 86.0, 18.0, 188.0, 108.0, 134.0, 97.0, 36.8, false, "ALERT", 1.2, 8.8, 0.9, 240.0, 4, 1),
              (360, 82.0, 16.0, 158.0, 92.0, 114.0, 98.0, 36.8, false, "ALERT", 1.1, 8.6, 0.9, 245.0, 3, 0),
              (720, 78.0, 16.0, 142.0, 86.0, 104.0, 98.0, 36.7, false, "ALERT", 1.0, 8.4, 0.9, 250.0, 2, 0),
              (1080, 74.0, 15.0, 136.0, 82.0, 100.0, 99.0, 36.7, false, "ALERT", 0.9, 8.1, 0.8, 255.0, 2, 0),
              (1440, 72.0, 14.0, 130.0, 80.0, 96.0, 99.0, 36.6, false, "ALERT", 0.8, 7.9, 0.8, 260.0, 2, 0)],
        ),
    });

    cohort.push(PatientCohortRecord {
        id: "p-6002".to_string(),
        bed: "NEURO-06".to_string(),
        name: "Raymond J. Brooks".to_string(),
        age: 63,
        gender: "M".to_string(),
        department: "NEURO".to_string(),
        admission_diagnosis: "Status Epilepticus Resolved / Levetiracetam Maintenance".to_string(),
        medications: vec![
            MedicationEvent { time_offset_min: 0, name: "Lorazepam".to_string(), dose: "4mg IV".to_string(), route: "IV Push STAT".to_string(), category: "BENZODIAZEPINE".to_string() },
            MedicationEvent { time_offset_min: 30, name: "Levetiracetam".to_string(), dose: "3000mg IV".to_string(), route: "IVPB Loading".to_string(), category: "ANTICONVULSANT".to_string() },
            MedicationEvent { time_offset_min: 360, name: "Lacosamide".to_string(), dose: "200mg IV".to_string(), route: "IVPB Q12H".to_string(), category: "ANTICONVULSANT".to_string() },
        ],
        baseline_trajectory: build_trajectory_24h(
            &[(0, 122.0, 24.0, 156.0, 98.0, 117.0, 92.0, 38.4, true, "VOICE", 3.8, 11.5, 1.3, 210.0, 5, 3),
              (360, 102.0, 20.0, 140.0, 88.0, 105.0, 95.0, 37.8, true, "VOICE", 2.6, 10.8, 1.2, 215.0, 4, 2),
              (720, 88.0, 17.0, 132.0, 82.0, 98.0, 97.0, 37.2, false, "ALERT", 1.8, 9.8, 1.1, 225.0, 3, 1),
              (1080, 78.0, 15.0, 126.0, 78.0, 94.0, 98.0, 36.9, false, "ALERT", 1.3, 9.1, 1.0, 235.0, 2, 0),
              (1440, 72.0, 14.0, 122.0, 76.0, 91.0, 99.0, 36.7, false, "ALERT", 1.0, 8.5, 0.9, 240.0, 2, 0)],
        ),
    });

    cohort.push(PatientCohortRecord {
        id: "p-6003".to_string(),
        bed: "NEURO-09".to_string(),
        name: "Helen M. Young".to_string(),
        age: 76,
        gender: "F".to_string(),
        department: "NEURO".to_string(),
        admission_diagnosis: "Intracerebral Hemorrhage Right Basal Ganglia / GCS Fluctuation".to_string(),
        medications: vec![
            MedicationEvent { time_offset_min: 0, name: "Labetalol Infusion".to_string(), dose: "2 mg/min".to_string(), route: "Continuous Infusion".to_string(), category: "ANTIHYPERTENSIVE".to_string() },
            MedicationEvent { time_offset_min: 60, name: "Mannitol 20%".to_string(), dose: "100g IV".to_string(), route: "IV Infusion".to_string(), category: "OSMOTIC DIURETIC".to_string() },
        ],
        baseline_trajectory: build_trajectory_24h(
            &[(0, 74.0, 16.0, 192.0, 112.0, 138.0, 96.0, 36.9, false, "VOICE", 1.8, 9.6, 1.2, 220.0, 5, 2),
              (360, 80.0, 18.0, 174.0, 100.0, 124.0, 95.0, 37.2, false, "VOICE", 2.2, 10.4, 1.3, 210.0, 4, 3),
              (720, 92.0, 22.0, 160.0, 94.0, 116.0, 93.0, 37.8, true, "PAIN", 3.0, 12.2, 1.5, 195.0, 3, 5),
              (1080, 108.0, 26.0, 146.0, 88.0, 107.0, 90.0, 38.3, true, "PAIN", 4.1, 14.5, 1.8, 180.0, 2, 7),
              (1440, 120.0, 30.0, 132.0, 82.0, 98.0, 88.0, 38.9, true, "UNRESPONSIVE", 5.6, 17.2, 2.2, 160.0, 2, 10)],
        ),
    });

    cohort.push(PatientCohortRecord {
        id: "p-7001".to_string(),
        bed: "ONC-04".to_string(),
        name: "Jonathan Lee".to_string(),
        age: 45,
        gender: "M".to_string(),
        department: "OTHER".to_string(),
        admission_diagnosis: "Febrile Neutropenia post-AML Induction Chemotherapy".to_string(),
        medications: vec![
            MedicationEvent { time_offset_min: 0, name: "Meropenem".to_string(), dose: "1g IV".to_string(), route: "IVPB Q8H".to_string(), category: "ANTIBIOTIC".to_string() },
            MedicationEvent { time_offset_min: 60, name: "Vancomycin".to_string(), dose: "1500mg IV".to_string(), route: "IV Infusion Q12H".to_string(), category: "ANTIBIOTIC".to_string() },
            MedicationEvent { time_offset_min: 180, name: "Filgrastim (G-CSF)".to_string(), dose: "480 mcg SQ".to_string(), route: "Subcutaneous Daily".to_string(), category: "COLONY STIMULATOR".to_string() },
        ],
        baseline_trajectory: build_trajectory_24h(
            &[(0, 116.0, 24.0, 106.0, 66.0, 79.0, 95.0, 39.4, true, "ALERT", 2.8, 0.4, 1.3, 42.0, 4, 3),
              (360, 108.0, 22.0, 110.0, 68.0, 82.0, 96.0, 39.0, true, "ALERT", 2.4, 0.5, 1.2, 45.0, 3, 2),
              (720, 98.0, 20.0, 116.0, 72.0, 86.0, 96.0, 38.4, false, "ALERT", 1.9, 0.8, 1.1, 50.0, 3, 1),
              (1080, 88.0, 18.0, 120.0, 76.0, 90.0, 97.0, 37.8, false, "ALERT", 1.5, 1.2, 1.0, 58.0, 2, 1),
              (1440, 80.0, 16.0, 122.0, 78.0, 92.0, 98.0, 37.2, false, "ALERT", 1.2, 1.9, 0.9, 68.0, 2, 0)],
        ),
    });

    cohort.push(PatientCohortRecord {
        id: "p-7002".to_string(),
        bed: "RENAL-03".to_string(),
        name: "Carolyn A. Henderson".to_string(),
        age: 68,
        gender: "F".to_string(),
        department: "OTHER".to_string(),
        admission_diagnosis: "End-Stage Kidney Disease / Missed Hemodialysis / Hyperkalemia".to_string(),
        medications: vec![
            MedicationEvent { time_offset_min: 0, name: "Calcium Gluconate 10%".to_string(), dose: "1g IV".to_string(), route: "IV Push over 3m".to_string(), category: "CARDIOPROTECTIVE".to_string() },
            MedicationEvent { time_offset_min: 15, name: "Regular Insulin + D50W".to_string(), dose: "10 units + 50 mL".to_string(), route: "IV Push".to_string(), category: "HYPOKALEMIC".to_string() },
            MedicationEvent { time_offset_min: 30, name: "Sodium Zirconium Cyclosilicate".to_string(), dose: "10g PO".to_string(), route: "Oral Suspension".to_string(), category: "POTASSIUM BINDER".to_string() },
        ],
        baseline_trajectory: build_trajectory_24h(
            &[(0, 52.0, 20.0, 172.0, 98.0, 122.0, 95.0, 36.6, false, "ALERT", 1.8, 8.2, 6.4, 180.0, 5, 2),
              (360, 68.0, 18.0, 154.0, 88.0, 110.0, 97.0, 36.7, false, "ALERT", 1.4, 8.0, 4.8, 185.0, 4, 1),
              (720, 74.0, 16.0, 138.0, 82.0, 100.0, 98.0, 36.8, false, "ALERT", 1.1, 7.8, 3.2, 190.0, 3, 0),
              (1080, 74.0, 15.0, 132.0, 80.0, 97.0, 98.0, 36.8, false, "ALERT", 1.0, 7.5, 2.6, 195.0, 2, 0),
              (1440, 72.0, 14.0, 128.0, 78.0, 94.0, 99.0, 36.7, false, "ALERT", 0.9, 7.2, 2.1, 200.0, 2, 0)],
        ),
    });

    cohort
}

fn make_snap(min: i32, vitals: VitalSigns, labs: LabResults, staleness: i32, sofa: i32) -> PatientSnapshot {
    let news2 = calculate_news2(&vitals);
    let confidence = evaluate_confidence(&vitals, staleness);
    let contributing_factors = generate_explainability(&vitals, &labs, &news2);

    PatientSnapshot {
        time_offset_min: min,
        vitals,
        labs,
        news2,
        sofa_est: sofa,
        confidence,
        staleness_minutes: staleness,
        contributing_factors,
    }
}

type TrajectoryPoint = (i32, f32, f32, f32, f32, f32, f32, f32, bool, &'static str, f32, f32, f32, f32, i32, i32);

fn build_trajectory_24h(points: &[TrajectoryPoint]) -> Vec<PatientSnapshot> {
    points
        .iter()
        .map(|&(min, hr, rr, sbp, dbp, map, spo2, temp, o2, cons, lac, wbc, cr, plt, stale, sofa)| {
            make_snap(
                min,
                VitalSigns {
                    heart_rate: Some(hr),
                    resp_rate: Some(rr),
                    systolic_bp: Some(sbp),
                    diastolic_bp: Some(dbp),
                    mean_arterial_pressure: Some(map),
                    spo2: Some(spo2),
                    temp_c: Some(temp),
                    on_supplemental_o2: o2,
                    consciousness: cons.to_string(),
                },
                LabResults {
                    lactate: Some(lac),
                    wbc: Some(wbc),
                    creatinine: Some(cr),
                    platelets: Some(plt),
                    bilirubin: Some(0.6),
                    ph: Some(7.36),
                },
                stale,
                sofa,
            )
        })
        .collect()
}

fn build_trajectory_unreliable_24h() -> Vec<PatientSnapshot> {
    vec![
        make_snap(0, VitalSigns { heart_rate: Some(80.0), resp_rate: Some(18.0), systolic_bp: Some(135.0), diastolic_bp: Some(82.0), mean_arterial_pressure: Some(99.0), spo2: Some(96.0), temp_c: Some(36.7), on_supplemental_o2: false, consciousness: "ALERT".to_string() }, LabResults { lactate: Some(1.1), wbc: Some(6.8), creatinine: Some(1.0), platelets: Some(190.0), bilirubin: Some(0.4), ph: Some(7.40) }, 15, 1),
        make_snap(360, VitalSigns { heart_rate: Some(85.0), resp_rate: None, systolic_bp: Some(130.0), diastolic_bp: Some(80.0), mean_arterial_pressure: Some(96.0), spo2: None, temp_c: Some(36.8), on_supplemental_o2: false, consciousness: "ALERT".to_string() }, LabResults { lactate: Some(1.2), wbc: Some(7.0), creatinine: Some(1.0), platelets: Some(190.0), bilirubin: Some(0.4), ph: Some(7.40) }, 75, 1),
        make_snap(720, VitalSigns { heart_rate: None, resp_rate: None, systolic_bp: Some(128.0), diastolic_bp: Some(78.0), mean_arterial_pressure: Some(94.0), spo2: None, temp_c: None, on_supplemental_o2: false, consciousness: "VOICE".to_string() }, LabResults { lactate: None, wbc: None, creatinine: None, platelets: None, bilirubin: None, ph: None }, 190, 2),
        make_snap(1080, VitalSigns { heart_rate: None, resp_rate: None, systolic_bp: None, diastolic_bp: None, mean_arterial_pressure: None, spo2: None, temp_c: None, on_supplemental_o2: false, consciousness: "VOICE".to_string() }, LabResults { lactate: None, wbc: None, creatinine: None, platelets: None, bilirubin: None, ph: None }, 240, 2),
        make_snap(1440, VitalSigns { heart_rate: Some(74.0), resp_rate: Some(16.0), systolic_bp: Some(125.0), diastolic_bp: Some(75.0), mean_arterial_pressure: Some(91.0), spo2: Some(97.0), temp_c: Some(36.8), on_supplemental_o2: false, consciousness: "ALERT".to_string() }, LabResults { lactate: Some(1.0), wbc: Some(6.5), creatinine: Some(0.9), platelets: Some(195.0), bilirubin: Some(0.4), ph: Some(7.41) }, 4, 0),
    ]
}
