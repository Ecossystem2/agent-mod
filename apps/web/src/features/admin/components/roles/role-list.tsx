import type { Role } from '@/features/admin/types'
import type { ReactElement } from 'react'

import { Button } from '@/components/ui/button'
import { LoadMore } from '@/features/admin/components/shared/load-more'


interface RoleListProps {
  roles: Role[]
  onEdit: (role: Role) => void
  onDelete: (role: Role) => void
  onCreateClick: () => void
  hasNextPage?: boolean
  isFetchingNextPage?: boolean
  onLoadMore?: () => void
}

export function RoleList({
  roles,
  onEdit,
  onDelete,
  onCreateClick,
  hasNextPage = false,
  isFetchingNextPage = false,
  onLoadMore,
}: RoleListProps): ReactElement {
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-semibold md:text-2xl">Cargos</h1>
        <Button onClick={onCreateClick} className="h-11 w-full sm:w-auto">
          Novo Cargo
        </Button>
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <table className="min-w-full divide-y divide-border">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Nome</th>
              <th className="hidden px-4 py-3 text-left text-sm font-medium text-muted-foreground sm:table-cell">
                Permissões
              </th>
              <th className="hidden px-4 py-3 text-left text-sm font-medium text-muted-foreground md:table-cell">
                Usuários
              </th>
              <th className="hidden px-4 py-3 text-left text-sm font-medium text-muted-foreground sm:table-cell">
                Status
              </th>
              <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border bg-background">
            {roles.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-sm text-muted-foreground">
                  Nenhum cargo encontrado.
                </td>
              </tr>
            )}
            {roles.map((role) => (
              <tr key={role.id} className="transition-colors hover:bg-muted/30">
                <td className="px-4 py-3">
                  <div className="text-sm font-medium">{role.name}</div>
                  {role.description && (
                    <div className="mt-0.5 text-xs text-muted-foreground line-clamp-1">{role.description}</div>
                  )}
                </td>
                <td className="hidden px-4 py-3 sm:table-cell">
                  <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                    {role.permissions.length} permissão{role.permissions.length !== 1 ? 'es' : ''}
                  </span>
                </td>
                <td className="hidden px-4 py-3 text-sm text-muted-foreground md:table-cell">
                  {role.assignedUserCount}
                </td>
                <td className="hidden px-4 py-3 sm:table-cell">
                  {role.isSystem && (
                    <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800">
                      Sistema
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-9 min-w-[44px]"
                      onClick={() => onEdit(role)}
                    >
                      Editar
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      className="h-9 min-w-[44px]"
                      onClick={() => onDelete(role)}
                      disabled={role.isSystem}
                    >
                      Excluir
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {onLoadMore && (
        <LoadMore
          hasNextPage={hasNextPage}
          isFetchingNextPage={isFetchingNextPage}
          onLoadMore={onLoadMore}
        />
      )}
    </div>
  )
}
