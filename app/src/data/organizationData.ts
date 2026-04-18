// ============================================
// ORGANIZATION DATA — Standard Departments & Hierarchy Config
// ============================================

/** Standard departments for each Area */
export interface StandardDepartment {
  name: string;
  teamLimit: number;
  description: string;
  /** Fixed teams that are auto-created when the department is seeded */
  standardTeams: string[];
}

export const STANDARD_DEPARTMENTS: StandardDepartment[] = [
  {
    name: 'System',
    teamLimit: 4,
    description: 'System administration and IT infrastructure',
    standardTeams: ['Team1', 'Team2', 'Team3', 'Team4']
  },
  {
    name: 'Operations',
    teamLimit: 3,
    description: 'Day-to-day operational management',
    standardTeams: ['Team1', 'Team2', 'Team3']
  },
  {
    name: 'Project',
    teamLimit: 3,
    description: 'Project execution and delivery',
    standardTeams: ['Team1', 'Team2', 'Team3']
  },
  {
    name: 'Support + HR',
    teamLimit: 2,
    description: 'Human resources and employee support',
    standardTeams: ['Team1', 'Team2']
  },
  {
    name: 'Finance + Analytics',
    teamLimit: 2,
    description: 'Financial operations and data analytics',
    standardTeams: ['Team1', 'Team2']
  },
  {
    name: 'Maintenance',
    teamLimit: 2,
    description: 'Equipment and facility maintenance',
    standardTeams: ['Team1', 'Team2']
  },
];

/** Total fixed teams across all departments */
export const TOTAL_STANDARD_TEAMS = STANDARD_DEPARTMENTS.reduce((sum, d) => sum + d.standardTeams.length, 0);

/** Roles that operate at Area level (no department/team required) */
export const AREA_LEVEL_ROLES = ['admin', 'hr', 'general_manager', 'project_manager', 'supervisor'];

/** Roles that must be assigned to a Department + Team */
export const TEAM_LEVEL_ROLES = ['employee', 'intern', 'apprentice'];

/** Check if a role requires department assignment */
export const requiresDepartment = (role: string): boolean => TEAM_LEVEL_ROLES.includes(role);

/** Check if a role requires team assignment */
export const requiresTeam = (role: string): boolean => TEAM_LEVEL_ROLES.includes(role);

/** Get team limit for a standard department by name */
export const getTeamLimit = (deptName: string): number => {
  const dept = STANDARD_DEPARTMENTS.find(d => d.name.toLowerCase() === deptName.toLowerCase());
  return dept?.teamLimit || 3; // default 3 if not found
};

/** Get standard team names for a department */
export const getStandardTeams = (deptName: string): string[] => {
  const dept = STANDARD_DEPARTMENTS.find(d => d.name.toLowerCase() === deptName.toLowerCase());
  return dept?.standardTeams || [];
};
