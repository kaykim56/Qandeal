"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";

interface QandaUser {
  userId: string;
}

interface QandaUserContextType {
  user: QandaUser | null;
  isQandaUser: boolean;
}

const QandaUserContext = createContext<QandaUserContextType>({
  user: null,
  isQandaUser: false,
});

const STORAGE_KEY = "qanda_user_id";

interface QandaUserProviderProps {
  userId: string | null;
  children: ReactNode;
}

export function QandaUserProvider({
  userId,
  children,
}: QandaUserProviderProps) {
  const [user, setUser] = useState<QandaUser | null>(
    userId ? { userId } : null
  );

  useEffect(() => {
    // 서버에서 전달받은 userId가 있으면 sessionStorage에 백업
    if (userId) {
      try {
        sessionStorage.setItem(STORAGE_KEY, userId);
      } catch {
        // sessionStorage 사용 불가 시 무시
      }
      setUser({ userId });
    } else {
      // 서버에서 userId를 못 받았으면 sessionStorage에서 복원 시도
      try {
        const storedUserId = sessionStorage.getItem(STORAGE_KEY);
        if (storedUserId) {
          setUser({ userId: storedUserId });
        }
      } catch {
        // sessionStorage 사용 불가 시 무시
      }
    }
  }, [userId]);

  const value: QandaUserContextType = {
    user,
    isQandaUser: user !== null,
  };

  return (
    <QandaUserContext.Provider value={value}>
      {children}
    </QandaUserContext.Provider>
  );
}

export function useQandaUser(): QandaUserContextType {
  const context = useContext(QandaUserContext);
  if (context === undefined) {
    throw new Error("useQandaUser must be used within a QandaUserProvider");
  }
  return context;
}
