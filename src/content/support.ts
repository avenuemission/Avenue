// The standing Zoom room for leader support calls. The support page shows
// it after a booking and the confirmation email sends it; both read it from
// here, so the email never carries a link the browser supplied.
export const SUPPORT_ZOOM = {
  link: "https://monash.zoom.us/j/5879274261?pwd=T296WXNGTEpDN20yZWZnb1d0ZFY3UT09",
  meetingId: "587 927 4261",
  passcode: "793139",
} as const;
