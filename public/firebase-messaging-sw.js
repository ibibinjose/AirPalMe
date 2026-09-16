/* global importScripts, firebase */
importScripts("https://www.gstatic.com/firebasejs/12.18.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/12.18.0/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyAaSH4p-2BEeEB2Xh08qRKESY02TsPJObo",
  authDomain: "airpalme-app.firebaseapp.com",
  projectId: "airpalme-app",
  storageBucket: "airpalme-app.firebasestorage.app",
  messagingSenderId: "265455282950",
  appId: "1:265455282950:web:f9f883965b782d87cacc87",
});

try {
  firebase.messaging();
} catch (_err) {
  /* messaging unavailable in this browser */
}
