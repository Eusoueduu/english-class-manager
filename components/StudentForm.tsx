import React, { useState, useEffect } from 'react';
import { Student, StudentStatus, ClassSchedule } from '../types';
import { useAppContext } from '../contexts/AppContext';
import { Trash2 } from 'lucide-react';

interface StudentFormProps {
  initialData?: Student;
  onClose: () => void;
}

const StudentForm: React.FC<StudentFormProps> = ({ initialData, onClose }) => {
  const { classes, students, addStudent, updateStudent, removeStudent } = useAppContext();
  
  const [formData, setFormData] = useState<Partial<Student>>({
    name: '',
    phone: '',
    email: '',
    entryDate: new Date().toISOString().split('T')[0],
    classId: classes[0]?.id || '',
    status: StudentStatus.ACTIVE,
    material: { received: false }
  });

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteReason, setDeleteReason] = useState('');

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    }
  }, [initialData]);

  const getClassCount = (classId: string) => {
    return students.filter(s => s.classId === classId && s.status === StudentStatus.ACTIVE).length;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (initialData && initialData.id) {
        updateStudent(initialData.id, formData);
    } else {
        addStudent(formData as Omit<Student, 'id'>);
    }
    onClose();
  };

  const handleDelete = () => {
    if(!initialData?.id || !deleteReason.trim()) return;
    removeStudent(initialData.id, deleteReason);
    onClose();
  };

  const isTransferStatus = formData.status === StudentStatus.TRANSFERRED_CLASS || formData.status === StudentStatus.TRANSFERRED_TIME;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 bg-indigo-600 border-b border-indigo-700 flex justify-between items-center">
            <h2 className="text-lg font-medium text-white">{initialData ? 'Editar Aluno' : 'Novo Aluno'}</h2>
            {initialData && (
                <button 
                    onClick={() => setShowDeleteConfirm(true)}
                    className="text-indigo-200 hover:text-white transition-colors p-1 rounded hover:bg-indigo-700"
                    title="Excluir Aluno"
                >
                    <Trash2 size={20} />
                </button>
            )}
        </div>

        {/* Delete Confirmation View */}
        {showDeleteConfirm ? (
             <div className="p-6 space-y-4">
                <div className="text-center">
                    <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                        <Trash2 className="h-6 w-6 text-red-600" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900">Remover Aluno</h3>
                    <p className="text-sm text-gray-500 mt-2">
                        Você está prestes a remover <strong>{initialData?.name}</strong> do sistema.
                        Esta ação removerá o aluno das listas de presença e estatísticas.
                    </p>
                </div>
                
                <div>
                    <label className="block text-sm font-medium text-gray-700">Motivo da remoção (Obrigatório):</label>
                    <textarea 
                        className="mt-1 w-full border border-gray-300 rounded-md p-2 text-sm focus:ring-red-500 focus:border-red-500"
                        rows={3}
                        placeholder="Ex: Cadastro duplicado, Erro de digitação, etc."
                        value={deleteReason}
                        onChange={(e) => setDeleteReason(e.target.value)}
                    />
                </div>

                <div className="flex justify-end space-x-3 mt-4">
                     <button
                        type="button"
                        onClick={() => setShowDeleteConfirm(false)}
                        className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                        Cancelar
                    </button>
                    <button
                        type="button"
                        disabled={!deleteReason.trim()}
                        onClick={handleDelete}
                        className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Confirmar Exclusão
                    </button>
                </div>
             </div>
        ) : (
        /* Regular Form View */
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Nome Completo</label>
            <input
              type="text"
              required
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 border p-2"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
                <label className="block text-sm font-medium text-gray-700">Telefone</label>
                <input
                type="tel"
                required
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 border p-2"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700">Data de Entrada</label>
                <input
                type="date"
                required
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 border p-2"
                value={formData.entryDate ? formData.entryDate.toString().split('T')[0] : ''}
                onChange={(e) => setFormData({ ...formData, entryDate: e.target.value })}
                />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Email</label>
            <input
              type="email"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 border p-2"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Status</label>
            <select
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 border p-2"
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as StudentStatus })}
            >
              {Object.values(StudentStatus).filter(s => s !== StudentStatus.REMOVED).map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            {isTransferStatus && (
                <p className="text-xs text-orange-600 mt-1">
                   * Ao selecionar "Transferido", certifique-se de escolher a <strong>nova turma</strong> abaixo para atualizar a lista.
                </p>
            )}
          </div>

          <div className={`p-2 rounded-md ${isTransferStatus ? 'bg-orange-50 border border-orange-200' : ''}`}>
            <label className="block text-sm font-medium text-gray-700">
                {isTransferStatus ? 'Nova Turma de Destino' : 'Turma'}
            </label>
            <select
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 border p-2"
              value={formData.classId}
              onChange={(e) => setFormData({ ...formData, classId: e.target.value })}
            >
              {classes.map((c) => {
                const count = getClassCount(c.id);
                return (
                    <option key={c.id} value={c.id}>
                        {c.label} ({count} alunos)
                    </option>
                )
              })}
            </select>
          </div>

          <div className="flex items-center space-x-2 pt-2">
              <input 
                type="checkbox" 
                id="material"
                checked={formData.material?.received || false}
                onChange={(e) => {
                    const received = e.target.checked;
                    setFormData({
                        ...formData,
                        material: {
                            received,
                            receivedDate: received ? new Date().toISOString().split('T')[0] : undefined
                        }
                    })
                }}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              />
              <label htmlFor="material" className="text-sm text-gray-700">Material Entregue</label>
          </div>

          <div className="mt-6 flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none"
            >
              Salvar
            </button>
          </div>
        </form>
        )}
      </div>
    </div>
  );
};

export default StudentForm;
