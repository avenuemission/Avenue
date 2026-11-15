// Switches for parts of the site that are built but turned off.
//
// The Discipleship Network page (/leaders/network, its dashboard tile and
// the "See the family tree" link on Multiply) is hidden while it is fixed.
// Multiply's own list of people you're apprenticing stays on. The tables
// (network_people, leader_people) and their data are untouched. Set this
// to true to bring the page back.
export const NETWORK_ENABLED = false;

// The automated leader emails: the Sunday RPMS check-in, the Monday weekly
// topic digest, the monthly church health and apprentice emails, and the
// milestone emails. While this is false the hourly Netlify job runs as a
// dry run: it works out what it would send but sends and records nothing.
// Set it to true to turn them back on (Netlify's LEADER_EMAILS_DRY_RUN must
// also be "false" for a real send). Form and On-Ramp confirmations are not
// affected.
export const LEADER_EMAILS_ENABLED = false;
