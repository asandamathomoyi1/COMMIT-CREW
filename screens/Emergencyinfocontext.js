import React, { createContext, useContext, useState } from 'react';

const EmergencyInfoContext = createContext(undefined);

// Placeholder starting values so the Emergency screen has something sensible
// to show before the user has edited anything from Profile.
const DEFAULT_EMERGENCY_INFO = {
  name: 'Alex Botha',
  dob: '2003-03-14',
  bloodType: 'O+',
  conditions: ['Type 2 Diabetes', 'Asthma'],
  allergies: ['Penicillin', 'Ibuprofen'],
  contactName: 'Mom',
  contactPhone: '+27 82 555 0145',
};

export function EmergencyInfoProvider({ children }) {
  const [emergencyInfo, setEmergencyInfo] = useState(DEFAULT_EMERGENCY_INFO);

  function updateEmergencyInfo(updates) {
    setEmergencyInfo((prev) => ({ ...prev, ...updates }));
  }

  return (
    <EmergencyInfoContext.Provider value={{ emergencyInfo, updateEmergencyInfo }}>
      {children}
    </EmergencyInfoContext.Provider>
  );
}

export function useEmergencyInfo() {
  const ctx = useContext(EmergencyInfoContext);
  if (!ctx) {
    throw new Error('useEmergencyInfo must be used within an EmergencyInfoProvider');
  }
  return ctx;
}