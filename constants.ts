import { ClassSchedule, StudentStatus, AttendanceType } from './types';

export const INITIAL_CLASSES: ClassSchedule[] = [
  { id: 'c1', day: 'Segunda', startTime: '15:00', endTime: '17:00', label: 'Segunda — 15:00 às 17:00' },
  { id: 'c2', day: 'Terça', startTime: '09:00', endTime: '11:00', label: 'Terça — 09:00 às 11:00' },
  { id: 'c3', day: 'Terça', startTime: '15:00', endTime: '17:00', label: 'Terça — 15:00 às 17:00' },
  { id: 'c4', day: 'Terça', startTime: '19:00', endTime: '21:00', label: 'Terça — 19:00 às 21:00' },
  { id: 'c5', day: 'Quarta', startTime: '09:00', endTime: '11:00', label: 'Quarta — 09:00 às 11:00' },
  { id: 'c6', day: 'Quarta', startTime: '15:00', endTime: '17:00', label: 'Quarta — 15:00 às 17:00' },
  { id: 'c7', day: 'Quarta', startTime: '19:00', endTime: '21:00', label: 'Quarta — 19:00 às 21:00' },
];

export const STATUS_COLORS = {
  [StudentStatus.ACTIVE]: 'bg-green-100 text-green-800',
  [StudentStatus.TRANSFERRED_CLASS]: 'bg-blue-100 text-blue-800',
  [StudentStatus.TRANSFERRED_TIME]: 'bg-indigo-100 text-indigo-800',
  [StudentStatus.DROPOUT]: 'bg-red-100 text-red-800',
  [StudentStatus.FROZEN]: 'bg-gray-100 text-gray-800',
  [StudentStatus.COMPLETED]: 'bg-yellow-100 text-yellow-800',
};

export const ATTENDANCE_COLORS = {
  [AttendanceType.PRESENT]: 'bg-blue-500',
  [AttendanceType.ABSENT]: 'bg-red-500',
  [AttendanceType.REPLACEMENT]: 'bg-green-500',
  [AttendanceType.JUSTIFIED]: 'bg-orange-500',
};
