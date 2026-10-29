// src/i18n/translations.js

export const LANGUAGES = [
  { code: 'en', name: 'English', locale: 'en-ZA' },
  { code: 'zu', name: 'isiZulu', locale: 'zu-ZA' },
  { code: 'af', name: 'Afrikaans', locale: 'af-ZA' },
];

export const WEEK_START_OPTIONS = ['monday', 'sunday', 'saturday'];

const en = {
  'common.cancel': 'Cancel',

  'tab.home': 'Home',
  'tab.meds': 'Meds',
  'tab.history': 'History',
  'tab.community': 'Community',
  'tab.profile': 'Profile',

  'greeting.morning': 'Good morning',
  'greeting.afternoon': 'Good afternoon',
  'greeting.evening': 'Good evening',
  'greeting.there': 'there',

  'day.monday': 'Monday',
  'day.sunday': 'Sunday',
  'day.saturday': 'Saturday',

  'settings.title': 'Settings',
  'settings.subtitle': 'Personalise MedTrack',
  'settings.loading': 'Loading settings...',
  'settings.heroTitle': 'Your preferences',
  'settings.heroText': 'Control how MedTrack reminds you and how the app behaves.',
  'settings.retry': 'Retry',

  'settings.remindersTitle': 'Medication reminders',
  'settings.remindersDesc': 'Choose which medication events MedTrack should notify you about.',
  'settings.doseReminders': 'Dose reminders',
  'settings.doseRemindersSub': 'Receive reminders when it is time to take a scheduled medication.',
  'settings.missedAlerts': 'Missed-dose alerts',
  'settings.missedAlertsSub': 'Receive an alert when a scheduled dose has not been recorded.',
  'settings.refillAlerts': 'Refill alerts',
  'settings.refillAlertsSub': 'Get notified when your remaining medication supply is running low.',
  'settings.sound': 'Reminder sound',
  'settings.soundSub': 'Allow MedTrack medication reminders to use sound.',
  'settings.vibration': 'Vibration',
  'settings.vibrationSub': 'Use vibration together with medication reminder alerts.',
  'settings.testReminder': 'Send a test reminder',
  'settings.testReminderSub': 'Rings in about 5 seconds so you can confirm sound and vibration work.',
  'settings.refreshReminders': 'Refresh my reminders',
  'settings.refreshRemindersSub':
    'Rebuild all medication reminders on this phone from your saved schedule.',
  'settings.alertBehaviour': 'Alert behaviour',
  'settings.safetyTitle': 'Medication safety',
  'settings.safetyText':
    'MedTrack helps you track your medication routine. Always follow instructions from your healthcare professional or medication label.',

  'settings.appPrefs': 'App preferences',
  'settings.appearance': 'Appearance',
  'settings.appearanceSub': 'Choose how MedTrack looks on your device.',
  'settings.appearanceLight': 'Light',
  'settings.language': 'Language',
  'settings.languageSub': 'Choose your preferred language for MedTrack.',
  'settings.weekStart': 'Week starts on',
  'settings.weekStartSub': 'Choose the first day shown in calendars and reports.',
  'settings.chooseLanguage': 'Choose language',
  'settings.chooseWeekStart': 'Choose the first day of the week',

  'settings.privacySection': 'Privacy & security',
  'settings.accountSecurity': 'Account security',
  'settings.accountSecuritySub': 'Manage your password and account security.',
  'settings.healthPrivacy': 'Health data privacy',
  'settings.healthPrivacySub':
    'Review how your medication and health information is handled.',
  'settings.caregiver': 'Caregiver permissions',
  'settings.caregiverSub':
    'Control who can access medication information you explicitly share.',

  'settings.aboutSection': 'About',
  'settings.help': 'Help & Support',
  'settings.helpSub': 'Get help with MedTrack features and your account.',
  'settings.aboutApp': 'About MedTrack',
  'settings.aboutAppSub': 'Medication tracking and health companion.',
};

const zu = {
  'common.cancel': 'Khansela',

  'tab.home': 'Ikhaya',
  'tab.meds': 'Imithi',
  'tab.history': 'Umlando',
  'tab.community': 'Umphakathi',
  'tab.profile': 'Iphrofayela',

  'greeting.morning': 'Sawubona',
  'greeting.afternoon': 'Sawubona',
  'greeting.evening': 'Sawubona',
  'greeting.there': 'mngane',

  'day.monday': 'UMsombuluko',
  'day.sunday': 'ISonto',
  'day.saturday': 'UMgqibelo',

  'settings.title': 'Izilungiselelo',
  'settings.subtitle': 'Yenza i-MedTrack ibe ngokwakho',
  'settings.loading': 'Iyalayisha izilungiselelo...',
  'settings.heroTitle': 'Okuthandayo kwakho',
  'settings.heroText':
    'Lawula ukuthi i-MedTrack ikukhumbuza kanjani nokuthi uhlelo lusebenza kanjani.',
  'settings.retry': 'Zama futhi',

  'settings.remindersTitle': 'Izikhumbuzo zemithi',
  'settings.remindersDesc':
    'Khetha ukuthi yiziphi izehlakalo zemithi okufanele i-MedTrack ikwazise ngazo.',
  'settings.doseReminders': 'Izikhumbuzo zemithamo',
  'settings.doseRemindersSub':
    'Thola izikhumbuzo uma sekuyisikhathi sokuphuza umuthi owuhlelile.',
  'settings.missedAlerts': 'Izexwayiso zemithamo engaphuzwanga',
  'settings.missedAlertsSub':
    'Thola isexwayiso uma umthamo ohlelelwe ungabhalwanga.',
  'settings.refillAlerts': 'Izexwayiso zokugcwalisa kabusha',
  'settings.refillAlertsSub': 'Yaziswa uma umthi osele usuyaphela.',
  'settings.sound': 'Umsindo wesikhumbuzo',
  'settings.soundSub': 'Vumela izikhumbuzo zemithi ze-MedTrack ukuthi zisebenzise umsindo.',
  'settings.vibration': 'Ukudlidliza',
  'settings.vibrationSub': 'Sebenzisa ukudlidliza kanye nezexwayiso zesikhumbuzo semithi.',
  'settings.testReminder': 'Thumela isikhumbuzo sokuhlola',
  'settings.testReminderSub':
    'Sikhala ngemizuzwana engaba yi-5 ukuze uqinisekise ukuthi umsindo nokudlidliza kuyasebenza.',
  'settings.refreshReminders': 'Vuselela izikhumbuzo zami',
  'settings.refreshRemindersSub':
    'Akha kabusha zonke izikhumbuzo zemithi kule foni usebenzisa uhlelo lwakho olugciniwe.',
  'settings.alertBehaviour': 'Indlela yezexwayiso',
  'settings.safetyTitle': 'Ukuphepha kwemithi',
  'settings.safetyText':
    'I-MedTrack ikusiza ukulandelela uhlelo lwakho lwemithi. Landela njalo iziqondiso zosebenzi wezempilo noma zelebula yomuthi.',

  'settings.appPrefs': 'Izilungiselelo zohlelo',
  'settings.appearance': 'Ukubukeka',
  'settings.appearanceSub': 'Khetha ukuthi i-MedTrack ibukeka kanjani kudivayisi yakho.',
  'settings.appearanceLight': 'Ukukhanya',
  'settings.language': 'Ulimi',
  'settings.languageSub': 'Khetha ulimi lwakho oluthandayo lwe-MedTrack.',
  'settings.weekStart': 'Iviki liqala ngo',
  'settings.weekStartSub': 'Khetha usuku lokuqala eluboniswayo kumakhalenda nasezimibikweni.',
  'settings.chooseLanguage': 'Khetha ulimi',
  'settings.chooseWeekStart': 'Khetha usuku lokuqala lweviki',

  'settings.privacySection': 'Ubumfihlo nokuphepha',
  'settings.accountSecurity': 'Ukuphepha kwe-akhawunti',
  'settings.accountSecuritySub': 'Phatha iphasiwedi yakho nokuphepha kwe-akhawunti.',
  'settings.healthPrivacy': 'Ubumfihlo bolwazi lwezempilo',
  'settings.healthPrivacySub':
    'Buyekeza ukuthi imithi nolwazi lwakho lwezempilo luphathwa kanjani.',
  'settings.caregiver': 'Izimvume zomnakekeli',
  'settings.caregiverSub':
    'Lawula ukuthi ngubani ongafinyelela olwazini lwemithi oluhlanganyela ngokusobala.',

  'settings.aboutSection': 'Mayelana',
  'settings.help': 'Usizo nokuxhaswa',
  'settings.helpSub': 'Thola usizo ngezici ze-MedTrack kanye ne-akhawunti yakho.',
  'settings.aboutApp': 'Mayelana ne-MedTrack',
  'settings.aboutAppSub': 'Ukulandelela imithi nomngane wezempilo.',
};

const af = {
  'common.cancel': 'Kanselleer',

  'tab.home': 'Tuis',
  'tab.meds': 'Medikasie',
  'tab.history': 'Geskiedenis',
  'tab.community': 'Gemeenskap',
  'tab.profile': 'Profiel',

  'greeting.morning': 'Goeie môre',
  'greeting.afternoon': 'Goeie middag',
  'greeting.evening': 'Goeie naand',
  'greeting.there': 'daar',

  'day.monday': 'Maandag',
  'day.sunday': 'Sondag',
  'day.saturday': 'Saterdag',

  'settings.title': 'Instellings',
  'settings.subtitle': 'Personaliseer MedTrack',
  'settings.loading': 'Laai tans instellings...',
  'settings.heroTitle': 'Jou voorkeure',
  'settings.heroText': 'Beheer hoe MedTrack jou herinner en hoe die toepassing werk.',
  'settings.retry': 'Probeer weer',

  'settings.remindersTitle': 'Medikasie-herinnerings',
  'settings.remindersDesc':
    'Kies oor watter medikasie-gebeure MedTrack jou in kennis moet stel.',
  'settings.doseReminders': 'Dosis-herinnerings',
  'settings.doseRemindersSub':
    'Ontvang herinnerings wanneer dit tyd is om geskeduleerde medikasie te neem.',
  'settings.missedAlerts': 'Gemiste-dosis-waarskuwings',
  'settings.missedAlertsSub':
    'Ontvang \u2019n waarskuwing wanneer \u2019n geskeduleerde dosis nie aangeteken is nie.',
  'settings.refillAlerts': 'Hervullingswaarskuwings',
  'settings.refillAlertsSub':
    'Kry \u2019n kennisgewing wanneer jou oorblywende medikasievoorraad laag raak.',
  'settings.sound': 'Herinneringsgeluid',
  'settings.soundSub': 'Laat MedTrack-medikasieherinnerings toe om klank te gebruik.',
  'settings.vibration': 'Vibrasie',
  'settings.vibrationSub': 'Gebruik vibrasie saam met medikasieherinneringswaarskuwings.',
  'settings.testReminder': 'Stuur \u2019n toetsherinnering',
  'settings.testReminderSub':
    'Lui oor ongeveer 5 sekondes sodat jy kan bevestig dat klank en vibrasie werk.',
  'settings.refreshReminders': 'Verfris my herinnerings',
  'settings.refreshRemindersSub':
    'Herbou alle medikasieherinnerings op hierdie foon vanaf jou gestoorde skedule.',
  'settings.alertBehaviour': 'Waarskuwinggedrag',
  'settings.safetyTitle': 'Medikasieveiligheid',
  'settings.safetyText':
    'MedTrack help jou om jou medikasieroetine op te spoor. Volg altyd die instruksies van jou gesondheidsorgpraktisyn of die medikasie-etiket.',

  'settings.appPrefs': 'Toepassingvoorkeure',
  'settings.appearance': 'Voorkoms',
  'settings.appearanceSub': 'Kies hoe MedTrack op jou toestel lyk.',
  'settings.appearanceLight': 'Lig',
  'settings.language': 'Taal',
  'settings.languageSub': 'Kies jou voorkeurtaal vir MedTrack.',
  'settings.weekStart': 'Week begin op',
  'settings.weekStartSub': 'Kies die eerste dag wat in kalenders en verslae gewys word.',
  'settings.chooseLanguage': 'Kies taal',
  'settings.chooseWeekStart': 'Kies die eerste dag van die week',

  'settings.privacySection': 'Privaatheid en sekuriteit',
  'settings.accountSecurity': 'Rekeningsekuriteit',
  'settings.accountSecuritySub': 'Bestuur jou wagwoord en rekeningsekuriteit.',
  'settings.healthPrivacy': 'Gesondheidsdata-privaatheid',
  'settings.healthPrivacySub':
    'Hersien hoe jou medikasie- en gesondheidsinligting hanteer word.',
  'settings.caregiver': 'Versorgertoestemmings',
  'settings.caregiverSub':
    'Beheer wie toegang het tot medikasie-inligting wat jy uitdruklik deel.',

  'settings.aboutSection': 'Oor',
  'settings.help': 'Hulp en ondersteuning',
  'settings.helpSub': 'Kry hulp met MedTrack-kenmerke en jou rekening.',
  'settings.aboutApp': 'Oor MedTrack',
  'settings.aboutAppSub': 'Medikasie-opsporing en gesondheidsmaat.',
};

export const translations = { en, zu, af };

// Looks up a key in the chosen language, falls back to English, then to
// the key itself so a missing translation never crashes or shows blank.
// Supports {placeholders}: translate('en', 'x', { count: 3 }).
export function translate(language, key, params) {
  const dictionary = translations[language] ?? translations.en;

  let text = dictionary[key] ?? translations.en[key] ?? key;

  if (params) {
    Object.keys(params).forEach((name) => {
      text = text.split(`{${name}}`).join(String(params[name]));
    });
  }

  return text;
}