import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Lang = "he" | "en";

const DICT = {
  he: {
    appName: "סל המשפחה",
    tagline: "סנכרון קניות לכל המשפחה",
    createGroup: "צרו קבוצת קניות",
    joinGroup: "הצטרפו לקבוצה",
    groupName: "שם הקבוצה",
    yourName: "שמך",
    phone: "טלפון",
    create: "צור קבוצה",
    join: "הצטרף",
    or: "או",
    mainPage: "ראשי",
    itemsForPurchase: "פריטים לקנייה",
    messages: "הודעות",
    addItem: "הוסף פריט",
    sendReminder: "שלח תזכורת",
    settings: "הגדרות",
    recentItems: "פריטים אחרונים",
    addManually: "הוסף ידנית",
    sendSelected: "שלח פריטים שנבחרו",
    users: "משתמשים",
    addUser: "הוסף משתמש",
    inviteLink: "כלול קישור לאפליקציה",
    delete: "מחק",
    deleteGroup: "מחק קבוצה",
    admin: "מנהל",
    role: "תפקיד",
    purchasing: "קונה",
    requesting: "מבקש",
    both: "שניהם",
    buildVersion: "גרסה",
    empty: "אין פריטים עדיין",
    emptyMessages: "אין הודעות",
    writeMessage: "כתוב הודעה...",
    send: "שלח",
    presetReminder: "אנא הוסיפו את הפריטים שתרצו שנקנה",
    readBy: "נקרא על ידי",
    itemName: "שם פריט",
    add: "הוסף",
    confirmDelete: "האם אתה בטוח?",
    yes: "כן",
    no: "לא",
    fillAllFields: "נא למלא שם קבוצה, שם ומספר טלפון",
    groupNotFound: "הקבוצה לא נמצאה",
    privateItem: "פריט פרטי",
    privateItemHint: "רק אתה תוכל לראות פריט זה",
    privateBadge: "פרטי",
    leave: "צא מהקבוצה",
    language: "שפה",
    purchased: "נקנה",
    enableNotifications: "אפשר התראות",
    notificationsOn: "התראות מופעלות",
    copyInvite: "העתק קישור הזמנה",
    inviteCopied: "הקישור הועתק",
    inviteSms: "שלח דרך SMS",
    installApp: "התקן כאפליקציה",
    installed: "האפליקציה הותקנה",
    installIosHint: "באייפון: הקש על כפתור השיתוף בספארי ואז 'הוסף למסך הבית'",
    installAndroidHint: "באנדרואיד: פתח את התפריט של הדפדפן ובחר 'הוסף למסך הבית'",
    pushEnable: "אפשר התראות דחיפה",
    pushOn: "התראות דחיפה מופעלות",
    pushDenied: "התראות חסומות בדפדפן",
    pushUnsupported: "הדפדפן לא תומך בהתראות דחיפה",
    pushIosBanner: "כדי לקבל התראות באייפון, הוסיפו את האפליקציה למסך הבית: הקש על שיתוף ואז 'הוסף למסך הבית'",
    pushIosNeedsPwa: "התקינו למסך הבית כדי לאפשר התראות",
    dismiss: "סגור",
    saveAsPreset: "שמור כהודעה מוכנה",
    autoReminder: "שלח תזכורת אוטומטית",
    autoReminderText: "פריטים חדשים נוספו לרשימה",
    added: "נוסף",
    addedOn: "הוסיף בתאריך",
    purchasedAtLabel: "נקנה",
    clearAllMessages: "נקה הודעות",
    confirmClearAll: "למחוק את כל ההודעות?",
  },
  en: {
    appName: "Family Cart",
    tagline: "Grocery sync for the whole family",
    createGroup: "Create a purchase group",
    joinGroup: "Join a group",
    groupName: "Group name",
    yourName: "Your name",
    phone: "Phone",
    create: "Create group",
    join: "Join",
    or: "or",
    mainPage: "Main",
    itemsForPurchase: "Items to buy",
    messages: "Messages",
    addItem: "Add item",
    sendReminder: "Send reminder",
    settings: "Settings",
    recentItems: "Recent items",
    addManually: "Add manually",
    sendSelected: "Send selected items",
    users: "Users",
    addUser: "Add user",
    inviteLink: "Include app link",
    delete: "Delete",
    deleteGroup: "Delete group",
    admin: "Admin",
    role: "Role",
    purchasing: "Purchasing",
    requesting: "Requesting",
    both: "Both",
    buildVersion: "Build",
    empty: "No items yet",
    emptyMessages: "No messages",
    writeMessage: "Write a message...",
    send: "Send",
    presetReminder: "Please add the items you want to be purchased",
    readBy: "Read by",
    itemName: "Item name",
    add: "Add",
    confirmDelete: "Are you sure?",
    yes: "Yes",
    no: "No",
    fillAllFields: "Please fill in the group name, your name, and phone number",
    groupNotFound: "Group not found",
    privateItem: "Private item",
    privateItemHint: "Only you will be able to see this item",
    privateBadge: "Private",
    leave: "Leave group",
    language: "Language",
    purchased: "Purchased",
    enableNotifications: "Enable notifications",
    notificationsOn: "Notifications on",
    copyInvite: "Copy invite link",
    inviteCopied: "Invite copied",
    inviteSms: "Share via SMS",
    installApp: "Install as app",
    installed: "App installed",
    installIosHint: "On iPhone: tap the Share button in Safari, then 'Add to Home Screen'",
    installAndroidHint: "On Android: open the browser menu and choose 'Add to Home screen'",
    pushEnable: "Enable push notifications",
    pushOn: "Push notifications on",
    pushDenied: "Notifications blocked in browser",
    pushUnsupported: "This browser doesn't support push",
    pushIosBanner: "To get notifications on iPhone, add this app to your Home Screen: tap Share, then 'Add to Home Screen'",
    pushIosNeedsPwa: "Install to Home Screen to enable notifications",
    dismiss: "Dismiss",
    saveAsPreset: "Add as a predefined message",
    autoReminder: "Send automatic reminder",
    autoReminderText: "New items were added to the list",
    added: "Added",
    addedOn: "added on",
    purchasedAtLabel: "Purchased",
    clearAllMessages: "Clear messages",
    confirmClearAll: "Delete all messages?",
  },
} as const;

type Key = keyof (typeof DICT)["he"];

const Ctx = createContext<{
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (k: Key) => string;
  dir: "rtl" | "ltr";
}>({
  lang: "he",
  setLang: () => {},
  t: (k) => k,
  dir: "rtl",
});

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("he");

  useEffect(() => {
    const saved = (localStorage.getItem("fg.lang") as Lang) || "he";
    setLangState(saved);
  }, []);

  useEffect(() => {
    const dir = lang === "he" ? "rtl" : "ltr";
    document.documentElement.lang = lang;
    document.documentElement.dir = dir;
  }, [lang]);

  const setLang = (l: Lang) => {
    localStorage.setItem("fg.lang", l);
    setLangState(l);
  };

  const t = (k: Key) => DICT[lang][k] ?? k;
  const dir: "rtl" | "ltr" = lang === "he" ? "rtl" : "ltr";

  return <Ctx.Provider value={{ lang, setLang, t, dir }}>{children}</Ctx.Provider>;
}

export const useI18n = () => useContext(Ctx);
