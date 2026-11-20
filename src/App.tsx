import { useState, useEffect, useMemo, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { StatusBar } from './components/StatusBar';
import { FilterBar, FilterType } from './components/FilterBar';
import { PatientRoster } from './components/PatientRoster';
import { DetailPanel } from './components/DetailPanel';
import { Sidebar, DEPARTMENTS } from './components/Sidebar';
import { MenuBar, MenuCategoryConfig } from './components/MenuBar';
import { MenuDialogs } from './components/MenuDialogs';
import { buildApplicationMenus } from './services/menuCommandRegistry';
import {
  WardSimulationState,
  PatientSummary,
  PatientCohortRecord,
  DepartmentId,
} from './types';

export function App() {
  const [simulationState, setSimulationState] = useState<WardSimulationState | null>(null);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [cohorts, setCohorts] = useState<Record<string, PatientCohortRecord>>({});
  const [filterSeverity, setFilterSeverity] = useState<FilterType>('ALL');
  const [isOverviewMode, setIsOverviewMode] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  // PMS Menu Bar State
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [activeDialog, setActiveDialog] = useState<string | null>(null);
  const [interfaceScale, setInterfaceScale] = useState<number>(1);

  // PMS: Left-Hand Collapsible Department Navigation State
  const [selectedDepartment, setSelectedDepartment] = useState<DepartmentId>('ICU');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Safety UX: Sort freezing to avoid jumpy layouts during clinician interaction
  const [isSortFrozen, setIsSortFrozen] = useState(false);
  const [frozenPatients, setFrozenPatients] = useState<PatientSummary[] | null>(null);
  const [hasPendingReorder, setHasPendingReorder] = useState(false);

  // Audit trail for alarm acknowledgment (Clinical Safety Requirement)
  const [auditTrail, setAuditTrail] = useState<Record<string, { role: string; time: string }>>({});

  // 1. Initial State & Real-time Tauri IPC Subscription
  useEffect(() => {
    invoke<WardSimulationState>('get_ward_state')
      .then((state) => {
        setSimulationState(state);
        // Pre-fetch all cohort trajectories for sparklines and timeline analysis
        state.patients.forEach((p) => {
          invoke<PatientCohortRecord | null>('get_patient_details', { patientId: p.id }).then((rec) => {
            if (rec) {
              setCohorts((prev) => ({ ...prev, [p.id]: rec }));
            }
          });
        });
      })
      .catch((err) => console.error('Failed to load initial ward state:', err));

    const unlistenPromise = listen<WardSimulationState>('simulation-update', (event) => {
      setSimulationState(event.payload);
    });

    return () => {
      unlistenPromise.then((unlisten) => unlisten());
    };
  }, []);

  // Update frozen vs live patient order
  useEffect(() => {
    if (!simulationState) return;

    if (isSortFrozen) {
      if (!frozenPatients) {
        setFrozenPatients(simulationState.patients);
      } else {
        // Check if ranking order has diverged
        const orderChanged = simulationState.patients.some(
          (p, idx) => frozenPatients[idx]?.id !== p.id
        );
        if (orderChanged) {
          setHasPendingReorder(true);
        }
        // Update the patient states in-place without re-sorting
        setFrozenPatients((prev) => {
          if (!prev) return simulationState.patients;
          return prev.map((oldP) => {
            const updated = simulationState.patients.find((p) => p.id === oldP.id);
            return updated || oldP;
          });
        });
      }
    } else {
      setFrozenPatients(null);
      setHasPendingReorder(false);
    }
  }, [simulationState, isSortFrozen]);

  const handleApplyPendingReorder = () => {
    if (simulationState) {
      setFrozenPatients(simulationState.patients);
      setHasPendingReorder(false);
    }
  };

  const handleToggleFreezeSort = () => {
    if (isSortFrozen) {
      setIsSortFrozen(false);
      setFrozenPatients(null);
      setHasPendingReorder(false);
    } else {
      setIsSortFrozen(true);
      if (simulationState) {
        setFrozenPatients(simulationState.patients);
      }
    }
  };

  // 2. Playback Commands
  const handleTogglePlay = async () => {
    if (!simulationState) return;
    try {
      const updated = await invoke<WardSimulationState>('set_playback', {
        isPlaying: !simulationState.is_playing,
        speed: simulationState.speed_multiplier,
      });
      setSimulationState(updated);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSetSpeed = async (speed: number) => {
    if (!simulationState) return;
    try {
      const updated = await invoke<WardSimulationState>('set_playback', {
        isPlaying: simulationState.is_playing,
        speed,
      });
      setSimulationState(updated);
    } catch (e) {
      console.error(e);
    }
  };

  const handleScrub = async (minute: number) => {
    try {
      const updated = await invoke<WardSimulationState>('scrub_time', {
        targetMinute: minute,
      });
      setSimulationState(updated);
    } catch (e) {
      console.error(e);
    }
  };

  const handleReset = async () => {
    await handleScrub(0);
  };

  // 3. Clinical Alert Actions with Audit Logging
  const handleAcknowledge = async (alertId: string) => {
    try {
      const updated = await invoke<WardSimulationState>('acknowledge_alert', { alertId });
      setSimulationState(updated);

      // Audit trail record
      const currentMin = simulationState?.current_time_offset_min ?? 0;
      const hours = Math.floor(currentMin / 60);
      const minutes = currentMin % 60;
      const timeStr = `T+${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;

      setAuditTrail((prev) => ({
        ...prev,
        [alertId]: { role: 'Bedside ICU RN', time: timeStr },
      }));
    } catch (e) {
      console.error(e);
    }
  };

  const handleSnooze = async (alertId: string, minutes: number) => {
    try {
      const updated = await invoke<WardSimulationState>('snooze_alert', { alertId, minutes });
      setSimulationState(updated);
    } catch (e) {
      console.error(e);
    }
  };

  // 4. Department Filtering & Live Multi-Department Calculations
  const currentDeptMeta = useMemo(() => {
    return DEPARTMENTS.find((d) => d.id === selectedDepartment) || DEPARTMENTS[0];
  }, [selectedDepartment]);

  // Handler for switching departments - clears previous patient if not in selected department
  const handleSelectDepartment = useCallback((deptId: DepartmentId) => {
    setSelectedDepartment(deptId);
    if (selectedPatientId && simulationState?.patients) {
      const currentPatient = simulationState.patients.find((p) => p.id === selectedPatientId);
      // If current patient doesn't belong to the newly selected department, clear selection
      if (currentPatient && (currentPatient.department || 'ICU') !== deptId) {
        setSelectedPatientId(null);
      }
    }
  }, [selectedPatientId, simulationState?.patients]);

  // Calculate per-department counts for the sidebar
  const departmentCounts = useMemo(() => {
    const allPatients = simulationState?.patients || [];
    const countsMap: Record<DepartmentId, { total: number; critical: number; warning: number; unreliable: number; hasData: boolean }> = {
      ICU: { total: 0, critical: 0, warning: 0, unreliable: 0, hasData: true },
      ED: { total: 0, critical: 0, warning: 0, unreliable: 0, hasData: false },
      WARD: { total: 0, critical: 0, warning: 0, unreliable: 0, hasData: false },
      SURG: { total: 0, critical: 0, warning: 0, unreliable: 0, hasData: false },
      CARD: { total: 0, critical: 0, warning: 0, unreliable: 0, hasData: false },
      NEURO: { total: 0, critical: 0, warning: 0, unreliable: 0, hasData: false },
      OTHER: { total: 0, critical: 0, warning: 0, unreliable: 0, hasData: false },
    };

    allPatients.forEach((p) => {
      const d = (p.department as DepartmentId) || 'ICU';
      if (!countsMap[d]) {
        countsMap[d] = { total: 0, critical: 0, warning: 0, unreliable: 0, hasData: true };
      }
      countsMap[d].total += 1;
      countsMap[d].hasData = true;
      if (p.current_snapshot.news2.total >= 7) countsMap[d].critical += 1;
      else if (p.current_snapshot.news2.total >= 5) countsMap[d].warning += 1;
      if (p.current_snapshot.confidence === 'UNRELIABLE') countsMap[d].unreliable += 1;
    });

    return countsMap;
  }, [simulationState?.patients]);

  // Filter patients by selected department first
  const departmentPatients = useMemo(() => {
    const list = isSortFrozen && frozenPatients ? frozenPatients : simulationState?.patients || [];
    return list.filter((p) => (p.department || 'ICU') === selectedDepartment);
  }, [isSortFrozen, frozenPatients, simulationState?.patients, selectedDepartment]);

  // Apply acuity severity filter on department patients
  const displayedPatients = useMemo(() => {
    return departmentPatients.filter((p) => {
      if (filterSeverity === 'CRITICAL') return p.current_snapshot.news2.total >= 7;
      if (filterSeverity === 'UNRELIABLE') return p.current_snapshot.confidence === 'UNRELIABLE';
      return true;
    });
  }, [departmentPatients, filterSeverity]);

  // Dynamic counts for current department filter bar
  const counts = useMemo(() => {
    return {
      all: departmentPatients.length,
      critical: departmentPatients.filter((p) => p.current_snapshot.news2.total >= 7).length,
      unreliable: departmentPatients.filter((p) => p.current_snapshot.confidence === 'UNRELIABLE').length,
    };
  }, [departmentPatients]);

  // 5. Vital History Generation for Sparklines
  const vitalHistories = useMemo(() => {
    const result: Record<string, {
      hr: (number | null)[];
      sbp: (number | null)[];
      spo2: (number | null)[];
      rr: (number | null)[];
      temp: (number | null)[];
    }> = {};

    const currentMin = simulationState?.current_time_offset_min ?? 0;

    Object.entries(cohorts).forEach(([pId, cohort]) => {
      const trajectoryUntilNow = cohort.baseline_trajectory.filter(
        (snap) => snap.time_offset_min <= currentMin
      );
      // Take up to last 5 observation snapshots
      const recent = trajectoryUntilNow.slice(-5);
      result[pId] = {
        hr: recent.map((s) => s.vitals.heart_rate),
        sbp: recent.map((s) => s.vitals.systolic_bp),
        spo2: recent.map((s) => s.vitals.spo2),
        rr: recent.map((s) => s.vitals.resp_rate),
        temp: recent.map((s) => s.vitals.temp_c),
      };
    });

    return result;
  }, [cohorts, simulationState?.current_time_offset_min]);

  // 6. Keyboard Navigation (Clinical Accessibility)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) {
        return;
      }

      if (e.key === 'Escape') {
        setSelectedPatientId(null);
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (displayedPatients.length === 0) return;
        const currentIndex = displayedPatients.findIndex((p) => p.id === selectedPatientId);
        const nextIndex = currentIndex < displayedPatients.length - 1 ? currentIndex + 1 : 0;
        setSelectedPatientId(displayedPatients[nextIndex].id);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (displayedPatients.length === 0) return;
        const currentIndex = displayedPatients.findIndex((p) => p.id === selectedPatientId);
        const prevIndex = currentIndex > 0 ? currentIndex - 1 : displayedPatients.length - 1;
        setSelectedPatientId(displayedPatients[prevIndex].id);
      } else if (e.key === 'Enter') {
        if (!selectedPatientId && displayedPatients.length > 0) {
          setSelectedPatientId(displayedPatients[0].id);
        }
      } else if (e.key.toLowerCase() === 'f') {
        e.preventDefault();
        setFilterSeverity((prev) => {
          if (prev === 'ALL') return 'CRITICAL';
          if (prev === 'CRITICAL') return 'UNRELIABLE';
          return 'ALL';
        });
      } else if (e.key.toLowerCase() === 'a') {
        // Quick acknowledge active alert
        const targetPatient = displayedPatients.find((p) => p.id === selectedPatientId) || displayedPatients.find((p) => p.active_alerts.length > 0);
        if (targetPatient) {
          const unackAlert = targetPatient.active_alerts.find((a) => !a.acknowledged);
          if (unackAlert) {
            handleAcknowledge(unackAlert.id);
          }
        }
      } else if (e.code === 'Space') {
        e.preventDefault();
        handleTogglePlay();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setActiveDialog('SEARCH_PATIENT');
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        setIsSidebarCollapsed((prev) => !prev);
      } else if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen().catch(() => {});
        } else {
          document.exitFullscreen().catch(() => {});
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key === ',') {
        e.preventDefault();
        setActiveDialog('PREFERENCES');
      } else if ((e.ctrlKey || e.metaKey) && e.key === '1') {
        e.preventDefault();
        setFilterSeverity('ALL');
      } else if ((e.ctrlKey || e.metaKey) && e.key === '2') {
        e.preventDefault();
        setActiveDialog('SEARCH_PATIENT');
      } else if ((e.ctrlKey || e.metaKey) && e.key === '3') {
        e.preventDefault();
        setFilterSeverity('CRITICAL');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [displayedPatients, selectedPatientId, handleTogglePlay]);

  const selectedPatient = useMemo(() => {
    return (simulationState?.patients.find((p) => p.id === selectedPatientId)) || null;
  }, [simulationState, selectedPatientId]);

  const selectedCohort = selectedPatientId ? cohorts[selectedPatientId] || null : null;

  // Build centralized menu bar architecture
  const applicationMenus: MenuCategoryConfig[] = useMemo(() => {
    return buildApplicationMenus({
      selectedDepartment,
      onSelectDepartment: handleSelectDepartment,
      selectedPatient,
      onSelectPatient: (id) => setSelectedPatientId(id),
      departmentPatients,
      isSidebarCollapsed,
      onToggleSidebar: () => setIsSidebarCollapsed((prev) => !prev),
      isDetailPanelOpen: !!selectedPatient,
      onToggleDetailPanel: () => {
        if (selectedPatient) {
          setSelectedPatientId(null);
        } else if (departmentPatients.length > 0) {
          setSelectedPatientId(departmentPatients[0].id);
        }
      },
      isOverviewMode,
      onToggleOverviewMode: () => setIsOverviewMode((prev) => !prev),
      theme,
      onToggleTheme: () => setTheme((t) => (t === 'dark' ? 'light' : 'dark')),
      interfaceScale,
      onSetInterfaceScale: setInterfaceScale,
      filterSeverity,
      onSetFilter: (f) => setFilterSeverity(f),
      isSortFrozen,
      onToggleFreezeSort: handleToggleFreezeSort,
      simulationState,
      onTogglePlay: handleTogglePlay,
      onResetSimulation: handleReset,
      onOpenDialog: (diag) => setActiveDialog(diag),
      onAcknowledgeAlert: handleAcknowledge,
      currentDeptName: currentDeptMeta.fullName,
    });
  }, [
    selectedDepartment,
    handleSelectDepartment,
    selectedPatient,
    departmentPatients,
    isSidebarCollapsed,
    isOverviewMode,
    theme,
    interfaceScale,
    filterSeverity,
    isSortFrozen,
    handleToggleFreezeSort,
    simulationState,
    handleTogglePlay,
    handleReset,
    currentDeptMeta.fullName,
  ]);

  return (
    <div
      style={{ zoom: interfaceScale }}
      className={`h-screen flex flex-col font-sans overflow-hidden select-none ${theme === 'light' ? 'clinical-light' : ''} ${isOverviewMode ? 'text-base' : 'text-xs'}`}
    >
      {/* 1. Desktop Application Menu Bar */}
      <MenuBar
        menus={applicationMenus}
        activeMenuId={activeMenuId}
        onOpenMenu={(id) => setActiveMenuId(id)}
      />

      {/* 2. Slim Fixed Top Status Bar */}
      <StatusBar
        simulationState={simulationState}
        onTogglePlay={handleTogglePlay}
        onSetSpeed={handleSetSpeed}
        onScrub={handleScrub}
        onReset={handleReset}
        isOverviewMode={isOverviewMode}
        onToggleOverviewMode={() => setIsOverviewMode(!isOverviewMode)}
        theme={theme}
        onToggleTheme={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        suppressedAlertsCount={2}
        departmentName={currentDeptMeta.fullName}
        departmentStats={departmentCounts[selectedDepartment]}
      />

      {/* 3. Main horizontal layout: Sidebar + Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Collapsible Department Navigation Sidebar */}
        <Sidebar
          selectedDepartment={selectedDepartment}
          onSelectDepartment={handleSelectDepartment}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          departmentCounts={departmentCounts}
        />

        {/* Right: Vertical stack of FilterBar + Roster + Detail Panel */}
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          {/* 4. Roster Filter & Sort Control Bar */}
          <FilterBar
            currentFilter={filterSeverity}
            onSelectFilter={(f) => setFilterSeverity(f)}
            counts={counts}
            isSortFrozen={isSortFrozen}
            onToggleFreezeSort={handleToggleFreezeSort}
            hasPendingReorder={hasPendingReorder}
            onApplyPendingReorder={handleApplyPendingReorder}
          />

          {/* 5. Main Workspace: Dense Roster List + Docked Right Detail Panel */}
          <div className="flex-1 flex overflow-hidden">
            {/* Patient Roster Table */}
            <PatientRoster
              patients={displayedPatients}
              selectedPatientId={selectedPatientId}
              onSelectPatient={(id) => setSelectedPatientId(id)}
              onAcknowledgeAlert={handleAcknowledge}
              isOverviewMode={isOverviewMode}
              vitalHistories={vitalHistories}
              departmentName={currentDeptMeta.fullName}
              hasDepartmentFeed={departmentCounts[selectedDepartment]?.hasData ?? false}
            />

            {/* Right-Side Attached Detail Panel (Not a modal/backdrop overlay) */}
            {selectedPatient && (
              <DetailPanel
                patient={selectedPatient}
                cohortRecord={selectedCohort}
                onClose={() => setSelectedPatientId(null)}
                onAcknowledgeAlert={handleAcknowledge}
                onSnoozeAlert={handleSnooze}
                auditTrail={auditTrail}
                simulationMinute={simulationState?.current_time_offset_min || 0}
                isPlaying={simulationState?.is_playing || false}
                departmentName={currentDeptMeta.fullName}
              />
            )}
          </div>
        </div>
      </div>

      {/* 6. Centralized Menu Dialogs & Modals */}
      <MenuDialogs
        dialogType={activeDialog}
        onClose={() => setActiveDialog(null)}
        patients={departmentPatients}
        onSelectPatient={(id) => setSelectedPatientId(id)}
        departmentName={currentDeptMeta.fullName}
        departmentStats={departmentCounts[selectedDepartment]}
        auditTrail={auditTrail}
      />
    </div>
  );
}

export default App;
