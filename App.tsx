import React, { useState } from 'react';
import { AppProvider } from './contexts/AppContext';
import Dashboard from './components/Dashboard';
import StudentList from './components/StudentList';
import AttendanceSheet from './components/AttendanceSheet';
import StudentProfile from './components/StudentProfile';
import PedagogicalView from './components/PedagogicalView';
import { LayoutDashboard, Users, CalendarCheck, BookOpen, NotebookPen } from 'lucide-react';

enum View {
  DASHBOARD,
  STUDENTS,
  ATTENDANCE,
  PEDAGOGICAL
}

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>(View.DASHBOARD);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);

  const renderContent = () => {
    switch (currentView) {
      case View.DASHBOARD:
        return <Dashboard />;
      case View.STUDENTS:
        return <StudentList onSelectStudent={setSelectedStudentId} />;
      case View.ATTENDANCE:
        return <AttendanceSheet />;
      case View.PEDAGOGICAL:
        return <PedagogicalView />;
      default:
        return <Dashboard />;
    }
  };

  const NavItem = ({ view, icon: Icon, label, mobileOnlyLabel = false }: { view: View, icon: any, label: string, mobileOnlyLabel?: boolean }) => {
    const isActive = currentView === view;
    return (
      <button
        onClick={() => setCurrentView(view)}
        className={`
          flex items-center justify-center lg:justify-start 
          p-2 lg:p-3 rounded-lg transition-colors 
          ${isActive ? 'bg-indigo-700 text-white' : 'text-indigo-200 hover:bg-indigo-800'}
          flex-col lg:flex-row w-full lg:w-auto flex-1 lg:flex-none
        `}
      >
        <Icon size={22} className="mb-1 lg:mb-0" />
        <span className={`text-[10px] lg:text-base lg:ml-3 font-medium ${mobileOnlyLabel ? '' : 'hidden lg:block'}`}>
          {label}
        </span>
      </button>
    );
  };

  return (
    <AppProvider>
      <div className="flex flex-col lg:flex-row w-full min-h-screen bg-gray-50 overflow-hidden">
        
        {/* DESKTOP SIDEBAR (Hidden on Mobile) */}
        <aside className="hidden lg:flex w-64 bg-indigo-900 text-white flex-col fixed h-full z-20 shadow-xl transition-all duration-300">
          <div className="p-6 flex items-center border-b border-indigo-800">
            <BookOpen className="w-8 h-8 text-indigo-300" />
            <span className="ml-3 text-xl font-bold">EnglishManager</span>
          </div>
          
          <nav className="flex-1 py-6 space-y-2 px-3">
            <NavItem view={View.DASHBOARD} icon={LayoutDashboard} label="Painel Geral" />
            <NavItem view={View.STUDENTS} icon={Users} label="Alunos" />
            <NavItem view={View.ATTENDANCE} icon={CalendarCheck} label="Frequência" />
            <NavItem view={View.PEDAGOGICAL} icon={NotebookPen} label="Pedagógico" />
          </nav>
          
          <div className="p-4 border-t border-indigo-800">
              <p className="text-xs text-indigo-400">v1.3.2 - Scroll Fix</p>
          </div>
        </aside>

        {/* MOBILE TOP BAR (Visible only on Mobile) */}
        <header className="lg:hidden bg-indigo-900 text-white p-4 flex items-center justify-center sticky top-0 z-30 shadow-md flex-shrink-0">
            <BookOpen className="w-6 h-6 text-indigo-300 mr-2" />
            <span className="text-lg font-bold">EnglishManager</span>
        </header>

        {/* MAIN CONTENT */}
        <main className="flex-1 lg:ml-64 p-3 sm:p-6 lg:p-8 pb-24 lg:pb-8 transition-all duration-300 w-full overflow-x-hidden overflow-y-auto h-screen">
          <div className="max-w-7xl mx-auto w-full pb-20 lg:pb-0">
            {renderContent()}
          </div>
        </main>

        {/* MOBILE BOTTOM NAVIGATION (Visible only on Mobile) */}
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-indigo-900 text-white border-t border-indigo-800 flex justify-around p-2 z-30 pb-safe shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
            <NavItem view={View.DASHBOARD} icon={LayoutDashboard} label="Painel" mobileOnlyLabel />
            <NavItem view={View.STUDENTS} icon={Users} label="Alunos" mobileOnlyLabel />
            <NavItem view={View.ATTENDANCE} icon={CalendarCheck} label="Freq." mobileOnlyLabel />
            <NavItem view={View.PEDAGOGICAL} icon={NotebookPen} label="Pedag." mobileOnlyLabel />
        </nav>

        {/* Modal for Student Profile */}
        {selectedStudentId && (
          <StudentProfile 
            studentId={selectedStudentId} 
            onClose={() => setSelectedStudentId(null)} 
          />
        )}
      </div>
    </AppProvider>
  );
};

export default App;