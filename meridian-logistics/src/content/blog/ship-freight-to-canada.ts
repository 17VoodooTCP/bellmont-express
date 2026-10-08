import type { Block } from "@/lib/blog";

export const body: Block[] = [
  { p: "Canada is a natural next market for many North American brands. It is close, customers have familiar tastes, and major carriers serve it well. But shipping across the border adds licensing, labelling, customs paperwork and extra transit time. Each of these is manageable when it is planned up front, and each causes real delays when it is not. This guide walks through what to set up before your first shipment." },
  { note: "Import rules change, and requirements differ by product. Use this guide to understand what to ask, then confirm current requirements with the Canadian Food Inspection Agency (CFIA), the Canada Border Services Agency (CBSA) and a licensed customs broker before you ship." },

  { h: "Decide who is the importer" },
  { p: "Every commercial shipment into Canada has an importer of record, the party legally responsible for the goods, the paperwork and the duties and taxes. There are two common models." },
  { list: [
    "Your Canadian customer, distributor or partner acts as the importer. This keeps your obligations simpler, but adds work for them.",
    "Your business acts as the importer, often as a non-resident importer. This lets you sell directly to Canadian consumers, but you take on the registration, compliance and payment responsibilities.",
  ] },
  { p: "If your business will be the importer, you will generally need a Canada Revenue Agency business number with an import-export program account. CBSA's CARM system also requires commercial importers to register and manage their accounts there. A customs broker can explain what applies to you and help with setup." },

  { h: "Licensing for food" },
  { p: "Businesses that import most kinds of food into Canada generally need a Safe Food for Canadians licence from the CFIA, and must meet preventive-control and traceability requirements. Whether you need one depends on your products and on who is acting as the importer." },
  { p: "Some products, such as meat, dairy, eggs and certain plants, can carry additional requirements such as permits or certificates. The CFIA's Automated Import Reference System (AIRS) is the place to check the specific requirements for a given product and origin." },

  { h: "Labelling" },
  { p: "Food sold to Canadian consumers must meet Canadian labelling rules, which differ in important ways from US rules." },
  { list: [
    "Bilingual labels: mandatory information on consumer prepackaged food must generally appear in both English and French.",
    "Quebec: the province has additional French-language requirements, so products sold there need particular care.",
    "Nutrition facts: Canada uses its own nutrition facts table format, which is not the same as the US label.",
    "Units: net quantity is shown in metric units.",
    "Other required information, such as ingredients, allergens and dealer name and address, follows Canadian rules.",
  ] },
  { p: "Relabelling after goods have arrived is slow and expensive. Review the CFIA's labelling guidance for your product category before you print packaging for the Canadian market, or work with a partner who specialises in Canadian compliance." },

  { h: "Customs documentation" },
  { p: "Accurate paperwork is what keeps a shipment moving at the border. The core documents and details include the following." },
  { list: [
    "A commercial invoice that describes each product clearly, with its value, quantity, and country of origin.",
    "The correct tariff classification for each product, which determines the duty rate.",
    "Proof of origin where you are claiming preferential treatment under the Canada-United States-Mexico Agreement (CUSMA, known in the US as USMCA).",
    "Any permits, certificates or licences required for the specific products.",
  ] },
  { note: "Vague descriptions such as 'food samples' or 'gifts' are a common cause of delays. Describe exactly what the product is and what it is made of." },

  { h: "Duties, taxes and the customer experience" },
  { p: "Imports may be subject to duties and to Canadian sales taxes such as GST or HST. Decide in advance who pays them, because it shapes the customer experience." },
  { list: [
    "Delivered duty paid (DDP): you pay duties and taxes and build them into your price. The customer pays nothing on delivery, which is the smoothest experience.",
    "Delivered at place (DAP): the customer pays duties, taxes and any brokerage fees on delivery. This is simpler for you, but surprise charges at the door are a frequent cause of refused deliveries and complaints.",
  ] },
  { p: "If you choose DAP, tell customers clearly at checkout that they may owe charges on delivery." },

  { h: "Working with a customs broker" },
  { p: "Most shippers use a licensed customs broker to clear goods with CBSA. Carriers often offer brokerage as part of their service, and independent brokers are also available. A good broker can help with registration, classification, documentation and compliance questions. Compare broker fees, because they can add noticeably to the cost of small shipments." },

  { h: "Keeping cold chain intact across the border" },
  { p: "Customs clearance adds time, and inspections can add more. For perishable products, plan for that." },
  { list: [
    "Design your pack-out for a longer transit time than an equivalent domestic shipment.",
    "Choose services with dependable cross-border performance, and ask carriers how they handle perishables held at customs.",
    "Ship early in the week, so a delay at the border does not leave a package sitting over a weekend.",
    "Make sure paperwork is complete before pickup, since missing documents are the most common cause of holds.",
  ] },

  { h: "A pre-launch checklist" },
  { steps: [
    "Decide who will act as importer of record.",
    "Check licence, permit and certificate requirements for each product in AIRS.",
    "Register for the required business number and import accounts if you are the importer.",
    "Review labels against Canadian requirements, including bilingual and Quebec rules.",
    "Confirm tariff classifications and gather proof of origin for CUSMA claims.",
    "Choose a customs broker and a carrier service with good cross-border performance.",
    "Decide between DDP and DAP, and update checkout messaging to match.",
    "Ship a small test order and follow it through clearance before launching widely.",
  ] },

  { h: "Where Bellmont helps" },
  { p: "Bellmont tracks every handoff, including customs milestones, on one live record, so you can see a shipment waiting at the border while there is still time to resolve a document question." },
];
