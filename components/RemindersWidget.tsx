import React, { useState } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { Trash2, Plus, MessageSquare, Megaphone, Users } from 'lucide-react';

const RemindersWidget: React.FC = () => {
  const { reminders, classes, addReminder, removeReminder } = useAppContext();
  const [newText, setNewText] = useState('');
  const [targetType, setTargetType] = useState<'GENERAL' | 'CLASS'>('GENERAL');
  const [selectedClassId, setSelectedClassId] = useState(classes[0]?.id || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newText.trim()) return;

    addReminder({
      text: newText,
      targetType,
      targetClassId: targetType === 'CLASS' ? selectedClassId : undefined
    });

    setNewText('');
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-800 flex items-center">
          <MessageSquare className="mr-2 text-indigo-600" size={20} />
          Quadro de Avisos
        </h2>
        <span className="bg-indigo-50 text-indigo-700 text-xs px-2 py-1 rounded-full font-medium">
            {reminders.length} ativos
        </span>
      </div>

      {/* Input Form */}
      <form onSubmit={handleSubmit} className="mb-4 bg-gray-50 p-3 rounded-lg border border-gray-200">
        <textarea
          className="w-full text-sm border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 resize-none mb-2 bg-white"
          rows={2}
          placeholder="Digite um novo lembrete..."
          value={newText}
          onChange={(e) => setNewText(e.target.value)}
        />
        
        {/* Layout corrigido para evitar vazamento horizontal */}
        <div className="flex flex-col gap-2">
            <div className="flex gap-2 w-full">
                <select
                    className={`text-xs border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 bg-white py-1.5 min-w-0 ${targetType === 'CLASS' ? 'flex-1' : 'w-full'}`}
                    value={targetType}
                    onChange={(e) => setTargetType(e.target.value as 'GENERAL' | 'CLASS')}
                >
                    <option value="GENERAL">Geral</option>
                    <option value="CLASS">Turma Específica</option>
                </select>

                {targetType === 'CLASS' && (
                    <select
                        className="text-xs border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 bg-white py-1.5 flex-[2] min-w-0"
                        value={selectedClassId}
                        onChange={(e) => setSelectedClassId(e.target.value)}
                    >
                        {classes.map(c => (
                            <option key={c.id} value={c.id}>{c.label}</option>
                        ))}
                    </select>
                )}
            </div>

            <button
                type="submit"
                className="bg-indigo-600 text-white rounded-md px-3 py-1.5 text-xs font-medium hover:bg-indigo-700 transition-colors flex items-center justify-center w-full"
            >
                <Plus size={14} className="mr-1"/> Adicionar
            </button>
        </div>
      </form>

      {/* List */}
      <div className="flex-1 overflow-y-auto space-y-3 max-h-[300px] pr-1">
        {reminders.length === 0 && (
            <div className="text-center text-gray-400 py-6 text-sm">
                Nenhum lembrete pendente.
            </div>
        )}
        {reminders.map(reminder => {
            const isGeneral = reminder.targetType === 'GENERAL';
            const className = !isGeneral 
                ? classes.find(c => c.id === reminder.targetClassId)?.label 
                : '';

            return (
                <div key={reminder.id} className={`p-3 rounded-lg border flex justify-between group transition-all ${isGeneral ? 'bg-yellow-50 border-yellow-100' : 'bg-blue-50 border-blue-100'}`}>
                    <div className="flex-1 mr-2 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                            {isGeneral ? (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-yellow-200 text-yellow-800 uppercase tracking-wide flex-shrink-0">
                                    <Megaphone size={10} className="mr-1"/> Geral
                                </span>
                            ) : (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-200 text-blue-800 uppercase tracking-wide flex-shrink-0 truncate max-w-full">
                                    <Users size={10} className="mr-1"/> {className}
                                </span>
                            )}
                            <span className="text-[10px] text-gray-400 whitespace-nowrap">
                                {new Date(reminder.createdAt).toLocaleDateString()}
                            </span>
                        </div>
                        <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed font-medium break-words">
                            {reminder.text}
                        </p>
                    </div>
                    <button 
                        onClick={() => removeReminder(reminder.id)}
                        className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity self-start flex-shrink-0"
                        title="Remover lembrete"
                    >
                        <Trash2 size={16} />
                    </button>
                </div>
            );
        })}
      </div>
    </div>
  );
};

export default RemindersWidget;