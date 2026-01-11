import React, { useMemo, useState, useRef } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { StudentStatus, AttendanceType } from '../types';
import { STATUS_COLORS } from '../constants';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, TooltipProps, PieChart, Pie, Cell, LabelList } from 'recharts';
import { Users, UserMinus, AlertTriangle, UserPlus, Calendar, Filter, BookOpen, CheckCircle, XCircle, Download, ArrowRightLeft, Clock, X, User } from 'lucide-react';
import RemindersWidget from './RemindersWidget';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';

// Custom Tooltip Component for better explanation
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const total = payload.reduce((acc: number, entry: any) => acc + (entry.value || 0), 0);
    
    return (
      <div className="bg-white p-3 sm:p-4 border border-gray-200 shadow-xl rounded-lg text-xs sm:text-sm z-50">
        <p className="font-bold text-gray-800 mb-2 border-b pb-1">{data.fullName || label}</p>
        <div className="space-y-1">
            {payload.map((entry: any) => (
                <div key={entry.name} className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-full" style={{ backgroundColor: entry.fill }}></div>
                        <span className="text-gray-600">{entry.name}:</span>
                    </div>
                    <span className="font-semibold text-gray-900">{entry.value}</span>
                </div>
            ))}
        </div>
        <div className="mt-2 pt-2 border-t border-gray-100 flex justify-between font-bold text-indigo-900">
            <span>Total de Eventos:</span>
            <span>{total}</span>
        </div>
      </div>
    );
  }
  return null;
};

const Dashboard: React.FC = () => {
  const { students, attendance, classes, history, getAlerts } = useAppContext();
  const chartRef = useRef<HTMLDivElement>(null);
  
  const [filterType, setFilterType] = useState<'month' | 'week'>('month');
  const [isExporting, setIsExporting] = useState(false);
  const [viewingClassId, setViewingClassId] = useState<string | null>(null);

  const today = new Date();
  
  const getInitialWeekVal = (d: Date) => {
      const dCopy = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
      const dayNum = dCopy.getUTCDay() || 7;
      dCopy.setUTCDate(dCopy.getUTCDate() + 4 - dayNum);
      const yearStart = new Date(Date.UTC(dCopy.getUTCFullYear(), 0, 1));
      const weekNo = Math.ceil((((dCopy.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
      return `${dCopy.getUTCFullYear()}-W${weekNo.toString().padStart(2, '0')}`;
  };
  
  const [selectedMonth, setSelectedMonth] = useState(today.toISOString().slice(0, 7));
  const [selectedWeek, setSelectedWeek] = useState(getInitialWeekVal(today));

  function getWeekRange(weekValue: string) {
      if (!weekValue) return { start: new Date(), end: new Date() };
      const [y, w] = weekValue.split('-W');
      const year = parseInt(y);
      const week = parseInt(w);
      const simple = new Date(year, 0, 1 + (week - 1) * 7);
      const dow = simple.getDay();
      const ISOweekStart = simple;
      if (dow <= 4) ISOweekStart.setDate(simple.getDate() - simple.getDay() + 1);
      else ISOweekStart.setDate(simple.getDate() + 8 - simple.getDay());
      const start = new Date(ISOweekStart);
      start.setHours(0,0,0,0);
      const end = new Date(start);
      end.setDate(end.getDate() + 6);
      end.setHours(23,59,59,999);
      return { start, end };
  }

  // Filter out removed students from general processing
  const visibleStudents = students.filter(s => s.status !== StudentStatus.REMOVED);

  const stats = useMemo(() => {
    const activeCount = visibleStudents.filter(s => 
        s.status === StudentStatus.ACTIVE || 
        s.status === StudentStatus.TRANSFERRED_CLASS || 
        s.status === StudentStatus.TRANSFERRED_TIME
    ).length;

    let newStudentsCount = 0;
    let dropoutsCount = 0;
    let transfersCount = 0;

    let dateRangeStart: Date;
    let dateRangeEnd: Date;

    if (filterType === 'month') {
        const [y, m] = selectedMonth.split('-');
        dateRangeStart = new Date(parseInt(y), parseInt(m) - 1, 1);
        dateRangeEnd = new Date(parseInt(y), parseInt(m), 0, 23, 59, 59);
        
        newStudentsCount = visibleStudents.filter(s => s.entryDate.startsWith(selectedMonth)).length;
    } else {
        const { start, end } = getWeekRange(selectedWeek);
        dateRangeStart = start;
        dateRangeEnd = end;
        
        newStudentsCount = visibleStudents.filter(s => {
            const entry = new Date(s.entryDate);
            entry.setHours(0,0,0,0); 
            return entry >= start && entry <= end;
        }).length;
    }

    // Count Dropouts and Transfers based on History Logs within range
    history.forEach(h => {
        // IMPORTANT: Ignore logs from students who are REMOVED
        const student = students.find(s => s.id === h.studentId);
        if (!student || student.status === StudentStatus.REMOVED) return;

        const hDate = new Date(h.date);
        if (hDate >= dateRangeStart && hDate <= dateRangeEnd) {
            if (h.details.includes(`Para: ${StudentStatus.DROPOUT}`)) {
                dropoutsCount++;
            }
            if (h.action === 'Mudança de Turma') {
                transfersCount++;
            }
        }
    });

    const totalConsidered = activeCount + dropoutsCount;
    const dropoutRate = totalConsidered > 0 ? ((dropoutsCount / totalConsidered) * 100).toFixed(1) : '0';

    return { activeCount, dropoutsCount, newStudentsCount, dropoutRate, transfersCount };
  }, [visibleStudents, history, selectedMonth, selectedWeek, filterType, students]);

  const materialStats = useMemo(() => {
      const activeStudents = visibleStudents.filter(s => 
          s.status === StudentStatus.ACTIVE || 
          s.status === StudentStatus.TRANSFERRED_CLASS || 
          s.status === StudentStatus.TRANSFERRED_TIME
      );
      const delivered = activeStudents.filter(s => s.material.received).length;
      const pending = activeStudents.length - delivered;
      
      return {
          delivered,
          pending,
          total: activeStudents.length,
          data: [
              { name: 'Entregue', value: delivered, color: '#10B981' }, 
              { name: 'Pendente', value: pending, color: '#F59E0B' }
          ]
      };
  }, [visibleStudents]);

  const alerts = getAlerts();

  const chartData = useMemo(() => {
    // 1. Filter Attendance Records based on Date Range
    let filteredAttendance = [];
    let dateRangeStart: Date;
    let dateRangeEnd: Date;

    if (filterType === 'month') {
        filteredAttendance = attendance.filter(a => a.date.startsWith(selectedMonth));
        const [y, m] = selectedMonth.split('-');
        dateRangeStart = new Date(parseInt(y), parseInt(m) - 1, 1);
        dateRangeEnd = new Date(parseInt(y), parseInt(m), 0, 23, 59, 59);
    } else {
        const { start, end } = getWeekRange(selectedWeek);
        dateRangeStart = start;
        dateRangeEnd = end;
        const startStr = start.toISOString().split('T')[0];
        const endStr = end.toISOString().split('T')[0];
        filteredAttendance = attendance.filter(a => a.date >= startStr && a.date <= endStr);
    }
    
    // 2. Count Dropouts & Transfers per Class in range
    const dropoutCountsByClass: Record<string, number> = {};
    const transferCountsByClass: Record<string, number> = {};
    let totalDropoutsInRange = 0;
    let totalTransfersInRange = 0;

    history.forEach(h => {
        // IMPORTANT: Ignore logs from students who are REMOVED
        const student = students.find(s => s.id === h.studentId);
        if (!student || student.status === StudentStatus.REMOVED) return;

        const hDate = new Date(h.date);
        if (hDate >= dateRangeStart && hDate <= dateRangeEnd) {
            const classId = student?.classId;

            if (classId) {
                if (h.details.includes(`Para: ${StudentStatus.DROPOUT}`)) {
                    dropoutCountsByClass[classId] = (dropoutCountsByClass[classId] || 0) + 1;
                    totalDropoutsInRange++;
                }
                if (h.action === 'Mudança de Turma') {
                    transferCountsByClass[classId] = (transferCountsByClass[classId] || 0) + 1;
                    totalTransfersInRange++;
                }
            }
        }
    });

    const validStudentIds = new Set(visibleStudents.map(s => s.id));
    filteredAttendance = filteredAttendance.filter(a => validStudentIds.has(a.studentId));

    const generalStats = {
        name: 'Geral',
        fullName: 'Visão Geral',
        Presenças: 0, Faltas: 0, Justificativas: 0, Reposições: 0, 
        Desistências: totalDropoutsInRange,
        Transferências: totalTransfersInRange
    };

    const classStats = classes.map(cls => {
        const shortName = `${cls.day.slice(0, 3)} ${cls.startTime.split(':')[0]}h`;
        const stats = {
            name: shortName,
            fullName: cls.label,
            Presenças: 0, Faltas: 0, Justificativas: 0, Reposições: 0,
            Desistências: dropoutCountsByClass[cls.id] || 0,
            Transferências: transferCountsByClass[cls.id] || 0
        };
        const classRecords = filteredAttendance.filter(a => a.classId === cls.id);
        classRecords.forEach(record => {
            if (record.type === AttendanceType.PRESENT) { stats.Presenças++; generalStats.Presenças++; }
            if (record.type === AttendanceType.ABSENT) { stats.Faltas++; generalStats.Faltas++; }
            if (record.type === AttendanceType.JUSTIFIED) { stats.Justificativas++; generalStats.Justificativas++; }
            if (record.type === AttendanceType.REPLACEMENT) { stats.Reposições++; generalStats.Reposições++; }
        });
        return stats;
    });
    return [generalStats, ...classStats];
  }, [attendance, classes, selectedMonth, selectedWeek, filterType, visibleStudents, students, history]);

  const classCounts = useMemo(() => {
    return classes.map(cls => {
        const count = visibleStudents.filter(s => 
            s.classId === cls.id && 
            (s.status === StudentStatus.ACTIVE || 
             s.status === StudentStatus.TRANSFERRED_CLASS || 
             s.status === StudentStatus.TRANSFERRED_TIME)
        ).length;
        return { ...cls, count };
    });
  }, [classes, visibleStudents]);

  // Derived data for the modal
  const viewingClassData = useMemo(() => {
      if (!viewingClassId) return null;
      const cls = classes.find(c => c.id === viewingClassId);
      const enrolled = students.filter(s => s.classId === viewingClassId && s.status !== StudentStatus.REMOVED);
      return { cls, enrolled };
  }, [viewingClassId, classes, students]);

  const renderValue = (value: number) => value > 0 ? value : '';

  const handleExportFullPDF = async () => {
    setIsExporting(true);
    try {
        const doc = new jsPDF();
        const dateStr = new Date().toLocaleDateString('pt-BR');
        
        // --- PAGE 1: DASHBOARD ---
        doc.setFontSize(22);
        doc.setTextColor(40, 40, 40);
        doc.text("Relatório Gerencial", 14, 20);
        
        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(`Gerado em: ${dateStr}`, 14, 28);
        doc.text(`Período: ${filterType === 'month' ? selectedMonth : selectedWeek}`, 14, 33);

        // KPI Summary
        doc.setDrawColor(200, 200, 200);
        doc.line(14, 38, 196, 38);
        
        doc.setFontSize(12);
        doc.setTextColor(0);
        doc.text("Resumo de Indicadores", 14, 48);
        
        const kpiY = 58;
        doc.setFontSize(10);
        doc.text(`Alunos Ativos: ${stats.activeCount}`, 14, kpiY);
        doc.text(`Novos Alunos: ${stats.newStudentsCount}`, 70, kpiY);
        doc.text(`Saídas: ${stats.dropoutsCount}`, 120, kpiY);
        doc.text(`Transferências: ${stats.transfersCount}`, 160, kpiY);

        // Chart Capture
        if (chartRef.current) {
            const canvas = await html2canvas(chartRef.current, { scale: 2 });
            const imgData = canvas.toDataURL('image/png');
            const imgWidth = 180;
            const imgHeight = (canvas.height * imgWidth) / canvas.width;
            
            doc.text("Gráfico de Eventos (Frequência e Movimentações)", 14, 75);
            doc.addImage(imgData, 'PNG', 14, 80, imgWidth, imgHeight);
            
            // Add Material Stats text below chart
            const materialY = 80 + imgHeight + 15;
            doc.text("Status de Material Didático", 14, materialY);
            doc.setFontSize(9);
            doc.setTextColor(80);
            doc.text(`Entregue: ${materialStats.delivered} | Pendente: ${materialStats.pending} | Total: ${materialStats.total}`, 14, materialY + 6);
        }

        // --- PAGE 2 (or bottom): STUDENT LIST ---
        doc.addPage();
        
        doc.setFontSize(14);
        doc.setTextColor(0);
        doc.text("Lista de Alunos Detalhada", 14, 20);

        const tableBody = visibleStudents.map(s => [
            s.name,
            classes.find(c => c.id === s.classId)?.label || '-',
            s.status,
            s.material.received ? 'Sim' : 'Não',
            new Date(s.entryDate).toLocaleDateString('pt-BR')
        ]);

        autoTable(doc, {
            startY: 25,
            head: [['Nome', 'Turma', 'Status', 'Material', 'Entrada']],
            body: tableBody,
            theme: 'grid',
            headStyles: { fillColor: [67, 56, 202] },
            styles: { fontSize: 8 }
        });

        doc.save(`Relatorio_Completo_${dateStr.replace(/\//g, '-')}.pdf`);

    } catch (error) {
        console.error("Erro ao gerar PDF:", error);
        alert("Erro ao gerar PDF. Tente novamente.");
    } finally {
        setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Filters */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Painel Geral</h1>
        
        <div className="flex flex-col w-full lg:w-auto gap-3">
            <button 
                onClick={handleExportFullPDF}
                disabled={isExporting}
                className="w-full lg:w-auto flex items-center justify-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm text-sm font-medium disabled:opacity-70 disabled:cursor-not-allowed whitespace-nowrap"
            >
                {isExporting ? 'Gerando...' : <><Download size={18} className="mr-2"/> Exportar Relatório Geral</>}
            </button>

            <div className="flex flex-col sm:flex-row gap-2 bg-white p-2 rounded-lg border border-gray-200 shadow-sm w-full lg:w-auto">
                <div className="flex bg-gray-100 rounded-md p-1 w-full sm:w-auto">
                    <button onClick={() => setFilterType('month')} className={`flex-1 sm:flex-none px-4 py-1.5 text-sm font-medium rounded-md transition-all ${filterType === 'month' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}>Mês</button>
                    <button onClick={() => setFilterType('week')} className={`flex-1 sm:flex-none px-4 py-1.5 text-sm font-medium rounded-md transition-all ${filterType === 'week' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}>Semana</button>
                </div>
                <div className="flex items-center space-x-2 border-t sm:border-t-0 sm:border-l pt-2 sm:pt-0 pl-0 sm:pl-3 border-gray-200 w-full sm:w-auto mt-1 sm:mt-0">
                    <Calendar size={18} className="text-gray-500 ml-1"/>
                    {filterType === 'month' ? (
                        <input type="month" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="w-full border-none focus:ring-0 text-gray-800 font-semibold bg-transparent cursor-pointer text-sm"/>
                    ) : (
                        <input type="week" value={selectedWeek} onChange={(e) => setSelectedWeek(e.target.value)} className="w-full border-none focus:ring-0 text-gray-800 font-semibold bg-transparent cursor-pointer text-sm"/>
                    )}
                </div>
            </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 sm:p-6 rounded-xl shadow-sm border border-gray-100 flex items-center">
          <div className="p-3 bg-blue-100 rounded-full mr-4 flex-shrink-0"><Users className="text-blue-600 w-6 h-6" /></div>
          <div><p className="text-sm text-gray-500">Ativos</p><p className="text-2xl font-bold text-gray-800">{stats.activeCount}</p></div>
        </div>
        <div className="bg-white p-5 sm:p-6 rounded-xl shadow-sm border border-gray-100 flex items-center">
          <div className="p-3 bg-red-100 rounded-full mr-4 flex-shrink-0"><UserMinus className="text-red-600 w-6 h-6" /></div>
          <div><p className="text-sm text-gray-500">Saídas</p><p className="text-2xl font-bold text-gray-800">{stats.dropoutsCount}</p><p className="text-xs text-red-400">Taxa {stats.dropoutRate}%</p></div>
        </div>
         <div className="bg-white p-5 sm:p-6 rounded-xl shadow-sm border border-gray-100 flex items-center">
          <div className="p-3 bg-indigo-100 rounded-full mr-4 flex-shrink-0"><ArrowRightLeft className="text-indigo-600 w-6 h-6" /></div>
          <div><p className="text-sm text-gray-500">Transferências</p><p className="text-2xl font-bold text-gray-800">{stats.transfersCount}</p></div>
        </div>
         <div className="bg-white p-5 sm:p-6 rounded-xl shadow-sm border border-gray-100 flex items-center">
          <div className="p-3 bg-orange-100 rounded-full mr-4 flex-shrink-0"><AlertTriangle className="text-orange-600 w-6 h-6" /></div>
          <div><p className="text-sm text-gray-500">Alertas</p><p className="text-2xl font-bold text-gray-800">{alerts.length}</p></div>
        </div>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="bg-orange-50 border-l-4 border-orange-500 p-4 rounded-md">
          <div className="flex">
            <div className="flex-shrink-0"><AlertTriangle className="h-5 w-5 text-orange-500" /></div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-orange-800">Atenção Necessária</h3>
              <ul className="list-disc pl-5 mt-1 text-sm text-orange-700 space-y-1">
                {alerts.map((alert, idx) => {
                    const student = visibleStudents.find(s => s.id === alert.studentId);
                    if (!student) return null;
                    return <li key={idx}>{student.name} - <span className="font-semibold">{alert.message}</span></li>
                })}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* Attendance Chart - Takes 2 columns on large screens, Min-w-0 prevents overflow on mobile */}
        <div className="xl:col-span-2 space-y-6 min-w-0">
            <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="mb-4">
                    <h2 className="text-lg font-semibold text-gray-800">Frequência e Eventos</h2>
                    <p className="text-sm text-gray-500">Geral vs Turmas ({filterType === 'month' ? selectedMonth : selectedWeek})</p>
                </div>
                
                {/* Wrapped for scroll on mobile */}
                <div className="overflow-x-auto w-full pb-2">
                    <div ref={chartRef} className="h-64 sm:h-80 md:h-96 bg-white p-2" style={{ minWidth: chartData.length > 3 ? '600px' : '100%' }}>
                        {chartData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={chartData} margin={{ top: 25, right: 10, left: 0, bottom: 5 }} barSize={12} barGap={4}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 10, fontWeight: 500 }} dy={10} interval={0} />
                                    <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: '#9CA3AF', fontSize: 10 }} />
                                    <Tooltip cursor={{ fill: '#F9FAFB' }} content={<CustomTooltip />} />
                                    <Legend wrapperStyle={{ paddingTop: '20px', fontSize: '12px' }} iconType="circle" />
                                    {/* COLORS UPDATED HERE */}
                                    <Bar dataKey="Presenças" fill="#22C55E" radius={[2, 2, 0, 0]}><LabelList dataKey="Presenças" position="top" fill="#22C55E" fontSize={9} formatter={renderValue} /></Bar>
                                    <Bar dataKey="Faltas" fill="#8B5CF6" radius={[2, 2, 0, 0]}><LabelList dataKey="Faltas" position="top" fill="#8B5CF6" fontSize={9} formatter={renderValue} /></Bar>
                                    <Bar dataKey="Justificativas" fill="#F97316" radius={[2, 2, 0, 0]}><LabelList dataKey="Justificativas" position="top" fill="#F97316" fontSize={9} formatter={renderValue} /></Bar>
                                    <Bar dataKey="Reposições" fill="#EAB308" radius={[2, 2, 0, 0]}><LabelList dataKey="Reposições" position="top" fill="#EAB308" fontSize={9} formatter={renderValue} /></Bar>
                                    <Bar dataKey="Desistências" fill="#EF4444" radius={[2, 2, 0, 0]}><LabelList dataKey="Desistências" position="top" fill="#EF4444" fontSize={9} formatter={renderValue} /></Bar>
                                    <Bar dataKey="Transferências" fill="#795548" radius={[2, 2, 0, 0]}><LabelList dataKey="Transferências" position="top" fill="#795548" fontSize={9} formatter={renderValue} /></Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-gray-400 bg-gray-50 rounded-lg border-2 border-dashed"><Calendar className="w-10 h-10 mb-2 opacity-50"/><p>Sem dados.</p></div>
                        )}
                    </div>
                </div>
            </div>

             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {classCounts.map(cls => (
                    <div 
                        key={cls.id} 
                        onClick={() => setViewingClassId(cls.id)}
                        className="bg-white border border-gray-200 rounded-lg p-3 sm:p-4 flex justify-between items-center hover:shadow-md transition-all cursor-pointer hover:border-indigo-300 group overflow-hidden"
                    >
                        <div className="min-w-0">
                            <h3 className="font-medium text-gray-900 text-sm group-hover:text-indigo-600 transition-colors truncate">{cls.day}</h3>
                            <div className="flex items-center text-xs text-gray-500 mt-1 truncate">
                                <Clock size={12} className="mr-1 flex-shrink-0"/>
                                <span className="truncate">{cls.startTime}-{cls.endTime}</span>
                            </div>
                        </div>
                        <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800 group-hover:bg-indigo-200 transition-colors flex-shrink-0">
                            {cls.count} Alunos
                        </span>
                    </div>
                ))}
            </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6 min-w-0">
            <RemindersWidget />

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col">
                <div className="mb-4">
                    <h2 className="text-lg font-semibold text-gray-800 flex items-center"><BookOpen size={20} className="mr-2 text-indigo-600"/> Material Didático</h2>
                </div>
                <div className="flex-1 flex flex-col justify-center items-center relative min-h-[200px]">
                    {materialStats.total > 0 ? (
                        <div className="h-48 w-full relative">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={materialStats.data} cx="50%" cy="50%" innerRadius={50} outerRadius={70} paddingAngle={5} dataKey="value">
                                        {materialStats.data.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.color} />))}
                                    </Pie>
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none"><span className="text-2xl font-bold text-gray-800">{Math.round((materialStats.delivered / materialStats.total) * 100)}%</span></div>
                        </div>
                    ) : (
                        <div className="h-48 flex items-center justify-center text-gray-400">Sem alunos.</div>
                    )}
                    <div className="w-full mt-4 space-y-3">
                        <div className="flex justify-between items-center p-2 rounded bg-gray-50 border border-gray-100"><div className="flex items-center"><CheckCircle size={16} className="text-emerald-500 mr-2"/><span className="text-sm font-medium text-gray-700">Entregue</span></div><span className="font-bold text-gray-900">{materialStats.delivered}</span></div>
                        <div className="flex justify-between items-center p-2 rounded bg-gray-50 border border-gray-100"><div className="flex items-center"><XCircle size={16} className="text-amber-500 mr-2"/><span className="text-sm font-medium text-gray-700">Pendente</span></div><span className="font-bold text-gray-900">{materialStats.pending}</span></div>
                    </div>
                </div>
            </div>
        </div>
      </div>

      {/* CLASS DETAILS MODAL */}
      {viewingClassData && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
             <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col max-h-[80vh]">
                <div className="px-6 py-4 bg-indigo-600 border-b border-indigo-700 flex justify-between items-center">
                    <div>
                        <h2 className="text-lg font-bold text-white flex items-center">
                            {viewingClassData.cls?.day}
                        </h2>
                        <p className="text-indigo-200 text-xs flex items-center mt-1">
                            <Clock size={12} className="mr-1"/>
                            {viewingClassData.cls?.startTime} - {viewingClassData.cls?.endTime}
                        </p>
                    </div>
                    <button onClick={() => setViewingClassId(null)} className="text-indigo-200 hover:text-white bg-indigo-700 hover:bg-indigo-800 rounded-full p-1"><X size={20}/></button>
                </div>
                
                <div className="p-0 overflow-y-auto flex-1">
                    {viewingClassData.enrolled.length > 0 ? (
                        <div className="divide-y divide-gray-100">
                            {viewingClassData.enrolled.map((student, idx) => (
                                <div key={student.id} className="p-4 hover:bg-gray-50 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="bg-gray-100 rounded-full p-2 text-gray-500">
                                            <User size={16} />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-gray-800">{student.name}</p>
                                            <p className="text-xs text-gray-500 truncate max-w-[150px]">{student.email}</p>
                                        </div>
                                    </div>
                                    <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${STATUS_COLORS[student.status]}`}>
                                        {student.status}
                                    </span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-10 text-gray-400">
                            <User size={48} className="mb-2 opacity-20"/>
                            <p className="text-sm">Nenhum aluno matriculado nesta turma.</p>
                        </div>
                    )}
                </div>
                <div className="bg-gray-50 px-6 py-3 border-t border-gray-100 text-right">
                    <span className="text-xs text-gray-500 font-medium">Total: {viewingClassData.enrolled.length} alunos</span>
                </div>
             </div>
          </div>
      )}
    </div>
  );
};

export default Dashboard;