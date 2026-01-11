
export enum StudentStatus {
  ACTIVE = 'Ativo',
  TRANSFERRED_CLASS = 'Transferido de Turma',
  TRANSFERRED_TIME = 'Transferido de Horário',
  DROPOUT = 'Desistiu',
  FROZEN = 'Congelado',
  COMPLETED = 'Concluído',
  REMOVED = 'Removido' // Novo status para exclusão lógica
}

export enum AttendanceType {
  PRESENT = 'Presente',
  ABSENT = 'Falta',
  REPLACEMENT = 'Reposição', // Verde
  JUSTIFIED = 'Justificativa' // Laranja
}

export interface ClassSchedule {
  id: string;
  day: string;
  startTime: string;
  endTime: string;
  label: string; // e.g., "Terça — 19:00 às 21:00"
}

export interface HistoryLog {
  id: string;
  studentId: string;
  date: string;
  action: string; // e.g., "Mudança de Turma", "Entrega de Material"
  details: string;
}

export interface MaterialInfo {
  received: boolean;
  receivedDate?: string;
}

export interface AttendanceRecord {
  id: string;
  studentId: string;
  classId: string;
  date: string; // ISO Date YYYY-MM-DD
  weekNumber: number;
  type: AttendanceType;
  notes?: string;
}

export interface Student {
  id: string;
  name: string;
  phone: string;
  email: string;
  entryDate: string;
  classId: string;
  status: StudentStatus;
  material: MaterialInfo;
}

export interface Reminder {
  id: string;
  text: string;
  targetType: 'GENERAL' | 'CLASS';
  targetClassId?: string;
  createdAt: string;
}

export interface PedagogicalNote {
  id: string;
  studentId: string;
  date: string;
  content: string;
}

export interface DashboardStats {
  totalActive: number;
  dropoutRate: number;
  weeklyAttendance: {
    week: number;
    present: number;
    absent: number;
    replacement: number;
    justified: number;
  }[];
}
