import React, { useState, useEffect, useCallback } from 'react'
//import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../contexts/AuthContext'
import Modal from '../common/Modal'
import OrganizationSelector from './OrganizationSelector'
import MemberList from './MemberList'
import { Organization, Member } from '../../types'

interface OrganizationManagementProps {
  organizations: Organization[]
  selectedOrg: Organization | null
  onSelectOrg: (id: string | null) => void
  isOrgsLoading: boolean
}

const OrganizationManagement: React.FC<OrganizationManagementProps> = ({ organizations, selectedOrg, onSelectOrg, isOrgsLoading }) => {
  //const { user } = useAuth()
  const [members, setMembers] = useState<Member[]>([])
  const [isMembersLoading, setIsMembersLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showAddMemberModal, setShowAddMemberModal] = useState(false)
  const [newMemberEmail, setNewMemberEmail] = useState('')

  const fetchMembers = useCallback(async () => {
    if (!selectedOrg) return
    setIsMembersLoading(true)
    setError(null)
    try {
      const { data, error: rpcError } = await supabase.rpc('get_organization_members', {
        p_organization_id: selectedOrg.id,
      })

      if (rpcError) throw rpcError
      setMembers(data || [])
    } catch (e: any) {
      setError(e.message)
    } finally {
      setIsMembersLoading(false)
    }
  }, [selectedOrg])

  useEffect(() => {
    if (selectedOrg) {
      fetchMembers()
    } else {
      setMembers([]) // Очистить список участников, если организация не выбрана
    }
  }, [selectedOrg, fetchMembers])

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedOrg || !newMemberEmail.trim()) return
    setError(null)

    try {
      const { error: rpcError } = await supabase.rpc('invite_user_to_organization', {
        p_organization_id: selectedOrg.id,
        p_invitee_email: newMemberEmail.trim(),
      })

      if (rpcError) throw rpcError

      setShowAddMemberModal(false)
      setNewMemberEmail('')
      await fetchMembers()
    } catch (e: any) {
      setError(`Ошибка добавления участника: ${e.message}`)
    }
  }

  const handleRemoveMember = async (member: Member) => {
    if (!window.confirm(`Вы уверены, что хотите удалить ${member.email} из организации?`)) return

    setError(null)
    try {
      const { error } = await supabase
        .from('organization_members')
        .delete()
        .eq('id', member.member_id)

      if (error) throw error
      await fetchMembers()
    } catch (e: any) {
      setError(`Ошибка удаления: ${e.message}`)
    }
  }

  const handleChangeRole = async (member: Member, newRole: 'admin' | 'member') => {
    setError(null)
    try {
      const { error } = await supabase
        .from('organization_members')
        .update({ role: newRole })
        .eq('id', member.member_id)

      if (error) throw error
      await fetchMembers()
    } catch (e: any) {
      setError(`Ошибка изменения роли: ${e.message}`)
    }
  }

  if (isOrgsLoading) {
    return <div className="card p-6">Загрузка данных об организациях...</div>
  }

  return (
    <div className="card p-6 space-y-6">
      <h2 className="text-xl font-bold text-gray-900 dark:text-white">Управление организацией</h2>
      {error && <div className="p-4 bg-red-100 text-red-800 rounded-lg">{error}</div>}

      <OrganizationSelector
        organizations={organizations}
        selectedOrgId={selectedOrg?.id || null}
        onSelectOrg={onSelectOrg}
        loading={isOrgsLoading}
      />

      {selectedOrg && (
        <MemberList members={members} onAddMember={() => setShowAddMemberModal(true)} onRemoveMember={handleRemoveMember} onChangeRole={handleChangeRole} loading={isMembersLoading} />
      )}

      {/* Add Member Modal */}
      {showAddMemberModal && (
        <Modal title="Добавить участника" onClose={() => setShowAddMemberModal(false)}>
          <form onSubmit={handleAddMember}>
            <label htmlFor="member-email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email нового участника</label>
            <input
              id="member-email"
              type="email"
              value={newMemberEmail}
              onChange={(e) => setNewMemberEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="user@example.com"
              required
            />
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={() => setShowAddMemberModal(false)} className="btn-secondary">Отмена</button>
              <button type="submit" className="btn-primary">Добавить</button>
            </div>
          </form>
        </Modal>
      )}

    </div>
  )
}

export default OrganizationManagement
