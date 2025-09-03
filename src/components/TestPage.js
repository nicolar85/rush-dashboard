import React, { useMemo } from 'react';
import { useData } from '../App';
import './TestPage.css';

const TestPage = () => {
  const { data, selectedFileDate } = useData();

  const { agents, agentKeys } = useMemo(() => {
    if (!selectedFileDate || !data.processedData[selectedFileDate]) {
      return { agents: [], agentKeys: [] };
    }

    const allAgents = data.processedData[selectedFileDate].agents;
    const firstTenAgents = allAgents.slice(0, 10);

    if (firstTenAgents.length === 0) {
      return { agents: [], agentKeys: [] };
    }

    // Get all unique keys from the first 10 agents
    const keys = new Set();
    firstTenAgents.forEach(agent => {
      Object.keys(agent).forEach(key => keys.add(key));
    });
    const sortedKeys = Array.from(keys).sort();


    return { agents: firstTenAgents, agentKeys: sortedKeys };
  }, [data, selectedFileDate]);

  if (agents.length === 0) {
    return (
      <div className="test-page-container">
        <h2>Test Page - Dati Agenti</h2>
        <p>Nessun dato disponibile per il file selezionato o nessun file caricato.</p>
        <p>Vai su "Gestione File" per caricare un file.</p>
      </div>
    );
  }

  return (
    <div className="test-page-container">
      <h2>Test Page - Primi 10 Agenti</h2>
      <p>Questa tabella mostra i dati grezzi dei primi 10 agenti importati dal file per il debug della mappatura.</p>
      <div className="table-container">
        <table>
          <thead>
            <tr>
              {agentKeys.map(key => (
                <th key={key}>{key}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {agents.map((agent, index) => (
              <tr key={index}>
                {agentKeys.map(key => (
                  <td key={key}>{typeof agent[key] === 'object' ? JSON.stringify(agent[key]) : agent[key]}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TestPage;
