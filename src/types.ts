export interface Organization {
  id: string
  name: string
}

export interface Member {
  member_id: number
  user_id: string
  organization_id: string
  role: 'admin' | 'member'
  email: string
}