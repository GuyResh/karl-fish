import React from 'react';
import Modal from './Modal';

interface SpeciesModalProps {
  isOpen: boolean;
  onClose: () => void;
  speciesData: { [species: string]: number };
}

const SpeciesModal: React.FC<SpeciesModalProps> = ({ isOpen, onClose, speciesData }) => {
  const sortedSpecies = Object.entries(speciesData)
    .sort(([a], [b]) => a.localeCompare(b));

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Species Caught" maxHeight="600px">
      <div className="species-list species-modal-content">
        {sortedSpecies.length === 0 ? (
          <p>No species data available.</p>
        ) : (
          <div className="species-grid">
            {sortedSpecies.map(([species, count]) => (
              <div key={species} className="species-item">
                <span className="species-name">{species}</span>
                <span className="species-count">({count})</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
};

export default SpeciesModal;
