import React, { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../contexts/AuthContext'
import { Plus, Trash2, Shield, ShieldOff, Building } from 'lucide-react'
import Modal from '../common/Modal' // Предполагаемый путь к новому компоненту

interface Organization {
  id: string
  name: string
}

interface Member {
  member_id: string
  user_id: string
  role: 'admin' | 'member'
  email: string
}

const OrganizationManagement: React.FC = () => {
  const { user } = useAuth()
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showAddMemberModal, setShowAddMemberModal] = useState(false)
  const [newMemberEmail, setNewMemberEmail] = useState('')
  const [showCreateOrgModal, setShowCreateOrgModal] = useState(false)
  const [newOrgName, setNewOrgName] = useState('')

  const fetchOrganizations = useCallback(async () => {
    if (!user) return
    setLoading(true)
    setError(null)
    try {
      const { data: orgMembers, error: memberError } = await supabase
        .from('organization_members')
        .select('organization_id')
        .eq('user_id', user.id)

      if (memberError) throw memberError

      if (orgMembers && orgMembers.length > 0) {
        const orgIds = orgMembers.map(m => m.organization_id)
        const { data: orgsData, error: orgsError } = await supabase
          .from('organizations')
          .select('id, name')
          .in('id', orgIds)

        if (orgsError) throw orgsError

        setOrganizations(orgsData || [])
        if (orgsData && orgsData.length > 0 && !selectedOrg) {
          setSelectedOrg(orgsData[0])
        }
      }
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [user, selectedOrg])

  const fetchMembers = useCallback(async () => {
    if (!selectedOrg) return
    setLoading(true)
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
      setLoading(false)
    }
  }, [selectedOrg])

  useEffect(() => {
    fetchOrganizations()
  }, [fetchOrganizations])

  useEffect(() => {
    if (selectedOrg) {
      fetchMembers()
    }
  }, [selectedOrg, fetchMembers])

  const handleCreateOrganization = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !newOrgName.trim()) return;
    setError(null);

    try {
      const { data: newOrgId, error } = await supabase.rpc('create_organization_and_add_creator', {
        p_org_name: newOrgName.trim(),
      });

      if (error) throw error;

      const newOrg = { id: newOrgId, name: newOrgName.trim() };

      // Обновляем состояние без дополнительного запроса к БД
      setShowCreateOrgModal(false)
      setNewOrgName('')
      setOrganizations(prevOrgs => [...prevOrgs, newOrg]);
      setSelectedOrg(newOrg);
    } catch (e: any) {
      setError(`Ошибка создания организации: ${e.message}`)
    }
  }

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedOrg || !newMemberEmail.trim()) return

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

  const currentUserMemberInfo = members.find(m => m.user_id === user?.id)
  const isCurrentUserAdmin = currentUserMemberInfo?.role === 'admin'
  const adminCount = members.filter(m => m.role === 'admin').length

  if (loading && !selectedOrg) {
    return <div className="card p-6">Загрузка данных об организациях...</div>
  }

  return (
    <div className="card p-6 space-y-6">
      <h2 className="text-xl font-bold text-gray-900 dark:text-white">Управление организацией</h2>

      {error && <div className="p-4 bg-red-100 text-red-800 rounded-lg">{error}</div>}

      <div className="flex flex-wrap items-center gap-4">
        <div className="flex-grow">
          <label htmlFor="org-select" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Выберите организацию
          </label>
          <select
            id="org-select"
            value={selectedOrg?.id || ''}
            onChange={(e) => setSelectedOrg(organizations.find(o => o.id === e.target.value) || null)}
            className="w-full max-w-xs px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            {organizations.map(org => (
              <option key={org.id} value={org.id}>{org.name}</option>
            ))}
          </select>
        </div>
        <button onClick={() => setShowCreateOrgModal(true)} className="btn-secondary flex items-center gap-2">
          <Building className="w-4 h-4" />
          Создать организацию
        </button>
      </div>

      {selectedOrg && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
              Участники ({members.length})
            </h3>
            {isCurrentUserAdmin && (
              <button onClick={() => setShowAddMemberModal(true)} className="btn-primary flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Добавить участника
              </button>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-dark-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Роль</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Действия</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-dark-800 divide-y divide-gray-200 dark:divide-gray-700">
                {members.map(member => {
                  const isLastAdmin = adminCount === 1 && member.role === 'admin'
                  return (
                    <tr key={member.member_id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{member.email}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${member.role === 'admin' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                          {member.role === 'admin' ? 'Администратор' : 'Участник'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        {isCurrentUserAdmin && member.user_id !== user?.id && (
                          <div className="flex items-center justify-end gap-2">
                            {member.role === 'member' ? (
                              <button onClick={() => handleChangeRole(member, 'admin')} className="p-2 text-gray-500 hover:text-green-600" title="Сделать администратором">
                                <Shield className="w-4 h-4" />
                              </button>
                            ) : (
                              <button onClick={() => handleChangeRole(member, 'member')} disabled={isLastAdmin} className="p-2 text-gray-500 hover:text-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed" title={isLastAdmin ? "Нельзя понизить последнего администратора" : "Сделать участником"}>
                                <ShieldOff className="w-4 h-4" />
                              </button>
                            )}
                            <button onClick={() => handleRemoveMember(member)} disabled={isLastAdmin} className="p-2 text-gray-500 hover:text-red-600 disabled:opacity-50 disabled:cursor-not-allowed" title={isLastAdmin ? "Нельзя удалить последнего администратора" : "Удалить"}>
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                        {member.user_id === user?.id && (
                           <button onClick={() => handleRemoveMember(member)} disabled={isLastAdmin} className="btn-danger-outline text-xs disabled:opacity-50 disabled:cursor-not-allowed" title={isLastAdmin ? "Нельзя покинуть организацию, будучи последним администратором" : "Покинуть организацию"}>
                             Покинуть
                           </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
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

      {/* Create Organization Modal */}
      {showCreateOrgModal && (
        <Modal title="Создать новую организацию" onClose={() => setShowCreateOrgModal(false)}>
          <form onSubmit={handleCreateOrganization}>
            <label htmlFor="org-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Название организации</label>
            <input
              id="org-name"
              type="text"
              value={newOrgName}
              onChange={(e) => setNewOrgName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="Название моей компании"
              required
            />
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={() => setShowCreateOrgModal(false)} className="btn-secondary">Отмена</button>
              <button type="submit" className="btn-primary">Создать</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}

export default OrganizationManagement
