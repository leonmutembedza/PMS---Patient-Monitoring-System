use crate::models::{ContributingFactor, LabResults, News2Score, VitalSigns};

/// Calculates Royal College of Physicians NEWS2 Score
/// - Respiration rate: <=8 (3), 9-11 (1), 12-20 (0), 21-24 (2), >=25 (3)
/// - SpO2 Scale 1: <=91 (3), 92-93 (2), 94-95 (1), >=96 (0)
/// - Supplemental O2: No (0), Yes (2)
/// - Systolic BP: <=90 (3), 91-100 (2), 101-110 (1), 111-219 (0), >=220 (3)
/// - Heart Rate: <=40 (3), 41-50 (1), 51-90 (0), 91-110 (1), 111-130 (2), >=131 (3)
/// - Consciousness: Alert (0), Voice/Pain/Unresponsive (3)
/// - Temperature: <=35.0 (3), 35.1-36.0 (1), 36.1-38.0 (0), 38.1-39.0 (1), >=39.1 (2)
pub fn calculate_news2(vitals: &VitalSigns) -> News2Score {
    let mut rr_score = 0;
    if let Some(rr) = vitals.resp_rate {
        if rr <= 8.0 {
            rr_score = 3;
        } else if rr <= 11.0 {
            rr_score = 1;
        } else if rr <= 20.0 {
            rr_score = 0;
        } else if rr <= 24.0 {
            rr_score = 2;
        } else {
            rr_score = 3;
        }
    }

    let mut spo2_score = 0;
    if let Some(spo2) = vitals.spo2 {
        if spo2 <= 91.0 {
            spo2_score = 3;
        } else if spo2 <= 93.0 {
            spo2_score = 2;
        } else if spo2 <= 95.0 {
            spo2_score = 1;
        } else {
            spo2_score = 0;
        }
    }

    let o2_score = if vitals.on_supplemental_o2 { 2 } else { 0 };

    let mut sbp_score = 0;
    if let Some(sbp) = vitals.systolic_bp {
        if sbp <= 90.0 {
            sbp_score = 3;
        } else if sbp <= 100.0 {
            sbp_score = 2;
        } else if sbp <= 110.0 {
            sbp_score = 1;
        } else if sbp <= 219.0 {
            sbp_score = 0;
        } else {
            sbp_score = 3;
        }
    }

    let mut hr_score = 0;
    if let Some(hr) = vitals.heart_rate {
        if hr <= 40.0 {
            hr_score = 3;
        } else if hr <= 50.0 {
            hr_score = 1;
        } else if hr <= 90.0 {
            hr_score = 0;
        } else if hr <= 110.0 {
            hr_score = 1;
        } else if hr <= 130.0 {
            hr_score = 2;
        } else {
            hr_score = 3;
        }
    }

    let consciousness_score = match vitals.consciousness.as_str() {
        "ALERT" => 0,
        _ => 3, // Confusion / Voice / Pain / Unresponsive
    };

    let mut temp_score = 0;
    if let Some(temp) = vitals.temp_c {
        if temp <= 35.0 {
            temp_score = 3;
        } else if temp <= 36.0 {
            temp_score = 1;
        } else if temp <= 38.0 {
            temp_score = 0;
        } else if temp <= 39.0 {
            temp_score = 1;
        } else {
            temp_score = 2;
        }
    }

    let total = rr_score + spo2_score + o2_score + sbp_score + hr_score + consciousness_score + temp_score;

    let risk_tier = if total >= 7 || rr_score >= 3 || spo2_score >= 3 || sbp_score >= 3 || hr_score >= 3 || temp_score >= 3 {
        "HIGH"
    } else if total >= 5 {
        "MEDIUM"
    } else if total >= 1 {
        "LOW_MEDIUM"
    } else {
        "LOW"
    };

    News2Score {
        total,
        hr_score,
        rr_score,
        sbp_score,
        spo2_score,
        temp_score,
        o2_score,
        consciousness_score,
        risk_tier: risk_tier.to_string(),
    }
}

/// Generates clear, plain-language explainability drivers for clinicians
pub fn generate_explainability(vitals: &VitalSigns, labs: &LabResults, news2: &News2Score) -> Vec<ContributingFactor> {
    let mut factors = Vec::new();

    // High blood pressure drop / shock / hypertension
    if let Some(sbp) = vitals.systolic_bp {
        if sbp <= 90.0 {
            factors.push(ContributingFactor {
                parameter: "Blood Pressure".to_string(),
                impact: "HIGH".to_string(),
                description: format!("Severe hypotension (SBP {:.0} mmHg) indicative of circulatory failure", sbp),
                points: news2.sbp_score,
            });
        } else if sbp <= 100.0 {
            factors.push(ContributingFactor {
                parameter: "Blood Pressure".to_string(),
                impact: "MODERATE".to_string(),
                description: format!("Hypotension (SBP {:.0} mmHg)", sbp),
                points: news2.sbp_score,
            });
        } else if sbp <= 110.0 {
            factors.push(ContributingFactor {
                parameter: "Blood Pressure".to_string(),
                impact: "LOW".to_string(),
                description: format!("Borderline low systolic blood pressure ({:.0} mmHg)", sbp),
                points: news2.sbp_score,
            });
        } else if sbp >= 220.0 {
            factors.push(ContributingFactor {
                parameter: "Blood Pressure".to_string(),
                impact: "HIGH".to_string(),
                description: format!("Severe hypertension crisis (SBP {:.0} mmHg)", sbp),
                points: news2.sbp_score,
            });
        }
    }

    // Lactate elevation (hypoperfusion / sepsis)
    if let Some(lac) = labs.lactate {
        if lac >= 4.0 {
            factors.push(ContributingFactor {
                parameter: "Serum Lactate".to_string(),
                impact: "HIGH".to_string(),
                description: format!("Critically elevated lactate ({:.1} mmol/L) indicates severe anaerobic tissue hypoperfusion", lac),
                points: 3,
            });
        } else if lac >= 2.2 {
            factors.push(ContributingFactor {
                parameter: "Serum Lactate".to_string(),
                impact: "MODERATE".to_string(),
                description: format!("Elevated lactate ({:.1} mmol/L) suggests emerging hypoperfusion", lac),
                points: 1,
            });
        }
    }

    // Respiratory distress / hypoxia
    if let Some(rr) = vitals.resp_rate {
        if rr >= 25.0 {
            factors.push(ContributingFactor {
                parameter: "Respiration Rate".to_string(),
                impact: "HIGH".to_string(),
                description: format!("Severe tachypnoea ({:.0} bpm) - high work of breathing", rr),
                points: news2.rr_score,
            });
        } else if rr <= 8.0 {
            factors.push(ContributingFactor {
                parameter: "Respiration Rate".to_string(),
                impact: "HIGH".to_string(),
                description: format!("Severe bradypnoea ({:.0} bpm) - risk of respiratory arrest", rr),
                points: news2.rr_score,
            });
        } else if rr >= 21.0 {
            factors.push(ContributingFactor {
                parameter: "Respiration Rate".to_string(),
                impact: "MODERATE".to_string(),
                description: format!("Elevated respiratory rate ({:.0} bpm)", rr),
                points: news2.rr_score,
            });
        } else if rr <= 11.0 {
            factors.push(ContributingFactor {
                parameter: "Respiration Rate".to_string(),
                impact: "LOW".to_string(),
                description: format!("Depressed respiratory rate ({:.0} bpm)", rr),
                points: news2.rr_score,
            });
        }
    }

    if let Some(spo2) = vitals.spo2 {
        if spo2 <= 91.0 {
            factors.push(ContributingFactor {
                parameter: "Oxygen Saturation".to_string(),
                impact: "HIGH".to_string(),
                description: format!("Severe hypoxia (SpO2 {:.0}%) on {}", spo2, if vitals.on_supplemental_o2 { "supplemental O2" } else { "room air" }),
                points: news2.spo2_score,
            });
        } else if spo2 <= 93.0 {
            factors.push(ContributingFactor {
                parameter: "Oxygen Saturation".to_string(),
                impact: "MODERATE".to_string(),
                description: format!("Moderate hypoxemia (SpO2 {:.0}%) on {}", spo2, if vitals.on_supplemental_o2 { "supplemental O2" } else { "room air" }),
                points: news2.spo2_score,
            });
        } else if spo2 <= 95.0 {
            factors.push(ContributingFactor {
                parameter: "Oxygen Saturation".to_string(),
                impact: "LOW".to_string(),
                description: format!("Borderline low oxygen saturation ({:.0}%)", spo2),
                points: news2.spo2_score,
            });
        }
    }

    if vitals.on_supplemental_o2 {
        factors.push(ContributingFactor {
            parameter: "Oxygen Delivery".to_string(),
            impact: "LOW".to_string(),
            description: "Patient dependent on supplemental oxygen therapy".to_string(),
            points: news2.o2_score,
        });
    }

    // Heart rate
    if let Some(hr) = vitals.heart_rate {
        if hr >= 131.0 {
            factors.push(ContributingFactor {
                parameter: "Heart Rate".to_string(),
                impact: "HIGH".to_string(),
                description: format!("Extreme tachycardia ({:.0} bpm) with impending decompensation", hr),
                points: news2.hr_score,
            });
        } else if hr >= 111.0 {
            factors.push(ContributingFactor {
                parameter: "Heart Rate".to_string(),
                impact: "MODERATE".to_string(),
                description: format!("Marked tachycardia ({:.0} bpm)", hr),
                points: news2.hr_score,
            });
        } else if hr >= 91.0 {
            factors.push(ContributingFactor {
                parameter: "Heart Rate".to_string(),
                impact: "LOW".to_string(),
                description: format!("Mild tachycardia ({:.0} bpm)", hr),
                points: news2.hr_score,
            });
        } else if hr <= 40.0 {
            factors.push(ContributingFactor {
                parameter: "Heart Rate".to_string(),
                impact: "HIGH".to_string(),
                description: format!("Severe bradycardia ({:.0} bpm)", hr),
                points: news2.hr_score,
            });
        } else if hr <= 50.0 {
            factors.push(ContributingFactor {
                parameter: "Heart Rate".to_string(),
                impact: "LOW".to_string(),
                description: format!("Bradycardia ({:.0} bpm)", hr),
                points: news2.hr_score,
            });
        }
    }

    // Neurological consciousness
    if vitals.consciousness != "ALERT" {
        factors.push(ContributingFactor {
            parameter: "Level of Consciousness".to_string(),
            impact: "HIGH".to_string(),
            description: format!("Altered level of consciousness ({})", vitals.consciousness),
            points: news2.consciousness_score,
        });
    }

    // Temperature (fever / hypothermia)
    if let Some(temp) = vitals.temp_c {
        if temp <= 35.0 {
            factors.push(ContributingFactor {
                parameter: "Temperature".to_string(),
                impact: "HIGH".to_string(),
                description: format!("Severe hypothermia ({:.1}°C)", temp),
                points: news2.temp_score,
            });
        } else if temp <= 36.0 {
            factors.push(ContributingFactor {
                parameter: "Temperature".to_string(),
                impact: "LOW".to_string(),
                description: format!("Hypothermia ({:.1}°C)", temp),
                points: news2.temp_score,
            });
        } else if temp >= 39.1 {
            factors.push(ContributingFactor {
                parameter: "Temperature".to_string(),
                impact: "MODERATE".to_string(),
                description: format!("High pyrexia ({:.1}°C)", temp),
                points: news2.temp_score,
            });
        } else if temp >= 38.1 {
            factors.push(ContributingFactor {
                parameter: "Temperature".to_string(),
                impact: "LOW".to_string(),
                description: format!("Pyrexia / Fever ({:.1}°C)", temp),
                points: news2.temp_score,
            });
        }
    }

    // Sort factors by impact (HIGH first) then points descending
    factors.sort_by(|a, b| {
        let rank_a = match a.impact.as_str() { "HIGH" => 3, "MODERATE" => 2, _ => 1 };
        let rank_b = match b.impact.as_str() { "HIGH" => 3, "MODERATE" => 2, _ => 1 };
        rank_b.cmp(&rank_a).then_with(|| b.points.cmp(&a.points))
    });

    factors
}

/// Evaluates confidence level based on missing inputs and staleness
pub fn evaluate_confidence(vitals: &VitalSigns, staleness_minutes: i32) -> String {
    let mut missing_count = 0;
    if vitals.heart_rate.is_none() { missing_count += 1; }
    if vitals.resp_rate.is_none() { missing_count += 1; }
    if vitals.systolic_bp.is_none() { missing_count += 1; }
    if vitals.spo2.is_none() { missing_count += 1; }

    if staleness_minutes > 180 || missing_count >= 2 {
        "UNRELIABLE".to_string()
    } else if staleness_minutes > 60 || missing_count == 1 {
        "MODERATE".to_string()
    } else {
        "HIGH".to_string()
    }
}
