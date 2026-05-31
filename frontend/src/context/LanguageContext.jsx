import { createContext, useContext, useState } from 'react';

const translations = {
  en: {
    // Sidebar
    'nav.dashboard': 'Dashboard',
    'nav.alerts': 'Alert Inbox',
    'nav.buildings': 'Buildings',
    'nav.noc': 'NOC Database',
    'nav.upload': 'Upload NOC',
    'sidebar.lightMode': 'Light Mode',
    'sidebar.darkMode': 'Dark Mode',
    'sidebar.encrypted': 'Data Encrypted',
    'sidebar.jurisdiction': 'Incident Response System',

    // Dashboard
    'dashboard.title': 'Fire Station Dashboard',
    'dashboard.subtitle': 'Corridoor Incident Response System',
    'dashboard.totalBuildings': 'Total Buildings',
    'dashboard.activeAlerts': 'Active Alerts',
    'dashboard.highHazard': 'High Hazard',
    'dashboard.expiredNocs': 'Expired NOCs',
    'dashboard.recentAlerts': 'Recent Alerts',
    'dashboard.viewAll': 'View All',
    'dashboard.noAlerts': 'No active alerts — all systems normal',

    // Alerts
    'alerts.title': 'Alert Inbox',
    'alerts.subtitle': 'Real-time alerts from all buildings',
    'alerts.active': 'Active',
    'alerts.all': 'All',
    'alerts.acknowledged': 'Acknowledged',
    'alerts.resolved': 'Resolved',
    'alerts.noAlerts': 'No alerts found',
    'alerts.reportedBy': 'Reported by',

    // Incident Packet
    'incident.title': 'Incoming Emergency Alert',
    'incident.backToDashboard': '← Back to Dashboard',
    'incident.markResolved': 'Mark Resolved',
    'incident.location': 'LOCATION',
    'incident.floorPlan': 'FLOOR PLAN',
    'incident.typeOfBuilding': 'TYPE OF BUILDING',
    'incident.noOfFloors': 'NO. OF FLOORS',
    'incident.avgOccupancy': 'AVG OCCUPANCY',
    'incident.people': 'people',
    'incident.fireSystems': 'FIRE SYSTEMS',
    'incident.liveUpdates': 'LIVE UPDATES',
    'incident.viewNocPdf': 'View NOC PDF',
    'incident.viewExtractedData': 'View Extracted Data',
    'incident.elapsed': 'ago',
    'incident.above': 'above',
    'incident.basement': 'basement',
    'incident.call': 'Call',
    'incident.pointOfContact': 'Point of Contact',
    'incident.sprinkler': 'Sprinkler',
    'incident.wetRiser': 'Wet Riser',
    'incident.hydrants': 'Hydrants',
    'incident.pump': 'Pump',
    'incident.int': 'int',
    'incident.ext': 'ext',

    // Incident Categories
    'category.fire': '🔥 Fire',
    'category.rescue': '🚑 Rescue',
    'category.collapse': '🏚️ House Collapse',
    'category.other': '⚠️ Other',

    // Buildings
    'buildings.title': 'Registered Buildings',
    'buildings.subtitle': 'All buildings in the NOC database',
    'buildings.search': 'Search buildings...',
    'buildings.floors': 'Floors',
    'buildings.height': 'Height',
    'buildings.type': 'Type',

    // NOC
    'noc.title': 'NOC Database',
    'noc.subtitle': 'Search and manage fire safety certificates',
    'noc.search': 'Search by name, ID, ward, area...',
    'noc.hazardOnly': 'Hazard Only',
    'noc.expiredOnly': 'Expired Only',
    'noc.sectionA': 'Section A',
    'noc.sectionB': 'Section B',
    'noc.sectionC': 'Section C',
    'noc.floorplan': 'Floorplan',
    'noc.nocSubmission': 'NOC Submission',
    'noc.certificates': 'Certificates',
    'noc.accessCompliance': 'Access & Compliance',
    'noc.buildingLayout': 'Building Layout',

    // Upload
    'upload.title': 'Upload NOC',
    'upload.subtitle': 'Upload Fire NOC documents for AI-powered data extraction',
    'upload.step1Title': 'Upload NOC Document',
    'upload.step1Desc': 'Upload a Fire NOC PDF — AI will extract all building data automatically',
    'upload.step2Title': 'Upload Floorplan (Optional)',
    'upload.dropNoc': 'Drop NOC PDF here',
    'upload.dropFloorplan': 'Drop Floorplan PDF here',
    'upload.orBrowse': 'or click to browse',
    'upload.notRequired': 'not required',
    'upload.extracting': 'Extracting with AI...',
    'upload.uploadExtract': 'Upload & Extract NOC',
    'upload.processing': 'Processing floorplans...',
    'upload.uploadProcess': 'Upload & Process Floorplan',
    'upload.skipFloorplan': 'Skip floorplan — upload another NOC',
    'upload.uploadAnother': 'Upload Another Building',
    'upload.fieldsExtracted': 'Fields Extracted',
    'upload.extractionComplete': 'NOC Extraction Complete',
    'upload.floorplanProcessed': '✅ Floorplan Processed',

    // Live Updates
    'updates.title': 'Live Updates',
    'updates.noUpdates': 'No updates yet — waiting for staff reports',
    'updates.loading': 'Loading updates...',

    // Common
    'common.highHazard': 'HIGH HAZARD',
    'common.nocValid': 'NOC VALID',
    'common.nocExpired': 'NOC EXPIRED',
    'common.back': '← Back',
    'common.ward': 'Ward',
    'common.area': 'Area',
    'common.buildingId': 'Building ID',
    'common.buildingName': 'Building Name',
  },

  hi: {
    'nav.dashboard': 'डैशबोर्ड',
    'nav.alerts': 'अलर्ट इनबॉक्स',
    'nav.buildings': 'इमारतें',
    'nav.noc': 'NOC डेटाबेस',
    'nav.upload': 'NOC अपलोड',
    'sidebar.lightMode': 'लाइट मोड',
    'sidebar.darkMode': 'डार्क मोड',
    'sidebar.encrypted': 'डेटा एन्क्रिप्टेड',
    'sidebar.jurisdiction': 'ठाणे नगर निगम',

    'dashboard.title': 'फायर स्टेशन डैशबोर्ड',
    'dashboard.subtitle': 'ठाणे नगर निगम — कॉरिडोर घटना प्रतिक्रिया प्रणाली',
    'dashboard.totalBuildings': 'कुल इमारतें',
    'dashboard.activeAlerts': 'सक्रिय अलर्ट',
    'dashboard.highHazard': 'उच्च खतरा',
    'dashboard.expiredNocs': 'समाप्त NOC',
    'dashboard.recentAlerts': 'हाल के अलर्ट',
    'dashboard.viewAll': 'सभी देखें',
    'dashboard.noAlerts': 'कोई सक्रिय अलर्ट नहीं — सभी सिस्टम सामान्य',

    'alerts.title': 'अलर्ट इनबॉक्स',
    'alerts.subtitle': 'सभी इमारतों से रीयल-टाइम अलर्ट',
    'alerts.active': 'सक्रिय',
    'alerts.all': 'सभी',
    'alerts.acknowledged': 'स्वीकृत',
    'alerts.resolved': 'हल किया',
    'alerts.noAlerts': 'कोई अलर्ट नहीं मिला',
    'alerts.reportedBy': 'द्वारा रिपोर्ट',

    'incident.title': 'आपातकालीन अलर्ट',
    'incident.backToDashboard': '← डैशबोर्ड पर वापस',
    'incident.markResolved': 'हल किया',
    'incident.location': 'स्थान',
    'incident.floorPlan': 'फ्लोर प्लान',
    'incident.typeOfBuilding': 'भवन का प्रकार',
    'incident.noOfFloors': 'मंजिलों की संख्या',
    'incident.avgOccupancy': 'औसत अधिभोग',
    'incident.people': 'लोग',
    'incident.fireSystems': 'अग्नि प्रणालियाँ',
    'incident.liveUpdates': 'लाइव अपडेट',
    'incident.viewNocPdf': 'NOC PDF देखें',
    'incident.viewExtractedData': 'निकाला डेटा देखें',
    'incident.elapsed': 'पहले',
    'incident.above': 'ऊपर',
    'incident.basement': 'बेसमेंट',
    'incident.call': 'कॉल करें',
    'incident.pointOfContact': 'संपर्क व्यक्ति',
    'incident.sprinkler': 'स्प्रिंकलर',
    'incident.wetRiser': 'वेट राइज़र',
    'incident.hydrants': 'हाइड्रेंट',
    'incident.pump': 'पंप',
    'incident.int': 'आंत',
    'incident.ext': 'बाह',

    'category.fire': '🔥 आग',
    'category.rescue': '🚑 बचाव',
    'category.collapse': '🏚️ भवन ढहना',
    'category.other': '⚠️ अन्य',

    'buildings.title': 'पंजीकृत इमारतें',
    'buildings.subtitle': 'NOC डेटाबेस में सभी इमारतें',
    'buildings.search': 'इमारतें खोजें...',
    'buildings.floors': 'मंजिलें',
    'buildings.height': 'ऊंचाई',
    'buildings.type': 'प्रकार',

    'noc.title': 'NOC डेटाबेस',
    'noc.subtitle': 'अग्नि सुरक्षा प्रमाणपत्र खोजें और प्रबंधित करें',
    'noc.search': 'नाम, ID, वार्ड, क्षेत्र से खोजें...',
    'noc.hazardOnly': 'केवल खतरनाक',
    'noc.expiredOnly': 'केवल समाप्त',
    'noc.sectionA': 'खंड A',
    'noc.sectionB': 'खंड B',
    'noc.sectionC': 'खंड C',
    'noc.floorplan': 'फ्लोर प्लान',
    'noc.nocSubmission': 'NOC जमा',
    'noc.certificates': 'प्रमाणपत्र',
    'noc.accessCompliance': 'पहुंच और अनुपालन',
    'noc.buildingLayout': 'भवन लेआउट',

    'upload.title': 'NOC अपलोड',
    'upload.subtitle': 'AI-संचालित डेटा निष्कर्षण के लिए Fire NOC दस्तावेज़ अपलोड करें',
    'upload.step1Title': 'NOC दस्तावेज़ अपलोड करें',
    'upload.step1Desc': 'Fire NOC PDF अपलोड करें — AI स्वचालित रूप से सभी भवन डेटा निकालेगा',
    'upload.step2Title': 'फ्लोरप्लान अपलोड करें (वैकल्पिक)',
    'upload.dropNoc': 'NOC PDF यहाँ छोड़ें',
    'upload.dropFloorplan': 'फ्लोरप्लान PDF यहाँ छोड़ें',
    'upload.orBrowse': 'या ब्राउज़ करें',
    'upload.notRequired': 'आवश्यक नहीं',
    'upload.extracting': 'AI से निकाल रहे हैं...',
    'upload.uploadExtract': 'अपलोड और NOC निकालें',
    'upload.processing': 'फ्लोरप्लान प्रोसेस हो रहे हैं...',
    'upload.uploadProcess': 'अपलोड और फ्लोरप्लान प्रोसेस करें',
    'upload.skipFloorplan': 'फ्लोरप्लान छोड़ें — दूसरा NOC अपलोड करें',
    'upload.uploadAnother': 'दूसरी इमारत अपलोड करें',
    'upload.fieldsExtracted': 'फ़ील्ड निकाले गए',
    'upload.extractionComplete': 'NOC निष्कर्षण पूर्ण',
    'upload.floorplanProcessed': '✅ फ्लोरप्लान प्रोसेस हुआ',

    'updates.title': 'लाइव अपडेट',
    'updates.noUpdates': 'कोई अपडेट नहीं — स्टाफ रिपोर्ट की प्रतीक्षा',
    'updates.loading': 'अपडेट लोड हो रहे हैं...',

    'common.highHazard': 'उच्च खतरा',
    'common.nocValid': 'NOC मान्य',
    'common.nocExpired': 'NOC समाप्त',
    'common.back': '← वापस',
    'common.ward': 'वार्ड',
    'common.area': 'क्षेत्र',
    'common.buildingId': 'भवन ID',
    'common.buildingName': 'भवन का नाम',
  },

  mr: {
    'nav.dashboard': 'डॅशबोर्ड',
    'nav.alerts': 'अलर्ट इनबॉक्स',
    'nav.buildings': 'इमारती',
    'nav.noc': 'NOC डेटाबेस',
    'nav.upload': 'NOC अपलोड',
    'sidebar.lightMode': 'लाइट मोड',
    'sidebar.darkMode': 'डार्क मोड',
    'sidebar.encrypted': 'डेटा एन्क्रिप्टेड',
    'sidebar.jurisdiction': 'ठाणे महानगरपालिका',

    'dashboard.title': 'फायर स्टेशन डॅशबोर्ड',
    'dashboard.subtitle': 'ठाणे महानगरपालिका — कॉरिडोर घटना प्रतिसाद प्रणाली',
    'dashboard.totalBuildings': 'एकूण इमारती',
    'dashboard.activeAlerts': 'सक्रिय अलर्ट',
    'dashboard.highHazard': 'उच्च धोका',
    'dashboard.expiredNocs': 'कालबाह्य NOC',
    'dashboard.recentAlerts': 'अलीकडील अलर्ट',
    'dashboard.viewAll': 'सर्व पहा',
    'dashboard.noAlerts': 'कोणतेही सक्रिय अलर्ट नाहीत — सर्व प्रणाली सामान्य',

    'alerts.title': 'अलर्ट इनबॉक्स',
    'alerts.subtitle': 'सर्व इमारतींकडून रिअल-टाइम अलर्ट',
    'alerts.active': 'सक्रिय',
    'alerts.all': 'सर्व',
    'alerts.acknowledged': 'मान्य',
    'alerts.resolved': 'निराकरण',
    'alerts.noAlerts': 'कोणतेही अलर्ट सापडले नाहीत',
    'alerts.reportedBy': 'यांनी नोंदवले',

    'incident.title': 'आपत्कालीन अलर्ट',
    'incident.backToDashboard': '← डॅशबोर्डवर परत',
    'incident.markResolved': 'निराकरण केले',
    'incident.location': 'स्थान',
    'incident.floorPlan': 'मजला आराखडा',
    'incident.typeOfBuilding': 'इमारतीचा प्रकार',
    'incident.noOfFloors': 'मजल्यांची संख्या',
    'incident.avgOccupancy': 'सरासरी भोगवटा',
    'incident.people': 'लोक',
    'incident.fireSystems': 'अग्निशमन प्रणाली',
    'incident.liveUpdates': 'लाइव्ह अपडेट',
    'incident.viewNocPdf': 'NOC PDF पहा',
    'incident.viewExtractedData': 'काढलेला डेटा पहा',
    'incident.elapsed': 'पूर्वी',
    'incident.above': 'वर',
    'incident.basement': 'तळमजला',
    'incident.call': 'कॉल करा',
    'incident.pointOfContact': 'संपर्क व्यक्ती',
    'incident.sprinkler': 'स्प्रिंकलर',
    'incident.wetRiser': 'वेट राइज़र',
    'incident.hydrants': 'हायड्रंट',
    'incident.pump': 'पंप',
    'incident.int': 'आत',
    'incident.ext': 'बाहेर',

    'category.fire': '🔥 आग',
    'category.rescue': '🚑 बचाव',
    'category.collapse': '🏚️ इमारत कोसळणे',
    'category.other': '⚠️ इतर',

    'buildings.title': 'नोंदणीकृत इमारती',
    'buildings.subtitle': 'NOC डेटाबेसमधील सर्व इमारती',
    'buildings.search': 'इमारती शोधा...',
    'buildings.floors': 'मजले',
    'buildings.height': 'उंची',
    'buildings.type': 'प्रकार',

    'noc.title': 'NOC डेटाबेस',
    'noc.subtitle': 'अग्निसुरक्षा प्रमाणपत्रे शोधा आणि व्यवस्थापित करा',
    'noc.search': 'नाव, ID, वॉर्ड, क्षेत्राने शोधा...',
    'noc.hazardOnly': 'फक्त धोकादायक',
    'noc.expiredOnly': 'फक्त कालबाह्य',
    'noc.sectionA': 'विभाग A',
    'noc.sectionB': 'विभाग B',
    'noc.sectionC': 'विभाग C',
    'noc.floorplan': 'मजला आराखडा',
    'noc.nocSubmission': 'NOC सादर',
    'noc.certificates': 'प्रमाणपत्रे',
    'noc.accessCompliance': 'प्रवेश आणि अनुपालन',
    'noc.buildingLayout': 'इमारत रचना',

    'upload.title': 'NOC अपलोड',
    'upload.subtitle': 'AI-चालित डेटा काढण्यासाठी Fire NOC कागदपत्रे अपलोड करा',
    'upload.step1Title': 'NOC कागदपत्र अपलोड करा',
    'upload.step1Desc': 'Fire NOC PDF अपलोड करा — AI आपोआप सर्व इमारत डेटा काढेल',
    'upload.step2Title': 'फ्लोरप्लान अपलोड करा (पर्यायी)',
    'upload.dropNoc': 'NOC PDF येथे टाका',
    'upload.dropFloorplan': 'फ्लोरप्लान PDF येथे टाका',
    'upload.orBrowse': 'किंवा ब्राउझ करा',
    'upload.notRequired': 'आवश्यक नाही',
    'upload.extracting': 'AI ने काढत आहे...',
    'upload.uploadExtract': 'अपलोड आणि NOC काढा',
    'upload.processing': 'फ्लोरप्लान प्रक्रिया होत आहे...',
    'upload.uploadProcess': 'अपलोड आणि फ्लोरप्लान प्रक्रिया करा',
    'upload.skipFloorplan': 'फ्लोरप्लान वगळा — दुसरा NOC अपलोड करा',
    'upload.uploadAnother': 'दुसरी इमारत अपलोड करा',
    'upload.fieldsExtracted': 'फील्ड काढले',
    'upload.extractionComplete': 'NOC निष्कर्षण पूर्ण',
    'upload.floorplanProcessed': '✅ फ्लोरप्लान प्रक्रिया झाली',

    'updates.title': 'लाइव्ह अपडेट',
    'updates.noUpdates': 'कोणतेही अपडेट नाहीत — कर्मचारी अहवालाची वाट',
    'updates.loading': 'अपडेट लोड होत आहेत...',

    'common.highHazard': 'उच्च धोका',
    'common.nocValid': 'NOC वैध',
    'common.nocExpired': 'NOC कालबाह्य',
    'common.back': '← मागे',
    'common.ward': 'वॉर्ड',
    'common.area': 'क्षेत्र',
    'common.buildingId': 'इमारत ID',
    'common.buildingName': 'इमारतीचे नाव',
  },
};

const LanguageContext = createContext();

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState(() => {
    return localStorage.getItem('corridoor_lang') || 'en';
  });

  const t = (key) => {
    return translations[language]?.[key] || translations.en[key] || key;
  };

  const changeLanguage = (lang) => {
    setLanguage(lang);
    localStorage.setItem('corridoor_lang', lang);
  };

  return (
    <LanguageContext.Provider value={{ language, changeLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage must be used within LanguageProvider');
  return context;
}

export const LANGUAGES = [
  { code: 'en', label: 'English', flag: 'EN' },
  { code: 'hi', label: 'हिन्दी', flag: 'HI' },
  { code: 'mr', label: 'मराठी', flag: 'MR' },
];