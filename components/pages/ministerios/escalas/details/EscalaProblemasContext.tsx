import { createContext, useContext } from 'react';
import { ProblemaPublicacao } from '../../../../../domain/utils/escala_bloqueio_utils';

// Pessoas marcadas que travam a publicação (E2E 2.3 rascunho + 2.2b), indexadas por escalaItemId.
// Context evita passar prop por Pager → EventoPage → ListaVoluntariosTable.
const EscalaProblemasContext = createContext<Map<string, ProblemaPublicacao[]>>(new Map());

export const EscalaProblemasProvider = EscalaProblemasContext.Provider;

export function useProblemasPorItem(): Map<string, ProblemaPublicacao[]> {
  return useContext(EscalaProblemasContext);
}
