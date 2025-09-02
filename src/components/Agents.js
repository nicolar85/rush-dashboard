import React, { useState, useMemo } from 'react';
import { DataGrid, GridToolbar } from '@mui/x-data-grid';
import { useData } from '../App';
import { formatCurrency, formatNumber } from '../utils/excelParser';
import './Agents.css';

const Agents = () => {
  const { data, selectedFileDate, setSelectedFileDate } = useData();
  const [loading, setLoading] = useState(false);

  const { agents, currentFile } = useMemo(() => {
    if (!selectedFileDate || data.uploadedFiles.length === 0) {
      return { agents: [], currentFile: null };
    }

    const file = data.uploadedFiles.find(f => f.date === selectedFileDate);
    if (!file || !file.data || !file.data.agents) {
      return { agents: [], currentFile: null };
    }

    // Aggiungi un id univoco per ogni riga, necessario per la DataGrid
    const agentsWithId = file.data.agents.map((agent, index) => ({
      id: `${file.date}-${agent.numero}-${index}`,
      ...agent,
    }));

    return { agents: agentsWithId, currentFile: file };
  }, [data.uploadedFiles, selectedFileDate]);

  const handlePeriodChange = (e) => {
    const newFileDate = e.target.value;
    setLoading(true);
    setTimeout(() => {
      setSelectedFileDate(newFileDate);
      setLoading(false);
    }, 500);
  };

  // Definizione delle colonne per la DataGrid
  const columns = [
    { field: 'numero', headerName: 'N.', width: 70, type: 'number' },
    { field: 'nome', headerName: 'Agente', width: 200,
      renderCell: (params) => (
        <div className="agent-cell">
          <div className="agent-name">{params.value}</div>
          <div className="agent-sm">{params.row.sm}</div>
        </div>
      )
    },
    { field: 'sm', headerName: 'SM', width: 150 },
    {
      field: 'fatturatoComplessivo',
      headerName: 'Fatturato',
      width: 130,
      type: 'number',
      valueGetter: (params) => params.row.fatturato?.complessivo || 0,
      renderCell: (params) => (
        <div className="currency-cell">{formatCurrency(params.value)}</div>
      ),
    },
    {
      field: 'inflowTotale',
      headerName: 'Inflow',
      width: 130,
      type: 'number',
      renderCell: (params) => (
        <div className="currency-cell highlight">{formatCurrency(params.value)}</div>
      ),
    },
    {
      field: 'nuoviClienti',
      headerName: 'Nuovi Clienti',
      width: 120,
      type: 'number',
      renderCell: (params) => (
        <div className="number-cell">{formatNumber(params.value)}</div>
      ),
    },
    {
      field: 'fastwebEnergia',
      headerName: 'Fastweb',
      width: 100,
      type: 'number',
      renderCell: (params) => (
        <div className="number-cell">{params.value > 0 ? formatNumber(params.value) : '--'}</div>
      ),
    },
    {
      field: 'calculatedPezziTotali',
      headerName: 'Pezzi Totali',
      width: 120,
      type: 'number',
      valueGetter: (params) => params.row.totaliProdotti?.pezziTotali || 0,
      renderCell: (params) => (
        <div className="number-cell">{formatNumber(params.value)}</div>
      ),
    },
    { field: 'distretto', headerName: 'Distretto', width: 130 },
    { field: 'tipologia', headerName: 'Tipologia', width: 120 },
  ];

  return (
    <div className="agents-container">
      <div className="agents-header">
        <h2>👥 Dettaglio Agenti</h2>
        {data.uploadedFiles.length > 0 && currentFile ? (
          <div className="period-selector">
            <label htmlFor="agent-period-select">Periodo di Riferimento:</label>
            <select
              id="agent-period-select"
              value={currentFile.date}
              onChange={handlePeriodChange}
              disabled={loading}
            >
              {data.uploadedFiles.map(file => (
                <option key={file.id} value={file.date}>
                  {file.displayDate}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <p className="current-period">Nessun periodo disponibile</p>
        )}
      </div>

      <div className={`data-grid-container ${loading ? 'loading' : ''}`}>
        {agents.length > 0 ? (
          <DataGrid
            rows={agents}
            columns={columns}
            pageSize={10}
            rowsPerPageOptions={[10, 25, 50, 100]}
            autoHeight
            components={{
              Toolbar: GridToolbar,
            }}
            componentsProps={{
              toolbar: {
                showQuickFilter: true,
                quickFilterProps: { debounceMs: 500 },
              },
            }}
            initialState={{
              sorting: {
                sortModel: [{ field: 'inflowTotale', sort: 'desc' }],
              },
            }}
            getRowClassName={(params) =>
              `agent-row ${params.row.inflowTotale > 0 ? 'positive-inflow' : ''}`
            }
          />
        ) : (
          <div className="no-data-message">
            <h3>Nessun dato disponibile per il periodo selezionato.</h3>
            <p>Carica un file o seleziona un altro periodo.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Agents;
