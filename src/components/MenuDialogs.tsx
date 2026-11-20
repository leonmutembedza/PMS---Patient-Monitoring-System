import React, { useState, useEffect } from 'react';
import {
  Search,
  X,
  FileText,
  Sliders,
  Keyboard,
  Info,
  BarChart2,
} from 'lucide-react';
import { PatientSummary } from '../types';

interface MenuDialogProps {
  dialogType: string | null;
  onClose: () => void;
  // Patient Context
  patients: PatientSummary[];
  onSelectPatient: (id: string) => void;
  departmentName: string;
  // Stats
  departmentStats?: {
    total: number;
    critical: number;
    warning: number;
    unreliable: number;
    hasData: boolean;
  };
  auditTrail: Record<string, { role: string; time: string }>;
}

export const MenuDialogs: React.FC<MenuDialogProps> = ({
  dialogType,
  onClose,
  patients,
  onSelectPatient,
  departmentName,
  departmentStats,
  auditTrail,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (dialogType) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [dialogType, onClose]);

  if (!dialogType) return null;

  // Filter patients for Search modal
  const searchResults = patients.filter((p) => {
    const query = searchQuery.toLowerCase();
    return (
      p.name.toLowerCase().includes(query) ||
      p.bed.toLowerCase().includes(query) ||
      p.id.toLowerCase().includes(query) ||
      p.admission_diagnosis.toLowerCase().includes(query)
    );
  });

  return (
    <div
      className="fixed inset-0 z-[1200] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 select-none animate-in fade-in-50 duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl bg-surface-1 border border-surface-border rounded-[4px] shadow-2xl flex flex-col max-h-[85vh] overflow-hidden text-text-primary text-xs"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ============================================================
            1. PATIENT SEARCH DIALOG (Ctrl+K or Open Patient Record)
           ============================================================ */}
        {dialogType === 'SEARCH_PATIENT' && (
          <div className="flex flex-col h-full max-h-[80vh]">
            <div className="px-4 py-3 bg-surface-2 border-b border-surface-border flex items-center justify-between shrink-0">
              <div className="flex items-center space-x-2 font-mono font-bold text-sm">
                <Search className="w-4 h-4 text-alarm-low" />
                <span>Search Patient Records ({departmentName})</span>
              </div>
              <button
                onClick={onClose}
                className="p-1 rounded-[2px] text-text-muted hover:text-text-primary hover:bg-surface-3"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 border-b border-surface-border bg-surface-0">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-text-muted" />
                <input
                  type="text"
                  autoFocus
                  placeholder="Search by name, bed (e.g. ICU-01), MRN ID, or clinical diagnosis..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-surface-2 border border-surface-border rounded-[2px] text-text-primary font-mono text-xs focus:outline-none focus:border-alarm-low placeholder:text-text-muted"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {searchResults.length === 0 ? (
                <div className="py-8 text-center text-text-muted font-mono text-[11px]">
                  No matching patients found in {departmentName}.
                </div>
              ) : (
                searchResults.map((p) => {
                  const isCrit = p.current_snapshot.news2.total >= 7;
                  const isWarn = p.current_snapshot.news2.total >= 5;
                  return (
                    <button
                      key={p.id}
                      onClick={() => {
                        onSelectPatient(p.id);
                        onClose();
                      }}
                      className="w-full p-2.5 rounded-[3px] bg-surface-2/60 hover:bg-surface-3 border border-surface-border-subtle hover:border-surface-border flex items-center justify-between text-left transition"
                    >
                      <div className="flex items-center space-x-3 truncate">
                        <span className="font-mono font-bold bg-surface-3 px-1.5 py-0.5 rounded-[2px] border border-surface-border text-text-primary">
                          {p.bed}
                        </span>
                        <div className="truncate">
                          <div className="font-semibold text-text-primary truncate">
                            {p.name}
                            <span className="text-text-muted font-mono font-normal ml-1.5 text-[10px]">
                              ({p.age}y {p.gender} • ID: {p.id})
                            </span>
                          </div>
                          <div className="text-[10px] text-text-muted truncate mt-0.5">
                            {p.admission_diagnosis}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2 shrink-0 ml-3">
                        <span
                          className={`font-mono font-bold px-1.5 py-0.5 rounded-[2px] border text-[10px] ${
                            isCrit
                              ? 'bg-alarm-high-surface border-alarm-high text-alarm-high'
                              : isWarn
                              ? 'bg-alarm-medium-surface border-alarm-medium text-alarm-medium'
                              : 'bg-surface-3 border-surface-border text-alarm-low'
                          }`}
                        >
                          NEWS2: {p.current_snapshot.news2.total}
                        </span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* ============================================================
            2. KEYBOARD SHORTCUTS REFERENCE
           ============================================================ */}
        {dialogType === 'SHORTCUTS' && (
          <div className="flex flex-col">
            <div className="px-4 py-3 bg-surface-2 border-b border-surface-border flex items-center justify-between">
              <div className="flex items-center space-x-2 font-mono font-bold text-sm">
                <Keyboard className="w-4 h-4 text-alarm-low" />
                <span>PMS Keyboard Shortcuts</span>
              </div>
              <button
                onClick={onClose}
                className="p-1 rounded-[2px] text-text-muted hover:text-text-primary hover:bg-surface-3"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-3 font-mono text-[11px] overflow-y-auto max-h-[60vh]">
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2 bg-surface-2 rounded-[2px] border border-surface-border flex justify-between items-center">
                  <span className="text-text-secondary">Search Patients</span>
                  <kbd className="px-1.5 py-0.5 bg-surface-3 rounded border border-surface-border text-text-primary font-bold">
                    Ctrl + K
                  </kbd>
                </div>
                <div className="p-2 bg-surface-2 rounded-[2px] border border-surface-border flex justify-between items-center">
                  <span className="text-text-secondary">Toggle Play/Pause</span>
                  <kbd className="px-1.5 py-0.5 bg-surface-3 rounded border border-surface-border text-text-primary font-bold">
                    Space
                  </kbd>
                </div>
                <div className="p-2 bg-surface-2 rounded-[2px] border border-surface-border flex justify-between items-center">
                  <span className="text-text-secondary">Cycle Acuity Filter</span>
                  <kbd className="px-1.5 py-0.5 bg-surface-3 rounded border border-surface-border text-text-primary font-bold">
                    F
                  </kbd>
                </div>
                <div className="p-2 bg-surface-2 rounded-[2px] border border-surface-border flex justify-between items-center">
                  <span className="text-text-secondary">Acknowledge Alert</span>
                  <kbd className="px-1.5 py-0.5 bg-surface-3 rounded border border-surface-border text-text-primary font-bold">
                    A
                  </kbd>
                </div>
                <div className="p-2 bg-surface-2 rounded-[2px] border border-surface-border flex justify-between items-center">
                  <span className="text-text-secondary">Navigate Patients</span>
                  <kbd className="px-1.5 py-0.5 bg-surface-3 rounded border border-surface-border text-text-primary font-bold">
                    ↑ / ↓
                  </kbd>
                </div>
                <div className="p-2 bg-surface-2 rounded-[2px] border border-surface-border flex justify-between items-center">
                  <span className="text-text-secondary">Open Selected Patient</span>
                  <kbd className="px-1.5 py-0.5 bg-surface-3 rounded border border-surface-border text-text-primary font-bold">
                    Enter
                  </kbd>
                </div>
                <div className="p-2 bg-surface-2 rounded-[2px] border border-surface-border flex justify-between items-center">
                  <span className="text-text-secondary">Close / Deselect</span>
                  <kbd className="px-1.5 py-0.5 bg-surface-3 rounded border border-surface-border text-text-primary font-bold">
                    Esc
                  </kbd>
                </div>
                <div className="p-2 bg-surface-2 rounded-[2px] border border-surface-border flex justify-between items-center">
                  <span className="text-text-secondary">Toggle Sidebar</span>
                  <kbd className="px-1.5 py-0.5 bg-surface-3 rounded border border-surface-border text-text-primary font-bold">
                    Ctrl + B
                  </kbd>
                </div>
                <div className="p-2 bg-surface-2 rounded-[2px] border border-surface-border flex justify-between items-center">
                  <span className="text-text-secondary">App Full Screen</span>
                  <kbd className="px-1.5 py-0.5 bg-surface-3 rounded border border-surface-border text-text-primary font-bold">
                    Ctrl + Shift + F
                  </kbd>
                </div>
                <div className="p-2 bg-surface-2 rounded-[2px] border border-surface-border flex justify-between items-center">
                  <span className="text-text-secondary">Preferences</span>
                  <kbd className="px-1.5 py-0.5 bg-surface-3 rounded border border-surface-border text-text-primary font-bold">
                    Ctrl + ,
                  </kbd>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================
            3. AUDIT LOG MODAL
           ============================================================ */}
        {dialogType === 'AUDIT_LOG' && (
          <div className="flex flex-col">
            <div className="px-4 py-3 bg-surface-2 border-b border-surface-border flex items-center justify-between">
              <div className="flex items-center space-x-2 font-mono font-bold text-sm">
                <FileText className="w-4 h-4 text-alarm-low" />
                <span>Clinical Alarm Audit Trail (IEC 60601-1-8 Compliance)</span>
              </div>
              <button
                onClick={onClose}
                className="p-1 rounded-[2px] text-text-muted hover:text-text-primary hover:bg-surface-3"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-2 overflow-y-auto max-h-[60vh] font-mono text-[11px]">
              {Object.keys(auditTrail).length === 0 ? (
                <div className="py-8 text-center text-text-muted">
                  No alarm acknowledgments recorded in the current session.
                </div>
              ) : (
                Object.entries(auditTrail).map(([alertId, record]) => (
                  <div
                    key={alertId}
                    className="p-2 bg-surface-2 border border-surface-border rounded-[2px] flex items-center justify-between"
                  >
                    <div>
                      <span className="text-alarm-low font-bold">{alertId}</span>
                      <span className="text-text-muted ml-2">acknowledged by</span>
                      <span className="text-text-primary font-semibold ml-1">{record.role}</span>
                    </div>
                    <span className="text-text-muted bg-surface-3 px-1.5 py-0.2 rounded border border-surface-border">
                      {record.time}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ============================================================
            4. ABOUT PMS MODAL
           ============================================================ */}
        {dialogType === 'ABOUT' && (
          <div className="flex flex-col">
            <div className="px-4 py-3 bg-surface-2 border-b border-surface-border flex items-center justify-between">
              <div className="flex items-center space-x-2 font-mono font-bold text-sm">
                <Info className="w-4 h-4 text-alarm-low" />
                <span>About PMS – Patient Monitoring System</span>
              </div>
              <button
                onClick={onClose}
                className="p-1 rounded-[2px] text-text-muted hover:text-text-primary hover:bg-surface-3"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 text-center space-y-4">
              <div className="w-16 h-16 mx-auto rounded-[6px] overflow-hidden border border-surface-border bg-surface-0 shadow-lg">
                <img src="/pms-icon-128.png" alt="PMS Logo" className="w-full h-full object-cover" />
              </div>
              <div>
                <h3 className="text-base font-bold text-text-primary font-mono tracking-tight">
                  PMS – Patient Monitoring System
                </h3>
                <div className="text-[11px] font-mono text-text-muted mt-1">
                  Version 2.0.0 (Build 2026.11.20)
                </div>
              </div>
              <p className="text-xs text-text-secondary leading-relaxed max-w-md mx-auto font-sans">
                A hospital-wide patient acuity surveillance workstation powered by Tauri, React, and continuous physiological biosignal synthesis. Integrates NEWS2 early warning scoring, multi-department telemetry, and IEC 60601-1-8 alarm ergonomics.
              </p>
              <div className="p-2.5 bg-surface-2 border border-surface-border rounded-[3px] text-[10px] text-text-muted font-mono leading-tight">
                Simulated cohort data modeled after clinical trajectories. Not for live unvalidated clinical diagnostic use.
              </div>
            </div>
          </div>
        )}

        {/* ============================================================
            5. PREFERENCES & CONFIGURATION MODAL
           ============================================================ */}
        {dialogType === 'PREFERENCES' && (
          <div className="flex flex-col">
            <div className="px-4 py-3 bg-surface-2 border-b border-surface-border flex items-center justify-between">
              <div className="flex items-center space-x-2 font-mono font-bold text-sm">
                <Sliders className="w-4 h-4 text-alarm-low" />
                <span>System Preferences & Alarm Thresholds</span>
              </div>
              <button
                onClick={onClose}
                className="p-1 rounded-[2px] text-text-muted hover:text-text-primary hover:bg-surface-3"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-3 font-mono text-[11px]">
              <div className="p-3 bg-surface-2 border border-surface-border rounded-[2px] space-y-2">
                <div className="font-bold text-text-primary">Clinical Alarm Standard</div>
                <div className="text-text-secondary">IEC 60601-1-8 Medical Electrical Alarm System (Color & Tone Hierarchy)</div>
              </div>
              <div className="p-3 bg-surface-2 border border-surface-border rounded-[2px] space-y-2">
                <div className="font-bold text-text-primary">Early Warning Calibration</div>
                <div className="text-text-secondary">Royal College of Physicians NEWS2 Standard Scoring Protocol (Threshold &ge; 7 triggers High Risk)</div>
              </div>
              <div className="p-3 bg-surface-2 border border-surface-border rounded-[2px] space-y-2">
                <div className="font-bold text-text-primary">Telemetry Freshness Window</div>
                <div className="text-text-secondary">Observations older than 60 minutes flagged as Stale / Unreliable</div>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================
            6. CLINICAL METRICS & DEPARTMENT STATS MODAL
           ============================================================ */}
        {dialogType === 'DEPARTMENT_STATS' && (
          <div className="flex flex-col">
            <div className="px-4 py-3 bg-surface-2 border-b border-surface-border flex items-center justify-between">
              <div className="flex items-center space-x-2 font-mono font-bold text-sm">
                <BarChart2 className="w-4 h-4 text-alarm-low" />
                <span>{departmentName} Statistics & Acuity Distribution</span>
              </div>
              <button
                onClick={onClose}
                className="p-1 rounded-[2px] text-text-muted hover:text-text-primary hover:bg-surface-3"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-3 font-mono text-[11px]">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-surface-2 border border-surface-border rounded-[2px]">
                  <div className="text-text-muted text-[10px]">TOTAL CENSUS</div>
                  <div className="text-xl font-bold text-text-primary mt-1">{departmentStats?.total ?? 0} Beds</div>
                </div>
                <div className="p-3 bg-surface-2 border border-surface-border rounded-[2px]">
                  <div className="text-text-muted text-[10px]">CRITICAL (NEWS2 &ge; 7)</div>
                  <div className="text-xl font-bold text-alarm-high mt-1">{departmentStats?.critical ?? 0} Patients</div>
                </div>
                <div className="p-3 bg-surface-2 border border-surface-border rounded-[2px]">
                  <div className="text-text-muted text-[10px]">WATCH LIST (NEWS2 5-6)</div>
                  <div className="text-xl font-bold text-alarm-medium mt-1">{departmentStats?.warning ?? 0} Patients</div>
                </div>
                <div className="p-3 bg-surface-2 border border-surface-border rounded-[2px]">
                  <div className="text-text-muted text-[10px]">SIGNAL UNRELIABLE</div>
                  <div className="text-xl font-bold text-alarm-low mt-1">{departmentStats?.unreliable ?? 0} Leads</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer for modals */}
        <div className="px-4 py-2 bg-surface-2 border-t border-surface-border flex justify-end">
          <button
            onClick={onClose}
            className="px-3 py-1 rounded-[2px] bg-surface-3 hover:bg-surface-4 text-text-primary border border-surface-border font-mono text-[11px] transition"
          >
            Close (Esc)
          </button>
        </div>
      </div>
    </div>
  );
};
