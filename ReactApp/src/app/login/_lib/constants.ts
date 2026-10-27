import { KeyRound, ShieldCheck, Users } from "lucide-react";

export const FEATURES = [
  {
    icon: ShieldCheck,
    title: "Access Management",
    description: "Granular role-based controls for administrators and team members.",
  },
  {
    icon: Users,
    title: "User Administration",
    description: "Provision, edit, and oversee user accounts and security statuses.",
  },
  {
    icon: KeyRound,
    title: "Secure Sessions",
    description: "JWT-based protected authentication with password rotation enforcement.",
  },
];
