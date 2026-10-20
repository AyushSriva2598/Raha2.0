import type { LanguageCode } from '@/i18n/translations';

// DRAFT CONTENT: plain-language GLOF guidance written for layout and review.
// Must be verified by a disaster-management expert (and Hindi/Nepali by native
// speakers) before release. Do not present as official authority guidance.
export const SAFETY_TIPS_ARE_DRAFT = true;

export type SafetyTopicId = 'prepare' | 'firstAid' | 'rescue' | 'help';

export interface SafetyTopic {
  id: SafetyTopicId;
  title: string;
  summary: string;
  tips: string[];
}

export const SAFETY_SCREEN_COPY: Record<
  LanguageCode,
  { title: string; subtitle: string; draftNotice: string; searchPlaceholder: string; noResults: string }
> = {
  en: {
    title: 'Safety Tips',
    subtitle: 'Simple steps to keep you and your family ready before a glacial lake flood.',
    draftNotice: 'Draft guidance. Follow instructions from local authorities first.',
    searchPlaceholder: 'Search safety tips',
    noResults: 'No tips match your search.',
  },
  hi: {
    title: 'सुरक्षा सुझाव',
    subtitle: 'हिमनद झील बाढ़ से पहले आपको और आपके परिवार को तैयार रखने के आसान कदम।',
    draftNotice: 'यह मसौदा मार्गदर्शन है। पहले स्थानीय अधिकारियों के निर्देश मानें।',
    searchPlaceholder: 'सुरक्षा सुझाव खोजें',
    noResults: 'कोई सुझाव नहीं मिला।',
  },
  ne: {
    title: 'सुरक्षा सुझाव',
    subtitle: 'हिमनदी ताल बाढी अघि तपाईं र परिवारलाई तयार राख्ने सजिला उपाय।',
    draftNotice: 'यो मस्यौदा मार्गदर्शन हो। पहिले स्थानीय अधिकारीको निर्देशन पालना गर्नुहोस्।',
    searchPlaceholder: 'सुरक्षा सुझाव खोज्नुहोस्',
    noResults: 'कुनै सुझाव भेटिएन।',
  },
};

export const SAFETY_TOPICS: Record<LanguageCode, SafetyTopic[]> = {
  en: [
    {
      id: 'prepare',
      title: 'Flood Preparedness',
      summary: 'Know your route and keep a go-bag ready.',
      tips: [
        'Learn the route to the nearest high-ground shelter and walk it once.',
        'Keep a go-bag: ID papers, medicines, torch, whistle, water and dry food.',
        'Agree a meeting point with your family above the valley floor.',
        'Keep your phone charged and save emergency contacts in the app.',
        'Download the offline map for your valley while you have a connection.',
        'Never wait to see the water. Leave when the app says Evacuate.',
      ],
    },
    {
      id: 'firstAid',
      title: 'First Aid Tips',
      summary: 'Basic steps while you wait for help.',
      tips: [
        'Check that the area is safe before you help anyone.',
        'Stop heavy bleeding by pressing firmly on the wound with clean cloth.',
        'Keep a cold or wet person warm with dry clothes and blankets.',
        'Do not move someone with a suspected neck or back injury unless in danger.',
        'If a person is not breathing, call for help and start CPR if you are trained.',
        'Give small sips of clean water only to people who are awake.',
      ],
    },
    {
      id: 'rescue',
      title: 'Help and Rescue',
      summary: 'How to reach rescue teams and stay findable.',
      tips: [
        'Press and hold SOS for 3 seconds to alert your emergency contacts.',
        'Stay on high ground and do not cross rivers or damaged bridges.',
        'Use a whistle (three short blasts) or bright cloth to signal rescuers.',
        'Share your location with family and keep your phone on battery saver.',
        'Tell rescuers about anyone who is missing, injured or cannot walk.',
      ],
    },
    {
      id: 'help',
      title: 'Help Others Too',
      summary: 'Look out for neighbours who may need extra help.',
      tips: [
        'Check on elderly neighbours, children and people with disabilities.',
        'Share the alert with households that may not have a smartphone.',
        'Walk with a group and keep to marked high-ground trails.',
        'Share only confirmed information and avoid spreading rumours.',
        'Stay calm and speak clearly so others can follow you.',
      ],
    },
  ],
  hi: [
    {
      id: 'prepare',
      title: 'बाढ़ की तैयारी',
      summary: 'अपना रास्ता जानें और आपातकालीन बैग तैयार रखें।',
      tips: [
        'निकटतम ऊँचे आश्रय तक का रास्ता सीखें और एक बार उस पर चलकर देखें।',
        'बैग तैयार रखें: पहचान पत्र, दवाइयाँ, टॉर्च, सीटी, पानी और सूखा खाना।',
        'परिवार के साथ घाटी के तल से ऊपर मिलने की जगह तय करें।',
        'फ़ोन चार्ज रखें और ऐप में आपातकालीन संपर्क सहेजें।',
        'इंटरनेट होने पर अपनी घाटी का ऑफ़लाइन मैप डाउनलोड करें।',
        'पानी दिखने का इंतज़ार न करें। ऐप "निकलें" कहे तो तुरंत निकलें।',
      ],
    },
    {
      id: 'firstAid',
      title: 'प्राथमिक उपचार',
      summary: 'मदद आने तक के बुनियादी कदम।',
      tips: [
        'किसी की मदद से पहले देखें कि जगह सुरक्षित है।',
        'तेज़ खून बहने पर साफ़ कपड़े से घाव को कसकर दबाएँ।',
        'ठंडे या भीगे व्यक्ति को सूखे कपड़े और कंबल से गर्म रखें।',
        'गर्दन या पीठ की चोट का शक हो तो खतरा न होने पर हिलाएँ नहीं।',
        'साँस न चल रही हो तो मदद बुलाएँ और प्रशिक्षित हैं तो CPR दें।',
        'केवल होश में रहने वाले को साफ़ पानी के छोटे घूँट दें।',
      ],
    },
    {
      id: 'rescue',
      title: 'सहायता और बचाव',
      summary: 'बचाव दल तक कैसे पहुँचें और कैसे मिलें।',
      tips: [
        'आपातकालीन संपर्कों को सूचित करने के लिए SOS को 3 सेकंड दबाए रखें।',
        'ऊँची जगह पर रहें और नदी या क्षतिग्रस्त पुल पार न करें।',
        'बचावकर्मियों को संकेत देने के लिए सीटी (तीन छोटी) या चमकीला कपड़ा इस्तेमाल करें।',
        'परिवार को अपनी लोकेशन भेजें और फ़ोन को बैटरी सेवर पर रखें।',
        'लापता, घायल या न चल सकने वाले लोगों के बारे में बचावकर्मियों को बताएँ।',
      ],
    },
    {
      id: 'help',
      title: 'दूसरों की भी मदद करें',
      summary: 'अतिरिक्त मदद वाले पड़ोसियों का ध्यान रखें।',
      tips: [
        'बुज़ुर्ग पड़ोसियों, बच्चों और दिव्यांग लोगों का हाल पूछें।',
        'जिन घरों में स्मार्टफ़ोन नहीं है उन्हें चेतावनी बताएँ।',
        'समूह में चलें और चिह्नित ऊँचे रास्तों पर रहें।',
        'केवल पुष्ट जानकारी साझा करें, अफ़वाह न फैलाएँ।',
        'शांत रहें और साफ़ बोलें ताकि दूसरे आपका साथ दे सकें।',
      ],
    },
  ],
  ne: [
    {
      id: 'prepare',
      title: 'बाढी तयारी',
      summary: 'आफ्नो बाटो चिन्नुहोस् र आपत्कालीन झोला तयार राख्नुहोस्।',
      tips: [
        'नजिकको उच्च स्थानको आश्रयसम्मको बाटो सिक्नुहोस् र एक पटक हिँडेर हेर्नुहोस्।',
        'झोला तयार राख्नुहोस्: परिचयपत्र, औषधि, टर्च, सिठी, पानी र सुक्खा खाना।',
        'परिवारसँग उपत्यकाको फेदभन्दा माथि भेट्ने ठाउँ तय गर्नुहोस्।',
        'फोन चार्ज राख्नुहोस् र एपमा आपत्कालीन सम्पर्क सुरक्षित गर्नुहोस्।',
        'इन्टरनेट हुँदा आफ्नो उपत्यकाको अफलाइन नक्सा डाउनलोड गर्नुहोस्।',
        'पानी आउँदै गरेको हेर्न नर्पर्खनुहोस्। एपले "निस्कनुहोस्" भन्नासाथ निस्कनुहोस्।',
      ],
    },
    {
      id: 'firstAid',
      title: 'प्राथमिक उपचार',
      summary: 'सहयोग नआउन्जेलका आधारभूत कदम।',
      tips: [
        'कसैलाई सहयोग गर्नुअघि ठाउँ सुरक्षित छ कि छैन हेर्नुहोस्।',
        'धेरै रगत बगेमा सफा कपडाले घाउ कसेर थिच्नुहोस्।',
        'चिसो वा भिजेको व्यक्तिलाई सुक्खा कपडा र कम्बलले न्यानो राख्नुहोस्।',
        'घाँटी वा ढाडमा चोट लागेको शंका भए खतरा नभएसम्म नसार्नुहोस्।',
        'सास नफेरेमा सहयोग बोलाउनुहोस् र तालिम भए CPR दिनुहोस्।',
        'होसमा भएको व्यक्तिलाई मात्र सफा पानी थोरै-थोरै दिनुहोस्।',
      ],
    },
    {
      id: 'rescue',
      title: 'सहायता र उद्धार',
      summary: 'उद्धार टोलीसम्म कसरी पुग्ने र कसरी भेटिने।',
      tips: [
        'आपत्कालीन सम्पर्कलाई जानकारी दिन SOS लाई ३ सेकेन्ड थिचिराख्नुहोस्।',
        'उच्च स्थानमा बस्नुहोस् र खोला वा बिग्रिएको पुल नकटनुहोस्।',
        'उद्धारकर्तालाई संकेत गर्न सिठी (तीन छोटो) वा चम्किलो कपडा प्रयोग गर्नुहोस्।',
        'परिवारलाई आफ्नो लोकेसन पठाउनुहोस् र फोन ब्याट्री सेभरमा राख्नुहोस्।',
        'हराएका, घाइते वा हिँड्न नसक्ने मानिसबारे उद्धारकर्तालाई भन्नुहोस्।',
      ],
    },
    {
      id: 'help',
      title: 'अरूलाई पनि सहयोग गर्नुहोस्',
      summary: 'थप सहयोग चाहिने छिमेकीको ख्याल गर्नुहोस्।',
      tips: [
        'वृद्ध छिमेकी, बालबालिका र अपाङ्गता भएका मानिसको हालखबर लिनुहोस्।',
        'स्मार्टफोन नभएका घरमा चेतावनी पुर्‍याउनुहोस्।',
        'समूहमा हिँड्नुहोस् र चिह्न लगाइएका उच्च स्थानका बाटो प्रयोग गर्नुहोस्।',
        'पुष्टि भएको जानकारी मात्र साझा गर्नुहोस्, हल्ला नफैलाउनुहोस्।',
        'शान्त रहनुहोस् र स्पष्ट बोल्नुहोस् ताकि अरूले पछ्याउन सकून्।',
      ],
    },
  ],
};
