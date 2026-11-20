import { MenuCategoryConfig } from '../components/MenuBar';
import { DepartmentId, PatientSummary, WardSimulationState } from '../types';
import { DEPARTMENTS } from '../components/Sidebar';
import { exportPatientCsv, exportDepartmentCsv } from './exportService';

export interface MenuCommandContext {
  // Navigation & Dept
  selectedDepartment: DepartmentId;
  onSelectDepartment: (id: DepartmentId) => void;
  // Patient Context
  selectedPatient: PatientSummary | null;
  onSelectPatient: (id: string | null) => void;
  departmentPatients: PatientSummary[];
  // View states
  isSidebarCollapsed: boolean;
  onToggleSidebar: () => void;
  isDetailPanelOpen: boolean;
  onToggleDetailPanel: () => void;
  isOverviewMode: boolean;
  onToggleOverviewMode: () => void;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  interfaceScale: number;
  onSetInterfaceScale: (scale: number | ((prev: number) => number)) => void;
  // Filtering & Sorting
  filterSeverity: string;
  onSetFilter: (filter: 'ALL' | 'CRITICAL' | 'UNRELIABLE') => void;
  isSortFrozen: boolean;
  onToggleFreezeSort: () => void;
  // Simulation Controls
  simulationState: WardSimulationState | null;
  onTogglePlay: () => void;
  onResetSimulation: () => void;
  // Modals & Dialogs
  onOpenDialog: (dialogType: string) => void;
  // Alerts
  onAcknowledgeAlert?: (alertId: string) => void;
  currentDeptName: string;
}

export function buildApplicationMenus(ctx: MenuCommandContext): MenuCategoryConfig[] {
  const isPlaying = ctx.simulationState?.is_playing ?? false;
  const currentMin = ctx.simulationState?.current_time_offset_min ?? 0;

  return [
    // ----------------------------------------------------
    // 1. FILE MENU
    // ----------------------------------------------------
    {
      id: 'file',
      label: 'File',
      items: [
        {
          id: 'new_session',
          label: 'New Monitoring Session...',
          action: () => {
            if (window.confirm('Reset current monitoring timeline and start a fresh observation session?')) {
              ctx.onResetSimulation();
            }
          },
        },
        {
          id: 'open_patient',
          label: 'Open Patient Record...',
          shortcut: 'Ctrl+K',
          action: () => ctx.onOpenDialog('SEARCH_PATIENT'),
        },
        {
          id: 'import_data',
          label: 'Import Patient Data...',
          action: () => {
            alert('File Ingestion: Currently streaming real-time synthetic MIMIC-IV cohort trajectories from local engine. Custom EHR file ingestion is managed via system administration.');
          },
        },
        { separator: true, id: 'sep_file_1', label: '' },
        {
          id: 'export_patient',
          label: 'Export Patient Report (CSV)...',
          disabled: !ctx.selectedPatient,
          action: () => {
            if (ctx.selectedPatient) {
              exportPatientCsv(ctx.selectedPatient, ctx.currentDeptName, currentMin);
            }
          },
        },
        {
          id: 'export_dept',
          label: 'Export Department Report (CSV)...',
          action: () => {
            exportDepartmentCsv(ctx.currentDeptName, ctx.departmentPatients, currentMin);
          },
        },
        {
          id: 'print_patient',
          label: 'Print Patient Report...',
          disabled: !ctx.selectedPatient,
          shortcut: 'Ctrl+P',
          action: () => {
            window.print();
          },
        },
        { separator: true, id: 'sep_file_2', label: '' },
        {
          id: 'recent_sessions',
          label: 'Recent Sessions',
          disabled: true,
        },
        {
          id: 'exit_app',
          label: 'Exit PMS',
          danger: true,
          action: () => {
            if (window.confirm('Are you sure you want to exit the Patient Monitoring System?')) {
              window.close();
            }
          },
        },
      ],
    },

    // ----------------------------------------------------
    // 2. EDIT MENU
    // ----------------------------------------------------
    {
      id: 'edit',
      label: 'Edit',
      items: [
        {
          id: 'undo',
          label: 'Undo',
          shortcut: 'Ctrl+Z',
          disabled: true, // No fake undo
        },
        {
          id: 'redo',
          label: 'Redo',
          shortcut: 'Ctrl+Y',
          disabled: true,
        },
        { separator: true, id: 'sep_edit_1', label: '' },
        {
          id: 'copy',
          label: 'Copy Selected Patient Summary',
          disabled: !ctx.selectedPatient,
          shortcut: 'Ctrl+C',
          action: () => {
            if (ctx.selectedPatient) {
              const summary = `${ctx.selectedPatient.bed}: ${ctx.selectedPatient.name} (${ctx.selectedPatient.age}y ${ctx.selectedPatient.gender}) | NEWS2: ${ctx.selectedPatient.current_snapshot.news2.total} | ${ctx.selectedPatient.admission_diagnosis}`;
              navigator.clipboard.writeText(summary);
            }
          },
        },
        {
          id: 'select_all',
          label: 'Select All Patients',
          action: () => ctx.onSetFilter('ALL'),
        },
        { separator: true, id: 'sep_edit_2', label: '' },
        {
          id: 'preferences',
          label: 'Preferences...',
          shortcut: 'Ctrl+,',
          action: () => ctx.onOpenDialog('PREFERENCES'),
        },
        {
          id: 'shortcuts',
          label: 'Keyboard Shortcuts...',
          shortcut: 'Shift+?',
          action: () => ctx.onOpenDialog('SHORTCUTS'),
        },
      ],
    },

    // ----------------------------------------------------
    // 3. VIEW MENU
    // ----------------------------------------------------
    {
      id: 'view',
      label: 'View',
      items: [
        {
          id: 'toggle_sidebar',
          label: ctx.isSidebarCollapsed ? 'Expand Department Sidebar' : 'Collapse Department Sidebar',
          shortcut: 'Ctrl+B',
          checked: !ctx.isSidebarCollapsed,
          action: ctx.onToggleSidebar,
        },
        {
          id: 'toggle_detail',
          label: ctx.isDetailPanelOpen ? 'Close Patient Details' : 'Open Patient Details',
          checked: ctx.isDetailPanelOpen,
          action: ctx.onToggleDetailPanel,
        },
        {
          id: 'toggle_overview',
          label: 'High-Visibility Overview Mode',
          checked: ctx.isOverviewMode,
          action: ctx.onToggleOverviewMode,
        },
        {
          id: 'toggle_theme',
          label: ctx.theme === 'dark' ? 'Switch to Clinical Light Theme' : 'Switch to Clinical Dark Theme',
          action: ctx.onToggleTheme,
        },
        { separator: true, id: 'sep_view_1', label: '' },
        {
          id: 'full_screen',
          label: 'Toggle Application Full Screen',
          shortcut: 'Ctrl+Shift+F',
          action: () => {
            if (!document.fullscreenElement) {
              document.documentElement.requestFullscreen().catch(() => {});
            } else {
              document.exitFullscreen().catch(() => {});
            }
          },
        },
        {
          id: 'reset_layout',
          label: 'Reset Layout',
          action: () => {
            ctx.onSetInterfaceScale(1);
            if (ctx.isSidebarCollapsed) ctx.onToggleSidebar();
            if (ctx.isOverviewMode) ctx.onToggleOverviewMode();
          },
        },
        { separator: true, id: 'sep_view_2', label: '' },
        {
          id: 'zoom_in',
          label: 'Zoom In',
          shortcut: 'Ctrl++',
          action: () => ctx.onSetInterfaceScale((s) => Math.min(s + 0.1, 1.4)),
        },
        {
          id: 'zoom_out',
          label: 'Zoom Out',
          shortcut: 'Ctrl+-',
          action: () => ctx.onSetInterfaceScale((s) => Math.max(s - 0.1, 0.8)),
        },
        {
          id: 'reset_zoom',
          label: 'Reset Zoom (100%)',
          shortcut: 'Ctrl+0',
          action: () => ctx.onSetInterfaceScale(1),
        },
      ],
    },

    // ----------------------------------------------------
    // 4. NAVIGATE MENU
    // ----------------------------------------------------
    {
      id: 'navigate',
      label: 'Navigate',
      items: [
        {
          id: 'nav_dashboard',
          label: 'Department Dashboard',
          shortcut: 'Ctrl+1',
          action: () => {
            ctx.onSetFilter('ALL');
          },
        },
        {
          id: 'nav_directory',
          label: 'Patient Directory...',
          shortcut: 'Ctrl+2',
          action: () => ctx.onOpenDialog('SEARCH_PATIENT'),
        },
        {
          id: 'nav_critical',
          label: 'Critical Patients (NEWS2 >= 7)',
          shortcut: 'Ctrl+3',
          action: () => ctx.onSetFilter('CRITICAL'),
        },
        {
          id: 'nav_unreliable',
          label: 'Telemetry Signal Issues',
          action: () => ctx.onSetFilter('UNRELIABLE'),
        },
        { separator: true, id: 'sep_nav_1', label: '' },
        {
          id: 'nav_audit',
          label: 'Alarm Audit Log...',
          action: () => ctx.onOpenDialog('AUDIT_LOG'),
        },
        {
          id: 'nav_dept_stats',
          label: 'Department Statistics...',
          action: () => ctx.onOpenDialog('DEPARTMENT_STATS'),
        },
      ],
    },

    // ----------------------------------------------------
    // 5. PATIENTS MENU
    // ----------------------------------------------------
    {
      id: 'patients',
      label: 'Patients',
      items: [
        {
          id: 'all_patients',
          label: `All Patients in ${ctx.currentDeptName} (${ctx.departmentPatients.length})`,
          checked: ctx.filterSeverity === 'ALL',
          action: () => ctx.onSetFilter('ALL'),
        },
        {
          id: 'search_patients',
          label: 'Search Patient by Bed or Name...',
          shortcut: 'Ctrl+K',
          action: () => ctx.onOpenDialog('SEARCH_PATIENT'),
        },
        { separator: true, id: 'sep_patients_1', label: '' },
        {
          id: 'crit_patients',
          label: `Critical Acuity Patients (${ctx.departmentPatients.filter((p) => p.current_snapshot.news2.total >= 7).length})`,
          checked: ctx.filterSeverity === 'CRITICAL',
          action: () => ctx.onSetFilter('CRITICAL'),
        },
        {
          id: 'unreliable_patients',
          label: `Patients with Telemetry Issues (${ctx.departmentPatients.filter((p) => p.current_snapshot.confidence === 'UNRELIABLE').length})`,
          checked: ctx.filterSeverity === 'UNRELIABLE',
          action: () => ctx.onSetFilter('UNRELIABLE'),
        },
        { separator: true, id: 'sep_patients_2', label: '' },
        {
          id: 'open_selected',
          label: ctx.selectedPatient ? `Open Bed ${ctx.selectedPatient.bed} (${ctx.selectedPatient.name})` : 'Open Selected Patient',
          disabled: !ctx.selectedPatient,
          action: () => {
            if (ctx.selectedPatient && !ctx.isDetailPanelOpen) {
              ctx.onToggleDetailPanel();
            }
          },
        },
        {
          id: 'export_selected_patient',
          label: 'Export Selected Patient Details (CSV)',
          disabled: !ctx.selectedPatient,
          action: () => {
            if (ctx.selectedPatient) {
              exportPatientCsv(ctx.selectedPatient, ctx.currentDeptName, currentMin);
            }
          },
        },
      ],
    },

    // ----------------------------------------------------
    // 6. DEPARTMENTS MENU
    // ----------------------------------------------------
    {
      id: 'departments',
      label: 'Departments',
      items: DEPARTMENTS.map((dept) => ({
        id: `dept_${dept.id}`,
        label: dept.fullName,
        checked: ctx.selectedDepartment === dept.id,
        action: () => ctx.onSelectDepartment(dept.id),
      })),
    },

    // ----------------------------------------------------
    // 7. MONITORING MENU
    // ----------------------------------------------------
    {
      id: 'monitoring',
      label: 'Monitoring',
      items: [
        {
          id: 'toggle_play',
          label: isPlaying ? 'Pause Simulation Replay' : 'Resume Simulation Replay',
          shortcut: 'Space',
          action: ctx.onTogglePlay,
        },
        {
          id: 'reset_sim',
          label: 'Reset Simulation to T+00:00...',
          action: () => {
            if (window.confirm('Reset simulation clock to T+00:00?')) {
              ctx.onResetSimulation();
            }
          },
        },
        { separator: true, id: 'sep_mon_1', label: '' },
        {
          id: 'toggle_freeze',
          label: ctx.isSortFrozen ? 'Enable Live Sorting' : 'Freeze Patient Sort Order (Safety Lock)',
          checked: ctx.isSortFrozen,
          action: ctx.onToggleFreezeSort,
        },
        { separator: true, id: 'sep_mon_2', label: '' },
        {
          id: 'mon_config',
          label: 'Monitoring Configuration...',
          action: () => ctx.onOpenDialog('PREFERENCES'),
        },
        {
          id: 'news2_config',
          label: 'NEWS2 Calibration & Scoring Rules...',
          action: () => ctx.onOpenDialog('PREFERENCES'),
        },
      ],
    },

    // ----------------------------------------------------
    // 8. ALERTS MENU
    // ----------------------------------------------------
    {
      id: 'alerts',
      label: 'Alerts',
      items: [
        {
          id: 'active_alerts',
          label: 'Filter: High Acuity Alerts (NEWS2 >= 7)',
          checked: ctx.filterSeverity === 'CRITICAL',
          action: () => ctx.onSetFilter('CRITICAL'),
        },
        {
          id: 'unreliable_alerts',
          label: 'Filter: Telemetry Sensor Disconnects',
          checked: ctx.filterSeverity === 'UNRELIABLE',
          action: () => ctx.onSetFilter('UNRELIABLE'),
        },
        {
          id: 'all_alerts',
          label: 'Clear Alert Filter (Show All)',
          checked: ctx.filterSeverity === 'ALL',
          action: () => ctx.onSetFilter('ALL'),
        },
        { separator: true, id: 'sep_alerts_1', label: '' },
        {
          id: 'audit_log',
          label: 'Alarm Audit Log & Response History...',
          action: () => ctx.onOpenDialog('AUDIT_LOG'),
        },
        {
          id: 'alarm_prefs',
          label: 'Alarm Fatigue Reduction & Snooze Settings...',
          action: () => ctx.onOpenDialog('PREFERENCES'),
        },
      ],
    },

    // ----------------------------------------------------
    // 9. TOOLS MENU
    // ----------------------------------------------------
    {
      id: 'tools',
      label: 'Tools',
      items: [
        {
          id: 'data_quality',
          label: 'Data Quality & Signal Reliability Monitor',
          action: () => ctx.onSetFilter('UNRELIABLE'),
        },
        {
          id: 'data_source',
          label: 'Data Source Manager: Simulated MIMIC-IV Engine',
          action: () => {
            alert('Active Data Source: In-memory deterministically synthesized MIMIC-IV cohort trajectory replay with real-time continuous biosignal generator.');
          },
        },
        {
          id: 'clinical_metrics',
          label: 'Department Acuity Statistics...',
          action: () => ctx.onOpenDialog('DEPARTMENT_STATS'),
        },
        {
          id: 'tool_audit',
          label: 'System Audit Trail...',
          action: () => ctx.onOpenDialog('AUDIT_LOG'),
        },
      ],
    },

    // ----------------------------------------------------
    // 10. HELP MENU
    // ----------------------------------------------------
    {
      id: 'help',
      label: 'Help',
      items: [
        {
          id: 'shortcuts_help',
          label: 'Keyboard Shortcuts Reference...',
          shortcut: 'Shift+?',
          action: () => ctx.onOpenDialog('SHORTCUTS'),
        },
        {
          id: 'news2_guide',
          label: 'Royal College of Physicians NEWS2 Guidelines',
          action: () => {
            window.open('https://www.rcplondon.ac.uk/projects/outputs/national-early-warning-score-news-2', '_blank');
          },
        },
        { separator: true, id: 'sep_help_1', label: '' },
        {
          id: 'about',
          label: 'About PMS – Patient Monitoring System...',
          action: () => ctx.onOpenDialog('ABOUT'),
        },
      ],
    },
  ];
}
