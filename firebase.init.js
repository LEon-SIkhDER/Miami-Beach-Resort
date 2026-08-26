import { initializeApp } from "firebase/app"
import { getAuth } from "firebase/auth"

const firebaseConfig = {
  apiKey: "AIzaSyAKHCbY2N6GN22uZ5SPeYnNFc6KstqKFcI",
  authDomain: "miami-beach-resort.firebaseapp.com",
  projectId: "miami-beach-resort",
  storageBucket: "miami-beach-resort.firebasestorage.app",
  messagingSenderId: "568279616054",
  appId: "1:568279616054:web:dd4c08ea7714a4a1c7e697"
}

const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
