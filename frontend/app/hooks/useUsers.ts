import { useState, useEffect } from 'react'
import { UserInfo } from '../types'
import { api } from '../utils/api'

export function useUsers() {
  const [users, setUsers] = useState<UserInfo[]>([])
  const [userId, setUserId] = useState<number | null>(null)
  const [username, setUsername] = useState('')
  const [showUsernameModal, setShowUsernameModal] = useState(false)
  const [showNewUserForm, setShowNewUserForm] = useState(false)
  const [newUsername, setNewUsername] = useState('')

  const loadUsers = async () => {
    try {
      const usersList = await api.getUsers()
      setUsers(usersList)
    } catch (error) {
      console.error('Failed to load users:', error)
      setUsers([])
    }
  }

  const selectUser = async (selectedUserId: number, selectedUsername: string) => {
    setUserId(selectedUserId)
    setUsername(selectedUsername)
    localStorage.setItem('userId', selectedUserId.toString())
    localStorage.setItem('username', selectedUsername)
    setShowUsernameModal(false)
    setShowNewUserForm(false)
    setNewUsername('')
  }

  const createUser = async (name: string) => {
    if (!name.trim()) return
    try {
      const newUser = await api.createUser(name.trim())
      await loadUsers()
      await selectUser(newUser.id, name.trim())
      return newUser
    } catch (error: any) {
      console.error('Failed to create user:', error)
      throw error
    }
  }

  useEffect(() => {
    const savedUserId = localStorage.getItem('userId')
    const savedUsername = localStorage.getItem('username')
    if (savedUserId && savedUsername) {
      setUserId(parseInt(savedUserId))
      setUsername(savedUsername)
      setShowUsernameModal(false)
    } else {
      loadUsers()
      setShowUsernameModal(true)
    }
  }, [])

  return {
    users,
    userId,
    username,
    showUsernameModal,
    setShowUsernameModal,
    showNewUserForm,
    setShowNewUserForm,
    newUsername,
    setNewUsername,
    setUserId,
    setUsername,
    loadUsers,
    selectUser,
    createUser,
  }
}


