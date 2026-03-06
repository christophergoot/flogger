import { useEffect, useState, useCallback } from 'react'
import type { GoogleUser } from './Auth'
import * as googleApi from './lib/googleApi'
import type { Activity, ActivityInsert } from './types'
import { ActivityForm } from './ActivityForm'
import { ActivityList } from './ActivityList'

interface ActivityLogProps {
  user: GoogleUser
  onSignOut: () => void
}

export function ActivityLog({ user, onSignOut }: ActivityLogProps) {
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)
  const [pendingId, setPendingId] = useState<string | null>(null)

  const fetchActivities = useCallback(async () => {
    try {
      const data = await googleApi.getActivities(user.accessToken, user.spreadsheetId)
      setActivities(data)
    } catch (err) {
      if (err instanceof Error && err.message === 'UNAUTHORIZED') {
        onSignOut()
      }
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [user.accessToken, user.spreadsheetId, onSignOut])

  useEffect(() => {
    fetchActivities()
  }, [fetchActivities])

  async function addActivity(entry: ActivityInsert) {
    try {
      await googleApi.appendActivity(user.accessToken, user.spreadsheetId, entry)
      await fetchActivities()
    } catch (err) {
      if (err instanceof Error && err.message === 'UNAUTHORIZED') {
        onSignOut()
      }
      console.error(err)
    }
  }

  async function editActivity(activity: Activity) {
    if (activity.rowIndex == null) return
    setPendingId(activity.id)
    try {
      await googleApi.updateActivity(user.accessToken, user.spreadsheetId, activity)
      await fetchActivities()
    } catch (err) {
      if (err instanceof Error && err.message === 'UNAUTHORIZED') {
        onSignOut()
      }
      console.error(err)
    } finally {
      setPendingId(null)
    }
  }

  async function deleteActivity(activity: Activity) {
    const rowIndex = activity.rowIndex
    if (rowIndex == null) return
    setPendingId(activity.id)
    try {
      await googleApi.deleteActivity(user.accessToken, user.spreadsheetId, rowIndex)
      await fetchActivities()
    } catch (err) {
      if (err instanceof Error && err.message === 'UNAUTHORIZED') {
        onSignOut()
      }
      console.error(err)
    } finally {
      setPendingId(null)
    }
  }

  return (
    <div className="activity-log">
      <header className="header">
        <h1 className="header-title">Flogger</h1>
        <button className="header-signout" onClick={onSignOut} type="button">
          Sign out
        </button>
      </header>
      <ActivityForm onSubmit={addActivity} />
      {loading ? (
        <p className="list-loading">Loading…</p>
      ) : (
        <ActivityList activities={activities} pendingId={pendingId} onEdit={editActivity} onDelete={deleteActivity} />
      )}
    </div>
  )
}
