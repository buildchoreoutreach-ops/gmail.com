'use strict';

/* Gmail interface behaviour and mailbox state. */
const STORAGE_KEY = 'mail_lab_state_v4';
const LEGACY_EMAIL_KEY = 'gmail_clone_emails_v3';
const LEGACY_LABEL_KEY = 'gmail_clone_labels';
const PAGE_SIZES = [10, 25, 50];
const CATEGORIES = ['primary', 'social', 'promotions', 'updates', 'forums'];
const FOLDER_NAMES = {
  inbox: 'Inbox', starred: 'Starred', snoozed: 'Snoozed', sent: 'Sent', drafts: 'Drafts',
  purchases: 'Purchases', scheduled: 'Scheduled', important: 'Important', all: 'All Mail',
  spam: 'Spam', trash: 'Trash', archive: 'Archived'
};

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const escapeHTML = (value = '') => String(value).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const makeId = () => (Date.now() * 1000) + Math.floor(Math.random() * 1000);
const localDateTimeValue = (date = new Date()) => {
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
};

function initialMessages() {
  const now = Date.now();
  const ago = minutes => new Date(now - minutes * 60000).toISOString();
  return [
    { id: 1001, folder: 'inbox', category: 'primary', sender: 'Google Security', senderEmail: 'no-reply@accounts.google.com', recipient: 'buildchore.outreach@gmail.com', subject: 'Security alert: New sign-in detected', body: 'We noticed a new sign-in to your Google Account from a new device. If this was you, no further action is required.', date: ago(26), read: false, starred: false, important: true, labels: [], attachments: [] },
    { id: 1002, folder: 'inbox', category: 'primary', sender: 'ChatGPT', senderEmail: 'info@openai.com', recipient: 'buildchore.outreach@gmail.com', subject: 'Stuck on the wording? Say it better with ChatGPT', body: 'An easier way to write and refine your daily messages and emails instantly.', date: ago(1500), read: true, starred: true, important: false, labels: ['Personal'], attachments: [] },
    { id: 1003, folder: 'inbox', category: 'social', sender: 'LinkedIn', senderEmail: 'notifications@linkedin.com', recipient: 'buildchore.outreach@gmail.com', subject: 'You appeared in 8 searches this week', body: 'Here is a summary of recent activity from your professional network.', date: ago(2800), read: false, starred: false, important: false, labels: [], attachments: [] },
    { id: 1004, folder: 'inbox', category: 'promotions', sender: 'Flipkart Offers', senderEmail: 'offers@flipkart.example', recipient: 'buildchore.outreach@gmail.com', subject: 'A little something for your wishlist', body: 'Explore our latest offers and recommendations selected for you.', date: ago(4100), read: true, starred: false, important: false, labels: [], attachments: [] },
    { id: 1005, folder: 'inbox', category: 'updates', sender: 'Google Drive', senderEmail: 'drive-shares@google.com', recipient: 'buildchore.outreach@gmail.com', subject: 'A document was shared with you', body: 'A document has been shared with you. Open the attachment to review the details.', date: ago(6100), read: false, starred: false, important: true, labels: ['Work'], attachments: [{ name: 'Project-notes.pdf', type: 'application/pdf', size: 248000 }] },
    { id: 1006, folder: 'inbox', category: 'forums', sender: 'Web Design Forum', senderEmail: 'digest@forum.example', recipient: 'buildchore.outreach@gmail.com', subject: 'Weekly community digest', body: 'Here is this week’s community digest. Find messages using the search bar.', date: ago(8000), read: true, starred: false, important: false, labels: [], attachments: [] },
    { id: 1007, folder: 'purchases', category: 'updates', sender: 'Amazon.in', senderEmail: 'shipment@amazon.in', recipient: 'buildchore.outreach@gmail.com', subject: 'Your order has been dispatched', body: 'Your package containing the items in your order #402-192381 has been shipped.', date: ago(12000), read: true, starred: false, important: false, labels: ['Personal'], attachments: [] },
    { id: 1009, folder: 'archive', category: 'primary', sender: 'Design Notes', senderEmail: 'studio@example.com', recipient: 'buildchore.outreach@gmail.com', subject: 'The updated colour palette', body: 'I have attached the revised palette for the personal project. This message is archived, not deleted.', date: ago(28000), read: true, starred: false, important: false, labels: ['Work'], attachments: [] },
    { id: 1010, folder: 'spam', category: 'promotions', sender: 'Prize Desk', senderEmail: 'winner@unknown.example', recipient: 'buildchore.outreach@gmail.com', subject: 'You have won a prize', body: 'Your account has been selected. Review the details of this message carefully.', date: ago(35000), read: false, starred: false, important: false, labels: [], attachments: [] },
    { id: 1011, folder: 'trash', category: 'primary', sender: 'Old Newsletter', senderEmail: 'news@example.com', recipient: 'buildchore.outreach@gmail.com', subject: 'A newsletter you deleted', body: 'Restore this message to return it to the Inbox or permanently delete it.', date: ago(50000), read: true, starred: false, important: false, labels: [], attachments: [] },
    { id: 1012, folder: 'drafts', category: 'primary', sender: 'Buildchore', senderEmail: 'buildchore.outreach@gmail.com', recipient: 'sam@example.com', subject: 'A note for later', body: 'Open this draft to continue editing your message.', date: ago(60000), read: true, starred: false, important: false, labels: [], attachments: [] }
  ];
}

function defaultState() {
  return {
    version: 4,
    emails: initialMessages(),
    labels: ['Personal', 'Work'],
    profile: { name: 'Buildchore', email: 'buildchore.outreach@gmail.com', initial: 'B', colour: '#d8c8f5' },
    migrations: {},
    settings: {
      theme: 'light', density: 'default', inboxType: 'default',
      categories: { social: true, promotions: true, updates: true, forums: true },
      shortcuts: false, readingPane: false, desktopNotifications: false
    }
  };
}

function safeReadJSON(key) {
  try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : null; }
  catch (error) { console.warn(`Could not read ${key}`, error); return null; }
}

function normalizeEmail(email, index = 0) {
  const item = { ...email };
  item.id = item.id ?? makeId() + index;
  item.folder = item.folder || 'inbox';
  item.category = CATEGORIES.includes(item.category) ? item.category : 'primary';
  item.sender = String(item.sender || 'Unknown sender');
  item.senderEmail = String(item.senderEmail || 'unknown@example.test');
  item.recipient = String(item.recipient || 'me@example.test');
  item.subject = String(item.subject || '(no subject)');
  item.body = String(item.body || '');
  item.date = item.date || new Date().toISOString();
  item.read = Boolean(item.read);
  item.starred = Boolean(item.starred);
  item.important = Boolean(item.important);
  item.labels = Array.isArray(item.labels) ? item.labels.map(String) : [];
  item.attachments = Array.isArray(item.attachments) ? item.attachments : [];
  item.snoozedUntil = item.snoozedUntil || null;
  item.quotedMessage = item.quotedMessage || null;
  item.bodyHtml = typeof item.bodyHtml === 'string' ? item.bodyHtml : '';
  return item;
}

function loadState() {
  const saved = safeReadJSON(STORAGE_KEY);
  if (saved && Array.isArray(saved.emails)) {
    const base = defaultState();
    return {
      ...base, ...saved,
      emails: saved.emails.map(normalizeEmail),
      labels: Array.isArray(saved.labels) ? saved.labels.map(String) : base.labels,
      profile: { ...base.profile, ...(saved.profile || {}) },
      settings: {
        ...base.settings, ...(saved.settings || {}),
        categories: { ...base.settings.categories, ...((saved.settings || {}).categories || {}) }
      }
    };
  }
  const legacyEmails = safeReadJSON(LEGACY_EMAIL_KEY);
  const legacyLabels = safeReadJSON(LEGACY_LABEL_KEY);
  const base = defaultState();
  if (Array.isArray(legacyEmails) && legacyEmails.length) base.emails = legacyEmails.map(normalizeEmail);
  if (Array.isArray(legacyLabels)) base.labels = legacyLabels.map(String);
  return base;
}

let state = loadState();

/* Buildchore account and Sent-folder initialisation. */
const BUILDCHORE_ACCOUNT = {
  name: 'Buildchore',
  email: 'buildchore.outreach@gmail.com',
  initial: 'B',
  colour: '#d8c8f5'
};
const OUTREACH_BATCH_ID = 'buildchore-ecom-review-intel-20261005-v1';
const OUTREACH_SENT_AT = '2026-10-05T13:04:00.000Z'; // 6:34 PM Asia/Kolkata
const OUTREACH_SUBJECT = 'Introducing E-Com Review Intelligence Pro';
const OUTREACH_BODY = "Hi,\n\nI’m reaching out to introduce E-Com Review Intelligence Pro, a Chrome extension designed to help e-commerce sellers, wholesalers, agencies, and product researchers make smarter, data-driven business decisions.\n\nThe extension combines several powerful capabilities into one workspace:\n\n• Review Intelligence: Review extraction, sentiment analysis, customer feedback summaries, and suspicious review pattern detection.\n• Competitor Research: Product discovery and cross-marketplace price comparisons.\n• Price Intelligence: Local price-history tracking and price movement analysis.\n• Wholesale Sourcing: Manufacturer and supplier discovery through IndiaMART and Alibaba.\n• Product Analysis: Identification of recurring product defects, delivery complaints, and customer preferences.\n• Data Export: Structured Excel and CSV reports for further analysis.\n\nI am currently open to selling the complete source code and project rights to an interested individual, developer, agency, or company looking to build a SaaS platform, a commercial research tool, or another business around this concept.\n\nIf this opportunity interests you, I would be happy to share a comprehensive Technical & Commercial Due Diligence Package, covering the architecture, source-code structure, features, technical capabilities, business potential, and possible commercialization opportunities.\n\nPlease feel free to reach out if you’d like to explore this opportunity.\n\nBest regards,\nBuildchore";
const OUTREACH_BODY_HTML = "<p>Hi,</p>\n<p>I’m reaching out to introduce <strong>E-Com Review Intelligence Pro</strong>, a Chrome extension designed to help e-commerce sellers, wholesalers, agencies, and product researchers make smarter, data-driven business decisions.</p>\n<p>The extension combines several powerful capabilities into one workspace:</p>\n<ul>\n<li><strong>Review Intelligence:</strong> Review extraction, sentiment analysis, customer feedback summaries, and suspicious review pattern detection.</li>\n<li><strong>Competitor Research:</strong> Product discovery and cross-marketplace price comparisons.</li>\n<li><strong>Price Intelligence:</strong> Local price-history tracking and price movement analysis.</li>\n<li><strong>Wholesale Sourcing:</strong> Manufacturer and supplier discovery through IndiaMART and Alibaba.</li>\n<li><strong>Product Analysis:</strong> Identification of recurring product defects, delivery complaints, and customer preferences.</li>\n<li><strong>Data Export:</strong> Structured Excel and CSV reports for further analysis.</li>\n</ul>\n<p>I am currently open to selling the <strong>complete source code and project rights</strong> to an interested individual, developer, agency, or company looking to build a SaaS platform, a commercial research tool, or another business around this concept.</p>\n<p>If this opportunity interests you, I would be happy to share a comprehensive <strong>Technical &amp; Commercial Due Diligence Package</strong>, covering the architecture, source-code structure, features, technical capabilities, business potential, and possible commercialization opportunities.</p>\n<p>Please feel free to reach out if you’d like to explore this opportunity.</p>\n<p>Best regards,<br>Buildchore</p>";
const OUTREACH_RECIPIENTS = [
  {
    "name": "Akshit Sharma",
    "email": "akshit.co@proton.me"
  },
  {
    "name": "Aman Agrawal",
    "email": "aman@dynamicfinds.in"
  },
  {
    "name": "Ishaan Malhotra",
    "email": "ishaan@viralkart.co.in"
  },
  {
    "name": "Rohan Mehta",
    "email": "rohan@trendpulse.in"
  },
  {
    "name": "Kabir Shah",
    "email": "kabir@swiftdrop.co.in"
  },
  {
    "name": "Devansh Joshi",
    "email": "devansh@nextgenecom.in"
  },
  {
    "name": "Aryan Kapoor",
    "email": "aryan@flexretail.in"
  },
  {
    "name": "Yash Vardhan",
    "email": "yash@alphadropship.in"
  },
  {
    "name": "Hrithik Sen",
    "email": "hrithik@primefinds.co.in"
  },
  {
    "name": "Utkarsh Mishra",
    "email": "utkarsh@zephyrstores.in"
  },
  {
    "name": "Gaurav Saxena",
    "email": "gaurav@hustlekart.in"
  },
  {
    "name": "Pranav Reddy",
    "email": "pranav@boltsourcing.in"
  },
  {
    "name": "Shreyas Iyer",
    "email": "shreyas@novadrops.co.in"
  },
  {
    "name": "Ritik Thapa",
    "email": "ritik@urbantrendz.in"
  },
  {
    "name": "Aniket Verma",
    "email": "aniket@flashship.in"
  },
  {
    "name": "Manan Chawla",
    "email": "manan@kwiksell.co.in"
  },
  {
    "name": "Dhruv Singhal",
    "email": "dhruv@genzecom.in"
  },
  {
    "name": "Madhav Nair",
    "email": "madhav@waveretail.in"
  },
  {
    "name": "Akash Das",
    "email": "akash@neoboutique.in"
  },
  {
    "name": "Siddharth Jain",
    "email": "siddharth@apexhustle.in"
  },
  {
    "name": "Rishabh Goel",
    "email": "rishabh@vibecart.in"
  },
  {
    "name": "Ayush Tripathi",
    "email": "ayush@instamerch.in"
  },
  {
    "name": "Tushar Gupta",
    "email": "tushar@quickcut.in"
  },
  {
    "name": "Sameer Sheikh",
    "email": "sameer@trendjacker.co.in"
  },
  {
    "name": "Varun Grover",
    "email": "varun@smartsource.in"
  },
  {
    "name": "Armaan Malik",
    "email": "armaan@nexusdrop.in"
  },
  {
    "name": "Ananya Rao",
    "email": "ananya@aestheticcart.in"
  },
  {
    "name": "Priya Sharma",
    "email": "priya@glamdrop.co.in"
  },
  {
    "name": "Sneha Kulkarni",
    "email": "sneha@chicfinds.in"
  },
  {
    "name": "Diya Mazumdar",
    "email": "diya@trendspotted.in"
  },
  {
    "name": "Riya Bansal",
    "email": "riya@viralvibe.in"
  },
  {
    "name": "Kriti Taneja",
    "email": "kriti@glowkart.co.in"
  },
  {
    "name": "Mehak Kapoor",
    "email": "mehak@cozycorners.in"
  },
  {
    "name": "Tanvi Hegde",
    "email": "tanvi@dazzledrops.in"
  },
  {
    "name": "Isha Khurana",
    "email": "isha@litgadgets.in"
  },
  {
    "name": "Barkha Singh",
    "email": "barkha@velvetvogue.in"
  },
  {
    "name": "Suhana Khan",
    "email": "suhana@pinterestfinds.in"
  },
  {
    "name": "Avani Patel",
    "email": "avani@urbanblink.co.in"
  },
  {
    "name": "Tara Dsouza",
    "email": "tara@curatedcloset.in"
  },
  {
    "name": "Nisha Poddar",
    "email": "nisha@blinkcommerce.in"
  },
  {
    "name": "Simran Kaur",
    "email": "simran@popculturekart.in"
  },
  {
    "name": "Janhvi Kapoor",
    "email": "janhvi@modevogue.in"
  },
  {
    "name": "Khushi Verma",
    "email": "khushi@trinketb2c.in"
  },
  {
    "name": "Alia Sen",
    "email": "alia@charmdrop.co.in"
  },
  {
    "name": "Sara Ali",
    "email": "sara@cozycraze.in"
  },
  {
    "name": "Anushka Pal",
    "email": "anushka@trendytrove.in"
  },
  {
    "name": "Rashmi Desai",
    "email": "rashmi@snugspaces.in"
  },
  {
    "name": "Nidhi Aggarwal",
    "email": "nidhi@quirkycart.in"
  },
  {
    "name": "Pooja Hegde",
    "email": "pooja@luxeboutique.in"
  },
  {
    "name": "Kiara Advani",
    "email": "kiara@minimalistkart.in"
  },
  {
    "name": "Shraddha Das",
    "email": "shraddha@dailydeals.co.in"
  },
  {
    "name": "Rahul Kumar",
    "email": "rahul.dropshiphustle@gmail.com"
  },
  {
    "name": "Amit Verma",
    "email": "amit.trendhunter99@gmail.com"
  },
  {
    "name": "Sneha Jain",
    "email": "sneha.ecomstarters@gmail.com"
  },
  {
    "name": "Vikram Singh",
    "email": "vikram.ecomcut@gmail.com"
  },
  {
    "name": "Divya Sharma",
    "email": "divya.trendsourcing@gmail.com"
  },
  {
    "name": "Abhishek Gupta",
    "email": "abhishek@gmail.com"
  },
  {
    "name": "Neha Reddy",
    "email": "neha.dropshiplabs@gmail.com"
  },
  {
    "name": "Sandeep Joshi",
    "email": "sandeep.winners.daily@gmail.com"
  },
  {
    "name": "Pooja Nair",
    "email": "pooja.smartmerch.in@gmail.com"
  },
  {
    "name": "Arjun Rao",
    "email": "arjun.dropshipking@gmail.com"
  },
  {
    "name": "Kiran Mehta",
    "email": "kiran.ecomspypro@gmail.com"
  },
  {
    "name": "Manoj Mishra",
    "email": "manoj.hustle.drops@gmail.com"
  },
  {
    "name": "Swati Patel",
    "email": "swati.curatedtrends@gmail.com"
  },
  {
    "name": "Gaurav Chawla",
    "email": "gaurav@gmail.com"
  },
  {
    "name": "Deepak Sen",
    "email": "deepak.ecomscale@gmail.com"
  },
  {
    "name": "Rohit Singhal",
    "email": "rohit.dropshipspy@gmail.com"
  },
  {
    "name": "Priyanka Thapa",
    "email": "priyanka.instastore@gmail.com"
  },
  {
    "name": "Varun Goel",
    "email": "varun.ecomhacks@gmail.com"
  },
  {
    "name": "Karan Saxena",
    "email": "karan.dropshipdeals@gmail.com"
  },
  {
    "name": "Simran Shah",
    "email": "simran.trendbazaar@gmail.com"
  },
  {
    "name": "Nathan Agarwal",
    "email": "nathan.dropshiplife@gmail.com"
  },
  {
    "name": "Rachel Kapoor",
    "email": "rachel.ecomsourcing@gmail.com"
  },
  {
    "name": "Jatin Malhotra",
    "email": "jatin.winnerspots@gmail.com"
  },
  {
    "name": "Kunal Tripathi",
    "email": "kunal.quickdropship@gmail.com"
  },
  {
    "name": "Isha Grover",
    "email": "isha.vibekart@gmail.com"
  },
  {
    "name": "Manish Malhotra",
    "email": "manish@stylesutra.in"
  },
  {
    "name": "Sabyasachi Paul",
    "email": "paul@localcraft.co.in"
  },
  {
    "name": "Ritu Kumar",
    "email": "ritu@ethnicdrop.in"
  },
  {
    "name": "Tarun Tahiliani",
    "email": "tarun@modernverve.in"
  },
  {
    "name": "Masaba Gupta",
    "email": "masaba@quirkyapparel.in"
  },
  {
    "name": "Manish Arora",
    "email": "manish@neonvibe.in"
  },
  {
    "name": "Anita Dongre",
    "email": "anita@ecothreads.in"
  },
  {
    "name": "Sandip Khosla",
    "email": "sandip@heritagekart.co.in"
  },
  {
    "name": "Abu Jani",
    "email": "abu@indieluxe.in"
  },
  {
    "name": "Gaurav Gupta",
    "email": "gaurav@futuresculpt.in"
  },
  {
    "name": "JJ Valaya",
    "email": "valaya@royaldropship.in"
  },
  {
    "name": "Rohit Bal",
    "email": "rohit@classicedge.in"
  },
  {
    "name": "Rajesh Pratap",
    "email": "rajesh@minimalthreads.in"
  },
  {
    "name": "Wendell Rodricks",
    "email": "wendell@coastvibe.in"
  },
  {
    "name": "Rina Dhaka",
    "email": "rina@urbandiva.co.in"
  },
  {
    "name": "Suneet Varma",
    "email": "suneet@glitzretail.in"
  },
  {
    "name": "Ashish Soni",
    "email": "ashish@monotonedrops.in"
  },
  {
    "name": "Raghavendra Rathore",
    "email": "raghav@jodhpurheritage.in"
  },
  {
    "name": "Payal Singhal",
    "email": "payal@pastelprint.in"
  },
  {
    "name": "Anamika Khanna",
    "email": "anamika@fusionwear.in"
  },
  {
    "name": "Rocky Star",
    "email": "rocky@streetvibe.in"
  },
  {
    "name": "Shantanu Mehra",
    "email": "shantanu@dapperdrops.co.in"
  },
  {
    "name": "Nikhil Mehra",
    "email": "nikhil@trendvanguard.in"
  },
  {
    "name": "Bibhu Mohapatra",
    "email": "bibhu@globalindie.in"
  },
  {
    "name": "Rahul Mishra",
    "email": "rahul@couturedrop.in"
  }
];

function applyBuildchoreMailboxMigration() {
  let changed = false;
  const nextProfile = { ...(state.profile || {}), ...BUILDCHORE_ACCOUNT };
  if (JSON.stringify(state.profile || {}) !== JSON.stringify(nextProfile)) {
    state.profile = nextProfile;
    changed = true;
  }
  state.migrations = state.migrations || {};

  const oldAddresses = new Set(['me@gmail.com', 'vikas@gmail.com']);
  const beforeLegacySentRemoval = state.emails.length;
  state.emails = state.emails.filter(email => !(String(email.id) === '1008' && email.subject === 'Re: Weekend plans' && email.recipient === 'alex@example.com'));
  if (state.emails.length !== beforeLegacySentRemoval) changed = true;
  state.emails.forEach(email => {
    if (email.batchId === OUTREACH_BATCH_ID && !email.threadId) {
      email.threadId = String(email.id);
      changed = true;
    }
    if (oldAddresses.has(String(email.recipient || '').trim().toLowerCase())) {
      email.recipient = BUILDCHORE_ACCOUNT.email;
      changed = true;
    }
    if (oldAddresses.has(String(email.senderEmail || '').trim().toLowerCase()) ||
        ['You', 'Vikas'].includes(String(email.sender || ''))) {
      email.sender = BUILDCHORE_ACCOUNT.name;
      email.senderEmail = BUILDCHORE_ACCOUNT.email;
      changed = true;
    }
    if (typeof email.cc === 'string' && /\bme@gmail\.com\b/i.test(email.cc)) {
      email.cc = email.cc.replace(/\bme@gmail\.com\b/gi, BUILDCHORE_ACCOUNT.email);
      changed = true;
    }
    if (typeof email.bcc === 'string' && /\bme@gmail\.com\b/i.test(email.bcc)) {
      email.bcc = email.bcc.replace(/\bme@gmail\.com\b/gi, BUILDCHORE_ACCOUNT.email);
      changed = true;
    }
  });

  // Seed once. The marker prevents deleted messages from reappearing on later visits.
  if (!state.migrations.buildchoreOutreachV1) {
    const alreadyAdded = new Set(
      state.emails
        .filter(email => email.batchId === OUTREACH_BATCH_ID)
        .map(email => email.recipientEmail || String(email.recipient || '').match(/<([^>]+)>/)?.[1] || email.recipient)
    );
    const seeded = [];
    OUTREACH_RECIPIENTS.forEach((recipient, index) => {
      if (alreadyAdded.has(recipient.email)) return;
      seeded.push(normalizeEmail({
        id: `outreach-20261005-${index + 1}`,
        threadId: `outreach-20261005-${index + 1}`,
        batchId: OUTREACH_BATCH_ID,
        folder: 'sent',
        category: 'primary',
        sender: BUILDCHORE_ACCOUNT.name,
        senderEmail: BUILDCHORE_ACCOUNT.email,
        recipient: `${recipient.name} <${recipient.email}>`,
        recipientEmail: recipient.email,
        subject: OUTREACH_SUBJECT,
        body: OUTREACH_BODY,
        bodyHtml: OUTREACH_BODY_HTML,
        date: OUTREACH_SENT_AT,
        read: true,
        starred: index === 0,
        important: index === 0,
        labels: index === 0 ? ['Personal'] : [],
        attachments: [],
        quotedMessage: null
      }, index));
    });
    if (seeded.length) {
      state.emails.unshift(...seeded);
      changed = true;
    }
    state.migrations.buildchoreOutreachV1 = true;
    changed = true;
  }

  if (changed) saveState();
}
applyBuildchoreMailboxMigration();

/* Inbox preview fixtures. These are explicitly marked as simulated test records. */
const BUILDCHORE_INBOX_FIXTURE_BATCH = 'buildchore-inbox-preview-202610-v1';

const BUILDCHORE_INBOX_REPLIES = [
  {
    recipientIndex: 0,
    localDate: '2026-10-07T09:24',
    sender: 'Akshit Sharma',
    body: `Hello Buildchore,\n\nThanks for reaching out. I had a look at the overview and the combination of review intelligence with competitor research is particularly interesting. I would like to understand how the extension collects and structures marketplace reviews, and how the price-history feature handles changes across different listings.\n\nCould you share the Technical & Commercial Due Diligence Package, along with a brief walkthrough of the current workflow? It would also help to know which parts are already fully implemented and which areas you see as the next stage of development.\n\nI would be happy to review the material and take the conversation further.\n\nBest regards,\nAkshit`
  },
  {
    recipientIndex: 1,
    localDate: '2026-10-07T10:58',
    sender: 'Aman Agrawal',
    body: `Hi Buildchore,\n\nAppreciate you sharing this. The competitor pricing and product discovery side caught my attention, especially when combined with review summaries rather than looking at price alone.\n\nPlease send across the due diligence package when convenient. I would particularly like to see how the extension compares products across marketplaces, what data is retained locally, and whether the reporting workflow can be adapted for a small research team.\n\nOnce I have gone through the technical details, we can discuss the commercial scope and handover expectations.\n\nRegards,\nAman`
  },
  {
    recipientIndex: 2,
    localDate: '2026-10-07T12:16',
    sender: 'Ishaan Malhotra',
    body: `Hello,\n\nThank you for the introduction. I find the review-analysis angle useful, particularly the attempt to surface recurring complaints and suspicious review patterns. Those insights could make product screening considerably more efficient.\n\nCould you share some example outputs and explain how sentiment is calculated? I would also like to understand the supported marketplaces, the extraction limitations, and how the Excel and CSV exports are structured.\n\nThe source-code acquisition possibility is worth exploring after I have reviewed the architecture and feature breakdown.\n\nBest,\nIshaan`
  },
  {
    recipientIndex: 3,
    localDate: '2026-10-07T14:07',
    sender: 'Rohan Mehta',
    body: `Hi Buildchore,\n\nThis looks like a promising starting point for a more complete e-commerce research product. I am interested in how the current Chrome extension is organised and what would be involved in turning the existing capabilities into a multi-user SaaS service.\n\nPlease share the technical package, including the component architecture, storage approach, dependencies, and any planned integrations. A clear distinction between production-ready functionality and areas that would need additional engineering would be useful.\n\nHappy to review it and discuss the possible next steps.\n\nRegards,\nRohan`
  },
  {
    recipientIndex: 4,
    localDate: '2026-10-07T16:42',
    sender: 'Kabir Shah',
    body: `Hello Buildchore,\n\nThanks for getting in touch. I am interested in the product-research workflow, especially the way customer feedback, product defects, and competitor pricing are brought together in one place.\n\nCould you send the due diligence material and a few representative screenshots or sample reports? I would like to assess the depth of the analysis, the quality of the exported data, and how easily a research team could incorporate the outputs into its existing process.\n\nAfter reviewing that, I can give you a more considered view on the source-code transfer.\n\nBest regards,\nKabir`
  },
  {
    recipientIndex: 5,
    localDate: '2026-10-08T09:36',
    sender: 'Devansh Joshi',
    body: `Hi,\n\nI went through your introduction and would like to learn more about the sourcing side of the extension. The supplier discovery coverage for IndiaMART and Alibaba could be valuable if the results can be organised and compared consistently.\n\nPlease share the architecture and feature documentation, including how supplier details are gathered, what fields are available for export, and what limitations users should expect. I am also interested in the current state of the review and competitor-analysis modules.\n\nLooking forward to reviewing the package.\n\nRegards,\nDevansh`
  },
  {
    recipientIndex: 6,
    localDate: '2026-10-08T11:21',
    sender: 'Aryan Kapoor',
    body: `Hello Buildchore,\n\nThanks for outlining the opportunity. I would be interested in evaluating the complete codebase rather than only the feature list, so the technical handover details will be important.\n\nCould the package include the repository structure, setup instructions, third-party dependencies, current browser permissions, and a list of known limitations? I would also like to understand exactly what project rights and supporting materials are included in the proposed transfer.\n\nPlease send the information over and I will review it.\n\nBest,\nAryan`
  },
  {
    recipientIndex: 7,
    localDate: '2026-10-08T13:48',
    sender: 'Yash Vardhan',
    body: `Hi Buildchore,\n\nThe price intelligence feature is what stood out to me. Tracking local price movement alongside review changes could help identify products that are gaining traction or losing competitiveness.\n\nI would like to see how price history is captured, how frequently it can be refreshed, and whether the tool keeps a usable record when a listing changes. Please include those details in the due diligence package, together with the current roadmap and export examples.\n\nHappy to take a closer look.\n\nRegards,\nYash`
  },
  {
    recipientIndex: 8,
    localDate: '2026-10-08T15:09',
    sender: 'Hrithik Sen',
    body: `Hello,\n\nI appreciate the concise overview. The suspicious-review detection and recurring-defect analysis are interesting areas, but I would want to understand how the tool distinguishes meaningful patterns from noisy or incomplete marketplace data.\n\nPlease share the technical and commercial package, including the analysis workflow, data model, supported sources, and a few examples of the final reports. It would be useful to see the current accuracy checks and any manual review steps as well.\n\nI am open to discussing the opportunity after reviewing those materials.\n\nBest regards,\nHrithik`
  },
  {
    recipientIndex: 9,
    localDate: '2026-10-08T16:26',
    sender: 'Utkarsh Mishra',
    body: `Hi Buildchore,\n\nThank you for sharing this. I can see a possible use case for teams that need product discovery, competitor monitoring, and supplier research without switching between several tools.\n\nCould you send the due diligence package with the present feature status, installation and deployment steps, and the scope of the source-code and rights transfer? I would also be interested in knowing what support or transition period you envisage for someone taking the project forward.\n\nI look forward to going through the details.\n\nRegards,\nUtkarsh`
  }
];

const BUILDCHORE_BOUNCE_FIXTURES = [
  { recipientIndex: 10, localDate: '2026-10-05T18:37' },
  { recipientIndex: 11, localDate: '2026-10-05T18:39' },
  { recipientIndex: 12, localDate: '2026-10-05T18:42' },
  { recipientIndex: 13, localDate: '2026-10-05T18:45' },
  { recipientIndex: 14, localDate: '2026-10-05T18:48' },
  { recipientIndex: 15, localDate: '2026-10-05T18:51' },
  { recipientIndex: 16, localDate: '2026-10-05T18:54' }
];

function istFixtureDateToISO(localDate) {
  // Fixed +05:30 offset keeps the requested India-local timestamps deterministic.
  return new Date(`${localDate}:00+05:30`).toISOString();
}

function fixtureBodyHtml(text) {
  return String(text).split(/\n\s*\n/).map(paragraph =>
    `<p>${escapeHTML(paragraph).replace(/\n/g, '<br>')}</p>`
  ).join('\n');
}

function applyBuildchoreInboxPreviewMigration() {
  state.migrations = state.migrations || {};
  if (state.migrations.buildchoreInboxPreviewV1) return;

  const inserted = [];
  const batchId = BUILDCHORE_INBOX_FIXTURE_BATCH;
  const existingFixtureIds = new Set(
    state.emails.filter(email => email.fixtureBatchId === batchId).map(email => email.fixtureId)
  );

  BUILDCHORE_INBOX_REPLIES.forEach((fixture, index) => {
    const contact = OUTREACH_RECIPIENTS[fixture.recipientIndex];
    if (!contact) return;
    const fixtureId = `reply-${fixture.recipientIndex + 1}`;
    if (existingFixtureIds.has(fixtureId)) return;

    const original = state.emails.find(email =>
      email.batchId === OUTREACH_BATCH_ID && email.recipientEmail === contact.email
    );
    const date = istFixtureDateToISO(fixture.localDate);
    const plainBody = fixture.body;
    const quotedMessage = original ? {
      sender: original.sender,
      senderEmail: original.senderEmail,
      recipient: original.recipient,
      date: original.date,
      body: original.body,
      bodyHtml: original.bodyHtml || ''
    } : null;

    inserted.push(normalizeEmail({
      id: `inbox-preview-${fixtureId}`,
      fixtureId,
      fixtureBatchId: batchId,
      fixtureKind: 'simulated-reply',
      inReplyToId: original ? original.id : null,
      threadId: original ? String(original.id) : `thread-${contact.email}`,
      folder: 'inbox',
      category: 'primary',
      sender: contact.name,
      senderEmail: contact.email,
      recipient: `${BUILDCHORE_ACCOUNT.name} <${BUILDCHORE_ACCOUNT.email}>`,
      subject: `Re: ${OUTREACH_SUBJECT}`,
      body: plainBody,
      bodyHtml: fixtureBodyHtml(fixture.body),
      date,
      read: false,
      starred: index === 0,
      important: index < 3,
      labels: [],
      attachments: [],
      quotedMessage
    }, index));
  });

  BUILDCHORE_BOUNCE_FIXTURES.forEach((fixture, index) => {
    const contact = OUTREACH_RECIPIENTS[fixture.recipientIndex];
    if (!contact) return;
    const fixtureId = `bounce-${fixture.recipientIndex + 1}`;
    if (existingFixtureIds.has(fixtureId)) return;

    const original = state.emails.find(email =>
      email.batchId === OUTREACH_BATCH_ID && email.recipientEmail === contact.email
    );
    const plainBody = `Delivery has failed to the following recipient:\n\n${contact.name} <${contact.email}>\n\nAddress not found\n\nThe receiving mail system reported that the recipient address could not be found.\n\nOriginal subject: ${OUTREACH_SUBJECT}\nOriginal send time: October 5, 2026, 6:34 PM (India Standard Time).`;
    const date = istFixtureDateToISO(fixture.localDate);

    inserted.push(normalizeEmail({
      id: `inbox-preview-${fixtureId}`,
      fixtureId,
      fixtureBatchId: batchId,
      fixtureKind: 'simulated-bounce',
      inReplyToId: original ? original.id : null,
      threadId: original ? String(original.id) : `thread-${contact.email}`,
      folder: 'inbox',
      category: 'primary',
      sender: 'Mail Delivery Subsystem',
      senderEmail: 'mailer-daemon@googlemail.com',
      recipient: `${BUILDCHORE_ACCOUNT.name} <${BUILDCHORE_ACCOUNT.email}>`,
      subject: 'Delivery Status Notification (Failure)',
      body: plainBody,
      bodyHtml: fixtureBodyHtml(plainBody),
      date,
      read: false,
      starred: false,
      important: false,
      labels: [],
      attachments: [],
      quotedMessage: null,
      failedRecipient: contact.email
    }, index));
  });

  if (inserted.length) state.emails.unshift(...inserted);
  state.migrations.buildchoreInboxPreviewV1 = true;
  saveState();
}

applyBuildchoreInboxPreviewMigration();

/* Clean up earlier verbose fixture banners while retaining a compact   marker. */
function cleanExistingInboxFixtureCopy() {
  let changed = false;
  state.emails.forEach(email => {
    if (email.fixtureKind === 'simulated-reply') {
      const cleanBody = String(email.body || '').replace(/^SIMULATED PREVIEW[^\n]*\n\s*\n/i, '');
      if (cleanBody !== email.body) { email.body = cleanBody; changed = true; }
      if (email.bodyHtml && /SIMULATED PREVIEW/i.test(email.bodyHtml)) {
        email.bodyHtml = fixtureBodyHtml(cleanBody);
        changed = true;
      }
    } else if (email.fixtureKind === 'simulated-bounce') {
      let cleanBody = String(email.body || '').replace(/^SIMULATED DELIVERY NOTICE[^\n]*\n\s*\n/i, '');
      cleanBody = cleanBody.replace(/The address could not be located in this simulated delivery report\. No actual delivery attempt or address verification has taken place\./i,
        'The receiving mail system reported that the recipient address could not be found.');
      if (cleanBody !== email.body) { email.body = cleanBody; changed = true; }
      if (email.subject.startsWith('[SIMULATED] ')) { email.subject = email.subject.replace(/^\[SIMULATED\]\s*/, ''); changed = true; }
      if (email.bodyHtml && /SIMULATED DELIVERY NOTICE/i.test(email.bodyHtml)) {
        email.bodyHtml = fixtureBodyHtml(cleanBody);
        changed = true;
      }
    }
    if (email.fixtureKind && !email.testRecord) { email.testRecord = true; changed = true; }
  });
  if (changed) saveState();
}
cleanExistingInboxFixtureCopy();

/* One-time recovery for the generated inbox preview batch if it was archived. */
function restoreArchivedInboxPreviewBatch() {
  state.migrations = state.migrations || {};
  if (state.migrations.buildchorePreviewArchiveRecoveryV1) return;
  let restored = 0;
  state.emails.forEach(email => {
    if (email.fixtureBatchId === BUILDCHORE_INBOX_FIXTURE_BATCH && email.folder === 'archive') {
      email.folder = 'inbox';
      email.snoozedUntil = null;
      restored++;
    }
    if (email.fixtureKind === 'simulated-reply' && email.senderEmail === 'akshit.co@proton.me') {
      email.important = false;
    }
  });
  state.migrations.buildchorePreviewArchiveRecoveryV1 = true;
  state.migrations.buildchorePreviewArchiveRecoveryCount = restored;
  saveState();
}
/* Binary attachments are stored in IndexedDB; localStorage keeps only metadata. */
function openAttachmentDB() {
  if (attachmentDBPromise) return attachmentDBPromise;
  attachmentDBPromise = new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) {
      reject(new Error('This browser does not support persistent attachment storage.'));
      return;
    }
    const request = indexedDB.open(ATTACHMENT_DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(ATTACHMENT_STORE_NAME)) {
        db.createObjectStore(ATTACHMENT_STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Could not open attachment storage.'));
    request.onblocked = () => reject(new Error('Attachment storage is blocked by another open tab.'));
  });
  return attachmentDBPromise;
}

async function storeAttachmentBlob(file, preferredId = null) {
  const db = await openAttachmentDB();
  const id = preferredId || `att-${crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`}`;
  await new Promise((resolve, reject) => {
    const tx = db.transaction(ATTACHMENT_STORE_NAME, 'readwrite');
    tx.objectStore(ATTACHMENT_STORE_NAME).put({
      id, name: file.name || 'attachment', type: file.type || 'application/octet-stream',
      size: file.size || 0, lastModified: file.lastModified || Date.now(), blob: file
    });
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error || new Error('Could not save attachment.'));
    tx.onabort = () => reject(tx.error || new Error('Attachment save was cancelled.'));
  });
  return { id, name: file.name || 'attachment', type: file.type || 'application/octet-stream', size: file.size || 0, lastModified: file.lastModified || Date.now() };
}

async function getStoredAttachment(id) {
  if (!id) return null;
  const db = await openAttachmentDB();
  return new Promise((resolve, reject) => {
    const request = db.transaction(ATTACHMENT_STORE_NAME, 'readonly').objectStore(ATTACHMENT_STORE_NAME).get(id);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error || new Error('Could not read attachment.'));
  });
}

async function deleteStoredAttachment(id) {
  if (!id) return;
  const db = await openAttachmentDB();
  await new Promise((resolve, reject) => {
    const tx = db.transaction(ATTACHMENT_STORE_NAME, 'readwrite');
    tx.objectStore(ATTACHMENT_STORE_NAME).delete(id);
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error || new Error('Could not remove attachment.'));
  });
}

async function addAttachmentFiles(files) {
  const incoming = [...(files || [])];
  const currentSize = composeAttachments.reduce((sum, item) => sum + (Number(item.size) || 0), 0);
  let runningSize = currentSize;
  for (const file of incoming) {
    if (runningSize + file.size > MAX_MESSAGE_ATTACHMENT_BYTES) {
      toast('The combined attachment size limit is 25 MB.');
      break;
    }
    try {
      const meta = await storeAttachmentBlob(file);
      composeAttachments.push(meta);
      runningSize += file.size;
    } catch (error) {
      console.error(error);
      toast(error.message || 'Attachment could not be stored.');
      break;
    }
  }
  renderComposeAttachments();
  await saveDraft(true);
}

async function attachDueDiligencePackage() {
  try {
    const meta = await getBundledDueDiligenceAttachment();
    composeAttachments.push(meta);
    renderComposeAttachments();
    await saveDraft(true);
    toast('Due-diligence package attached.');
  } catch (error) {
    console.error(error);
    toast(error.message || 'Could not attach the due-diligence package.');
  }
}

function attachmentMetadataById(id) {
  for (const email of state.emails) {
    const attachment = (email.attachments || []).find(item => item.id === id);
    if (attachment) return attachment;
  }
  return composeAttachments.find(item => item.id === id) || null;
}

async function previewAttachment(id) {
  const meta = attachmentMetadataById(id);
  if (!meta) { toast('Attachment information is unavailable.'); return; }
  try {
    const stored = await getStoredAttachment(id);
    if (!stored || !stored.blob) {
      toast('This older attachment has metadata only. Attach the file again to preview it.');
      return;
    }
    closeAttachmentPreview();
    activePreviewUrl = URL.createObjectURL(stored.blob);
    const modal = $('#attachment-preview-modal');
    const host = $('#attachment-preview-content');
    host.replaceChildren();
    $('#attachment-preview-title').textContent = stored.name;
    const type = stored.type || meta.type || 'application/octet-stream';
    if (type === 'application/pdf' || stored.name.toLowerCase().endsWith('.pdf')) {
      const frame = document.createElement('iframe');
      frame.className = 'attachment-pdf-frame';
      frame.title = `Preview of ${stored.name}`;
      frame.src = activePreviewUrl;
      host.append(frame);
    } else if (type.startsWith('image/')) {
      const image = document.createElement('img');
      image.className = 'attachment-image-preview';
      image.alt = stored.name;
      image.src = activePreviewUrl;
      host.append(image);
    } else if (type.startsWith('text/')) {
      const pre = document.createElement('pre');
      pre.className = 'attachment-text-preview';
      pre.textContent = await stored.blob.text();
      host.append(pre);
    } else if (type.startsWith('audio/')) {
      const audio = document.createElement('audio'); audio.controls = true; audio.src = activePreviewUrl; host.append(audio);
    } else if (type.startsWith('video/')) {
      const video = document.createElement('video'); video.controls = true; video.src = activePreviewUrl; video.className = 'attachment-video-preview'; host.append(video);
    } else {
      const notice = document.createElement('div'); notice.className = 'attachment-preview-fallback';
      const icon = document.createElement('span'); icon.className = 'mi'; icon.textContent = 'description';
      const text = document.createElement('p'); text.textContent = 'Preview is not available for this file type. You can download the original attachment.';
      notice.append(icon, text); host.append(notice);
    }
    const download = $('#attachment-preview-download');
    download.href = activePreviewUrl;
    download.download = stored.name;
    modal.classList.remove('hidden');
  } catch (error) {
    console.error(error);
    toast(error.message || 'Could not open the attachment.');
  }
}

function closeAttachmentPreview(revoke = true) {
  $('#attachment-preview-modal')?.classList.add('hidden');
  if (revoke && activePreviewUrl) URL.revokeObjectURL(activePreviewUrl);
  if (revoke) activePreviewUrl = null;
  const host = $('#attachment-preview-content');
  if (host) host.replaceChildren();
}

function htmlToPlainText(html) {
  const parsed = new DOMParser().parseFromString(String(html || ''), 'text/html');
  return (parsed.body.innerText || parsed.body.textContent || '').replace(/\u00a0/g, ' ').trimEnd();
}

function sanitizeComposerHTML(html) {
  const parser = new DOMParser();
  const parsed = parser.parseFromString(String(html || ''), 'text/html');
  const allowed = new Set(['P','BR','STRONG','B','EM','I','U','S','UL','OL','LI','BLOCKQUOTE','DIV','SPAN','A']);
  const clean = node => {
    if (node.nodeType === Node.TEXT_NODE) return document.createTextNode(node.nodeValue || '');
    if (node.nodeType !== Node.ELEMENT_NODE) return document.createDocumentFragment();
    if (node.tagName === 'FONT') {
      const span = document.createElement('span');
      const color = node.getAttribute('color') || '';
      if (color && CSS.supports('color', color)) span.style.color = color;
      const sizes = { '1': '10px', '2': '13px', '3': '16px', '4': '18px', '5': '24px', '6': '32px', '7': '48px' };
      const size = sizes[node.getAttribute('size') || ''];
      if (size) span.style.fontSize = size;
      [...node.childNodes].forEach(child => span.append(clean(child)));
      return span;
    }
    if (!allowed.has(node.tagName)) {
      const frag = document.createDocumentFragment();
      [...node.childNodes].forEach(child => frag.append(clean(child)));
      return frag;
    }
    const element = document.createElement(node.tagName.toLowerCase());
    if (node.tagName === 'A') {
      const href = node.getAttribute('href') || '';
      if (/^https?:\/\//i.test(href)) { element.href = href; element.target = '_blank'; element.rel = 'noopener noreferrer'; }
    }
    if (node.tagName === 'SPAN') {
      const color = node.style.color;
      if (color && CSS.supports('color', color)) element.style.color = color;
      const size = node.style.fontSize;
      if (size && /^(?:\d+(?:\.\d+)?px|\d+(?:\.\d+)?em|\d+(?:\.\d+)?rem)$/.test(size)) element.style.fontSize = size;
    }
    if (['P','DIV','BLOCKQUOTE'].includes(node.tagName)) {
      const align = node.style.textAlign;
      if (['left','center','right','justify'].includes(align)) element.style.textAlign = align;
    }
    [...node.childNodes].forEach(child => element.append(clean(child)));
    return element;
  };
  const root = document.createElement('div');
  [...parsed.body.childNodes].forEach(node => root.append(clean(node)));
  return root.innerHTML;
}

function getComposerContent() {
  const editor = $('#compose-body');
  const bodyHtml = sanitizeComposerHTML(editor.innerHTML);
  return { bodyHtml, body: htmlToPlainText(bodyHtml) };
}

function plainTextToComposerHTML(text) {
  return String(text || '').split(/\n\s*\n/).map(paragraph =>
    `<p>${escapeHTML(paragraph).replace(/\n/g, '<br>')}</p>`
  ).join('');
}

function setComposerContent(body, bodyHtml = '') {
  const editor = $('#compose-body');
  if (bodyHtml) editor.innerHTML = sanitizeComposerHTML(bodyHtml);
  else editor.innerHTML = plainTextToComposerHTML(body);
}

function insertAcquisitionResponseTemplate() {
  const html = `<p>Hello,</p>
<p>Thank you for your interest in <strong>E-Com Review Intelligence Pro</strong>. I appreciate you taking the time to explore the project and its potential.</p>
<p>I'm happy to share the <strong>Technical &amp; Commercial Due Diligence Package</strong>, which provides a detailed overview of the project's architecture, features, source-code structure, technical implementation, current capabilities, and potential opportunities for further development and commercialization.</p>
<p>Regarding the acquisition, I am currently open to transferring the complete source code and associated project assets to the right buyer who sees value in developing this into a larger product, SaaS platform, or commercial solution.</p>
<p>To help me understand your expectations and determine whether we are aligned, may I also ask what approximate budget or acquisition valuation you have in mind for purchasing the complete source code and project?</p>
<p>I'm open to discussing a mutually beneficial arrangement depending on the proposed valuation, acquisition scope, and terms.</p>
<p>Looking forward to hearing your thoughts.</p>
<p>Best regards,<br>Buildchore</p>`;
  setComposerContent('', html);
  $('#compose-body').focus();
  saveDraft(true);
}

/* Personalized response drafts linked to the ten incoming enquiry-preview threads. */
const BUILDCHORE_REPLY_DRAFT_BATCH = 'buildchore-response-drafts-20261104-v1';
const BUILDCHORE_REPLY_PERSONAL_LINES = [
  'I can address your questions about review extraction, normalization, and how price observations are retained, including the boundaries of the current implementation.',
  'I will highlight the competitor-comparison workflow, the way local research data is retained, and how reports can be adapted for a small research team.',
  'I will include further detail on the sentiment and complaint-classification approach, the supported sources, and the structure of the Excel and CSV exports.',
  'I will explain the current extension architecture and distinguish the functionality already present from the engineering work needed for a multi-user SaaS platform.',
  'I will point out the product-analysis workflow and the structure of the exported reports so you can assess how they could fit into a research process.',
  'I will cover the IndiaMART and Alibaba sourcing workflow, including the distinction between search discovery and independently verified supplier information.',
  'I will include the repository and setup overview, dependencies, browser permissions, current limitations, and the proposed source-code transfer scope.',
  'I will explain how price observations are recorded from the point tracking begins, what the local history represents, and the limitations of the current approach.',
  'I will cover how the review-pattern indicators work, what they can and cannot establish, and where human review remains important.',
  'I will outline the present feature set, installation and handover information, and the possible transition steps for someone taking the project forward.'
];

function buildPersonalizedReplyHtml(contact, personalLine) {
  const firstName = String(contact.name || '').trim().split(/\s+/)[0] || 'there';
  return `<p>Hello ${escapeHTML(firstName)},</p>
<p>Thank you for your interest in <strong>E-Com Review Intelligence Pro</strong>. I appreciate you taking the time to explore the project and its potential.</p>
<p>I'm happy to share the <strong>Technical &amp; Commercial Due Diligence Package</strong>, attached to this reply. It provides a detailed overview of the project's architecture, features, source-code structure, technical implementation, current capabilities, and potential opportunities for further development and commercialization.</p>
<p>${escapeHTML(personalLine)}</p>
<p>Regarding the acquisition, I am currently open to transferring the complete source code and associated project assets to the right buyer who sees value in developing this into a larger product, SaaS platform, or commercial solution.</p>
<p>To help me understand your expectations and determine whether we are aligned, may I also ask what approximate budget or acquisition valuation you have in mind for purchasing the complete source code and project?</p>
<p>I'm open to discussing a mutually beneficial arrangement depending on the proposed valuation, acquisition scope, and terms.</p>
<p>Looking forward to hearing your thoughts.</p>
<p>Best regards,<br>Buildchore</p>`;
}

function buildPersonalizedReplyPlain(contact, personalLine) {
  const firstName = String(contact.name || '').trim().split(/\s+/)[0] || 'there';
  return `Hello ${firstName},\n\nThank you for your interest in E-Com Review Intelligence Pro. I appreciate you taking the time to explore the project and its potential.\n\nI'm happy to share the Technical & Commercial Due Diligence Package, attached to this reply. It provides a detailed overview of the project's architecture, features, source-code structure, technical implementation, current capabilities, and potential opportunities for further development and commercialization.\n\n${personalLine}\n\nRegarding the acquisition, I am currently open to transferring the complete source code and associated project assets to the right buyer who sees value in developing this into a larger product, SaaS platform, or commercial solution.\n\nTo help me understand your expectations and determine whether we are aligned, may I also ask what approximate budget or acquisition valuation you have in mind for purchasing the complete source code and project?\n\nI'm open to discussing a mutually beneficial arrangement depending on the proposed valuation, acquisition scope, and terms.\n\nLooking forward to hearing your thoughts.\n\nBest regards,\nBuildchore`;
}

async function seedPersonalizedReplyDrafts() {
  state.migrations = state.migrations || {};
  if (state.migrations.buildchoreReplyDraftsV1) return;

  const incoming = state.emails
    .filter(email => email.fixtureBatchId === BUILDCHORE_INBOX_FIXTURE_BATCH && email.fixtureKind === 'simulated-reply')
    .sort((a, b) => Number(String(a.fixtureId || '').split('-').at(-1)) - Number(String(b.fixtureId || '').split('-').at(-1)));
  if (!incoming.length) return;

  try {
    const attachmentMeta = await getBundledDueDiligenceAttachment();

    const created = [];
    incoming.forEach((message, index) => {
      // Do not overwrite user edits or regenerate a draft they have already removed.
      const existing = state.emails.find(email => email.replyToId && String(email.replyToId) === String(message.id) && email.replyDraftBatchId === BUILDCHORE_REPLY_DRAFT_BATCH);
      if (existing) {
        if (!existing.attachments?.some(file => file.id === attachmentMeta.id)) {
          existing.attachments = [...(existing.attachments || []), attachmentMeta];
        }
        message.replyDraftId = existing.id;
        return;
      }
      const contact = OUTREACH_RECIPIENTS.find(item => item.email.toLowerCase() === String(message.senderEmail).toLowerCase()) || {
        name: message.sender, email: message.senderEmail
      };
      const personalLine = BUILDCHORE_REPLY_PERSONAL_LINES[index % BUILDCHORE_REPLY_PERSONAL_LINES.length];
      const bodyHtml = buildPersonalizedReplyHtml(contact, personalLine);
      const body = buildPersonalizedReplyPlain(contact, personalLine);
      const original = quoteSnapshot(message);
      const draft = normalizeEmail({
        id: `buildchore-reply-draft-${index + 1}`,
        folder: 'drafts',
        category: 'primary',
        sender: BUILDCHORE_ACCOUNT.name,
        senderEmail: BUILDCHORE_ACCOUNT.email,
        recipient: `${contact.name} <${contact.email}>`,
        recipientEmail: contact.email,
        subject: /^re:/i.test(message.subject) ? message.subject : `Re: ${message.subject}`,
        body,
        bodyHtml,
        date: new Date().toISOString(),
        read: true,
        starred: false,
        important: false,
        labels: [],
        attachments: [attachmentMeta],
        quotedMessage: original,
        threadId: String(message.threadId || message.inReplyToId || message.id),
        replyToId: message.id,
        replyDraftBatchId: BUILDCHORE_REPLY_DRAFT_BATCH,
        isThreadReplyDraft: true
      }, index);
      message.threadId = draft.threadId;
      message.replyDraftId = draft.id;
      created.push(draft);
    });

    if (created.length) state.emails.unshift(...created);
    state.migrations.buildchoreReplyDraftsV1 = true;
    state.migrations.buildchoreReplyDraftsCount = incoming.length;
    state.migrations.buildchoreReplyDraftsAttachment = attachmentMeta.name;
    saveState();
    renderEmails();
    if (view.activeId) {
      const active = activeEmail();
      if (active) renderDetail(active);
    }
    toast(`${created.length} personalized reply drafts prepared with the PDF attached`);
  } catch (error) {
    console.error('Could not prepare linked reply drafts', error);
    toast(error.message || 'Could not prepare the reply drafts. Check that the PDF is in the assets folder.');
  }
}

/* Convert the ten linked response drafts into the requested third conversation layer.
   These are local test-fixture messages, visibly identified as  . */
const BUILDCHORE_THIRD_LAYER_BATCH = 'buildchore-third-layer-sent-20261104-v1';

function stableReplyDelayMinutes(id) {
  // Deterministic 30–60 minute delay, stable across reloads and devices.
  const value = String(id).split('').reduce((sum, char) => (sum * 31 + char.charCodeAt(0)) >>> 0, 7);
  return 30 + (value % 31);
}

async function ensureThirdLayerReplies() {
  state.migrations = state.migrations || {};

  const recipientSet = new Set(OUTREACH_RECIPIENTS.map(person => person.email.toLowerCase()));
  const incoming = state.emails
    .filter(email => {
      const sender = String(email.senderEmail || '').toLowerCase();
      const isKnownReply = email.fixtureKind === 'simulated-reply' ||
        (String(email.id || '').startsWith('inbox-preview-reply-') && recipientSet.has(sender));
      return isKnownReply && email.folder !== 'trash' && email.folder !== 'spam';
    })
    .sort((a, b) => String(a.fixtureId || a.id || '').localeCompare(String(b.fixtureId || b.id || ''), undefined, { numeric: true }));
  if (!incoming.length) return;

  // Reuse the PDF-backed drafts created by the earlier version. If a prior
  // migration marked itself complete before creating all drafts, repair the
  // missing records instead of trusting that stale marker.
  let attachmentMeta = null;
  const getPdfAttachment = async () => {
    if (attachmentMeta) return attachmentMeta;
    const anyExisting = state.emails.find(item =>
      item.replyDraftBatchId === BUILDCHORE_REPLY_DRAFT_BATCH ||
      item.replySentBatchId === BUILDCHORE_THIRD_LAYER_BATCH
    );
    attachmentMeta = anyExisting?.attachments?.find(file => file.type === 'application/pdf') || null;
    if (attachmentMeta) {
      try {
        if (await getStoredAttachment(attachmentMeta.id)) return attachmentMeta;
      } catch (_) { /* restore from bundled asset below */ }
    }
    attachmentMeta = await getBundledDueDiligenceAttachment();
    return attachmentMeta;
  };

  let repaired = 0;
  for (let index = 0; index < incoming.length; index++) {
    const message = incoming[index];
    const original = state.emails.find(item =>
      item.batchId === OUTREACH_BATCH_ID &&
      String(item.recipientEmail || '').toLowerCase() === String(message.senderEmail || '').toLowerCase()
    );
    const threadId = String(original?.threadId || original?.id || message.threadId || message.id);
    message.threadId = threadId;

    let reply = state.emails.find(item =>
      String(item.replyToId || '') === String(message.id) &&
      (item.replyDraftBatchId === BUILDCHORE_REPLY_DRAFT_BATCH ||
       item.replySentBatchId === BUILDCHORE_THIRD_LAYER_BATCH ||
       item.isThreadReplyDraft || item.isThreadReplySent)
    );

    const contact = OUTREACH_RECIPIENTS.find(item =>
      item.email.toLowerCase() === String(message.senderEmail || '').toLowerCase()
    ) || { name: message.sender, email: message.senderEmail };
    const personalLine = BUILDCHORE_REPLY_PERSONAL_LINES[index % BUILDCHORE_REPLY_PERSONAL_LINES.length];

    if (!reply) {
      const pdf = await getPdfAttachment();
      reply = normalizeEmail({
        id: `buildchore-third-layer-${index + 1}`,
        folder: 'sent',
        category: 'primary',
        sender: BUILDCHORE_ACCOUNT.name,
        senderEmail: BUILDCHORE_ACCOUNT.email,
        recipient: `${contact.name} <${contact.email}>`,
        recipientEmail: contact.email,
        subject: /^re:/i.test(message.subject) ? message.subject : `Re: ${message.subject}`,
        body: buildPersonalizedReplyPlain(contact, personalLine),
        bodyHtml: buildPersonalizedReplyHtml(contact, personalLine),
        date: new Date().toISOString(),
        read: true,
        starred: false,
        important: false,
        labels: [],
        attachments: [pdf],
        threadId,
        replyToId: message.id,
        replySentBatchId: BUILDCHORE_THIRD_LAYER_BATCH,
        isThreadReplySent: true,
        fixtureKind: 'simulated-outbound',
        fixtureBatchId: BUILDCHORE_THIRD_LAYER_BATCH,
        testRecord: true
      }, index);
      state.emails.push(reply);
    }

    const receivedAt = new Date(message.date);
    if (Number.isNaN(receivedAt.getTime())) continue;
    const sentAt = new Date(receivedAt.getTime() + stableReplyDelayMinutes(reply.id) * 60000);

    reply.folder = 'sent';
    reply.date = sentAt.toISOString();
    reply.sender = BUILDCHORE_ACCOUNT.name;
    reply.senderEmail = BUILDCHORE_ACCOUNT.email;
    reply.recipient = `${contact.name} <${contact.email}>`;
    reply.recipientEmail = contact.email;
    reply.threadId = threadId;
    reply.replyToId = message.id;
    reply.replyDraftBatchId = undefined;
    reply.replySentBatchId = BUILDCHORE_THIRD_LAYER_BATCH;
    reply.isThreadReplyDraft = false;
    reply.isThreadReplySent = true;
    reply.fixtureKind = 'simulated-outbound';
    reply.fixtureBatchId = BUILDCHORE_THIRD_LAYER_BATCH;
    reply.testRecord = true;
    reply.read = true;
    reply.starred = false;
    reply.important = false;
    reply.subject = /^re:/i.test(message.subject) ? message.subject : `Re: ${message.subject}`;

    if (!Array.isArray(reply.attachments) || !reply.attachments.length) {
      reply.attachments = [await getPdfAttachment()];
    }
    message.replySentId = reply.id;
    repaired++;
  }

  state.migrations.buildchoreThirdLayerSentV2 = true;
  state.migrations.buildchoreThirdLayerSentCount = repaired;
  // Keep the old marker for backward compatibility, but never use it to skip
  // the integrity check above.
  state.migrations.buildchoreThirdLayerSentV1 = true;
  saveState();
}


/* Fourth-layer buyer-offer fixtures: private simulator records, explicitly marked in metadata. */
const BUILDCHORE_FOURTH_LAYER_BATCH = 'buildchore-fourth-layer-buyer-offers-20261104-v1';
const BUILDCHORE_BUYER_OFFER_FIXTURES = [
  {
    recipientEmail: 'akshit.co@proton.me', amount: 15000, localDate: '2026-10-30T11:16',
    body: `Hello Buildchore,\n\nThank you for sharing the due-diligence material. I have reviewed the scope and would like to move forward with the acquisition discussion.\n\nI am prepared to offer ₹15,000 for the complete source code and the associated project assets, subject to the handover matching the scope we have discussed. The review intelligence, competitor research, and sourcing workflows are particularly relevant to what I have in mind.\n\nPlease send me the invoice along with the complete handover folder, including the source files, setup notes, and the supporting documentation. Once I receive and verify the package, I am ready to arrange the payment promptly so that we can complete the transfer without unnecessary delay.\n\nI would appreciate it if you could share the invoice and folder at your earliest convenience.\n\nBest regards,\nAkshit`
  },
  {
    recipientEmail: 'rohan@trendpulse.in', amount: 10000, localDate: '2026-10-14T14:22',
    body: `Hello Buildchore,\n\nI have now had an opportunity to review the technical overview and consider how the existing project could fit into our product research workflow. I am interested in proceeding with the source-code acquisition.\n\nI would be comfortable proposing ₹10,000 for the complete project package, including the current codebase and the related handover materials. Before closing, please share the invoice and a single folder containing the final source files, installation instructions, and the documentation required to get the project running.\n\nIf the package is in line with the outline already shared, I can prioritise the payment as soon as the invoice and handover folder are received.\n\nPlease let me know when you can send these across.\n\nRegards,\nRohan`
  },
  {
    recipientEmail: 'utkarsh@zephyrstores.in', amount: 7000, localDate: '2026-10-23T10:47',
    body: `Hi Buildchore,\n\nThank you for the detailed response and the due-diligence package. I have reviewed the material and can see a practical starting point for the product discovery and competitor monitoring use cases we discussed.\n\nI would like to put forward ₹7,000 for the complete source-code package and the associated project files. If that works for you, please prepare the invoice and share the handover folder with the source code, setup guidance, and available project documentation.\n\nI am keen to keep the process moving. Once the invoice and complete folder are received and the contents have been checked, I can arrange payment promptly and coordinate the remaining transfer details.\n\nLooking forward to your confirmation.\n\nBest regards,\nUtkarsh`
  }
];

async function ensureFourthLayerBuyerOffers() {
  state.migrations = state.migrations || {};
  let changed = false;
  for (const fixture of BUILDCHORE_BUYER_OFFER_FIXTURES) {
    const contact = OUTREACH_RECIPIENTS.find(person => person.email.toLowerCase() === fixture.recipientEmail.toLowerCase());
    if (!contact) continue;
    const incoming = state.emails.find(item =>
      String(item.senderEmail || '').toLowerCase() === fixture.recipientEmail.toLowerCase() &&
      item.fixtureKind === 'simulated-reply' && !['trash', 'spam'].includes(item.folder));
    if (!incoming) continue;
    const thirdLayer = state.emails.find(item =>
      String(item.replyToId || '') === String(incoming.id) &&
      (item.replySentBatchId === BUILDCHORE_THIRD_LAYER_BATCH || item.isThreadReplySent === true || item.folder === 'sent'));
    if (!thirdLayer) continue;
    const offerId = `buildchore-fourth-layer-${fixture.recipientEmail.replace(/[^a-z0-9]+/gi, '-')}`;
    let offer = state.emails.find(item => String(item.id) === offerId);
    if (!offer) {
      offer = normalizeEmail({
        id: offerId, fixtureId: `buyer-offer-${fixture.recipientEmail}`,
        fixtureBatchId: BUILDCHORE_FOURTH_LAYER_BATCH, fixtureKind: 'simulated-buyer-offer', testRecord: true,
        folder: 'inbox', category: 'primary', sender: contact.name, senderEmail: contact.email,
        recipient: `${BUILDCHORE_ACCOUNT.name} <${BUILDCHORE_ACCOUNT.email}>`, recipientEmail: BUILDCHORE_ACCOUNT.email,
        subject: /^re:/i.test(thirdLayer.subject) ? thirdLayer.subject : `Re: ${thirdLayer.subject}`,
        body: fixture.body, bodyHtml: fixtureBodyHtml(fixture.body), date: istFixtureDateToISO(fixture.localDate),
        read: false, starred: false, important: false, labels: [], attachments: [],
        threadId: String(thirdLayer.threadId || incoming.threadId || incoming.id),
        replyToId: thirdLayer.id, inReplyToId: thirdLayer.id,
        simulatedOfferAmountINR: fixture.amount, buyerOfferBatchId: BUILDCHORE_FOURTH_LAYER_BATCH
      });
      state.emails.push(offer); changed = true;
    } else {
      if (!offer.threadId) { offer.threadId = String(thirdLayer.threadId || incoming.threadId || incoming.id); changed = true; }
      if (!offer.replyToId) { offer.replyToId = thirdLayer.id; changed = true; }
      if (!offer.inReplyToId) { offer.inReplyToId = thirdLayer.id; changed = true; }
      if (!offer.fixtureKind) { offer.fixtureKind = 'simulated-buyer-offer'; changed = true; }
      if (!offer.fixtureBatchId) { offer.fixtureBatchId = BUILDCHORE_FOURTH_LAYER_BATCH; changed = true; }
      if (offer.testRecord !== true) { offer.testRecord = true; changed = true; }
    }
    if (!thirdLayer.replySentId) thirdLayer.replySentId = offer.id;
  }
  state.migrations.buildchoreFourthLayerBuyerOffersV1 = true;
  state.migrations.buildchoreFourthLayerBuyerOfferCount = state.emails.filter(item => item.fixtureBatchId === BUILDCHORE_FOURTH_LAYER_BATCH).length;
  saveState();
}
/* Refresh the original starter messages when an older browser save is present. */
const starterCopyFixes = {
  '1001': { body: 'We noticed a new sign-in to your Google Account from a new device. If this was you, no further action is required.' },
  '1003': { body: 'Here is a summary of recent activity from your professional network.' },
  '1004': { body: 'Explore our latest offers and recommendations selected for you.' },
  '1005': { body: 'A document has been shared with you. Open the attachment to review the details.' },
  '1007': { body: 'Your package containing the items in your order #402-192381 has been shipped.' },
  '1010': { subject: 'You have won a prize', body: 'Your account has been selected. Review the details of this message carefully.' },
  '1011': { body: 'Restore this message to return it to the Inbox or permanently delete it.' },
  '1012': { body: 'Open this draft to continue editing your message.' }
};

state.emails.forEach(email => {
  const replacement = starterCopyFixes[String(email.id)];
  if (replacement && /demo|fictional|sample|simulated/i.test(`${email.subject} ${email.body}`)) {
    Object.assign(email, replacement);
  }
});
let view = { folder: 'inbox', category: 'primary', query: '', page: 1, pageSize: 10, activeId: null, searchChips: [], settingsTab: 'General' };
let selectedIds = new Set();
let currentComposeId = null;
let composeAttachments = [];
let composeReplyQuote = null;
let composeReplyMeta = null;
let composeSaveTimer = null;
let toastTimer = null;
let settingsOriginFolder = 'inbox';
let adminLogoClicks = 0;
let attachmentDBPromise = null;
let activePreviewUrl = null;
const MAX_MESSAGE_ATTACHMENT_BYTES = 25 * 1024 * 1024;
const ATTACHMENT_DB_NAME = 'buildchore-mail-attachments-v1';
const ATTACHMENT_STORE_NAME = 'files';

const DUE_DILIGENCE_FILE = 'ECom-Review-Intelligence-Pro-Technical-Commercial-Due-Diligence.pdf';

// The PDF is embedded as a fallback so the app does not depend on a fragile
// relative fetch path (which can fail on nested Cloudflare Pages routes).
const DUE_DILIGENCE_PDF_BASE64 = 'JVBERi0xLjQKJZOMi54gUmVwb3J0TGFiIEdlbmVyYXRlZCBQREYgZG9jdW1lbnQgKG9wZW5zb3VyY2UpCjEgMCBvYmoKPDwKL0YxIDIgMCBSIC9GMiAzIDAgUiAvRjMgOSAwIFIgL0Y0IDEzIDAgUgo+PgplbmRvYmoKMiAwIG9iago8PAovQmFzZUZvbnQgL0hlbHZldGljYSAvRW5jb2RpbmcgL1dpbkFuc2lFbmNvZGluZyAvTmFtZSAvRjEgL1N1YnR5cGUgL1R5cGUxIC9UeXBlIC9Gb250Cj4+CmVuZG9iagozIDAgb2JqCjw8Ci9CYXNlRm9udCAvSGVsdmV0aWNhLUJvbGQgL0VuY29kaW5nIC9XaW5BbnNpRW5jb2RpbmcgL05hbWUgL0YyIC9TdWJ0eXBlIC9UeXBlMSAvVHlwZSAvRm9udAo+PgplbmRvYmoKNCAwIG9iago8PAovQ29udGVudHMgMjEgMCBSIC9NZWRpYUJveCBbIDAgMCA1OTUuMjc1NiA4NDEuODg5OCBdIC9QYXJlbnQgMjAgMCBSIC9SZXNvdXJjZXMgPDwKL0ZvbnQgMSAwIFIgL1Byb2NTZXQgWyAvUERGIC9UZXh0IC9JbWFnZUIgL0ltYWdlQyAvSW1hZ2VJIF0KPj4gL1JvdGF0ZSAwIC9UcmFucyA8PAoKPj4gCiAgL1R5cGUgL1BhZ2UKPj4KZW5kb2JqCjUgMCBvYmoKPDwKL0NvbnRlbnRzIDIyIDAgUiAvTWVkaWFCb3ggWyAwIDAgNTk1LjI3NTYgODQxLjg4OTggXSAvUGFyZW50IDIwIDAgUiAvUmVzb3VyY2VzIDw8Ci9Gb250IDEgMCBSIC9Qcm9jU2V0IFsgL1BERiAvVGV4dCAvSW1hZ2VCIC9JbWFnZUMgL0ltYWdlSSBdCj4+IC9Sb3RhdGUgMCAvVHJhbnMgPDwKCj4+IAogIC9UeXBlIC9QYWdlCj4+CmVuZG9iago2IDAgb2JqCjw8Ci9Db250ZW50cyAyMyAwIFIgL01lZGlhQm94IFsgMCAwIDU5NS4yNzU2IDg0MS44ODk4IF0gL1BhcmVudCAyMCAwIFIgL1Jlc291cmNlcyA8PAovRm9udCAxIDAgUiAvUHJvY1NldCBbIC9QREYgL1RleHQgL0ltYWdlQiAvSW1hZ2VDIC9JbWFnZUkgXQo+PiAvUm90YXRlIDAgL1RyYW5zIDw8Cgo+PiAKICAvVHlwZSAvUGFnZQo+PgplbmRvYmoKNyAwIG9iago8PAovQ29udGVudHMgMjQgMCBSIC9NZWRpYUJveCBbIDAgMCA1OTUuMjc1NiA4NDEuODg5OCBdIC9QYXJlbnQgMjAgMCBSIC9SZXNvdXJjZXMgPDwKL0ZvbnQgMSAwIFIgL1Byb2NTZXQgWyAvUERGIC9UZXh0IC9JbWFnZUIgL0ltYWdlQyAvSW1hZ2VJIF0KPj4gL1JvdGF0ZSAwIC9UcmFucyA8PAoKPj4gCiAgL1R5cGUgL1BhZ2UKPj4KZW5kb2JqCjggMCBvYmoKPDwKL0NvbnRlbnRzIDI1IDAgUiAvTWVkaWFCb3ggWyAwIDAgNTk1LjI3NTYgODQxLjg4OTggXSAvUGFyZW50IDIwIDAgUiAvUmVzb3VyY2VzIDw8Ci9Gb250IDEgMCBSIC9Qcm9jU2V0IFsgL1BERiAvVGV4dCAvSW1hZ2VCIC9JbWFnZUMgL0ltYWdlSSBdCj4+IC9Sb3RhdGUgMCAvVHJhbnMgPDwKCj4+IAogIC9UeXBlIC9QYWdlCj4+CmVuZG9iago5IDAgb2JqCjw8Ci9CYXNlRm9udCAvQ291cmllciAvRW5jb2RpbmcgL1dpbkFuc2lFbmNvZGluZyAvTmFtZSAvRjMgL1N1YnR5cGUgL1R5cGUxIC9UeXBlIC9Gb250Cj4+CmVuZG9iagoxMCAwIG9iago8PAovQ29udGVudHMgMjYgMCBSIC9NZWRpYUJveCBbIDAgMCA1OTUuMjc1NiA4NDEuODg5OCBdIC9QYXJlbnQgMjAgMCBSIC9SZXNvdXJjZXMgPDwKL0ZvbnQgMSAwIFIgL1Byb2NTZXQgWyAvUERGIC9UZXh0IC9JbWFnZUIgL0ltYWdlQyAvSW1hZ2VJIF0KPj4gL1JvdGF0ZSAwIC9UcmFucyA8PAoKPj4gCiAgL1R5cGUgL1BhZ2UKPj4KZW5kb2JqCjExIDAgb2JqCjw8Ci9Db250ZW50cyAyNyAwIFIgL01lZGlhQm94IFsgMCAwIDU5NS4yNzU2IDg0MS44ODk4IF0gL1BhcmVudCAyMCAwIFIgL1Jlc291cmNlcyA8PAovRm9udCAxIDAgUiAvUHJvY1NldCBbIC9QREYgL1RleHQgL0ltYWdlQiAvSW1hZ2VDIC9JbWFnZUkgXQo+PiAvUm90YXRlIDAgL1RyYW5zIDw8Cgo+PiAKICAvVHlwZSAvUGFnZQo+PgplbmRvYmoKMTIgMCBvYmoKPDwKL0NvbnRlbnRzIDI4IDAgUiAvTWVkaWFCb3ggWyAwIDAgNTk1LjI3NTYgODQxLjg4OTggXSAvUGFyZW50IDIwIDAgUiAvUmVzb3VyY2VzIDw8Ci9Gb250IDEgMCBSIC9Qcm9jU2V0IFsgL1BERiAvVGV4dCAvSW1hZ2VCIC9JbWFnZUMgL0ltYWdlSSBdCj4+IC9Sb3RhdGUgMCAvVHJhbnMgPDwKCj4+IAogIC9UeXBlIC9QYWdlCj4+CmVuZG9iagoxMyAwIG9iago8PAovQmFzZUZvbnQgL1phcGZEaW5nYmF0cyAvTmFtZSAvRjQgL1N1YnR5cGUgL1R5cGUxIC9UeXBlIC9Gb250Cj4+CmVuZG9iagoxNCAwIG9iago8PAovQ29udGVudHMgMjkgMCBSIC9NZWRpYUJveCBbIDAgMCA1OTUuMjc1NiA4NDEuODg5OCBdIC9QYXJlbnQgMjAgMCBSIC9SZXNvdXJjZXMgPDwKL0ZvbnQgMSAwIFIgL1Byb2NTZXQgWyAvUERGIC9UZXh0IC9JbWFnZUIgL0ltYWdlQyAvSW1hZ2VJIF0KPj4gL1JvdGF0ZSAwIC9UcmFucyA8PAoKPj4gCiAgL1R5cGUgL1BhZ2UKPj4KZW5kb2JqCjE1IDAgb2JqCjw8Ci9Db250ZW50cyAzMCAwIFIgL01lZGlhQm94IFsgMCAwIDU5NS4yNzU2IDg0MS44ODk4IF0gL1BhcmVudCAyMCAwIFIgL1Jlc291cmNlcyA8PAovRm9udCAxIDAgUiAvUHJvY1NldCBbIC9QREYgL1RleHQgL0ltYWdlQiAvSW1hZ2VDIC9JbWFnZUkgXQo+PiAvUm90YXRlIDAgL1RyYW5zIDw8Cgo+PiAKICAvVHlwZSAvUGFnZQo+PgplbmRvYmoKMTYgMCBvYmoKPDwKL0NvbnRlbnRzIDMxIDAgUiAvTWVkaWFCb3ggWyAwIDAgNTk1LjI3NTYgODQxLjg4OTggXSAvUGFyZW50IDIwIDAgUiAvUmVzb3VyY2VzIDw8Ci9Gb250IDEgMCBSIC9Qcm9jU2V0IFsgL1BERiAvVGV4dCAvSW1hZ2VCIC9JbWFnZUMgL0ltYWdlSSBdCj4+IC9Sb3RhdGUgMCAvVHJhbnMgPDwKCj4+IAogIC9UeXBlIC9QYWdlCj4+CmVuZG9iagoxNyAwIG9iago8PAovQ29udGVudHMgMzIgMCBSIC9NZWRpYUJveCBbIDAgMCA1OTUuMjc1NiA4NDEuODg5OCBdIC9QYXJlbnQgMjAgMCBSIC9SZXNvdXJjZXMgPDwKL0ZvbnQgMSAwIFIgL1Byb2NTZXQgWyAvUERGIC9UZXh0IC9JbWFnZUIgL0ltYWdlQyAvSW1hZ2VJIF0KPj4gL1JvdGF0ZSAwIC9UcmFucyA8PAoKPj4gCiAgL1R5cGUgL1BhZ2UKPj4KZW5kb2JqCjE4IDAgb2JqCjw8Ci9QYWdlTW9kZSAvVXNlTm9uZSAvUGFnZXMgMjAgMCBSIC9UeXBlIC9DYXRhbG9nCj4+CmVuZG9iagoxOSAwIG9iago8PAovQXV0aG9yIChFLUNvbSBSZXZpZXcgSW50ZWxsaWdlbmNlIFBybykgL0NyZWF0aW9uRGF0ZSAoRDoyMDI2MTEwMzIyMTEwOCswMCcwMCcpIC9DcmVhdG9yIChcKHVuc3BlY2lmaWVkXCkpIC9LZXl3b3JkcyAoKSAvTW9kRGF0ZSAoRDoyMDI2MTEwMzIyMTEwOCswMCcwMCcpIC9Qcm9kdWNlciAoUmVwb3J0TGFiIFBERiBMaWJyYXJ5IC0gXChvcGVuc291cmNlXCkpIAogIC9TdWJqZWN0IChcKHVuc3BlY2lmaWVkXCkpIC9UaXRsZSAoRS1Db20gUmV2aWV3IEludGVsbGlnZW5jZSBQcm8gLSBUZWNobmljYWwgJiBDb21tZXJjaWFsIER1ZSBEaWxpZ2VuY2UpIC9UcmFwcGVkIC9GYWxzZQo+PgplbmRvYmoKMjAgMCBvYmoKPDwKL0NvdW50IDEyIC9LaWRzIFsgNCAwIFIgNSAwIFIgNiAwIFIgNyAwIFIgOCAwIFIgMTAgMCBSIDExIDAgUiAxMiAwIFIgMTQgMCBSIDE1IDAgUiAKICAxNiAwIFIgMTcgMCBSIF0gL1R5cGUgL1BhZ2VzCj4+CmVuZG9iagoyMSAwIG9iago8PAovRmlsdGVyIFsgL0FTQ0lJODVEZWNvZGUgL0ZsYXRlRGVjb2RlIF0gL0xlbmd0aCAxNzQ2Cj4+CnN0cmVhbQpHYXRtPEQsXTFLJkg5dFlmTUEmQ1ZjIStycTtvPkVAJlJ1ZDVpVDRyMVxcakokQ0xaOVsyaDU9cVZ1Sz9hMlMtSEJVYE48WXVdUyxHLiJyLidGIzkvYl5AREpeZ1JLak51OVZdaTwjQjgvLW8lZiVoSEFyJkQocyRvUk9HKChLKDgnUXQnPjE5TVouPU9HbSFnQ18iPC9ZLCZwZSUmQEdIL3BmcjdiUlc1IypOZTJjWmtMOVBLclRpPjtvXSZOM0w0MlA/TC1pbE5OYjRUM08nVFtUbyc2X2o3Q0I0RTknZzM/dXViVTE8NHMoV0lHaFYiZEBAKyp1S3RqNTZuTTslKmc0U290TFkvZjA6Q2pMJSljNmc9TDE9LDQmJUtYPmZlYnJVOGwwQ0UqaVVMaSVKP2owZ3RBTVpuMTYjb0dvIWJSdDxpWlBaLkEjajg9VjNOZlw6IjNWPztsM1xCblZjKEBqcjtlY1pSbyNLQ1RrN3FeW2tGamQ5K2lDIitZX2NbWi5PLFohYl40O0InWFMvJig+aVxDTU9Xb1I4aTFbaWRYVSFjVUUxNyNsWDprYW5iMnMkLSRzQ28wWDAlKktXUU9YRz45PzVNY1tyamJvZGJvZV1GNzlJSXInXnFzbz9pIWopTEcqPWArXUpWZyQzJWN0UldrMVtUNT0sYks+LD5xUlhuI1QxNzlTdEhgZ1FeVUZuc002O1htSlFgKS1tMSEuZV5dTiJeUnU9dClGJzNeP1I/L1w0dXA1ciJeRCUyWkE7PyVEX2khJEBOR0lBUCpGPEUscVhwcXNUQlheRUIsbikzTStPZkJtJyd1bWdfOyZTOVhMQiJuNzNZP09zVkIhJDJIYmxvKy9TSTZkSS49KmpTVUhHJjZLJjAuNT5CSk1JLjcuR3JKOy1hSkAhV0szOy11LkhrQzhzcixcTyJAWDxkb1UvXT03YCtVY1wmc2QqKy9RSCUnRzcoKT5xXk8kcD1hYmcnJ1s5SWdiMy5vbC5NaFw/WG9TdDIxPEw4YUEhJTZhSVZXQCZVM21IWWNFQUVEWHJlZS5tbzM6J0FPVzFORzU5KG1ZJCNiciwuODNWPWdQRGptO1dYVyZKZ01wI3M0VWtQRV1KST5fXCI3TDFjPSU6OU9Jbz5HMDUnXzIsY2JjWCJqQVN1bVgpK2tFT3M+NFRuSmRdSSUiVm5UWl1faClQIlAnVFYycldfYSxTUjlpIVM4RV5uYGxIb3RqST1vPGAkIihdMlZaZTNob0poZmVqW08zRiciZlA0WlhbNzUvWC0vN1VcN2MlUjVhSmVqQDIwK09oMUFARVQwT188R2Q6IUhgclNBRE4qU1hDSCQwXmhuSFpjY2BQcDY9XnBtMG0/b1lgSSZFUF09bG1pYW81dVdEYSZoIkdpIW85Oks9RiFPbWRDOz9oV25da0MoPChRUC4kMWgrWFJeKWV1aDFcLEReVy4+aG4nbkFbQ3VPWF4mMkJAclVnZlExQ105LWkvSz1Tb0BRVW0+YGJPSyFWTyVlJWEtMykuY1hZWSskYlhyOzxcbEckTmE8RHFuXVw4Q2NFLTJdWlE8RVVMS1wzY1hbbyhjJjxwTGViTDVfYzFRS1ciKmZFT3NBVl1MQyJUTU5rODVzKiVxOF5yPSRWOEszRjI7TTpqR0ZXOSFPTWBrNl5aOUJpc1JGT0ZbMjklKzNtYDRUYDtrdGx0Wi5AR0htOCFVQz1lNj9ZVXFPaiExJTE3M2gnLUo2YysnTEouWmhSImInWzNzQW8iRnQsSF9EIkJyKy1mPnQwK0leZTJHLWFmNi4icytQczNZP2RgXkpcbGhyPEZxNUVUR2MsLmsxazQvJ0BEZUpcaFVUT0JyZU9vUkoiTzJURyY6QGVKRl4rPGZGLFwtYztpX0AhR1tJQT1kIyFAOGY9X0gjQT1qMSVnNF5cViZwKzYwISxyMWFDRGlUUkNbbDVKIkZrJWw3cjY6NkUlTGpocEhnUVlTVlM/RlhgKV91PkZVOmpoNjgyU0AqLV90cjUkOEMrYDoxVSssI25PZzk1WEsvOis8SV5IamwkYTBdK0JfTlRPc1BDLEQ1Y2w/UFdCY0RhI2ctQ2BpQDFNOjhvbWI9PktRLzhSPiw8QCc2Tj45VTtRP29bOjpdO2VgS24kWjstTW9YSlk0SGVcQ3NkTiVCUDZCamdiQU1NYCwlSXVpUCIoIiVOQzVFREhKRj9LM1skaUI4I0FkRE5fSEpXT0NITyZOPGBIXl1QUFA7aDxTIzlkbUEiPklgQEs9aU1vb3Q8P0RcPDRVY1ZTIic7IiZwaThCKnM6Z01Ffj5lbmRzdHJlYW0KZW5kb2JqCjIyIDAgb2JqCjw8Ci9GaWx0ZXIgWyAvQVNDSUk4NURlY29kZSAvRmxhdGVEZWNvZGUgXSAvTGVuZ3RoIDI0NzAKPj4Kc3RyZWFtCkdhdG08Z04pJTwmcS9BNW9UTXE7JmVTQFRFOllAKDptTlFxQFpwOy5YN2cqMSVgTzlEYjVlMzBJIXM5Sy9kKjFsQS9uMmZRW3VdO1NqKHNuVmRZXkU/VkNEPCx0Jmdrb10ocCJROyo4cD1nJGAzQFM1Vj1palQ6P0UuLTFTT1YlYClqI0xZLy86Wm1bMiNJKG0tLW4+P2dEU11aUidwRm1HYidyWlxxXVZGP0giYjlkLzJTWVg2a09XR0pqJVRmPE5FJD5SUzAsQEdBTl49WDlXaCFpclNHI0BjQUBBSWlMO2N0LDBSaHF1ajVyJVxUWTk5WnRWMzFXZm4lZSVDXDRqPD9vNz5rTWVuVWxGLCVlX0tZQHNdaVJqR1xnSUpJTThePUQlYW5ocXBlLEtdRSpmOXViZGBxRVZqMiU7NF0tKl4yYEFvUClfamNpWk1XR0wiUEA0T1kyQEkrUSdzSS5wbzprVEZdcikjQ3UubFUtWCJtcXNKRV9Sa0xXclZ1Lz0mJHA0OVxYaE1dY2ktR2RqM05kTXEuKTRqXk1EVzpuJyxgZ2YvMCNWcm0jXCpsPVwlMTJxTiE3bjMlOz9DYD4rLDZMLG9uOWxlZUguWFdmNyI1P14rXC4kLSxqMl0uIjkxXFpwZ0tVJlojUT9Xb0FiRyJkPUs/Rzg0aUVFXShPNFtuXVwzRHBycUNNaGZYMiQ8RUwrdDFEWnRXYThRdFtFKC9JJlAzJ0c/QTZwWmN0MTQoSVsqJVk3Lz0hVygtUj5hJSdBbSVlLy8oLC89UVBpNHA+JUZtP1onJiRiJ2tOXE1NPFQ+IWRHK0pzNGxwNz4scm1WSVI3WVB0IStyWUJkJEJxQDk8W2g3Pj8rTmwub0FeZlFITj89bCYmZSo9ai42aEYiNDFQTnMuM1VLN0soXVE/JTtualJZRlg/NDw5ZWwzSm5ITG8xcVZYb1pIRzVfV2JdbichMWYpT0pGbkRLIzFKZk1bVDwibWJaclBqKmM5ZzRuMWFlZWFdbCoyZFs2KjFgOylKU0NKZUVcYTwsJGRzP3JTMVoqYDkuRU9OYV5YPz1hXlloN1BmNmszO1deb0o3NF1MXUtlLGhVVXIjZ2VtWEowUGo+L0lcUXBsQyFqPysmaiZRK1IwQ1tyYS9DL3U2PmRuRCk+KDRZUGVhc2xgUjlsMUE1PW87SFpVMTgyUFYuLUBESlYoXV5YKDNMKFZqOVkvKStaQFhoYUJtInFzalUtTydlZ1ZZSmJxOjFLYkl0TkFIRTpIKmFfYkZkOnBxQnI1Iy9YVi4jPEJUai9XX0xTVnFNLyg1Iy86J2JnVDBmMUE0bk1uNlUhLUdvWW1AM0E2PGZXN2w5JiZyYiNdPWIuW0hESSc/W2pGLnRVWG9XUUBUQTVpKjY4bFxUUGRHUkwrYzNYOWNMWjUnN10pNFBpdHFCRiZrNzwpQTFHKjJmbjdON2JsJT9GUmlFZ0gmSGAyW2pBOGIhJkBMLVQwLig3bzg6QHJxZ1owVChCcV9Ja09MWztBQD8vMFpOYElEdUNFPVowWmNcRDZaNEVrMTM+Sy1AQkE6TzFncUNXPF8mOCUjYENRZzYwYm8iJDVvOydbVl08KUY1NUs5Ukg6X3QxUkpmJV5HYUw8UE9IPEg+M1ZBZT40ZGArcW04XGs3K14raWItKUNQYTVFKnFOJ2ppLyRLMi41Njl1QTVOJV87TmpNM2EnPjE6Ym9TSk47JXRsXix0Ry0oKUBGRWBJYmolSC5fX2hvVT5HRzVNTkFgK1pzXE09Rl4yKExXW2crRCdRbVQiX0VRJU9QdDRdLDpWODFpYXQpaDAhUEhyU05HPV1bbDNKZitIcFZBJiZTVDpoa2ppZ0cmOidfJy0iIVxtQidKVmY3UycsTyRKViktQC1AdV5QLDc6KyQqaU45Yz9XbzQ0cUFIJVJHQ1E2aUYyTVQwY1xqa01kNFZJU2ciaEdbRWNkZzoyWEgqQVc2YTA9PVJZOE9TJy46PVQsXSJUTFhZNUdzTzc0KHVcYC4ldDE+OSkzQDxrWWRIISRlMk5gXUQqUlkkcW4lI3FMSVFjQyouQFVacTgiNj86JG9aYCRuXkpgPytPXFVodFwnVTUqZm9kRys3ciVnYDsqLmhYaVhVVC1oJitoJk1tUStGMDdabClKanJHQFFSUkIvP0phSEZVMD9rPFVMWEouKkwxcnJkKTdoJ11aQjteaEtkIUJnY1pKJFhVM2A9IyNIInFFS1o2Wlxmc1o+ZVRhazxiYS4xZWg3SEckIVQ6aDZMIl08SzZuOCo7QjY9Ly9tUFQ8bltcIVgvRCtyPWZmYzteM18oMWU/alYkPmBpcUNKK21ENDlGUyg/PE9uMT5FXiYhWDUyaS9iXHRpXWNRSGYpNkoiMjhiPVlTKiJKJEc6Skg2JVE+OFRicDRXXCRmOz0wOzomQEdFYUZuIzpIW0VPb2QsIkZVPFJGIVpPIzFOR1wzLTlubF8tYCwuLmtvXSpLSS8kVkxoIj9NZV9aVDAqcy8/ZCtVZFYrWVxFY2IuVis+bG0lZ1ZMdEdtcDFNLURAJ1U6Uz5YTGc8dEFTZyxCYnIhSD9SSjYmW1pmXGBrKWw2XUtBZFY2ckghYDlNRGBTQi8kPzRqSzRlOnAiZi4zWTdvNDIhXUo0PENSO0ZsWUNMP2IiZy5jR3BTX0ZtPlAsc25HUi9iO3A8aVZeIU1gRV8/cnAvS1RuUC9wLlpwYl0yaV8hPTkhcS1RZEVkOVtTMi9pV0ouSkI4NjcwTGpgc1B0PU07UVE3QGkjXVo1MlJIaDVYKl0vYHFkWjw2Sj42VVUrUy9BcG9UST9oIWdVSF8xSGJaMEEpNENRaz1NWCdfZTlKdUxaPTJlOz9pMllYKkItNjptQ1FIJmwzckx0PGVycD5eKFc/Jz9TW2w6K1RnSGhyV0hcOzEqNk9eWzAkcCkmS1ciKExtRHU5UktcVFpvXG9WcjVSX2YhS1c2VldQVUhNdCMrKyNjKDtxbiElKGxNUGxnalonIlZvJXMoSCw+aTZlaEo3PEc3a0oiTSMjbFEwN1MsUC9sJEhncEhtI0ZmajklT3AyMEZQN1VRKmFRYCglNTpeLiJgKSg3Wi4mZzgrVCJfX2lwQy4hXjc4SXVHb01OP1RydWxRI1NbI2w8VidgVGVMZ2M2SFU+ISZNWSI6JShhLGVPb0oiXE9KMTFISCJ0SmJ1Zyw+V2dtWj0+OXRpWGMxVlJXbVBWM0JeIUFcXEJTIVYiPUs9KTFEZDVHSW5MI147QiZgfj5lbmRzdHJlYW0KZW5kb2JqCjIzIDAgb2JqCjw8Ci9GaWx0ZXIgWyAvQVNDSUk4NURlY29kZSAvRmxhdGVEZWNvZGUgXSAvTGVuZ3RoIDM0ODcKPj4Kc3RyZWFtCkdhdWBWPkJBTj4mcTgwMVImPHAvPGlkREVPdVdAIkAoYVozYSlNKXRsO1svbz07a1N1XGUnalNtSlFoUHAjcHVNSjsnY25DaGFWP1wqaU1LbCx1InFaND9sJHFKUyN0bSxPJVFcMjlVZlouWVk4NGVwJjA9KTleP29CaE9ycDcrbS1eXlNpJl0pPTY7IyxZbykqJmRXUTl1UW4qZEJVOWtgUz9KYj08MDVSWFBgPV08a20zIllqISs/XjtWJ3FoUTlnOzNmX3RcUmBtSTQtPD1dNEFOQEg8YWNaZyUwRkpwXDZxa2NYL1h0IU9wMjR0MXI7O0NHN1hwQ2Y/ZVA0IzJTLUk8cyJWKStObkRWO289cnJFKyNhIlU4LyojdC0vPnApNG1dLjBZZV5Bc0hAKl9WI0dDMz0+PyM3MWlMZWBeaVY9NDhiPFoqVkJKTFJmajVQNyMwI2UlczI8KWtrZjxsJ3NocnRWY1pFJ0VEZnREJiwnYWAmPUNyXDdOXW50XzJsY1xoO2teI18icyVRXzFSPmU7Z1Q+b0xHUFEucltpS3I8aEY/Q0xsXitSQDkvXjgldD9IOzlgZ0ZJSmA2YmdFW1dqLD04TFhZWCFQJURKbGNzOWtYX2xRJFJAQD1KYzEpM2FWcFRUQFVHTE9yOUYocXFwZEU0WUQ6TTZGL10sW0JmREM2WWVdYnE6IlFkRCE9bzlTMy04IUIrTEdGKUMnXk1gU1FUM0d1WF9lbUBaW3I4bDpQaEBHI3BOQXJiTj5Rc2hINE1BJFY/OTkhSD1uLUMpb2RfQkNFQCM8WGNkb0QvIitPPkhDYnItbDBSSEwvQDk/S3BzOGJ1KFQxZmBLXiVSMT1JUFQwO0RbNkQ/SE5uM0l0VjhbZz8mXUtLSGEjS1osUF1fJzUoVmtMKkgtamBbU187RGVaRnFVZiwkV2w7cUg2Jzp0Kj4kMnJZR2Q9UVkzOG4xT1xfY2hwJm9xJEZHWV9XdGcqU2x0bllqTyIhMS5sNlxJZS80Pi1SLlktQCJEOSs1MSxZRVVvb0phKiFqTGNfKlhhS01cTkxTRCcmTipNQ0BWZidzWEh1Nkk8PDMmckMnLkVINywyYD9GODhAOEonci00MVdcSk48KCNxITlWaSsjJDo0OyhFMjMpQ1dYSD4/L3MuQVB0NmkuKFAvTDtBdW08I1plb1ZHYmNDcmhkITtmLm9bYT1ecU9BSE9qO0lrK1hgal44bC80T1ZyLGxLXWQ3Q2ovZUZfLlBlQVhEU0xybFc2TTEzRDgia0g2Njw1OW5pUjgsOD9UXmtKJyM/VW8/IkwmT2UvbjAuRnBIM0laTyJIPildL29kOSg4PWhHQDVgVjlyTCNSVUpSJVklb2ZtTmYuNGQyJEZRdHMoJ2RcKjY6T1s7aG0kQkxVRENIVTRPIk1FWjhAXSljaCNNLUhgY2pYRFdHW1o1PF1LJzZqLydHTF44IzcmYGIsR280L2c2XmAiPkEzSVRPY2BSRWQyKVxGVGsqYURYaTIlY2JrL2l0bDIqNVRHZzJfN1hQTUssTkoyc2Y2WD1LbChpMUJ1Sl9dV2EsYCNSPHMoKlY2OyFJPFlfKG1JZSgzYDQlPF5na1AsXktfR0Q1PjguWHQlbCFQXyE/OiQ3WV8wKiJMbExSVWksMThNUyhRLGdjKWpNIUJVdC1cY2wkI2BIWSphSytLbVkvRU9CQSFrL1FQQEZKPnJqWHBDSSRjImJUYVM7cUM+MDtsJXJTMVs6W2lGST0nQEpNJVovZHUuZ01nW1YhTzEzVS5vazZCdEoiOXMmKm83YEVrITgmVjNwdEYzLD42M29cc2hiLDVIaickOXQ1QyhYRGQvKyNCOkFuWlU7XClQNWhscU1KJFpNND84YExdME1cK0lELzwmJmtGKiE6PG9KKF5DLk1VcF9dJj5eNWYiUyM7MTFOMyRTTGk9c0dNXE1oWD1BTSpgQzEqcnVEOVFTNEI7YUdoUCRQXU5HIktLUkJncTh0Oy01cDNQZU8rW3RQUXArZCFPNkw6K2Y3SEpPbD0iU2BdQl9FX0dwJ2xiZyFcVklHV24pbCJrKUU/WF5LJUckWyszOT9FQ09Acy5OP1MnWTlSZVRkXiwtKG5tN1kjJnBXayI+UU0tKi8vNGk6UGE+TitTPiM4LnR1NT1pQVhVaGVNJDs8SCdmLi0kSlwpWFxLSThJNSM4XlU+J0VyXFZIbDZBVEIwSFEpbEhwWCFvaCQwXDdoUFdwO2RhSGIiMGhtJ1lva18rQWk4SC42PjFhK29GRmloKHUzOT86KGE0SFBWR0g3bEZhcEp0RUZBVSw+ZU5NWlYoYlxeJjgyTG9ZZ2giNXQ+IjhmPFwpRDtfZV8paHFwJEpiMXI7JUQ/Xy1qRFU9ajlON1hfVT82X05QWlJaZVNVKVlmRmpkLSJDN3FnKVIvS3I5UUgxU0M4RygpJ24zUVJAODE1ZEVXWEg1dU01VTktXT1KT1MvMl9fTDsiLjssU3RgTixVcXAobFJOX0IlIUVONCZWPStpUCJkUHBVcUxISFBTaEVXazMsTjQ5XEohI1MhV3FyYkMoZ2w8aUEiYkFDMkoodWUiUzZsQ246Zk8pLyhaTVEtLSVabEpQck5xZFBUJ0VgRDlkbFZwKWdONTgyaVVhUDFyU0pELXRAXHBXQUQzXmtmKSQhYjcjY21cLjdTLCUuKm5xOHRkayZOWCYvN1wqJ09FZWonST5ZP2RvJ181MkEkdTU6Q1hcZjJic25cTENXb2VeX2Eia1tdJTFaW2BpLTtZaFYpWiF0NSo1QzFNSGs6NSU0Q0xjcS5pNGcydVk4UTRRJWIvLi9NIylQaFtTTydlMygxXCsjYzluPjY5Z05NJypuYzEpcjpsdS04U3NPQVJLTGowOVwjPFpQLSY2amxGLzV0USVeQVcpWCsxSVpJOlQtb0YnKlE4RzslLiwxL2QnX19oRXJBPmEiX1hBWVwxTmpVYCFtMV5SJGVrKFYpTyw8bnBzKnAmNyEjVls1Kyk6IjRcPmZLISMobGghYnVVc0laZG1qYSlIbiklRTNVRCFXSElBNTxIbT9WbEdSPmNWNlFHN1ZmJkhFMiNwU0RlZFozImBhKj5tcVJjK0RmTGk4RUohWl1FOzVuXiduJy0kYVFkc3U9a0ZiYysublFONFcoV24kb2xDTTcmXzRwNmAwV2k5P1BkJVxMOTM+Q0xgdVNZRyw4Vyk2MmcibTBnWj5MQlZfXls8N1FrJ11XIUImV2luQSM+KC5OMzozOHAoKCNfU1k/QF5XMyxCdDs1TidRYnVNXy1nPylUPS0rWzQoXFJhaygyYiRBXy0qO3VuKUsuKW5EUFxnI3A0OmhJXzUjXGhBNF1UJURtKXMnK3JOOTs+LSQsSjRAOSQvaTRqczAsTWRLVFxoZixFLm1xOiI5ZDd0XVYzYV9XVC9FJFxCZ3A6IyJqazVlUGdrODZybSEjODQ5VSZmZGojUjVcZSpCWGFoRFFnZVdLL1RYYzJIYko2IkRzMDpwP1k5OD5MIkRbOkI8YVM4RjlKRVRKJ09MViNdYCZXJjk+cGdJI2YiQG9qakRzIkYjJl9oNk9xazcxUkhLQmEpSkcpKy5WLVdlOE0sK05OO0plQi1iblZAa1UndERsKztGbTchbThpKVErdWA1X2c6cXVTSmxGLU0ydF1kLj1LMHM8OShbN1dZVVEpZD5vTCppa0lbV1RxTClZcmxbMF5HKGdKSTJvQHJUak1ZcEppWSpocmNFPTEoUyVVKHIsW24+LmciWSdxNlo1I0RYUFddUXI7Q08kUkA/SjdhLC0kW1ZbbktXaHMvT0d0OixZbzBpNmJgb0ZFSFkhWHJUJDg8ZC1hXmliMCJjSDRGL1cjNmViUyxhVF1JWzBUYkhhbFRSUmw3J18rIU8zK1VxQHNXQDxEVk0iV0g9a15dSSVNKjpWIm0hJ186RHAlMEthW2AucmAqLWk5QW1bWydQOlsjbVNKOyJXNl1nKVMiMzdAWlBSUCY6SmRwQTooUFRBPUxgai9wZyxMJUh0RjBpYD9sN2RsQTwuUEZbPCEjWSk4L2c/TF9PZWVHRidIJSpEbHI/YCcmVGo6YTpLa0BEJFtNKGdVZigtTDldZFt0JEkrNWA2WCxtXGEpPVVUXSw2Qis9aGtcO2c6WExZIWNdRSNlKTNEaDRPVExyNy51bCRpPFRANV07KyshSD1rLUtpW2VNOzlRaltFXylEbiImRGBkZ1k8QkZlcXFzU3VUZDE8Qzc5RVJpcXQmNUxAJkxZTFhiLyI0VGI2V2orMWBQO2cwWC00aUNgT2g8NENIZjtwc2NAWF0nXzlTXm47L0E4TT1FcktwSzJYOD1XSmMlcSI+UCk2Rz1NX042IT9zZnR0UDFBPSFWUVwlMVNtYVJzNHM3S2JEb1olXG01SkFBKERaWnQtMUplOnJoXFxFUWhSVUJVOmYoSCFsOlljLE1xJkJoXDxDMj5ETlE9SmsjdTUoZlFlamloImNnal11W1BQJlU7TUYxOV5LMCkmXSZLb1xTVDZRN0g9ZjBmYU45cGBkX2wrbHUuZ1wsKz1OaDxJM208QCNEYmg7JUk6TmhRJTdKSFxzQy1fMXNmcGkhQl1qWGg4fj5lbmRzdHJlYW0KZW5kb2JqCjI0IDAgb2JqCjw8Ci9GaWx0ZXIgWyAvQVNDSUk4NURlY29kZSAvRmxhdGVEZWNvZGUgXSAvTGVuZ3RoIDI4MjIKPj4Kc3RyZWFtCkdhdUhOZmxHaVcmcTBMVW9bQnFkUGA5V2hET3JbP1NeRVpRNCdGRC1XZDAuZWZPQE86JDpyaWleQV4lKz8rKSJKaURqLFg2MydENEhHX2BDPERgMFRRJS9aXUozVzJjcl5tPm9LREBbLyJ1MExMIyZldGFtPk8jWlhkQ15QYTNmIS0jTkRibEFfOF44R1NZcTImazE4JCUzLmVdUlkmZDcwRmBZSkF0cGYsZnBTQDsiJ1xJZjwzbTdXRnBxWFtVKUdOLCQ6Tj9aX2MyMU9MX25RLWEnKzshJlFRL0ZeNExSY2BVTiIuVlZeS3VwR1wkWEYpTy9eSUlualIlclM6KF5WVGd1Yl5VRVFNTTVtVGVodHBsMjxoOHQuS0QzWyY/RURrYypnaFNrTUdeU2FfM1hOX2dfW0o/W0w4XCNUa1o4KmFGXjQiV0c3aWZoVCM0QGssKEVZWyxkWWckWWRiPCRGL1k9TFA/Y0VZNjNZYWpvVidTJzZUT3MsJixaOjstMl1IOEhMNXMrLyNVZHBiLVFic3NeVl9Sc2AkPGNdMmVkQjMsZDdVdFgwTjFGXmI3NF9NXTxObUdfREo6JC9TLVo3UW1aNm0kPSFvbUNOZilELypPbm9kQEtMMV1zI1xMVklZcVJCOFtTMUZWXGhtLmJIV2xDYnE/KVhFYTdqYW5qVidOR2wsSjJyNDVWKFVaUm1maGdBOmBHMCwuWWRuWiQ+VmM/O2kpJU8hLydcOTpLQyxjNkRkM3JdKTdXT28rUT9RRWVAKHIiUy9WYy9naWdSZWQqNlVCSDViLzdLaEo+LmxoMjckQS44SkowWyNVaCUvYWVcPUNjKFpvMVxhJ0wwNlQibCJBOzFlazJCPHBRITB1PkImT2ovUHQzSkNMc18laE9zMW5xRVlKYSVdY0tsMU8+PXVXal5EQmUtaTUtSCk1ZT9GK2wwNk87OThOJF9GIylPLzFAbDZrckZGJSspUVRgSV9ic2Vsb1hvMEBARSY5RVhYdHBPb0NVRVA9PWRPSmhaa10tY1NJKzA8UShwN2kpZ0lYOit0VDBvM1wuSDpMJ29YP1hoN2NVLjc7TyhmQFYwb11SMGozOWFbWk9LRiJjbz9SPUFKMjg0N2RPZENlPVc+aHBQZCZsN1RRaFJeJ0dNIlc1JS1OKkRPUlVIXWU4QFBAVylvaTcjKjxhQyw+SC1bXloyUi4pWkcib0FVbUd1Rm5wWEVqJClrQ2UyRl05TWg1V0ZabWRvVlw7dGRsUnNIcGtEN0lpJFlRX2peRlVycWNtWSlCLFlLPj4zXVBCb0hhPGc1TDtDZkpJPDleNkROYkBFLk9zMVYtW1NYVENBK2Y4ZEQhXEJHREM9PE42MkcmKD1nOG5KRDFSaCQ8Y15KcU41KWdUNS4zK0ovaGlXdDxPVSoqJ0VzWjpYY086IkBHK3BwVlROZzZDYE1gWyIwZzgoZ3ImWGBuJEgjXzZBWHAiVSs7a1ZSS1AwckI4N1hbdGpgTChPL2NHIlVdQ2tgakQpVmFPSUM6QU1RIVQkbCxqVG1ybnNkVCE6ZG43YXUrbGlLVVtRSTgxKUFUNmxcX0VkYiIuOlVNRypGKElyOydpZGMiQT1MJC0lU15YMCgwRnFLNiU8MzdWMlBXOUVaQSpnWztGJW5bKiNvNy4jbDA8RTV1PChmN2grOyI0UnJdLFFPN0ImQVRaJidWZC1MVVpGNyJhLkhGcnRUU3MydVNrcHFgJiNUblRHQipKJG11X2lwXS5NUmZBb0lhKWsmUyViUkY9aT8qP049VVNkMCdYSG5DZ2trZU5iS2ZGajArc0lzKFBySW1TKE8oYyEmbDJwQFs9bnA3IVBmTmNJQUsrO1xqMFBBQkJ1W0soTShJciQ8aSgla0k6LW9QWG46SmdIUz5LWUo0Py5RbyhCUl4ubSxrXmJUZWNqSkdwJ1pRMzglR2RpJ1o+ZGUyTjM6YTBBTzhiO2U6SXMmTF86ZFk1W2dZQDBWSUNrb0Q6MyRmcDxtaDpKJCtMTi8nNlE9SDlfWGdtJDIwWjZZIUNOS3NuIS0iRTw0JyUhMjhxX1RdZFosclNscFBgWiNYSDxacixkPWRPRDxrIW08akwzWTxgWkhgT3NfY1VVKTlRcVRoPl5YOlUqMiItLW4jVjBQTnJyUExWVCRaUlUsbjVeXV9HVGpMPCclPlpFNXAqSmBIQG03QGFHbVhYRjQrWT9nUUk5by1CYGUlbSZQN0MpNydXYldJVHJSc1x0aHRwZzZFVjkjYV1tWydXTW9FXSpSJWJFMVwsKjJSMGwxMzVBJSlxVTZHXDJSZEJyay1qSy1DTlE3Ly1gJitgRmwyPS1vbl0wV2A3MzlgJUpYTERVKFNLWjM0UiVtJFxrLkxhQTtTZzgxOCgnTEgxM280MmdALDhTbCNmK2hxZCc4IlQ6UEw9NT1SP1VZblRILVdVLF0tcDBCSm9fcSNaK0JIVGomZldhWzxcJGJyK1gkRD4va1JGcVFtX1ZdLy08PC41PT1ILiQnc0sxJVY3cihzOlU3XztsNUBzLkRWc0RgR0FCUkVZQnApViRQPTZBJGI9OzJjbltNRTdpRzVIdFRZW1NfV3EkYU0nRzFsL3E3UzZhWzdyV2ZzMThAZj9VX2UxIVpfbFE3RVhWXlxKX2xAPkFMITtGVVFjN2NIIzxWVCs9NSMqKzFJMm4lbSgsYVpAJ0hAaWNrXzYpRU9ebkNvY3JTTz9JTDxHP1UuMTEwVUNYbUs0NFY/LkxrRS5VJlVMczwiYF0iaiw/RShwYExeR0xbRDtRJkFuYlw/UiY5MF89P0VocilkNi4zNl1laEoqc1k3ajddZWJLPjhWLGRFQFUsT0xxZig/U19YTiZCWDM2M2dZU2FbUW5ldXFFLyFqTiU1TXM1QXBPb0VxcDdPcGdQP1k8NGpAdW1tRydkLXIoV2ZhczhgIU89JGgiX0xkMlpbIU9sUjBGOTpgSmxwLlNpMzRzNSczbFFAQFUoJzRMXXI0JT1hO0pBKU5hJ1VBUUxFTUtVU0o/UEFOOHEiMm89T0tdRk11ZXBwMTRlcztaczxIS0VUSWg6NTNxLHRPc0Q3SSk+b2A+KTxLSlwnQW9CczwiMWpfOzxZUXRbIWJ0RWc/bTglSWxJUEE1PVdyPmlOQC02JytpXT9BIVpyVkhSUjJjK3Q8RWFOWFBAKDBSWl5dZWpUPTUtTmAiPzhbWmg1XGY8WlZWIXA4WWtCJkN0UlE1cjY+ckFbR28kQU1lO2svYC9JJnMvRkBAO0U3X2guX19taEs9YFoqWXNxKSpIZiNpJywtI2pQaERpOio8N2hrRDJVWlFKOkArdSI1QyFYKmIxW15MN3AuOT9CM1kzLWMqKEhram4sPWlmNDc2LS5iWWBOSzhSKWFiOi0saz47Zkk6UCxDLktBT0chImt0LzNjMkg4THFLL0MyTzZlVWs2QXAzSFJYWHRILTIvMDsiNz4kUkglRyV0JFlaQjRcWFNkQG4jXSFCTVs1RS11PUMkPCI9QWQrXkE/LW9HPlMwOjthUFpYcyohWSg0JSc2WVZjYGxALT0sJzk9ImwyN2NBSCp1QU08LShULTtiVyxYRWJDRGkrYG9vWV9kJ0A1K1RKQTVEXlIyJW4iWEk9X29VZnI2aD8oOVRoQTk1WSZAXkRtRW4iazpGTl9iITZyI1IqIVo9TVRHTzo8IiQvZ2dzSWA2X2grIitHaD9DWTdTUjZWPEIwanRXSU8jNH4+ZW5kc3RyZWFtCmVuZG9iagoyNSAwIG9iago8PAovRmlsdGVyIFsgL0FTQ0lJODVEZWNvZGUgL0ZsYXRlRGVjb2RlIF0gL0xlbmd0aCAzNTg2Cj4+CnN0cmVhbQpHYiE7Zjk2OGlJJyMqTzFpM1xjO1o9dUtrRWRhKl4tRFFmM09sWWwpLk1tdHEsVU81IWlQUWAiZjVDYj1KSnExNSdeVDhnTVRbODJGTC9fT1VWQjk2ODsvLkZyPTN1VjRZNSI6IzdZQi4+LT0hIi5PSj5aT0xLVzNmL3ByK0Q6TlpoaV0rTVgpK1xhKV00XWkycnBhOUcvNTh1YVVTZj4sZUoyQURnSC9yNlZQNztNWFZgWUhaMiZOUWUqM0U4RyImZVplJ08yTlIyWDssJ09BMUI5MS5ydV43XEllW1IpZlZkSVxKYG1hLT1MRnRhcjNcYkJcIXI8RWNaOTVjWCpJZTRyaCYnYTdjaHBDcFU+NWg4YzwkLTkzZlspMmBePCg+QFRFOCQ4Mm9IVWU4QC5dRGU+NSwhQGtvJXI4KkY6Y2pIJSJNP2pJUjA6RUZnJTxYTmZfYEdCMlonWlgpXFFhOXQ9WDBMSlxUP3JEQEZlcmEqUmEiJCowVipTLjUnaUQ9PFcqbThgN2BvYiVFSEBYSixVMlUjRzdXQ01yQVw5U1ErYj0+LWpYTzwjKTFbU188IldJS25cRGBuSFwhW1VJJEdcZGdubz50WUhQKCRRTClTYmVEZU4xYXQ5IzRFQWJKOCkhWER0InMmJitca2hxL0c7ZCg4aChZbkFjKG1RVlsyV1IuaCxkLVAkRFZRNXQsKjxaJlg4J1dyMC5YSWRsQzQ9dDtwbzpIQD9YaTs6WFMkIjM7MVVuJyRpYUE3O1F1JCkrUU1cTFpqJykpPlN1XUttTFtIV1QmW05lVTRraiJSQTMoV1JTYTJxUWJsSjhPTjdQYl1gOlRyS0I9V29WKlRwRF4nR2lxRDlXR1ZQPnNYWHMqNFU4LVRKdGJXWlJcPm5QaHBOcStFZl5HJmZiM2VoJC5SW2R0Oyd0b0pjLFBlVFskZlk7MGNhSXBpQFpBXjZ1LmlPNlFEQmclN1UtL3NuYipBPmxGMDw4UTdgSSpWaXMpXipycSI6UnVCcHRsIyg1VFktYVA6IkRWTl0hZyFRKl5hXDAobk8rNUdCRiJbUlJKYVNSNE5wYkRsKlppSkpAJyVPImxXOyM1QnJRY2NuJEldUFNnLz1IWWAhcy4oZmpXdD9TYDp1Ujg6bmoxJyE2Lz5VRyVAUDNUVlxGIWlhIk8mRT1fOmE2PjUhVyZFPDxiKDtKKGs4RWlTJi1YPV44IjFecUYqT1BmSjA3WSQwYVZpZ1RaVU5MMSJRcCdhMl8wXFhFOTg1RWNoJ1hkKTwyTTU1RVAoSnNmJS0rYU4oYDdvRFJFVlM8LWdyOmkuLS1wRkZ0Sy4sRi5UVmlxOC5KLlsnbThGWCpKMiNaNF5hKV5yI3NnWExfVHRnTU1VbmNBX18zOzZKXlBhYVVFKU9UUEE3dVQ7TyRyZDM/RD5lJUxqMF1PWW5DW247UV5sNFRjaiJePmc/Vitla1UkbUpSImUsV05cNTAiY0FnV0FPXkVjUFdjXm5yaHJHRyhwLk5kUmkmcE9RL3JqRF45bjFSYikhLzQ8MVgwJW1iKkA+Z1EtLkRjJ1IlcEVaVCZtLzZKXGNNJyVcYFNZKHEzI3VXNU9AWmUkaGcrMiRhOklKaTc2Lj5EXzozVlksaSwjMicrPUs/OTEsYlc7WWI2R1sodHBJIlAwNyYkNkpkKnJRPnN1QmJLJlptYzNma0RzJV8+PFRQb2FeIV1eZk9LRUN1O1NbbiRjZXE3Yi9rIixBOGpqSlk0RVdjZF9la2RYQFMxIzlfRWkvTyxaQyRFPUtARiIhSi1NXkNrIj8qJXRtKDAsOCxPNV9QUnFdNi1kTS1TQUhUVSRUcEJcZ0RfRiFsI1JFYFpJMTUjT08rRz5kSVxTLy8oZSp1anMsYjg1WF5lYEg0V1RyIjEnRG8tbVVIOzlgMzdFYD5GMTMlO2Q6RDlWKyNEZVYhN11fPkZWWitUc0QnPkEsJS4yQi8xRUYjZnJ1NUI6U0dwXT4rU1Yqay9APjVaTCE1RUNkTCxvM19xcWRIcVAzLz45bE1NMz43MUQlVT4/cl1KLzglMC4walNMLU45N3AlMHM4L2NWT1RNV1RMI19qPFE8MEEyQlNAakMzY1U1MWM+QnNGUFQrXmRaRWNDKDVAdWpDYS9mOVY1QHVqQ2EsS2NhTzRmTlQwZEhHakBzNFZybHVaaV9nMV9GP2s4cG5vcUI9bmFnZD84QDg5Pj1FM2ZRNjJHJSdOWWUvSFI4RFtmKSRRMHBxLjFgLFA4Y2M5Y2pWVkEqKExoNmZrOW5dcDsiNHVYY3BXRy1YNic4JCRJSWtvcSlzKjEwNjUiaEhCK2ZwJihOWlE+LSJMXlYnOlNrYE5XUVpjbEw7VV9tJEpKNTItS19tPG1ZaytBSXU3VzQyS2pYSGFbN0UlM2RLVCRTLzN1NEQ3RjFFW2lDXyN0QD5mb1E0Km8tdFhGSDYyWDUsQjBuamRhUnJTOipwI2hOPV1CdGw+OUJac1ROci9tZDs7MFY+NTgpa2VgX0JwYzMrOiwwXmdaWmsmYEYoUnR1TWFwJ1I7UVklKSNES3JmKFoySGtnR0UiPUZzIitISC0+XUxqS1FoKiglNlQ7Z2NVLD47KjxBXWksVGx0OUFjUDd0b2ciLXUyOVgwMkBoQ1tyMm8zWUNeZGkqQ1k9WEBrNXM2QGppRGg0cGModVFjQzpIdDUsQkBEXHI9WT5gV2Qrb2Ejaj1ibnVJIVcoMGs9WGRVOkdhPWJQVl1IY1lydWtbSCVPNS42MG9DWiExYEJTWGllSy9uUWBpNllXUlVUXElbcDRVPUJTaE8nKTFbQyk/NGg3KmxVaE5KMjE/LzojSUVGOi03Uz5ZXD9kLD4zSzhrUHAyRDJHLCsqciIpQnErKCxqZiE+UihzMXE6V1RBa3Fxalkoaz5nJFdtRXNadDpHQVJGZUVNOVIhX0lRcmwsJSdtJzltaT43cic8OnVnWlo1aV8pL3RdXXBINE4yNC5pTXFlWk9nYDpxXi8/bDtmblAkTEpPTVwtNTwrNHFNRE9uN0JsbkdqcVxsa0NlcGE7OD5GTTtRRjxFPjo3ZnJDOGYzUWRqW2xAWl86aGx1aiM1WlArQmg5JFB0PG1NcDEuamNVbGpnaEBxWmE1UTRRRVw9citHPmUuViZrPiRgWGRuYD5lOmphNldeTzpAO2xkTCNCaTBGOHRSZ24tN2c7KlUoQU88J3Jga3M/U0BAVnBIPEglbmEiTz5KTVQkSUZETlVUJmBoKWIrUFAzUycrYz1qanIjSiFLZjdqSFFRXG0iUUFJamI9ZyJeN0VCZyJJRlY+bl5RKVBAJzIrWD5qVyJfWzlJTmAqWTtEOi1hKjpIRVJlOlEkPy1vbG05MzNCayg2WU8nKWBHXzNoai91N2leV2ZMOHNoMjViT0hzZzg5JCtRNGdkLDhMXFVDTmskUyk3JFRLKVkxZDdaO11UYTlPK0Y4YVVRNENdIVVnKjQ4MnBDMGAlYk4hPztcR3VjNVw5W2A/ZnE7cTghVG9MZylOa1pDbGBIKl5XMltkdEVtaUEtYjJCNkxWI2FWSi87PUhRXVhkSWAiU0FCak8qVjlMZXRsLj86WU0vKEpLbDJsbS1fQzdtOzc4Ni9eNjVnTHViNzwrUF5waXBtcTMyIS47KFxFXloqNXJaWClgY1hORU5VbjEzNkU5UT1RV0pkR2BIP21ZWCRzU1pMP29UVU1bcWFjTTAmZkctaCM6UDtjVTxyblFoZydSUChWbCJNSlxJLi5hIjksJFw3bDA0KVZaY3FfPTRcVklwTzhcbG8mTiFmZDQpYSJWaCcxIzlsa0Q8bGJVNjNXLDdcMVRBbE4iZyMwcVhjYC0uVj5cOElIQzI9XF1TbmhiMDBDJz1FN0JVcUkuTlIjdTFZJSE8NTUsNDohK1NFUGYhMG1PXG5lPE51Q24ncGtMXCsuQCdtXSo2Wmxaa2smKTYubzZzTj1dUj41OVhaMiUjbU9la1FSOGJiLypBOC0qLihsZ0YyYmVycy0qM3UiTCZPU21WJnFebGNRPCRJKCNjJ15YWmFcK3IhZjRxSEM8I29RNW9UUUYpTnI6dTVZYVZOQSFwXEk9NF5CKCEwTzBHPFM7cU8sYFJFQiJxbDUoMk5EcC5UIz5kYzVHcmRUZGY6YHFOQkkxOTwrc1FQQ2RQSCEsNjwyUW9mVmE9ZTVcK0VJLHE3XFd1PTdvLWpQMjQhKFRXRVc/ITNgIlsyWFVCNW82MCcnVEYxJjxgc01VLCVaXTU0XE9uR15TY1hVQ11VJXFhN0JYOj1Ua3EpJG9mXy4jVjtSKSw7RFtuSiRwbVAuRGViJSIhO3RFZC1DMlAhbGE4ay5ZTzBLYT05YVtLZkQrcDZWcitnXF1QSktlVU5ucTtOKyMrXVxtL0wpcWRzRlhBVkFJXSE6RGUpRmRVZiNga0dNaGNLLmloPm4tMTpLJ0dnSjVxajNGPjFcXD87JXE6JmciLVBlUDM3NU8mWDUoNT9DZSVgLyErbEFLaShkMkV0Iis/X18yW09Ab29QblxMbGkpRFVdMXFEVV9QcTE6I08tS0ZVcD49dUIkWjw8KTJQJHNCbVszXVs8KEEnPjtyPDlLMElxPFhPZmUnIkJfSFVPNyU1VD1mKy5SNjlOaChWNXAhOFRpISEjc24xblNoLTooJmNGZmE+YTxtc0FUOCdnT2BscmQ2cTc3Q3UpTFMvY2xkLWJQUi5OZnBkInNMLWluQUZAPmhZZTddVi82Jn4+ZW5kc3RyZWFtCmVuZG9iagoyNiAwIG9iago8PAovRmlsdGVyIFsgL0FTQ0lJODVEZWNvZGUgL0ZsYXRlRGVjb2RlIF0gL0xlbmd0aCAyMzY5Cj4+CnN0cmVhbQpHYXRtPD5CZWRsJnE5U1lXOGlYclIyalJFWFhlXDdRbUEsMUsrMygzMVIhKHE7QihpK1tGLVlbK2FgcHREZnRBdEUiJHRSbnMtcGllUTYqWj0xJiZpSU4uUWpcLGoqQV5wITI5MEYwNXRfNj5hKCgwPDFyUzoqS0o0Tmw6QiFHSiZwOVxUXGVAKDs2WV9YLDBDJEZaWW1gLGw5MDNtaWJEaCZFUk05LVxWXC50Uk1hZzdObUdcK2M/STI7UnBWZGZAWHMlLDtSUzY8cVxsSj9TIzhVWEYtMGAjdEw3KipAJThjKyQhLD9HZ1VXRGglWmtyNWlEcUZsZSlpOklcaihSOCYwXmA+O1hoUHAuXXFTZElCNEQ0c1xkXmQvXSNaXnFiRSVUJlZbbVJeXUM3aXMsWEJRc15cIWdKMHRTckosNj5pKEohZF1YP3UkJUVoOVZQQUZGREBUayYyLWdaN1k7MmRgNiY9WzVZMkxpVDdhb0orcylMNSk4Q11wdCc1cUxDLy0iPXEkdG0+bUUtLUhpY2kmUF5TUSwrSFVZNSFObCdnbCduKklFWWhCSTA0XFNlNyFsT1s7aCNdYFs8WCoyKmg0Ll8pb2ZbOksiTSVNY1tjJ0kqVyFaP2FqLzFFJldHWEUlJmI5LjxcS1BTLiorQG1eZ0gmdHRXIkRQKjcpayxvOTNeJ1ldVUFnKlA3WU5DNW5COmMlLyRtZ0w1ZC1ERSZaKF9hLF9hPGJPTi5rRzE8dVU8YmkrXVNZOUY/QCRENjMkQ19fXmshaDxrbSQ8LlY4WkVzaWNiOTtCQGIyYEFkN1I0XyROOUEiRSteXC9hImg3OHJcVk5cN1VNVGFbTEFDIj5oUyRdZ0BeYlljOU0uX0VuT3NtcDFQZ3RmWjVYPjs1WVtMOlZkU2Y6R0pNKHQkMVVcMypaPiVxRGo9UjVhYUoyYyojUjBiUkdhO2hHbV5HS19LYzxGKy5eMCFvKmJMXWVebydXYzhQZSg5KE9UImA4az0xJCVCKlhNYzJXOi9SLS89VSdBWnFLMiVZLnBfN2U8OmEnM2RuNzwxPDNMQTNNUXAtRSEjLFg+L3JoWyZaNmklQ1dBOjA7PlcnNCdoPVY9WHM+bWVeclBZWFwxUTM4REhiOUNKX2RacyU3a28zKiFbaGNSUzpBbms7WTVgSk9zI11UWGEicSRmMnJZbjxnQ1Q0WjJhSilWNVsnRUdpa0xURiNaJjhQaVxYPmRMYScxKllyRyhtOFcqJFoiQF4lOiowT10kUD9wXGs6bW1AMCw1SUFbLzg5Oz0sYnJnZyVzJU0wbXQnUDovQy5EJDVvKWFUW3F1LklkMWxeZSpfMDkjT0Q2SFBLZlNfNDVvN0ouJ2hRbmc9SiQ/Llo8JlhENiEvKSRkcj0lbFFfU1g6TUZXJlhXU0xkajIvOzQsJS0+X2FEbWxSIj4lMy9WN3BDalFYRG8xLWRjU21fKVhxXio6bC1DPGlMW0BiIXImZylqVlw2PyQ/O2FXOWRQVjtHJ0AsKnAxUSolSjJ1aFghJGQxcHJfcW0xNjtSXFVjNW1SS0lfb1g+Vzw1XEtZKWlXYVIuaiQ9Nmc9SlJURnIwZU9APlh1Wm8qR1wmQm9caFliXW5SXUNNTGhvWkVQV0Y2MzFuJSJNYihlcExhJlNPU3FeRTNINFs9NlBvSSleSkgsQkorVW8iJ2Q6N11qZEljQ1gxQic3aGxqX1VzXmVfL1ZaM3VPRiRBYzoiKDYwcW5aY21KTEYybyZbYj5cTSksUkxqIiY2KylwVCJQKURrJGEzNixFNEUtYlYuN3JubEZAIjxyNCxoX0YnMygkPSIzYTozVCNtTSppKWdLXmcsVl1qZHFtWCk/cjMjNE5MP0BqS287WygrX2BiMEBtKU9JJWpkcS1Wb3JAQ2I+OWJmUipSVC9ncmhiJWBtWDlKcTZVbkw7MjNmP05dN1skUGoyUVdVMUFcNHM+STQsSEJvRidIV2FzQy1jZ1VOJkFpZGJdbGxcQHVJPVM9OEtAZTtWUkVrIXBgUlBmKSQ5UHFpSWVgbDcxby1hJVlqbFVcXXNQQmgkNjEuIjQ3Xk5fTjttMmFYSjZqYWEvLSFxT2drXDZZOEYkRkNqNXUyaDh1NGxMaF45InIhRWhFRVRTRipaYnNvSSVhdG1zMDE7PlFIcSxLSWpfXW9XU1wvT28xb0w3WDdJX1R0KF8hdVE3JkptOCUtND5GbW4yUksnRFtPN3E8Y15IYDRNMVhMWiUvZGBWOnBdWTlxWXQwMlZRbEYqWCQ1LXE9dEVUYm5xYypWNGlbQ09cOFQzMiMuP0YjZllRS21XKDJAOisrKHEpcChdZGYxRmlrYyk+LjlVM2IiLGNXV0ZJIWFSS2g8RiElMTZqZU0wT3Q+NjcoXzc8UXFKRCREanNMZCheNCQuVChZUXIhYlczR2dYQGojLWgnOXNoaGowKDdaXT5BVHQ9bDpHNzdpOmVAM1JiUTJWXyxAV0c1JShMWiRoZCMwKT5ZJkUobTUtQDUpSD9Val9PXUc+QVRQMkk4S1ZiXzUwQENQLSlTaCUmbGQ6NU1iY15CK1dIcy1yPVtYSkNWZDdaP2pMTnNhYXM9a2lcJj5sWFBRSGdIXGwzIStqa0dfQmlAY10iYWEyMihaKk1CZGtHU1hQREtQWnA8IlhIcXBRIjtENUwiUUVKWyNxVjUjUlhdKmVFOjJAb1o2VUhxLFlrPHNMQD5bPEQuOkVSK188MltgVm40YnJvUXEiczE6XSwpNGtPMCsiS1pgPThQJWYkTyYuZF5ELHFIZ1lGMm1rTy1pKz9PdGVmSWo0Yyo0NFxnO0JxYypsYGY0MjI4NVo1YT48TitrPF8jPD9dbTI8OiwhLidoYllwZVNgbixTblIuQWFyJV1pJmtzOyExdG9xXi9AUT8pakdddEBSck5lUjNrKj5IQ0E8TVQxJGg4JyxuJ0JOITNvcVJoQG5EJSFfciwkJWplYyw9XD5XZipFQHI1RmdwPSxoZFIob182ZkkwX00ycm9mWG0vImJRMWo1YEQ2ZUpvMy5oY1AhZ1Q9VSpVX1EzTDJAMXAuZm0/QChtbW5nWFszQW5vXiNxUCQ+V3FrLGBrOWM9bmFNNyxaQD9iJyxpQjVIIjxjP05+PmVuZHN0cmVhbQplbmRvYmoKMjcgMCBvYmoKPDwKL0ZpbHRlciBbIC9BU0NJSTg1RGVjb2RlIC9GbGF0ZURlY29kZSBdIC9MZW5ndGggMzY0OQo+PgpzdHJlYW0KR2F1SE5nTiklPCZxMExVb1tCKmEscDxFLFg3cUlKQkozO2k2clInaldRTkJxKG01UGIhJkZeUjxrYSNZJW1VLFo3P0xIT0NSOCY8Z3EnQzpWXztQSD41N0Y7VD4/OUdfamwyUmtgWThaSHFBNTFDIiohN2BxK0QoXVE8cjo/RTVrKVZyLjdITl9kczltPC4vSFJYS0p1O29hI2FUJjk0PmhzcWJqTCNFSmBnMjRtcmU6bzBZSXFSKyVXNWxzUWJMPCJfWU1dJVpFbm4qXTtwIlJCP0cjNlw/TFw2L2kzPUtjSEIuPDZCdGc6IW5eWmprMVgzcCg6V0MvcmpFPGAkXFhAZ2BoaT5dNVNfYTcuay5mQ0MjOjw7UWxvQU0zbGExWFpKJ1w/LGpLcjg6bE9RN19mL29XZCstNkRMM3VKS0drVDlzKFQ/IjpjIjxaNStBJUo2RyUrTCoqLVRmKi9vSytYUzptNTBGPDZGVyc9IiRYYlQlISoiZ24pM3RrakowKWpFYzI4QkBfUm0ubydhO1Mmc2o4bTtWYkwlN2FiSC1NTmAialIwR2ZuIkRTXVplSShQbWlKKFVYIkY4T2dGOmJKJDlpY2Ipay9yIzJNXlBOQmVBbTpJIl5cUnAiMzVLSGYqaiE2NVRDVk9sYiNoaF81Q2M+YFwtbV9zaDduczdNTy9xKFReKTp0LlojMj5mL2VuTkRAPF9oW1Iici4qT2dxMVw1ZUlTMiRjOjpLLDczXWVuaHArckUmLlpWMyNdbk9ZRVpWMGklL3B0XjlIUHA/dFYsJkBZWVpAXzNkUy5qNVhFOGZrUVdTNThvbTohQmwkXmxNRHBPPUxnVzxVZy8xXj4iVWFRTztGTD4qJVVfSEZyPFxcSGY/Nyd1Li1xTF1qL1dGOiFCcmRGXylQYzosV0wtVE0/MExAczg1MTk8Ljg2UDIzKF5DU08lZSp1Qm8tbXQ2WVNqcDhPZ11LcyFnVygiO29OMSwtZnJuLk0vUk9AXVwhPlc/JUcyKCJhJ1AlTEtJLCg/OEljS3AiY2IkQmo7VE0xUC5JJWs6biNAOGBZIUglUSI+Mk5scj9CODdnSmFsK050U2ssXEk3YSZ1PCQjKjtCTG0yPWs9JzZmczZwS2M8LWtWKU5VLVpDZj1zLnNmUTNGPjdFT0JxW21fQmUiKEtjJ2M7VlEzLE1nOnJgM14wdEsvY11ELlZebio2TDxELHRecW9xbV5DRmwvNT91ZW5laTxpIi1HNy80MFtiTCJeZ2JXPWtGaGVFW1kqVWUqUU5OVWwrJENIa1BJRT9xa2l1UGFxbSJGWFBAbV9bdDFWXFJDV2k7Vi4oUlsqayMzb1BbIzcoTipFaTJKW2xmZTB1TVtoR1o8VyhYRDdXL21AMC5BP0hpSm1GP1JAMUkoSDA9Pm40X0EuPTFyUWUrRW90W288NG9uRVk+LU8uayNhNysoJmc5SGB1Wk9DbyhjI1w/JEReKlMqTVNtMCVRQm44MDJHU0RUVzliJjcwTTRNLWVbK19BW1sqLGBCMSFzP3AmTz5gbj0taytMTVBqJF5bS2xqblM2PWhlYk4tLTNsNTZiSEdSQVA9S3IjOk0vRWEyQEtkNUFIVilISmwmdCFsSC9eOUN1WGBeb3VKZThsTlk/OG4mRk8yITAxViRIVCZdMlE8KTpnR1EkbVRJciZTbi5MTSdCPylZSCtEYCFyajBJbCU5OFVhdURNY0w/OyVgLUZDVTNvQjk4OmEsP0lTMUs7ZE4xSTc3OSNqV1oiIkclQSwkTT1aTSY0KG88K2MtVVZObVI+M2BdRFU9SEovY3RAakUhUzI1YD1bKjZDNk4vUUYnMS0iRW9NQTAuUiZSY0VGQCZMbD85JnRwbDRCIjd0JlBJJlE+ZVBfJzQvUy5PRC8xJ2toPTRINClxYWdDKEgyOSlhPS4qcU5KYyYxRSopJytDVkUqcTo2Mz4wSCY2TCw/Wy9jOlFXY1pNVj1mTjRCZCNiWzlOY1A3b0YwJCphTDMtR01DZy8qT15aO2JOVUNfQy4zMCxhWiZrKidnZiJMMEtscjldZGRwJl5maFgzMVMoITVcczxzUFdcZWUkWEJQUl5iPCRCbFR0W0hPJyNFTCklbEBWISwhTkc5dERaI3NWRk9NQmtGOG5nbT07MV4qRT9NLSdYNU4xTWdZT3JXLFMna2ZLUitQQzZFXiU4WkwiSi5hUnFgclBbZ25fVCgqLE9oMDFiQldHJG1Pb1doVkotWVBqLVYxaG90X0hUdTVGTTsiZChoRztpRFUsSGAjOTZVMFhcRVRAKCUvZHVMcGJxNShyQUddMCRgZT5UOzE7SXBeKVgzIzQxS0A0ZDpSciJlJ2AvS1VMR0prSXAvPSVoKEY1L11ZciRgZ0JCcXNMYzgzOmIsMiJ0J0YjPEozbSIsQy00PFZmNlJhZDtbNnBsWiMiS208OWNjN1lrZChqTF51SFFbJkNjVF1sNE9Bb1doI1o8YEZUKExnaDpxO2JHbTo7JlBGImFuQyIlNC9AOC5uNi41dFkoKjovZyJiVXM3Plo6ajpPISpFUU42XUxfZS5TP0NSZ19McyZyYktAKWI2XHElYmw6M1x1TldFTVpgJUlYVVglRSNUXDVJMjlzWG1tYSNBUystVSttJmowYyouYTs5amdgQlY+STdCOSMlTV04SixVYz88Q11nb10rUSlgKSs+MShWbVBlcnM1IyVfMiZOZ2ZlQEdndUJjJjpLSWVwJzF0Zkl0R3RcIlQ2ZipPZVBNWVQ6aDBNQEROKGNRV2JzKG9jbihUbzRfPUxQZEAiJl9WbyZlViRwOW4mV3BmLDc6Z0BhR2J0KjskTkxhUTprZUtHVzs2OjBdRSdNKW0mJzRiWGZcQzcka0wqLkkwQyY1T0MwYHJRQzIrMSc1KFBmM1lqKVwoMTNyTEE+PiFMUzZHPSZvNF1pWXJzSS1tLE1rKSE2L0ltbzFMPi9JYSYoNCZlNT0iazRZOmNiRTAiUmlIXl1BVkgwKiEtJDQtIWBpWmFJKSdtSl4mTWsvM1hicmc1YUomJ1ZcQW9jSS4hXTljSzBTSSZlbXBkbGdQUnRvOE80WFNucT8jSl1GMCxKMCRNcixCJk5AU0g6bCd0OkMubVpHKz5Ncy88XCMhQ2FtYkImWkpiQnAvRzolNHImQWllJiUjWVg8M2ZyOydsMmMoTmM5aV10UCNAcCNNdSZKa00iakNzZlosSyMlbjZGVlExXDFXKj9kI2V0czJtKS5VJld0T2lYWChkPFgiTE0pcy9RQlhsOSVhPiFDXytzUSEpWThrVThZPjFPaUQhP1hQZHJdRzkxVDtATG9dcSMzNEU5a00vPmVuN2k/c0okTmZMIiFOJnFoKFYxJmwjUkpMT2lWbiQwciRBTD9Na0pJISlFLkhvajgsaEojZTk/UCJZdU4oJlJBKm5CU2B0RkhWM2lBSlNMYGc0M2JDOmlOUWVmWmE1Rk9BUzpIKWxuZGROLlVgVFBAPEM5b0lxYCoxKDQxQVNzMVIiNDZCLmdAW2pZVk1qMVAxPjBDUmUubFJjKSIhakE7RWBPc3IhQ1sjQEBGKk1NYlpcdGJZYnQvTT9FImUzby0hKyclNFlmW1wjbFREU1ZuXSVSJDkrRipUSG51P25wSD5ZW29TbWBFLD9rXStNRW5sU3M1ZU0kVStxXzFJOC4kY2YyQjtwMUdsXFwwV0dcJFVhT2YrbShVKnQmNlhzIkcuM2tDZUdUWmtBMF4+PWh0cylWX0srWixLT0QrWS8nZiRZQmhKW25QQEhWPU45dFRtR1JaJ1onWF0lTnFxLFlkMDRpZ1RFTHBpKkpXSmNPLW9PIkFUR1tOaV0ycG1pMS5vZWkjaGRrPiJXQEROUGdAJEUvckkoIWIjOiMqPyxNUmZfRU9lSmNRRl49c25LQW9Fc1w6RVQmOC9KJiE+QTZjJlBwT0ArVkZxUVNwZ0lQREIncGw7ZmVmTnRqbicwbmdsKGUyKzxzWDUiPHE3cWklbFZbWU9oZiEzL0wyb0dcSnRTdDVqZWxubnVFOSpDNWsjLXI2ISROO24+YSEiSW9eLVpiLChkRTVlN2IxNVBPNiJsbjdAS3U+RToxWDJQND8+MUxJW2QqUHMnJyhpVDtuOi0qIi1NdUcmLCVDU0A8NjBjSGRLKmQ7XSdFYm1dOGVkRV5BRztmUSooL2xePDIjUkVJNmgkVmguSjEoX2pyVDE+NGZFZGtbSSgqImZHQVJBKWk8Ll1KS04uRTI0REcxQVUoWWcwdDc7PnRtKG9Obmo0cmpNOkUwdF03ZVMuKSFsdTZCQ24mRmczMigoVGRUW3JFam1eX2UjXXNdXlZqI1FOJVpkanAsVzhlQ2tMWDEqOzRCa2ghZUhUQl9nX1FubmZfXy1LVDInJENfcFE2YDgiJ3MkVD5ubm5PU2kvOm5RUzBOYyhyQVpSPnNmL25NUF8zaGk5cThwMz5KJmtBdXE0ckM1QUs5VGcrQ0E9VDZVQTxVPE49QEpARlRDMG0jWjBLWTo/RVxEY08xVEJccSQrZkkrNjVkdXInNHRLVSdnRiUlSFI/Ym9SOmBGOUA0VnFMalBzVDdzYDYyI3ReSDgjbysyP0JEdCs4PC4lXkRRXFtGc2QzKGZnNnVncyhjJktPZF4qanIvWUoqcG1lQk9MdSdFZmlcQ24qX2hLU0c8PixVMFNyWD1RMDoiV0p1blpVSCdeTCZyOSYtQzkyM25MOW40MjtBJXU5akFYUmw0JFlqNTQkaE5MMGVjSkleZUtvW2RYNm5mQGtyPEhcNSlNQ1lhS2lmXlcwcFhxImM3SVp0NjI6K08kVDBDa1gjRCN+PmVuZHN0cmVhbQplbmRvYmoKMjggMCBvYmoKPDwKL0ZpbHRlciBbIC9BU0NJSTg1RGVjb2RlIC9GbGF0ZURlY29kZSBdIC9MZW5ndGggMjgzOQo+PgpzdHJlYW0KR2IiLyhsWjpmPScqJUM3QF9dOzFHJjJwJWE3WVc/MVVjXWtmb2JDaW1cWD42JnNjP21URk43N1w6PUgvNWAyOkA0VyJwX1JAQ2A0OicpIV4/MHEwbDkrK0drRDVrOjYtLEBQTUkvJTYnQV0rLUgvRCJpTEg0MDk4bHAjLFBrUVtuI0pKIVhGaiNMTDg8b0NSajlXbF0kR2E7ZGxOYy45dWc0akoocChCTD4yL0tKJlEsMUErVTJOQ0FhYk1Ial9bSmxgWiwhU0skYFNfZGdPXFpuK1FpNHVYLSVEPmAzS2lxcDBrT2NvRCE/TnBERz1KY19MN08obGJIYG1Icyp1KlkyYmpUQTlBRmUpK1IwVUxfYldsb2VrIXAwPjdvJ0RYJFgpIiVtQjo1JURTQCNPPi0qbztpR19uZHBQJic0Y2w0O2ovdUVWMTBkZVlqKFFfbjtXMCo4XyNiZHRwLHNDVVtMJ1NUS1JPS2wlY1gmNk9McGA6LltCQmxrKU5WYyoub2pWQDUzbmE1UTNCS1ZbWyRPNEwlTy8lS1hGRUJIWmVAVmotUUY6UUlOa1w6S2xsPnRVXj0vXEglNnEtQ11Sc285WSZFKFlGNC5KaVMiSl9mSlNSWzNMKStNVyRLOUQ/JTFgU3FWXVYmKHI3cj5baXBRTkZZVzY7YElkI01lV2EwP1txKmBAOGxQSCwtbjk7WFc3OjVITjREKFZaZUxGWUpBI2VhdGdYcDYvJW1Kal5eMyEjW1VKKE8kXTpmRWoxI2JiU2tDWj5nZk1aSGNYVlBbIzYvLyMqciNUP1owWURySTBIRWlpajY5bEZOWXJhcU0oMVdRPFcoMj9HVzpcZGkrIm0wNUU1QVhvIltcVENBX1QvKEtUU1ZbWkExVDU7OUtcUTcqY0I3UFA+ZWRqcldSLFk7WkgqKiZbclZOMW43UCkpK01CYVAkZ0JOIXVlITVfWyVqVjpTUURGL1NWKio5UjRUZERVdSZkZkI6PDJ0UywyXmVpVFRxV1tfSVItKiMqQC46SEpyXzEmU2RWTHRHZzQ1ITsxbiltSG5YW3MnZ1ErUzAvJDg/bkQ9VVUxPHUxMkszLlY7MDw4KHBDWnB1RzJMZS9IPUlOKi9jXVl1R28nTU1OND9aczBZSChvbWEkVy0rXTUsUWcrPS9ALFFJLGJzTihOc2EvPllMT1hcIjhgOT9wRy5sSmBZPSFaYD1bXHRVJHE0UD9fKl5aM1hZTFspPSFwI0MwblNzR2tnVFtwRFRbbWIjQTUuMDYpZVd0TV5EbV81V2tCQE1ScFdXJlYlTTxkWk0+Oko2PzExMEZnLGImJm9wTCFaQEkwQFZAdV49WV1BQyxfV2hMTFxDOyMocE1Ja3RFPi8tOTptJz8pOWZXbTxGXVw8TnFoVCY0Nz9sX0lmXGVuckU2QjZoLyEpO11MOk5ITCE2Q1lpJ1c/Tlp0RTBFTlc8RjAoZVFESitsJnJxZmpMQW5NXScoSzVCWTZcPF5rOVZaLi40VG8zIj4tWT81YlBNdWFFJkI+bEFMQkojSyprUSozcC1ZbV9MRERuNS1JczdXIjd1NE1zQD5xTDRnPzc9Uk5NNCRtOV45TEhlJlBQaG9LKWheKWRTJ1FgLzVQQTo6cDIpJkZtLW8qPCNoSkc0Klk6W1ohR2BgRU9lMkxIJFdjUCU3RjoidT5hPmZhVjMmNWQqNUE6JSNwKEJTVjMtP1YzRFUvUidmTVQlcWstMF1ESyhjUCdzKXAqclQoZ1A5YWt1bEUuUnRqX1ldJjdmRFU8LjNtXTZNWFRiVlglUT0pZVZbZ0EnRmVETyVgWTZROzkkaT9fN2hWUittaVM1UWFJRjxkWSExLUA4ZCwmZTdLL1hIbz5hVTkwXFtebToua29FK1goIj5fcT1oSHE9aWorQ1AlPjRvTigjai45WHFyVEBPIl5PcW47JkdeRjQjX0g8XTIqTlZlL0ozcU0+LD5yciEqLnB1LiFDYXVNPm42Vz1KQC5pWD5yOEU6TmUjMWhaWl9EdCMsTCJsQykjKkVYPlxYalVGZl5oRDMxaU4oTDgiM2YwL1dpa3JAMF5pMkd1akRwcDxzXChRWnE0a283clttLGouKkwoYj9QNkdTOUROTStMLyFXY1laTkolJEIyI3BZPGczalNEW1MtOy1nWCcyWlwjc3VxRVJcLDNZRDltWS45OGNDaF1GPkszLT1VZVRdVnE2Zlg3XyUrSCFLNStWV0BFQUVCaztpaTZka3MsYEVwRXJzVy9eXSE7ZSFWQTtkQyFFYisjWXAjKF5wckc3SE0oTy91MF0zTmUxbCViWk1tLVtpViFnYTg7UE4zJHM8cjlNazlnWTcmSz0yUU8yaUFbOiUzcyZVXkEoNTEjdUpeTiloKVlzVCxjb0xnP0tlMFctbHRfRmVGKV80MCxCS0ZtLHRtTjY3b0hZMDFsJFo8PztgQ1ttUiUoM2JQKFQ8OGdVXXEsXylOSSZFO0hzRFVabCdqX15FS2ZsI0Q9X15XT1pdXWxmLXIkMG9hKkwnL043Q0E8KiJGIW9mbC08cGA2IWRZR3FOdDBRWHAuPUdRMzoqTk1kMzNoP3VTPzElQEZEUkVdR3BZTT5XKGQ0VXVfKV4zOTE1K0kvSiJVR1JASWdpVS1baFR1VjExSEkxQFtNNFhENG4kR2AvWjFxNiEsUz10Y11XN1VXYlJkT19iUmRyUD5nQGohZ1FmSlA6TEA8KFtVLVojcjlVQiF0PCJXN1Y0TCNjczQoUiVUdUQyOTcmPj03OjpbbWI9LkkrV0s2UkRibj1XRVYlP2sxakkiOVNFLVJBTmN1SzI3OVRkYzFMUz0/MzJXQ1JTZVRbSCs9alhPPSMzYzdsPTMqYGVkYXJNKCYzNzpmLjYsTic+ZTg3JDZnPFZQSWpJW0NmbCtFcSx0IWteVHU8KVVSQig2Nj1uWW1PPT5lIURlJiwtJ0xDa0EkRDJ0WWlsWGEtbi5aZitaaXNOIz1AblI2PkszJEdbM0kmPVhPWU5yLz1NaV5TYlhea09gc25xRCEob1liPUhDOUFjJz1QaiRPI2lyLzBNak9QOGAtUSJtMkIjb1NHRnI7amo7SmNUZ05XSElPbXFWXyE+ckNIZElfWmIySFQ0W1RJcjc4RiRNQG08RygwVjJnP3IjIVs8VE9pQD9aQ0lbZ2tIYW9KcDEjQk04VkNfPkNuc2leQUt0bjBgNkIqNSZrKylkakRrTlgwWC00QVQkaTZ1WD5OXl4qYl4tb11tUEhjTVhoXlw4LyhsPyVTcGluXSQ1Xjw3KGwzVi09S0I3VElKSDxXQCxMU0JTJWljLDU/VCVrJCcwM0MoU2RgZSM4N1QnPDlAKjRWT2hJQGVERk1xY0leQk80RDFDcWNJXzVuJy89Ll01XlFFTWchTHVMJF9DPF5TaElrSEVmSzhHNjJBSElWNmEvbTdUYiRUQFxdJmZxakpzWVxWITBfWUlnPzc5IictNyQlNTduZ05hZiU9clNmL3VVZ104Wlkvb0xcTVQtL3NHXU4hPj9YW0djSCE0ZjE5VSZubE5iKFFTWydzLDcoTUclJ0Jwbj9DZ21wXFxNOjhAO0ZVcS9JOj8jTmRaUyRuSFZCJWpCLmRnZVtfaFJcTSwvR0poTC4xcj9ZYnEuRENodWQnPnVgQWRBRCMmb2gpKEI9WERCKCpdc0UkZEFBcEQnSi5QJzIhO1pNaTk4bGhDQydUb1k6Ok9YPyxBTipnQDQnSls7bz4lMTsoXF5DN3V1bUp+PmVuZHN0cmVhbQplbmRvYmoKMjkgMCBvYmoKPDwKL0ZpbHRlciBbIC9BU0NJSTg1RGVjb2RlIC9GbGF0ZURlY29kZSBdIC9MZW5ndGggMzY1OQo+PgpzdHJlYW0KR2IhO2Y+QkFRLSZxODAxZlZfS3UsO1p1ZywnaSNaPVw3OC4vNEdmUGt0R0c0JEM3JlVLWWlYUHBYYyNAR1MtbUEoWCRXbS1fO1VHJUQxN3VtIV4jbCRIVyI7bjovK1JfIyQiJXFrL0o2X1lPOnRUZXFHcSUmVz5MaHFwdWVkI2BBWCxoI15NPm0mMkhONyQiJmVdMFRsa19eWGRnLjJCRzxbQ2JjZ0JaKVw2VjVnXj42LV4lcSJRPFVDajw5Kz8nNVk8VyRyaTw2Tm9zYDhRQ2JEWSFCQCgrIjRbW0ItRS1eLkklMmkjQyY+RFI0UkwpUlhWTj5eT15nQlQkQ3NBYTZERGokSHB1WkIzOVk7b2UwISw1LVtic1JdNm08Ojc9JSwnZ05bJCw/RC1JUlVLMGtZLEBJWkdQNVEwSzpgLypjX21oI04+Syh1O24wNVYiVSpmP0NvPDc8O2pUQDdZWylPVFssIl9cLXExKTcxYm9LWWkwME5abVFUOjRlJTdKOXI9Omcqal8/aV9rUCFfVm9mSipbVEM2WDs/SkNDTWdxNlgmUT1DRzo4SzFaIltZLl5IQSpmSEspUyRvRFkyYCRQTUQ5bUlMIWFFSlo0VSZpYyZQNU1fUF5UWytSbXNNOjpRSFNwXUt1OjFFSldQOk9bb0dHZVVpJD9jJFA0XjdDPU8oIz5KNTo9QkA1OHN1LDMxLlVPalNKY2B1QDpDKlI4Uz4mRVYlclxjPjxtIUNEaGpKVyc3KVgiYVJlM2Zral8zPSxSc181V0VralFWKihaNlAnXkNSaT8uKU0/JlYpZiJbYVRiN0hNK15wSSVzXHIicCVSakAiVjYhPmRYK0k+Z2AjJlcpPmBIJGAncTVOKSFhcG1NUjMkJ1dGPnI0Zz09aCcsL0NtbXVYUzMoQSJaSEFNYnU1Yig1IWdsWFJJLD5JWThTOTZSOFtwL21rSk9LRUppbVd1Pko9aCdDJSNOJG5DZTQrZjgtaU4/LVBWT0UldG5hWFk0aUNcRSFuQnBkPlsmUF5TbW9vN001V1crITZNb011KEJNXE4iLXA1YmVGazVzaDpXVjQ6ME4iPispRFNrL0sxSjJmXDUiIT5LbTFGPWdtUENJUUM0YSRTdVwmQGxKZTFSJ1BJNVs2WFE+NUEzKHU9YzlCRCdAdUFEXytiP2w1PT4tM3FfSSlobik8LDRQKDAlYTlCWnBGdVE1ZWJAO2M0aXRSVmA2YWklUTtwYkVgVWNkblYpPFoiWmNfY2wvdV9wM05qSi4vXjFLcDJYMmE9QDU1ViV0bUBLInEwM1twLGM/W01dKko7P2ZuMidLbTtRSXJsOzlrKFljYF1COi9zQ1dwXXRkU0tjTGctOjtlPComJ2lbal9GbjlvVj1LZ1QtVkszVTNoUUVgOTFWS29VVi11ZTVCdVhxIS9fNTQocyJeMiU6WzpAZC9GLyJYVmFybU9cTUIhZ1FUMDJhRF48LyFNUmFxTlpwQ0ZyaDNOSHE/WTU0YSQtbVQjPk4wNEMuRlVlVHA/RUg+QyY+VmVAaUBlc2pISVZWQFZuWHBMb2REPWVxRyJnSWJXPiVgLDdnPyc0VltOUmwkZ0UqN1VTYjo2QzdSYmFiUz5oXXBvQkRXSmhwbSw0OEc1cHJQT3BRUiItYEcsbnIqQ15CSmBFbmU9TlRgK1JxbzlwM0ZJUCxcNlBARzhLNV5UYlRhOSZHQ1JBJGtpb2ZGUkIvUjVQR1Bdb2A2bzBsXHFYdElDS1BDIyUmNjdzYktlWmYrSU1aWWgtWl9fOmAoZiJyWSNRIWI7YjEpOyQ9Vk5Mayk5NSdFcVhDKExsZSNoNSU5RDEiXk4kcFRrWyFzSFtSbUstVDwyLUpcKicraWBLMFFLNCJKPUlpaVI1VkJtWFYvXnRiKF9CWCc4QUlCOF4vWVotQGluIlw+a3RlaV09bENqJ1NgQXJZYWBVMVwzclxjR09GOk4xSkhnYU41bFN1V0RnLDhZZE8zXklkOCxIVDBULjQka2U/W106SEhfVTBSW29SLGBSNyRINi8nOFR1YUc0cE04NlwhY2g6YydeM05wTjFkS3JDZDAqKDNYVXIvYiYrXVtXcGlwUj9sO0JGKzdnR2pBKW5mTTFWPjFZRTorbDNpbikuOmM3YWorcjQ3LW89YlpALD9eTCZGKFlZN1ExNV9mOyFRQVlMP0FQcGIvTCw8cUhfXDU1XltcanBZajdgKVAuciVyJW9kTFFmKWFzZ0BJLyU8SmUvQWloNitaaEpNJzBmOWhXXFtISlM7Mk1LaXFeIio8OTYlV2s+RjdgLG5gLz1hWFNwKDdAQD5nUSU8QGgsaFRbViVpW2tQVV9qT1pvLDNdUUNEbEdJTGZNO0YiMVlUQi43TUszPVFuXztEUFhLJmdXQiZwS0JAUixNYnRoYS1nXj1hMS5UN2cpSHNPLmEhNyg8VyFpPVorcS5SLm0nP0RUVWNuJGc2RTheV1hpRm1KUGVBQEVDK25HPyFcYy5MWWBxKlBGQTVYJTtIUFl1PUZdL1FuNW85L0VeamduJDBdOUklWSJaZCQ+X1hIJ0AzPClDTVU7QVQjbWFeWCxGVDhoXlthOVMvZz45PE0qMlg9MChIZTguTGI4blNxSE42XGk5WTYqP1Q0XDZjXD1wT1BWPD1fY25vOWZTWC1Ua0U+bD85LURPcXBnJD5PI0dyZmhRWE5aXWQ2NjhiL0ZgYlBdOV1vYHVrLkosOzNMQWtPIzRuYG5JWS9qOjsqQ2xjKS5PYDFKKWNlTiY0Qm5PXCY8bD0yVWpCaUluY0tkWUpOWiZSViswbWMxNm4uUyhOQmFTazA5OiRFK1hTSFM0IzJvRG1uX2ttL1VPTUtkaT0+SXRnWidnXCI2XjciXWYtPjVHSGZuUDZaUF11V0VNcXIoXTopPz9zcCFRIj5yQCVCciM+XnBdOExuImsxcTtJMSlbQDBwLmlNWlpzPm51LGAyXEEnNDBQMTFkUDFBX2JsSVFpOSYuKSZQZ0R0W2xQQjwqM0c3ZEojbjxJbjwua0RcYnFJJzc2TC1AVFNnPyRtJmpQKmZUNkAlaz9mPzpTUE8zWEJxaDRAIm4tVD06dE0lKEtMa2VScEVubjZlUCckZTw6T2JnW0dOR2I3UkdkVzlJPCFHLS9qTTNsVktAJ2slKGw+J0o+MkVaUEgyJyhRYXBWJms5ZjRfPllyQmdgbyxHKk01cjE+MEZNPTImMzljSEdpNlxVLk1rVT9nLlNiLT0pPk5MJlVpXjxVK19TQSFTKD4nXS5NRCJiPlYza0ZcJUYyY2YvTDNDYGltR0Q8VnVGOmk2ayd1SVd1YF5GZikybXA3cmJHLk40Ji9EQ08xMT1BPkBKaW0rZ2RnRz0zVEhVQygxXGxsM2gkOTwlSyNjPEJuaGxzWGpjRUtQL2lzSTIoaS5WTUsnbkFiOFttNVhMXUZQcWE9KnN0N2VILVlOUmdoLig2S2I2OmZpUzJmU1YpJXBrOENYPzJjTy5ZKFA0NVYhWCckIj84SCgwU0NuJHNNMVpuWnAiayUzcXExaTE2NSspZS9eXjM7bkpPOlQ0aiE3XyJIPkNsLDgnXXVjU1hEI151RmFqbzlvVEgvYFFtTlsraEJAVHJZNzhsMy9mT3MuTltrI3NKLGsjJCwzSiJCPl9cbmMtZm9ZdChTT1hlJV8nKzJuR3FcQCgxMlZTPkVKTHU+cVRCRyZnckE2V0wqL2NAZUhPPUNyZi86MXQuJSYmIT5PVms1KkIuaVFlbEVOOF5cMUlCbywtLVM3Ml4rVGc+XlRUMjsrTEE7QU85ZFBWUl8zLCctcHAiLz4xZks0XDsxN1ZALDI7W2pUb2UrRCYvOz49JHBYYjE7Ukgpc1VtL11wOTpNWVVHKjxJXFJpLiY3Mks0Ikk2ZVleajQ+KCkjWltCLkctQD1rJl1DVS1uYGYvWGxVMDQnLWBKKlRhLjotMTg3OFdvNTRNaCxSJmNrcjIuM2E9V3M8K1RNVUNnWCRZbGYxaGk1UShFWz1APVkiOW5xUmtAO0JHbi1MYi5Ba2ExckI3VjguZz9WVkNRUi9LS19KSyNSUlFzcG1FNFUqSCQ6bFQyZzl1VDgsNlA4aC07UjVIPXBnYSs9XHBmW1hCYz5MLzpLSlBiMlM0byEtbSxzO3NUYXIhXUJwTzVIPG83MUc8KVtWTFRbS0NtNDNYVFZlXWExZ1RVYlFpVXE2XGhiSWE/bGhFJjsrWV1SIltIMlM0MWFYNz1wQ19OJ0kzZE4/QkJJJjdAVlQ/MWlRPldDMjpZalduZWVPQ244IlBBI2Vla1k1MU5kQTtESFA2LEFfc2dRWCRwP2hNUmdlYWYlUz9CXTdOXTtcPzhsXFhjWzkhJkE6JE0vK25RMipGPFJJKE81SExqLSdCSidbRUpVdGg2O20nQE9FaStVLFk4NG1aZ2whJi1vYmFtIXFJcFJBPCQtN0NCYkAyZlVLal1KOjxKRjZyN0BYajwiNV9CInQlWGZKIiVbTGxePilkSEVHZ2JBJlInRi81NGVuSmRALzgkJmkvUjVQNlNYa01RZzJJNmoiNiViZlI6LDJgbWg6bzcuNipSS0pGRjclOHFdIVZsZiElKixKP1pzOFc0SmdiSGgscjRcL244TClWPUlTZCglJCRqYyVNRUkial9aPG5nXGNPWkwmQU5Yc1kxTE02UE1saW5kTzgsKW1IWksoOCpULm10OCEjNXFLJllFNUwwWDtmJytCVzlYI0spbSVmc2YuJWZzZVNMT15rLFIyPilAJ1olMitKWUAydTZgViJXPVpzWjVfb2RVcCNxZGwhXzI9cHUmXShfbUVILUZQX29oSzJJakwoLVBsfj5lbmRzdHJlYW0KZW5kb2JqCjMwIDAgb2JqCjw8Ci9GaWx0ZXIgWyAvQVNDSUk4NURlY29kZSAvRmxhdGVEZWNvZGUgXSAvTGVuZ3RoIDI4NjkKPj4Kc3RyZWFtCkdhdG09ZmxIQzomcTBMVW9bQiRQJ2YiTDFwZHBUbjFXbWVFL0JhR1I8Ri1kXFAqIWpVKEY4RENJZjIrPTxPU21HVGo8c1EhOjRTWyVfRE47KVE8RzNhajIoNnBnalVuSUYxPS9AQzYtXDwocEU9XmdDQXFdMkRuXzsoVzptZkA6PlIhNipELGdONmohbFciIlBWUHEoN2xlbmVTVTh1b2RLNFVML0RLVkJsR2VCNDFGYDwiWVt1bWhsTmJdT08uJTctLzwpQFxtMGVFazA8a1ApKjJSWjQ3Py4hYTU8XFtrVlVXTkhUL0grSihycjZAZT9ocSVdb04tTituUjhdOHMjNyVZSyUxQXU3NV8/Wk1ASkFzRURENyRVQyFUXCsvaCVaZUUvXnE+JCheYTVQKyxNNEcvK2FsRylxV1A6OF1ONTVCLlpYVU9EQTVMNFAuWGdqWzNHVEdbITlvXFUqMjIrTVJYdC1zQEJUQVYkakY3KT5ITCZtWV9YcCgzJ0dqRGwyU0dVKmEzLVxUNEYpMT81IywyLnFnJTtbNlo0bGdkNzJULiVuMThLQkNIInRWXSJsJFE4azI1aS11YkUtYnJfOF1OMzlEXCsuTGExQ2E4ZydNQmhjSVczOVhOSi1SKlkvYXRsRWdBJHQhYCNBJTtHYDFrLmcwUVtARGdQMkJUYzwuazpFQV4/OylMbWVsZmZBP0cpTCMjVlM5KmRuck5hPDRvdEFIJmRrTU9sYz9iZyFWLWpLcFMkUmgqZ0s4RzNoNUs9Vjk4LF1dTSZHS0VvLWM8P09qPUhicipXVy0tOj9lPXNgMWFVKD9kVExtLmREKW1LT2NSYmszL148ZSgoZmVHQVU3YjRLSzpFOFRZaVRTYk5GS2M2cGN1LWRMZUcoPiIiL1RiQWpjTzxjJV1mQTJXRSdyaERYOSU9ZyxOP0s7TVhkUT9eJC0mYEpGNWNaQmwhOFdHVCU4Sm1ZPl5FcDx0SGIoUnVFWVona1VqcEU0aV1ZYVtbQUwiYE5xJD9rQmsiPi1ZMmcqQT1UJGIxRkxPJXUrTClpXUdXOCJGXzQ7bzIpWD9rUmV1Ul4iMXJcbXFXJnNlTEpVI3JJUF1TQUI2ZzpXQzknTDQyQkBSZDcxPE1MbSIzaU1sPSNDYTZtWSNiP1dkbkwhImFZRDMwM0EuWUc8SHA1OyU7cEFpWVRmJnJHb0xHVUs+MEE9YyxXKEIsL1kxbz05PllcLFBqcW0hYHIwaU1mbkZpTWheMkMkb1ZWaCtfUF1qNkQqXXBTL08rYU1NTVRfQEw0WE1DWEBraW5tRV5WQ2ZOIlRLZWIkbD1hKFwkbFg+IXMoJWYkV1UlITRIRykhTT9Qaz9lM2A5IjU8TWooVUJ1SildNzRgcE9dbzQkI2hbPHIkVnFBXE8yXkhJQyVXTkMmJl4+MyRQT2IpL2xvVG5QZls2J28nOG86UVVkLjhQYSxnYFIsTU4/Uiw3Q2ZIOjtrc3RkKjQ2TzY7RmQ9ZyJudUkhPjxGQ0JuL2JULDwqWllJMDhBYTFtZF9LW3BZPGc6aFdCZFx1NT1jakdnczYicElNWE0hVnRBOTdMVmw2Lls9QEN0RFhaSDEuMmFXaS4rJk1XYkUhTyNePzVvTEIyOVRTUSVyJD1WMTZvMiZiX1Y5M2RQaEVkM1Y3P0FUXyNbaSJzVGljZiJAVC9yUDUpRWFoNjBYI1BwbFVZLjZyL3F1RWNGa1dcWHJnYz9gV0wiOEZSQVEsTzEoKCtAWCNeLSI7RzRpcyQ4KTxRKyVbX3NAVCRSPy9bMUJXJzc7LzBNNV0jblpGKzheTG9hW3BnVGA+XCZYbWE+by1FY1MnQUwraiJvblBqbi9ONms4RDkiX1ouLFZdYFtjVkUkWWsvNW1LQzY1bzxzalRvW0otYUA2XjZOdE9bbVBuR2E7Pi9EZF5iWU5fLE5LXWhQXURfPCtnKnBDTWE8ZFc8Lm1wUj4/Sk5CRkw1TyVbKFdvYF5gTEU4aC1zanIuNGZpPyJEXzlvJmVUaV5TY29abj1CXFRUSlgsWGxSOUNqW2hJUk48QVJjWi1nVUNDS141dEowN0IkKVNlXydyLTdEbzI8RDFdQlhiOGFCRmRyLz1NSDY4OFNqSDNwaFs+ImRecSonTTUhaGwnMzdhWCpDIzUmb25FdUxfJj9xWUxjW2o1RD45OV4iSz4tQlwzLDcwSVI+Zk9ZbFIrKVNOWG8xRm1SJSxQSV0sIj1ORWVMKWpAdCZkLSQ1N2ZgOjw1dE4wW2txOkdSIV9uUnFxPXVUWytsNVVtV0gmOGJkVElucFxLa15RKCR1LFtwMmpANjhJJSk5TjAicSVJSVdWYjkwZDxZJ3EuIzUmPDpOMmJRZ08qLWQ3N0BjWDw+XiVBLGw/KHVgaCcoSEdWYjk0P1NbTWI+P0M0WkBtb2xLQ089XyJuInVIa0gmVmIoZGxSR0BcJissMS41MkwmdW1yU2ZyXWJYO2kzMlNmRz1DKG9NMSFOSGw/R2VaOW07MHIyM2Y3dGdqZ0A3cUVzTGFcbzRZLG1Za2RnWUxEbCs9RyduaUY5aXArKzFqRC9xUy5QLWtJNT0qTERWOUhlNDxgVSRxVzw0aSsxSDBPUWRDKVdpSCg/SjxlT2UvYU4iWTdkZ1lqPmRNR14mYFZuZ282PlRxJEhocm5tOVY5XV9OLltXRGlIckg6aG5RNUdcSUUzUC0hPmRFJElXSVNhcU08PlB0LFcxOGRXYlBRa0suW2ZvaWVPYlRNTjwxQ1dpZjFZYVtTKTMjUlI1IldcTUAuSEpHI0FsMCtaJzpiPy5uYmNnQj9ibGJqaiEvWEpkMThJQTdFUyttcDQhXU50PG8oSzJxLlwkX2NqUWlaJzxTQU9QUjBQJHJIakNuU2xjPyNkT1JaRzdLPkhUZnJGQFltS10nXWwoLzNsYERdUkYvTWk5KytHaChgTFxAS1JHVEhsKks6VVZmXDAkLEMsOSEyIjJCOGozYEw+ZydQWmJjbzwxRCc6Uk5xNU1eLlMlK2tsUGpbW1cjL2dlVE9MK0pcXlo9TFVRTikpTkM1ZVYjQjZvI3MiRWNcYzpiVFQ5NiguZiFmKlpVLlRxSSRzU1o3Qy9EUSNpQ1BBI0ZBWjBxQSpbK20lN0EzMVZYRzdHNXRaaHVAcnBqLCc7PF1GXV9kNkw9QDojPydGQE07VlVTMTAvO3QoLDEidT1QYCtWPUZTMTNRYHJlSiNlRjg4Mk9xZXA0JSI/c2lJUzRyPC01YGA2ZG1XVDZhcDhYMXU2LmprI2FNdWgzJkxwXTRGPnMzdEVUYFhdU2BvR0lsalZoJ245Wzo4YEtCNCxsMWhlOFciXVw4U0hnKWUxXXAwLU1QSEMmUURpV2dAVEEoaiEmTWwpJCZyanJVOyMvPDBDPE0pVUFZVnNmIlVmRFdkWCc8akYuXjhwcVdOWEIwaCVIOj9NQEpLIjBucyVnWEFXVURPT04pKCVAIjNTdHJjPDRFO0g/ZDglVitNNEtsJ3BOSD0xYmRFLG8nI0xmO040X0M5QzFkRVs6aSgrIkluS2ZmU2s8VDxgUDkoVj1Nb1dYIkswJUdOMTpKbyosUyQhLFxrPj1zPVoob1xmKGhWR1BCM1RCSjlxbjBLS0YlPHJtW185Q1ZnayYicidDWzxKVFspME9VRT4uIVImV1RyZyEsNDRNKT43PjE8RCdkXE5IL0w9MSQ4SyEtcUUxYzVJTldLcDFxPFtTQChsYlI5UTBDUUprcldLUG1tR2I0J2QyRC1iJU9rRk82azNYN0Q6NDVmNnRiSENzLWk7Y1RFfj5lbmRzdHJlYW0KZW5kb2JqCjMxIDAgb2JqCjw8Ci9GaWx0ZXIgWyAvQVNDSUk4NURlY29kZSAvRmxhdGVEZWNvZGUgXSAvTGVuZ3RoIDMzMzIKPj4Kc3RyZWFtCkdiITtmPkJBUS8lWSFsTV5zZV8+TmljTFU8TzVKLWE2aURiZThdPyddOklVazdBYXBGQV5NZydVdSNJLiE5ZG1rLWJfRmZGUVRzWi02YWA7cXVEPmE4JVInYV5Gb08ubUpxXUNfT0oiZVwvbTNRaS0oViMvOG50MEkuY1RkMVsrSTg+cCNUUV5oXC9LaTpxMylmQkwzTmg1X0MoWTEpc3E0ViVgS2NnYjJrXVJ0KyJqKjlCWDtaciJbNE1EJkspTGJNQW1eMmhDOj41cm1tQzUsKjMxZWFqRkMhNjRxUzo/dDQ6NidrYTdYYl9ncWk7ckYqLi10azJWTWRuSzBIUTAjdEgxUEJaJ09CRk02Q2goUSMxJSpOIUw2b007ZyJoMjBfI05zVjFIYC4hKlNTLG1MST9gPU89LzdJaFVPUSZlVVohZyYkVy1qIm5VKjEwTFJcL3FnZTlJLDkjQGRMWTIrLidoLGA4YEA5NTkjZlkocipLYT8iR0hNdFM0az1MWCNWSmRoQGo2O18rcywzYTZSdV9KOG1qSFRDciJCSy8rNzpNN2FgO0RcYy8+XnU9Y0E+JEcnXGYrZCZwVCFxI2JxPW5USS5HVXUxVCJwc1ZVNl9zWXJ0L2IkPi5MP0h0ZmFdVmw/blMnKHJmOEswVHAkQlAmZk5NL05ERG8rcjBDUGcmalg3RmNFXiQhR2hOJGQwRy07XlddQGpdZ2xncmkpbT5vczouXlpoJDVuRDVuLTBSR0pKO3Q6X0dVPk5YUVtZaFk3Qy48ckZeMTtKWzkjaSErPj84ZVlXQFRiPjNPL1BvRU5Wa2ooOGVacCRiY1dKIT1yYlxNYydkOlRCQW9hdDEiJ04vL1tPNW9OUkgmVkYpZk9zV2tdT21yWC02OS5rWFlrV09DRzVGZzRyKFxQISdbOUlWIlJOUG0vNCdfMWJdP1tVJHVBKmpkZj5Sb0UmV2ZqOTVHNS9kQGk2XVlnRU1aMidHUzFpJzknOSsjOjojPENsVCxpLVYwYiFOYVgwX19QNzpQKWhwTzpuKVxVWF0yUUY6OD9FXkhHOFJTZCVSQ103LjU2WU05MT80Y2dkXGJFLGsiOSIpLDkhUy8vQC4nYUxWTnEwTytoUSdNKEpmbUFhPzUoWlBvcHBCKlpQMFpGZXBzU0loXiQhLzM4bl9XXUdgYCxRRThuTFBwaG5FJV1VK1c4RDRSLEI8QzVHJzI6RzIyRTptS20jUUo/XmtdXWhJXUo7Tm9kKidGSXBUTGtWW20wYW5NZ1tRamQoREhMTmlTTkBrLyw2ZiZVaS9sPytVcmQpP3UzVi5HSUQpKiFEIlNgPkQrIylyKEhYTnAiPTtEYmwtVyYjMSNHViYpZUJdbTRlMSh1Tiw8M0YoRG86OVJqamcrPl9dXS08ZjRMSC9ObS85SlpvN3NXR28/YGYrbmBldUJxIUpSXi1BbTpsV1A7bk1hJ2gxOydGKEY8WlRIJFZySkdVOUosUjk6PyhjM3RzYW42ZzxITW0wKkxvbypcMUpzNEArNFIoWHFdTTI/QDRaZUI7b2k3ZjlxaF5zXTJxNyFULCdHL2s5ZlRtbUNLMHJydF1jIiJfXF5ZKFNQKlcmOV9mUjcpRTMjRl90bVNGMDk+UlJJPW5cLilqWTwyIzxTNWV0XjxWTCNNRz02akpAZEpxdT9AXjEtP1ZXNTknU2RJJCcubFVNW21PQSZFMTBHaUVJVVMlWlgiP1A9ZUxRQnJfY2pxPVFIJGk/Nm09Kks2PEZFNkcuYVRdI2s+PC1paW1MZnEkO2ckOmpdUEYuTjExTj4wW2whKjxWWComXGpHJV9uYVhrclt1M0lqLE1GWWJjZkchbzctXiE4LzBaUktxbyQ/XSZCUFstb1EqayhJVS9CWk1lKW4zSzlaZS0qVVtTKSdBNF9mIzRZL05DMyg4YVxoazxoInU2TixVMTVvVjw9PXE4JkI/QnQqKFldXz5uTSNRJ2IrYk8sInVWMFxvSklKN1tIdU86UEhkODtlISIvMlFjPjtbJ1oybCFFWDM4JnQ7Vj1jLjg9Pz8nNCk3QkJtJE1gUDdmcltUUVMwLUo/bC1ccjlPOCQ7PUIzZCFhMjZcRHUqU2dEMylaSjs1OUY+SnQ2QyUzcS03P0ZcUjtZcl1fRD1eU0VvZjtIdHA9ZDRBL0Q0KWtFWm1PRD9WJmxnbDhBdFhETFFraURIPXE8TkckUWhAKColImMlTU5AJjoyIzk2TllcRS5bOjhKPUVINSVbOm1YP0snUD5lVy5haSxGWCtwZFs6JEdxJUIjbzBAR3M4cmFsZDk3UlEkViE5Iz1QXCVqOkNmJW5WVVZgLTRNRyJQSmloRykpKStMX0FFcSxNPyMyKihYTF8tV0UmWDZyOmciLGlUYWZacl90KGNHL3AlNUQnNWk5QiEiXjNYXCpaOG5uUkVjUENvXDc7N1cvOE1KZCRXYjIoaUxGPk5fa21jSzg6UmklX3AtVHI1TjleQHApXFk4NSFtXFxkYSU3TjNTMldcZ28uKFloNS48ZmkjaFgrQjZwNWQqSGlEU3Qja0lkIW1RO1QocGtGRztDUFdKWDkjZkFVVCRqcFBPMEQ4Tyg7PVNUXmQ+KFkqLyE5ayY+KT9Tc2pzIWJkRkQ6O2lHMzoiLzxLQVMhTHNDTDxfWSE9VnBLQG9mOVwtcTBfRToyaz8vVzFlZDtHNi46UW9UMjdSJ1ZaPFE3NnRaPGE3ckNTOUtVbDF0JmNAPmo3OmguYFYuRD5DLHJsYkBpRnEzWzVAVkRtTlMobGpvR08tQVwnVDkuYTwlU1U+Z1xQVTNxNSpqMGMnPHUjMEZVOS0lMmwxXjlGL0NwPGBVKTlSLU9STlEmaE5rUlFtMkhrODBjU1hRT1kqZDouRlw0XmUxYks/VUtkSjReOklTYz9dT2orJWxVTG9PXEEpPkk0bkRIZj8yKy0yKEkjP24qQTlDXWh0RCUkQEI+P3FyJk1LWixfMmdnTmo4OFRpZD1WJE9PYlE0ZCVxVkknUC41NE1hTW1dI2QhVkpgWmVCdHU/MjY1cDNMU2llSjQtMkVuSDJVYjRnVy0rby1kVztGaSZ0cS1YQGlQOipLQGdCaDtYJ2ZQLT9MNXBWYCEvOG5DOG1KLU9eWyM8U0Q5TipeTThlUzlfRW5hPSVxdTYtUjwjMyMhWj5OVG8lUiUtaDBfU01dS0c7LiM8PkhDJVleRFVwa0U9SS5SUWs7X28zYDs1XTg7TE05cDlaIU1DYSlqPU8rdCs+ayczOTpgOHRMRmRpRmxOLUhrNTFuJ0hKKiFgaHQvRzc1UU5OT207bDlxU0UpcVVCVD1ibzMqPlEuMTZ0VFhjaiRLTkgwMChaJ0BPVUE+SkpBMl5ya0dcZyFwSWxMUkc2RmcxbjxJLCZSXTtDQS1qJ0cmNztTQlQkZUcsTGwsZXJZcyVpTjgmWUQ7L05gQDQoKkdrZkY5bTNRbm9JbEZEIjxrZSIkMUdsOlFCMVdFLko1KixycSQvXk4iKWFXRyZWQTdxPCNrQy1UcSUxbWorcFFDb0slbmdaLTFOSkYvQFUyTFtyPiVbWVxHRUxRRC1eY0tPZTpSRU1DcSc3anROUGpAOip0XkBXU01acUA1VDFiYz0oXzJnLE41Q0QwNz5ZYkFRUztiMi9JInQsWydiMCIpcEtAXE1aUEBqYTZCTVV0X0YrdHBWRlZtIjohRD1NYERvTTwpOld0LDZxcEtVS1VDYWhpV080OUQsc2RsVTZnKmVmSVAyOkU7bUdtMys5T0YtTWVKLl9yQS4jbGdfcTRYJlpnKztjP1krZSJrX0sjYEJJNGFpPjAtZXVqakwzbFk0KytqUTpdVFtcIWQmYV4laVo1P09FR3A4bmkmSyZcdFJUZ0FUMkAsPUdWa21xISEwKGUxQk1uUUQ/RFo9LSwpJ18+clpsOVZdPGhFanJKKGcpSFMjUHMsQShISUw5ZVo9NktSN2NRaj0+WU1LYlNERWRebl1VPWohUVM6VkpaTSJqZ2slKChibDBuXTM1MVJ1NTs8I2kyRjFCK0NKVShvRVosMkhOIltNI3A0SF5ydC88dG5xYl9FOnRLUSVsdXFXM3EkdDVZREskKyFwL0E3a2JGa1BjKkZTKzxXV1Y+cy9zMVIxLm1XXHVRU3NIVTs2U2Q6dFpVPTA1TGcsYV8lJ2lARS5NaydoPVNWI0klPFcqLWlCRztFQlxtTT85L291bzpSajQxUWsvVVIxQClRZzQmODtDWUBnJjFYVDJpTSk0LGppI2c8PXMhTlF1LmR0WGA2MFpZR1tiTnJSME4wNFQvVW5OKSJJaC9eNWJpN28+RSYqNjw0PW5bKypAVTVfT1ZTI1ptIjhtSjIyOVFebFVEU0BBMS5Gc0A8K0MxanRPLWBrKFIrTSo7RGc6cV45PnAvN34+ZW5kc3RyZWFtCmVuZG9iagozMiAwIG9iago8PAovRmlsdGVyIFsgL0FTQ0lJODVEZWNvZGUgL0ZsYXRlRGVjb2RlIF0gL0xlbmd0aCAxNDIwCj4+CnN0cmVhbQpHYXQ9KWdOKSUsJjpPOlNscjFzTGZJWktlKlpeWT9mb11pOUIlZ2pvMC8wbyFPUk8iY1slYj1dIWhxKmonNmhsLkBuP2ZpXUI+XEldQ05iNlFZNTMkJUlnZlZocWlZOnEsIjAvJF83aWQiXz5Ua2YqYHI4Jy91QTJQR1dkPyJsUlY7LFJ0SmlddFw1J25mNjZsQE5TTSJHQzVhO0NQXWpTblk8RmMkNkNqOklOSzJkNHJwc2tETl1hKiNFQlVIUFNHMXE6VnQwVFxNNFY+IjMrN09jWl9LOUw4J0ZHbSE9LDEjSFI0OzRTb05XQVdcUFtxPjR0Z2NlcjVTcyFuZVVUbTEnPiUpY0hmJWZAXyM6O0pKLiNpTEEjLWxeQy8+KjtSWig+OFdbQU5tazNeYjd0R24kOkorVmkwO2opO08/VkpAIjYiVmQwaXFDI2ZLKTFbVzJXOzdsaXNANF5DNzo3TlM5QFMrZjRRZ2FNIkNmcVY9cnRwVihYKSpwVWppYS5ELWIsUm9wbT07Ljc9TXVraklOOzJqc0gkcVM1KiIwcmBTXnFFbUdTbiRxUTJoNl8/UVFjQyFxTUddLiFLYTdQXzJUXSY1cTZtZlsyK1ozV1lldTklZWVCIytZaTJjdVdHODhdXUJWbjVRPlFPO2lVYXRCKUBvJmczPitpSFk4JmNTTl5OSFZUJ0VyPmRLJz9ONTNhJjNcYFMxbFIyJ29XQSMsVSUyJVEpPTMzPjYhPERRc2wkciMnWDVadUFncj84bSg8LW1fVWdASHJ0NkFncHUzTDZrOzFeUy89JjIyJ0EmM1huYDswXDtVVC10UiZDNG0/RSdHSmpgODVZa05aQSsjMmRoR04tTDY2aVEhMUFlXDZhISxrVFNORk9hO15fTlIrM0VKcztRMjZqLmhxSDsha2glZEFEPUwhOTQ3WzUwOWUuUkpuSi1XNllmXVY5OS5XOi9iKTlpWSE9Zl5Xc1pFKmFWLSE1OSJkSDJjdXRbM3FrPD88SV1OLDZSLFIqUFZOYW9HMiZxK3FvZnFbP289clBZJzFCJmQyN1lwRGNYKiovRFFGc25HTUw8RkhRSUdKbzMqVlpNbUpvSGc+KVZxWjx1VzNdJ2J0ZlZfJ3M+XzZdV05HZiclXjFINSJlTHVMNjxiKXBDXDgzTk9zUStabFtxcEZicCltYldtcEkuOEtNbSNDJ19xRmtccjU9JS9SRjdrJlhEcW4oOT5zcFstc1BQdEZURCdpUiVjJU87IVYvRi5CakdtQlVJUVdOaW11M11zM0xcYT8mO3UmKFpyTyEkJydzTltKRVk4ViVSVXAwOXRBUllnPWZXWTFyL0MtLFhcTVgtUktYMW1tTDYtaUE+aihgLlEuPz81aFBQZDNxMSNvaXQ5OVdsLydKdXFILWNDYE5RZTMyIk5OVnVqcUdMdVgqRV1hLHInV2RqcFJGTk0xR104P1ZMX19eNXVDbUUtVVk9XFw2WCRXQ1pRQEE3Ll8wajdLUVhJcSN0bkIwaSRjSzJEZEMnIWY+NSlHUCZeVT1mTl1RZkFia01LTDRWISpBSysjYTcoI1dRbDJpY0JhLXEkYEhMUl0xP15fZ0FdOWp0WzNVIyc/WjJSNic6V0Fib2xgaktRQmE+blg9PUhETnIuWXJuOjZbKj1kb15cIWtkI1ZER1xlN24iZW05ZyI9OmFkdVxyaCFRXGFnPGAsTWVdMS9aREJ1J0QxW2wjWGZDIiJrQSQ2IyY8czBnZ0skVUFSYF4rK3RiQSIudSFUQDtaLEpkT0khSytMLiReOnRTay5BV1JcNiZXZmxVLCJTdS9yWCsiNjpqQzopXkhjS1A9UWk2Tm1cSV1nVT1tLS51cjpgXjBGMEluSnRtLldAQH4+ZW5kc3RyZWFtCmVuZG9iagp4cmVmCjAgMzMKMDAwMDAwMDAwMCA2NTUzNSBmIAowMDAwMDAwMDYxIDAwMDAwIG4gCjAwMDAwMDAxMjMgMDAwMDAgbiAKMDAwMDAwMDIzMCAwMDAwMCBuIAowMDAwMDAwMzQyIDAwMDAwIG4gCjAwMDAwMDA1NDcgMDAwMDAgbiAKMDAwMDAwMDc1MiAwMDAwMCBuIAowMDAwMDAwOTU3IDAwMDAwIG4gCjAwMDAwMDExNjIgMDAwMDAgbiAKMDAwMDAwMTM2NyAwMDAwMCBuIAowMDAwMDAxNDcyIDAwMDAwIG4gCjAwMDAwMDE2NzggMDAwMDAgbiAKMDAwMDAwMTg4NCAwMDAwMCBuIAowMDAwMDAyMDkwIDAwMDAwIG4gCjAwMDAwMDIxNzQgMDAwMDAgbiAKMDAwMDAwMjM4MCAwMDAwMCBuIAowMDAwMDAyNTg2IDAwMDAwIG4gCjAwMDAwMDI3OTIgMDAwMDAgbiAKMDAwMDAwMjk5OCAwMDAwMCBuIAowMDAwMDAzMDY4IDAwMDAwIG4gCjAwMDAwMDM0MjAgMDAwMDAgbiAKMDAwMDAwMzU1NyAwMDAwMCBuIAowMDAwMDA1Mzk1IDAwMDAwIG4gCjAwMDAwMDc5NTcgMDAwMDAgbiAKMDAwMDAxMTUzNiAwMDAwMCBuIAowMDAwMDE0NDUwIDAwMDAwIG4gCjAwMDAwMTgxMjggMDAwMDAgbiAKMDAwMDAyMDU4OSAwMDAwMCBuIAowMDAwMDI0MzMwIDAwMDAwIG4gCjAwMDAwMjcyNjEgMDAwMDAgbiAKMDAwMDAzMTAxMiAwMDAwMCBuIAowMDAwMDMzOTczIDAwMDAwIG4gCjAwMDAwMzczOTcgMDAwMDAgbiAKdHJhaWxlcgo8PAovSUQgCls8MGMzMDg5ZDg0MzYyZGUwYzAwOWIxYjhmMjY0ZDA0Y2Q+PDBjMzA4OWQ4NDM2MmRlMGMwMDliMWI4ZjI2NGQwNGNkPl0KJSBSZXBvcnRMYWIgZ2VuZXJhdGVkIFBERiBkb2N1bWVudCAtLSBkaWdlc3QgKG9wZW5zb3VyY2UpCgovSW5mbyAxOSAwIFIKL1Jvb3QgMTggMCBSCi9TaXplIDMzCj4+CnN0YXJ0eHJlZgozODkwOQolJUVPRgoxOCAxIG9iago8PAovUGFnZU1vZGUgL1VzZU5vbmUgL1BhZ2VzIDIwIDAgUiAvVHlwZSAvQ2F0YWxvZwogL0FGIFszNCAwIFJdIC9OYW1lcyA8PCAvRW1iZWRkZWRGaWxlcyA8PCAvTmFtZXMgWyhDb250ZW50IENyZWRlbnRpYWxzKSAzNCAwIFJdID4+ID4+ID4+CmVuZG9iagozMyAwIG9iago8PCAvTGVuZ3RoIDI0Mjc2IC9UeXBlIC9FbWJlZGRlZEZpbGUgL1N1YnR5cGUgL2FwcGxpY2F0aW9uIzJGYzJwYSA+PgpzdHJlYW0KAABe1Gp1bWIAAAAeanVtZGMycGEAEQAQgAAAqgA4m3EDYzJwYQAAAF6uanVtYgAAAEdqdW1kYzJtYQARABCAAACqADibcQN1cm46YzJwYTpiMTMxZjU1MS1mZDdhLTQwYWQtYmE2Ni1jNWI1YjYzODczZWQAAAALnmp1bWIAAAApanVtZGMyYXMAEQAQgAAAqgA4m3EDYzJwYS5hc3NlcnRpb25zAAAACblqdW1iAAAAI2p1bWRAywwyu4pInacLKtb0f0NpA2MycGEuaWNvbgAAAAAXYmZkYgBpbWFnZS9zdmcreG1sAAAACXdiaWRiPHN2ZyB3aWR0aD0iNzE2IiBoZWlnaHQ9IjcxNiIgdmlld0JveD0iMCAwIDcxNiA3MTYiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxwYXRoIGQ9Ik01MDguNzQ5IDMxNy4zOTlDNTE2Ljc3NyAyODcuMzE0IDUwOC45OTEgMjUzLjg4NCA0ODUuMzg5IDIzMC4yODJDNDYxLjc4OCAyMDYuNjgxIDQyOC4zNiAxOTguODk1IDM5OC4yNzMgMjA2LjkyM0MzNzYuMjMxIDE4NC45MjggMzQzLjM5IDE3NC45NTYgMzExLjE0OCAxODMuNTk2QzI3OC45MDYgMTkyLjIzNCAyNTUuNDUgMjE3LjI5MiAyNDcuMzYgMjQ3LjM2MUMyMTcuMjkxIDI1NS40NTEgMTkyLjIzMyAyNzguOTEgMTgzLjU5NSAzMTEuMTQ5QzE3NC45NTcgMzQzLjM5MSAxODQuOTI3IDM3Ni4yMzIgMjA2LjkyNCAzOTguMjc0QzE5OC44OTYgNDI4LjM1OSAyMDYuNjgzIDQ2MS43ODkgMjMwLjI4NCA0ODUuMzkxQzI1My44ODUgNTA4Ljk5MiAyODcuMzEzIDUxNi43NzkgMzE3LjQwMSA1MDguNzVDMzM5LjQ0MiA1MzAuNzQ1IDM3Mi4yODYgNTQwLjcxNyA0MDQuNTI1IDUzMi4wNzlDNDM2Ljc2NyA1MjMuNDQxIDQ2MC4yMjMgNDk4LjM4NCA0NjguMzEzIDQ2OC4zMTVDNDk4LjM4MyA0NjAuMjI0IDUyMy40NCA0MzYuNzY2IDUzMi4wNzggNDA0LjUyNkM1NDAuNzE2IDM3Mi4yODUgNTMwLjc0NyAzMzkuNDQzIDUwOC43NDkgMzE3LjQwMlYzMTcuMzk5Wk00NzAuODk5IDI0NC43NzZDNDg2Ljg5MiAyNjAuNzcgNDkzLjQ4OCAyODIuNjAxIDQ5MC42ODcgMzAzLjQxMkw0MTUuNTc3IDI2MC4wNDZDNDEyLjQxMSAyNTguMjE4IDQwOC41MDkgMjU4LjIxOCA0MDUuMzQ1IDI2MC4wNDZMMzE3LjQwMSAzMTAuODJWMjc3LjUyNkMzMTcuNDAxIDI3NS4xOTEgMzE4LjY1MiAyNzMuMDA1IDMyMC42NzYgMjcxLjgzN0wzODcuNjQ0IDIzMy4xNzRDNDE0LjE3OCAyMTguMzUzIDQ0OC4zNDYgMjIyLjIyMyA0NzAuOTAxIDI0NC43NzZINDcwLjg5OVpNMzU3LjgzNyAzMTEuMTQ0TDM5OC4yNzUgMzM0LjQ5MVYzODEuMTg1TDM1Ny44MzcgNDA0LjUzMkwzMTcuMzk4IDM4MS4xODVWMzM0LjQ5MUwzNTcuODM3IDMxMS4xNDRaTTI2NC43NzYgMjY5LjY5M0MyNjUuMjA3IDIzOS4zMDUgMjg1LjY0NCAyMTEuNjQ5IDMxNi40NTMgMjAzLjM5M0MzMzguMyAxOTcuNTQgMzYwLjUwNSAyMDIuNzQ0IDM3Ny4xMjcgMjE1LjU3M0wzMDIuMDE0IDI1OC45MzdDMjk4Ljg0OCAyNjAuNzY0IDI5Ni44OTggMjY0LjE0NCAyOTYuODk4IDI2Ny43OThWMzY5LjM0NkwyNjguMDY1IDM1Mi42OTlDMjY2LjA0MyAzNTEuNTMxIDI2NC43NzYgMzQ5LjM1MyAyNjQuNzc2IDM0Ny4wMTdWMjY5LjY5MVYyNjkuNjkzWk0yMDMuMzkxIDMxNi40NTRDMjA5LjI0NCAyOTQuNjA4IDIyNC44NTQgMjc3Ljk3OCAyNDQuMjc2IDI2OS45OTlWMzU2LjczQzI0NC4yNzYgMzYwLjM4NCAyNDYuMjI2IDM2My43NjMgMjQ5LjM5MiAzNjUuNTkxTDMzNy4zMzcgNDE2LjM2NUwzMDguNTAzIDQzMy4wMTNDMzA2LjQ4MSA0MzQuMTgxIDMwMy45NjEgNDM0LjE4OCAzMDEuOTM5IDQzMy4wMkwyMzQuOTcxIDM5NC4zNTdDMjA4Ljg2OCAzNzguNzg5IDE5NS4xMzggMzQ3LjI2MSAyMDMuMzkxIDMxNi40NTRaTTI0NC43NzUgNDcwLjlDMjI4Ljc4MSA0NTQuOTA2IDIyMi4xODYgNDMzLjA3NSAyMjQuOTg2IDQxMi4yNjRMMzAwLjA5NiA0NTUuNjNDMzAzLjI2MyA0NTcuNDU3IDMwNy4xNjQgNDU3LjQ1NyAzMTAuMzI4IDQ1NS42M0wzOTguMjczIDQwNC44NTZWNDM4LjE0OUMzOTguMjczIDQ0MC40ODUgMzk3LjAyMiA0NDIuNjcxIDM5NC45OTcgNDQzLjgzOUwzMjguMDI5IDQ4Mi41MDJDMzAxLjQ5NSA0OTcuMzIyIDI2Ny4zMjcgNDkzLjQ1MiAyNDQuNzcyIDQ3MC45SDI0NC43NzVaTTQ1MC44OTcgNDQ1Ljk4MkM0NTAuNDY2IDQ3Ni4zNzEgNDMwLjAyOSA1MDQuMDI3IDM5OS4yMiA1MTIuMjgzQzM3Ny4zNzMgNTE4LjEzNiAzNTUuMTY4IDUxMi45MzIgMzM4LjU0NyA1MDAuMTAyTDQxMy42NTkgNDU2LjczOEM0MTYuODI2IDQ1NC45MTEgNDE4Ljc3NSA0NTEuNTMyIDQxOC43NzUgNDQ3Ljg3N1YzNDYuMzI5TDQ0Ny42MDkgMzYyLjk3N0M0NDkuNjMxIDM2NC4xNDUgNDUwLjg5NyAzNjYuMzIzIDQ1MC44OTcgMzY4LjY1OVY0NDUuOTg1VjQ0NS45ODJaTTUxMi4yODIgMzk5LjIyMUM1MDYuNDI5IDQyMS4wNjggNDkwLjgxOSA0MzcuNjk3IDQ3MS4zOTcgNDQ1LjY3NlYzNTguOTQ2QzQ3MS4zOTcgMzU1LjI5MiA0NjkuNDQ4IDM1MS45MTIgNDY2LjI4MSAzNTAuMDg1TDM3OC4zMzYgMjk5LjMxMUw0MDcuMTcgMjgyLjY2M0M0MDkuMTkyIDI4MS40OTUgNDExLjcxMiAyODEuNDg3IDQxMy43MzQgMjgyLjY1NUw0ODAuNzAyIDMyMS4zMThDNTA2LjgwNSAzMzYuODg3IDUyMC41MzYgMzY4LjQxNSA1MTIuMjgyIDM5OS4yMjFaIiBmaWxsPSJibGFjayIvPgo8L3N2Zz4KAAABEGp1bWIAAAApanVtZGNib3IAEQAQgAAAqgA4m3EDYzJwYS5hY3Rpb25zLnYyAAAAAN9jYm9yomdhY3Rpb25zgaRmYWN0aW9ubGMycGEuY3JlYXRlZHFkaWdpdGFsU291cmNlVHlwZXhGaHR0cDovL2N2LmlwdGMub3JnL25ld3Njb2Rlcy9kaWdpdGFsc291cmNldHlwZS90cmFpbmVkQWxnb3JpdGhtaWNNZWRpYW1zb2Z0d2FyZUFnZW50omRuYW1lZWdwdC02Z3ZlcnNpb25lZ3B0LTZkd2hlbngbMjAyNi0xMS0wM1QyMjoxMTowNy4xNzIzNjVacmFsbEFjdGlvbnNJbmNsdWRlZPQAAACkanVtYgAAAChqdW1kY2JvcgARABCAAACqADibcQNjMnBhLmhhc2guZGF0YQAAAAB0Y2JvcqVqZXhjbHVzaW9uc4GiZXN0YXJ0GZxaZmxlbmd0aBle1GRuYW1lbmp1bWJmIG1hbmlmZXN0Y2FsZ2ZzaGEyNTZkaGFzaFggt+NbGJtyoDEi6CIyKyWCdygkpBhfd7CuxiWp+W81ED1jcGFkQAAAAolqdW1iAAAAJ2p1bWRjMmNsABEAEIAAAKoAOJtxA2MycGEuY2xhaW0udjIAAAACWmNib3Kmamluc3RhbmNlSUR4LHhtcDppaWQ6NWE3YWFhN2UtMzBjNC00OWE4LThkNTItNWVjOTZlNGQyMjdhdGNsYWltX2dlbmVyYXRvcl9pbmZvo2RuYW1lZ0NoYXRHUFRkaWNvbqJjdXJseCRzZWxmI2p1bWJmPWMycGEuYXNzZXJ0aW9ucy9jMnBhLmljb25kaGFzaFggdT7wPVcFMZKzqE7rTB77wYwYdLcnd9bQNgLHZTYR4/Frc3BlY1ZlcnNpb25lMi4yLjBpc2lnbmF0dXJleE1zZWxmI2p1bWJmPS9jMnBhL3VybjpjMnBhOmIxMzFmNTUxLWZkN2EtNDBhZC1iYTY2LWM1YjViNjM4NzNlZC9jMnBhLnNpZ25hdHVyZXJjcmVhdGVkX2Fzc2VydGlvbnODomN1cmx4JHNlbGYjanVtYmY9YzJwYS5hc3NlcnRpb25zL2MycGEuaWNvbmRoYXNoWCB1PvA9VwUxkrOoTutMHvvBjBh0tyd31tA2AsdlNhHj8aJjdXJseCpzZWxmI2p1bWJmPWMycGEuYXNzZXJ0aW9ucy9jMnBhLmFjdGlvbnMudjJkaGFzaFggWoDH+IGyGTiH8WmQRfwZzRziBY5awOg0ZxBhQvzdpe+iY3VybHgpc2VsZiNqdW1iZj1jMnBhLmFzc2VydGlvbnMvYzJwYS5oYXNoLmRhdGFkaGFzaFggK9ByYSRjkwUrpCzGUNfiEI+cq/wyKhN6mkwHXZ6DrkhoZGM6dGl0bGVpaW1hZ2UucGRmY2FsZ2ZzaGEyNTYAAFA4anVtYgAAAChqdW1kYzJjcwARABCAAACqADibcQNjMnBhLnNpZ25hdHVyZQAAAFAIY2JvctKEWQvoogE4JBghglkFiDCCBYQwggNsoAMCAQICEAul/OkOcIzyBYAx7kQcZHMwDQYJKoZIhvcNAQELBQAwSjEhMB8GA1UEAwwYU1NMLmNvbSBDMlBBIElDQSBSMSAyMDI1MRgwFgYDVQQKDA9TU0wgQ29ycG9yYXRpb24xCzAJBgNVBAYTAlVTMB4XDTI2MDQyMjE1NTEwNVoXDTI3MDQyMzE1NTEwNFowRzELMAkGA1UEBhMCVVMxGTAXBgNVBAoMEE9wZW5BSSBPcENvLCBMTEMxHTAbBgNVBAMMFE9wZW5BSSBNZWRpYSBTZXJ2aWNlMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAnbpq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AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAPZZAQB8Jc/yVC8O/3TD5ZJRvXzqZUJixoamTLgcCXBvKfCM7thmTeDyWNUjh5YGb/j05mADxvrEMgFr4a4QvMG4QGO8dhTA25tfxMlTqVx9G+PzJcuxvY+s3bco1DGbvnyztXgPuDk26oGZFB8ahEBVYPPComqQ9NFmRIco5vNIYaPUCjUVSatwfTGR9i24EbpV2tptkiDiM2ztNRYhoC66tc8bOX4RMWrTV2usVdicix89gYCyWkRl7elaLfF+9zUNCIO/WyubVWCTJYov56ncaATPEwbN954ngl41xtjVqyUZvcP534gOah5nLZ8m6HjE+obMx2RgiBzx3LYStcsFl5gHCmVuZHN0cmVhbQplbmRvYmoKMzQgMCBvYmoKPDwgL0FGUmVsYXRpb25zaGlwIC9DMlBBX01hbmlmZXN0IC9EZXNjIChDb250ZW50IENyZWRlbnRpYWxzKSAvRiAoQ29udGVudCBDcmVkZW50aWFscykgL0VGIDw8IC9GIDMzIDAgUiA+PiAvU3VidHlwZSAoYXBwbGljYXRpb24vYzJwYSkgL1R5cGUgL0ZpbGVzcGVjIC9VRiAoQ29udGVudCBDcmVkZW50aWFscykgPj4KZW5kb2JqCnhyZWYKMTggMQowMDAwMDM5Nzg1IDAwMDAxIG4gCjMzIDIKMDAwMDAzOTk0MSAwMDAwMCBuIAowMDAwMDY0MzIwIDAwMDAwIG4gCnRyYWlsZXIKPDwgL1NpemUgMzUgL1Jvb3QgMTggMSBSIC9QcmV2IDM4OTA5IC9JRCBbPDBjMzA4OWQ4NDM2MmRlMGMwMDliMWI4ZjI2NGQwNGNkPjwwYzMwODlkODQzNjJkZTBjMDA5YjFiOGYyNjRkMDRjZD5dID4+CnN0YXJ0eHJlZgo2NDUxNgolJUVPRgo=';
let bundledPdfAttachmentPromise = null;
async function getBundledDueDiligenceAttachment() {
  if (bundledPdfAttachmentPromise) return bundledPdfAttachmentPromise;
  bundledPdfAttachmentPromise = (async () => {
    const binary = atob(DUE_DILIGENCE_PDF_BASE64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const blob = new Blob([bytes], { type: 'application/pdf' });
    const file = new File([blob], DUE_DILIGENCE_FILE, { type: 'application/pdf' });
    return await storeAttachmentBlob(file);
  })();
  try { return await bundledPdfAttachmentPromise; }
  catch (error) { bundledPdfAttachmentPromise = null; throw error; }
}


function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    $('#storage-used').textContent = 'Saved';
    return true;
  } catch (error) {
    console.error('Local save failed', error);
    toast('Storage is full. Export a backup and remove large items.');
    return false;
  }
}

restoreArchivedInboxPreviewBatch();

function toast(message) {
  const el = $('#toast');
  if (!el) return;
  el.textContent = message;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2700);
}

function setTheme(theme) {
  if (!['light', 'dark', 'slate', 'sunset'].includes(theme)) return;
  state.settings.theme = theme;
  document.body.classList.remove('theme-light', 'theme-dark', 'theme-slate', 'theme-sunset');
  document.body.classList.add(`theme-${theme}`);
  $$('.theme-choice').forEach(button => button.classList.toggle('active', button.dataset.theme === theme));
  saveState();
}
function setDensity(density) {
  if (!['default', 'comfortable', 'compact'].includes(density)) return;
  state.settings.density = density;
  document.body.classList.remove('density-default', 'density-comfortable', 'density-compact');
  document.body.classList.add(`density-${density}`);
  $$('input[name="density"]').forEach(input => input.checked = input.value === density);
  saveState();
}
function applySettings() {
  setTheme(state.settings.theme || 'light');
  setDensity(state.settings.density || 'default');
  $('#quick-inbox-type').value = state.settings.inboxType || 'default';
  $$('[data-category-setting]').forEach(input => input.checked = Boolean(state.settings.categories[input.dataset.categorySetting]));
  $('#header-avatar').textContent = state.profile.initial || state.profile.name.slice(0, 1).toUpperCase();
  $('#header-avatar').parentElement.style.background = state.profile.colour || '#e85b25';
  $('#profile-avatar').textContent = state.profile.initial || state.profile.name.slice(0, 1).toUpperCase();
  $('#profile-avatar').style.background = state.profile.colour || '#e85b25';
  $('#profile-name').textContent = state.profile.name;
  $('#profile-email').textContent = state.profile.email;
  renderCategoryTabs();
}

function folderLabel(folder) {
  if (folder.startsWith('label:')) return folder.slice(6);
  return FOLDER_NAMES[folder] || folder;
}
function dateObject(email) {
  const d = new Date(email.date);
  if (!Number.isNaN(d.getTime())) return d;
  return null;
}
function listDate(email) {
  const d = dateObject(email);
  if (!d) return String(email.date || '');
  const now = new Date();
  if (d.toDateString() === now.toDateString()) return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  if (d.getFullYear() === now.getFullYear()) return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  return d.toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' });
}
function detailDate(email) {
  const d = dateObject(email);
  return d ? d.toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : String(email.date || '');
}
function isSnoozed(email) {
  if (!email.snoozedUntil) return false;
  const until = new Date(email.snoozedUntil).getTime();
  if (Number.isNaN(until) || until <= Date.now()) { email.snoozedUntil = null; return false; }
  return true;
}
function unreadCount(folder) {
  return state.emails.filter(email => email.folder === folder && !email.read).length;
}
function activeEmail() { return state.emails.find(email => String(email.id) === String(view.activeId)) || null; }

function tokenizeSearch(query) {
  const parts = String(query || '').match(/"[^"]+"|\S+/g) || [];
  return parts.map(part => part.replace(/^"|"$/g, ''));
}
function emailSearchMatch(email, query) {
  if (!query.trim()) return true;
  const tokens = tokenizeSearch(query);
  const full = [email.sender, email.senderEmail, email.recipient, email.subject, email.body, ...(email.labels || [])].join(' ').toLowerCase();
  const date = dateObject(email);
  for (let token of tokens) {
    let negate = token.startsWith('-');
    if (negate) token = token.slice(1);
    const lower = token.toLowerCase();
    let match = true;
    if (lower.startsWith('from:')) match = `${email.sender} ${email.senderEmail}`.toLowerCase().includes(lower.slice(5));
    else if (lower.startsWith('to:')) match = email.recipient.toLowerCase().includes(lower.slice(3));
    else if (lower.startsWith('subject:')) match = email.subject.toLowerCase().includes(lower.slice(8));
    else if (lower.startsWith('label:')) match = (email.labels || []).some(label => label.toLowerCase() === lower.slice(6));
    else if (lower.startsWith('category:')) match = email.category === lower.slice(9);
    else if (lower.startsWith('in:')) {
      const place = lower.slice(3);
      match = place === 'anywhere' || (place === 'archive' && email.folder === 'archive') ||
        (place === 'snoozed' && isSnoozed(email)) || email.folder === place;
    }
    else if (lower === 'is:starred') match = email.starred;
    else if (lower === 'is:unread') match = !email.read;
    else if (lower === 'is:read') match = email.read;
    else if (lower === 'is:important') match = email.important;
    else if (lower === 'has:attachment') match = (email.attachments || []).length > 0;
    else if (lower.startsWith('after:') && date) {
      const boundary = new Date(lower.slice(6).replaceAll('/', '-'));
      match = !Number.isNaN(boundary.getTime()) && date > boundary;
    }
    else if (lower.startsWith('before:') && date) {
      const boundary = new Date(lower.slice(7).replaceAll('/', '-'));
      match = !Number.isNaN(boundary.getTime()) && date < boundary;
    }
    else if (lower.startsWith('older_than:') || lower.startsWith('newer_than:')) {
      const older = lower.startsWith('older_than:');
      const raw = lower.split(':')[1];
      const amount = Number.parseInt(raw, 10);
      const unit = raw.slice(-1);
      const multiplier = unit === 'y' ? 365 : unit === 'm' ? 30 : 1;
      const limit = Date.now() - amount * multiplier * 86400000;
      match = date ? (older ? date.getTime() < limit : date.getTime() > limit) : false;
    }
    else if (lower === 'has:userlabels') match = (email.labels || []).length > 0;
    else if (lower === 'has:nouserlabels') match = (email.labels || []).length === 0;
    else if (lower === 'has:yellow-star') match = email.starred;
    else match = full.includes(lower);
    if (negate ? match : !match) return false;
  }
  return true;
}

function baseFolderFilter(email) {
  const folder = view.folder;
  if (folder.startsWith('label:')) return email.folder !== 'trash' && email.folder !== 'spam' && (email.labels || []).includes(folder.slice(6));
  if (folder === 'inbox') return email.folder === 'inbox' && !isSnoozed(email) && email.category === view.category;
  if (folder === 'starred') return email.starred && !['trash', 'spam'].includes(email.folder);
  if (folder === 'snoozed') return isSnoozed(email);
  if (folder === 'important') return email.important && !['trash', 'spam'].includes(email.folder);
  if (folder === 'all') return !['trash', 'spam', 'drafts', 'scheduled'].includes(email.folder) && !isSnoozed(email);
  return email.folder === folder;
}
function sortMessages(messages) {
  const list = [...messages];
  const sortDate = (a, b) => (dateObject(b)?.getTime() || 0) - (dateObject(a)?.getTime() || 0);
  if (view.folder === 'inbox') {
    if (state.settings.inboxType === 'important-first') list.sort((a,b) => Number(b.important)-Number(a.important) || sortDate(a,b));
    else if (state.settings.inboxType === 'unread-first') list.sort((a,b) => Number(!b.read)-Number(!a.read) || sortDate(a,b));
    else if (state.settings.inboxType === 'starred-first') list.sort((a,b) => Number(b.starred)-Number(a.starred) || sortDate(a,b));
    else list.sort(sortDate);
  } else list.sort(sortDate);
  return list;
}
function currentMessages() {
  let messages;
  if (view.query.trim()) {
    const includeAnywhere = /(?:^|\s)in:anywhere(?:\s|$)/i.test(view.query);
    const explicitTrashSpam = /(?:^|\s)in:(?:trash|spam)(?:\s|$)/i.test(view.query);
    messages = state.emails.filter(email => (includeAnywhere || explicitTrashSpam || !['trash', 'spam'].includes(email.folder)) && emailSearchMatch(email, view.query));
  } else messages = state.emails.filter(baseFolderFilter);
  return sortMessages(messages);
}

function renderCategoryTabs() {
  const tabs = $('#category-tabs');
  const show = view.folder === 'inbox' && !view.query && !view.activeId && $('#settings-page').classList.contains('hidden');
  tabs.classList.toggle('hidden', !show);
  if (view.category !== 'primary' && !state.settings.categories[view.category]) view.category = 'primary';
  $$('.category-tab').forEach(button => {
    const category = button.dataset.category;
    button.classList.toggle('hidden', category !== 'primary' && !state.settings.categories[category]);
    button.classList.toggle('active', category === view.category);
  });
}
function renderLabels() {
  const host = $('#labels-container');
  host.replaceChildren();
  for (const label of state.labels) {
    const button = document.createElement('button');
    button.className = `label-nav ${view.folder === `label:${label}` ? 'active' : ''}`;
    button.dataset.label = label;
    const ico = document.createElement('span'); ico.className = 'mi'; ico.textContent = 'label';
    const name = document.createElement('span'); name.className = 'sidebar-label'; name.textContent = label;
    const count = document.createElement('span'); count.className = 'label-count';
    const n = state.emails.filter(e => (e.labels || []).includes(label) && !e.read && !['trash','spam'].includes(e.folder)).length;
    count.textContent = n ? String(n) : '';
    button.append(ico, name, count);
    host.append(button);
  }
}
function updateNavigation() {
  $$('.nav-item').forEach(button => button.classList.toggle('active', button.dataset.folder === view.folder));
  $('#inbox-count').textContent = unreadCount('inbox') || '';
  $('#draft-count').textContent = unreadCount('drafts') || '';
  $('#spam-count').textContent = unreadCount('spam') || '';
  renderLabels();
}
function renderSearchChips() {
  const host = $('#search-chips');
  host.replaceChildren();
  if (!view.query.trim()) { host.classList.add('hidden'); return; }
  host.classList.remove('hidden');
  const chip = document.createElement('span'); chip.className = 'search-chip'; chip.textContent = `Search: ${view.query}`;
  const clear = document.createElement('button'); clear.className = 'text-button'; clear.textContent = 'Clear search'; clear.dataset.action = 'clear-search';
  host.append(chip, clear);
}
function renderRow(email) {
  const row = document.createElement('article');
  row.className = `email-row ${email.read ? 'read' : 'unread'} ${selectedIds.has(String(email.id)) ? 'selected' : ''}`;
  row.dataset.id = email.id;
  row.tabIndex = 0;
  row.setAttribute('role', 'button');
  row.setAttribute('aria-label', `${email.sender}, ${email.subject}`);

  const checkWrap = document.createElement('label');
  checkWrap.className = 'checkbox-wrap row-checkbox-wrap';
  const check = document.createElement('input'); check.type = 'checkbox'; check.className = 'row-check'; check.dataset.id = email.id; check.checked = selectedIds.has(String(email.id));
  const fake = document.createElement('span'); fake.className = 'fake-check';
  checkWrap.append(check, fake);

  const star = document.createElement('button'); star.className = `star-button ${email.starred ? 'starred' : ''}`; star.dataset.action = 'toggle-star'; star.dataset.id = email.id; star.title = email.starred ? 'Unstar' : 'Star';
  const starIcon = document.createElement('span'); starIcon.className = 'mi'; starIcon.textContent = email.starred ? 'star' : 'star_outline'; star.append(starIcon);

  const important = document.createElement('button'); important.className = `importance-button ${email.important ? 'important' : ''}`; important.dataset.action = 'toggle-important'; important.dataset.id = email.id; important.title = email.important ? 'Mark not important' : 'Mark important';
  const impIcon = document.createElement('span'); impIcon.className = 'mi'; impIcon.textContent = email.important ? 'label_important' : 'label_important_outline'; important.append(impIcon);

  const sender = document.createElement('div'); sender.className = 'row-sender'; sender.textContent = email.folder === 'sent' ? `To: ${email.recipient}` : email.folder === 'drafts' ? `Draft · ${email.recipient}` : email.sender;
  const content = document.createElement('div'); content.className = 'row-content';
  const subject = document.createElement('span'); subject.className = 'row-subject'; subject.textContent = email.subject || '(no subject)'; content.append(subject);
  const linkedReplyDraft = state.emails.find(item => item.isThreadReplyDraft && item.folder === 'drafts' && String(item.replyToId) === String(email.id));
  const snippet = document.createElement('span'); snippet.className = 'row-snippet';
  snippet.textContent = `— ${linkedReplyDraft ? `Draft: ${htmlToPlainText(linkedReplyDraft.bodyHtml || linkedReplyDraft.body).slice(0, 180)}` : email.body}`;
  content.append(snippet);
  if (email.attachments?.length) {
    const attachmentIcon = document.createElement('span'); attachmentIcon.className = 'mi row-attachment-icon';
    attachmentIcon.textContent = 'attach_file'; attachmentIcon.title = `${email.attachments.length} attachment${email.attachments.length === 1 ? '' : 's'}`;
    content.append(attachmentIcon);
  }
  const labels = document.createElement('span'); labels.className = 'row-labels';
  for (const label of (email.labels || []).slice(0, 2)) { const badge = document.createElement('span'); badge.className = 'message-label'; badge.textContent = label; labels.append(badge); }
  if (email.folder === 'drafts') { const badge = document.createElement('span'); badge.className = 'message-label label-category'; badge.textContent = 'Draft'; labels.append(badge); }
  if (email.snoozedUntil && isSnoozed(email)) { const badge = document.createElement('span'); badge.className = 'message-label label-category'; badge.textContent = 'Snoozed'; labels.append(badge); }
  if (email.fixtureKind) { const badge = document.createElement('span'); badge.className = 'message-label label-test-record'; badge.textContent = ' '; badge.title = 'Generated test fixture'; labels.append(badge); }
  if (linkedReplyDraft) { const badge = document.createElement('span'); badge.className = 'message-label label-category'; badge.textContent = 'Draft'; labels.append(badge); }
  content.append(labels);
  const date = document.createElement('time'); date.className = 'row-date'; date.dateTime = email.date; date.textContent = listDate(email);

  const quick = document.createElement('div'); quick.className = 'row-quick-actions';
  const quickActions = [
    email.folder === 'archive'
      ? ['move_to_inbox', 'Move to Inbox', 'row-move-inbox']
      : ['archive', 'Archive', 'row-archive'],
    ['delete', 'Delete', 'row-delete'],
    ['schedule', 'Snooze', 'row-snooze'],
    [email.read ? 'mark_email_unread' : 'mark_email_read', email.read ? 'Mark unread' : 'Mark read', 'row-toggle-read']
  ];
  for (const [iconName, title, action] of quickActions) { const b = document.createElement('button'); b.dataset.action = action; b.dataset.id = email.id; b.title = title; const i = document.createElement('span'); i.className = 'mi'; i.textContent = iconName; b.append(i); quick.append(b); }
  row.append(checkWrap, star, important, sender, content, date, quick);
  return row;
}
function updateToolbar(total, start, end) {
  const count = selectedIds.size;
  $('#toolbar-default').classList.toggle('hidden', count > 0);
  $('#toolbar-selection').classList.toggle('hidden', count === 0);
  $('#selection-count').textContent = `${count} selected`;
  const moveButton = $('[data-action="batch-move-inbox"]');
  if (moveButton) moveButton.classList.toggle('hidden', !(count > 0 && view.folder === 'archive'));
  $('#email-range-text').textContent = total ? `${start}–${end} of ${total}` : '0 of 0';
  $('#page-size').value = String(view.pageSize);
  const allCheckbox = $('#select-all-checkbox');
  const pageItems = currentMessages().slice((view.page - 1) * view.pageSize, view.page * view.pageSize);
  const selectedOnPage = pageItems.filter(item => selectedIds.has(String(item.id))).length;
  allCheckbox.checked = pageItems.length > 0 && selectedOnPage === pageItems.length;
  allCheckbox.indeterminate = selectedOnPage > 0 && selectedOnPage < pageItems.length;
  $('[data-action="page-prev"]').disabled = view.page <= 1;
  $('[data-action="page-next"]').disabled = end >= total;
}
function emptyText() {
  if (view.query) return ['No messages match your search', 'Try different words or remove a search operator.'];
  if (view.folder === 'trash') return ['Trash is empty', 'Messages you delete will appear here until you permanently remove them.'];
  if (view.folder === 'spam') return ['No spam here', 'Messages marked as spam will appear here.'];
  if (view.folder === 'drafts') return ['No drafts', 'Messages you start and close will be saved here.'];
  if (view.folder === 'sent') return ['Nothing sent yet', 'Messages you send will appear here.'];
  if (view.folder === 'snoozed') return ['Nothing snoozed', 'Snoozed messages return to the Inbox at their chosen time.'];
  if (view.folder === 'inbox') return ['Your inbox is clear', 'New messages will appear here.'];
  return [`No messages in ${folderLabel(view.folder)}`, 'Try another section or adjust your search.'];
}
function renderEmails() {
  if (!$('#settings-page').classList.contains('hidden')) return;
  const host = $('#email-list');
  host.replaceChildren();
  const all = currentMessages();
  const totalPages = Math.max(1, Math.ceil(all.length / view.pageSize));
  view.page = Math.min(Math.max(1, view.page), totalPages);
  const startIndex = (view.page - 1) * view.pageSize;
  const pageItems = all.slice(startIndex, startIndex + view.pageSize);
  if (!pageItems.length) {
    const [heading, description] = emptyText();
    const box = document.createElement('div'); box.className = 'empty-state';
    const iconBox = document.createElement('div'); iconBox.className = 'empty-icon'; const icon = document.createElement('span'); icon.className = 'mi'; icon.textContent = view.query ? 'search_off' : 'inbox'; iconBox.append(icon);
    const title = document.createElement('h2'); title.textContent = heading;
    const desc = document.createElement('p'); desc.textContent = description;
    const action = document.createElement('button'); action.textContent = 'Compose message'; action.dataset.action = 'open-compose';
    box.append(iconBox, title, desc, action); host.append(box);
  } else pageItems.forEach(email => host.append(renderRow(email)));
  const end = Math.min(startIndex + pageItems.length, all.length);
  updateToolbar(all.length, all.length ? startIndex + 1 : 0, end);
  updateNavigation();
  renderCategoryTabs();
  renderSearchChips();
}

function switchFolder(folder) {
  view.folder = folder;
  view.page = 1;
  view.query = '';
  view.activeId = null;
  selectedIds.clear();
  $('#search-input').value = '';
  $('#email-detail').classList.add('hidden');
  $('#settings-page').classList.add('hidden');
  $('#email-list').classList.remove('hidden');
  $('#mail-panel').querySelector('.toolbar').classList.remove('hidden');
  renderEmails();
  closeMenus();
  document.body.classList.remove('mobile-sidebar-open');
}
function switchCategory(category) {
  if (!CATEGORIES.includes(category) || (category !== 'primary' && !state.settings.categories[category])) return;
  view.category = category; view.page = 1; selectedIds.clear(); renderEmails();
}
function openEmail(id) {
  const email = state.emails.find(item => String(item.id) === String(id));
  if (!email) return;
  selectedIds.clear();
  if (email.folder === 'drafts') { openCompose({ draftId: email.id, to: email.recipient, cc: email.cc || '', bcc: email.bcc || '', subject: email.subject === '(no subject)' ? '' : email.subject, body: email.body, bodyHtml: email.bodyHtml || '', attachments: email.attachments || [], scheduledAt: email.scheduledAt || null, quotedMessage: email.quotedMessage || null, replyToId: email.replyToId || null, threadId: email.threadId || null, inReplyToId: email.inReplyToId || email.replyToId || null, title: 'Draft' }); return; }
  view.activeId = String(id);
  email.read = true;
  saveState();
  renderDetail(email);
  $('#email-list').classList.add('hidden');
  $('#category-tabs').classList.add('hidden');
  $('#email-detail').classList.remove('hidden');
  renderEmails();
  $('#email-list').classList.add('hidden');
}

function safeRichFragment(html) {
  const parser = new DOMParser();
  const parsed = parser.parseFromString(String(html || ''), 'text/html');
  const allowed = new Set(['P','BR','STRONG','B','EM','I','U','S','STRIKE','UL','OL','LI','BLOCKQUOTE','DIV','SPAN','A']);
  const clean = node => {
    if (node.nodeType === Node.TEXT_NODE) return document.createTextNode(node.nodeValue || '');
    if (node.nodeType !== Node.ELEMENT_NODE) return document.createDocumentFragment();
    const fragment = document.createDocumentFragment();
    if (node.tagName === 'FONT') {
      const span = document.createElement('span');
      const color = node.getAttribute('color') || '';
      if (color && CSS.supports('color', color)) span.style.color = color;
      const sizes = { '1': '10px', '2': '13px', '3': '16px', '4': '18px', '5': '24px', '6': '32px', '7': '48px' };
      const size = sizes[node.getAttribute('size') || ''];
      if (size) span.style.fontSize = size;
      [...node.childNodes].forEach(child => span.append(clean(child)));
      return span;
    }
    if (!allowed.has(node.tagName)) {
      [...node.childNodes].forEach(child => fragment.append(clean(child)));
      return fragment;
    }
    const element = document.createElement(node.tagName.toLowerCase());
    if (node.tagName === 'SPAN') {
      const color = node.style.color;
      if (color && CSS.supports('color', color)) element.style.color = color;
      const size = node.style.fontSize;
      if (size && /^(?:\d+(?:\.\d+)?px|\d+(?:\.\d+)?em|\d+(?:\.\d+)?rem)$/.test(size)) element.style.fontSize = size;
    }
    if (['P','DIV','BLOCKQUOTE'].includes(node.tagName)) {
      const align = node.style.textAlign;
      if (['left','center','right','justify'].includes(align)) element.style.textAlign = align;
    }
    if (node.tagName === 'A') {
      const href = node.getAttribute('href') || '';
      if (/^https?:\/\//i.test(href)) {
        element.setAttribute('href', href);
        element.setAttribute('target', '_blank');
        element.setAttribute('rel', 'noopener noreferrer');
      }
    }
    [...node.childNodes].forEach(child => element.append(clean(child)));
    fragment.append(element);
    return fragment;
  };
  const output = document.createDocumentFragment();
  [...parsed.body.childNodes].forEach(node => output.append(clean(node)));
  return output;
}

function renderEmailBody(container, email) {
  if (email.bodyHtml) {
    container.classList.add('rich-text-body');
    container.append(safeRichFragment(email.bodyHtml));
  } else {
    container.textContent = email.body || '';
  }
}

function quoteSnapshot(email) {
  return {
    sender: email.sender || '',
    senderEmail: email.senderEmail || '',
    recipient: email.recipient || '',
    date: email.date || new Date().toISOString(),
    body: email.body || '',
    bodyHtml: email.bodyHtml || ''
  };
}

function createQuotedMessageNode(quoted, extraClass = '') {
  const wrap = document.createElement('div');
  wrap.className = `gmail-quoted-message ${extraClass}`.trim();
  const header = document.createElement('div');
  header.className = 'gmail-quote-header';
  const d = new Date(quoted.date || Date.now());
  const formatted = Number.isNaN(d.getTime()) ? String(quoted.date || '') : d.toLocaleString([], {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit'
  });
  header.textContent = `On ${formatted}, ${quoted.sender || 'Sender'} <${quoted.senderEmail || ''}> wrote:`;
  const block = document.createElement('blockquote');
  block.className = 'gmail-quote-body';
  renderEmailBody(block, quoted);
  wrap.append(header, block);
  return wrap;
}

function renderComposeQuote() {
  const host = $('#compose-quoted-original');
  host.replaceChildren();
  if (!composeReplyQuote) {
    host.classList.add('hidden');
    return;
  }
  host.classList.remove('hidden');
  host.append(createQuotedMessageNode(composeReplyQuote, 'compose-quote'));
}

function createDetailMessageCard(item, options = {}) {
  const card = document.createElement('article');
  card.className = `detail-message thread-message${options.isDraft ? ' thread-draft-message' : ''}`;

  const senderLine = document.createElement('div'); senderLine.className = 'detail-sender-line';
  const avatar = document.createElement('div'); avatar.className = 'sender-avatar';
  avatar.textContent = (item.sender || '?').slice(0, 1).toUpperCase();
  if (item.senderEmail === BUILDCHORE_ACCOUNT.email) avatar.classList.add('buildchore-avatar');
  const meta = document.createElement('div'); meta.className = 'sender-meta';
  const senderNameLine = document.createElement('div'); senderNameLine.className = 'sender-name-line';
  const senderName = document.createElement('span'); senderName.className = 'sender-name'; senderName.textContent = item.sender || 'Unknown sender';
  const senderAddr = document.createElement('span'); senderAddr.className = 'sender-address'; senderAddr.textContent = `<${item.senderEmail || ''}>`;
  senderNameLine.append(senderName, senderAddr);
  if (item.fixtureKind) {
    const flag = document.createElement('span'); flag.className = 'test-record-badge'; flag.textContent = ' ';
    flag.title = 'Generated interface fixture'; senderNameLine.append(flag);
  }
  if (options.isDraft || item.folder === 'drafts') {
    const draftFlag = document.createElement('span'); draftFlag.className = 'draft-status-badge'; draftFlag.textContent = 'Draft';
    senderNameLine.append(draftFlag);
  }
  const recipient = document.createElement('div'); recipient.className = 'recipient-line';
  recipient.textContent = `to ${item.recipient || ''}${item.cc ? ` · cc ${item.cc}` : ''}`;
  meta.append(senderNameLine, recipient);
  const date = document.createElement('time'); date.className = 'detail-date'; date.dateTime = item.date || '';
  date.textContent = detailDate(item);
  senderLine.append(avatar, meta, date);

  const body = document.createElement('div'); body.className = 'detail-body';
  renderEmailBody(body, item);
  card.append(senderLine, body);

  if (item.quotedMessage && item.fixtureKind !== 'simulated-reply') card.append(createQuotedMessageNode(item.quotedMessage, 'detail-quote'));

  if (item.attachments?.length) {
    const attachments = document.createElement('div'); attachments.className = 'detail-attachments';
    item.attachments.forEach(file => {
      const chip = document.createElement('button'); chip.type = 'button'; chip.className = 'attachment-chip attachment-preview-trigger';
      chip.dataset.action = 'preview-attachment'; chip.dataset.attachmentId = file.id || '';
      const icon = document.createElement('span'); icon.className = 'mi'; icon.textContent = file.type === 'application/pdf' ? 'picture_as_pdf' : 'attach_file';
      const name = document.createElement('span'); name.textContent = `${file.name} (${formatBytes(file.size || 0)})`;
      const preview = document.createElement('span'); preview.className = 'attachment-preview-hint'; preview.textContent = 'Preview';
      chip.append(icon, name, preview); attachments.append(chip);
    });
    card.append(attachments);
  }
  if (options.isDraft) {
    const controls = document.createElement('div'); controls.className = 'thread-draft-actions';
    const edit = document.createElement('button'); edit.type = 'button'; edit.className = 'outline-pill';
    edit.dataset.action = 'edit-thread-draft'; edit.dataset.id = item.id;
    edit.innerHTML = '<span class="mi">edit</span> Edit draft'; controls.append(edit); card.append(controls);
  }
  return card;
}

function renderDetail(email) {
  const host = $('#email-detail'); host.replaceChildren();
  const top = document.createElement('div'); top.className = 'detail-topbar';
  const back = document.createElement('button'); back.className = 'outline-pill'; back.dataset.action = 'back-to-list';
  const backIcon = document.createElement('span'); backIcon.className = 'mi'; backIcon.textContent = 'arrow_back';
  back.append(backIcon, document.createTextNode('Back to list'));
  const tools = document.createElement('div'); tools.className = 'detail-tools';
  const actionButtons = [
    email.folder === 'archive' ? ['move_to_inbox', 'Move to Inbox', 'detail-move-inbox'] : ['archive', 'Archive', 'detail-archive'],
    ['report', 'Report spam', 'detail-spam'], ['delete', 'Delete', 'detail-delete'],
    [email.starred ? 'star' : 'star_outline', email.starred ? 'Unstar' : 'Star', 'detail-star'],
    ['more_vert', 'More actions', 'detail-more']
  ];
  for (const [ico, title, action] of actionButtons) {
    const button = document.createElement('button'); button.className = 'toolbar-icon'; button.title = title;
    button.dataset.action = action; button.dataset.id = email.id;
    const icon = document.createElement('span'); icon.className = 'mi'; icon.textContent = ico;
    button.append(icon); tools.append(button);
  }
  top.append(back, tools);
  const subject = document.createElement('h1'); subject.className = 'detail-subject'; subject.textContent = email.subject || '(no subject)';
  host.append(top, subject);

  const threadId = String(email.threadId || email.id);
  // Build the conversation by following both Gmail-style threadId membership
  // and explicit replyToId/inReplyToId relationships. This repairs older
  // local records whose third message was saved with a different threadId.
  const threadMessages = [];
  const includedIds = new Set();
  const addThreadMessage = item => {
    if (!item || includedIds.has(String(item.id))) return false;
    if (['trash', 'spam', 'drafts'].includes(item.folder)) return false;
    threadMessages.push(item);
    includedIds.add(String(item.id));
    return true;
  };
  state.emails.forEach(item => {
    const itemThread = String(item.threadId || item.id);
    if (itemThread === threadId || String(item.id) === threadId ||
        String(item.inReplyToId || '') === threadId ||
        String(item.replyToId || '') === String(email.id)) addThreadMessage(item);
  });
  addThreadMessage(email);
  // Follow replies recursively: original -> incoming reply -> Buildchore response.
  let changed = true;
  while (changed) {
    changed = false;
    state.emails.forEach(item => {
      if (includedIds.has(String(item.id)) || ['trash', 'spam', 'drafts'].includes(item.folder)) return;
      if (includedIds.has(String(item.replyToId || '')) ||
          includedIds.has(String(item.inReplyToId || ''))) {
        if (addThreadMessage(item)) changed = true;
      }
    });
  }
  // Include linked Sent response records even if a stale record has no
  // replyToId but is referenced by its incoming message's replySentId.
  threadMessages.forEach(item => {
    if (item.replySentId) {
      const linked = state.emails.find(candidate => String(candidate.id) === String(item.replySentId));
      if (addThreadMessage(linked)) changed = true;
    }
  });
  const drafts = state.emails.filter(item => item.folder === 'drafts' && item.replyToId &&
    (String(item.threadId || '') === threadId || includedIds.has(String(item.replyToId || ''))));
  const visibleMessages = threadMessages
    .filter(item => item.folder !== 'drafts' && !['trash', 'spam'].includes(item.folder))
    .sort((a, b) => (new Date(a.date).getTime() || 0) - (new Date(b.date).getTime() || 0));

  const thread = document.createElement('div'); thread.className = 'conversation-thread';
  visibleMessages.forEach(item => {
    const isOlderOriginal = item.batchId === OUTREACH_BATCH_ID && String(item.id) !== String(email.id);
    if (isOlderOriginal) {
      const details = document.createElement('details'); details.className = 'thread-collapsed-message';
      const summary = document.createElement('summary');
      summary.textContent = `${item.sender} · ${detailDate(item)} · ${htmlToPlainText(item.bodyHtml || item.body).slice(0, 105)}`;
      details.append(summary, createDetailMessageCard(item)); thread.append(details);
    } else {
      thread.append(createDetailMessageCard(item));
    }
  });

  // Unsaved response drafts appear after any sent conversation messages. Sent third-layer replies render in chronological order above.
  drafts.sort((a, b) => (new Date(a.date).getTime() || 0) - (new Date(b.date).getTime() || 0));
  drafts.forEach(draft => thread.append(createDetailMessageCard(draft, { isDraft: true })));
  host.append(thread);

  const reply = document.createElement('div'); reply.className = 'reply-actions';
  const existingDraft = drafts[0];
  if (existingDraft) {
    const edit = document.createElement('button'); edit.className = 'outline-pill'; edit.dataset.action = 'edit-thread-draft'; edit.dataset.id = existingDraft.id;
    edit.innerHTML = '<span class="mi">edit</span> Edit saved reply'; reply.append(edit);
  } else {
    const replyButton = document.createElement('button'); replyButton.className = 'outline-pill'; replyButton.dataset.action = 'reply'; replyButton.dataset.id = email.id;
    replyButton.innerHTML = '<span class="mi">reply</span> Reply'; reply.append(replyButton);
  }
  const forwardButton = document.createElement('button'); forwardButton.className = 'outline-pill'; forwardButton.dataset.action = 'forward'; forwardButton.dataset.id = email.id;
  forwardButton.innerHTML = '<span class="mi">forward</span> Forward'; reply.append(forwardButton);
  host.append(reply);
}

function closeDetail() {
  view.activeId = null;
  $('#email-detail').classList.add('hidden');
  $('#email-list').classList.remove('hidden');
  renderCategoryTabs();
  renderEmails();
}

function updateMessage(id, changes) {
  const email = state.emails.find(item => String(item.id) === String(id));
  if (!email) return null;
  Object.assign(email, changes);
  saveState();
  return email;
}
function toggleStar(id) {
  const email = updateMessage(id, {}); if (!email) return;
  email.starred = !email.starred; saveState();
  if (view.activeId) renderDetail(email); else renderEmails();
}
function toggleImportant(id) {
  const email = updateMessage(id, {}); if (!email) return;
  email.important = !email.important; saveState(); renderEmails();
}
function moveToTrash(ids) {
  ids.forEach(id => {
    const email = state.emails.find(item => String(item.id) === String(id));
    if (!email) return;
    if (email.folder === 'trash') state.emails = state.emails.filter(item => String(item.id) !== String(id));
    else { email.folder = 'trash'; email.snoozedUntil = null; }
  });
  selectedIds.clear(); saveState();
  if (view.activeId && ids.some(id => String(id) === String(view.activeId))) closeDetail();
  renderEmails();
}
function archiveMessages(ids) {
  ids.forEach(id => {
    const email = state.emails.find(item => String(item.id) === String(id));
    if (email && email.folder === 'trash') { email.folder = 'inbox'; email.snoozedUntil = null; }
    else if (email && email.folder === 'spam') { email.folder = 'inbox'; email.snoozedUntil = null; }
    else if (email && !['drafts','scheduled'].includes(email.folder)) { email.folder = 'archive'; email.snoozedUntil = null; }
  });
  selectedIds.clear(); saveState();
  if (view.activeId && ids.some(id => String(id) === String(view.activeId))) closeDetail(); else renderEmails();
  toast('Conversation archived or restored to Inbox');
}
function reportSpam(ids) {
  ids.forEach(id => { const email = state.emails.find(item => String(item.id) === String(id)); if (email) { email.folder = email.folder === 'spam' ? 'inbox' : 'spam'; email.snoozedUntil = null; } });
  selectedIds.clear(); saveState();
  if (view.activeId && ids.some(id => String(id) === String(view.activeId))) closeDetail(); else renderEmails();
  toast('Moved to Spam');
}
function markRead(ids, read = true) {
  ids.forEach(id => { const email = state.emails.find(item => String(item.id) === String(id)); if (email) email.read = read; });
  selectedIds.clear(); saveState(); renderEmails();
  toast(read ? 'Marked as read' : 'Marked as unread');
}
function selectedIdsArray() { return [...selectedIds]; }
function selectedVisibleIds() { return $$('.row-check:checked').map(input => String(input.dataset.id)); }
function promptSnooze(ids) {
  const defaultDate = new Date(Date.now() + 86400000);
  const defaultText = localDateTimeValue(defaultDate);
  const input = window.prompt('Snooze until (YYYY-MM-DDTHH:MM, local time):', defaultText);
  if (input === null) return;
  const date = new Date(input);
  if (Number.isNaN(date.getTime()) || date.getTime() <= Date.now()) { toast('Choose a future date and time.'); return; }
  ids.forEach(id => { const email = state.emails.find(item => String(item.id) === String(id)); if (email) email.snoozedUntil = date.toISOString(); });
  selectedIds.clear(); saveState(); renderEmails(); toast(`Snoozed until ${date.toLocaleString()}`);
}
function restoreMessage(ids) {
  const restored = [];
  ids.forEach(id => {
    const email = state.emails.find(item => String(item.id) === String(id));
    if (email && email.folder !== 'inbox') {
      email.folder = 'inbox'; email.snoozedUntil = null; restored.push(email);
    }
  });
  selectedIds.clear(); saveState();
  if (view.activeId && ids.some(id => String(id) === String(view.activeId))) {
    const current = activeEmail();
    if (current) renderDetail(current);
  }
  renderEmails();
  toast(restored.length ? `${restored.length} message${restored.length === 1 ? '' : 's'} moved to Inbox` : 'Already in Inbox');
}

function closeMenus() {
  ['apps-menu','profile-menu','more-menu','batch-menu','label-menu'].forEach(id => $(`#${id}`).classList.add('hidden'));
}
function togglePopup(id) {
  const el = $(`#${id}`); const wasOpen = !el.classList.contains('hidden'); closeMenus();
  if (!wasOpen) el.classList.remove('hidden');
}
function createLabel() {
  const value = window.prompt('Name your new label:');
  if (value === null) return;
  const name = value.trim();
  if (!name) return;
  if (state.labels.some(label => label.toLowerCase() === name.toLowerCase())) { toast('That label already exists.'); return; }
  if (state.labels.length >= 5000) { toast('You have reached the 5,000-label limit.'); return; }
  state.labels.push(name); saveState(); renderLabels(); if (!$('#settings-page').classList.contains('hidden') && view.settingsTab === 'Labels') renderSettingsPage('Labels'); toast(`Created label “${name}”`);
}
function openLabelMenu() {
  const host = $('#label-menu'); host.replaceChildren();
  if (!state.labels.length) { const p = document.createElement('p'); p.textContent = 'Create a label first.'; p.style.padding = '10px'; host.append(p); }
  for (const label of state.labels) {
    const button = document.createElement('button'); button.dataset.action = 'apply-label'; button.dataset.label = label;
    const icon = document.createElement('span'); icon.className = 'mi'; icon.textContent = selectedIdsArray().every(id => state.emails.find(e => String(e.id) === id)?.labels?.includes(label)) ? 'check_box' : 'check_box_outline_blank';
    const txt = document.createElement('span'); txt.textContent = label; button.append(icon, txt); host.append(button);
  }
  const divider = document.createElement('div'); divider.style.borderTop = '1px solid var(--border)'; divider.style.margin = '5px 0'; host.append(divider);
  const add = document.createElement('button'); add.dataset.action = 'add-label'; add.innerHTML = '<span class="mi">add</span> Create new label'; host.append(add);
  togglePopup('label-menu');
}
function applyLabel(label) {
  const ids = selectedIdsArray();
  ids.forEach(id => {
    const email = state.emails.find(item => String(item.id) === id); if (!email) return;
    email.labels = email.labels || [];
    const complete = ids.every(selectedId => state.emails.find(item => String(item.id) === selectedId)?.labels?.includes(label));
    if (complete) email.labels = email.labels.filter(item => item !== label);
    else if (!email.labels.includes(label)) email.labels.push(label);
  });
  selectedIds.clear(); saveState(); closeMenus(); renderEmails(); toast(`Updated label: ${label}`);
}

/* Compose and drafts */
function openCompose(options = {}) {
  closeMenus();
  const modal = $('#compose-modal');
  modal.classList.remove('hidden', 'minimized');
  currentComposeId = options.draftId || null;
  composeAttachments = options.attachments ? [...options.attachments] : [];
  composeReplyQuote = options.quotedMessage ? structuredClone(options.quotedMessage) : null;
  composeReplyMeta = options.replyToId ? {
    replyToId: String(options.replyToId),
    threadId: String(options.threadId || options.parentThreadId || options.replyToId),
    inReplyToId: String(options.inReplyToId || options.replyToId)
  } : null;
  $('#compose-form').reset();
  $('#cc-line').classList.add('hidden'); $('#bcc-line').classList.add('hidden');
  $('#schedule-row').classList.add('hidden'); $('#schedule-at').value = '';
  $('#compose-title').textContent = options.title || 'New Message';
  $('#compose-to').value = options.to || '';
  $('#compose-cc').value = options.cc || '';
  $('#compose-bcc').value = options.bcc || '';
  $('#compose-subject').value = options.subject || '';
  setComposerContent(options.body || '', options.bodyHtml || '');
  renderComposeQuote();
  if (options.cc) $('#cc-line').classList.remove('hidden');
  if (options.bcc) $('#bcc-line').classList.remove('hidden');
  if (options.scheduledAt) { $('#schedule-row').classList.remove('hidden'); $('#schedule-at').value = localDateTimeValue(new Date(options.scheduledAt)); }
  renderComposeAttachments();
  $('#compose-status').textContent = currentComposeId ? 'Draft opened' : 'Draft saved';
  $('#compose-to').focus();
}
function currentComposeData() {
  return {
    to: $('#compose-to').value.trim(), cc: $('#compose-cc').value.trim(), bcc: $('#compose-bcc').value.trim(),
    subject: $('#compose-subject').value.trim(),
    ...getComposerContent(),
    quotedMessage: composeReplyQuote ? structuredClone(composeReplyQuote) : null,
    replyToId: composeReplyMeta?.replyToId || null,
    threadId: composeReplyMeta?.threadId || null,
    inReplyToId: composeReplyMeta?.inReplyToId || null,
    scheduledAt: $('#schedule-at').value ? new Date($('#schedule-at').value).toISOString() : null,
    attachments: composeAttachments
  };
}
function saveDraft(silent = false) {
  if ($('#compose-modal').classList.contains('hidden')) return;
  const data = currentComposeData();
  if (!data.to && !data.subject && !data.body && !data.cc && !data.bcc && !data.attachments.length) return;
  let draft = currentComposeId ? state.emails.find(email => String(email.id) === String(currentComposeId)) : null;
  if (!draft) {
    draft = { id: makeId(), folder: 'drafts', category: 'primary', sender: state.profile.name, senderEmail: state.profile.email, recipient: data.to, subject: data.subject || '(no subject)', body: data.body, date: new Date().toISOString(), read: true, starred: false, important: false, labels: [], attachments: [], threadId: data.threadId, replyToId: data.replyToId, inReplyToId: data.inReplyToId, isThreadReplyDraft: Boolean(data.replyToId) };
    state.emails.unshift(draft); currentComposeId = draft.id;
  }
  Object.assign(draft, { folder: 'drafts', sender: state.profile.name, senderEmail: state.profile.email, recipient: data.to, cc: data.cc, bcc: data.bcc, subject: data.subject || '(no subject)', body: data.body, bodyHtml: data.bodyHtml, date: new Date().toISOString(), attachments: data.attachments, scheduledAt: data.scheduledAt, quotedMessage: data.quotedMessage, threadId: data.threadId || draft.threadId || null, replyToId: data.replyToId || draft.replyToId || null, inReplyToId: data.inReplyToId || draft.inReplyToId || data.replyToId || null, isThreadReplyDraft: Boolean(data.replyToId || draft.replyToId) });
  saveState(); $('#compose-status').textContent = 'Saved';
  if (!silent) toast('Draft saved');
}
function scheduleDraftOrSend() {
  const data = currentComposeData();
  if (!data.to) { $('#compose-to').focus(); toast('Add at least one recipient.'); return; }
  if (!data.subject && !data.body) { toast('Add a subject or message.'); return; }
  const scheduled = Boolean($('#schedule-row').classList.contains('hidden') === false && data.scheduledAt);
  if (scheduled && new Date(data.scheduledAt).getTime() <= Date.now()) { toast('Choose a future send time.'); return; }
  const folder = scheduled ? 'scheduled' : 'sent';
  let email = currentComposeId ? state.emails.find(item => String(item.id) === String(currentComposeId)) : null;
  if (!email) { email = { id: makeId(), folder, category: 'primary', read: true, starred: false, important: false, labels: [] }; state.emails.unshift(email); }
  Object.assign(email, {
    folder, category: 'primary', sender: state.profile.name, senderEmail: state.profile.email,
    recipient: data.to, cc: data.cc, bcc: data.bcc, subject: data.subject || '(no subject)', body: data.body,
    date: scheduled ? data.scheduledAt : new Date().toISOString(), scheduledAt: scheduled ? data.scheduledAt : null,
    read: true, attachments: data.attachments, snoozedUntil: null, quotedMessage: data.quotedMessage,
    bodyHtml: data.bodyHtml,
    threadId: data.threadId || email.threadId || null,
    replyToId: data.replyToId || email.replyToId || null,
    inReplyToId: data.inReplyToId || email.inReplyToId || data.replyToId || null,
    isThreadReplyDraft: false,
    isThreadReplySent: Boolean(data.replyToId || email.replyToId)
  });
  if (data.replyToId) {
    const parent = state.emails.find(item => String(item.id) === String(data.replyToId));
    if (parent) {
      parent.replySentId = email.id;
      if (!email.threadId) email.threadId = String(parent.threadId || parent.id);
      if (!parent.threadId) parent.threadId = email.threadId;
    }
  }
  const returnToThread = Boolean(data.replyToId && view.activeId);
  const activeThreadMessageId = view.activeId;
  saveState();
  $('#compose-modal').classList.add('hidden'); currentComposeId = null; composeAttachments = []; composeReplyQuote = null; composeReplyMeta = null; renderComposeQuote();
  if (returnToThread) {
    renderEmails();
    const active = state.emails.find(item => String(item.id) === String(activeThreadMessageId));
    if (active) { renderDetail(active); $('#email-list').classList.add('hidden'); $('#email-detail').classList.remove('hidden'); }
  } else if (view.folder !== (scheduled ? 'scheduled' : 'sent')) switchFolder(scheduled ? 'scheduled' : 'sent'); else renderEmails();
  toast(scheduled ? `Message scheduled for ${new Date(data.scheduledAt).toLocaleString()}` : 'Message added to Sent.');
}
function closeCompose() {
  saveDraft(true);
  $('#compose-modal').classList.add('hidden');
  currentComposeId = null; composeAttachments = []; composeReplyQuote = null; composeReplyMeta = null; renderComposeQuote();
  renderEmails();
  if (view.activeId) { const active = activeEmail(); if (active) { renderDetail(active); $('#email-list').classList.add('hidden'); $('#email-detail').classList.remove('hidden'); } }
}
function discardDraft() {
  if (currentComposeId) state.emails = state.emails.filter(email => String(email.id) !== String(currentComposeId));
  currentComposeId = null; composeAttachments = []; composeReplyQuote = null; composeReplyMeta = null; renderComposeQuote(); $('#compose-modal').classList.add('hidden'); saveState(); renderEmails();
  if (view.activeId) { const active = activeEmail(); if (active) { renderDetail(active); $('#email-list').classList.add('hidden'); $('#email-detail').classList.remove('hidden'); } }
  toast('Draft discarded');
}
function renderComposeAttachments() {
  const host = $('#compose-attachments'); host.replaceChildren();
  composeAttachments.forEach((file, index) => {
    const chip = document.createElement('span'); chip.className = 'attachment-chip compose-attachment-chip';
    const preview = document.createElement('button'); preview.type = 'button'; preview.className = 'attachment-preview-button';
    preview.dataset.action = 'preview-attachment'; preview.dataset.attachmentId = file.id || '';
    const label = document.createElement('span'); label.textContent = `${file.name} (${formatBytes(file.size || 0)})`;
    preview.append(label);
    const remove = document.createElement('button'); remove.type = 'button'; remove.textContent = '×'; remove.dataset.action = 'remove-attachment'; remove.dataset.index = index; remove.title = 'Remove attachment';
    chip.append(preview, remove); host.append(chip);
  });
}
function formatBytes(bytes) {
  if (!bytes) return '0 B';
  const units = ['B','KB','MB','GB']; const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / (1024 ** i)).toFixed(i ? 1 : 0)} ${units[i]}`;
}

/* Administrator console */
function openAdminPanel() {
  closeMenus();
  $('#settings-panel').classList.add('hidden');
  $('#admin-modal').classList.remove('hidden');
  resetAdminForm();
  setAdminTab('editor');
  renderAdminMessages();
}

function setAdminTab(tab) {
  const allowed = ['editor', 'bulk', 'manage', 'data'];
  if (!allowed.includes(tab)) return;
  $$('.admin-tab').forEach(button => button.classList.toggle('active', button.dataset.tab === tab));
  allowed.forEach(name => $(`#admin-pane-${name}`).classList.toggle('hidden', name !== tab));
  if (tab === 'manage') renderAdminMessages();
  if (tab === 'bulk' && !$('#bulk-start').value) $('#bulk-start').value = localDateTimeValue();
}

function resetAdminForm() {
  $('#admin-message-form').reset();
  $('#admin-message-id').value = '';
  $('#admin-folder').value = 'inbox';
  $('#admin-category').value = 'primary';
  $('#admin-sender').value = state.profile.name;
  $('#admin-sender-email').value = state.profile.email;
  $('#admin-recipient').value = state.profile.email;
  $('#admin-date').value = localDateTimeValue();
  $('#admin-unread').checked = true;
  $('#admin-save-button').textContent = 'Create message';
}

function parseAdminLabels(value) {
  return [...new Set(String(value || '').split(',').map(label => label.trim()).filter(Boolean))];
}

function parseAdminAttachments(value) {
  return String(value || '').split(',').map(name => name.trim()).filter(Boolean)
    .map(name => ({ name, type: '', size: 0 }));
}

function editAdminMessage(id) {
  const email = state.emails.find(item => String(item.id) === String(id));
  if (!email) return;
  setAdminTab('editor');
  $('#admin-message-id').value = String(email.id);
  $('#admin-folder').value = email.folder;
  $('#admin-category').value = email.category || 'primary';
  $('#admin-sender').value = email.sender || '';
  $('#admin-sender-email').value = email.senderEmail || '';
  $('#admin-recipient').value = email.recipient || '';
  $('#admin-cc').value = email.cc || '';
  $('#admin-bcc').value = email.bcc || '';
  $('#admin-subject').value = email.subject || '';
  $('#admin-date').value = localDateTimeValue(new Date(email.date));
  $('#admin-body').value = email.body || '';
  $('#admin-labels').value = (email.labels || []).join(', ');
  $('#admin-attachments').value = (email.attachments || []).map(file => file.name).join(', ');
  $('#admin-unread').checked = !email.read;
  $('#admin-starred').checked = Boolean(email.starred);
  $('#admin-important').checked = Boolean(email.important);
  $('#admin-save-button').textContent = 'Save changes';
}

function saveAdminMessage(event) {
  event.preventDefault();
  const date = new Date($('#admin-date').value);
  if (Number.isNaN(date.getTime())) { toast('Enter a valid date and time.'); return; }
  const idValue = $('#admin-message-id').value;
  const existing = idValue ? state.emails.find(item => String(item.id) === idValue) : null;
  const labels = parseAdminLabels($('#admin-labels').value);
  labels.forEach(label => { if (!state.labels.includes(label)) state.labels.push(label); });
  const folder = $('#admin-folder').value;
  const message = normalizeEmail({
    ...(existing || {}),
    id: existing ? existing.id : makeId(),
    folder,
    category: $('#admin-category').value,
    sender: $('#admin-sender').value.trim(),
    senderEmail: $('#admin-sender-email').value.trim(),
    recipient: $('#admin-recipient').value.trim(),
    cc: $('#admin-cc').value.trim(),
    bcc: $('#admin-bcc').value.trim(),
    subject: $('#admin-subject').value.trim(),
    body: $('#admin-body').value,
    date: date.toISOString(),
    read: !$('#admin-unread').checked,
    starred: $('#admin-starred').checked,
    important: $('#admin-important').checked,
    labels,
    attachments: parseAdminAttachments($('#admin-attachments').value),
    snoozedUntil: existing?.snoozedUntil || null,
    scheduledAt: folder === 'scheduled' ? date.toISOString() : null
  });
  if (existing) Object.assign(existing, message);
  else state.emails.unshift(message);
  saveState();
  resetAdminForm();
  renderAdminMessages();
  renderEmails();
  toast(existing ? 'Message updated' : 'Message created');
}

function renderAdminMessages() {
  const host = $('#admin-message-list');
  if (!host) return;
  const query = ($('#admin-filter')?.value || '').trim().toLowerCase();
  const matches = [...state.emails].filter(email =>
    [email.sender, email.senderEmail, email.recipient, email.subject, email.body, email.folder]
      .join(' ').toLowerCase().includes(query)
  ).sort((a, b) => (new Date(b.date).getTime() || 0) - (new Date(a.date).getTime() || 0));
  host.replaceChildren();
  if (!matches.length) {
    const empty = document.createElement('p');
    empty.className = 'admin-note';
    empty.textContent = 'No matching messages.';
    host.append(empty);
    return;
  }
  const count = document.createElement('p');
  count.className = 'admin-note';
  count.textContent = `${matches.length} message${matches.length === 1 ? '' : 's'}`;
  host.append(count);
  matches.forEach(email => {
    const row = document.createElement('div'); row.className = 'admin-message-item';
    const main = document.createElement('div'); main.className = 'admin-message-main';
    const title = document.createElement('strong'); title.textContent = `${email.sender} · ${email.subject}`;
    const meta = document.createElement('small');
    meta.textContent = `${email.senderEmail} → ${email.recipient} · ${folderLabel(email.folder)} · ${detailDate(email)}`;
    main.append(title, meta);
    const actions = document.createElement('div'); actions.className = 'admin-message-actions';
    const edit = document.createElement('button'); edit.type = 'button'; edit.dataset.action = 'admin-edit-message'; edit.dataset.id = email.id; edit.textContent = 'Edit';
    const remove = document.createElement('button'); remove.type = 'button'; remove.dataset.action = 'admin-delete-message'; remove.dataset.id = email.id; remove.textContent = 'Delete';
    actions.append(edit, remove); row.append(main, actions); host.append(row);
  });
}

function createBulkMessages(event) {
  event.preventDefault();
  const count = Math.min(1000, Math.max(1, Number.parseInt($('#bulk-count').value, 10) || 1));
  const interval = Math.max(0, Number.parseInt($('#bulk-interval').value, 10) || 0);
  const start = new Date($('#bulk-start').value);
  if (Number.isNaN(start.getTime())) { toast('Choose a valid starting date and time.'); return; }
  const folder = $('#bulk-folder').value;
  const category = $('#bulk-category').value;
  const labels = parseAdminLabels($('#bulk-labels').value);
  labels.forEach(label => { if (!state.labels.includes(label)) state.labels.push(label); });
  const senderTemplate = $('#bulk-sender').value.trim();
  const subjectTemplate = $('#bulk-subject').value.trim();
  const bodyTemplate = $('#bulk-body').value;
  const newMessages = [];
  for (let index = 1; index <= count; index++) {
    const replaceNumber = value => String(value).replaceAll('{n}', String(index));
    const date = new Date(start.getTime() + (index - 1) * interval * 60000);
    newMessages.push(normalizeEmail({
      id: makeId() + index,
      folder,
      category,
      sender: replaceNumber(senderTemplate),
      senderEmail: $('#bulk-sender-email').value.trim(),
      recipient: $('#bulk-recipient').value.trim(),
      subject: replaceNumber(subjectTemplate),
      body: replaceNumber(bodyTemplate),
      date: date.toISOString(),
      read: !$('#bulk-unread').checked,
      starred: $('#bulk-starred').checked,
      important: $('#bulk-important').checked,
      labels: [...labels],
      attachments: []
    }, index));
  }
  state.emails.unshift(...newMessages);
  if (!saveState()) { state.emails.splice(0, newMessages.length); return; }
  renderAdminMessages(); renderEmails();
  toast(`${count} messages created`);
  setAdminTab('manage');
}

function deleteAdminMessage(id) {
  const email = state.emails.find(item => String(item.id) === String(id));
  if (!email) return;
  if (!window.confirm(`Delete “${email.subject}”?`)) return;
  state.emails = state.emails.filter(item => String(item.id) !== String(id));
  if (String(view.activeId) === String(id)) closeDetail();
  selectedIds.delete(String(id));
  saveState(); renderAdminMessages(); renderEmails(); toast('Message deleted');
}

function clearAllAdminMessages() {
  if (!window.confirm('Permanently delete every message in this mailbox?')) return;
  state.emails = [];
  selectedIds.clear();
  view.activeId = null;
  saveState();
  $('#email-detail').classList.add('hidden');
  $('#email-list').classList.remove('hidden');
  renderAdminMessages(); renderEmails();
  toast('All messages deleted');
}

/* Search */
function runSearch(query) {
  view.query = String(query || '').trim(); view.page = 1; view.activeId = null; selectedIds.clear();
  $('#email-detail').classList.add('hidden'); $('#settings-page').classList.add('hidden'); $('#email-list').classList.remove('hidden');
  $('#search-input').value = view.query;
  renderEmails();
}
function advancedSearch(event) {
  event.preventDefault();
  const pieces = [];
  const values = [['adv-from','from'],['adv-to','to'],['adv-subject','subject']];
  values.forEach(([id, op]) => { const value = $(`#${id}`).value.trim(); if (value) pieces.push(`${op}:${value.includes(' ') ? `"${value}"` : value}`); });
  const words = $('#adv-words').value.trim(); if (words) pieces.push(words);
  const excludes = $('#adv-exclude').value.trim(); if (excludes) pieces.push(...tokenizeSearch(excludes).map(word => `-${word}`));
  if ($('#adv-attachment').value === 'yes') pieces.push('has:attachment');
  if ($('#adv-attachment').value === 'no') pieces.push('-has:attachment');
  const location = $('#adv-in').value; if (location && location !== 'anywhere') pieces.push(`in:${location}`);
  $('#advanced-search-modal').classList.add('hidden'); runSearch(pieces.join(' '));
}

/* Settings page */
function openAllSettings() {
  settingsOriginFolder = view.folder;
  closeMenus(); $('#settings-panel').classList.add('hidden'); $('#email-list').classList.add('hidden'); $('#email-detail').classList.add('hidden'); $('#category-tabs').classList.add('hidden');
  $('#mail-panel').querySelector('.toolbar').classList.add('hidden');
  $('#settings-page').classList.remove('hidden');
  renderSettingsPage(view.settingsTab || 'General');
}
function renderSettingsPage(tab = 'General') {
  view.settingsTab = tab;
  const host = $('#settings-page'); host.replaceChildren();
  const head = document.createElement('div'); head.className = 'settings-page-head';
  const title = document.createElement('h1'); title.textContent = 'Settings';
  const back = document.createElement('button'); back.className = 'outline-pill'; back.dataset.action = 'close-all-settings'; back.innerHTML = '<span class="mi">arrow_back</span> Back to mail';
  head.append(title, back);
  const tabs = document.createElement('div'); tabs.className = 'settings-tabs';
  ['General','Inbox','Labels','Accounts','Advanced'].forEach(name => { const b = document.createElement('button'); b.className = `settings-tab ${name === tab ? 'active' : ''}`; b.textContent = name; b.dataset.action = 'settings-tab'; b.dataset.tab = name; tabs.append(b); });
  const content = document.createElement('div'); content.className = 'settings-content';
  if (tab === 'General') {
    content.innerHTML = `
      <h2>General settings</h2><p>Choose how Gmail is displayed.</p>
      <div class="settings-row"><div><strong>Theme</strong><small>Choose the appearance of your inbox.</small></div><select class="form-control" id="full-theme"><option value="light">Light</option><option value="dark">Dark</option><option value="slate">Slate</option><option value="sunset">Sunset</option></select></div>
      <div class="settings-row"><div><strong>Density</strong><small>Change the spacing of message rows.</small></div><select class="form-control" id="full-density"><option value="default">Default</option><option value="comfortable">Comfortable</option><option value="compact">Compact</option></select></div>
      <div class="settings-row"><div><strong>Undo send window</strong><small>Choose how long the undo option remains available.</small></div><select class="form-control" id="undo-window"><option>5 seconds</option><option>10 seconds</option><option>20 seconds</option><option>30 seconds</option></select></div>
      <div class="settings-row"><div><strong>Desktop notifications</strong><small>Allow notifications from this site.</small></div><input type="checkbox" id="notifications-setting"></div>
      <div class="settings-row"><div><strong>Keyboard shortcuts</strong><small>Enable / to focus search and c to compose.</small></div><input type="checkbox" id="shortcuts-setting"></div>`;
  } else if (tab === 'Inbox') {
    content.innerHTML = `<h2>Inbox type</h2><p>Choose how messages are prioritised in your inbox.</p><div class="settings-row"><div><strong>Inbox type</strong><small>Categories remain available in Default mode.</small></div><select class="form-control" id="full-inbox-type"><option value="default">Default</option><option value="important-first">Important first</option><option value="unread-first">Unread first</option><option value="starred-first">Starred first</option></select></div><h2>Categories</h2><p>Show or hide the optional category tabs.</p>${['social','promotions','updates','forums'].map(name => `<div class="settings-row"><div><strong>${name[0].toUpperCase()+name.slice(1)}</strong><small>Use this tab in the inbox.</small></div><input type="checkbox" data-full-category="${name}"></div>`).join('')}`;
  } else if (tab === 'Labels') {
    content.innerHTML = `<h2>Labels</h2><p>Labels can be applied to a message without moving it out of its current folder.</p><button class="primary-button" data-action="add-label">Create new label</button><div id="settings-label-list"></div>`;
  } else if (tab === 'Accounts') {
    content.innerHTML = `<h2>Account</h2><div class="settings-row"><div><strong>Display name</strong><small>${escapeHTML(state.profile.name)}</small></div></div><div class="settings-row"><div><strong>Email address</strong><small>${escapeHTML(state.profile.email)}</small></div></div><div class="settings-row"><div><strong>Backup and restore</strong><small>Export your messages and settings as a JSON file.</small></div><button class="secondary-button" data-action="export-data">Export backup</button></div>`;
  } else {
    content.innerHTML = `<h2>Advanced settings</h2><p>Additional interface preferences.</p><div class="settings-row"><div><strong>Reading pane</strong><small>Open messages in the full message view.</small></div><input type="checkbox" id="reading-pane-setting"></div><div class="settings-row"><div><strong>Messages</strong><small>Total messages in your mailbox.</small></div><strong>${state.emails.length}</strong></div><div class="settings-row"><div><strong>Backup</strong><small>Save your mailbox and settings.</small></div><button class="secondary-button" data-action="export-data">Export JSON</button></div>`;
  }
  host.append(head, tabs, content);
  const theme = $('#full-theme'); if (theme) theme.value = state.settings.theme;
  const density = $('#full-density'); if (density) density.value = state.settings.density;
  const inbox = $('#full-inbox-type'); if (inbox) inbox.value = state.settings.inboxType;
  const notif = $('#notifications-setting'); if (notif) notif.checked = Boolean(state.settings.desktopNotifications);
  const shortcuts = $('#shortcuts-setting'); if (shortcuts) shortcuts.checked = Boolean(state.settings.shortcuts);
  const reading = $('#reading-pane-setting'); if (reading) reading.checked = Boolean(state.settings.readingPane);
  $$('[data-full-category]').forEach(input => input.checked = Boolean(state.settings.categories[input.dataset.fullCategory]));
  if (tab === 'Labels') renderManageLabels();
}
function renderManageLabels() {
  const host = $('#settings-label-list'); if (!host) return; host.replaceChildren();
  if (!state.labels.length) { const p = document.createElement('p'); p.textContent = 'No labels created yet.'; host.append(p); return; }
  state.labels.forEach(label => {
    const row = document.createElement('div'); row.className = 'settings-row';
    const info = document.createElement('div'); const strong = document.createElement('strong'); strong.textContent = label; const small = document.createElement('small'); small.textContent = `${state.emails.filter(e => (e.labels || []).includes(label)).length} messages`; info.append(strong, small);
    const actions = document.createElement('div'); actions.style.display = 'flex'; actions.style.gap = '6px';
    const rename = document.createElement('button'); rename.className = 'secondary-button'; rename.textContent = 'Rename'; rename.dataset.action = 'rename-label'; rename.dataset.label = label;
    const del = document.createElement('button'); del.className = 'secondary-button'; del.textContent = 'Delete'; del.dataset.action = 'delete-label'; del.dataset.label = label;
    actions.append(rename, del); row.append(info, actions); host.append(row);
  });
}
function closeAllSettings() {
  $('#settings-page').classList.add('hidden');
  $('#email-detail').classList.add('hidden');
  $('#email-list').classList.remove('hidden');
  $('#mail-panel').querySelector('.toolbar').classList.remove('hidden');
  view.activeId = null;
  view.folder = settingsOriginFolder;
  renderEmails();
}
function renameLabel(oldName) {
  const value = window.prompt('Rename label:', oldName); if (value === null) return;
  const next = value.trim(); if (!next) return;
  if (state.labels.some(label => label.toLowerCase() === next.toLowerCase() && label !== oldName)) { toast('That label already exists.'); return; }
  state.labels = state.labels.map(label => label === oldName ? next : label);
  state.emails.forEach(email => { email.labels = (email.labels || []).map(label => label === oldName ? next : label); });
  if (view.folder === `label:${oldName}`) view.folder = `label:${next}`;
  saveState(); renderSettingsPage('Labels'); renderLabels(); toast('Label renamed');
}
function deleteLabel(name) {
  if (!window.confirm(`Delete the label “${name}”? Messages will remain in their current folders.`)) return;
  state.labels = state.labels.filter(label => label !== name);
  state.emails.forEach(email => email.labels = (email.labels || []).filter(label => label !== name));
  if (view.folder === `label:${name}`) view.folder = 'inbox';
  saveState(); renderSettingsPage('Labels'); renderLabels(); toast('Label deleted');
}

/* Side apps and backup */
function openSideApp(name) {
  closeMenus(); $('#settings-panel').classList.add('hidden');
  $('#side-app-title').textContent = name;
  const host = $('#side-app-content'); host.replaceChildren();
  if (name === 'Calendar') {
    const now = new Date(); const h = document.createElement('h3'); h.textContent = now.toLocaleDateString([], { month:'long', year:'numeric' });
    const p = document.createElement('p'); p.textContent = `Today is ${now.toLocaleDateString([], { weekday:'long', month:'long', day:'numeric' })}.`;
    const box = document.createElement('div'); box.className = 'side-app-box'; box.textContent = 'No events to display.'; host.append(h,p,box);
  } else if (name === 'Keep') {
    host.innerHTML = '<h3>Notes</h3><textarea id="keep-note-input" class="form-control" rows="4" placeholder="Write a quick note…"></textarea><button class="primary-button" data-action="save-keep-note" style="margin-top:10px">Save note</button><div id="keep-note-list"></div>';
    renderKeepNotes();
  } else if (name === 'Tasks') {
    host.innerHTML = '<h3>Tasks</h3><div style="display:flex;gap:6px"><input id="task-input" class="form-control" placeholder="Add a task"><button class="primary-button" data-action="add-task">Add</button></div><div id="task-list"></div>';
    renderTasks();
  } else if (name === 'Contacts') {
    const list = document.createElement('div');
    const seen = new Set();
    state.emails.forEach(email => {
      const addr = email.folder === 'sent' ? email.recipient : email.senderEmail;
      if (!addr || addr === state.profile.email || seen.has(addr)) return; seen.add(addr);
      const row = document.createElement('div'); row.className = 'side-app-box'; const strong = document.createElement('strong'); strong.textContent = email.folder === 'sent' ? email.recipient : email.sender; const small = document.createElement('div'); small.textContent = addr; small.style.fontSize = '11px'; row.append(strong,small); list.append(row);
    });
    const h = document.createElement('h3'); h.textContent = 'Contacts'; host.append(h, list);
    if (!seen.size) host.append(document.createTextNode('No contacts found yet.'));
  } else if (name === 'Add-ons') {
    host.innerHTML = '<h3>Get add-ons</h3><div class="side-app-box">Browse available add-ons and extensions.</div>';
  } else {
    host.innerHTML = `<h3>${escapeHTML(name)}</h3><div class="side-app-box">Open ${escapeHTML(name)} to get started.</div>`;
  }
  $('#side-app-panel').classList.remove('hidden');
}
function renderKeepNotes() {
  const host = $('#keep-note-list'); if (!host) return; host.replaceChildren();
  const notes = safeReadJSON('mail_lab_notes') || [];
  notes.forEach((note, index) => { const box = document.createElement('div'); box.className = 'side-app-box'; box.textContent = note; const del = document.createElement('button'); del.className = 'text-button'; del.textContent = 'Delete'; del.dataset.action = 'delete-keep-note'; del.dataset.index = index; box.append(del); host.append(box); });
}
function renderTasks() {
  const host = $('#task-list'); if (!host) return; host.replaceChildren();
  const tasks = safeReadJSON('mail_lab_tasks') || [];
  tasks.forEach((task, index) => { const row = document.createElement('label'); row.className = 'side-app-box'; row.style.display = 'flex'; row.style.alignItems = 'center'; row.style.gap = '9px'; const input = document.createElement('input'); input.type = 'checkbox'; input.checked = Boolean(task.done); input.dataset.action = 'toggle-task'; input.dataset.index = index; const span = document.createElement('span'); span.textContent = task.text; if (task.done) span.style.textDecoration = 'line-through'; row.append(input, span); host.append(row); });
}
async function blobToDataURL(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error || new Error('Could not encode attachment.'));
    reader.readAsDataURL(blob);
  });
}

async function exportBackup() {
  try {
    const payload = structuredClone(state);
    for (const email of payload.emails) {
      for (const attachment of (email.attachments || [])) {
        if (!attachment.id) continue;
        const stored = await getStoredAttachment(attachment.id);
        if (stored?.blob) attachment.dataUrl = await blobToDataURL(stored.blob);
      }
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `buildchore-mail-backup-${new Date().toISOString().slice(0,10)}.json`;
    document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast('Backup exported with available attachments');
  } catch (error) {
    console.error(error); toast(error.message || 'Could not export backup.');
  }
}

function dataURLToBlob(dataUrl) {
  const [header, data] = String(dataUrl).split(',', 2);
  const mime = header.match(/data:([^;]+)/)?.[1] || 'application/octet-stream';
  const binary = atob(data || '');
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

async function importBackup(file) {
  if (!file) return;
  try {
    const parsed = JSON.parse(await file.text());
    if (!parsed || !Array.isArray(parsed.emails) || !Array.isArray(parsed.labels)) throw new Error('Invalid backup file.');
    const importedEmails = parsed.emails.map(normalizeEmail);
    for (const email of importedEmails) {
      for (const attachment of (email.attachments || [])) {
        if (!attachment.dataUrl) continue;
        const blob = dataURLToBlob(attachment.dataUrl);
        const importedFile = new File([blob], attachment.name || 'attachment', { type: attachment.type || blob.type || 'application/octet-stream' });
        const meta = await storeAttachmentBlob(importedFile, attachment.id || null);
        Object.assign(attachment, meta);
        delete attachment.dataUrl;
      }
    }
    state = { ...defaultState(), ...parsed, emails: importedEmails, labels: parsed.labels.map(String), settings: { ...defaultState().settings, ...(parsed.settings || {}), categories: { ...defaultState().settings.categories, ...((parsed.settings || {}).categories || {}) } }, profile: { ...defaultState().profile, ...(parsed.profile || {}) } };
    applyBuildchoreMailboxMigration();
    saveState(); applySettings(); switchFolder('inbox'); toast('Backup imported with attachments');
  } catch (error) { console.error(error); toast(`Import failed: ${error.message}`); }
}
/* Scheduled messages and small helpers */
function processScheduledMessages() {
  let changed = false;
  const now = Date.now();
  state.emails.forEach(email => {
    if (email.folder === 'scheduled' && email.scheduledAt && new Date(email.scheduledAt).getTime() <= now) {
      email.folder = 'sent'; email.date = new Date().toISOString(); email.scheduledAt = null; changed = true;
    }
    if (email.snoozedUntil && new Date(email.snoozedUntil).getTime() <= now) { email.snoozedUntil = null; changed = true; }
  });
  if (changed) { saveState(); renderEmails(); }
}
/* The administrator console opens after 20 deliberate clicks on the Gmail wordmark. */
$('#brand-home').addEventListener('click', () => {
  adminLogoClicks += 1;
  if (adminLogoClicks >= 20) {
    adminLogoClicks = 0;
    openAdminPanel();
  }
});

/* One delegated click handler keeps dynamically rendered controls functional. */
document.addEventListener('mousedown', event => {
  if (event.target.closest('.compose-format-toolbar button, .compose-format-toolbar label')) event.preventDefault();
});

document.addEventListener('click', event => {
  const actionButton = event.target.closest('[data-action]');
  if (actionButton) {
    const action = actionButton.dataset.action;
    const id = actionButton.dataset.id;
    switch (action) {
      case 'toggle-sidebar':
        if (window.matchMedia('(max-width: 820px)').matches) document.body.classList.toggle('mobile-sidebar-open');
        else document.body.classList.toggle('sidebar-collapsed');
        break;
      case 'close-mobile-sidebar': document.body.classList.remove('mobile-sidebar-open'); break;
      case 'go-inbox': switchFolder('inbox'); break;
      case 'open-compose': openCompose(); break;
      case 'toggle-quick-settings': $('#settings-panel').classList.toggle('hidden'); closeMenus(); break;
      case 'close-quick-settings': $('#settings-panel').classList.add('hidden'); break;
      case 'toggle-apps': togglePopup('apps-menu'); break;
      case 'toggle-profile': togglePopup('profile-menu'); break;
      case 'toggle-more-menu': togglePopup('more-menu'); break;
      case 'batch-more': togglePopup('batch-menu'); break;
      case 'batch-label': openLabelMenu(); break;
      case 'apply-label': applyLabel(actionButton.dataset.label); break;
      case 'add-label': createLabel(); break;
      case 'refresh': processScheduledMessages(); renderEmails(); toast('Mail list refreshed'); break;
      case 'toggle-star': case 'detail-star': toggleStar(id); event.stopPropagation(); break;
      case 'toggle-important': toggleImportant(id); event.stopPropagation(); break;
      case 'row-archive': archiveMessages([id]); event.stopPropagation(); break;
      case 'row-move-inbox': restoreMessage([id]); event.stopPropagation(); break;
      case 'row-delete': moveToTrash([id]); event.stopPropagation(); break;
      case 'row-snooze': promptSnooze([id]); event.stopPropagation(); break;
      case 'row-toggle-read': { const mail = state.emails.find(e => String(e.id) === String(id)); if (mail) markRead([id], !mail.read); event.stopPropagation(); break; }
      case 'batch-archive': archiveMessages(selectedIdsArray()); break;
      case 'batch-move-inbox': restoreMessage(selectedIdsArray()); break;
      case 'batch-delete': moveToTrash(selectedIdsArray()); break;
      case 'batch-delete-forever': { const ids = selectedIdsArray().length ? selectedIdsArray() : (view.activeId ? [view.activeId] : []); if (ids.length && window.confirm('Permanently delete the selected message(s)?')) { state.emails = state.emails.filter(mail => !ids.includes(String(mail.id))); selectedIds.clear(); saveState(); if (view.activeId && ids.includes(String(view.activeId))) closeDetail(); else renderEmails(); toast('Permanently deleted'); } closeMenus(); break; }
      case 'batch-report-spam': reportSpam(selectedIdsArray()); break;
      case 'batch-mark-unread': markRead(selectedIdsArray().length ? selectedIdsArray() : (view.activeId ? [view.activeId] : []), false); if (view.activeId) closeDetail(); break;
      case 'batch-mark-important': (selectedIdsArray().length ? selectedIdsArray() : (view.activeId ? [String(view.activeId)] : [])).forEach(mid => { const mail = state.emails.find(e => String(e.id) === mid); if (mail) mail.important = true; }); selectedIds.clear(); saveState(); if (view.activeId) renderDetail(activeEmail()); else renderEmails(); closeMenus(); toast('Marked as important'); break;
      case 'batch-mark-not-important': (selectedIdsArray().length ? selectedIdsArray() : (view.activeId ? [String(view.activeId)] : [])).forEach(mid => { const mail = state.emails.find(e => String(e.id) === mid); if (mail) mail.important = false; }); selectedIds.clear(); saveState(); if (view.activeId) renderDetail(activeEmail()); else renderEmails(); closeMenus(); toast('Marked as not important'); break;
      case 'batch-snooze': promptSnooze(selectedIdsArray().length ? selectedIdsArray() : (view.activeId ? [view.activeId] : [])); if (view.activeId) closeDetail(); break;
      case 'mark-visible-read': markRead(currentMessages().map(e => e.id), true); closeMenus(); break;
      case 'empty-trash': if (window.confirm('Permanently delete every message in Trash?')) { state.emails = state.emails.filter(e => e.folder !== 'trash'); saveState(); renderEmails(); toast('Trash emptied'); } closeMenus(); break;
      case 'page-prev': view.page = Math.max(1, view.page - 1); selectedIds.clear(); renderEmails(); break;
      case 'page-next': view.page += 1; selectedIds.clear(); renderEmails(); break;
      case 'back-to-list': closeDetail(); break;
      case 'detail-archive': archiveMessages([id]); break;
      case 'detail-move-inbox': restoreMessage([id]); break;
      case 'detail-spam': reportSpam([id]); break;
      case 'detail-delete': moveToTrash([id]); break;
      case 'detail-more': togglePopup('batch-menu'); break;
      case 'reply': { const mail = state.emails.find(e => String(e.id) === String(id)); if (mail) { const target = mail.folder === 'sent' ? (mail.recipientEmail || (String(mail.recipient).match(/<([^>]+)>/) || [])[1] || mail.recipient) : mail.senderEmail; const subject = /^re:/i.test(mail.subject) ? mail.subject : `Re: ${mail.subject}`; openCompose({ to: target, subject, body: '', title: 'Reply', quotedMessage: quoteSnapshot(mail), replyToId: mail.id, inReplyToId: mail.id, threadId: String(mail.threadId || mail.id) }); } break; }
      case 'edit-thread-draft': {
        const draft = state.emails.find(item => String(item.id) === String(id) && item.folder === 'drafts');
        if (draft) openCompose({ draftId: draft.id, to: draft.recipient, cc: draft.cc || '', bcc: draft.bcc || '', subject: draft.subject, body: draft.body, bodyHtml: draft.bodyHtml || '', attachments: draft.attachments || [], quotedMessage: draft.quotedMessage || null, replyToId: draft.replyToId || null, threadId: draft.threadId || null, inReplyToId: draft.inReplyToId || draft.replyToId || null, title: 'Reply' });
        break;
      }
      case 'forward': { const mail = state.emails.find(e => String(e.id) === String(id)); if (mail) openCompose({ subject: `Fwd: ${mail.subject}`, body: `\n\n---------- Forwarded message ----------\nFrom: ${mail.sender} <${mail.senderEmail}>\nDate: ${detailDate(mail)}\nSubject: ${mail.subject}\nTo: ${mail.recipient}\n\n${mail.body}`, attachments: mail.attachments || [] }); break; }
      case 'open-advanced-search': $('#advanced-search-modal').classList.remove('hidden'); break;
      case 'close-advanced-search': $('#advanced-search-modal').classList.add('hidden'); break;
      case 'clear-search': runSearch(''); break;
      case 'toggle-cc': $('#cc-line').classList.toggle('hidden'); if (!$('#cc-line').classList.contains('hidden')) $('#compose-cc').focus(); break;
      case 'toggle-bcc': $('#bcc-line').classList.toggle('hidden'); if (!$('#bcc-line').classList.contains('hidden')) $('#compose-bcc').focus(); break;
      case 'close-compose': closeCompose(); break;
      case 'minimize-compose': $('#compose-modal').classList.toggle('minimized'); break;
      case 'discard-draft': discardDraft(); break;
      case 'toggle-schedule': $('#schedule-row').classList.toggle('hidden'); if (!$('#schedule-row').classList.contains('hidden') && !$('#schedule-at').value) $('#schedule-at').value = localDateTimeValue(new Date(Date.now() + 3600000)); break;
      case 'clear-schedule': $('#schedule-row').classList.add('hidden'); $('#schedule-at').value = ''; break;
      case 'remove-attachment': {
        const [removed] = composeAttachments.splice(Number(actionButton.dataset.index), 1);
        renderComposeAttachments(); saveDraft(true);
        if (removed?.id && !state.emails.some(mail => (mail.attachments || []).some(file => file.id === removed.id))) deleteStoredAttachment(removed.id).catch(console.warn);
        break;
      }
      case 'preview-attachment': previewAttachment(actionButton.dataset.attachmentId); break;
      case 'close-attachment-preview': closeAttachmentPreview(); break;
      case 'attach-due-diligence': attachDueDiligencePackage(); break;
      case 'insert-acquisition-response': insertAcquisitionResponseTemplate(); break;
      case 'toggle-compose-fullscreen': $('#compose-modal').classList.toggle('compose-fullscreen'); actionButton.title = $('#compose-modal').classList.contains('compose-fullscreen') ? 'Exit full screen' : 'Full screen'; actionButton.querySelector('.mi').textContent = $('#compose-modal').classList.contains('compose-fullscreen') ? 'fullscreen_exit' : 'fullscreen'; break;
      case 'format-command': {
        const command = actionButton.dataset.command;
        $('#compose-body').focus();
        if (command === 'createLink') { const url = window.prompt('Enter link URL (https://):'); if (url && /^https?:\/\//i.test(url)) document.execCommand(command, false, url); }
        else document.execCommand(command, false, null);
        saveDraft(true); break;
      }
      case 'close-admin': $('#admin-modal').classList.add('hidden'); break;
      case 'admin-tab': setAdminTab(actionButton.dataset.tab); break;
      case 'admin-reset-form': resetAdminForm(); break;
      case 'admin-edit-message': editAdminMessage(id); break;
      case 'admin-delete-message': deleteAdminMessage(id); break;
      case 'admin-clear-all': clearAllAdminMessages(); break;
      case 'open-all-settings': openAllSettings(); break;
      case 'close-all-settings': closeAllSettings(); break;
      case 'settings-tab': renderSettingsPage(actionButton.dataset.tab); break;
      case 'rename-label': renameLabel(actionButton.dataset.label); break;
      case 'delete-label': deleteLabel(actionButton.dataset.label); break;
      case 'open-side-app': openSideApp(actionButton.dataset.app); break;
      case 'close-side-app': $('#side-app-panel').classList.add('hidden'); break;
      case 'save-keep-note': {
        const value = $('#keep-note-input')?.value.trim(); if (!value) { toast('Write a note first.'); break; }
        const notes = safeReadJSON('mail_lab_notes') || []; notes.unshift(value); localStorage.setItem('mail_lab_notes', JSON.stringify(notes)); openSideApp('Keep'); toast('Note saved'); break;
      }
      case 'delete-keep-note': { const notes = safeReadJSON('mail_lab_notes') || []; notes.splice(Number(actionButton.dataset.index),1); localStorage.setItem('mail_lab_notes',JSON.stringify(notes)); openSideApp('Keep'); break; }
      case 'add-task': { const value = $('#task-input')?.value.trim(); if (!value) { toast('Enter a task first.'); break; } const tasks = safeReadJSON('mail_lab_tasks') || []; tasks.push({text:value,done:false}); localStorage.setItem('mail_lab_tasks',JSON.stringify(tasks)); openSideApp('Tasks'); break; }
      case 'export-data': exportBackup(); break;
      case 'import-data': $('#import-file').click(); break;

    }
    return;
  }

  const folderButton = event.target.closest('[data-folder]');
  if (folderButton) { switchFolder(folderButton.dataset.folder); return; }
  const labelButton = event.target.closest('.label-nav');
  if (labelButton) { switchFolder(`label:${labelButton.dataset.label}`); return; }
  const categoryButton = event.target.closest('[data-category]');
  if (categoryButton) { switchCategory(categoryButton.dataset.category); return; }
  const themeButton = event.target.closest('[data-theme]');
  if (themeButton) { setTheme(themeButton.dataset.theme); return; }
  const row = event.target.closest('.email-row');
  if (row && !event.target.closest('button, input, label')) { openEmail(row.dataset.id); return; }
  if (!event.target.closest('.popup-menu') && !event.target.closest('[data-action="toggle-apps"], [data-action="toggle-profile"], [data-action="toggle-more-menu"], [data-action="batch-more"], [data-action="batch-label"]')) closeMenus();
});

document.addEventListener('change', event => {
  const target = event.target;
  if (target.id === 'select-all-checkbox') {
    const pageItems = currentMessages().slice((view.page - 1) * view.pageSize, view.page * view.pageSize);
    if (target.checked) pageItems.forEach(email => selectedIds.add(String(email.id)));
    else pageItems.forEach(email => selectedIds.delete(String(email.id)));
    renderEmails(); return;
  }
  if (target.classList.contains('row-check')) {
    if (target.checked) selectedIds.add(String(target.dataset.id)); else selectedIds.delete(String(target.dataset.id));
    renderEmails(); return;
  }
  if (target.name === 'density') setDensity(target.value);
  if (target.dataset.categorySetting) { state.settings.categories[target.dataset.categorySetting] = target.checked; saveState(); renderCategoryTabs(); renderEmails(); }
  if (target.dataset.fullCategory) { state.settings.categories[target.dataset.fullCategory] = target.checked; saveState(); }
  if (target.id === 'quick-inbox-type' || target.id === 'full-inbox-type') { state.settings.inboxType = target.value; saveState(); if (target.id === 'quick-inbox-type') $('#full-inbox-type') && ($('#full-inbox-type').value = target.value); renderEmails(); }
  if (target.id === 'full-theme') setTheme(target.value);
  if (target.id === 'full-density') setDensity(target.value);
  if (target.id === 'notifications-setting') { state.settings.desktopNotifications = target.checked; saveState(); }
  if (target.id === 'shortcuts-setting') { state.settings.shortcuts = target.checked; saveState(); }
  if (target.id === 'reading-pane-setting') { state.settings.readingPane = target.checked; saveState(); }
  if (target.id === 'compose-files') {
    addAttachmentFiles(target.files).finally(() => { target.value = ''; });
  }
  if (target.id === 'compose-text-colour') {
    $('#compose-body').focus();
    document.execCommand('foreColor', false, target.value);
    saveDraft(true);
  }
  if (target.id === 'compose-font-size') { $('#compose-body').focus(); document.execCommand('fontSize', false, target.value); saveDraft(true); }
    if (target.dataset.action === 'toggle-task') {
    const tasks = safeReadJSON('mail_lab_tasks') || []; const i = Number(target.dataset.index); if (tasks[i]) tasks[i].done = target.checked; localStorage.setItem('mail_lab_tasks', JSON.stringify(tasks)); openSideApp('Tasks');
  }
});

document.addEventListener('input', event => {
  if (['compose-to','compose-cc','compose-bcc','compose-subject','compose-body','schedule-at'].includes(event.target.id)) {
    clearTimeout(composeSaveTimer); $('#compose-status').textContent = 'Saving…';
    composeSaveTimer = setTimeout(() => saveDraft(true), 550);
  }
});

$('#search-form').addEventListener('submit', event => { event.preventDefault(); runSearch($('#search-input').value); });
$('#advanced-search-form').addEventListener('submit', advancedSearch);
$('#admin-message-form').addEventListener('submit', saveAdminMessage);
$('#admin-bulk-form').addEventListener('submit', createBulkMessages);
$('#admin-filter').addEventListener('input', renderAdminMessages);
$('#compose-form').addEventListener('submit', event => { event.preventDefault(); scheduleDraftOrSend(); });
$('#import-file').addEventListener('change', event => { importBackup(event.target.files?.[0]); event.target.value = ''; });
$('#page-size').addEventListener('change', event => { view.pageSize = Number(event.target.value) || 10; view.page = 1; selectedIds.clear(); renderEmails(); });
$('#compose-body').addEventListener('keydown', event => { if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') { event.preventDefault(); scheduleDraftOrSend(); } });
$('#compose-body').addEventListener('paste', event => {
  if (event.clipboardData?.files?.length) { event.preventDefault(); addAttachmentFiles(event.clipboardData.files); }
});
$('#compose-modal').addEventListener('dragover', event => { if (event.dataTransfer?.types?.includes('Files')) { event.preventDefault(); $('#compose-modal').classList.add('drag-over'); } });
$('#compose-modal').addEventListener('dragleave', event => { if (!$('#compose-modal').contains(event.relatedTarget)) $('#compose-modal').classList.remove('drag-over'); });
$('#compose-modal').addEventListener('drop', event => { $('#compose-modal').classList.remove('drag-over'); if (event.dataTransfer?.files?.length) { event.preventDefault(); addAttachmentFiles(event.dataTransfer.files); } });

/* Keyboard shortcuts are opt-in. */
document.addEventListener('keydown', event => {
  if ((event.key === 'Enter' || event.key === ' ') && event.target.classList?.contains('email-row')) { event.preventDefault(); openEmail(event.target.dataset.id); return; }
  if (event.key === 'Escape') {
    ['admin-modal','advanced-search-modal'].forEach(id => $(`#${id}`).classList.add('hidden'));
    closeAttachmentPreview();
    closeMenus(); $('#settings-panel').classList.add('hidden'); $('#side-app-panel').classList.add('hidden');
    if (!$('#compose-modal').classList.contains('hidden')) closeCompose();
    if (view.activeId) closeDetail();
    document.body.classList.remove('mobile-sidebar-open');
  }
  if (!state.settings.shortcuts || event.ctrlKey || event.metaKey || event.altKey) return;
  const tag = document.activeElement?.tagName;
  if (['INPUT','TEXTAREA','SELECT'].includes(tag) || !$('#compose-modal').classList.contains('hidden')) return;
  if (event.key === '/') { event.preventDefault(); $('#search-input').focus(); }
  if (event.key.toLowerCase() === 'c') { event.preventDefault(); openCompose(); }
});

/* Crisp, local Google-product marks: no generic favicon fallback or double date overlay. */
const GOOGLE_PRODUCT_SVGS = {
  calendar: `<svg viewBox="0 0 48 48" role="img" aria-label="Google Calendar"><rect x="5" y="6" width="38" height="37" rx="7" fill="#fff" stroke="#dadce0" stroke-width="1.5"/><path d="M5 13a7 7 0 0 1 7-7h24a7 7 0 0 1 7 7v5H5z" fill="#4285f4"/><path d="M5 13a7 7 0 0 1 7-7h5v12H5z" fill="#ea4335"/><path d="M31 6h5a7 7 0 0 1 7 7v5H31z" fill="#34a853"/><path d="M17 6h14v12H17z" fill="#fbbc04"/><path d="M15 4v7M33 4v7" stroke="#5f6368" stroke-width="2.5" stroke-linecap="round"/><text class="calendar-svg-day" x="24" y="35" text-anchor="middle" font-family="Roboto,Arial,sans-serif" font-size="18" font-weight="700" fill="#3c4043">${new Date().getDate()}</text></svg>`,
  keep: `<svg viewBox="0 0 48 48" role="img" aria-label="Google Keep"><path d="M24 5c-8 0-14 6-14 14 0 5 2.4 8.5 6.1 12.1 1.6 1.6 2.4 3.1 2.6 5.9h10.6c.2-2.8 1-4.3 2.6-5.9C36 27.5 38 24 38 19 38 11.5 32 5 24 5z" fill="#fbbc04"/><path d="M19 40h10M20 44h8" stroke="#9a6700" stroke-width="2.5" stroke-linecap="round"/><path d="M24 1v3M7 8l3 3M41 8l-3 3M3 22h4M41 22h4" stroke="#fbbc04" stroke-width="3" stroke-linecap="round"/></svg>`,
  tasks: `<svg viewBox="0 0 48 48" role="img" aria-label="Google Tasks"><circle cx="24" cy="24" r="19" fill="#4285f4"/><path d="M14 24l6.2 6.2L34 16.5" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/><path d="M11 11l2 2M35 37l2 2" stroke="#a8c7fa" stroke-width="2" stroke-linecap="round"/></svg>`,
  contacts: `<svg viewBox="0 0 48 48" role="img" aria-label="Google Contacts"><rect x="5" y="5" width="38" height="38" rx="9" fill="#4285f4"/><circle cx="24" cy="18" r="7" fill="#fff"/><path d="M11 38c1.7-7 6.1-10.5 13-10.5S35.3 31 37 38" fill="#d2e3fc"/><path d="M5 15h4M5 24h4M5 33h4" stroke="#34a853" stroke-width="3" stroke-linecap="round"/></svg>`,
  search: `<svg viewBox="0 0 48 48" role="img" aria-label="Google Search"><path d="M24 6a18 18 0 0 1 12.8 5.3l-5.2 5.2A10.7 10.7 0 0 0 14.2 22H6.8A18 18 0 0 1 24 6z" fill="#4285f4"/><path d="M6 24c0-2.1.3-4.1.9-6h7.5a10.8 10.8 0 0 0 0 12H6.9A18 18 0 0 1 6 24z" fill="#34a853"/><path d="M14.4 30a10.7 10.7 0 0 0 17.2 2.4l5.4 5A18 18 0 0 1 6.9 30z" fill="#fbbc04"/><path d="M37.8 16.5c.8 2.3 1.2 4.8 1.2 7.5 0 2.3-.4 4.5-1.2 6.5H24v-7h7.3a7.5 7.5 0 0 0-1.3-3.5z" fill="#ea4335"/></svg>`,
  maps: `<svg viewBox="0 0 48 48" role="img" aria-label="Google Maps"><path d="M24 4C14.8 4 8 10.8 8 19.5c0 11 16 24.5 16 24.5s16-13.5 16-24.5C40 10.8 33.2 4 24 4z" fill="#34a853"/><path d="M24 4c-7.2 0-13 5.4-13 13 0 4.4 2.1 8.6 5 12.7L31 8.3A15.5 15.5 0 0 0 24 4z" fill="#4285f4"/><path d="M37 11.5 16 31c2.6 4.2 5.8 7.6 8 10 0 0 16-13.5 16-24.5 0-2-.4-3.7-1.1-5z" fill="#fbbc04"/><circle cx="24" cy="19" r="6" fill="#ea4335"/><circle cx="24" cy="19" r="2.5" fill="#fff"/></svg>`,
  youtube: `<svg viewBox="0 0 48 48" role="img" aria-label="YouTube"><rect x="4" y="10" width="40" height="28" rx="8" fill="#f00"/><path d="M20 17.5 32 24 20 30.5z" fill="#fff"/></svg>`,
  drive: `<svg viewBox="0 0 48 48" role="img" aria-label="Google Drive"><path d="M17 5h10l17 29H34z" fill="#ffba00"/><path d="M17 5 2 31l5 9 15-26z" fill="#0f9d58"/><path d="M7 40h30l6-6H11z" fill="#4285f4"/><path d="M17 5h10l-5 9H12z" fill="#ea4335"/></svg>`,
  photos: `<svg viewBox="0 0 48 48" role="img" aria-label="Google Photos"><path d="M24 23C12 23 10 6 19 5c6-1 9 7 5 18z" fill="#ea4335"/><path d="M25 24c0-12 17-14 18-5 1 6-7 9-18 5z" fill="#4285f4"/><path d="M24 25c12 0 14 17 5 18-6 1-9-7-5-18z" fill="#34a853"/><path d="M23 24C23 36 6 38 5 29c-1-6 7-9 18-5z" fill="#fbbc04"/></svg>`,
  docs: `<svg viewBox="0 0 48 48" role="img" aria-label="Google Docs"><path d="M11 4h18l10 10v29H11z" fill="#4285f4"/><path d="M29 4v11h10" fill="#a1c2fa"/><path d="M17 23h16M17 29h16M17 35h13" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/></svg>`,
  sheets: `<svg viewBox="0 0 48 48" role="img" aria-label="Google Sheets"><path d="M11 4h18l10 10v29H11z" fill="#34a853"/><path d="M29 4v11h10" fill="#a8dab5"/><path d="M17 22h16v14H17zM22.3 22v14M27.7 22v14M17 29h16" fill="none" stroke="#fff" stroke-width="1.8"/></svg>`,
  slides: `<svg viewBox="0 0 48 48" role="img" aria-label="Google Slides"><path d="M11 4h18l10 10v29H11z" fill="#fbbc04"/><path d="M29 4v11h10" fill="#fde293"/><rect x="17" y="22" width="16" height="12" rx="1.5" fill="none" stroke="#fff" stroke-width="2"/><path d="M20 31l4-4 3 2 3-4" fill="none" stroke="#fff" stroke-width="2"/></svg>`,
  meet: `<svg viewBox="0 0 48 48" role="img" aria-label="Google Meet"><rect x="5" y="11" width="27" height="26" rx="6" fill="#34a853"/><path d="M32 19 43 12v24L32 29z" fill="#4285f4"/><path d="M5 17h27v-1a5 5 0 0 0-5-5H11a6 6 0 0 0-6 6z" fill="#00ac47"/><path d="M5 31h27v1a5 5 0 0 1-5 5H11a6 6 0 0 1-6-6z" fill="#188038"/></svg>`,
  forms: `<svg viewBox="0 0 48 48" role="img" aria-label="Google Forms"><path d="M11 4h18l10 10v29H11z" fill="#a142f4"/><path d="M29 4v11h10" fill="#d7aefb"/><circle cx="18" cy="23" r="2" fill="#fff"/><path d="M23 23h10M16 30h17M16 36h17" stroke="#fff" stroke-width="2.2" stroke-linecap="round"/></svg>`,
  chat: `<svg viewBox="0 0 48 48" role="img" aria-label="Google Chat"><path d="M7 8h34v25H23L12 41v-8H7z" fill="#00ac47"/><path d="M14 17h20M14 23h15" stroke="#fff" stroke-width="3" stroke-linecap="round"/></svg>`
};

function hydrateGoogleProductIcons() {
  document.querySelectorAll('[data-google-app-icon]').forEach(node => {
    const key = node.dataset.googleAppIcon;
    const svg = GOOGLE_PRODUCT_SVGS[key];
    if (!svg) return;
    node.innerHTML = svg;
    node.classList.add('google-product-art-ready', `google-product-${key}`);
  });
}

/* Startup polish: current-date Calendar tile and Gmail loading animation. */
function updateGoogleCalendarDateIcons() {
  const now = new Date();
  const day = String(now.getDate());
  document.querySelectorAll('.calendar-svg-day').forEach(node => { node.textContent = day; });
  document.querySelectorAll('[data-google-app-icon="calendar"]').forEach(node => {
    node.setAttribute('aria-label', `Google Calendar, ${now.toLocaleDateString([], { month: 'long', day: 'numeric' })}`);
    node.setAttribute('title', `Google Calendar · ${now.toLocaleDateString([], { month: 'long', day: 'numeric' })}`);
  });
}

function finishStartupLoader() {
  document.body.classList.remove('app-loading');
  const loader = $('#startup-loader');
  if (!loader) return;
  loader.classList.add('startup-loader-hidden');
  window.setTimeout(() => loader.remove(), 420);
}

/* Initialise and keep scheduled/snoozed items up to date while this tab is open. */
async function init() {
  const startedAt = Date.now();
  hydrateGoogleProductIcons();
  updateGoogleCalendarDateIcons();

  try {
    applySettings();
    renderEmails();
    $('#search-input').value = '';
    $('#page-size').value = String(view.pageSize);

    // Mailbox repair may need IndexedDB. Let it continue in the background,
    // but don't hold the whole interface behind the startup screen indefinitely.
    const mailboxSetup = (async () => {
      await seedPersonalizedReplyDrafts();
      await ensureThirdLayerReplies();
      await ensureFourthLayerBuyerOffers();
      renderEmails();
      if (view.activeId) { const active = activeEmail(); if (active) renderDetail(active); }
    })().catch(error => {
      console.error('Mailbox setup encountered an issue', error);
      toast(error.message || 'Some mailbox updates could not be completed.');
    });

    await Promise.race([
      mailboxSetup,
      new Promise(resolve => window.setTimeout(resolve, 6500))
    ]);

    setInterval(processScheduledMessages, 30000);
    window.addEventListener('storage', event => {
      if (event.key === STORAGE_KEY && event.newValue) {
        try { state = JSON.parse(event.newValue); applyBuildchoreMailboxMigration(); renderEmails(); applySettings(); toast('Mailbox updated in another tab'); } catch (_) { /* ignore malformed cross-tab update */ }
      }
    });
  } catch (error) {
    console.error('Application initialisation failed', error);
    toast('Mailbox loaded with limited startup features.');
  } finally {
    const minimumSplashMs = 850;
    const remaining = Math.max(0, minimumSplashMs - (Date.now() - startedAt));
    window.setTimeout(finishStartupLoader, remaining);
  }
}
init();
