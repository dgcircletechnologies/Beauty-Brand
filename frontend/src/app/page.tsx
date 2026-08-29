import { HomeExperience } from "@/components/customer/home-experience";
import { UserShell } from "@/components/customer/user-shell";

export default function Home() {
  return (
    <UserShell>
      <HomeExperience />
    </UserShell>
  );
}
