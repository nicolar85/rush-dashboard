import React, { useState } from 'react';
import { X, AlertTriangle, Check, Loader } from 'lucide-react';

/**
 * Modal per gestire le anomalie nelle colonne e la mappatura manuale
 */
const ColumnMappingModal = ({ 
  isOpen, 
  onClose, 
  missingColumns = [], 
  availableColumns = [], 
  onConfirm,
  onProceedWithoutMapping 
}) => {
  const [manualMapping, setManualMapping] = useState({});
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen) return null;

  const handleManualMapping = (fieldKey, columnLetter) => {
    setManualMapping(prev => ({
      ...prev,
      [fieldKey]: columnLetter
    }));
  };

  const handleConfirmMapping = async () => {
    setIsProcessing(true);
    try {
      await onConfirm(manualMapping);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleProceedWithout = async () => {
    setIsProcessing(true);
    try {
      await onProceedWithoutMapping();
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b bg-orange-50">
          <div className="flex items-center space-x-3">
            <AlertTriangle className="text-orange-500" size={24} />
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                ⚠️ ANOMALIE RILEVATE NEL FILE
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Alcune colonne non sono state trovate automaticamente
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={isProcessing}
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 max-h-96 overflow-y-auto">
          <div className="space-y-4">
            
            {/* Missing Columns List */}
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <h3 className="font-semibold text-orange-800 mb-3">
                Colonne Non Trovate ({missingColumns.length})
              </h3>
              
              <div className="space-y-3">
                {missingColumns.map((column, index) => (
                  <div key={index} className="bg-white rounded p-3 border">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <span className="font-medium text-gray-900">
                          {column.field}
                        </span>
                        <p className="text-sm text-gray-600 mt-1">
                          Cercava: {column.possibleNames.join(', ')}
                        </p>
                      </div>
                      
                      {/* Manual Mapping Dropdown - Per implementazione futura */}
                      <div className="ml-4 min-w-48">
                        <select
                          className="w-full p-2 border rounded text-sm bg-gray-50"
                          value={manualMapping[column.field] || ''}
                          onChange={(e) => handleManualMapping(column.field, e.target.value)}
                          disabled={true} // Temporaneamente disabilitato
                        >
                          <option value="">🚧 Mappatura manuale non ancora implementata</option>
                          {availableColumns.map((col, i) => (
                            <option key={i} value={col}>{col}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Info Box */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-800 mb-2">ℹ️ Cosa significa?</h4>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• Il parser non ha trovato alcune colonne con i nomi attesi</li>
                <li>• I dati per queste colonne saranno impostati a zero</li>
                <li>• Puoi procedere comunque - la maggior parte dei dati sarà corretta</li>
                <li>• La mappatura manuale sarà disponibile in una versione futura</li>
              </ul>
            </div>

            {/* Available Columns Preview */}
            {availableColumns.length > 0 && (
              <div className="bg-gray-50 border rounded-lg p-4">
                <h4 className="font-medium text-gray-800 mb-2">
                  📋 Colonne Disponibili nel File ({availableColumns.length})
                </h4>
                <div className="max-h-32 overflow-y-auto text-sm text-gray-600">
                  <div className="grid grid-cols-3 gap-2">
                    {availableColumns.slice(0, 30).map((col, i) => (
                      <span key={i} className="truncate">
                        {col}
                      </span>
                    ))}
                  </div>
                  {availableColumns.length > 30 && (
                    <p className="mt-2 text-xs italic">
                      ... e altre {availableColumns.length - 30} colonne
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="bg-gray-50 px-6 py-4 border-t flex justify-between items-center">
          <div className="text-sm text-gray-600">
            <span className="font-medium">{missingColumns.length}</span> colonne mancanti su {availableColumns.length} totali
          </div>
          
          <div className="flex space-x-3">
            {/* Pulsante Annulla */}
            <button
              onClick={onClose}
              disabled={isProcessing}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              ❌ Annulla Upload
            </button>

            {/* Pulsante Procedi Comunque */}
            <button
              onClick={handleProceedWithout}
              disabled={isProcessing}
              className="px-6 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors disabled:opacity-50 flex items-center space-x-2"
            >
              {isProcessing ? (
                <>
                  <Loader className="animate-spin" size={16} />
                  <span>Processando...</span>
                </>
              ) : (
                <>
                  <Check size={16} />
                  <span>⚡ Procedi Comunque</span>
                </>
              )}
            </button>

            {/* Pulsante Mappatura Manuale - Per il futuro */}
            <button
              onClick={handleConfirmMapping}
              disabled={true || isProcessing} // Temporaneamente disabilitato
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              title="Mappatura manuale non ancora implementata"
            >
              <span>🔧 Mappa Manualmente</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ColumnMappingModal;