import { toast } from 'sonner'

import type { AdminUser } from '@/features/admin/types'
import type { ReactElement } from 'react'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useDeactivateUser } from '@/features/admin/api/users-api'

interface UserDeactivateDialogProps {
  user: AdminUser
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function UserDeactivateDialog({
  user,
  open,
  onOpenChange,
}: UserDeactivateDialogProps): ReactElement {
  const deactivate = useDeactivateUser()

  function handleConfirm() {
    deactivate.mutate(user.id, {
      onSuccess: () => {
        onOpenChange(false)
        toast.success('Conta desativada com sucesso.')
      },
    })
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="w-full max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle>Desativar conta</AlertDialogTitle>
          <AlertDialogDescription>
            Tem certeza que deseja desativar a conta de{' '}
            <strong className="text-foreground">{user.name}</strong>? O usuario nao conseguira mais
            fazer login.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="h-11 w-full sm:w-auto" disabled={deactivate.isPending}>
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction
            className="h-11 w-full bg-destructive text-destructive-foreground hover:bg-destructive/90 sm:w-auto"
            onClick={handleConfirm}
            disabled={deactivate.isPending}
          >
            {deactivate.isPending ? 'Desativando...' : 'Desativar'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
