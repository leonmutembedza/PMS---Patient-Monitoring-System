import { PatientSummary } from '../types';

/**
 * Triggers a browser download of text data as a file
 */
function downloadFile(content: string, fileName: string, contentType: string) {
  const blob = new Blob([content], { type: contentType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Export selected patient clinical summary as CSV
 */
export function exportPatientCsv(patient: PatientSummary, departmentName: string, simulationMinute: number) {
  const snap = patient.current_snapshot;
  const hours = Math.floor(simulationMinute / 60);
  const mins = simulationMinute % 60;
  const simTime = `T+${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;

  const rows = [
    ['PATIENT CLINICAL SUMMARY REPORT (PMS)'],
    ['Generated At Simulation Time', simTime],
    ['Department', departmentName],
    ['Bed', patient.bed],
    ['Patient Name', patient.name],
    ['Age / Gender', `${patient.age} / ${patient.gender}`],
    ['Patient ID (MRN)', patient.id],
    ['Admission Diagnosis', `"${patient.admission_diagnosis.replace(/"/g, '""')}"`],
    [''],
    ['PHYSIOLOGICAL PARAMETERS', 'VALUE', 'SCORE CONTRIBUTION'],
    ['Heart Rate', snap.vitals.heart_rate ? `${Math.round(snap.vitals.heart_rate)} bpm` : 'Unreliable', snap.news2.hr_score],
    ['Respiration Rate', snap.vitals.resp_rate ? `${Math.round(snap.vitals.resp_rate)} /min` : 'Unreliable', snap.news2.rr_score],
    ['Systolic BP', snap.vitals.systolic_bp ? `${Math.round(snap.vitals.systolic_bp)} mmHg` : 'Unreliable', snap.news2.sbp_score],
    ['Diastolic BP', snap.vitals.diastolic_bp ? `${Math.round(snap.vitals.diastolic_bp)} mmHg` : 'Unreliable', '—'],
    ['Mean Arterial Pressure', snap.vitals.mean_arterial_pressure ? `${Math.round(snap.vitals.mean_arterial_pressure)} mmHg` : 'Unreliable', '—'],
    ['SpO2', snap.vitals.spo2 ? `${Math.round(snap.vitals.spo2)}%` : 'Unreliable', snap.news2.spo2_score],
    ['Supplemental O2', snap.vitals.on_supplemental_o2 ? 'Yes' : 'No', snap.news2.o2_score],
    ['Body Temperature', snap.vitals.temp_c ? `${snap.vitals.temp_c.toFixed(1)} C` : 'Unreliable', snap.news2.temp_score],
    ['Consciousness (AVPU)', snap.vitals.consciousness, snap.news2.consciousness_score],
    [''],
    ['CLINICAL RISK INDICES', 'VALUE', 'RISK TIER'],
    ['TOTAL NEWS2 SCORE', `${snap.news2.total} / 20`, snap.news2.risk_tier],
    ['SOFA Estimate', `${snap.sofa_est} / 24`, 'Organ Failure Index'],
    ['Data Reliability / Confidence', snap.confidence, snap.confidence === 'UNRELIABLE' ? 'High Concern' : 'Normal'],
    ['Observation Staleness', `${snap.staleness_minutes} min`, snap.staleness_minutes > 60 ? 'Stale' : 'Fresh'],
  ];

  const csvContent = rows.map((e) => e.join(',')).join('\n');
  const fileName = `PMS_Patient_${patient.bed}_${patient.name.replace(/\s+/g, '_')}_${Date.now()}.csv`;
  downloadFile(csvContent, fileName, 'text/csv;charset=utf-8;');
}

/**
 * Export department-wide clinical audit as CSV
 */
export function exportDepartmentCsv(
  departmentName: string,
  patients: PatientSummary[],
  simulationMinute: number
) {
  const hours = Math.floor(simulationMinute / 60);
  const mins = simulationMinute % 60;
  const simTime = `T+${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;

  const rows = [
    ['DEPARTMENT WIDE CLINICAL AUDIT REPORT (PMS)'],
    ['Department', departmentName],
    ['Simulation Time', simTime],
    ['Total Patients Active', patients.length],
    [''],
    [
      'Bed',
      'Name',
      'Age',
      'Gender',
      'NEWS2 Score',
      'Risk Tier',
      'Heart Rate',
      'Resp Rate',
      'Systolic BP',
      'SpO2',
      'Temp (C)',
      'Reliability',
      'Admission Diagnosis',
    ],
  ];

  patients.forEach((p) => {
    const s = p.current_snapshot;
    rows.push([
      p.bed,
      `"${p.name}"`,
      p.age,
      p.gender,
      s.news2.total,
      s.news2.risk_tier,
      s.vitals.heart_rate ? Math.round(s.vitals.heart_rate) : 'N/A',
      s.vitals.resp_rate ? Math.round(s.vitals.resp_rate) : 'N/A',
      s.vitals.systolic_bp ? Math.round(s.vitals.systolic_bp) : 'N/A',
      s.vitals.spo2 ? Math.round(s.vitals.spo2) : 'N/A',
      s.vitals.temp_c ? s.vitals.temp_c.toFixed(1) : 'N/A',
      s.confidence,
      `"${p.admission_diagnosis.replace(/"/g, '""')}"`,
    ]);
  });

  const csvContent = rows.map((e) => e.join(',')).join('\n');
  const fileName = `PMS_Department_${departmentName.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.csv`;
  downloadFile(csvContent, fileName, 'text/csv;charset=utf-8;');
}
