"use client"

import { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react"
import { createClient } from "@/lib/supabase/client"
import type { Genre } from "@/types/database"

type GenreContextType = {
  genres: Genre[]
  currentGenre: Genre | null
  setCurrentGenreId: (id: string) => void
  loading: boolean
  refresh: () => Promise<void>
}

const GenreContext = createContext<GenreContextType>({
  genres: [],
  currentGenre: null,
  setCurrentGenreId: () => {},
  loading: true,
  refresh: async () => {},
})

export function useGenre() {
  return useContext(GenreContext)
}

export function GenreProvider({ children }: { children: React.ReactNode }) {
  const [genres, setGenres] = useState<Genre[]>([])
  const [currentGenreId, setCurrentGenreId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const fetchGenres = useCallback(async () => {
    const { data, error } = await supabase
      .from("lm_genres")
      .select("id, name, description, created_at")
      .order("name")
    if (error) {
      setLoading(false)
      return
    }
    const list = (data ?? []) as Genre[]
    setGenres(list)
    if (list.length > 0) {
      setCurrentGenreId((prev) => {
        if (prev && list.find((g) => g.id === prev)) return prev
        const saved = localStorage.getItem("lm_genre_id")
        const found = saved && list.find((g) => g.id === saved)
        return found ? saved : list[0].id
      })
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchGenres()
  }, [fetchGenres])

  useEffect(() => {
    if (currentGenreId) {
      localStorage.setItem("lm_genre_id", currentGenreId)
    }
  }, [currentGenreId])

  const currentGenre = useMemo(
    () => genres.find((g) => g.id === currentGenreId) ?? null,
    [genres, currentGenreId]
  )

  const value = useMemo(
    () => ({
      genres,
      currentGenre,
      setCurrentGenreId,
      loading,
      refresh: fetchGenres,
    }),
    [genres, currentGenre, loading, fetchGenres]
  )

  return (
    <GenreContext.Provider value={value}>
      {children}
    </GenreContext.Provider>
  )
}
