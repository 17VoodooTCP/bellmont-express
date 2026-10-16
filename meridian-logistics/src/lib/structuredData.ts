import { SITE_URL } from "./site";

/* Machine-readable facts about the business, read by Google (and its AI
   answers) to describe Bellmont accurately. Only verified facts go here:
   no street address, and no carrier partnerships, until they are real. */

export const ORG_ID = `${SITE_URL}/#organization`;
export const SUPPORT_EMAIL = "support@bellmontexpress.com";

export const organization = {
  "@type": "Organization",
  "@id": ORG_ID,
  name: "Bellmont Express",
  url: SITE_URL,
  logo: { "@type": "ImageObject", url: `${SITE_URL}/apple-icon.png`, width: 180, height: 180 },
  description:
    "Bellmont Express is a freight and parcel shipping company covering ocean, air, road and rail, with online booking, live shipment tracking and shipping guides for businesses.",
  email: SUPPORT_EMAIL,
  contactPoint: {
    "@type": "ContactPoint",
    contactType: "customer support",
    email: SUPPORT_EMAIL,
    availableLanguage: ["English"],
  },
};

export const website = {
  "@type": "WebSite",
  "@id": `${SITE_URL}/#website`,
  url: SITE_URL,
  name: "Bellmont Express",
  publisher: { "@id": ORG_ID },
};

/** Serialised for a <script type="application/ld+json">. "<" is escaped so
 *  text inside can never close the script tag. */
export const jsonLd = (data: object) =>
  JSON.stringify({ "@context": "https://schema.org", ...data }).replace(/</g, "\\u003c");
