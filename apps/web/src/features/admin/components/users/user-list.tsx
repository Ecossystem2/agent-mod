import { useState } from 'react'
import { toast } from 'sonner'

import type { AdminUser, Role } from '@/features/admin/types'
import type { ReactElement } from 'react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { useReactivateUser } from '@/features/admin/api/users-api'
import { LoadMore } from '@/features/admin/components/shared/load-more'
import { UserDeactivateDialog } from '@/features/admin/components/users/user-deactivate-dialog'


interface UserListProps {
  users: AdminUser[]
  roles: Role[]
  onEdit: (user: AdminUser) => void
  onDelete: (user: AdminUser) => void
  onCreateClick: () => void
  isLoading?: boolean
  isError?: boolean
  onRetry?: () => void
  hasPermission?: boolean
  hasNextPage?: boolean
  isFetchingNextPage?: boolean
  onLoadMore?: () => void
}

export function UserList({
  users,
  roles,
  onEdit,
  onDelete,
  onCreateClick,
  isLoading = false,
  isError = false,
  onRetry,
  hasPermission = true,
  hasNextPage = false,
  isFetchingNextPage = false,
  onLoadMore,
}: UserListProps): ReactElement {
  const [deactivateTarget, setDeactivateTarget] = useState<AdminUser | null>(null)
  const reactivate = useReactivateUser()

  function getRoleName(roleId: string): string {
    return roles.find((r) => r.id === roleId)?.name ?? roleId
  }

  function handleReactivate(user: AdminUser) {
    reactivate.mutate(user.id, {
      onSuccess: () => toast.success('Conta reativada com sucesso.'),
      onError: () => toast.error('Erro ao reativar a conta.'),
    })
  }

  if (!hasPermission) {
    return (
      <div className="rounded-lg border p-8 text-center text-sm text-muted-foreground">
        Você não tem permissão para visualizar usuários.
      </div>
    )
  }

  return (
    <TooltipProvider>
      <div className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-xl font-semibold md:text-2xl">Usuários</h1>
          <Button onClick={onCreateClick} className="h-11 w-full sm:w-auto">
            Novo Usuário
          </Button>
        </div>

        <div className="overflow-x-auto rounded-lg border">
          <table className="min-w-full divide-y divide-border">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                  Nome
                </th>
                <th className="hidden px-4 py-3 text-left text-sm font-medium text-muted-foreground sm:table-cell">
                  E-mail
                </th>
                <th className="hidden px-4 py-3 text-left text-sm font-medium text-muted-foreground md:table-cell">
                  Cargos
                </th>
                <th className="hidden px-4 py-3 text-left text-sm font-medium text-muted-foreground sm:table-cell">
                  Verificado
                </th>
                <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-background">
              {isLoading && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center">
                    <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
                      Carregando usuários...
                    </div>
                  </td>
                </tr>
              )}

              {!isLoading && isError && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <p className="text-sm text-destructive">Erro ao carregar usuários.</p>
                      {onRetry && (
                        <Button variant="outline" size="sm" className="h-9" onClick={onRetry}>
                          Tentar novamente
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              )}

              {!isLoading && !isError && users.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-sm text-muted-foreground">
                    Nenhum usuário encontrado.
                  </td>
                </tr>
              )}

              {!isLoading &&
                !isError &&
                users.map((user) => (
                  <tr key={user.id} className="transition-colors hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-medium">{user.name}</span>
                        {!user.isActive && (
                          <Badge variant="muted" className="text-xs">
                            Inativo
                          </Badge>
                        )}
                      </div>
                      <div className="mt-0.5 text-xs text-muted-foreground sm:hidden">
                        {user.email}
                      </div>
                    </td>
                    <td className="hidden px-4 py-3 text-sm text-muted-foreground sm:table-cell">
                      {user.email}
                    </td>
                    <td className="hidden px-4 py-3 md:table-cell">
                      {user.roleIds.length === 0 ? (
                        <span className="text-sm text-muted-foreground">Nenhum</span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {user.roleIds.map((rid) => (
                            <span
                              key={rid}
                              className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs"
                            >
                              {getRoleName(rid)}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="hidden px-4 py-3 sm:table-cell">
                      {user.emailVerified ? (
                        <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                          Sim
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                          Nao
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-9 min-w-[44px]"
                          onClick={() => onEdit(user)}
                        >
                          Editar
                        </Button>

                        {user.isActive ? (
                          user.isProtected ? (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="inline-flex">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-9 min-w-[44px]"
                                    disabled
                                  >
                                    Desativar
                                  </Button>
                                </span>
                              </TooltipTrigger>
                              <TooltipContent>
                                Esta conta é protegida e não pode ser desativada
                              </TooltipContent>
                            </Tooltip>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-9 min-w-[44px]"
                              onClick={() => setDeactivateTarget(user)}
                            >
                              Desativar
                            </Button>
                          )
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-9 min-w-[44px]"
                            disabled={reactivate.isPending}
                            onClick={() => handleReactivate(user)}
                          >
                            {reactivate.isPending ? 'Reativando...' : 'Reativar'}
                          </Button>
                        )}

                        {user.isProtected ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="inline-flex">
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  className="h-9 min-w-[44px]"
                                  disabled
                                >
                                  Excluir
                                </Button>
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>
                              Esta conta é protegida e não pode ser excluída
                            </TooltipContent>
                          </Tooltip>
                        ) : (
                          <Button
                            variant="destructive"
                            size="sm"
                            className="h-9 min-w-[44px]"
                            onClick={() => onDelete(user)}
                          >
                            Excluir
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        {!isLoading && !isError && onLoadMore && (
          <LoadMore
            hasNextPage={hasNextPage}
            isFetchingNextPage={isFetchingNextPage}
            onLoadMore={onLoadMore}
          />
        )}

        {deactivateTarget !== null && (
          <UserDeactivateDialog
            user={deactivateTarget}
            open
            onOpenChange={(open) => {
              if (!open) setDeactivateTarget(null)
            }}
          />
        )}
      </div>
    </TooltipProvider>
  )
}
