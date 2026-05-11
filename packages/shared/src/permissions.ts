/** Opções do sistema (códigos estáveis). Fonte única para API, seed e futuros clientes. */
export const DEFAULT_PERMISSIONS = [
  { code: "users.read", name: "Listar usuários" },
  { code: "users.write", name: "Criar/editar usuários" },
  { code: "profiles.read", name: "Listar perfis" },
  { code: "profiles.write", name: "Criar/editar perfis" },
  { code: "permissions.assign", name: "Atribuir opções a perfis/usuários" },
  { code: "datasources.read", name: "Listar fontes de dados" },
  { code: "datasources.write", name: "Gerir fontes de dados" },
  { code: "dashboards.read", name: "Listar dashboards" },
  { code: "dashboards.write", name: "Criar/editar dashboards" },
  { code: "dashboards.assign", name: "Liberar dashboards a usuários" },
  { code: "vehicles.read", name: "Listar veículos" },
  { code: "vehicles.write", name: "Criar/editar/excluir veículos" },
  { code: "drivers.read", name: "Listar motoristas" },
  { code: "drivers.write", name: "Criar/editar/excluir motoristas" },
  { code: "drivers.assign_vehicle", name: "Vincular motorista a veículo" },
  { code: "fuelings.read", name: "Listar abastecimentos de veículo" },
  { code: "fuelings.write", name: "Lançar/editar/excluir abastecimentos" },
] as const;

export type PermissionCode = (typeof DEFAULT_PERMISSIONS)[number]["code"];
