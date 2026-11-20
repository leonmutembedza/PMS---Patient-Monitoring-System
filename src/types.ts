export interface VitalSigns {
  heart_rate: number | null;
  resp_rate: number | null;
  systolic_bp: number | null;
  diastolic_bp: number | null;
  mean_arterial_pressure: number | null;
  spo2: number | null;
  temp_c: number | null;
  on_supplemental_o2: boolean;
  consciousness: string;
}

export interface LabResults {
  lactate: number | null;
  wbc: number | null;
  creatinine: number | null;
  platelets: number | null;
  bilirubin: number | null;
  ph: number | null;
}

export interface MedicationEvent {
  time_offset_min: number;
  name: string;
  dose: string;
  route: string;
  category: string;
}

export interface ContributingFactor {
  parameter: string;
  impact: 'HIGH' | 'MODERATE' | 'LOW';
  description: string;
  points: number;
}

export interface News2Score {
  total: number;
  hr_score: number;
  rr_score: number;
  sbp_score: number;
  spo2_score: number;
  temp_score: number;
  o2_score: number;
  consciousness_score: number;
  risk_tier: 'LOW' | 'LOW_MEDIUM' | 'MEDIUM' | 'HIGH';
}

export interface PatientSnapshot {
  time_offset_min: number;
  vitals: VitalSigns;
  labs: LabResults;
  news2: News2Score;
  sofa_est: number;
  confidence: 'HIGH' | 'MODERATE' | 'UNRELIABLE';
  staleness_minutes: number;
  contributing_factors: ContributingFactor[];
}

export type DepartmentId =
  | 'ICU'
  | 'ED'
  | 'WARD'
  | 'SURG'
  | 'CARD'
  | 'NEURO'
  | 'OTHER';

export interface DepartmentConfig {
  id: DepartmentId;
  name: string;
  shortCode: string;
  description: string;
  status: 'ACTIVE' | 'OFFLINE' | 'UNAVAILABLE';
}

export interface PatientAlert {
  id: string;
  patient_id: string;
  bed_number: string;
  patient_name: string;
  severity: 'CRITICAL' | 'WARNING' | 'ADVISORY';
  title: string;
  explanation: string;
  timestamp_min: number;
  acknowledged: boolean;
  snoozed_until_min: number | null;
}

export interface PatientSummary {
  id: string;
  bed: string;
  name: string;
  age: number;
  gender: string;
  department?: string;
  admission_diagnosis: string;
  current_snapshot: PatientSnapshot;
  previous_score: number;
  trend_direction: 'RAPID_DETERIORATING' | 'DETERIORATING' | 'STABLE' | 'IMPROVING';
  active_alerts: PatientAlert[];
}

export interface WardSimulationState {
  current_time_offset_min: number;
  is_playing: boolean;
  speed_multiplier: number;
  patients: PatientSummary[];
  total_critical_alerts: number;
  total_warning_alerts: number;
}

export interface PatientCohortRecord {
  id: string;
  bed: string;
  name: string;
  age: number;
  gender: string;
  department?: string;
  admission_diagnosis: string;
  baseline_trajectory: PatientSnapshot[];
  medications: MedicationEvent[];
}
