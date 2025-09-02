import React from 'react';
import { CheckCircle, AlertTriangle, Info, X } from 'lucide-react';

/**
 * Componente per mostrare lo status del parsing con avvisi dinamici
 */
const ParsingStatus = ({ 
  isVisible, 
  onClose, 
  status = 'success', 
  title, 
  message, 
  warnings = [], 
  metadata = null 
}) => {
  
  if (!isVisible) return null;

  const getStatusIcon = () => {
    switch(status) {
      case 'success':
        return <CheckCircle className="text-green-500" size={24} />;
      case 'warning':
        return <AlertTriangle className="text-orange-500" size={24} />;
      case 'info':
        return <Info className="text-blue-500" size={24} />;
      default:
        return <CheckCircle className="text-green-500" size={24} />;
    }
  };

  const getStatusColor = () => {
    switch(status) {
      case 'success':
        return 'bg-green-50 border-green-200';
      case 'warning':
        return 'bg-orange-50 border-orange-200';
      case 'info':
        return 'bg-blue-50 border-blue-200';
      default:
        return 'bg-green-50 border-green-200';
    }
  };

  return (
    <div className={`border rounded-lg p-4 ${getStatusColor()}`}>
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3 flex-1">
          {getStatusIcon()}
          
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 mb-2">
              {title}
            </h3>
            
            {message && (
              <p className="text-gray-700 text-sm mb-3">
                {message}
              </p>
            )}
            
            {/* Metadata del parsing */}
            {metadata && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3 text-sm">
                <div className="bg-white rounded p-2 border">
                  <span className="font-medium text-gray-600">Agenti:</span>
                  <span className="ml-2 font-semibold text-gray-900">
                    {metadata.totalAgents || 0}
                  </span>
                </div>
                
                <div className="bg-white rounded p-2 border">
                  <span className="font-medium text-gray-600">Coordinatori:</span>
                  <span className="ml-2 font-semibold text-gray-900">
                    {metadata.totalSMs || 0}
                  </span>
                </div>
                
                <div className="bg-white rounded p-2 border">
                  <span className="font-medium text-gray-600">Colonne:</span>
                  <span className="ml-2 font-semibold text-gray-900">
                    {metadata.mappedFields || 0}/{metadata.totalColumns || 0}
                  </span>
                </div>
                
                <div className="bg-white rounded p-2 border">
                  <span className="font-medium text-gray-600">Header:</span>
                  <span className="ml-2 font-semibold text-gray-900">
                    Riga {metadata.headerRow || '?'}
                  </span>
                </div>
              </div>
            )}
            
            {/* Warnings sui campi opzionali */}
            {warnings && warnings.length > 0 && (
              <div className="bg-white border rounded-lg p-3">
                <h4 className="font-medium text-gray-800 mb-2 flex items-center">
                  <AlertTriangle className="text-orange-500 mr-2" size={16} />
                  Campi Opzionali Impostati a Zero ({warnings.length})
                </h4>
                
                <div className="space-y-2">
                  {warnings.map((warning, index) => (
                    <div key={index} className="text-sm">
                      <span className="font-medium text-orange-700">
                        {warning.field}
                      </span>
                      {warning.description && (
                        <span className="text-gray-600 ml-2">
                          - {warning.description}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
                
                <div className="mt-2 text-xs text-gray-500 italic">
                  💡 Questi campi non erano presenti nel file e sono stati impostati a zero. 
                  È normale per prodotti non disponibili in certi periodi.
                </div>
              </div>
            )}
            
            {/* Info aggiuntive */}
            <div className="text-xs text-gray-500 mt-2">
              ℹ️ Parser dinamico: si adatta automaticamente alle variazioni tra file diversi
            </div>
          </div>
        </div>
        
        {/* Pulsante chiudi */}
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors ml-2"
          >
            <X size={18} />
          </button>
        )}
      </div>
    </div>
  );
};

export default ParsingStatus;