import React from 'react';
import { DollarSign, TrendingUp, TrendingDown, CreditCard } from 'lucide-react';

const FinancialPlaceholder: React.FC = () => {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Financeiro</h1>
        
        {/* Mock Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
                <div>
                    <p className="text-sm text-gray-500 font-medium">Receita Mensal</p>
                    <p className="text-2xl font-bold text-gray-900">R$ 12.450,00</p>
                </div>
                <div className="p-3 bg-green-100 text-green-600 rounded-full">
                    <TrendingUp size={24} />
                </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
                <div>
                    <p className="text-sm text-gray-500 font-medium">Pendências</p>
                    <p className="text-2xl font-bold text-red-600">R$ 850,00</p>
                </div>
                <div className="p-3 bg-red-100 text-red-600 rounded-full">
                    <TrendingDown size={24} />
                </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between sm:col-span-2 lg:col-span-1">
                <div>
                    <p className="text-sm text-gray-500 font-medium">Mensalidades Pagas</p>
                    <p className="text-2xl font-bold text-indigo-600">89%</p>
                </div>
                <div className="p-3 bg-indigo-100 text-indigo-600 rounded-full">
                    <CreditCard size={24} />
                </div>
            </div>
        </div>

        {/* Empty State / Illustration */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 sm:p-12 text-center flex flex-col items-center justify-center h-96">
            <div className="bg-gray-50 p-6 rounded-full mb-6">
                <DollarSign size={48} className="text-gray-400" />
            </div>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">Módulo Financeiro</h2>
            <p className="text-gray-500 max-w-md mx-auto">
                Esta área está em desenvolvimento. Em breve você poderá controlar mensalidades, gerar boletos e visualizar relatórios financeiros completos de cada turma.
            </p>
            <button className="mt-6 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm text-sm font-medium">
                Configurar Métodos de Pagamento
            </button>
        </div>
    </div>
  );
};

export default FinancialPlaceholder;