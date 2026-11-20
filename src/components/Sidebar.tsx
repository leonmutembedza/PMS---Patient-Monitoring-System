import React from 'react';
import {
  Activity,
  Flame,
  Stethoscope,
  Scissors,
  Heart,
  Brain,
  Building2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { DepartmentId } from '../types';

export interface DepartmentMeta {
  id: DepartmentId;
  name: string;
  fullName: string;
  icon: React.ElementType;
  description: string;
}

export const DEPARTMENTS: DepartmentMeta[] = [
  {
    id: 'ICU',
    name: 'Intensive Care (ICU)',
    fullName: 'Intensive Care Unit (ICU)',
    icon: Activity,
    description: 'High-acuity invasive monitoring, organ support & continuous telemetry',
  },
  {
    id: 'ED',
    name: 'Emergency (ED)',
    fullName: 'Emergency Department (ED)',
    icon: Flame,
    description: 'Acute triage, trauma resuscitation, urgent stabilization & observation',
  },
  {
    id: 'WARD',
    name: 'General Medical Ward',
    fullName: 'General Medical Ward',
    icon: Stethoscope,
    description: 'Inpatient acute & subacute medical care with periodic observations',
  },
  {
    id: 'SURG',
    name: 'Surgical Ward',
    fullName: 'Surgical Inpatient Ward',
    icon: Scissors,
    description: 'Perioperative post-surgical monitoring & surgical recovery',
  },
  {
    id: 'CARD',
    name: 'Cardiology',
    fullName: 'Cardiovascular Care Unit',
    icon: Heart,
    description: 'Hemodynamic monitoring, rhythm surveillance & post-PCI care',
  },
  {
    id: 'NEURO',
    name: 'Neurology',
    fullName: 'Neurological & Neuro-ICU Ward',
    icon: Brain,
    description: 'Consciousness assessment, stroke protocol & intracranial surveillance',
  },
  {
    id: 'OTHER',
    name: 'Other Hospital Units',
    fullName: 'Other Auxiliary Units',
    icon: Building2,
    description: 'Specialty outpatient, oncology, dialysis & long-term care',
  },
];

interface SidebarProps {
  selectedDepartment: DepartmentId;
  onSelectDepartment: (id: DepartmentId) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  departmentCounts: Record<DepartmentId, { total: number; critical: number; warning: number; hasData: boolean }>;
}

export const Sidebar: React.FC<SidebarProps> = ({
  selectedDepartment,
  onSelectDepartment,
  isCollapsed,
  onToggleCollapse,
  departmentCounts,
}) => {
  return (
    <aside
      className={`bg-surface-1 border-r border-surface-border flex flex-col shrink-0 select-none transition-all duration-300 ease-in-out relative z-30 ${
        isCollapsed ? 'w-14' : 'w-64'
      }`}
    >
      {/* 1. System Branding */}
      <div className="h-11 px-3 border-b border-surface-border flex items-center justify-between bg-surface-2/60">
        <div className="flex items-center space-x-2.5 overflow-hidden">
          <div className="w-7 h-7 rounded-[4px] overflow-hidden flex items-center justify-center shrink-0 border border-surface-border bg-surface-0">
            <img src="/pms-icon-64.png" alt="PMS Logo" className="w-full h-full object-cover" />
          </div>
          {!isCollapsed && (
            <div className="leading-tight overflow-hidden whitespace-nowrap">
              <div className="font-bold text-[12px] tracking-tight text-text-primary font-mono flex items-center gap-1.5">
                <span>PMS</span>
                <span className="text-[10px] px-1 py-0.2 rounded-[2px] bg-surface-3 text-text-muted border border-surface-border font-sans font-normal">
                  v2.0
                </span>
              </div>
              <div className="text-[9px] text-text-muted truncate">
                Patient Monitoring System
              </div>
            </div>
          )}
        </div>

        {/* Collapse / Expand Toggle Button */}
        <button
          onClick={onToggleCollapse}
          className="p-1 rounded-[2px] text-text-muted hover:text-text-primary hover:bg-surface-3 border border-transparent hover:border-surface-border transition"
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Hospital Sub-Header descriptor */}
      {!isCollapsed && (
        <div className="px-3.5 py-2 border-b border-surface-border-subtle bg-surface-0/40 text-[10px] text-text-muted font-mono flex items-center justify-between">
          <span className="uppercase tracking-wider">Hospital Units</span>
          <span className="text-[9px] text-text-secondary">Central Router</span>
        </div>
      )}

      {/* 2. Department Navigation List */}
      <nav className="flex-1 overflow-y-auto py-2 px-1.5 space-y-1">
        {DEPARTMENTS.map((dept) => {
          const Icon = dept.icon;
          const isSelected = selectedDepartment === dept.id;
          const stats = departmentCounts[dept.id] || { total: 0, critical: 0, warning: 0, hasData: false };

          return (
            <div key={dept.id} className="relative group">
              <button
                onClick={() => onSelectDepartment(dept.id)}
                className={`w-full flex items-center rounded-[3px] transition text-left ${
                  isCollapsed ? 'justify-center p-2.5' : 'px-2.5 py-2'
                } ${
                  isSelected
                    ? 'bg-surface-3 text-text-primary border border-surface-border shadow-xs'
                    : 'text-text-secondary hover:text-text-primary hover:bg-surface-2 border border-transparent'
                }`}
              >
                {/* Department Icon with Active Accent Indicator */}
                <div className="relative shrink-0">
                  <Icon
                    className={`w-4 h-4 ${
                      isSelected
                        ? 'text-alarm-low'
                        : stats.hasData
                        ? 'text-text-secondary'
                        : 'text-text-muted/60'
                    }`}
                  />
                  {/* Subtle Alert Badge Dot when collapsed */}
                  {isCollapsed && stats.critical > 0 && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-alarm-high ring-2 ring-surface-1" />
                  )}
                </div>

                {/* Expanded Label and Acuity Stats */}
                {!isCollapsed && (
                  <div className="ml-2.5 flex-1 min-w-0 flex items-center justify-between">
                    <div className="truncate">
                      <div className="font-semibold text-[11px] truncate leading-tight">
                        {dept.name}
                      </div>
                      <div className="text-[9px] text-text-muted font-mono truncate mt-0.5">
                        {stats.hasData ? (
                          <span>{stats.total} {stats.total === 1 ? 'patient' : 'patients'}</span>
                        ) : (
                          <span className="italic text-text-muted/70">No active feeds</span>
                        )}
                      </div>
                    </div>

                    {/* Acuity / Alert Indicators */}
                    {stats.hasData ? (
                      <div className="flex items-center space-x-1 shrink-0 ml-1 font-mono text-[9px]">
                        {stats.critical > 0 ? (
                          <span className="px-1.5 py-0.2 rounded-[2px] bg-alarm-high-surface border border-alarm-high/40 text-alarm-high font-bold">
                            {stats.critical}
                          </span>
                        ) : stats.warning > 0 ? (
                          <span className="px-1.5 py-0.2 rounded-[2px] bg-alarm-medium-surface border border-alarm-medium/40 text-alarm-medium font-bold">
                            {stats.warning}
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.2 rounded-[2px] bg-surface-2 text-text-muted border border-surface-border-subtle">
                            {stats.total}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-[9px] px-1 py-0.2 rounded-[2px] bg-surface-2/40 text-text-muted/60 font-mono border border-surface-border-subtle/50">
                        N/A
                      </span>
                    )}
                  </div>
                )}
              </button>

              {/* Tooltip on Collapsed State */}
              {isCollapsed && (
                <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 hidden group-hover:flex flex-col z-50 pointer-events-none whitespace-nowrap bg-surface-2 border border-surface-border px-2.5 py-1.5 rounded-[3px] shadow-xl text-left">
                  <div className="font-bold text-[11px] text-text-primary">{dept.fullName}</div>
                  <div className="text-[9px] text-text-muted mt-0.5 font-mono">
                    {stats.hasData
                      ? `${stats.total} patients (${stats.critical} high priority)`
                      : 'Data stream unavailable'}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* 3. Footer Environment Indicator */}
      <div className="p-2.5 border-t border-surface-border bg-surface-2/30 text-[10px] text-text-muted font-mono">
        {!isCollapsed ? (
          <div className="flex items-center justify-between">
            <span className="truncate">Hospital Core Network</span>
            <span className="w-2 h-2 rounded-full bg-alarm-low shrink-0 animate-pulse" title="Connected to MIMIC-IV simulation router" />
          </div>
        ) : (
          <div className="flex justify-center" title="Hospital Core Connected">
            <span className="w-2 h-2 rounded-full bg-alarm-low shrink-0" />
          </div>
        )}
      </div>
    </aside>
  );
};
