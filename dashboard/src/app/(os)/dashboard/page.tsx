import { redirect } from 'next/navigation'

// Home moved to "/" so opening the installed app lands on the calm screen.
// Kept as a redirect: old push notifications and bookmarks deep-link here.
export default function LegacyDashboard() {
  redirect('/')
}
