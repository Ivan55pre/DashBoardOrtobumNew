import React from 'react'
import { Plus, Trash2, Shield, ShieldOff } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { Member } from '../../types'

interface MemberListProps {
  members: Member[]
  onAddMember: () => void
  onRemoveMember: (member: Member) => void
  onChangeRole: (member: Member, newRole: 'admin' | 'member') => void
  loading: boolean
}

const MemberList: React.FC<MemberListProps> = ({ members, onAddMember, onRemoveMember, onChangeRole, loading }) => {
  const { user } = useAuth()
  const currentUserMemberInfo = members.find(m => m.user_id === user?.id)
  const isCurrentUserAdmin = currentUserMemberInfo?.role === 'admin'
  const adminCount = members.filter(m => m.role === 'admin').length

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
          Участники ({members.length})
        </h3>
        {isCurrentUserAdmin && (
          <button onClick={onAddMember} className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Добавить участника
          </button>
        )}
      </div>

      <div className="overflow-auto max-h-96">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-dark-700">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Email</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Роль</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Действия</th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-dark-800 divide-y divide-gray-200 dark:divide-gray-700">
            {loading ? (
              <tr>
                <td colSpan={3} className="text-center py-4 text-gray-500">Загрузка участников...</td>
              </tr>
            ) : (
              members.map(member => {
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
                            <button onClick={() => onChangeRole(member, 'admin')} className="p-2 text-gray-500 hover:text-green-600" title="Сделать администратором">
                              <Shield className="w-4 h-4" />
                            </button>
                          ) : (
                            <button onClick={() => onChangeRole(member, 'member')} disabled={isLastAdmin} className="p-2 text-gray-500 hover:text-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed" title={isLastAdmin ? "Нельзя понизить последнего администратора" : "Сделать участником"}>
                              <ShieldOff className="w-4 h-4" />
                            </button>
                          )}
                          <button onClick={() => onRemoveMember(member)} disabled={isLastAdmin} className="p-2 text-gray-500 hover:text-red-600 disabled:opacity-50 disabled:cursor-not-allowed" title={isLastAdmin ? "Нельзя удалить последнего администратора" : "Удалить"}>
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                      {member.user_id === user?.id && (
                         <button onClick={() => onRemoveMember(member)} disabled={isLastAdmin} className="btn-danger-outline text-xs disabled:opacity-50 disabled:cursor-not-allowed" title={isLastAdmin ? "Нельзя покинуть организацию, будучи последним администратором" : "Покинуть организацию"}>
                           Покинуть
                         </button>
                      )}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default MemberList