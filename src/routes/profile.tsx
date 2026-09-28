import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ProfileView } from "@/components/gym/ProfileView";

export const Route = createFileRoute("/profile")({
  component: ProfilePage,
});

function ProfilePage() {
  const navigate = useNavigate();
  return (
    <div className="pt-4">
      <ProfileView onSignOut={() => navigate({ to: "/" })} />
    </div>
  );
}
