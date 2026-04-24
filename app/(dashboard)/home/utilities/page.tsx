// Member route: /home/utilities
// Re-exports the shared UtilitiesPage component.
// The page reads useAuthStore.effectiveRole() internally to hide admin-only actions.
export { default } from "@/app/(dashboard)/utilities/page";
