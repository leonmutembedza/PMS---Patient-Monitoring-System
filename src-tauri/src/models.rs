use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VitalSigns {
    pub heart_rate: Option<f32>,       // bpm (e.g. 40 - 180)
    pub resp_rate: Option<f32>,        // breaths/min (e.g. 8 - 40)
    pub systolic_bp: Option<f32>,      // mmHg
    pub diastolic_bp: Option<f32>,     // mmHg
    pub mean_arterial_pressure: Option<f32>, // mmHg
    pub spo2: Option<f32>,             // % (e.g. 70 - 100)
    pub temp_c: Option<f32>,           // Celsius (e.g. 34.0 - 41.0)
    pub on_supplemental_o2: bool,
    pub consciousness: String,         // "ALERT", "VOICE", "PAIN", "UNRESPONSIVE"
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LabResults {
    pub lactate: Option<f32>,          // mmol/L (normal 0.5 - 2.0; >4.0 septic shock marker)
    pub wbc: Option<f32>,              // K/uL (normal 4.0 - 11.0)
    pub creatinine: Option<f32>,       // mg/dL (normal 0.6 - 1.2; renal failure > 2.0)
    pub platelets: Option<f32>,        // K/uL (normal 150 - 450; SOFA coag < 100)
    pub bilirubin: Option<f32>,        // mg/dL (normal 0.2 - 1.2)
    pub ph: Option<f32>,               // blood pH
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MedicationEvent {
    pub time_offset_min: i32,
    pub name: String,
    pub dose: String,
    pub route: String,
    pub category: String, // "VASOPRESSOR", "ANTIBIOTIC", "SEDATIVE", "FLUID"
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ContributingFactor {
    pub parameter: String,
    pub impact: String, // "HIGH", "MODERATE", "LOW"
    pub description: String,
    pub points: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct News2Score {
    pub total: i32,
    pub hr_score: i32,
    pub rr_score: i32,
    pub sbp_score: i32,
    pub spo2_score: i32,
    pub temp_score: i32,
    pub o2_score: i32,
    pub consciousness_score: i32,
    pub risk_tier: String, // "LOW", "LOW_MEDIUM", "MEDIUM", "HIGH"
}

// Confidence Level for Telemetry Evaluation

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PatientSnapshot {
    pub time_offset_min: i32,
    pub vitals: VitalSigns,
    pub labs: LabResults,
    pub news2: News2Score,
    pub sofa_est: i32,
    pub confidence: String, // "HIGH", "MODERATE", "UNRELIABLE"
    pub staleness_minutes: i32,
    pub contributing_factors: Vec<ContributingFactor>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PatientAlert {
    pub id: String,
    pub patient_id: String,
    pub bed_number: String,
    pub patient_name: String,
    pub severity: String, // "CRITICAL", "WARNING", "ADVISORY"
    pub title: String,
    pub explanation: String,
    pub timestamp_min: i32,
    pub acknowledged: bool,
    pub snoozed_until_min: Option<i32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PatientCohortRecord {
    pub id: String,
    pub bed: String,
    pub name: String,
    pub age: u32,
    pub gender: String,
    pub department: String, // "ICU", "ED", "WARD", "SURG", "CARD", "NEURO", "OTHER"
    pub admission_diagnosis: String,
    pub baseline_trajectory: Vec<PatientSnapshot>,
    pub medications: Vec<MedicationEvent>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PatientSummary {
    pub id: String,
    pub bed: String,
    pub name: String,
    pub age: u32,
    pub gender: String,
    pub department: String, // "ICU", "ED", "WARD", "SURG", "CARD", "NEURO", "OTHER"
    pub admission_diagnosis: String,
    pub current_snapshot: PatientSnapshot,
    pub previous_score: i32,
    pub trend_direction: String, // "RAPID_DETERIORATING", "DETERIORATING", "STABLE", "IMPROVING"
    pub active_alerts: Vec<PatientAlert>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WardSimulationState {
    pub current_time_offset_min: i32,
    pub is_playing: bool,
    pub speed_multiplier: i32,
    pub patients: Vec<PatientSummary>,
    pub total_critical_alerts: usize,
    pub total_warning_alerts: usize,
}
