// Where a signed-in account belongs. Shared by AuthForm (where to go after a
// successful login) and GuestRoute (where to bounce someone who's already
// signed in) — if these two disagreed, logging in would land you somewhere the
// guard immediately redirects away from.
//
// Readers have no author/admin tooling to land on — /dashboard is the
// Author/Admin work surface (manage posts, moderate users), so a plain reader
// goes to the feed instead. Authors and admins both land on /dashboard, which
// renders different content per role internally.
const ROLE_LANDING = {
  user: '/',
  author: '/dashboard',
  admin: '/dashboard',
};

export const landingFor = (role) => ROLE_LANDING[role] ?? '/';

export default ROLE_LANDING;
