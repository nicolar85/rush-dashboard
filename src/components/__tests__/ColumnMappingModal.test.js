import React from 'react';
import { render, screen } from '@testing-library/react';
import ColumnMappingModal from '../ColumnMappingModal';

describe('ColumnMappingModal', () => {
  it('gestisce dati inattesi nei pattern delle colonne senza andare in crash', () => {
    const missingColumns = [
      { field: 'Totale Vendite', patterns: 'valore-non-validato' },
      { field: 'Numero Clienti', possibleNames: 'clienti_totali' }
    ];

    render(
      <ColumnMappingModal
        isOpen
        onClose={jest.fn()}
        onConfirm={jest.fn()}
        onProceedWithoutMapping={jest.fn()}
        missingColumns={missingColumns}
        availableColumns={['Totale', 'Clienti']}
      />
    );

    expect(screen.getByText('Colonne Non Trovate (2)')).toBeInTheDocument();
    expect(screen.getByText('Totale Vendite')).toBeInTheDocument();
    expect(screen.getByText('Numero Clienti')).toBeInTheDocument();
    expect(screen.getAllByText(/Nessun pattern disponibile/)).toHaveLength(2);
  });
});
