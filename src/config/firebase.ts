import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, FacebookAuthProvider } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyBYZ9wX7fY8vQ2nR3mK4pL6sT9uE1wV2xA",
  authDomain: "topraklif-dev.firebaseapp.com",
  projectId: "topraklif-dev",
  storageBucket: "topraklif-dev.appspot.com",
  messagingSenderId: "987654321",
  appId: "1:987654321:web:abcd1234efgh5678"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);

// Initialize providers
export const googleProvider = new GoogleAuthProvider();
export const facebookProvider = new FacebookAuthProvider();

// Configure Google provider
googleProvider.addScope('profile');
googleProvider.addScope('email');

// Configure Facebook provider  
facebookProvider.addScope('email');
facebookProvider.addScope('public_profile');
export default app;