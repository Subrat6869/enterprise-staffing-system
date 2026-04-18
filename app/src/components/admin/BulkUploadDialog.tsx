// ============================================
// BULK CSV/EXCEL UPLOAD DIALOG
// ============================================

import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload,
  FileSpreadsheet,
  Download,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  ArrowLeft,
  ArrowRight,
  FileUp,
  Trash2,
  ShieldAlert,
  FileDown
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { validateEmail, validatePassword } from '@/utils/validation';
import { AREAS, getAreaName } from '@/data/areaData';
import { STANDARD_DEPARTMENTS, TEAM_LEVEL_ROLES } from '@/data/organizationData';
import { useAuth } from '@/context/AuthContext';
import type { UserRole } from '@/types';

// ============================================
// TYPES
// ============================================

interface ParsedRow {
  rowNumber: number;
  areaCode: string;       // Normalized to 3-digit (001–038)
  areaName: string;       // CSV areaName
  name: string;
  email: string;
  password: string;
  role: string;           // Internal role code (e.g. 'hr', 'general_manager')
  originalRole: string;   // Original CSV role text for display
  department: string;     // Normalized department name
  team: string;
  departmentId?: string;
  teamId?: string;
  errors: string[];
  warnings: string[];
  status: 'valid' | 'error' | 'processing' | 'success' | 'failed';
  failReason?: string;
}

interface UploadStats {
  total: number;
  valid: number;
  errors: number;
  succeeded: number;
  failed: number;
}

type Phase = 'upload' | 'preview' | 'processing' | 'results';

// ============================================
// CONSTANTS & MAPPINGS
// ============================================

/** Roles allowed via CSV (Admin excluded) */
const CSV_ALLOWED_ROLES: UserRole[] = [
  'hr', 'general_manager', 'project_manager',
  'supervisor', 'employee', 'intern', 'apprentice'
];

/** Human-friendly CSV role → internal role code */
const ROLE_MAP: Record<string, UserRole> = {
  'hr':               'hr',
  'gm':               'general_manager',
  'general_manager':  'general_manager',
  'general manager':  'general_manager',
  'pm':               'project_manager',
  'project_manager':  'project_manager',
  'project manager':  'project_manager',
  'supervisor':       'supervisor',
  'employee':         'employee',
  'intern':           'intern',
  'apprentice':       'apprentice',
};

/** Allowed department names (normalized for matching) */
const ALLOWED_DEPARTMENTS = STANDARD_DEPARTMENTS.map(d => d.name);

/** Department alias map: condensed CSV name → actual DB name */
const DEPARTMENT_ALIAS_MAP: Record<string, string> = {
  'system':             'System',
  'operations':         'Operations',
  'project':            'Project',
  'supporthr':          'Support + HR',
  'support+hr':         'Support + HR',
  'support + hr':       'Support + HR',
  'support hr':         'Support + HR',
  'financeanalytics':   'Finance + Analytics',
  'finance+analytics':  'Finance + Analytics',
  'finance + analytics':'Finance + Analytics',
  'finance analytics':  'Finance + Analytics',
  'maintenance':        'Maintenance',
};

const VALID_AREA_CODES = AREAS.map(a => a.code);

const BATCH_SIZE = 1;
const BATCH_DELAY_MS = 3000;

// ============================================
// HELPERS
// ============================================

/**
 * Normalize an area code from either AR01 or 001 format to 3-digit (001–038).
 * Returns null if format is unrecognized.
 */
function normalizeAreaCode(raw: string): string | null {
  const trimmed = raw.trim().toUpperCase();

  // AR01 – AR38 format
  const arMatch = trimmed.match(/^AR(\d{1,2})$/);
  if (arMatch) {
    return arMatch[1].padStart(3, '0'); // AR1 → 001, AR38 → 038
  }

  // Pure numeric: 1, 01, 001
  const numMatch = trimmed.match(/^(\d{1,3})$/);
  if (numMatch) {
    return numMatch[1].padStart(3, '0');
  }

  return null;
}

/** Normalize a role string to internal code. Returns null if invalid. */
function normalizeRole(raw: string): UserRole | null {
  const key = raw.trim().toLowerCase();
  return ROLE_MAP[key] || null;
}

/** Normalize a department name using alias map. Returns null if invalid. */
function normalizeDepartment(raw: string): string | null {
  const key = raw.trim().toLowerCase().replace(/\s+/g, ' ');
  if (DEPARTMENT_ALIAS_MAP[key]) return DEPARTMENT_ALIAS_MAP[key];

  // Also try exact match against allowed names (case-insensitive)
  const exact = ALLOWED_DEPARTMENTS.find(d => d.toLowerCase() === key);
  return exact || null;
}

// ============================================
// COMPONENT
// ============================================

interface BulkUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingEmails: string[];
  onComplete: () => void;
}

const BulkUploadDialog: React.FC<BulkUploadDialogProps> = ({
  open,
  onOpenChange,
  existingEmails,
  onComplete
}) => {
  const { userData } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // State
  const [phase, setPhase] = useState<Phase>('upload');
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [stats, setStats] = useState<UploadStats>({ total: 0, valid: 0, errors: 0, succeeded: 0, failed: 0 });
  const [processProgress, setProcessProgress] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (!open) {
      const timer = setTimeout(() => {
        setPhase('upload');
        setSelectedFile(null);
        setParsedRows([]);
        setStats({ total: 0, valid: 0, errors: 0, succeeded: 0, failed: 0 });
        setProcessProgress(0);
        setIsProcessing(false);
        setIsParsing(false);
        setIsDragging(false);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [open]);

  // ==========================================
  // 🔐 ADMIN GUARD (Component Level)
  // ==========================================

  if (userData?.role !== 'admin') {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[480px]">
          <div className="flex flex-col items-center gap-4 py-8">
            <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
              <ShieldAlert className="w-8 h-8 text-red-600 dark:text-red-400" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">Access Denied</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center max-w-sm">
              Only users with the <strong>Admin</strong> role can access the bulk upload feature.
              Please contact your system administrator if you need access.
            </p>
            <button
              onClick={() => onOpenChange(false)}
              className="px-6 py-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-sm font-medium"
            >
              Close
            </button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // ==========================================
  // SAMPLE TEMPLATE DOWNLOAD
  // ==========================================

  const handleDownloadTemplate = () => {
    const headers = 'AreaCode,AreaName,Name,Email,Password,Role,Department,Team';
    const examples = [
      'AR01,Area 1,Priya Sharma,priyasharmaarea1@company.com,Priya@123,HR,,',
      'AR01,Area 1,Amit Verma,amitvermaarea1@company.com,Amit@1234,GM,,',
      'AR01,Area 1,Rohit Singh,rohitsingharea1@company.com,Rohit@123,PM,,',
      'AR01,Area 1,Suresh Patel,sureshpatelarea1@company.com,Suresh@12,Supervisor,,',
      '',
      'AR01,Area 1,Ankit Mishra,ankitmishrasystemteam1area1@company.com,Ankit@123,Employee,System,Team1',
      'AR01,Area 1,Neha Gupta,nehaguptasystemteam1area1@company.com,Neha@1234,Intern,System,Team1',
      'AR01,Area 1,Pooja Reddy,poojareddysystemteam1area1@company.com,Pooja@123,Apprentice,System,Team1',
    ];
    const notes = [
      '',
      '# ════════════════════════════════════════════════════════════════',
      '# INSTRUCTIONS — Delete these lines before uploading',
      '# ════════════════════════════════════════════════════════════════',
      '#',
      '# CSV COLUMNS (all required):',
      '#   AreaCode    — AR01 to AR38 (or 001 to 038)',
      '#   AreaName    — Must match the area code in the system',
      '#   Name        — Full name of the user',
      '#   Email       — Lowercase, unique, must include @ and .',
      '#   Password    — Min 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special char',
      '#   Role        — HR, GM, PM, Supervisor, Employee, Intern, Apprentice',
      '#   Department  — Required for Employee/Intern/Apprentice',
      '#   Team        — Required for Employee/Intern/Apprentice',
      '#',
      '# ❌ ADMIN role CANNOT be created via CSV',
      '#',
      '# ROLE RULES:',
      '#   HR / GM / PM / Supervisor → Department & Team must be EMPTY',
      '#   Employee / Intern / Apprentice → Department & Team REQUIRED',
      '#',
      '# VALID DEPARTMENTS:',
      '#   System, Operations, Project, SupportHR (or Support + HR),',
      '#   FinanceAnalytics (or Finance + Analytics), Maintenance',
      '#',
      '# TEAM FORMAT: Team1, Team2, etc. Must exist in the selected Department.',
      '#',
      '# AREA CODES:',
      ...AREAS.map(a => `#   ${a.code} — ${a.name}`),
    ];

    const csvContent = [headers, ...examples, ...notes].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'bulk_user_upload_template.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
    toast.success('Template downloaded!');
  };

  // ==========================================
  // FILE HANDLING
  // ==========================================

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      processFile(files[0]);
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const processFile = (file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!ext || !['csv', 'xlsx', 'xls'].includes(ext)) {
      toast.error('Please upload a .csv or .xlsx file');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be under 5MB');
      return;
    }
    setSelectedFile(file);
    parseFile(file);
  };

  // ==========================================
  // PARSING & VALIDATION
  // ==========================================

  const parseFile = async (file: File) => {
    setIsParsing(true);
    try {
      const ext = file.name.split('.').pop()?.toLowerCase();
      let rawRows: string[][] = [];

      if (ext === 'csv') {
        rawRows = await parseCSV(file);
      } else {
        rawRows = await parseXLSX(file);
      }

      if (rawRows.length < 2) {
        toast.error('File is empty or has no data rows');
        setSelectedFile(null);
        setIsParsing(false);
        return;
      }

      // First row is header — skip it
      const dataRows = rawRows.slice(1).filter(row => row.some(cell => cell.trim() !== ''));

      if (dataRows.length === 0) {
        toast.error('No data rows found in the file');
        setSelectedFile(null);
        setIsParsing(false);
        return;
      }

      // Validate each row
      const emailsSeen = new Set<string>();
      const existingEmailSet = new Set(existingEmails.map(e => e.toLowerCase()));

      const validated: ParsedRow[] = dataRows.map((row, idx) => {
        const [
          rawAreaCode = '',
          rawAreaName = '',
          rawName = '',
          rawEmail = '',
          rawPassword = '',
          rawRole = '',
          rawDepartment = '',
          rawTeam = ''
        ] = row.map(c => c.trim());

        const errors: string[] = [];
        const warnings: string[] = [];

        // ── Area Code ──
        const normalizedAreaCode = normalizeAreaCode(rawAreaCode);
        if (!rawAreaCode) {
          errors.push('AreaCode is required');
        } else if (!normalizedAreaCode) {
          errors.push(`Invalid AreaCode format "${rawAreaCode}". Use AR01–AR38 or 001–038`);
        } else if (!VALID_AREA_CODES.includes(normalizedAreaCode)) {
          errors.push(`AreaCode "${rawAreaCode}" out of range. Valid: AR01–AR38 (001–038)`);
        }

        const areaCode = normalizedAreaCode || '';

        // ── Area Name ──
        if (!rawAreaName) {
          errors.push('AreaName is required');
        } else if (areaCode) {
          const expectedName = getAreaName(areaCode);
          // Only validate if we have a valid area code to check against
          if (expectedName && rawAreaName.toLowerCase() !== expectedName.toLowerCase()) {
            // Accept the code-based name — just warn about mismatch
            warnings.push(`AreaName "${rawAreaName}" doesn't match expected "${expectedName}" for code ${areaCode}. System name will be used.`);
          }
        }

        // ── Name ──
        if (!rawName) errors.push('Name is required');

        // ── Email ──
        if (!rawEmail) {
          errors.push('Email is required');
        } else {
          const emailLower = rawEmail.toLowerCase();
          const emailResult = validateEmail(emailLower);
          if (!emailResult.valid) {
            errors.push(emailResult.error || 'Invalid email');
          } else {
            if (emailsSeen.has(emailLower)) {
              errors.push('Duplicate email in CSV');
            } else if (existingEmailSet.has(emailLower)) {
              errors.push('Email already exists in system');
            }
            emailsSeen.add(emailLower);
          }
        }

        // ── Password ──
        if (!rawPassword) {
          errors.push('Password is required');
        } else {
          const pwResult = validatePassword(rawPassword);
          if (!pwResult.valid) {
            errors.push(pwResult.error || 'Invalid password');
          }
        }

        // ── Role ──
        const normalizedRole = normalizeRole(rawRole);
        if (!rawRole) {
          errors.push('Role is required');
        } else if (rawRole.toLowerCase() === 'admin') {
          errors.push('Admin role cannot be created via CSV upload');
        } else if (!normalizedRole) {
          errors.push(`Invalid role "${rawRole}". Allowed: HR, GM, PM, Supervisor, Employee, Intern, Apprentice`);
        } else if (!CSV_ALLOWED_ROLES.includes(normalizedRole)) {
          errors.push(`Role "${rawRole}" is not allowed via CSV upload`);
        }

        const role = normalizedRole || '';

        // ── Department & Team (role-dependent) ──
        const isTeamRole = role ? TEAM_LEVEL_ROLES.includes(role) : false;
        let department = '';
        let team = rawTeam;

        if (rawDepartment) {
          const normalizedDept = normalizeDepartment(rawDepartment);
          if (!normalizedDept) {
            errors.push(`Invalid department "${rawDepartment}". Allowed: System, Operations, Project, Support + HR, Finance + Analytics, Maintenance`);
          } else {
            department = normalizedDept;
          }
        }

        if (isTeamRole) {
          // Department & Team are required for team-level roles
          if (!rawDepartment) errors.push('Department is required for this role');
          if (!rawTeam) errors.push('Team is required for this role');
        } else if (role) {
          // Area-level roles: Department & Team should be empty
          if (rawDepartment) {
            warnings.push(`Department ignored for area-level role "${rawRole}"`);
            department = '';
          }
          if (rawTeam) {
            warnings.push(`Team ignored for area-level role "${rawRole}"`);
            team = '';
          }
        }

        return {
          rowNumber: idx + 2, // +1 for 0-index, +1 for header
          areaCode,
          areaName: rawAreaName,
          name: rawName,
          email: rawEmail.toLowerCase(),
          password: rawPassword,
          role,
          originalRole: rawRole,
          department,
          team,
          errors,
          warnings,
          status: errors.length > 0 ? 'error' : 'valid'
        } as ParsedRow;
      });

      setParsedRows(validated);
      const validCount = validated.filter(r => r.status === 'valid').length;
      const errorCount = validated.filter(r => r.status === 'error').length;
      setStats({ total: validated.length, valid: validCount, errors: errorCount, succeeded: 0, failed: 0 });
      setPhase('preview');
    } catch (err: any) {
      toast.error(`Failed to parse file: ${err.message || 'Unknown error'}`);
      setSelectedFile(null);
    } finally {
      setIsParsing(false);
    }
  };

  const parseCSV = (file: File): Promise<string[][]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const text = e.target?.result as string;
          const lines = text.split(/\r?\n/);
          const rows = lines.map(line => {
            // Handle quoted CSV fields
            const result: string[] = [];
            let current = '';
            let inQuotes = false;
            for (let i = 0; i < line.length; i++) {
              const char = line[i];
              if (char === '"') {
                inQuotes = !inQuotes;
              } else if (char === ',' && !inQuotes) {
                result.push(current);
                current = '';
              } else {
                current += char;
              }
            }
            result.push(current);
            return result;
          });
          resolve(rows);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  };

  const parseXLSX = async (file: File): Promise<string[][]> => {
    const XLSX = await import('xlsx');
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          const rows: string[][] = XLSX.utils.sheet_to_json(firstSheet, {
            header: 1,
            defval: '',
            blankrows: false
          });
          const stringRows = rows.map(row => row.map((cell: any) => String(cell ?? '')));
          resolve(stringRows);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsArrayBuffer(file);
    });
  };

  // ==========================================
  // BATCH PROCESSING
  // ==========================================

  const handleStartProcessing = async () => {
    const validRows = parsedRows.filter(r => r.status === 'valid');
    if (validRows.length === 0) {
      toast.error('No valid rows to process');
      return;
    }

    // 🔐 Final admin check before API execution
    if (userData?.role !== 'admin') {
      toast.error('Access Denied: Only Admin can execute bulk upload');
      return;
    }

    setPhase('processing');
    setIsProcessing(true);
    setProcessProgress(0);

    const { registerUser } = await import('@/services/authService');
    const { updateUser: updateU, getDepartmentByNameAndArea, getTeamByNameAndDepartment } = await import('@/services/firestoreService');

    let succeeded = 0;
    let failed = 0;
    const updatedRows = [...parsedRows];

    // Pre-resolve department/team IDs for team-level roles
    for (const row of validRows) {
      if (TEAM_LEVEL_ROLES.includes(row.role) && row.department) {
        try {
          const dept = await getDepartmentByNameAndArea(row.department, row.areaCode);
          if (dept) {
            row.departmentId = dept.id;
            if (row.team) {
              const team = await getTeamByNameAndDepartment(row.team, dept.id);
              if (team) {
                row.teamId = team.id;
              } else {
                const idx = updatedRows.findIndex(r => r.rowNumber === row.rowNumber);
                updatedRows[idx] = { ...updatedRows[idx], status: 'failed', failReason: `Team "${row.team}" not found in department "${row.department}" for area ${row.areaCode}` };
                failed++;
                setParsedRows([...updatedRows]);
                continue;
              }
            }
          } else {
            const idx = updatedRows.findIndex(r => r.rowNumber === row.rowNumber);
            updatedRows[idx] = { ...updatedRows[idx], status: 'failed', failReason: `Department "${row.department}" not found in area ${row.areaCode}. Seed departments first via Admin > Departments.` };
            failed++;
            setParsedRows([...updatedRows]);
            continue;
          }
        } catch {
          // Lookup failed silently — will attempt registration anyway
        }
      }
    }

    // Filter out rows pre-marked as failed
    const rowsToProcess = validRows.filter(r => {
      const updated = updatedRows.find(u => u.rowNumber === r.rowNumber);
      return updated?.status !== 'failed';
    });

    // Process in batches
    for (let i = 0; i < rowsToProcess.length; i += BATCH_SIZE) {
      const batch = rowsToProcess.slice(i, i + BATCH_SIZE);

      const batchPromises = batch.map(async (row) => {
        const rowIdx = updatedRows.findIndex(r => r.rowNumber === row.rowNumber);
        updatedRows[rowIdx] = { ...updatedRows[rowIdx], status: 'processing' };
        setParsedRows([...updatedRows]);

        let attempts = 0;
        let success = false;
        const maxAttempts = 3;

        while (attempts < maxAttempts && !success) {
          try {
            const result = await registerUser({
              email: row.email,
              password: row.password,
              name: row.name,
              role: row.role as UserRole,
              areaCode: row.areaCode,
              areaName: getAreaName(row.areaCode),
              department: row.department || '',
              departmentId: row.departmentId || '',
              teamId: row.teamId || '',
              teamName: row.team || ''
            });

            // Tag with admin creator
            if (userData?.uid) {
              await updateU(result.userData.uid, { createdBy: userData.uid });
            }

            updatedRows[rowIdx] = { ...updatedRows[rowIdx], status: 'success' };
            succeeded++;
            success = true;
          } catch (err: any) {
            if (err.message?.includes('too-many-requests')) {
              attempts++;
              if (attempts < maxAttempts) {
                // Severe Firebase IP backoff limit hit. Wait 15 seconds before trying again to cool down the API bucket.
                toast.warning(`Firebase Anti-Bot limit hit. Cooling down for 15s before retrying...`);
                await new Promise(r => setTimeout(r, 15000));
                continue;
              } else {
                toast.error('Firebase has temporarily blocked this IP for creating too many accounts. Please try again in 1 hour.');
                // We shouldn't continue throwing errors for the rest of the CSV.
                setIsProcessing(false);
                setPhase('results');
                return; // ABORT THE WHOLE FUNCTION
              }
            }
            // If it's a different error or we ran out of attempts:
            updatedRows[rowIdx] = {
              ...updatedRows[rowIdx],
              status: 'failed',
              failReason: err.message || 'Registration failed'
            };
            failed++;
            break;
          }
        }

        // Update progress
        const processed = succeeded + failed;
        setProcessProgress(Math.round((processed / validRows.length) * 100));
        setParsedRows([...updatedRows]);
      });

      await Promise.all(batchPromises);

      // Delay between batches (except the last one)
      if (i + BATCH_SIZE < rowsToProcess.length) {
        await new Promise(resolve => setTimeout(resolve, BATCH_DELAY_MS));
      }
    }

    setStats(prev => ({ ...prev, succeeded, failed }));
    setIsProcessing(false);
    setPhase('results');

    // Log the bulk upload activity
    if (userData?.uid) {
      const { logActivity } = await import('@/services/firestoreService');
      logActivity(
        userData.uid, userData.name, userData.role,
        'USER_BULK_UPLOADED',
        `${userData.name} bulk uploaded ${succeeded + failed} users via CSV (${succeeded} succeeded, ${failed} failed)`,
        'User',
        failed > 0 && succeeded === 0 ? 'failed' : 'success'
      );
    }

    onComplete();
  };

  // ==========================================
  // ERROR REPORT DOWNLOAD
  // ==========================================

  const handleDownloadErrorReport = () => {
    const errorAndFailedRows = parsedRows.filter(r => r.status === 'error' || r.status === 'failed');
    if (errorAndFailedRows.length === 0) {
      toast.info('No errors to report!');
      return;
    }

    const headers = 'Row,Name,Email,Role,ErrorType,ErrorDetails';
    const rows = errorAndFailedRows.map(row => {
      const errorType = row.status === 'error' ? 'Validation Error' : 'Registration Failed';
      const details = row.status === 'error'
        ? row.errors.join(' | ')
        : (row.failReason || 'Unknown error');
      return [
        row.rowNumber,
        `"${row.name || ''}"`,
        `"${row.email || ''}"`,
        `"${row.originalRole || row.role || ''}"`,
        `"${errorType}"`,
        `"${details}"`
      ].join(',');
    });

    const csvContent = [headers, ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `bulk_upload_errors_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
    toast.success('Error report downloaded!');
  };

  // ==========================================
  // RENDER HELPERS
  // ==========================================

  const getStatusIcon = (status: ParsedRow['status']) => {
    switch (status) {
      case 'valid': return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
      case 'error': return <XCircle className="w-4 h-4 text-red-500" />;
      case 'processing': return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />;
      case 'success': return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
      case 'failed': return <XCircle className="w-4 h-4 text-red-500" />;
    }
  };

  const getStatusLabel = (status: ParsedRow['status']) => {
    switch (status) {
      case 'valid': return 'Valid';
      case 'error': return 'Error';
      case 'processing': return 'Processing...';
      case 'success': return 'Registered ✓';
      case 'failed': return 'Failed ✗';
    }
  };

  const formatRoleDisplay = (role: string) => {
    const displayMap: Record<string, string> = {
      'hr': 'HR',
      'general_manager': 'GM',
      'project_manager': 'PM',
      'supervisor': 'Supervisor',
      'employee': 'Employee',
      'intern': 'Intern',
      'apprentice': 'Apprentice',
    };
    return displayMap[role] || role;
  };

  // ==========================================
  // PHASE RENDERS
  // ==========================================

  const renderUploadPhase = () => (
    <motion.div
      key="upload"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-5"
    >
      {/* Drag & Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-300 ${
          isDragging
            ? 'border-teal-500 bg-teal-50 dark:bg-teal-900/20 scale-[1.02]'
            : 'border-gray-300 dark:border-gray-600 hover:border-teal-400 dark:hover:border-teal-500 hover:bg-gray-50 dark:hover:bg-gray-800/50'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.xlsx,.xls"
          onChange={handleFileSelect}
          className="hidden"
          id="bulk-upload-file-input"
        />
        <div className="flex flex-col items-center gap-3">
          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-colors ${
            isDragging
              ? 'bg-teal-100 dark:bg-teal-800/50'
              : 'bg-gray-100 dark:bg-gray-800'
          }`}>
            {isParsing ? (
              <Loader2 className="w-8 h-8 text-teal-500 animate-spin" />
            ) : (
              <FileUp className={`w-8 h-8 ${isDragging ? 'text-teal-600' : 'text-gray-400 dark:text-gray-500'}`} />
            )}
          </div>
          <div>
            <p className="text-base font-semibold text-gray-700 dark:text-gray-200">
              {isParsing ? 'Parsing file...' : isDragging ? 'Drop your file here' : 'Drag & drop your CSV/Excel file'}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              or click to browse • Supports .csv, .xlsx • Max 5MB
            </p>
          </div>
        </div>
      </div>

      {/* Download Template */}
      <button
        onClick={(e) => { e.stopPropagation(); handleDownloadTemplate(); }}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 border border-indigo-200 dark:border-indigo-700/50 text-indigo-700 dark:text-indigo-300 hover:from-indigo-100 hover:to-purple-100 dark:hover:from-indigo-900/30 dark:hover:to-purple-900/30 transition-all"
      >
        <Download className="w-4 h-4" />
        <span className="text-sm font-medium">Download Sample CSV Template</span>
      </button>

      {/* Instructions */}
      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/50 rounded-xl p-4">
        <div className="flex gap-2">
          <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-amber-800 dark:text-amber-200">
            <p className="font-semibold mb-1">CSV Format (8 columns):</p>
            <code className="block bg-amber-100 dark:bg-amber-800/50 px-2 py-1 rounded text-xs mb-2 overflow-x-auto">
              AreaCode, AreaName, Name, Email, Password, Role, Department, Team
            </code>
            <ul className="list-disc list-inside space-y-0.5 text-amber-700 dark:text-amber-300 text-xs">
              <li><strong>Roles:</strong> HR, GM, PM, Supervisor, Employee, Intern, Apprentice</li>
              <li><strong>Area Codes:</strong> AR01–AR38 (or 001–038)</li>
              <li><strong>HR/GM/PM/Supervisor:</strong> Department & Team must be <em>empty</em></li>
              <li><strong>Employee/Intern/Apprentice:</strong> Department & Team <em>required</em></li>
              <li><strong>Departments:</strong> System, Operations, Project, Support + HR, Finance + Analytics, Maintenance</li>
              <li>❌ <strong>Admin</strong> role cannot be created via CSV</li>
              <li>Passwords: Min 8 chars, uppercase + lowercase + number + special char</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Security Notice */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700/50 rounded-xl p-3">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
          <p className="text-xs text-blue-700 dark:text-blue-300">
            <strong>Admin Only:</strong> This feature is restricted to Admin users. All uploads are logged for audit.
          </p>
        </div>
      </div>
    </motion.div>
  );

  const renderPreviewPhase = () => {
    const validRows = parsedRows.filter(r => r.status === 'valid');
    const errorRows = parsedRows.filter(r => r.status === 'error');

    return (
      <motion.div
        key="preview"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="space-y-4"
      >
        {/* File Info & Stats */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-1">
          <div className="flex items-center gap-2 min-w-0">
            <FileSpreadsheet className="w-5 h-5 text-teal-500 flex-shrink-0" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-200 truncate">{selectedFile?.name}</span>
          </div>
          <button
            onClick={() => { setPhase('upload'); setSelectedFile(null); setParsedRows([]); }}
            className="flex items-center gap-1 text-xs text-gray-500 hover:text-red-500 transition-colors"
          >
            <Trash2 className="w-3 h-3" /> Remove
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Total Rows</p>
          </div>
          <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{stats.valid}</p>
            <p className="text-xs text-emerald-600 dark:text-emerald-400">Valid</p>
          </div>
          <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.errors}</p>
            <p className="text-xs text-red-600 dark:text-red-400">Errors</p>
          </div>
        </div>

        {/* Preview Table */}
        <div className="max-h-[300px] overflow-y-auto rounded-xl border border-gray-200 dark:border-gray-700">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-gray-50 dark:bg-gray-800 z-10">
              <tr>
                <th className="text-left py-2 px-3 text-xs font-medium text-gray-500 dark:text-gray-400">Row</th>
                <th className="text-left py-2 px-3 text-xs font-medium text-gray-500 dark:text-gray-400">Status</th>
                <th className="text-left py-2 px-3 text-xs font-medium text-gray-500 dark:text-gray-400">Name</th>
                <th className="text-left py-2 px-3 text-xs font-medium text-gray-500 dark:text-gray-400 hidden sm:table-cell">Email</th>
                <th className="text-left py-2 px-3 text-xs font-medium text-gray-500 dark:text-gray-400 hidden md:table-cell">Role</th>
                <th className="text-left py-2 px-3 text-xs font-medium text-gray-500 dark:text-gray-400 hidden md:table-cell">Area</th>
                <th className="text-left py-2 px-3 text-xs font-medium text-gray-500 dark:text-gray-400 hidden lg:table-cell">Dept</th>
                <th className="text-left py-2 px-3 text-xs font-medium text-gray-500 dark:text-gray-400">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {parsedRows.map((row) => (
                <tr
                  key={row.rowNumber}
                  className={`${row.status === 'error' ? 'bg-red-50/50 dark:bg-red-900/10' : ''}`}
                >
                  <td className="py-2 px-3 text-gray-600 dark:text-gray-400 font-mono text-xs">{row.rowNumber}</td>
                  <td className="py-2 px-3">
                    <div className="flex items-center gap-1">
                      {getStatusIcon(row.status)}
                      <span className={`text-xs font-medium ${
                        row.status === 'valid' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
                      }`}>
                        {getStatusLabel(row.status)}
                      </span>
                    </div>
                  </td>
                  <td className="py-2 px-3 text-gray-900 dark:text-white text-xs truncate max-w-[100px]">{row.name || '—'}</td>
                  <td className="py-2 px-3 text-gray-600 dark:text-gray-400 text-xs truncate max-w-[140px] hidden sm:table-cell">{row.email || '—'}</td>
                  <td className="py-2 px-3 text-gray-600 dark:text-gray-400 text-xs hidden md:table-cell">
                    {row.role ? formatRoleDisplay(row.role) : (row.originalRole || '—')}
                  </td>
                  <td className="py-2 px-3 text-gray-600 dark:text-gray-400 text-xs hidden md:table-cell">{row.areaCode || '—'}</td>
                  <td className="py-2 px-3 text-gray-600 dark:text-gray-400 text-xs hidden lg:table-cell">{row.department || '—'}</td>
                  <td className="py-2 px-3">
                    {row.errors.length > 0 && (
                      <div className="text-xs text-red-600 dark:text-red-400 space-y-0.5">
                        {row.errors.map((err, i) => (
                          <p key={i}>• {err}</p>
                        ))}
                      </div>
                    )}
                    {row.warnings.length > 0 && (
                      <div className="text-xs text-amber-600 dark:text-amber-400 space-y-0.5">
                        {row.warnings.map((w, i) => (
                          <p key={i}>⚠ {w}</p>
                        ))}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button
            onClick={() => { setPhase('upload'); setSelectedFile(null); setParsedRows([]); }}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm font-medium">Back</span>
          </button>
          <button
            onClick={handleStartProcessing}
            disabled={validRows.length === 0}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-white transition-all ${
              validRows.length > 0
                ? 'bg-teal-600 hover:bg-teal-700 shadow-lg shadow-teal-500/25'
                : 'bg-gray-400 dark:bg-gray-600 cursor-not-allowed'
            }`}
          >
            <Upload className="w-4 h-4" />
            <span className="text-sm font-medium">
              Register {validRows.length} Valid User{validRows.length !== 1 ? 's' : ''}
            </span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {errorRows.length > 0 && validRows.length > 0 && (
          <p className="text-xs text-center text-amber-600 dark:text-amber-400">
            ⚠ {errorRows.length} row{errorRows.length !== 1 ? 's' : ''} with errors will be skipped
          </p>
        )}
      </motion.div>
    );
  };

  const renderProcessingPhase = () => (
    <motion.div
      key="processing"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6 py-4"
    >
      {/* Progress Circle */}
      <div className="flex flex-col items-center gap-4">
        <div className="relative w-28 h-28">
          <svg className="w-28 h-28 transform -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" strokeWidth="6"
              className="text-gray-200 dark:text-gray-700" />
            <circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 42}`}
              strokeDashoffset={`${2 * Math.PI * 42 * (1 - processProgress / 100)}`}
              className="text-teal-500 transition-all duration-500 ease-out" />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-2xl font-bold text-gray-900 dark:text-white">{processProgress}%</span>
          </div>
        </div>
        <div className="text-center">
          <p className="text-lg font-semibold text-gray-900 dark:text-white">Registering Users...</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Please don't close this dialog
          </p>
        </div>
      </div>

      {/* Live Status Table */}
      <div className="max-h-[200px] overflow-y-auto rounded-xl border border-gray-200 dark:border-gray-700">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-gray-50 dark:bg-gray-800 z-10">
            <tr>
              <th className="text-left py-2 px-3 text-xs font-medium text-gray-500 dark:text-gray-400">Row</th>
              <th className="text-left py-2 px-3 text-xs font-medium text-gray-500 dark:text-gray-400">Name</th>
              <th className="text-left py-2 px-3 text-xs font-medium text-gray-500 dark:text-gray-400">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {parsedRows.filter(r => r.status !== 'error').map((row) => (
              <tr key={row.rowNumber}>
                <td className="py-2 px-3 text-gray-600 dark:text-gray-400 font-mono text-xs">{row.rowNumber}</td>
                <td className="py-2 px-3 text-gray-900 dark:text-white text-xs">{row.name}</td>
                <td className="py-2 px-3">
                  <div className="flex items-center gap-1">
                    {getStatusIcon(row.status)}
                    <span className={`text-xs font-medium ${
                      row.status === 'success' ? 'text-emerald-600 dark:text-emerald-400' :
                      row.status === 'failed' ? 'text-red-600 dark:text-red-400' :
                      row.status === 'processing' ? 'text-blue-600 dark:text-blue-400' :
                      'text-gray-500'
                    }`}>
                      {getStatusLabel(row.status)}
                    </span>
                  </div>
                  {row.failReason && (
                    <p className="text-xs text-red-500 mt-0.5">{row.failReason}</p>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  );

  const renderResultsPhase = () => {
    const failedRows = parsedRows.filter(r => r.status === 'failed');
    const skippedRows = parsedRows.filter(r => r.status === 'error');
    const hasErrors = failedRows.length > 0 || skippedRows.length > 0;

    return (
      <motion.div
        key="results"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="space-y-5"
      >
        {/* Success Banner */}
        <div className={`rounded-2xl p-6 text-center ${
          stats.failed === 0
            ? 'bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20'
            : 'bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20'
        }`}>
          <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3 ${
            stats.failed === 0
              ? 'bg-emerald-100 dark:bg-emerald-800/50'
              : 'bg-amber-100 dark:bg-amber-800/50'
          }`}>
            {stats.failed === 0 ? (
              <CheckCircle2 className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <AlertTriangle className="w-8 h-8 text-amber-600 dark:text-amber-400" />
            )}
          </div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">
            {stats.failed === 0 ? 'All Users Registered!' : 'Upload Complete'}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {stats.succeeded} of {stats.valid} valid users registered successfully
          </p>
        </div>

        {/* Final Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-3 text-center">
            <p className="text-xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
            <p className="text-[10px] text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wider">Total</p>
          </div>
          <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-3 text-center">
            <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{stats.succeeded}</p>
            <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium uppercase tracking-wider">Success ✓</p>
          </div>
          <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-3 text-center">
            <p className="text-xl font-bold text-red-600 dark:text-red-400">{stats.failed}</p>
            <p className="text-[10px] text-red-600 dark:text-red-400 font-medium uppercase tracking-wider">Failed ✗</p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-3 text-center">
            <p className="text-xl font-bold text-gray-400">{skippedRows.length}</p>
            <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">Skipped</p>
          </div>
        </div>

        {/* Failed Rows Detail */}
        {failedRows.length > 0 && (
          <div className="rounded-xl border border-red-200 dark:border-red-800/50 overflow-hidden">
            <div className="bg-red-50 dark:bg-red-900/20 px-4 py-2 border-b border-red-200 dark:border-red-800/50">
              <p className="text-sm font-semibold text-red-700 dark:text-red-400">
                Failed Registrations ({failedRows.length})
              </p>
            </div>
            <div className="max-h-[150px] overflow-y-auto">
              {failedRows.map(row => (
                <div key={row.rowNumber} className="px-4 py-2 border-b border-red-100 dark:border-red-900/30 last:border-0">
                  <div className="flex items-start gap-2">
                    <span className="text-xs font-mono text-red-500 mt-0.5">Row {row.rowNumber}</span>
                    <div>
                      <p className="text-xs font-medium text-gray-900 dark:text-white">{row.name} ({row.email})</p>
                      <p className="text-xs text-red-600 dark:text-red-400">{row.failReason}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Skipped Rows Detail */}
        {skippedRows.length > 0 && (
          <div className="rounded-xl border border-amber-200 dark:border-amber-800/50 overflow-hidden">
            <div className="bg-amber-50 dark:bg-amber-900/20 px-4 py-2 border-b border-amber-200 dark:border-amber-800/50">
              <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">
                Skipped (Validation Errors) ({skippedRows.length})
              </p>
            </div>
            <div className="max-h-[120px] overflow-y-auto">
              {skippedRows.map(row => (
                <div key={row.rowNumber} className="px-4 py-2 border-b border-amber-100 dark:border-amber-900/30 last:border-0">
                  <div className="flex items-start gap-2">
                    <span className="text-xs font-mono text-amber-500 mt-0.5">Row {row.rowNumber}</span>
                    <div>
                      <p className="text-xs font-medium text-gray-900 dark:text-white">{row.name || 'Unknown'} ({row.email || 'no email'})</p>
                      <div className="text-xs text-amber-600 dark:text-amber-400">
                        {row.errors.map((err, i) => (
                          <p key={i}>• {err}</p>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Download Error Report */}
          {hasErrors && (
            <button
              onClick={handleDownloadErrorReport}
              className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-red-50 to-amber-50 dark:from-red-900/20 dark:to-amber-900/20 border border-red-200 dark:border-red-700/50 text-red-700 dark:text-red-300 hover:from-red-100 hover:to-amber-100 dark:hover:from-red-900/30 dark:hover:to-amber-900/30 transition-all"
            >
              <FileDown className="w-4 h-4" />
              <span className="text-sm font-medium">Download Error Report</span>
            </button>
          )}

          {/* Done Button */}
          <button
            onClick={() => onOpenChange(false)}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-teal-600 text-white hover:bg-teal-700 transition-colors shadow-lg shadow-teal-500/25"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span className="text-sm font-semibold">Done</span>
          </button>
        </div>
      </motion.div>
    );
  };

  // ==========================================
  // MAIN RENDER
  // ==========================================

  return (
    <Dialog open={open} onOpenChange={(val) => {
      if (isProcessing) return; // Block closing during processing
      onOpenChange(val);
    }}>
      <DialogContent className="sm:max-w-[720px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-100 to-purple-100 dark:from-violet-800/50 dark:to-purple-800/50 flex items-center justify-center">
              <Upload className="w-4 h-4 text-violet-600 dark:text-violet-400" />
            </div>
            Bulk User Upload
          </DialogTitle>
          <DialogDescription>
            {phase === 'upload' && 'Upload a CSV file to register multiple users at once. Admin only.'}
            {phase === 'preview' && 'Review and validate the parsed user data before uploading.'}
            {phase === 'processing' && 'Registering users... Please wait.'}
            {phase === 'results' && 'Upload complete! Review the results below.'}
          </DialogDescription>
        </DialogHeader>

        <AnimatePresence mode="wait">
          {phase === 'upload' && renderUploadPhase()}
          {phase === 'preview' && renderPreviewPhase()}
          {phase === 'processing' && renderProcessingPhase()}
          {phase === 'results' && renderResultsPhase()}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
};

export default BulkUploadDialog;
