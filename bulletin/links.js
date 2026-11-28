/* Camp Bulletin Board: the ONE place every link lives.
   Set on:false to hide a card or button completely (a group with nothing left hides too).
   An empty url with status:"soon" shows a "coming soon" card that is not clickable. */
window.BOARD_LINKS = [
  { id: "intake", label: "Intake form", url: "../intake/", on: true },
  { id: "handbook", label: "The Handbook", url: "../", on: true },
  { id: "preparing", label: "Preparing for Camp", url: "https://www.spirit.camp/preparing-for-camp", on: true },
  { id: "directions", label: "Getting to camp (Google Maps)", url: "https://maps.google.com/?cid=13064938374775409867", on: true },
  { id: "rideshare", label: "Ride Share Board", url: "https://docs.google.com/spreadsheets/d/1egJca1F53KOgqsOeLGcvp9szv6iQbzwJRptdi0jIAMs/edit", on: true, note: "His call Fri 10:50 PM: keep ride board link (sheet is edit-anyone-with-link)" },
  { id: "scrapbook", label: "The Scrapbook", url: "", on: true, status: "soon" },
  { id: "photo_album", label: "Camp photo album", url: "", on: false, note: "hidden until he sends the Drive link" },
  { id: "whatsapp", label: "WhatsApp group", url: "https://chat.whatsapp.com/KtwRNoK39EFADwi5mHOu4w", on: true, note: "His call Fri 10:52 PM: keep (page shared with guests only; anyone with the URL can join)" },
  { id: "email", label: "Email the camp", url: "mailto:spiritcampevents@gmail.com", on: true },
  { id: "instagram", label: "Instagram", url: "https://www.instagram.com/spiritcamp_/", on: true },
  { id: "facebook", label: "Facebook", url: "https://www.facebook.com/spirit.camp.retreat", on: true },
  { id: "linkedin", label: "LinkedIn", url: "https://www.linkedin.com/company/spirit-camp", on: false, note: "unconfirmed" },
  { id: "tiktok", label: "TikTok", url: "https://www.tiktok.com/@spiritcamp", on: true },
  { id: "review_google", label: "Review on Google", url: "https://www.google.com/search?q=Spirit+Camp+Retreat+Center+Little+River#lrd=0x8081ac8edd1bfd41:0xb54ffc3b18db8ccb,3", on: true },
  { id: "review_tripadvisor", label: "Review on Tripadvisor", url: "https://www.tripadvisor.com/UserReviewEdit-g32632-d25566491", on: true },
  { id: "review_yelp", label: "Review on Yelp", url: "https://www.yelp.com/biz/spirit-camp-retreat-center-little-river-2", on: true }
];
