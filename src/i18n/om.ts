/**
 * Sheba Sound — Oromiffa Translations (om / Afaan Oromoo)
 */

import type { TranslationKeys } from "./en";

const om: TranslationKeys = {
  // ---- Language names ----
  lang: {
    english: "English",
    amharic: "አማርኛ",
    oromiffa: "Afaan Oromoo",
  },

  // ---- TopBar ----
  topbar: {
    menu: "Baafata",
    goBack: "Duubatti",
    goForward: "Fuulduratti",
    searchPlaceholder: "Sirbaa, artisitii barbaadi…",
    switchTheme: "Gara {{mode}} jijjiiri",
    switchLang: "Afaan jijjiiri",
    signUp: "Galmaa'i",
    logIn: "Seeni",
    notifications: "Beeksisa",
    profile: "Piroofaayilii",
    becomeArtist: "Artisitii Ta'i",
    signOut: "Ba'i",
    light: "ifaa",
    dark: "dukkana",
  },

  // ---- Sidebar Navigation ----
  nav: {
    home: "Mana",
    search: "Barbaadi",
    artists: "Artisitoota",
    yourLibrary: "Mana Kitaabaa Kee",
    myLibrary: "Mana Kitaabaa",
    subscription: "Miseensa",
    settings: "Qindaa'ina",
    forArtists: "Artisitootaaf",
    becomeArtist: "Artisitii Ta'i",
    dashboard: "Gabatee",
    browse: "Sakatta'i",
    music: "Muuziqaa",
    uploadSong: "Sirbaa Fe'i",
    mySongs: "Sirbaa Koo",
    myAlbums: "Albeemii Koo",
    myPlaylists: "Tarree Koo",
    insights: "Xiinxala",
    analytics: "Istaatistiksii",
    revenue: "Galii",
    profile: "Piroofaayilii",
    account: "Herrega",
    notifications: "Beeksisa",
    manage: "Bulchiinsa",
    users: "Fayyadamtoota",
    content: "Qabiyyee",
    artistVerification: "Mirkaneessa Artisitii",
    subscriptions: "Miseensota",
    reports: "Gabaasa",
    nowPlaying: "Amma Taphatamaa",
    downloads: "Buufatamtoota",
  },

  // ---- Roles ----
  roles: {
    listener: "Dhaggeeffataa",
    artist: "Artisitii",
    admin: "Bulchaa",
  },

  // ---- Subscription Page ----
  subscription: {
    title: "Miseensa",
    subtitle: "Karoora siif ta'u filadhu.",
    currentPlan: "Karoora Ammaa",
    free: "Bilisaa",
    premium: "Pireeemiyeemii",
    premiumMonthly: "Pireeemiyeemii Ji'aa",
    premiumYearly: "Pireeemiyeemii Waggaa",
    perMonth: "ji'atti",
    perYear: "waggaatti",
    forever: "bara baraan",
    bestValue: "Gatii Gaarii",
    save: "Birrii {{amount}} qusadhu",
    insteadOf: "Bakka",
    ifPaidMonthly: "ji'aan yoo kaffalame",
    currentPlanBtn: "Karoora Ammaa",
    downgrade: "Gadi Buusi",
    getMonthly: "Pireeemiyeemii Ji'aa Argadhu",
    getYearly: "Pireeemiyeemii Waggaa Argadhu",
    cancel: "Haqi",
    paymentMethods: "Mala Kaffaltii",
    paymentMethodsDesc:
      "Shebaa Saawundiin Telebirriin fi Chaappaadhaan adeemsa kaffaltii Itoophiyaa salphaa ta'e ni deeggara. Miseensi kee karoora filatteen ofumaan haaromsa. Fuula kanarraa yeroo barbaaddetti haqi.",
    choosePayment: "Mala Kaffaltii Filadhu",
    choosePaymentDesc:
      "Miseensa Pireeemiyeemii kee xumuruuruuf sarara kaffaltii filatamaa filadhu",
    premiumSubscription: "Miseensa Pireeemiyeemii",
    billingPeriod: "Yeroo Kaffaltii",
    monthly30: "Ji'aa (guyyaa 30)",
    yearly365: "Waggaa (guyyaa 365)",
    youSave: "Ni qusatta",
    vsMonthly: "kaffaltii ji'aa waliin yoo madaalamu",
    payVia: "Birrii {{amount}} {{provider}}n kaffali",
    redirecting: "Qajeelchaa jira...",
    cancelAutoRenewal: "Ofumaan Haaromsuu Haquu?",
    cancelDesc:
      "Argannoon pireeemiyeemii kee hanga {{date}}tti hojii irra ni tura. Sana booda gara karoora bilisaatti ni gadi bu'a.",
    keepPremium: "Pireeemiyeemii Turi",
    cancelSubscription: "Miseensa Haqi",
    cancelling: "Haqaa jira...",
    expires: "Ni dhumutti",
    autoRenewalOn: "Ofumaan haaromsuu: Banaa",
    autoRenewalOff: "Ofumaan haaromsuu: Cufaa",
    daysRemaining: "Guyyaa {{count}} hafe",
    daysRemainingPlural: "Guyyoota {{count}} hafan",
  },

  // ---- Subscription Features ----
  features: {
    fullCatalog: "Kaataaloogii muuziqaa guutuu argadhu",
    adSupported: "Beeksisaan kan deeggaramu",
    standardQuality: "Qulqullina sagalee idilee",
    create3Playlists: "Hanga tarree 3 uumi",
    offlineDownloads: "Sarara alaan buufadhu",
    adFree: "Beeksisa malee dhaggeeffadhu",
    highQuality: "Qulqullina sagalee olaanaa (320kbps)",
    unlimitedPlaylists: "Tarree daangaa hin qabne",
    earlyAccess: "Baasiiwwan haaraa dursa argadhu",
    lyrics: "Jechootaa agarsiisi",
    prioritySupport: "Deeggarsa dursi",
  },

  // ---- Payment Providers ----
  payment: {
    chapa: "Chaappaa",
    chapaDesc: "Dabarsa baankii, maallaqa mobaayilaa ykn kaardiidhaan kaffali",
    telebirr: "Telebirriin",
    telebirrDesc: "Boorsaa mobaayilaa Telebirriin kaffali",
  },

  // ---- Become Artist Page ----
  becomeArtist: {
    title: "Artisitii Ta'i",
    subtitle:
      "Artisitii ta'uuf iyyadi. Muuziqaa fe'uu dura eenyummaan kee ni mirkanaa'a.",
    resubmitTitle: "Iyyata Kee Irra Deebi'ii Galchi",
    resubmitSubtitle:
      "Odeeffannoo kee haaromsi iyyata kee gamaaggamaaf irra deebi'ii galchi.",
    alreadyVerified: "Durumaa artisitii mirkanaa'e dha!",
    redirecting: "Gara gabatee artisitii keetti qajeelchaa jira...",
    goToDashboard: "Gara Gabatee Artisitii Deemi",
    checkingStatus: "Haala iyyataa ilaalaa jira...",
    underReview: "Eenyummaan Kee Gamaaggama Irra Jira",
    pendingVerification: "Mirkaneessa Eegaa Jira",
    applicationSubmitted:
      "Iyyanni kee akka {{name}}tti galchameera garee keenyaan gamaaggamaa jira.",
    submittedOn: "Guyyaa {{date}} galchame",
    reviewInfo:
      "Adeemsi kun guyyoota hojii 1-3 ni fudhata. Eenyummaan kee erga mirkanaa'ee booda imeeliidhaan ni beeksifamta. Erga hayyamamee booda sirbaa fe'uu, albeemii uumuu, fi xiinxala kee hordofuu ni dandeessa.",
    previousRejected: "Iyyanni Duraa Kufee Jira",
    rejectionReason: "Sababni: {{reason}}",
    artistName: "Maqaa Artisitii / Maqaa Isteejii",
    artistNamePlaceholder: "Fkn. Teedii Afroo",
    artistNameHelper: "Maqaa kana jaalattonni piroofaayilii kee irratti argan.",
    primaryGenre: "Gosa Muuziqaa Duraa",
    selectGenre: "Gosa muuziqaa filadhu (dirqama miti)",
    genreHelper: "Gosa muuziqaa muuziqaa kee ibsu filadhu.",
    bio: "Seenaa Jireenya",
    bioPlaceholder:
      "Waa'ee ofii kee, dhiibbaa kee fi imala kee dhaggeeffatootaaf ibsi...",
    bioHelper: "{{count}}/500 arfii",
    identityVerification: "Mirkaneessa Eenyummaa",
    idDocType: "Gosa Sanadaa Eenyummaa",
    nationalId: "Waraqaa Eenyummaa Biyyaalessaa",
    passport: "Paaspoortii",
    idDocHelper: "Gosa sanadaa eenyummaa fe'aa jirtu filadhu.",
    uploadId: "Sanadaa Eenyummaa Fe'i (JPEG/PNG, guddina 5MB) *",
    idSecure:
      "Sanadaan eenyummaa kee nageenya qabuun kuufama yeroo gamaaggamaattis bulchitoota qofaaf mul'ata.",
    uploadProfile: "Suuraa Piroofaayilii Fe'i (dirqama miti)",
    infoNotice:
      "Iyyanni kee guyyoota hojii 1-3 keessatti garee keenyaan ni gamaaggamama. Erga mirkanaa'ee booda sirbaa fe'uu, albeemii uumuu, fi xiinxala kee hordofuu ni dandeessa. Manni kitaabaa fi tarreen kee duraanii hin jijjiiraman.",
    submitting: "Iyyata kee galchaa jira...",
    submitted: "Iyyanni Galchameera!",
    resubmitBtn: "Iyyata Irra Deebi'ii Galchi",
    submitBtn: "Iyyata Galchi",
  },

  // ---- 404 Page ----
  notFound: {
    title: "Fuulli Hin Argamne",
    message: "Fuulli barbaaddan hin jiru ykn jijjiirameera.",
    goHome: "Gara Manaa",
  },

  // ---- Auth Pages ----
  auth: {
    loginTitle: "Baga Nagaan Dhufte",
    loginSubtitle: "Gara herrega keetti seeni",
    registerTitle: "Herrega Uumi",
    registerSubtitle: "Har'a Shebaa Saawundii makki",
    email: "Imeelii",
    phone: "Bilbila",
    phoneNumber: "Lakkoofsa Bilbilaa",
    useEmail: "Imeelii Fayyadami",
    usePhone: "Bilbila Fayyadami",
    phoneHelper: "Koodii biyyaa malee lakkoofsa bilbilaa galchi",
    password: "Jecha Darbii",
    confirmPassword: "Jecha Darbii Mirkaneessi",
    firstName: "Maqaa",
    lastName: "Maqaa Abbaa",
    forgotPassword: "Jecha darbii dagatte?",
    noAccount: "Herrega hin qabduu?",
    haveAccount: "Duraan herrega qabdaa?",
    orContinueWith: "ykn kanaan itti fufi",
  },

  // ---- Common ----
  common: {
    loading: "Fe'aa jira...",
    error: "Rakkoon uumameera",
    retry: "Irra deebi'ii yaali",
    save: "Kuusadhu",
    cancel: "Haqi",
    delete: "Balleessi",
    edit: "Gulaali",
    close: "Cufi",
    confirm: "Mirkaneessi",
    back: "Duubatti",
    next: "Itti aanee",
    seeAll: "Hunda Ilaali",
    noResults: "Bu'aan hin argamne",
    download: "Buufadhu",
    downloading: "Buufachaa jira…",
    downloadComplete: '"{{title}}" sarara alaan dhaggeeffachuuf kuufameera',
    downloadFailed: "Buufachuun hin milkoofne. Irra deebi'ii yaali.",
    premiumOnly: "Pireeemiyeemii",
    premiumRequired:
      "Sirbaa sarara alaan buufachuuf gara Pireeemiyeemiitti fooyyeessi",
  },

  // ---- Home Page ----
  home: {
    greeting: "Akkam {{timeOfDay}}",
    morning: "bultaan",
    afternoon: "ooltanei",
    evening: "galgala",
    heroSubtitle:
      "Muuziqaa Itoophiyaa filatamaa argadhu — sirba Tiziitaa bara baraan jiraatu irraa kaasee hanga Iitiyoo-jaazii fi Afroobiitii ammayyaatti.",
    playTrending: "Jaalatamaa Taphadhu",
    trendingNow: "Amma Jaalatamaa",
    trendingSongs: "Sirbaa Jaalatamaa",
    newReleases: "Baasiiwwan Haaraa",
    popularArtists: "Artisitoota Beekamoo",
    popularAlbums: "Albeemota Beekamoo",
    madeForYou: "Siif Qophaa'e",
    recentlyPlayed: "Dhiyeenya Taphatame",
    featuredAlbums: "Albeemota Filatamoo",
    featuredPlaylists: "Tarree Filatamoo",
    topPlaylists: "Tarree Olaanoo",
    topTracks: "Sirbaa Olaanoo",
    searchPrompt: "Maal dhaggeeffachuu barbaadda?",
    streams: "taphatama",
  },

  // ---- Settings Page ----
  settings: {
    title: "Qindaa'ina",
    appearance: "Bifa",
    theme: "Bifa",
    language: "Afaan",
    account: "Herrega",
    changePassword: "Jecha Darbii Jijjiiri",
    deleteAccount: "Herrega Balleessi",
    notifications: "Beeksisa",
    emailNotifications: "Beeksisa Imeelii",
    pushNotifications: "Beeksisa Push",
  },

  // ---- Library Page ----
  library: {
    title: "Mana Kitaabaa Kee",
    likedSongs: "Sirbaa Jaallatame",
    playlists: "Tarreewwan",
    albums: "Albeemota",
    artists: "Artisitoota",
    downloads: "Buufatamtoota",
    history: "Seenaa",
  },
};

export default om;
