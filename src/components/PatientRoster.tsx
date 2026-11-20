import React from 'react';
import { PatientSummary } from '../types';
import { PatientRow } from './PatientRow';
import { Inbox } from 'lucide-react';

interface PatientRosterProps {
  patients: PatientSummary[];
  selectedPatientId: string | null;
  onSelectPatient: (patientId: string) => void;
  onAcknowledgeAlert: (alertId: string) => void;
  isOverviewMode?: boolean;
  vitalHistories?: Record<string, {
    hr: (number | null)[];
    sbp: (number | null)[];
    spo2: (number | null)[];
    rr: (number | null)[];
    temp: (number | null)[];
  }>;
  departmentName?: string;
  hasDepartmentFeed?: boolean;
}

export const PatientRoster: React.FC<PatientRosterProps> = ({
  patients,
  selectedPatientId,
  onSelectPatient,
  onAcknowledgeAlert,
  isOverviewMode = false,
  vitalHistories = {},
  departmentName = 'Intensive Care Unit (ICU)',
  hasDepartmentFeed = true,
}) => {
  if (!hasDepartmentFeed) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12 text-center text-text-muted bg-surface-0">
        <Inbox className="w-10 h-10 mb-3 text-text-muted/40" />
        <div className="font-mono text-xs font-bold text-text-secondary uppercase tracking-wider">
          DEPARTMENT TELEMETRY FEED UNAVAILABLE
        </div>
        <p className="text-[11px] text-text-muted mt-1.5 max-w-md leading-relaxed font-sans">
          No live EHR observation feed is currently configured or mapped for <span className="text-text-primary font-medium">{departmentName}</span>. Select Intensive Care Unit (ICU) to inspect live simulated telemetry and NEWS2 cohorts.
        </p>
      </div>
    );
  }

  if (patients.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12 text-center text-text-muted bg-surface-0">
        <Inbox className="w-8 h-8 mb-2 text-surface-border" />
        <div className="font-mono text-xs font-semibold text-text-secondary">NO PATIENTS MATCH CURRENT FILTER</div>
        <p className="text-[11px] text-text-muted mt-1 max-w-sm">
          No beds found with the selected acuity filter criteria. Switch back to "All Beds" to view the full roster.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto bg-surface-0 select-text">
      <table className="w-full text-left border-collapse border-spacing-0">
        {/* Sticky Table Header */}
        <thead className="sticky top-0 z-20 bg-surface-1 border-b border-surface-border text-text-muted font-mono uppercase text-[9px] tracking-wider select-none">
          <tr>
            <th className="px-3 py-2 text-left font-medium w-16">Bed / #</th>
            <th className="px-3 py-2 text-left font-medium min-w-[170px] max-w-[210px]">Patient</th>
            <th className="px-3 py-2 text-center font-medium w-16">NEWS2</th>
            <th className="px-2 py-2 text-center font-medium w-14">Trend</th>
            <th className="px-2.5 py-2 text-right font-medium">HR (bpm)</th>
            <th className="px-2.5 py-2 text-right font-medium">BP / MAP</th>
            <th className="px-2.5 py-2 text-right font-medium">SpO2</th>
            <th className="px-2.5 py-2 text-right font-medium">RR</th>
            <th className="px-2.5 py-2 text-right font-medium">Temp</th>
            <th className="px-3 py-2 text-left font-medium min-w-[200px]">Primary Driver</th>
            <th className="px-3 py-2 text-left font-medium w-28">Freshness / Conf</th>
            <th className="px-3 py-2 text-right font-medium w-16">Alert</th>
          </tr>
        </thead>

        {/* Patient Rows */}
        <tbody className="divide-y divide-surface-border-subtle font-sans">
          {patients.map((patient, index) => (
            <PatientRow
              key={patient.id}
              patient={patient}
              rank={index + 1}
              isSelected={patient.id === selectedPatientId}
              onSelect={() => onSelectPatient(patient.id)}
              onAcknowledgeAlert={onAcknowledgeAlert}
              vitalHistory={vitalHistories[patient.id]}
              isOverviewMode={isOverviewMode}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
};
