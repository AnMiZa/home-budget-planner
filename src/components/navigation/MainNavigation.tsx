import { Sidebar } from "@/components/navigation/Sidebar";
import { TabBar } from "@/components/navigation/TabBar";

interface User {
  id: string;
  email: string;
  household_id: string;
}

interface MainNavigationProps {
  readonly user?: User;
}

export const MainNavigation = ({ user }: MainNavigationProps) => {
  return (
    <>
      <Sidebar user={user} />
      <TabBar />
    </>
  );
};
