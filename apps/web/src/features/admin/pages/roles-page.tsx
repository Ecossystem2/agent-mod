import { useState } from 'react'
import { toast } from 'sonner'


import { useCreateRole, useDeleteRole, useRoles, useUpdateRole } from '../api/roles-api'
import { RoleDeleteDialog } from '../components/roles/role-delete-dialog'
import { RoleEditorDialog } from '../components/roles/role-editor-dialog'
import { RoleList } from '../components/roles/role-list'

import type { Role } from '@/features/admin/types'
import type { ReactElement } from 'react'

export function RolesPage(): ReactElement {
  const [showEditor, setShowEditor] = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const [selectedRole, setSelectedRole] = useState<Role | null>(null)

  const { data, isLoading, hasNextPage, isFetchingNextPage, fetchNextPage } = useRoles()
  const createRole = useCreateRole()
  const updateRole = useUpdateRole()
  const deleteRole = useDeleteRole()

  const roles = data?.pages.flatMap((p) => p.roles) ?? []

  function handleCreateClick() {
    setSelectedRole(null)
    setShowEditor(true)
  }

  function handleEdit(role: Role) {
    setSelectedRole(role)
    setShowEditor(true)
  }

  function handleDelete(role: Role) {
    setSelectedRole(role)
    setShowDelete(true)
  }

  function handleEditorSubmit(values: { name: string; description?: string | null; permissions?: string[] }) {
    if (selectedRole) {
      updateRole.mutate(
        { id: selectedRole.id, ...values },
        {
          onSuccess: () => {
            setShowEditor(false)
            toast.success('Cargo atualizado com sucesso.')
          },
        },
      )
    } else {
      createRole.mutate(values, {
        onSuccess: () => {
          setShowEditor(false)
          toast.success('Cargo criado com sucesso.')
        },
      })
    }
  }

  function handleDeleteConfirm() {
    /* c8 ignore start */
    if (!selectedRole) return
    /* c8 ignore stop */
    deleteRole.mutate(selectedRole.id, {
      onSuccess: () => {
        setShowDelete(false)
        setSelectedRole(null)
        toast.success('Cargo excluído com sucesso.')
      },
    })
  }

  if (isLoading) {
    return (
      <div className="p-6 text-sm text-muted-foreground">Carregando cargos...</div>
    )
  }

  return (
    <div className="p-4 md:p-6">
      <RoleList
        roles={roles}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onCreateClick={handleCreateClick}
        hasNextPage={hasNextPage}
        isFetchingNextPage={isFetchingNextPage}
        onLoadMore={() => void fetchNextPage()}
      />

      <RoleEditorDialog
        open={showEditor}
        onOpenChange={setShowEditor}
        role={selectedRole}
        onSubmit={handleEditorSubmit}
        isPending={createRole.isPending || updateRole.isPending}
      />

      <RoleDeleteDialog
        open={showDelete}
        onOpenChange={setShowDelete}
        role={selectedRole}
        onConfirm={handleDeleteConfirm}
        isPending={deleteRole.isPending}
      />
    </div>
  )
}
