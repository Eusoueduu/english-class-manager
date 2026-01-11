import React, { useState, useMemo } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { Search, Send, Trash2, User, Calendar, NotebookPen } from 'lucide-react';
import { StudentStatus } from '../types';

const PedagogicalView: React.FC = () => {
    const { students, classes, notes, addNote, deleteNote } = useAppContext();
    const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [newNote, setNewNote] = useState('');

    const filteredStudents = useMemo(() => {
        return students.filter(s => 
            s.status !== StudentStatus.REMOVED && 
            s.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [students, searchTerm]);

    const activeStudent = students.find(s => s.id === selectedStudentId);
    const studentNotes = notes.filter(n => n.studentId === selectedStudentId).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const handleAddNote = (e: React.FormEvent) => {
        e.preventDefault();
        if(!selectedStudentId || !newNote.trim()) return;
        addNote(selectedStudentId, newNote);
        setNewNote('');
    };

    const handleDeleteNote = (noteId: string) => {
        if (window.confirm('Tem certeza que deseja excluir esta anotação permanentemente?')) {
            deleteNote(noteId);
        }
    };

    return (
        <div className="flex flex-col lg:flex-row h-[calc(100vh-140px)] gap-6 animate-in fade-in duration-300">
            {/* Sidebar / List */}
            <div className="w-full lg:w-1/3 bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col overflow-hidden">
                <div className="p-4 border-b bg-gray-50">
                    <h2 className="text-lg font-bold text-gray-800 mb-2 flex items-center">
                        <NotebookPen size={20} className="mr-2 text-indigo-600"/>
                        Alunos
                    </h2>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                        <input 
                            type="text" 
                            placeholder="Buscar aluno..." 
                            className="w-full pl-10 pr-4 py-2 border rounded-md focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                    {filteredStudents.length === 0 && (
                        <div className="text-center p-4 text-gray-400 text-sm">Nenhum aluno encontrado.</div>
                    )}
                    {filteredStudents.map(student => (
                        <button
                            key={student.id}
                            onClick={() => setSelectedStudentId(student.id)}
                            className={`w-full text-left p-3 rounded-lg flex items-center transition-colors ${selectedStudentId === student.id ? 'bg-indigo-50 text-indigo-700 border border-indigo-100' : 'hover:bg-gray-50 text-gray-700'}`}
                        >
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 flex-shrink-0 ${selectedStudentId === student.id ? 'bg-indigo-200' : 'bg-gray-200'}`}>
                                <User size={16} className={selectedStudentId === student.id ? 'text-indigo-700' : 'text-gray-500'}/>
                            </div>
                            <div className="min-w-0">
                                <p className="font-medium text-sm truncate">{student.name}</p>
                                <p className="text-xs text-gray-500 truncate">{classes.find(c => c.id === student.classId)?.label}</p>
                            </div>
                        </button>
                    ))}
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col overflow-hidden">
                {activeStudent ? (
                    <>
                        <div className="p-4 border-b flex justify-between items-center bg-gray-50">
                            <div>
                                <h2 className="text-xl font-bold text-gray-800">{activeStudent.name}</h2>
                                <p className="text-sm text-gray-500">Histórico de anotações pedagógicas</p>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-gray-50/50">
                            {studentNotes.length === 0 ? (
                                <div className="text-center text-gray-400 mt-10">
                                    <NotebookPen size={48} className="mx-auto mb-2 opacity-20"/>
                                    <p>Nenhuma anotação registrada para este aluno.</p>
                                </div>
                            ) : (
                                studentNotes.map(note => (
                                    <div key={note.id} className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 relative group">
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="flex items-center text-xs text-gray-500">
                                                <Calendar size={14} className="mr-1"/>
                                                {new Date(note.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute:'2-digit' })}
                                            </div>
                                            <button 
                                                onClick={() => handleDeleteNote(note.id)}
                                                className="text-gray-400 hover:text-red-600 transition-colors p-1.5 rounded-md hover:bg-red-50"
                                                title="Excluir anotação"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                        <p className="text-gray-800 whitespace-pre-wrap text-sm leading-relaxed">{note.content}</p>
                                    </div>
                                ))
                            )}
                        </div>

                        <div className="p-4 border-t bg-white">
                            <form onSubmit={handleAddNote} className="relative">
                                <textarea
                                    className="w-full border rounded-lg pl-4 pr-12 py-3 focus:ring-indigo-500 focus:border-indigo-500 resize-none text-sm"
                                    rows={3}
                                    placeholder="Escreva uma observação pedagógica..."
                                    value={newNote}
                                    onChange={(e) => setNewNote(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            handleAddNote(e);
                                        }
                                    }}
                                />
                                <button 
                                    type="submit"
                                    disabled={!newNote.trim()}
                                    className="absolute right-3 bottom-3 p-2 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                >
                                    <Send size={18} />
                                </button>
                            </form>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-gray-400 p-6">
                        <User size={48} className="mb-4 opacity-20"/>
                        <p className="text-center">Selecione um aluno ao lado para visualizar ou adicionar anotações pedagógicas.</p>
                    </div>
                )}
            </div>
        </div>
    );
};
export default PedagogicalView;