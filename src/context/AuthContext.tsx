import { createContext, useContext, useEffect, useState, ReactNode } from "react"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { loginApi, setUnauthorizedHandler } from "../lib/api"

interface User {
  email: string
  username: string
  first_name?: string
  last_name?: string
  name?: string
  full_name?: string
  role?: string
  user_type?: string
}

interface AuthState {
  identity: string | null
  user: User | null
  token: string | null
  isLoaded: boolean
  login: (identity: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthState>({
  identity: null,
  user: null,
  token: null,
  isLoaded: false,
  login: async () => {},
  logout: async () => {},
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [identity, setIdentity] = useState<string | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    AsyncStorage.multiGet(["bwp_identity", "bwp_token", "bwp_user"]).then(([[, id], [, tok], [, usr]]) => {
      if (id && tok) {
        setIdentity(id)
        setToken(tok)
        if (usr) setUser(JSON.parse(usr))
      }
      setIsLoaded(true)
    })
  }, [])

  const login = async (id: string, password: string) => {
    const data = await loginApi(id, password)
    const resolvedIdentity = data.user?.email ?? id
    await AsyncStorage.multiSet([
      ["bwp_identity", resolvedIdentity],
      ["bwp_token", data.token],
      ["bwp_user", JSON.stringify(data.user)],
    ])
    setIdentity(resolvedIdentity)
    setToken(data.token)
    setUser(data.user)
  }

  const logout = async () => {
    await AsyncStorage.multiRemove(["bwp_identity", "bwp_token", "bwp_user"])
    setIdentity(null)
    setToken(null)
    setUser(null)
  }

  useEffect(() => {
    setUnauthorizedHandler(logout)
  }, [])

  return (
    <AuthContext.Provider value={{ identity, user, token, isLoaded, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
