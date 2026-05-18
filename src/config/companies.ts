export interface CompanyConfig {
  id: string;
  name: string;
  gid: string;
}

export const COMPANIES: CompanyConfig[] = [
  { id: 'alphalab', name: 'Grupo Alphalab', gid: '0' },
  // Para agregar nuevas sociedades, simplemente descomenta la línea de abajo
  // o agrega nuevas entradas con el formato:
  // { id: 'empresa_ejemplo', name: 'Nueva Compañía SA de CV', gid: '123456789' }
];
