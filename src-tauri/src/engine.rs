use std::collections::HashMap;
use std::sync::Mutex;
use crate::data::generate_mimic_cohort;
use crate::models::{
    PatientAlert, PatientCohortRecord, PatientSnapshot, PatientSummary, WardSimulationState,
};

pub struct SimulationState {
    pub cohort: Vec<PatientCohortRecord>,
    pub current_time_offset_min: i32,
    pub max_time_offset_min: i32,
    pub is_playing: bool,
    pub speed_multiplier: i32,
    pub acknowledged_alerts: HashMap<String, bool>,
    pub snoozed_alerts: HashMap<String, i32>, // alert_key -> snoozed_until_minute
}

pub struct SimulationManager {
    pub inner: Mutex<SimulationState>,
}

impl SimulationManager {
    pub fn new() -> Self {
        let cohort = generate_mimic_cohort();
        Self {
            inner: Mutex::new(SimulationState {
                cohort,
                current_time_offset_min: 0,
                max_time_offset_min: 1440,
                is_playing: true,
                speed_multiplier: 1,
                acknowledged_alerts: HashMap::new(),
                snoozed_alerts: HashMap::new(),
            }),
        }
    }

    pub fn get_ward_state(&self) -> WardSimulationState {
        let state = self.inner.lock().unwrap();
        build_ward_summary(&state)
    }

    pub fn set_playback(&self, is_playing: bool, speed: i32) -> WardSimulationState {
        let mut state = self.inner.lock().unwrap();
        state.is_playing = is_playing;
        state.speed_multiplier = speed.clamp(1, 10);
        build_ward_summary(&state)
    }

    pub fn scrub_time(&self, target_minute: i32) -> WardSimulationState {
        let mut state = self.inner.lock().unwrap();
        state.current_time_offset_min = target_minute.clamp(0, state.max_time_offset_min);
        build_ward_summary(&state)
    }

    pub fn acknowledge_alert(&self, alert_id: &str) -> WardSimulationState {
        let mut state = self.inner.lock().unwrap();
        state.acknowledged_alerts.insert(alert_id.to_string(), true);
        build_ward_summary(&state)
    }

    pub fn snooze_alert(&self, alert_id: &str, minutes: i32) -> WardSimulationState {
        let mut state = self.inner.lock().unwrap();
        let un_snooze_at = state.current_time_offset_min + minutes;
        state.snoozed_alerts.insert(alert_id.to_string(), un_snooze_at);
        build_ward_summary(&state)
    }

    pub fn tick(&self, delta_simulation_minutes: i32) -> WardSimulationState {
        let mut state = self.inner.lock().unwrap();
        if state.is_playing {
            let next_min = state.current_time_offset_min + delta_simulation_minutes * state.speed_multiplier;
            if next_min > state.max_time_offset_min {
                state.current_time_offset_min = 0; // loop demo
            } else {
                state.current_time_offset_min = next_min;
            }
        }
        build_ward_summary(&state)
    }
}

fn build_ward_summary(state: &SimulationState) -> WardSimulationState {
    let curr_min = state.current_time_offset_min;
    let mut patients = Vec::new();
    let mut total_crit = 0;
    let mut total_warn = 0;

    for patient in &state.cohort {
        // Find snapshot for current_time_offset_min
        let current_snap = get_interpolated_snapshot(patient, curr_min);
        let prev_min = (curr_min - 30).max(0);
        let prev_snap = get_interpolated_snapshot(patient, prev_min);

        let delta_score = current_snap.news2.total - prev_snap.news2.total;
        let trend_direction = if delta_score >= 3 {
            "RAPID_DETERIORATING".to_string()
        } else if delta_score > 0 {
            "DETERIORATING".to_string()
        } else if delta_score < 0 {
            "IMPROVING".to_string()
        } else {
            "STABLE".to_string()
        };

        // Determine alerts with smart hysteresis and snooze suppression
        let mut active_alerts = Vec::new();
        let alert_key = format!("{}-news2", patient.id);

        let is_snoozed = if let Some(&snooze_until) = state.snoozed_alerts.get(&alert_key) {
            curr_min < snooze_until
        } else {
            false
        };

        let is_ack = state.acknowledged_alerts.get(&alert_key).copied().unwrap_or(false);

        if !is_snoozed {
            if current_snap.news2.total >= 7 || delta_score >= 4 {
                active_alerts.push(PatientAlert {
                    id: alert_key.clone(),
                    patient_id: patient.id.clone(),
                    bed_number: patient.bed.clone(),
                    patient_name: patient.name.clone(),
                    severity: "CRITICAL".to_string(),
                    title: format!("Critical NEWS2 Trigger (Score: {})", current_snap.news2.total),
                    explanation: if delta_score >= 4 {
                        format!("Steep decompensation: +{} points in past 30 min. Immediate bedside review required.", delta_score)
                    } else {
                        "Severe multi-system physiological disturbance detected.".to_string()
                    },
                    timestamp_min: curr_min,
                    acknowledged: is_ack,
                    snoozed_until_min: None,
                });
                total_crit += 1;
            } else if current_snap.news2.total >= 5 || delta_score >= 2 {
                active_alerts.push(PatientAlert {
                    id: alert_key.clone(),
                    patient_id: patient.id.clone(),
                    bed_number: patient.bed.clone(),
                    patient_name: patient.name.clone(),
                    severity: "WARNING".to_string(),
                    title: format!("Moderate Risk Escalation (Score: {})", current_snap.news2.total),
                    explanation: "Approaching critical threshold. Increase frequency of vitals observation.".to_string(),
                    timestamp_min: curr_min,
                    acknowledged: is_ack,
                    snoozed_until_min: None,
                });
                total_warn += 1;
            }
        }

        patients.push(PatientSummary {
            id: patient.id.clone(),
            bed: patient.bed.clone(),
            name: patient.name.clone(),
            age: patient.age,
            gender: patient.gender.clone(),
            department: patient.department.clone(),
            admission_diagnosis: patient.admission_diagnosis.clone(),
            current_snapshot: current_snap,
            previous_score: prev_snap.news2.total,
            trend_direction,
            active_alerts,
        });
    }

    // Sort: Sickest patients rise to the top!
    // Priority: NEWS2 total score descending, then staleness/missing priority
    patients.sort_by(|a, b| {
        b.current_snapshot.news2.total.cmp(&a.current_snapshot.news2.total)
            .then_with(|| b.current_snapshot.sofa_est.cmp(&a.current_snapshot.sofa_est))
    });

    WardSimulationState {
        current_time_offset_min: curr_min,
        is_playing: state.is_playing,
        speed_multiplier: state.speed_multiplier,
        patients,
        total_critical_alerts: total_crit,
        total_warning_alerts: total_warn,
    }
}

fn get_interpolated_snapshot(patient: &PatientCohortRecord, minute: i32) -> PatientSnapshot {
    let snaps = &patient.baseline_trajectory;
    if snaps.is_empty() {
        panic!("Empty patient trajectory");
    }

    // Exact match or clamped boundaries
    if minute <= snaps[0].time_offset_min {
        return snaps[0].clone();
    }
    if minute >= snaps[snaps.len() - 1].time_offset_min {
        return snaps[snaps.len() - 1].clone();
    }

    // Find the interval [snap[i], snap[i+1]]
    for i in 0..snaps.len() - 1 {
        let s1 = &snaps[i];
        let s2 = &snaps[i + 1];
        if minute >= s1.time_offset_min && minute <= s2.time_offset_min {
            let span = (s2.time_offset_min - s1.time_offset_min) as f32;
            let ratio = if span > 0.0 { (minute - s1.time_offset_min) as f32 / span } else { 0.0 };

            // Linearly interpolate numeric vitals
            let hr = interp_opt(s1.vitals.heart_rate, s2.vitals.heart_rate, ratio);
            let rr = interp_opt(s1.vitals.resp_rate, s2.vitals.resp_rate, ratio);
            let sbp = interp_opt(s1.vitals.systolic_bp, s2.vitals.systolic_bp, ratio);
            let dbp = interp_opt(s1.vitals.diastolic_bp, s2.vitals.diastolic_bp, ratio);
            let map = interp_opt(s1.vitals.mean_arterial_pressure, s2.vitals.mean_arterial_pressure, ratio);
            let spo2 = interp_opt(s1.vitals.spo2, s2.vitals.spo2, ratio);
            let temp = interp_opt(s1.vitals.temp_c, s2.vitals.temp_c, ratio);

            let vitals = crate::models::VitalSigns {
                heart_rate: hr,
                resp_rate: rr,
                systolic_bp: sbp,
                diastolic_bp: dbp,
                mean_arterial_pressure: map,
                spo2,
                temp_c: temp,
                on_supplemental_o2: if ratio > 0.5 { s2.vitals.on_supplemental_o2 } else { s1.vitals.on_supplemental_o2 },
                consciousness: if ratio > 0.5 { s2.vitals.consciousness.clone() } else { s1.vitals.consciousness.clone() },
            };

            let labs = crate::models::LabResults {
                lactate: interp_opt(s1.labs.lactate, s2.labs.lactate, ratio),
                wbc: interp_opt(s1.labs.wbc, s2.labs.wbc, ratio),
                creatinine: interp_opt(s1.labs.creatinine, s2.labs.creatinine, ratio),
                platelets: interp_opt(s1.labs.platelets, s2.labs.platelets, ratio),
                bilirubin: interp_opt(s1.labs.bilirubin, s2.labs.bilirubin, ratio),
                ph: interp_opt(s1.labs.ph, s2.labs.ph, ratio),
            };

            let staleness = (s1.staleness_minutes as f32 * (1.0 - ratio) + s2.staleness_minutes as f32 * ratio) as i32;
            let sofa = if ratio > 0.5 { s2.sofa_est } else { s1.sofa_est };

            let news2 = crate::clinical::calculate_news2(&vitals);
            let confidence = crate::clinical::evaluate_confidence(&vitals, staleness);
            let contributing_factors = crate::clinical::generate_explainability(&vitals, &labs, &news2);

            return PatientSnapshot {
                time_offset_min: minute,
                vitals,
                labs,
                news2,
                sofa_est: sofa,
                confidence,
                staleness_minutes: staleness,
                contributing_factors,
            };
        }
    }

    snaps[snaps.len() - 1].clone()
}

fn interp_opt(a: Option<f32>, b: Option<f32>, ratio: f32) -> Option<f32> {
    match (a, b) {
        (Some(v1), Some(v2)) => Some(v1 * (1.0 - ratio) + v2 * ratio),
        (Some(v1), None) => if ratio < 0.5 { Some(v1) } else { None },
        (None, Some(v2)) => if ratio >= 0.5 { Some(v2) } else { None },
        (None, None) => None,
    }
}
