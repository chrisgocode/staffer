"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import type { Event, EventSignup } from "@/lib/types"
import { mockEvents, mockSignups } from "@/lib/mock-data"

interface DataContextType {
  events: Event[]
  signups: EventSignup[]
  addEvent: (event: Omit<Event, "id" | "createdAt">) => void
  updateEvent: (id: string, event: Partial<Event>) => void
  deleteEvent: (id: string) => void
  addSignup: (signup: Omit<EventSignup, "id" | "appliedAt">) => void
  updateSignupStatus: (id: string, status: "approved" | "pending") => void
  updateSignup: (id: string, signup: Partial<EventSignup>) => void
  deleteSignup: (id: string) => void
  removeStudentFromEvent: (signupId: string) => void
  getEventSignups: (eventId: string) => EventSignup[]
  getUserSignups: (userId: string) => EventSignup[]
}

const DataContext = createContext<DataContextType | undefined>(undefined)

export function DataProvider({ children }: { children: ReactNode }) {
  const [events, setEvents] = useState<Event[]>([])
  const [signups, setSignups] = useState<EventSignup[]>([])

  useEffect(() => {
    const storedEvents = localStorage.getItem("campus-staffing-events")
    const storedSignups = localStorage.getItem("campus-staffing-signups")

    setEvents(storedEvents ? JSON.parse(storedEvents) : mockEvents)

    const loadedSignups = storedSignups ? JSON.parse(storedSignups) : mockSignups
    const migratedSignups = loadedSignups
      .filter((signup: any) => signup.status !== "rejected")
      .map((signup: any) => {
        if (!signup.timeslots) {
          return {
            ...signup,
            timeslots:
              signup.startTime && signup.endTime ? [{ startTime: signup.startTime, endTime: signup.endTime }] : [],
          }
        }
        return signup
      })
    setSignups(migratedSignups)
  }, [])

  useEffect(() => {
    if (events.length > 0) {
      localStorage.setItem("campus-staffing-events", JSON.stringify(events))
    }
  }, [events])

  useEffect(() => {
    if (signups.length > 0) {
      localStorage.setItem("campus-staffing-signups", JSON.stringify(signups))
    }
  }, [signups])

  const addEvent = (event: Omit<Event, "id" | "createdAt">) => {
    const newEvent: Event = {
      ...event,
      id: Math.random().toString(36).substr(2, 9),
      createdAt: new Date().toISOString(),
    }
    setEvents((prev) => [...prev, newEvent])
  }

  const updateEvent = (id: string, updatedEvent: Partial<Event>) => {
    setEvents((prev) => prev.map((event) => (event.id === id ? { ...event, ...updatedEvent } : event)))
  }

  const deleteEvent = (id: string) => {
    setEvents((prev) => prev.filter((event) => event.id !== id))
    setSignups((prev) => prev.filter((signup) => signup.eventId !== id))
  }

  const addSignup = (signup: Omit<EventSignup, "id" | "appliedAt">) => {
    const newSignup: EventSignup = {
      ...signup,
      id: Math.random().toString(36).substr(2, 9),
      appliedAt: new Date().toISOString(),
    }
    setSignups((prev) => [...prev, newSignup])

    setEvents((prev) =>
      prev.map((event) =>
        event.id === signup.eventId ? { ...event, spotsAvailable: Math.max(0, event.spotsAvailable - 1) } : event,
      ),
    )
  }

  const updateSignupStatus = (id: string, status: "approved" | "pending") => {
    setSignups((prev) => prev.map((signup) => (signup.id === id ? { ...signup, status } : signup)))
  }

  const updateSignup = (id: string, updatedSignup: Partial<EventSignup>) => {
    setSignups((prev) => prev.map((signup) => (signup.id === id ? { ...signup, ...updatedSignup } : signup)))
  }

  const deleteSignup = (id: string) => {
    const signup = signups.find((s) => s.id === id)
    if (signup) {
      setEvents((prev) =>
        prev.map((event) =>
          event.id === signup.eventId
            ? { ...event, spotsAvailable: Math.min(event.spotsTotal, event.spotsAvailable + 1) }
            : event,
        ),
      )
    }
    setSignups((prev) => prev.filter((signup) => signup.id !== id))
  }

  const removeStudentFromEvent = (signupId: string) => {
    const signup = signups.find((s) => s.id === signupId)
    if (signup) {
      setEvents((prev) =>
        prev.map((event) =>
          event.id === signup.eventId
            ? { ...event, spotsAvailable: Math.min(event.spotsTotal, event.spotsAvailable + 1) }
            : event,
        ),
      )
    }
    setSignups((prev) => prev.filter((signup) => signup.id !== signupId))
  }

  const getEventSignups = (eventId: string) => {
    return signups.filter((signup) => signup.eventId === eventId)
  }

  const getUserSignups = (userId: string) => {
    return signups.filter((signup) => signup.studentId === userId)
  }

  return (
    <DataContext.Provider
      value={{
        events,
        signups,
        addEvent,
        updateEvent,
        deleteEvent,
        addSignup,
        updateSignupStatus,
        updateSignup,
        deleteSignup,
        removeStudentFromEvent,
        getEventSignups,
        getUserSignups,
      }}
    >
      {children}
    </DataContext.Provider>
  )
}

export function useData() {
  const context = useContext(DataContext)
  if (context === undefined) {
    throw new Error("useData must be used within a DataProvider")
  }
  return context
}
