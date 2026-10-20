// Complete localized string dictionaries for English, Hindi (हिन्दी), and Nepali (नेपाली)
// Matching PRD Section 7, 8, 9

export type LanguageCode = 'en' | 'hi' | 'ne';

export interface Translations {
  appName: string;
  appSubtitle: string;
  tabs: {
    home: string;
    map: string;
    profile: string;
  };
  auth: {
    title: string;
    subtitle: string;
    countryLabel: string;
    phoneLabel: string;
    sendCode: string;
    smsNote: string;
    codeTitle: string;
    codeSentTo: string;
    verify: string;
    resendIn: string;
    resend: string;
    changeNumber: string;
    languageLabel: string;
    devCode: string;
    errPhone: string;
    errNetwork: string;
    errWrong: string;
    errExpired: string;
    errLocked: string;
    errWait: string;
    errLimit: string;
    errSms: string;
    errGeneric: string;
    sending: string;
    verifying: string;
    india: string;
    nepal: string;
  };
  alertLevels: {
    clear: string;
    watch: string;
    warning: string;
    evacuate: string;
  };
  home: {
    clearTitle: string;
    clearSubtitle: string;
    watchTitle: string;
    watchSubtitle: string;
    warningTitle: string;
    warningSubtitle: string;
    evacuateTitle: string;
    evacuateSubtitle: string;
    basinHydrology: string;
    expandBasinMap: string;
    youLocation: string;
    lakeDistance: string;
    recentLakeActivity: string;
    seeAll: string;
    preparednessTitle: string;
    pathFamiliarityTitle: string;
    pathFamiliarityDesc: string;
    vhfRadioTitle: string;
    vhfRadioDesc: string;
    reviewSafeGround: string;
    openEvacuationMap: string;
    sendSos: string;
    cachedGuidanceNotice: string;
    immediateSequence: string;
    actionsRequired: string;
    step1Title: string;
    step1Desc: string;
    step2Title: string;
    step2Desc: string;
    step3Title: string;
    step3Desc: string;
    authorityBroadcast: string;
    authorityCode: string;
  };
  map: {
    evacuateMode: string;
    navigateMode: string;
    forMe: string;
    forSomeoneElse: string;
    legend: string;
    yourPosition: string;
    safeRoute: string;
    hazardBasin: string;
    highGroundShelter: string;
    floodWaveBuffer: string;
    bufferTime: string;
    shelterDossier: string;
    elevationGain: string;
    walkingTime: string;
    capacity: string;
    gradient: string;
    startGpsRoute: string;
    emergencyCall: string;
    hazardAvoidanceActive: string;
    avoidanceExplanation: string;
    searchPlaceholder: string;
  };
  profile: {
    resident: string;
    languageTitle: string;
    languageSubtitle: string;
    languageNotice: string;
    sosContactsTitle: string;
    sosContactsSubtitle: string;
    activeContactsCount: string;
    addContact: string;
    preferencesTitle: string;
    offlineMapsTitle: string;
    offlineMapsStatus: string;
    updateMaps: string;
    smsFallbackTitle: string;
    smsFallbackStatus: string;
    telemetryTitle: string;
    telemetrySubtitle: string;
    liveStationsCount: string;
    signOut: string;
    privacyNotice: string;
  };
  sos: {
    dialogTitle: string;
    countdownSubtitle: string;
    cancelButton: string;
    broadcastingTitle: string;
    dispatchedNotice: string;
    doneButton: string;
  };
}

export const TRANSLATIONS: Record<LanguageCode, Translations> = {
  en: {
    appName: 'Avalon',
    appSubtitle: 'Early Warning',
    tabs: {
      home: 'Home',
      map: 'Map',
      profile: 'Profile',
    },
    auth: {
      title: 'Sign in to Raha',
      subtitle: 'Early warnings for glacial lake floods, in your language.',
      countryLabel: 'Country',
      phoneLabel: 'Mobile number',
      sendCode: 'Send code',
      smsNote: 'We will send a one-time code by SMS. Your number is used only to sign you in.',
      codeTitle: 'Enter the 6-digit code',
      codeSentTo: 'We sent a code to',
      verify: 'Continue',
      resendIn: 'Send a new code in',
      resend: 'Send a new code',
      changeNumber: 'Use a different number',
      languageLabel: 'Language',
      devCode: 'Development code (tap to fill)',
      errPhone: 'Enter a valid mobile number.',
      errNetwork: 'Cannot reach the server. Check your connection and try again.',
      errWrong: 'That code is not right. Check it and try again.',
      errExpired: 'That code has expired. Ask for a new one.',
      errLocked: 'Too many wrong tries. Ask for a new code.',
      errWait: 'Please wait a little before asking for another code.',
      errLimit: 'Too many codes requested. Try again later.',
      errSms: 'Text messages are not available right now. Try again later.',
      errGeneric: 'Something went wrong. Please try again.',
      sending: 'Sending…',
      verifying: 'Checking…',
      india: 'India',
      nepal: 'Nepal',
    },
    alertLevels: {
      clear: 'Clear',
      watch: 'Watch',
      warning: 'Warning',
      evacuate: 'Evacuate',
    },
    home: {
      clearTitle: 'No threat near you.',
      clearSubtitle: 'All monitored glacial lakes are stable.',
      watchTitle: 'Watch: Elevated lake inflow detected.',
      watchSubtitle: 'A risk factor is trending the wrong way.',
      warningTitle: 'Warning: Elevated outburst risk.',
      warningSubtitle: 'Prepare to leave. Review your evacuation route.',
      evacuateTitle: 'Leave now. Move to higher ground.',
      evacuateSubtitle: 'A flood may reach you in about 2 to 4 hours.',
      basinHydrology: 'Basin Hydrology View',
      expandBasinMap: 'Expand basin map',
      youLocation: 'You • Chungthang (1,790m)',
      lakeDistance: 'Lake dist: ~55 km',
      recentLakeActivity: 'Recent lake activity',
      seeAll: 'See all',
      preparednessTitle: 'Monsoon & Valley Preparedness',
      pathFamiliarityTitle: 'Path familiarity',
      pathFamiliarityDesc: 'Confirm designated ridge trails before nightfall',
      vhfRadioTitle: 'Community VHF Radio',
      vhfRadioDesc: 'Channel 07 • 146.520 MHz monitored 24/7',
      reviewSafeGround: 'Review Safe Ground Dossier',
      openEvacuationMap: 'Open evacuation map',
      sendSos: 'Send SOS to emergency contacts',
      cachedGuidanceNotice: 'Offline cached guidance valid for Teesta Valley',
      immediateSequence: 'Immediate Sequence',
      actionsRequired: '3 Actions Required',
      step1Title: 'Grab go-bag and government ID',
      step1Desc: 'Prescription meds, emergency whistle, and identification papers.',
      step2Title: 'Move immediately to the ridge line towards Chungthang Monastery Ridge (+180m)',
      step2Desc: 'Follow teal physical pathway markings. Avoid lingering on secondary trails.',
      step3Title: 'Avoid valley floor and riverbed crossings',
      step3Desc: 'High sediment surge expected within the first 120 minutes. Do not cross bridges.',
      authorityBroadcast: 'Flash flood alert dispatched by Dept of Hydrology & Meteorology',
      authorityCode: 'Authority Broadcast Code: NEP-GLOF-ZONE4 • Active Frequency 148.5 MHz',
    },
    map: {
      evacuateMode: 'Evacuate',
      navigateMode: 'Navigate',
      forMe: 'For me',
      forSomeoneElse: 'For Meena',
      legend: 'Legend',
      yourPosition: 'Your Position (2,680m)',
      safeRoute: 'Safe Route (Uphill)',
      hazardBasin: 'Hazard Basin (GLOF)',
      highGroundShelter: 'High Ground Shelter',
      floodWaveBuffer: 'Flood wave buffer: about 2 to 4 hours',
      bufferTime: 'about 2 to 4 hours',
      shelterDossier: 'Shelter Dossier',
      elevationGain: '+210m Up-Slope',
      walkingTime: '42 min walk uphill',
      capacity: 'Normal (46%)',
      gradient: '14% Uphill',
      startGpsRoute: 'Start Safe Ridge Guidance',
      emergencyCall: 'Call Medical Station',
      hazardAvoidanceActive: 'Hazard Avoidance Active',
      avoidanceExplanation: 'Auto-routed via East Ridge to avoid flood surge corridor.',
      searchPlaceholder: 'Search high-altitude destination...',
    },
    profile: {
      resident: 'Resident',
      languageTitle: 'Interface Language',
      languageSubtitle: 'Multi-basin sync',
      languageNotice: 'Urgent broadcast advisories and evacuation notices will adopt your selected language format.',
      sosContactsTitle: 'SOS Emergency Contacts',
      sosContactsSubtitle: 'Designated kin receive instant satellite distress pinpoints if lake waterlines breach trigger thresholds.',
      activeContactsCount: 'Active',
      addContact: 'Add emergency contact',
      preferencesTitle: 'System & Safety Preferences',
      offlineMapsTitle: 'Offline valley maps & cached routes',
      offlineMapsStatus: 'Downloaded • 48 MB stored',
      updateMaps: 'Update',
      smsFallbackTitle: 'Low-bandwidth SMS fallback alerts',
      smsFallbackStatus: 'Auto-failsafe when cellular 3G drops • Enabled',
      telemetryTitle: 'Himalayan Telemetry Stations',
      telemetrySubtitle: 'Direct acoustic sensor radar relays',
      liveStationsCount: '3 Live',
      signOut: 'Sign out',
      privacyNotice: 'Compliant with DPDP Act 2023 & Indian disaster governance framework.',
    },
    sos: {
      dialogTitle: 'Emergency SOS Trigger',
      countdownSubtitle: 'Broadcasting live location to SOS contacts in',
      cancelButton: 'Cancel Broadcast',
      broadcastingTitle: 'Dispatched to Contacts & DHM',
      dispatchedNotice: 'Your precise altitude and distress coordinates have been transmitted via SMS & satellite relay.',
      doneButton: 'Close',
    },
  },
  hi: {
    appName: 'एवलॉन',
    appSubtitle: 'ग्लेशियल पूर्व चेतावनी',
    tabs: {
      home: 'होम',
      map: 'नक्शा',
      profile: 'प्रोफाइल',
    },
    auth: {
      title: 'Raha में साइन इन करें',
      subtitle: 'हिमनद झील बाढ़ की पूर्व चेतावनी, आपकी भाषा में।',
      countryLabel: 'देश',
      phoneLabel: 'मोबाइल नंबर',
      sendCode: 'कोड भेजें',
      smsNote: 'हम SMS से एक बार का कोड भेजेंगे। आपका नंबर केवल साइन इन के लिए इस्तेमाल होता है।',
      codeTitle: '6 अंकों का कोड डालें',
      codeSentTo: 'हमने कोड भेजा है',
      verify: 'आगे बढ़ें',
      resendIn: 'नया कोड भेजें',
      resend: 'नया कोड भेजें',
      changeNumber: 'दूसरा नंबर इस्तेमाल करें',
      languageLabel: 'भाषा',
      devCode: 'डेवलपमेंट कोड (भरने के लिए दबाएँ)',
      errPhone: 'सही मोबाइल नंबर डालें।',
      errNetwork: 'सर्वर से संपर्क नहीं हो पा रहा। अपना कनेक्शन जाँचें और फिर कोशिश करें।',
      errWrong: 'यह कोड सही नहीं है। जाँचकर फिर कोशिश करें।',
      errExpired: 'इस कोड की समय सीमा खत्म हो गई। नया कोड माँगें।',
      errLocked: 'बहुत ज़्यादा गलत कोशिशें। नया कोड माँगें।',
      errWait: 'दूसरा कोड माँगने से पहले थोड़ा रुकें।',
      errLimit: 'बहुत ज़्यादा कोड माँगे गए। बाद में कोशिश करें।',
      errSms: 'अभी SMS उपलब्ध नहीं है। बाद में कोशिश करें।',
      errGeneric: 'कुछ गड़बड़ हुई। कृपया फिर कोशिश करें।',
      sending: 'भेज रहे हैं…',
      verifying: 'जाँच रहे हैं…',
      india: 'भारत',
      nepal: 'नेपाल',
    },
    alertLevels: {
      clear: 'सुरक्षित',
      watch: 'निगरानी',
      warning: 'चेतावनी',
      evacuate: 'तुरंत खाली करें',
    },
    home: {
      clearTitle: 'आपके आसपास कोई खतरा नहीं है।',
      clearSubtitle: 'सभी हिमनद झीलें सामान्य स्थिति में हैं।',
      watchTitle: 'निगरानी: झील के जलस्तर में असामान्य वृद्धि।',
      watchSubtitle: 'जोखिम का संकेत बढ़ रहा है। सतर्क रहें।',
      warningTitle: 'चेतावनी: झील फटने का उच्च जोखिम।',
      warningSubtitle: 'निकलने की तैयारी करें। सुरक्षित मार्ग जांचें।',
      evacuateTitle: 'तुरंत निकलें। ऊंचे स्थान पर जाएं।',
      evacuateSubtitle: 'बाढ़ का पानी लगभग 2 से 4 घंटे में आप तक पहुंच सकता है।',
      basinHydrology: 'घाटी जल विज्ञान दृश्य',
      expandBasinMap: 'पूरा नक्शा देखें',
      youLocation: 'आप • डिंगबोचे (4,410 मी)',
      lakeDistance: 'झील की दूरी: ~55 किमी',
      recentLakeActivity: 'हालिया झील गतिविधियां',
      seeAll: 'सभी देखें',
      preparednessTitle: 'मानसून और घाटी सुरक्षा तैयारी',
      pathFamiliarityTitle: 'रास्ते की पहचान',
      pathFamiliarityDesc: 'रात होने से पहले ऊंचाई वाले रास्तों की पुष्टि करें',
      vhfRadioTitle: 'सामुदायिक वीएचएफ रेडियो',
      vhfRadioDesc: 'चैनल 07 • 146.520 मेगाहर्ट्ज पर 24 घंटे निगरानी',
      reviewSafeGround: 'सुरक्षित आश्रय स्थल देखें',
      openEvacuationMap: 'निकासी नक्शा खोलें',
      sendSos: 'आपातकालीन संपर्कों को SOS भेजें',
      cachedGuidanceNotice: 'तीस्ता घाटी के लिए ऑफलाइन सहेजी गई जानकारी',
      immediateSequence: 'तत्काल आवश्यक कदम',
      actionsRequired: '3 आवश्यक कदम',
      step1Title: 'जरूरी बैग और सरकारी पहचान पत्र लें',
      step1Desc: 'दवाएं, सीटी और पहचान पत्र साथ रखें।',
      step2Title: 'तुरंत चुंगथांग मठ की ऊँची पहाड़ी (+180 मी) की तरफ जाएं',
      step2Desc: 'हरे सुरक्षित रास्ते का पालन करें। घाटी में न रुकें।',
      step3Title: 'नदी तल और पुलों को पार करने से बचें',
      step3Desc: 'शुरुआती 120 मिनट में तेज बहाव आने की आशंका है।',
      authorityBroadcast: 'जल विज्ञान एवं मौसम विज्ञान विभाग द्वारा चेतावनी जारी',
      authorityCode: 'प्रसारण कोड: NEP-GLOF-ZONE4 • आवृत्ति 148.5 MHz',
    },
    map: {
      evacuateMode: 'निकासी',
      navigateMode: 'नेविगेट',
      forMe: 'मेरे लिए',
      forSomeoneElse: 'मीना के लिए',
      legend: 'संकेत सूची',
      yourPosition: 'आपकी स्थिति (2,680 मी)',
      safeRoute: 'सुरक्षित मार्ग (ऊंचाई की ओर)',
      hazardBasin: 'बाढ़ जोखिम क्षेत्र (GLOF)',
      highGroundShelter: 'ऊंचाई पर सुरक्षित आश्रय',
      floodWaveBuffer: 'बाढ़ पहुंचने का अनुमान: लगभग 2 से 4 घंटे',
      bufferTime: 'लगभग 2 से 4 घंटे',
      shelterDossier: 'आश्रय विवरण',
      elevationGain: '+210 मी ऊंचाई',
      walkingTime: '42 मिनट पैदल चढ़ाई',
      capacity: 'सामान्य (46%)',
      gradient: '14% चढ़ाई',
      startGpsRoute: 'सुरक्षित मार्ग शुरू करें',
      emergencyCall: 'मेडिकल पोस्ट पर कॉल करें',
      hazardAvoidanceActive: 'जोखिम परिहार सक्रिय',
      avoidanceExplanation: 'बाढ़ क्षेत्र से बचने के लिए पूर्वी रिज मार्ग चुना गया।',
      searchPlaceholder: 'ऊंचाई वाले गंतव्य की खोज करें...',
    },
    profile: {
      resident: 'निवासी',
      languageTitle: 'इंटरफ़ेस भाषा',
      languageSubtitle: 'बहुभाषी सिंक',
      languageNotice: 'आपातकालीन प्रसारण और निकासी सूचनाएं आपकी चुनी हुई भाषा में प्रदर्शित होंगी।',
      sosContactsTitle: 'SOS आपातकालीन संपर्क',
      sosContactsSubtitle: 'झील का जलस्तर बढ़ने पर परिजनों को सैटेलाइट के जरिए आपकी सटीक स्थिति भेजी जाएगी।',
      activeContactsCount: 'सक्रिय',
      addContact: 'आपातकालीन संपर्क जोड़ें',
      preferencesTitle: 'सिस्टम और सुरक्षा प्राथमिकताएं',
      offlineMapsTitle: 'ऑफलाइन घाटी नक्शे और मार्ग',
      offlineMapsStatus: 'डाउनलोड पूर्ण • 48 एमबी सुरक्षित',
      updateMaps: 'अपडेट करें',
      smsFallbackTitle: 'कम-बैंडविड्थ SMS बैकअप अलर्ट',
      smsFallbackStatus: 'नेटवर्क गिरने पर स्वचालित SMS • सक्रिय',
      telemetryTitle: 'हिमालयन टेलीमेट्री स्टेशन',
      telemetrySubtitle: 'ध्वनिक रडार एवं उपग्रह रिले',
      liveStationsCount: '3 ऑनलाइन',
      signOut: 'लॉग आउट',
      privacyNotice: 'डीपीडीपी अधिनियम 2023 और आपदा नियमों के अनुरूप।',
    },
    sos: {
      dialogTitle: 'आपातकालीन SOS सक्रिय',
      countdownSubtitle: 'संपर्कों को लाइव स्थान भेजा जा रहा है:',
      cancelButton: 'प्रसारण रद्द करें',
      broadcastingTitle: 'संपर्कों और आपदा केंद्र को भेजा गया',
      dispatchedNotice: 'आपकी सटीक ऊंचाई और स्थिति SMS और सैटेलाइट के माध्यम से प्रेषित कर दी गई है।',
      doneButton: 'समाप्त',
    },
  },
  ne: {
    appName: 'एभालोन',
    appSubtitle: 'हिमताल पूर्वसूचना',
    tabs: {
      home: 'गृह',
      map: 'नक्सा',
      profile: 'प्रोफाइल',
    },
    auth: {
      title: 'Raha मा साइन इन गर्नुहोस्',
      subtitle: 'हिमनदी ताल बाढीको पूर्व चेतावनी, तपाईंको भाषामा।',
      countryLabel: 'देश',
      phoneLabel: 'मोबाइल नम्बर',
      sendCode: 'कोड पठाउनुहोस्',
      smsNote: 'हामी SMS बाट एक पटकको कोड पठाउँछौं। तपाईंको नम्बर साइन इनका लागि मात्र प्रयोग हुन्छ।',
      codeTitle: '६ अङ्कको कोड हाल्नुहोस्',
      codeSentTo: 'हामीले कोड पठायौं',
      verify: 'अगाडि बढ्नुहोस्',
      resendIn: 'नयाँ कोड पठाउनुहोस्',
      resend: 'नयाँ कोड पठाउनुहोस्',
      changeNumber: 'अर्को नम्बर प्रयोग गर्नुहोस्',
      languageLabel: 'भाषा',
      devCode: 'डेभलपमेन्ट कोड (भर्न थिच्नुहोस्)',
      errPhone: 'सही मोबाइल नम्बर हाल्नुहोस्।',
      errNetwork: 'सर्भरसँग सम्पर्क हुन सकेन। इन्टरनेट जाँचेर फेरि प्रयास गर्नुहोस्।',
      errWrong: 'यो कोड सही छैन। जाँचेर फेरि प्रयास गर्नुहोस्।',
      errExpired: 'यो कोडको समय सकियो। नयाँ कोड माग्नुहोस्।',
      errLocked: 'धेरै गलत प्रयास भए। नयाँ कोड माग्नुहोस्।',
      errWait: 'अर्को कोड माग्नु अघि केही बेर पर्खनुहोस्।',
      errLimit: 'धेरै कोड मागियो। पछि प्रयास गर्नुहोस्।',
      errSms: 'अहिले SMS उपलब्ध छैन। पछि प्रयास गर्नुहोस्।',
      errGeneric: 'केही गडबड भयो। कृपया फेरि प्रयास गर्नुहोस्।',
      sending: 'पठाउँदै…',
      verifying: 'जाँच्दै…',
      india: 'भारत',
      nepal: 'नेपाल',
    },
    alertLevels: {
      clear: 'सुरक्षित',
      watch: 'निगरानी',
      warning: 'चेतावनी',
      evacuate: 'तत्काल खाली गर्नुहोस्',
    },
    home: {
      clearTitle: 'तपाईं नजिक कुनै खतरा छैन।',
      clearSubtitle: 'सबै हिमतालहरू सामान्य अवस्थामा छन्।',
      watchTitle: 'निगरानी: तालको पानीको बहावमा वृद्धि।',
      watchSubtitle: 'जोखिमको संकेत बढेको छ। सतर्क रहनुहोस्।',
      warningTitle: 'चेतावनी: ताल फुट्ने उच्च जोखिम।',
      warningSubtitle: 'स्थान छोड्न तयार हुनुहोस्। सुरक्षित बाटो जाँच्नुहोस्।',
      evacuateTitle: 'तत्काल निस्कनुहोस्। उच्च स्थानमा जानुहोस्।',
      evacuateSubtitle: 'बाढी लगभग २ देखि ४ घण्टामा तपाईं पुग्न सक्छ।',
      basinHydrology: 'नदी उपत्यका जलप्रणाली',
      expandBasinMap: 'पूरा नक्सा खोल्नुहोस्',
      youLocation: 'तपाईं • चुङथाङ (१,७९० मि)',
      lakeDistance: 'तालको दुरी: ~५५ किमी',
      recentLakeActivity: 'हालैको ताल गतिविधि',
      seeAll: 'सबै हेर्नुहोस्',
      preparednessTitle: 'वर्षायाम तथा उपत्यका पूर्वतयारी',
      pathFamiliarityTitle: 'बाटोको जानकारी',
      pathFamiliarityDesc: 'साँझ पर्नुअघि अग्लो सुरक्षित डाँडाको बाटो यकिन गर्नुहोस्',
      vhfRadioTitle: 'सामुदायिक VHF रेडियो',
      vhfRadioDesc: 'च्यानल ०७ • १४६.५२० मेगाहर्ज २४ घण्टा चालु',
      reviewSafeGround: 'सुरक्षित आश्रयस्थल हेर्नुहोस्',
      openEvacuationMap: 'सुरक्षित नक्सा खोल्नुहोस्',
      sendSos: 'आपतकालीन सम्पर्कहरूलाई SOS पठाउनुहोस्',
      cachedGuidanceNotice: 'तिस्ता उपत्यकाको लागि अफलाइन सुरक्षित मार्ग',
      immediateSequence: 'तत्काल चाल्नुपर्ने कदमहरू',
      actionsRequired: '३ मुख्य कदम',
      step1Title: 'आवश्यक झोला र परिचयपत्र लिनुहोस्',
      step1Desc: 'औषधी, आपतकालीन सिट्टी र परिचयपत्र साथमा राख्नुहोस्।',
      step2Title: 'तत्काल चुङथाङ गुम्बाको उच्च भूभागतर्फ उकालो लाग्नुहोस् (+१८० मि)',
      step2Desc: 'हरियो सुरक्षित डोब पछ्याउनुहोस्। उपत्यकामा नअल्झिनुहोस्।',
      step3Title: 'नदीको किनार र पुल तर्नबाट बच्नुहोस्',
      step3Desc: 'पहिलो १२० मिनेटमा भीषण बाढी आउन सक्ने सम्भावना छ।',
      authorityBroadcast: 'जल तथा मौसम विज्ञान विभागद्वारा बाढी सूचना जारी',
      authorityCode: 'प्रसारण कोड: NEP-GLOF-ZONE4 • फ्रिक्वेन्सी १४८.५ MHz',
    },
    map: {
      evacuateMode: 'निकासी',
      navigateMode: 'नेभिगेट',
      forMe: 'मेरो लागि',
      forSomeoneElse: 'मीनाको लागि',
      legend: 'संकेतहरू',
      yourPosition: 'तपाईंको स्थान (२,६८० मि)',
      safeRoute: 'सुरक्षित बाटो (उकालो)',
      hazardBasin: 'बाढी जोखिम क्षेत्र (GLOF)',
      highGroundShelter: 'अग्लो सुरक्षित आश्रय',
      floodWaveBuffer: 'बाढीको गति: लगभग २ देखि ४ घण्टा',
      bufferTime: 'लगभग २ देखि ४ घण्टा',
      shelterDossier: 'आश्रयस्थल विवरण',
      elevationGain: '+२१० मि उचाइ',
      walkingTime: '४२ मिनेट उकालो हिँडाइ',
      capacity: 'सामान्य (४६%)',
      gradient: '१४% उकालो',
      startGpsRoute: 'सुरक्षित मार्ग सुरु गर्नुहोस्',
      emergencyCall: 'स्वास्थ्य चौकीमा फोन गर्नुहोस्',
      hazardAvoidanceActive: 'जोखिम छल्ने मार्ग चालु',
      avoidanceExplanation: 'बाढी क्षेत्रबाट बच्न पूर्वी डाँडाको बाटो तय गरियो।',
      searchPlaceholder: 'गन्तव्य खोज्नुहोस्...',
    },
    profile: {
      resident: 'स्थानीय बासिन्दा',
      languageTitle: 'भाषा छनौट',
      languageSubtitle: 'बहु-क्षेत्रीय सिंक',
      languageNotice: 'आपतकालीन सूचना र निकासी निर्देशनहरू तपाईंले रोज्नुभएको भाषामा आउनेछन्।',
      sosContactsTitle: 'SOS आपतकालीन सम्पर्कहरू',
      sosContactsSubtitle: 'तालको जलस्तर बढेमा आफन्तहरूलाई स्याटेलाइटमार्फत तपाईंको सटीक स्थान पठाइनेछ।',
      activeContactsCount: 'सक्रिय',
      addContact: 'आपतकालीन सम्पर्क थप्नुहोस्',
      preferencesTitle: 'प्रणाली तथा सुरक्षा सेटिङ',
      offlineMapsTitle: 'अफलाइन नक्सा तथा मार्गहरू',
      offlineMapsStatus: 'डाउनलोड सकियो • ४८ MB सङ्कलित',
      updateMaps: 'अपडेट गर्नुहोस्',
      smsFallbackTitle: 'कम-ब्यान्डविथ SMS ब्याकअप',
      smsFallbackStatus: 'इन्टरनेट नहुँदा SMS अलर्ट • चालु',
      telemetryTitle: 'हिमाली सेन्सर स्टेसनहरू',
      telemetrySubtitle: 'प्रत्यक्ष ध्वनिक रडार रिले',
      liveStationsCount: '३ चालु',
      signOut: 'बाहिरिनुहोस्',
      privacyNotice: 'विपद् व्यवस्थापन ऐन तथा गोपनीयता निर्देशिका बमोजिम।',
    },
    sos: {
      dialogTitle: 'आपतकालीन SOS सुरु',
      countdownSubtitle: 'सम्पर्कहरूलाई स्थान पठाउन बाँकी समय:',
      cancelButton: 'रद्द गर्नुहोस्',
      broadcastingTitle: 'सम्पर्कहरू तथा केन्द्रमा पठाइयो',
      dispatchedNotice: 'तपाईंको उचाइ र स्थानको जानकारी SMS र स्याटेलाइटबाट पठाइसकिएको छ।',
      doneButton: 'बन्द गर्नुहोस्',
    },
  },
};
