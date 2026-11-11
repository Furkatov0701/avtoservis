import { createContext, useContext } from 'react';

export const CabinetContext = createContext(null);
export const useCabinet = () => useContext(CabinetContext);
