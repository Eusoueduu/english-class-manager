import React from 'react';
import { AttendanceType } from '../types';
import { useAppContext } from '../contexts/AppContext';
import { STATUS_COLORS } from '../constants';
import { X, Calendar, BookOpen, Clock, FileText, Download } from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

interface StudentProfileProps {
  studentId: string;
  onClose: () => void;
}

const StudentProfile: React.FC<StudentProfileProps> = ({ studentId, onClose }) => {
  const { students, getStudentHistory, classes, attendance } = useAppContext();
  const student = students.find((s) => s.id === studentId);
  const history = getStudentHistory(studentId);

  if (!student) return null;

  const studentClass = classes.find((c) => c.id === student.classId)?.label || 'Sem turma';
  
  // Calculate specific stats
  const studentAttendance = attendance.filter(a => a.studentId === studentId);
  const totalClasses = studentAttendance.length;
  const presents = studentAttendance.filter(a => a.type === AttendanceType.PRESENT || a.type === AttendanceType.REPLACEMENT).length;
  const presenceRate = totalClasses > 0 ? Math.round((presents / totalClasses) * 100) : 0;

  const generatePDF = () => {
    const doc = new jsPDF();

    // Header
    doc.setFontSize(18);
    doc.setTextColor(40, 40, 40);
    doc.text(`Relatório do Aluno: ${student.name}`, 14, 22);
    
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Turma Atual: ${studentClass}`, 14, 30);
    doc.text(`Status: ${student.status}`, 14, 36);
    doc.text(`Taxa de Presença: ${presenceRate}%`, 14, 42);

    // Stats Table
    autoTable(doc, {
        startY: 50,
        head: [['Total Aulas', 'Presenças', 'Faltas', 'Reposições', 'Justificativas']],
        body: [[
            totalClasses,
            studentAttendance.filter(a => a.type === AttendanceType.PRESENT).length,
            studentAttendance.filter(a => a.type === AttendanceType.ABSENT).length,
            studentAttendance.filter(a => a.type === AttendanceType.REPLACEMENT).length,
            studentAttendance.filter(a => a.type === AttendanceType.JUSTIFIED).length
        ]],
        theme: 'grid',
        headStyles: { fillColor: [79, 70, 229] }
    });

    // History Table
    const historyData = history.map(h => [
        new Date(h.date).toLocaleDateString(),
        h.action,
        h.details
    ]);

    doc.text("Histórico de Movimentações", 14, (doc as any).lastAutoTable.finalY + 10);
    
    autoTable(doc, {
        startY: (doc as any).lastAutoTable.finalY + 15,
        head: [['Data', 'Ação', 'Detalhes']],
        body: historyData,
        theme: 'striped',
        headStyles: { fillColor: [100, 100, 100] }
    });

    doc.save(`relatorio_${student.name.replace(/\s+/g, '_').toLowerCase()}.pdf`);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl my-8">
        <div className="flex justify-between items-center px-6 py-4 border-b">
            <h2 className="text-xl font-bold text-gray-800">Perfil do Aluno</h2>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
                <X size={24} />
            </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[80vh]">
            {/* Header Info */}
            <div className="flex flex-col md:flex-row justify-between mb-8 gap-4">
                <div>
                    <h3 className="text-2xl font-bold text-gray-900">{student.name}</h3>
                    <p className="text-gray-500 flex items-center mt-1"><Calendar size={16} className="mr-1"/> Entrou em: {new Date(student.entryDate).toLocaleDateString()}</p>
                    <p className="text-gray-500">{student.email} • {student.phone}</p>
                </div>
                <div className="text-right">
                     <span className={`px-3 py-1 inline-flex text-sm font-semibold rounded-full ${STATUS_COLORS[student.status]}`}>
                      {student.status}
                    </span>
                    <div className="mt-2 text-sm text-gray-600">
                        <strong>Turma:</strong><br/> {studentClass}
                    </div>
                </div>
            </div>

            {/* Material & Presence Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-100">
                    <div className="flex items-center mb-2">
                        <BookOpen className="text-indigo-600 mr-2" size={20}/>
                        <h4 className="font-semibold text-indigo-900">Material Didático</h4>
                    </div>
                    <p className="text-sm text-indigo-800">
                        {student.material.received 
                            ? `Entregue em: ${new Date(student.material.receivedDate!).toLocaleDateString()}` 
                            : 'Ainda não entregue'}
                    </p>
                </div>

                <div className="bg-green-50 p-4 rounded-lg border border-green-100">
                     <div className="flex items-center mb-2">
                        <Clock className="text-green-600 mr-2" size={20}/>
                        <h4 className="font-semibold text-green-900">Frequência Global</h4>
                    </div>
                    <div className="flex items-end">
                        <span className="text-3xl font-bold text-green-700">{presenceRate}%</span>
                        <span className="text-sm text-green-600 ml-2 mb-1">de presença</span>
                    </div>
                </div>
            </div>

            {/* Actions */}
            <div className="mb-8">
                 <button 
                    onClick={generatePDF}
                    className="flex items-center justify-center w-full sm:w-auto px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gray-800 hover:bg-gray-900 focus:outline-none"
                >
                    <Download className="mr-2" size={16}/> Exportar Relatório PDF
                 </button>
            </div>

            {/* History Timeline */}
            <div>
                <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
                    <FileText className="mr-2" size={20}/> Histórico de Movimentações
                </h3>
                <div className="relative border-l-2 border-gray-200 ml-3 space-y-6">
                    {history.length === 0 && <p className="text-gray-500 ml-6">Nenhum registro histórico.</p>}
                    {history.map((log) => (
                        <div key={log.id} className="mb-8 ml-6 relative">
                            <span className="absolute -left-[31px] top-1 bg-white border-2 border-gray-200 rounded-full w-4 h-4"></span>
                            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start">
                                <div>
                                    <h4 className="text-sm font-bold text-gray-900">{log.action}</h4>
                                    <p className="text-sm text-gray-600 mt-1">{log.details}</p>
                                </div>
                                <time className="text-xs text-gray-400 mt-1 sm:mt-0">
                                    {new Date(log.date).toLocaleString()}
                                </time>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default StudentProfile;