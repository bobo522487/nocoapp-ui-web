export function migrateWorkspaceState(persisted: unknown, version: number): unknown {
  const state = (persisted ?? {}) as Record<string, unknown>;
  if (version < 2) {
    return { ...state, projects: [], activeProjectId: '' };
  }
  return state;
}