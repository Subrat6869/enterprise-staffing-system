// ============================================
// AREA DATA — 38 MCL Areas
// ============================================

export interface Area {
  code: string;
  name: string;
}

export const AREAS: Area[] = [
  { code: '001', name: 'MAHANADI COAL FIELD' },
  { code: '002', name: 'MAHANADI COAL FIELD BHUBANESWAR' },
  { code: '003', name: 'MAHANADI COAL FIELD SAMBALPUR' },
  { code: '004', name: 'MAHANADI COAL FIELDS LIMITED' },
  { code: '005', name: 'MAHANADI COALFIELD LIMITED (NSCH COLLEGE Additional 93 Deployment)' },
  { code: '006', name: 'MAHANADI COALFIELD LIMITED (NSCH COLLEGE Extra Deployment)' },
  { code: '007', name: 'MAHANADI COALFIELD LIMITED (NSCH COLLEGE)' },
  { code: '008', name: 'MAHANADI COALFIELD LIMITED (NSCH HOSPITAL 2)' },
  { code: '009', name: 'MAHANADI COALFIELD LIMITED (BALABHADRA OCP)' },
  { code: '010', name: 'MAHANADI COALFIELD LIMITED (HINGULA GM)' },
  { code: '011', name: 'MAHANADI COALFIELD LIMITED (BALANDA OCP)' },
  { code: '012', name: 'MAHANADI COALFIELD LIMITED (BALARAM OCP)' },
  { code: '013', name: 'MAHANADI COALFIELD LIMITED (HINGULA OCP)' },
  { code: '014', name: 'MAHANADI COALFIELD LIMITED (JAGANNATH OCP)' },
  { code: '015', name: 'MAHANADI COALFIELD LIMITED (JAGANNATH GM)' },
  { code: '016', name: 'MAHANADI COALFIELDS LIMITED (NSCH)' },
  { code: '017', name: 'MAHANADI COALFIELDS LIMITED (ANANTA OCP)' },
  { code: '018', name: 'MAHANADI COALFIELDS LIMITED (CWS TALCHER)' },
  { code: '019', name: 'MAHANADI COALFIELDS LIMITED (KANIHA AREA)' },
  { code: '020', name: 'MAHANADI COALFIELDS LIMITED (TALCHER AREA)' },
  { code: '021', name: 'MAHANANDI COAL FIELD (SUBHADRA AREA)' },
  { code: '022', name: 'MCL (CWS IBV)' },
  { code: '023', name: 'MCL (IB VALLEY LAJKURA OCP)' },
  { code: '024', name: 'MCL (LAKHANPUR AREA LILARI)' },
  { code: '025', name: 'MCL (ORIENT RAMPUR SUB AREA)' },
  { code: '026', name: 'MCL (B&G GM UNIT)' },
  { code: '027', name: 'MCL (B&G KANIKA RLY SIDING)' },
  { code: '028', name: 'MCL (B&G KULDA OCP)' },
  { code: '029', name: 'MCL (B&G MAHALAXMI)' },
  { code: '030', name: 'MCL (GARJANBAHAL)' },
  { code: '031', name: 'MCL (HBM BUNDIA)' },
  { code: '032', name: 'MCL (IB VALLEY GM UNIT)' },
  { code: '033', name: 'MCL (IB VALLEY SAMLESWARI OCP)' },
  { code: '034', name: 'MCL (LAKHANPUR GM UNIT)' },
  { code: '035', name: 'MCL (LAKHANPUR LOCM)' },
  { code: '036', name: 'MCL (ORIENT GM AREA)' },
  { code: '037', name: 'MCL (ORIENT SUB AREA)' },
  { code: '038', name: 'MCL (LAKHANPUR BOCM)' },
];

/** Look up an area name by its code. Returns empty string if not found. */
export const getAreaName = (code: string): string => {
  return AREAS.find(a => a.code === code)?.name || '';
};

/** Format area for display: "001 — MAHANADI COAL FIELD" */
export const formatArea = (code?: string, name?: string): string => {
  if (!code && !name) return 'No Area';
  if (code && name) return `${code} — ${name}`;
  if (code) return `${code} — ${getAreaName(code) || 'Unknown'}`;
  return name || 'No Area';
};
