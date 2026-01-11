import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { STATUS_COLORS } from '../constants';
import { Edit2, FileText, CheckCircle, XCircle, Trash2, X, AlertCircle, Search, ChevronLeft, ChevronRight, Download, PlusCircle, Clock, Calendar, Filter, Settings, ChevronDown, ChevronUp, User } from 'lucide-react';
import StudentForm from './StudentForm';
import { Student, StudentStatus } from '../types';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

interface StudentListProps {
  onSelectStudent: (id: string) => void;
}

const HISTORY_ITEMS_PER_PAGE = 6;

const StudentList: React.FC<StudentListProps> = ({ onSelectStudent }) => {
  const { students, classes, history, addClass, removeClass } = useAppContext();
  const [filterClass, setFilterClass] = useState<string>('all');
  const [filterMonth, setFilterMonth] = useState<string>(''); // YYYY-MM
  const [searchTerm, setSearchTerm] = useState('');
  const [editingStudent, setEditingStudent] = useState<Student | undefined>(undefined);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);

  // Class Modal State
  const [isClassModalOpen, setIsClassModalOpen] = useState(false);
  const [expandedClassId, setExpandedClassId] = useState<string | null>(null);
  const [newClassData, setNewClassData] = useState({ day: 'Segunda', startTime: '19:00', endTime: '21:00' });

  // States specific to the History Modal
  const [historySearch, setHistorySearch] = useState('');
  const [historyPage, setHistoryPage] = useState(1);
  const listContainerRef = useRef<HTMLDivElement>(null);

  const getClassCount = (classId: string) => {
      return students.filter(s => s.classId === classId && s.status !== StudentStatus.REMOVED).length;
  };

  const filteredStudents = students.filter((s) => {
    // Exclude removed students from main list
    if (s.status === StudentStatus.REMOVED) return false;
    
    // 1. Class Filter
    const matchesClass = filterClass === 'all' || s.classId === filterClass;
    
    // 2. Name Filter
    const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase());

    // 3. Month Filter (Hybrid Logic)
    let matchesMonth = true;
    if (filterMonth) {
        if (s.status === StudentStatus.DROPOUT) {
            // If Dropout, check WHEN they dropped out based on history
            const dropoutLog = history.find(h => 
                h.studentId === s.id && 
                h.details.includes(`Para: ${StudentStatus.DROPOUT}`)
            );
            matchesMonth = dropoutLog ? dropoutLog.date.startsWith(filterMonth) : false;
        } else {
            // For Active/Others, check Entry Date (Matrícula)
            matchesMonth = s.entryDate.startsWith(filterMonth);
        }
    }

    return matchesClass && matchesSearch && matchesMonth;
  });

  // Calculate summary stats for the filtered list
  const filteredStats = useMemo(() => {
      return {
          total: filteredStudents.length,
          active: filteredStudents.filter(s => s.status === StudentStatus.ACTIVE).length,
          dropout: filteredStudents.filter(s => s.status === StudentStatus.DROPOUT).length
      }
  }, [filteredStudents]);

  // Get data for removed students
  const removedStudentsLogs = useMemo(() => {
    return students
        .filter(s => s.status === StudentStatus.REMOVED)
        .map(s => {
            // Find the specific deletion log for this student
            const log = history.find(h => h.studentId === s.id && h.action === 'Exclusão');
            return {
                student: s,
                reason: log ? log.details.replace('Aluno removido do sistema. Motivo: ', '') : 'Motivo não registrado.',
                date: log ? log.date : null
            };
        })
        .sort((a,b) => {
            const dateA = a.date ? new Date(a.date).getTime() : 0;
            const dateB = b.date ? new Date(b.date).getTime() : 0;
            return dateB - dateA;
        });
  }, [students, history]);

  const removedCount = removedStudentsLogs.length;

  // Filter and Pagination Logic for History Modal
  const filteredHistoryLogs = useMemo(() => {
      return removedStudentsLogs.filter(log => 
          log.student.name.toLowerCase().includes(historySearch.toLowerCase())
      );
  }, [removedStudentsLogs, historySearch]);

  const totalHistoryPages = Math.ceil(filteredHistoryLogs.length / HISTORY_ITEMS_PER_PAGE);
  const paginatedHistoryLogs = filteredHistoryLogs.slice(
      (historyPage - 1) * HISTORY_ITEMS_PER_PAGE,
      historyPage * HISTORY_ITEMS_PER_PAGE
  );

  // Scroll to top when page changes
  useEffect(() => {
    if (listContainerRef.current) {
        listContainerRef.current.scrollTop = 0;
    }
  }, [historyPage]);

  const handleEdit = (student: Student, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingStudent(student);
    setIsFormOpen(true);
  };

  const handleAddNew = () => {
      setEditingStudent(undefined);
      setIsFormOpen(true);
  }

  const handleHistorySearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setHistorySearch(e.target.value);
      setHistoryPage(1); // Reset to first page on search
  };

  // --- ACTIONS ---

  const handleExportPDF = () => {
      const doc = new jsPDF();
      
      const title = filterClass === 'all' ? 'Relatório Geral de Alunos' : `Relatório: ${classes.find(c => c.id === filterClass)?.label}`;
      doc.setFontSize(16);
      doc.text(title, 14, 20);
      doc.setFontSize(10);
      
      let subtitle = `Gerado em: ${new Date().toLocaleDateString()} - Total Listado: ${filteredStudents.length}`;
      if (filterMonth) subtitle += ` (Ref: ${filterMonth})`;
      
      doc.text(subtitle, 14, 28);

      const tableData = filteredStudents.map(s => [
          s.name,
          classes.find(c => c.id === s.classId)?.label || 'Sem Turma',
          s.status,
          s.material.received ? 'Entregue' : 'Pendente',
          new Date(s.entryDate).toLocaleDateString()
      ]);

      autoTable(doc, {
          startY: 35,
          head: [['Nome', 'Turma', 'Status', 'Material', 'Entrada']],
          body: tableData,
          theme: 'grid',
          headStyles: { fillColor: [67, 56, 202] }, // Indigo 700
          styles: { fontSize: 8 }
      });

      doc.save('relatorio_alunos.pdf');
  };

  const handleCreateClass = async (e: React.FormEvent) => {
      e.preventDefault();
      await addClass(newClassData);
      setNewClassData({ day: 'Segunda', startTime: '19:00', endTime: '21:00' });
  };

  const handleDeleteClass = async (id: string, e: React.MouseEvent) => {
      e.stopPropagation(); // Prevent toggling accordion
      const count = getClassCount(id);
      if (count > 0) {
          alert(`Não é possível excluir esta turma pois ela possui ${count} aluno(s) vinculados. Remova ou transfira os alunos antes.`);
          return;
      }
      
      if (window.confirm("Tem certeza que deseja excluir esta turma? Esta ação não pode ser desfeita.")) {
          try {
              await removeClass(id);
          } catch (e) {
              // error handled in context
          }
      }
  };

  const toggleClassExpansion = (classId: string) => {
    setExpandedClassId(prev => prev === classId ? null : classId);
  };

  return (
    <div className="space-y-6 w-full min-w-0">
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Alunos</h1>
        
        {/* Buttons Toolbar */}
        <div className="flex flex-wrap gap-2 w-full xl:w-auto">
             <button
                onClick={handleExportPDF}
                className="flex-1 sm:flex-none bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200 px-4 py-2 rounded-lg transition-colors shadow-sm text-sm font-medium flex items-center justify-center whitespace-nowrap"
            >
                <Download size={16} className="mr-2"/> Relatório PDF
            </button>
             
             <button
                onClick={() => setIsClassModalOpen(true)}
                className="flex-1 sm:flex-none bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 px-4 py-2 rounded-lg transition-colors shadow-sm text-sm font-medium flex items-center justify-center whitespace-nowrap"
            >
                <Settings size={16} className="mr-2"/> Gerenciar Turmas
            </button>

             <button
                onClick={() => setIsHistoryModalOpen(true)}
                className={`flex-1 sm:flex-none border px-4 py-2 rounded-lg transition-colors shadow-sm text-sm font-medium flex items-center justify-center whitespace-nowrap
                    ${removedCount > 0 
                        ? 'bg-red-50 border-red-200 text-red-700 hover:bg-red-100' 
                        : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                    }`}
            >
                <Trash2 size={16} className={`mr-2 ${removedCount > 0 ? 'text-red-600' : 'text-gray-400'}`} /> 
                Excluídos ({removedCount})
            </button>
            <button
                onClick={handleAddNew}
                className="flex-1 sm:flex-none bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors shadow-sm text-sm font-medium whitespace-nowrap"
            >
                + Novo Aluno
            </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 flex flex-col lg:flex-row gap-4">
        <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <input
            type="text"
            placeholder="Buscar por nome..."
            className="w-full pl-10 border rounded-md p-2 focus:ring-indigo-500 focus:border-indigo-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            />
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex items-center space-x-2 border rounded-md px-3 py-2 bg-white w-full sm:w-auto">
                <Filter size={18} className="text-gray-500 flex-shrink-0" />
                <span className="text-sm text-gray-500 whitespace-nowrap">Mês Ref:</span>
                <input
                    type="month"
                    className="border-none p-0 text-sm focus:ring-0 text-gray-700 cursor-pointer w-full"
                    value={filterMonth}
                    onChange={(e) => setFilterMonth(e.target.value)}
                />
                {filterMonth && (
                    <button onClick={() => setFilterMonth('')} className="text-gray-400 hover:text-red-500"><X size={16}/></button>
                )}
            </div>

            <select
            className="border rounded-md p-2 focus:ring-indigo-500 focus:border-indigo-500 w-full sm:w-auto min-w-[200px]"
            value={filterClass}
            onChange={(e) => setFilterClass(e.target.value)}
            >
            <option value="all">Todas as Turmas</option>
            {classes.map((c) => (
                <option key={c.id} value={c.id}>
                    {c.label} ({getClassCount(c.id)})
                </option>
            ))}
            </select>
        </div>
      </div>
      
      {/* Stats Summary for Filtered View */}
      {(filterMonth || filterClass !== 'all' || searchTerm) && (
          <div className="flex gap-4 text-sm px-1">
              <span className="font-medium text-gray-600">Resultados: <span className="text-gray-900">{filteredStats.total}</span></span>
              {filterMonth && (
                  <>
                    <span className="text-green-600 font-medium">Novos: {filteredStats.active}</span>
                    <span className="text-red-600 font-medium">Desistentes no mês: {filteredStats.dropout}</span>
                  </>
              )}
          </div>
      )}

      {/* Table Container with Horizontal Scroll */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden flex flex-col">
        <div className="overflow-x-auto w-full">
            <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50 sticky top-0 z-10">
                <tr>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nome</th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Turma</th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {filterMonth ? 'Data Ref.' : 'Data Entrada'}
                </th>
                <th className="px-3 sm:px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
                {filteredStudents.map((student) => {
                const studentClass = classes.find((c) => c.id === student.classId)?.label || 'Sem turma';
                
                // Determine date to show based on filter context
                let displayDate = student.entryDate;
                let dateLabel = "Entrada";
                
                if (filterMonth && student.status === StudentStatus.DROPOUT) {
                     const dropoutLog = history.find(h => h.studentId === student.id && h.details.includes(`Para: ${StudentStatus.DROPOUT}`));
                     if (dropoutLog) {
                         displayDate = dropoutLog.date;
                         dateLabel = "Saída";
                     }
                }

                return (
                    <tr 
                        key={student.id} 
                        className="hover:bg-gray-50 cursor-pointer transition-colors"
                        onClick={() => onSelectStudent(student.id)}
                    >
                    <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{student.name}</div>
                        <div className="text-xs text-gray-500">{student.email}</div>
                    </td>
                    <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {studentClass}
                    </td>
                    <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${STATUS_COLORS[student.status] || 'bg-gray-100 text-gray-800'}`}>
                        {student.status}
                        </span>
                    </td>
                    <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(displayDate).toLocaleDateString()}
                        {filterMonth && <span className="ml-2 text-xs text-gray-400">({dateLabel})</span>}
                    </td>
                    <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                        onClick={(e) => handleEdit(student, e)}
                        className="text-indigo-600 hover:text-indigo-900 mx-2 p-1"
                        title="Editar"
                        >
                        <Edit2 size={18} />
                        </button>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onSelectStudent(student.id);
                            }}
                            className="text-gray-600 hover:text-gray-900 p-1"
                            title="Ver Histórico"
                        >
                            <FileText size={18} />
                        </button>
                    </td>
                    </tr>
                );
                })}
                {filteredStudents.length === 0 && (
                    <tr>
                        <td colSpan={5} className="px-6 py-10 text-center text-gray-500">
                            {filterMonth 
                                ? 'Nenhum registro encontrado para o mês selecionado.' 
                                : 'Nenhum aluno encontrado na lista ativa.'}
                        </td>
                    </tr>
                )}
            </tbody>
            </table>
        </div>
      </div>

      {isFormOpen && (
        <StudentForm
          initialData={editingStudent}
          onClose={() => setIsFormOpen(false)}
        />
      )}

      {/* MANAGE CLASSES MODAL */}
      {isClassModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
             <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200 max-h-[90vh] flex flex-col">
                <div className="px-6 py-4 bg-indigo-600 border-b border-indigo-700 flex justify-between items-center flex-shrink-0">
                    <h2 className="text-lg font-bold text-white flex items-center">
                        <Settings size={20} className="mr-2"/> 
                        Gerenciar Turmas
                    </h2>
                    <button onClick={() => setIsClassModalOpen(false)} className="text-indigo-200 hover:text-white"><X size={20}/></button>
                </div>
                
                <div className="p-6 overflow-y-auto flex-1">
                    {/* EXISTING CLASSES LIST */}
                    <div className="mb-6">
                        <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center"><Filter size={14} className="mr-1"/> Turmas Existentes</h3>
                        <div className="space-y-2 overflow-y-auto border rounded-md p-2 bg-gray-50 max-h-[300px]">
                            {classes.map(c => {
                                const classStudents = students.filter(s => s.classId === c.id && s.status !== StudentStatus.REMOVED);
                                const count = classStudents.length;
                                const isExpanded = expandedClassId === c.id;

                                return (
                                    <div key={c.id} className="bg-white rounded border border-gray-200 shadow-sm transition-all">
                                        {/* Class Header (Clickable) */}
                                        <div 
                                            className={`flex justify-between items-center p-3 cursor-pointer hover:bg-gray-50 ${isExpanded ? 'border-b border-gray-100 bg-gray-50' : ''}`}
                                            onClick={() => toggleClassExpansion(c.id)}
                                        >
                                            <div className="flex flex-col">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm font-medium text-gray-800">{c.day}</span>
                                                    {isExpanded ? <ChevronUp size={14} className="text-gray-400"/> : <ChevronDown size={14} className="text-gray-400"/>}
                                                </div>
                                                <span className="text-xs text-gray-500">{c.startTime} - {c.endTime}</span>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className="text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full font-bold">
                                                    {count} alunos
                                                </span>
                                                <button 
                                                    onClick={(e) => handleDeleteClass(c.id, e)}
                                                    className={`p-1.5 rounded transition-colors ${count > 0 ? 'text-gray-300 cursor-not-allowed' : 'text-red-500 hover:bg-red-50 hover:text-red-700'}`}
                                                    disabled={count > 0}
                                                    title={count > 0 ? "Não é possível excluir turma com alunos" : "Excluir turma"}
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </div>

                                        {/* Expanded Student List */}
                                        {isExpanded && (
                                            <div className="p-2 bg-white rounded-b">
                                                {classStudents.length > 0 ? (
                                                    <ul className="space-y-1">
                                                        {classStudents.map(s => (
                                                            <li key={s.id} className="text-xs flex items-center justify-between p-1.5 hover:bg-gray-50 rounded">
                                                                <div className="flex items-center gap-2">
                                                                    <User size={12} className="text-gray-400"/>
                                                                    <span className="text-gray-700 font-medium">{s.name}</span>
                                                                </div>
                                                                <span className={`text-[10px] px-1.5 py-0.5 rounded ${STATUS_COLORS[s.status] || 'bg-gray-100 text-gray-500'}`}>
                                                                    {s.status}
                                                                </span>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                ) : (
                                                    <p className="text-xs text-gray-400 text-center py-2 italic">Nenhum aluno nesta turma.</p>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )
                            })}
                            {classes.length === 0 && <p className="text-xs text-gray-400 text-center py-2">Nenhuma turma cadastrada.</p>}
                        </div>
                    </div>

                    <hr className="my-4 border-gray-200"/>

                    {/* CREATE NEW CLASS FORM */}
                    <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center"><PlusCircle size={14} className="mr-1"/> Nova Turma</h3>
                    <form onSubmit={handleCreateClass} className="space-y-4">
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Dia da Semana</label>
                            <select 
                                className="w-full border rounded-md p-2 text-sm focus:ring-indigo-500 focus:border-indigo-500"
                                value={newClassData.day}
                                onChange={(e) => setNewClassData({...newClassData, day: e.target.value})}
                            >
                                <option>Segunda</option>
                                <option>Terça</option>
                                <option>Quarta</option>
                                <option>Quinta</option>
                                <option>Sexta</option>
                                <option>Sábado</option>
                            </select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Início</label>
                                <input 
                                    type="time" 
                                    className="w-full border rounded-md p-2 text-sm focus:ring-indigo-500 focus:border-indigo-500"
                                    value={newClassData.startTime}
                                    onChange={(e) => setNewClassData({...newClassData, startTime: e.target.value})}
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Fim</label>
                                <input 
                                    type="time" 
                                    className="w-full border rounded-md p-2 text-sm focus:ring-indigo-500 focus:border-indigo-500"
                                    value={newClassData.endTime}
                                    onChange={(e) => setNewClassData({...newClassData, endTime: e.target.value})}
                                    required
                                />
                            </div>
                        </div>
                        
                        <div className="pt-2">
                            <button type="submit" className="w-full bg-indigo-600 text-white py-2 rounded-md hover:bg-indigo-700 transition-colors font-medium text-sm">
                                Cadastrar Turma
                            </button>
                        </div>
                    </form>
                </div>
             </div>
          </div>
      )}

      {/* REMOVED HISTORY MODAL */}
      {isHistoryModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl overflow-hidden h-[85vh] flex flex-col animate-in fade-in zoom-in duration-200">
                
                {/* Modal Header */}
                <div className="px-6 py-4 bg-red-50 border-b border-red-100 flex justify-between items-center">
                    <div>
                        <h2 className="text-lg font-bold text-red-800 flex items-center">
                            <Trash2 size={20} className="mr-2"/> 
                            Histórico de Exclusões
                        </h2>
                        <p className="text-xs text-red-600 mt-1">Alunos removidos do sistema.</p>
                    </div>
                    <button onClick={() => setIsHistoryModalOpen(false)} className="text-gray-400 hover:text-gray-600 bg-white rounded-full p-1 shadow-sm"><X size={20}/></button>
                </div>
                
                {/* Search Bar */}
                <div className="p-4 border-b bg-white">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                        <input 
                            type="text" 
                            placeholder="Pesquisar aluno excluído..." 
                            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
                            value={historySearch}
                            onChange={handleHistorySearchChange}
                        />
                    </div>
                </div>

                {/* List Content */}
                <div ref={listContainerRef} className="flex-1 overflow-auto p-6 bg-gray-50">
                    {paginatedHistoryLogs.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-gray-400">
                            <Trash2 size={48} className="mb-4 opacity-20"/>
                            <p>{historySearch ? 'Nenhum resultado encontrado.' : 'Lixeira vazia.'}</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {paginatedHistoryLogs.map((log, idx) => (
                                <div key={idx} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
                                    <div className="absolute top-0 left-0 w-1 h-full bg-red-400"></div>
                                    <div className="flex justify-between items-start mb-2 pl-2">
                                        <div>
                                            <h3 className="font-bold text-gray-800 text-lg">{log.student.name}</h3>
                                            <p className="text-xs text-gray-500">
                                                Turma Anterior: {classes.find(c => c.id === log.student.classId)?.label || 'Não identificada'}
                                            </p>
                                        </div>
                                        {log.date && (
                                            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded flex items-center whitespace-nowrap ml-2">
                                                <AlertCircle size={12} className="mr-1 text-red-500"/>
                                                {new Date(log.date).toLocaleDateString()}
                                            </span>
                                        )}
                                    </div>
                                    <div className="mt-3 pl-2 border-t pt-2 border-gray-100">
                                        <span className="text-xs font-bold text-gray-400 uppercase tracking-wide">Justificativa</span>
                                        <p className="text-sm text-gray-700 mt-1 italic">"{log.reason}"</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Pagination Footer */}
                {filteredHistoryLogs.length > 0 && (
                    <div className="p-4 bg-white border-t flex justify-between items-center">
                        <span className="text-xs text-gray-500">
                            Página {historyPage} de {totalHistoryPages} ({filteredHistoryLogs.length} registros)
                        </span>
                        <div className="flex space-x-2">
                            <button
                                onClick={() => setHistoryPage(p => Math.max(1, p - 1))}
                                disabled={historyPage === 1}
                                className="p-2 border rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <ChevronLeft size={16} />
                            </button>
                            <button
                                onClick={() => setHistoryPage(p => Math.min(totalHistoryPages, p + 1))}
                                disabled={historyPage === totalHistoryPages}
                                className="p-2 border rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <ChevronRight size={16} />
                            </button>
                        </div>
                    </div>
                )}
            </div>
          </div>
      )}
    </div>
  );
};

export default StudentList;