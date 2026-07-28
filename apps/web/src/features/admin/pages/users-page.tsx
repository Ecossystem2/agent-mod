import { useState } from 'react'
import { toast } from 'sonner'

import type { AdminUser } from '@/features/admin/types'
import type { ReactElement } from 'react'

import { useRoles } from '@/features/admin/api/roles-api'
import { useCreateAdminUser, useDeleteUser, useUsers } from '@/features/admin/api/users-api'
import { UserDeleteDialog } from '@/features/admin/components/users/user-delete-dialog'
import { UserFormDialog } from '@/features/admin/components/users/user-form-dialog'
import { UserList } from '@/features/admin/components/users/user-list'

export function UsersPage(): ReactElement {
  const [showForm, setShowForm] = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null)

  const {
    data: usersData,
    isLoading: isLoadingUsers,
    isError: isUsersError,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
    refetch,
  } = useUsers()
  const { data: rolesData } = useRoles()
  const createUser = useCreateAdminUser()
  const deleteUser = useDeleteUser()

  const users = usersData?.pages.flatMap((p) => p.users) ?? []
  const roles = rolesData?.pages.flatMap((p) => p.roles) ?? []

  function handleCreateClick() {
    setSelectedUser(null)
    setShowForm(true)
  }

  function handleEdit(user: AdminUser) {
    setSelectedUser(user)
    setShowForm(true)
  }

  function handleDelete(user: AdminUser) {
    setSelectedUser(user)
    setShowDelete(true)
  }

  function handleCreateSubmit(values: {
    name: string
    email: string
    password: string
    roleIds?: string[]
  }) {
    createUser.mutate(
      {
        name: values.name,
        email: values.email,
        password: values.password,
        roleIds: values.roleIds,
      },
      {
        onSuccess: () => {
          setShowForm(false)
          toast.success('Usuário criado com sucesso.')
        },
      },
    )
  }

  function handleDeleteConfirm() {
    if (!selectedUser) return
    deleteUser.mutate(selectedUser.id, {
      onSuccess: () => {
        setShowDelete(false)
        setSelectedUser(null)
        toast.success('Usuário excluído com sucesso.')
      },
    })
  }

  return (
    <div className="p-4 md:p-6">
      <UserList
        users={users}
        roles={roles}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onCreateClick={handleCreateClick}
        isLoading={isLoadingUsers}
        isError={isUsersError}
        onRetry={() => void refetch()}
        hasNextPage={hasNextPage}
        isFetchingNextPage={isFetchingNextPage}
        onLoadMore={() => void fetchNextPage()}
      />

      {showForm && (
        selectedUser ? (
          <UserFormDialog
            open={showForm}
            onOpenChange={setShowForm}
            user={selectedUser}
            roles={roles}
            onSubmit={() => {
              // Edit mutations are handled internally by UserFormDialog
            }}
            isPending={false}
          />
        ) : (
          <UserFormDialog
            open={showForm}
            onOpenChange={setShowForm}
            user={null}
            roles={roles}
            onSubmit={handleCreateSubmit}
            isPending={createUser.isPending}
          />
        )
      )}

      <UserDeleteDialog
        open={showDelete}
        onOpenChange={setShowDelete}
        user={selectedUser}
        onConfirm={handleDeleteConfirm}
        isPending={deleteUser.isPending}
      />
    </div>
  )
}
