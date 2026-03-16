/* eslint-disable react-refresh/only-export-components */
import { createContext, useState, useContext, useEffect, type ReactNode } from "react";

interface User {
  id: string;
  username: string;
  displayName: string;
  role: string;
}

interface UserContextType {
  currentUser: User;
  updateUser: (user: User) => void;
}

const defaultUser: User = {
  id: "1",
  username: "user1",
  displayName: "Warehouse Manager",
  role: "manager",
};

const UserContext = createContext<UserContextType>({
  currentUser: defaultUser,
  updateUser: () => {},
});

export const UserProvider = ({
  children,
}: { children: ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<User>(defaultUser);

  useEffect(() => {
    const savedUser = window.electronAPI?.store.get("currentUser");
    if (savedUser) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCurrentUser(JSON.parse(savedUser));
    }
  }, []);

  const updateUser = (user: User) => {
    setCurrentUser(user);
    window.electronAPI?.store.set("currentUser", JSON.stringify(user));
  };

  return (
    <UserContext.Provider value={{ currentUser, updateUser }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => useContext(UserContext);
