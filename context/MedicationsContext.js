import React, { createContext, useContext, useState } from 'react';

const MedicationsContext = createContext(undefined);

export function MedicationsProvider({ children }) {
  const [medications, setMedications] = useState([]);

  function addMedication(medication) {
    setMedications((prev) => [...prev, medication]);
  }

  function updateMedication(id, updates) {
    setMedications((prev) =>
      prev.map((med) => (med.id === id ? { ...med, ...updates } : med))
    );
  }

  function deleteMedication(id) {
    setMedications((prev) => prev.filter((med) => med.id !== id));
  }

  function toggleTaken(id) {
    setMedications((prev) =>
      prev.map((med) =>
        med.id === id ? { ...med, takenToday: !med.takenToday } : med
      )
    );
  }

  return (
    <MedicationsContext.Provider
      value={{
        medications,
        addMedication,
        updateMedication,
        deleteMedication,
        toggleTaken,
      }}
    >
      {children}
    </MedicationsContext.Provider>
  );
}

export function useMedications() {
  const ctx = useContext(MedicationsContext);
  if (ctx === undefined) {
    throw new Error('useMedications must be used within a MedicationsProvider');
  }
  return ctx;
}