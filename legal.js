// ---------------------------------------------------------------------------
// Legal page content — mirrors PrivacyPolicyScreen / TermsOfServiceScreen /
// SecurityScreen from lib/screens.dart
// ---------------------------------------------------------------------------
export const LEGAL = {
  privacy: {
    title: "Privacy Policy",
    icon: "shield",
    sections: [
      {
        title: "What we collect",
        body: "Wyte AI collects information needed to provide the service, such as your account information, authentication information, usage information, credits and content you choose to create or upload.",
      },
      {
        title: "How we use your information",
        body: "We use information to authenticate your account, provide AI generation features, manage credits and payments, save your projects, improve reliability and provide customer support.",
      },
      {
        title: "Your generated content",
        body: "Content you submit for generation may be processed by the AI providers required to deliver the requested service. Do not submit confidential or sensitive information unless you are comfortable with it being processed for that purpose.",
      },
      {
        title: "Payments",
        body: "Payment information is processed by our payment provider. Wyte AI does not intentionally store your full card details.",
      },
      {
        title: "Data protection",
        body: "We use reasonable technical and organizational measures to protect account information and stored content. No online service can guarantee absolute security.",
      },
      {
        title: "Your choices",
        body: "You may request information about your account data or request account-related assistance through the support channel provided by Wyte AI.",
      },
      {
        title: "Policy updates",
        body: "This Privacy Policy may be updated as Wyte AI evolves. Material changes may be reflected by updating this page.",
      },
    ],
  },
  terms: {
    title: "Terms of Service",
    icon: "gavel",
    sections: [
      {
        title: "Using Wyte AI",
        body: "You may use Wyte AI only for lawful purposes and in accordance with these terms. You are responsible for activity performed through your account.",
      },
      {
        title: "AI-generated content",
        body: "AI-generated results may contain inaccuracies, unexpected content or similarities to existing works. You are responsible for reviewing generated content before publishing or using it.",
      },
      {
        title: "Prohibited use",
        body: "You must not use Wyte AI to create or distribute unlawful, fraudulent, abusive, harmful or otherwise prohibited content. You must also respect intellectual-property and privacy rights.",
      },
      {
        title: "Credits and payments",
        body: "Some features may require credits or a paid plan. Credits and plans may have limits, expiration rules or other conditions shown at the time of purchase.",
      },
      {
        title: "Your content",
        body: "You remain responsible for content you submit to Wyte AI and for ensuring you have the necessary rights and permissions to use that content.",
      },
      {
        title: "Service availability",
        body: "We aim to keep Wyte AI available and reliable, but the service may occasionally be unavailable because of maintenance, provider outages, upgrades or circumstances outside our control.",
      },
      {
        title: "Account termination",
        body: "Accounts may be restricted or terminated where necessary to protect the service, users, providers or comply with applicable law.",
      },
      {
        title: "Changes to these terms",
        body: "These terms may change as the service develops. Continued use of Wyte AI after an update constitutes acceptance of the updated terms.",
      },
    ],
  },
  security: {
    title: "Security",
    icon: "lock",
    sections: [
      {
        title: "Account protection",
        body: "Wyte AI uses authentication infrastructure to protect user accounts and restrict access to authenticated resources.",
      },
      {
        title: "Database protection",
        body: "User data is stored using access controls designed to prevent users from accessing resources belonging to other accounts.",
      },
      {
        title: "Server-side secrets",
        body: "Private provider credentials and payment secrets remain on the server and are never embedded in the client application.",
      },
      {
        title: "Payments",
        body: "Payment processing is handled through the configured payment provider rather than storing sensitive card information inside the Wyte AI application.",
      },
      {
        title: "AI providers",
        body: "Requests may be processed by external AI infrastructure required to provide generation features. Provider credentials are handled server-side.",
      },
      {
        title: "Reporting a security issue",
        body: "If you discover a security vulnerability, please report it through the official Wyte AI support channel rather than publicly sharing sensitive details.",
      },
    ],
  },
};
