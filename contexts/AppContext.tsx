import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Student, ClassSchedule, AttendanceRecord, HistoryLog, StudentStatus, AttendanceType, Reminder, PedagogicalNote } from '../types';
import { supabase } from '../supabaseClient';
import { INITIAL_CLASSES } from '../constants';

interface AppContextProps {
  students: Student[];
  classes: ClassSchedule[];
  attendance: AttendanceRecord[];
  history: HistoryLog[];
  reminders: Reminder[];
  notes: PedagogicalNote[];
  addStudent: (student: Omit<Student, 'id'>) => void;
  updateStudent: (id: string, updates: Partial<Student>) => void;
  removeStudent: (id: string, reason: string) => void;
  markAttendance: (record: AttendanceRecord) => void;
  deleteAttendance: (recordId: string) => void; // Nova função
  getStudentHistory: (studentId: string) => HistoryLog[];
  getAlerts: () => { studentId: string; message: string }[];
  addReminder: (reminder: Omit<Reminder, 'id' | 'createdAt'>) => void;
  removeReminder: (id: string) => void;
  addNote: (studentId: string, content: string) => void;
  deleteNote: (id: string) => void;
  addClass: (classData: { day: string; startTime: string; endTime: string }) => Promise<void>;
  removeClass: (id: string) => Promise<void>;
}

const AppContext = createContext<AppContextProps | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<ClassSchedule[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [history, setHistory] = useState<HistoryLog[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [notes, setNotes] = useState<PedagogicalNote[]>([]);

  // --- FETCH INITIAL DATA FROM SUPABASE ---
  const fetchData = async () => {
    try {
        console.log("Iniciando busca de dados no Supabase...");

        // 1. Classes with Auto-Seeding Logic
        const { data: classesData, error: classError } = await supabase.from('classes').select('*');
        
        let loadedClasses: any[] = [];

        if (classError) {
             console.error("Erro ao buscar turmas:", classError);
             setClasses(INITIAL_CLASSES);
        } else if (!classesData || classesData.length === 0) {
            console.warn("Nenhuma turma encontrada no banco. Tentando cadastrar turmas padrão...");
            
            const seedData = INITIAL_CLASSES.map(({ id, ...rest }) => ({
                label: rest.label,
                day: rest.day,
                start_time: rest.startTime,
                end_time: rest.endTime
            }));

            const { data: seededClasses, error: seedError } = await supabase.from('classes').insert(seedData).select();
            
            if (seedError) {
                console.error("Erro ao popular turmas automáticas:", seedError);
                setClasses(INITIAL_CLASSES); 
            } else {
                loadedClasses = seededClasses;
            }
        } else {
            loadedClasses = classesData;
        }

        if (loadedClasses.length > 0) {
            setClasses(loadedClasses.map((c: any) => ({
                id: c.id,
                label: c.label,
                day: c.day,
                startTime: c.start_time,
                endTime: c.end_time
            })));
        }

        // 2. Students
        const { data: studentsData, error: studentError } = await supabase.from('students').select('*');
        if (studentError) console.error("Erro alunos:", studentError);
        if (studentsData) {
            setStudents(studentsData.map((s: any) => ({
                id: s.id,
                name: s.name,
                email: s.email || '',
                phone: s.phone || '',
                status: s.status as StudentStatus,
                classId: s.class_id,
                entryDate: s.entry_date,
                material: {
                    received: s.material_received,
                    receivedDate: s.material_received_date
                }
            })));
        }

        // 3. Attendance
        const { data: attData, error: attError } = await supabase.from('attendance').select('*');
        if (attError) console.error("Erro frequencia:", attError);
        if (attData) {
            setAttendance(attData.map((a: any) => ({
                id: a.id,
                studentId: a.student_id,
                classId: a.class_id,
                date: a.date,
                weekNumber: a.week_number,
                type: a.type as AttendanceType,
                notes: a.notes
            })));
        }

        // 4. Notes
        const { data: notesData, error: notesError } = await supabase.from('pedagogical_notes').select('*');
        if (notesError) console.error("Erro notas:", notesError);
        if (notesData) {
            setNotes(notesData.map((n: any) => ({
                id: n.id,
                studentId: n.student_id,
                content: n.content,
                date: n.created_at
            })));
        }

        // 5. Reminders
        const { data: remData, error: remError } = await supabase.from('reminders').select('*');
        if (remError) console.error("Erro lembretes:", remError);
        if (remData) {
            setReminders(remData.map((r: any) => ({
                id: r.id,
                text: r.text,
                targetType: r.target_type,
                targetClassId: r.target_class_id,
                createdAt: r.created_at
            })));
        }

        // 6. History
        const { data: histData, error: histError } = await supabase.from('history_logs').select('*');
        if (histError) console.error("Erro historico:", histError);
        if (histData) {
            setHistory(histData.map((h: any) => ({
                id: h.id,
                studentId: h.student_id,
                action: h.action,
                details: h.details,
                date: h.created_at
            })));
        }

    } catch (error: any) {
        console.error("FALHA CRÍTICA AO CARREGAR DADOS:", error);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // --- ACTIONS ---

  const logHistory = async (studentId: string, action: string, details: string) => {
    const { data, error } = await supabase.from('history_logs').insert([{
        student_id: studentId,
        action,
        details
    }]).select();

    if (error) console.error("Erro ao logar histórico:", error);

    if (data) {
         setHistory((prev) => [{
            id: data[0].id,
            studentId,
            date: data[0].created_at,
            action,
            details
         }, ...prev]);
    }
  };

  const addClass = async (classData: { day: string; startTime: string; endTime: string }) => {
      const label = `${classData.day} — ${classData.startTime} às ${classData.endTime}`;
      const payload = {
          day: classData.day,
          start_time: classData.startTime,
          end_time: classData.endTime,
          label
      };

      const { data, error } = await supabase.from('classes').insert([payload]).select();

      if (error) {
          console.error("Erro ao criar turma:", error);
          alert("Erro ao criar turma: " + error.message);
          return;
      }

      if (data) {
          const newClass: ClassSchedule = {
              id: data[0].id,
              day: data[0].day,
              startTime: data[0].start_time,
              endTime: data[0].end_time,
              label: data[0].label
          };
          setClasses(prev => [...prev, newClass]);
      }
  };

  const removeClass = async (id: string) => {
      const { error } = await supabase.from('classes').delete().eq('id', id);
      
      if (error) {
          console.error("Erro ao excluir turma:", error);
          alert("Erro ao excluir turma. Verifique se existem dependências (alunos/chamadas).");
          throw error;
      }

      setClasses(prev => prev.filter(c => c.id !== id));
  };

  const addStudent = async (studentData: Omit<Student, 'id'>) => {
    const dbPayload = {
        name: studentData.name,
        email: studentData.email,
        phone: studentData.phone,
        status: studentData.status,
        class_id: studentData.classId,
        entry_date: studentData.entryDate,
        material_received: studentData.material.received,
        material_received_date: studentData.material.receivedDate
    };

    const { data, error } = await supabase.from('students').insert([dbPayload]).select();

    if (error) {
        console.error('Erro ao adicionar aluno:', error);
        alert(`Erro ao adicionar aluno: ${error.message}`);
        return;
    }

    if (data) {
        const newStudent: Student = { ...studentData, id: data[0].id };
        setStudents((prev) => [...prev, newStudent]);
        logHistory(newStudent.id, 'Cadastro', `Aluno cadastrado na turma ${classes.find(c => c.id === newStudent.classId)?.label}`);
    }
  };

  const updateStudent = async (id: string, updates: Partial<Student>) => {
    const oldStudent = students.find((s) => s.id === id);
    if (!oldStudent) return;

    // Prepare DB Update payload mapping
    const dbUpdates: any = {};
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.email !== undefined) dbUpdates.email = updates.email;
    if (updates.phone !== undefined) dbUpdates.phone = updates.phone;
    if (updates.status !== undefined) dbUpdates.status = updates.status;
    if (updates.classId !== undefined) dbUpdates.class_id = updates.classId;
    if (updates.entryDate !== undefined) dbUpdates.entry_date = updates.entryDate;
    if (updates.material !== undefined) {
        dbUpdates.material_received = updates.material.received;
        dbUpdates.material_received_date = updates.material.receivedDate;
    }

    const { error } = await supabase.from('students').update(dbUpdates).eq('id', id);

    if (error) {
        console.error('Erro ao atualizar aluno:', error);
        alert(`Erro ao atualizar: ${error.message}`);
        return;
    }

    if (updates.classId && updates.classId !== oldStudent.classId) {
      const oldClass = classes.find((c) => c.id === oldStudent.classId)?.label;
      const newClass = classes.find((c) => c.id === updates.classId)?.label;
      logHistory(id, 'Mudança de Turma', `Saiu de: ${oldClass} Para: ${newClass}`);
    }

    if (updates.status && updates.status !== oldStudent.status) {
      logHistory(id, 'Alteração de Status', `De: ${oldStudent.status} Para: ${updates.status}`);
    }

    if (updates.material?.received && !oldStudent.material.received) {
        logHistory(id, 'Material', `Recebeu o material em ${updates.material.receivedDate}`);
    }

    setStudents((prev) => prev.map((s) => (s.id === id ? { ...s, ...updates } : s)));
  };

  const removeStudent = async (id: string, reason: string) => {
    const { error } = await supabase
        .from('students')
        .update({ status: StudentStatus.REMOVED })
        .eq('id', id);

    if (error) {
        console.error("Erro ao remover aluno:", error);
        alert("Erro ao remover aluno.");
        return;
    }

    await logHistory(id, 'Exclusão', `Aluno removido do sistema. Motivo: ${reason}`);

    setStudents((prev) => prev.map((s) => (s.id === id ? { ...s, status: StudentStatus.REMOVED } : s)));
  };

  const markAttendance = async (record: AttendanceRecord) => {
    const { data: existing } = await supabase.from('attendance')
        .select('id')
        .eq('student_id', record.studentId)
        .eq('date', record.date)
        .maybeSingle();

    let result;
    const payload = {
        student_id: record.studentId,
        class_id: record.classId,
        date: record.date,
        week_number: record.weekNumber,
        type: record.type,
        notes: record.notes
    };

    if (existing) {
        result = await supabase.from('attendance').update(payload).eq('id', existing.id).select();
    } else {
        result = await supabase.from('attendance').insert([payload]).select();
    }

    if (result.error) {
        console.error('Erro attendance:', result.error);
        alert(`Erro ao salvar presença: ${result.error.message}`);
        return;
    }
    
    setAttendance((prev) => {
      const filtered = prev.filter(
        (a) => !(a.studentId === record.studentId && a.date === record.date)
      );
      return [...filtered, { ...record, id: result.data[0].id }];
    });

    if (record.type === AttendanceType.REPLACEMENT) {
        logHistory(record.studentId, 'Reposição', record.notes || `Realizou reposição na data ${record.date}`);
    } else if (record.type === AttendanceType.JUSTIFIED) {
        logHistory(record.studentId, 'Justificativa Aceita', record.notes || `Ausência justificada`);
    } else if (record.type === AttendanceType.ABSENT && record.notes?.includes('rejeitada')) {
        logHistory(record.studentId, 'Justificativa Rejeitada', record.notes);
    }
  };

  const deleteAttendance = async (recordId: string) => {
    const { error } = await supabase.from('attendance').delete().eq('id', recordId);
    
    if (error) {
        console.error("Erro ao deletar presença:", error);
        alert("Erro ao remover presença.");
        return;
    }

    setAttendance((prev) => prev.filter(a => a.id !== recordId));
  };

  const addReminder = async (reminderData: Omit<Reminder, 'id' | 'createdAt'>) => {
    const { data, error } = await supabase.from('reminders').insert([{
        text: reminderData.text,
        target_type: reminderData.targetType,
        target_class_id: reminderData.targetClassId
    }]).select();

    if (error) {
        console.error("Erro ao adicionar lembrete:", error);
        return;
    }

    if (data) {
        const newReminder: Reminder = {
            id: data[0].id,
            text: data[0].text,
            targetType: data[0].target_type,
            targetClassId: data[0].target_class_id,
            createdAt: data[0].created_at
        };
        setReminders(prev => [newReminder, ...prev]);
    }
  };

  const removeReminder = async (id: string) => {
    const { error } = await supabase.from('reminders').delete().eq('id', id);
    if(error) {
         console.error("Erro ao remover lembrete:", error);
         return;
    }
    setReminders(prev => prev.filter(r => r.id !== id));
  };

  const addNote = async (studentId: string, content: string) => {
    const { data, error } = await supabase.from('pedagogical_notes').insert([{
        student_id: studentId,
        content
    }]).select();

    if(error) {
        console.error("Erro ao adicionar nota:", error);
        return;
    }

    if (data) {
        const newNote: PedagogicalNote = {
            id: data[0].id,
            studentId: data[0].student_id,
            content: data[0].content,
            date: data[0].created_at
        };
        setNotes(prev => [newNote, ...prev]);
    }
  };

  const deleteNote = async (id: string) => {
    const { error } = await supabase.from('pedagogical_notes').delete().eq('id', id);
    if(error) {
        console.error("Erro ao deletar nota:", error);
        alert(`Erro ao excluir nota: ${error.message} (Verifique se as permissões SQL foram aplicadas)`);
        return;
    }
    setNotes(prev => prev.filter(n => n.id !== id));
  };

  const getStudentHistory = useCallback((studentId: string) => {
    return history.filter((h) => h.studentId === studentId).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [history]);

  const getAlerts = useCallback(() => {
    const alerts: { studentId: string; message: string }[] = [];
    students.filter(s => s.status === StudentStatus.ACTIVE).forEach(student => {
      const studentAttendance = attendance
        .filter(a => a.studentId === student.id)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
      if (studentAttendance.length >= 2) {
        if (studentAttendance[0].type === AttendanceType.ABSENT && studentAttendance[1].type === AttendanceType.ABSENT) {
          alerts.push({ studentId: student.id, message: '2 Faltas Consecutivas' });
        }
      }
    });
    return alerts;
  }, [students, attendance]);

  return (
    <AppContext.Provider
      value={{
        students,
        classes,
        attendance,
        history,
        reminders,
        notes,
        addStudent,
        updateStudent,
        removeStudent,
        markAttendance,
        deleteAttendance,
        getStudentHistory,
        getAlerts,
        addReminder,
        removeReminder,
        addNote,
        deleteNote,
        addClass,
        removeClass
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useAppContext must be used within an AppProvider');
  return context;
};