import React, { useState, useMemo } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { AttendanceType, StudentStatus, AttendanceRecord } from '../types';
import { ChevronLeft, ChevronRight, X, Calendar, ArrowRightLeft } from 'lucide-react';

type ModalType = 'REPOSITION' | 'JUSTIFICATION' | 'TRANSFER';

interface ActiveModal {
    type: ModalType;
    studentId: string;
    dateStr: string;
    studentName: string;
}

const AttendanceSheet: React.FC = () => {
  const { students, classes, attendance, markAttendance, deleteAttendance, updateStudent } = useAppContext();
  const [selectedClassId, setSelectedClassId] = useState(classes[0]?.id);
  
  const today = new Date();
  const [currentWeek, setCurrentWeek] = useState(getISOWeek(today));
  const [selectedYear, setSelectedYear] = useState(today.getFullYear());
  const [jumpMonth, setJumpMonth] = useState(today.toISOString().slice(0, 7));

  const [activeModal, setActiveModal] = useState<ActiveModal | null>(null);
  const [repositionClassId, setRepositionClassId] = useState<string>(classes[0]?.id || '');
  const [transferClassId, setTransferClassId] = useState<string>('');
  const [justificationText, setJustificationText] = useState('');

  function getISOWeek(date: Date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  }

  function getWeekDates(w: number, y: number) {
      const simple = new Date(y, 0, 1 + (w - 1) * 7);
      const dow = simple.getDay();
      const ISOweekStart = simple;
      if (dow <= 4) ISOweekStart.setDate(simple.getDate() - simple.getDay() + 1);
      else ISOweekStart.setDate(simple.getDate() + 8 - simple.getDay());
      const dates = [];
      for(let i=0; i<7; i++) {
          const d = new Date(ISOweekStart);
          d.setDate(d.getDate() + i);
          dates.push(d);
      }
      return dates;
  }

  const weekOptions = useMemo(() => {
    if (!jumpMonth) return [];
    const [yStr, mStr] = jumpMonth.split('-');
    const year = parseInt(yStr);
    const month = parseInt(mStr) - 1; 

    const options = [];
    const date = new Date(year, month, 1);
    const seenWeeks = new Set<number>();

    while (date.getMonth() === month) {
        const w = getISOWeek(date);
        if (!seenWeeks.has(w)) {
            seenWeeks.add(w);
            const dates = getWeekDates(w, year);
            const start = dates[0].toLocaleDateString('pt-BR', {day: '2-digit', month: '2-digit'});
            const end = dates[6].toLocaleDateString('pt-BR', {day: '2-digit', month: '2-digit'});
            options.push({ week: w, label: `Sem. ${w} (${start}-${end})` });
        }
        date.setDate(date.getDate() + 1);
    }
    return options;
  }, [jumpMonth]);

  const handleJumpToMonth = (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value; 
      setJumpMonth(val);
      if(val) {
          const [year, month] = val.split('-');
          const date = new Date(parseInt(year), parseInt(month) - 1, 1);
          setCurrentWeek(getISOWeek(date));
          setSelectedYear(parseInt(year));
      }
  };

  const changeWeek = (increment: number) => {
      const newWeek = currentWeek + increment;
      setCurrentWeek(newWeek);
      const dates = getWeekDates(newWeek, selectedYear);
      const midWeek = dates[3]; 
      const newMonthISO = midWeek.toISOString().slice(0, 7);
      if (newMonthISO !== jumpMonth) {
          setJumpMonth(newMonthISO);
          setSelectedYear(midWeek.getFullYear());
      }
  };

  const weekDates = getWeekDates(currentWeek, selectedYear);
  const currentClass = classes.find(c => c.id === selectedClassId);
  const enrolledStudents = students.filter(s => 
      s.classId === selectedClassId && 
      (s.status === StudentStatus.ACTIVE || 
       s.status === StudentStatus.TRANSFERRED_CLASS || 
       s.status === StudentStatus.TRANSFERRED_TIME)
  );

  const getRecord = (studentId: string, dateStr: string) => attendance.find(a => a.studentId === studentId && a.date === dateStr);

  const handleAttendanceClick = (studentId: string, type: AttendanceType, dateStr: string, studentName: string) => {
    const existingRecord = getRecord(studentId, dateStr);

    // TOGGLE LOGIC: If clicking the same status, remove it.
    if (existingRecord && existingRecord.type === type) {
        deleteAttendance(existingRecord.id);
        return;
    }

    if (type === AttendanceType.REPLACEMENT) {
        setRepositionClassId(classes[0]?.id || '');
        setActiveModal({ type: 'REPOSITION', studentId, dateStr, studentName });
        return;
    }
    if (type === AttendanceType.JUSTIFIED) {
        setJustificationText('');
        setActiveModal({ type: 'JUSTIFICATION', studentId, dateStr, studentName });
        return;
    }
    saveRecord(studentId, type, dateStr);
  };

  const handleTransferClick = (studentId: string, dateStr: string, studentName: string) => {
      // Default to the first available class that isn't the current one
      const availableClasses = classes.filter(c => c.id !== selectedClassId);
      setTransferClassId(availableClasses[0]?.id || '');
      setActiveModal({ type: 'TRANSFER', studentId, dateStr, studentName });
  };

  const saveRecord = (studentId: string, type: AttendanceType, dateStr: string, notes?: string) => {
    const record: AttendanceRecord = {
        id: `${studentId}-${dateStr}`,
        studentId,
        classId: selectedClassId,
        date: dateStr,
        weekNumber: currentWeek,
        type,
        notes
    };
    markAttendance(record);
    setActiveModal(null);
  };

  const confirmReposition = () => {
      if (!activeModal) return;
      const targetClass = classes.find(c => c.id === repositionClassId);
      const note = `Reposição realizada na turma: ${targetClass?.label || 'Desconhecida'}`;
      saveRecord(activeModal.studentId, AttendanceType.REPLACEMENT, activeModal.dateStr, note);
  };

  const confirmJustification = (accepted: boolean) => {
      if (!activeModal) return;
      const note = accepted ? `Justificativa aceita: ${justificationText}` : `Justificativa rejeitada: ${justificationText}`;
      saveRecord(activeModal.studentId, accepted ? AttendanceType.JUSTIFIED : AttendanceType.ABSENT, activeModal.dateStr, note);
  };

  const confirmTransfer = async () => {
      if (!activeModal || !transferClassId) return;
      
      // Update student's class and status
      await updateStudent(activeModal.studentId, {
          classId: transferClassId,
          status: StudentStatus.TRANSFERRED_TIME // Or TRANSFERRED_CLASS, defaulting to TIME for schedule change
      });
      
      setActiveModal(null);
  };

  const classDayMap: Record<string, number> = { 'Segunda': 1, 'Terça': 2, 'Quarta': 3, 'Quinta': 4, 'Sexta': 5 };
  const targetDayIndex = classDayMap[currentClass?.day.split(' ')[0] || ''] || -1;
  const targetDate = targetDayIndex !== -1 ? weekDates[targetDayIndex - 1] : null;
  const targetDateStr = targetDate ? targetDate.toISOString().split('T')[0] : '';

  return (
    <div className="space-y-6 relative w-full min-w-0">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
         <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Controle de Frequência</h1>
         
         <div className="flex items-center space-x-2 bg-white p-2 rounded border shadow-sm w-full md:w-auto">
             <Calendar size={18} className="text-indigo-600"/>
             <span className="text-sm text-gray-700 font-medium">Mês:</span>
             <input type="month" value={jumpMonth} onChange={handleJumpToMonth} className="flex-1 md:flex-none border-none text-sm text-gray-900 font-bold focus:ring-0 cursor-pointer bg-transparent"/>
         </div>
      </div>

      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4">
          <select
                className="w-full md:w-auto border rounded-md p-2 focus:ring-indigo-500 focus:border-indigo-500 font-medium text-gray-800"
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
          >
                {classes.map((c) => (<option key={c.id} value={c.id}>{c.label}</option>))}
          </select>

          <div className="flex items-center bg-gray-50 rounded-lg p-1 border border-gray-200 w-full md:w-auto justify-between md:justify-start">
              <button onClick={() => changeWeek(-1)} className="p-2 hover:bg-white hover:shadow-sm rounded-md transition-all text-gray-600"><ChevronLeft size={20}/></button>
              <div className="px-2 flex-1 md:flex-none">
                  <select value={currentWeek} onChange={(e) => setCurrentWeek(Number(e.target.value))} className="w-full bg-transparent border-none text-center font-medium text-indigo-900 focus:ring-0 cursor-pointer text-sm">
                      {weekOptions.length > 0 ? (weekOptions.map(opt => (<option key={opt.week} value={opt.week}>{opt.label}</option>))) : (<option value={currentWeek}>Semana {currentWeek}</option>)}
                  </select>
              </div>
              <button onClick={() => changeWeek(1)} className="p-2 hover:bg-white hover:shadow-sm rounded-md transition-all text-gray-600"><ChevronRight size={20}/></button>
          </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden flex flex-col">
          <div className="overflow-x-auto w-full">
          {targetDate ? (
            <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50 sticky top-0 z-10">
                    <tr>
                        <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Aluno</th>
                        <th className="px-3 sm:px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                            <div className="flex flex-col items-center">
                                <span>Status</span>
                                <span className="text-indigo-600 text-[10px] sm:text-xs font-bold mt-1 whitespace-nowrap">
                                    {targetDate.toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' })}
                                </span>
                            </div>
                        </th>
                        <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {enrolledStudents.map(student => {
                        const record = getRecord(student.id, targetDateStr);
                        const status = record?.type || 'Pendente';
                        
                        return (
                            <tr key={student.id} className="hover:bg-gray-50 transition-colors">
                                <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm font-medium text-gray-900">{student.name}</div>
                                </td>
                                <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-center">
                                    <span className={`px-2 py-1 inline-flex text-[10px] sm:text-xs leading-5 font-semibold rounded-full uppercase shadow-sm
                                        ${status === 'Pendente' ? 'bg-gray-100 text-gray-600 border border-gray-200' : ''}
                                        ${status === AttendanceType.PRESENT ? 'bg-green-100 text-green-800 border border-green-200' : ''}
                                        ${status === AttendanceType.ABSENT ? 'bg-purple-100 text-purple-800 border border-purple-200' : ''}
                                        ${status === AttendanceType.REPLACEMENT ? 'bg-yellow-100 text-yellow-800 border border-yellow-200' : ''}
                                        ${status === AttendanceType.JUSTIFIED ? 'bg-orange-100 text-orange-800 border border-orange-200' : ''}
                                    `}>
                                        {status}
                                    </span>
                                </td>
                                <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm font-medium">
                                    <div className="flex flex-wrap gap-1 sm:gap-2">
                                        <button 
                                            onClick={() => handleAttendanceClick(student.id, AttendanceType.PRESENT, targetDateStr, student.name)} 
                                            className={`w-8 h-8 sm:w-auto sm:px-2 sm:py-1 rounded text-xs font-semibold border transition-all flex items-center justify-center ${status === AttendanceType.PRESENT ? 'bg-green-500 text-white border-green-600' : 'bg-white text-green-600 border-green-500 hover:bg-green-50'}`}
                                        >
                                            P
                                        </button>
                                        <button 
                                            onClick={() => handleAttendanceClick(student.id, AttendanceType.ABSENT, targetDateStr, student.name)} 
                                            className={`w-8 h-8 sm:w-auto sm:px-2 sm:py-1 rounded text-xs font-semibold border transition-all flex items-center justify-center ${status === AttendanceType.ABSENT ? 'bg-purple-500 text-white border-purple-600' : 'bg-white text-purple-600 border-purple-500 hover:bg-purple-50'}`}
                                        >
                                            F
                                        </button>
                                        <button 
                                            onClick={() => handleAttendanceClick(student.id, AttendanceType.REPLACEMENT, targetDateStr, student.name)} 
                                            className={`w-8 h-8 sm:w-auto sm:px-2 sm:py-1 rounded text-xs font-semibold border transition-all flex items-center justify-center ${status === AttendanceType.REPLACEMENT ? 'bg-yellow-500 text-white border-yellow-600' : 'bg-white text-yellow-600 border-yellow-500 hover:bg-yellow-50'}`}
                                        >
                                            R
                                        </button>
                                         <button 
                                            onClick={() => handleAttendanceClick(student.id, AttendanceType.JUSTIFIED, targetDateStr, student.name)} 
                                            className={`w-8 h-8 sm:w-auto sm:px-2 sm:py-1 rounded text-xs font-semibold border transition-all flex items-center justify-center ${status === AttendanceType.JUSTIFIED ? 'bg-orange-500 text-white border-orange-600' : 'bg-white text-orange-600 border-orange-500 hover:bg-orange-50'}`}
                                        >
                                            J
                                        </button>
                                        <button 
                                            onClick={() => handleTransferClick(student.id, targetDateStr, student.name)} 
                                            className="w-8 h-8 sm:w-auto bg-white border border-gray-400 text-gray-600 sm:px-2 sm:py-1 rounded hover:bg-gray-100 text-xs font-semibold sm:ml-2 flex items-center justify-center"
                                            title="Trocar de Turma"
                                        >
                                            T
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        )
                    })}
                    {enrolledStudents.length === 0 && (<tr><td colSpan={3} className="px-6 py-10 text-center text-gray-500">Nenhum aluno nesta turma.</td></tr>)}
                </tbody>
            </table>
          ) : (
              <div className="p-10 text-center text-gray-500">Data incompatível com dia da turma.</div>
          )}
          </div>
      </div>
      
      {/* Legend */}
      <div className="bg-gray-50 p-4 rounded-md text-sm text-gray-700 border border-gray-200 hidden sm:block">
        <strong>Legenda:</strong> 
        <span className="mx-2 font-bold text-green-600">P: Presente</span>
        <span className="mx-2 font-bold text-purple-600">F: Falta</span>
        <span className="mx-2 font-bold text-yellow-600">R: Reposição</span>
        <span className="mx-2 font-bold text-orange-600">J: Justificado</span>
        <span className="mx-2 font-bold text-gray-600">T: Troca/Transferência</span>
      </div>

      {activeModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
              <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                  <div className="px-6 py-4 bg-gray-900 border-b flex justify-between items-center">
                      <h3 className="text-lg font-medium text-white">
                        {activeModal.type === 'REPOSITION' ? 'Registrar Reposição' : 
                         activeModal.type === 'TRANSFER' ? 'Transferir Aluno' :
                         'Justificar Falta'}
                      </h3>
                      <button onClick={() => setActiveModal(null)} className="text-gray-400 hover:text-white"><X size={20}/></button>
                  </div>
                  <div className="p-6">
                      <p className="mb-4 text-gray-600">Aluno: <strong>{activeModal.studentName}</strong> <br/> Data: {new Date(activeModal.dateStr).toLocaleDateString()}</p>
                      
                      {activeModal.type === 'REPOSITION' && (
                          <>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Turma da reposição:</label>
                            <select className="w-full border rounded-md p-2 mb-4" value={repositionClassId} onChange={(e) => setRepositionClassId(e.target.value)}>{classes.map(c => (<option key={c.id} value={c.id}>{c.label}</option>))}</select>
                            <div className="flex justify-end gap-2"><button onClick={() => setActiveModal(null)} className="px-4 py-2 border rounded text-gray-700">Cancelar</button><button onClick={confirmReposition} className="px-4 py-2 bg-yellow-500 text-white hover:bg-yellow-600 rounded">Confirmar</button></div>
                          </>
                      )}

                      {activeModal.type === 'JUSTIFICATION' && (
                          <>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Motivo:</label>
                            <textarea className="w-full border rounded-md p-2 mb-4 h-24" value={justificationText} onChange={(e) => setJustificationText(e.target.value)} placeholder="Motivo..."/>
                            <div className="flex justify-between gap-2"><button onClick={() => confirmJustification(false)} className="flex-1 px-4 py-2 bg-purple-50 text-purple-700 border border-purple-200 rounded">Marcar Falta</button><button onClick={() => confirmJustification(true)} className="flex-1 px-4 py-2 bg-orange-50 text-orange-700 border border-orange-200 rounded">Justificar</button></div>
                          </>
                      )}

                      {activeModal.type === 'TRANSFER' && (
                          <>
                            <div className="bg-indigo-50 p-3 rounded mb-4 text-sm text-indigo-800">
                                <ArrowRightLeft className="inline mr-1" size={14}/>
                                Isso mudará permanentemente o horário do aluno. Ele será removido desta lista após a confirmação.
                            </div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Nova Turma:</label>
                            <select className="w-full border rounded-md p-2 mb-4" value={transferClassId} onChange={(e) => setTransferClassId(e.target.value)}>
                                {classes.filter(c => c.id !== selectedClassId).map(c => (
                                    <option key={c.id} value={c.id}>{c.label}</option>
                                ))}
                            </select>
                            <div className="flex justify-end gap-2">
                                <button onClick={() => setActiveModal(null)} className="px-4 py-2 border rounded text-gray-700">Cancelar</button>
                                <button onClick={confirmTransfer} className="px-4 py-2 bg-indigo-600 text-white hover:bg-indigo-700 rounded shadow-sm">Confirmar Troca</button>
                            </div>
                          </>
                      )}
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default AttendanceSheet;