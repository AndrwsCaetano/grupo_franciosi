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
  { code: "superset.read", name: "Visualizar dashboards do Superset" },
  { code: "superset.write", name: "Cadastrar/editar dashboards do Superset" },
  { code: "superset.assign", name: "Liberar dashboards do Superset a usuários" },
  { code: "vehicles.read", name: "Listar veículos" },
  { code: "vehicles.write", name: "Criar/editar/excluir veículos" },
  { code: "drivers.read", name: "Listar motoristas" },
  { code: "drivers.write", name: "Criar/editar/excluir motoristas" },
  { code: "drivers.assign_vehicle", name: "Vincular motorista a veículo" },
  { code: "fuelings.read", name: "Listar abastecimentos de veículo" },
  { code: "fuelings.write", name: "Lançar/editar/excluir abastecimentos" },
  { code: "reports.read", name: "Acessar módulo de Relatórios" },
  { code: "reports.export", name: "Exportar relatórios em HTML" },
  // Permissão por relatório (uma por relatório do registro). Ao adicionar um
  // novo relatório em apps/api/src/reports/reports.registry.ts, acrescente aqui
  // a linha "reports.<slug>" correspondente para que ele apareça nas
  // liberações de acesso e na montagem de perfil.
  { code: "reports.producao-milho", name: "Relatório: Produção de Milho em Grãos" },
  { code: "reports.saldo-soja", name: "Relatório: Saldo de Soja em Grãos" },
  { code: "reports.estoque-insumos", name: "Relatório: Estoque de Insumos" },
  { code: "reports.implantacao-erp", name: "Relatório: Implantação ERP COMPASS" },
] as const;

export type PermissionCode = (typeof DEFAULT_PERMISSIONS)[number]["code"];
