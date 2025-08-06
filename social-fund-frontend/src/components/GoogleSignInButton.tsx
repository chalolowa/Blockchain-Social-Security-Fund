"use client";

import { motion } from "framer-motion";
import { useGoogleLogin } from "@react-oauth/google";
import { useState } from "react";

interface GoogleSignInButtonProps {
  onSuccess: (idToken: string) => void;
  onError: (error: string) => void;
  disabled?: boolean;
  loading?: boolean;
}

const GoogleSignInButton = ({ 
  onSuccess, 
  onError, 
  disabled = false,
  loading = false 
}: GoogleSignInButtonProps) => {
  const [isExchanging, setIsExchanging] = useState(false);

  // Exchange authorization code for ID token
  const exchangeCodeForIdToken = async (code: string) => {
    try {
      setIsExchanging(true);
      
      const response = await fetch('/api/auth/google/exchange', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          code,
          client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
          redirect_uri: window.location.origin
        }),
      });

      if (!response.ok) {
        throw new Error('Token exchange failed');
      }

      const data = await response.json();
      if (data.id_token) {
        onSuccess(data.id_token);
      } else {
        throw new Error('No ID token received');
      }
    } catch (error) {
      console.error('Google token exchange failed:', error);
      onError('Failed to authenticate with Google');
    } finally {
      setIsExchanging(false);
    }
  };

  const login = useGoogleLogin({
    onSuccess: (codeResponse) => {
      if ('code' in codeResponse) {
        exchangeCodeForIdToken(codeResponse.code);
      } else {
        onError('Invalid Google authentication response');
      }
    },
    onError: (error) => {
      console.error('Google login failed:', error);
      onError('Google login failed. Please try again.');
    },
    flow: 'auth-code', // Changed to get authorization code instead of access token
    scope: 'openid email profile', // Request necessary scopes for ID token
  });

  const isButtonDisabled = disabled || loading || isExchanging;
  const buttonText = isExchanging 
    ? 'Authenticating...' 
    : loading 
    ? 'Loading...' 
    : 'Continue with Google';

  return (
    <motion.button
      whileHover={{ scale: isButtonDisabled ? 1 : 1.05 }}
      whileTap={{ scale: isButtonDisabled ? 1 : 0.95 }}
      className={`w-full bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-xl text-lg font-semibold transition-all flex items-center justify-center ${
        isButtonDisabled ? 'opacity-50 cursor-not-allowed' : ''
      }`}
      onClick={() => !isButtonDisabled && login()}
      disabled={isButtonDisabled}
    >
      {(loading || isExchanging) && (
        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      )}
      
      {!loading && !isExchanging && (
        <div className="bg-white rounded-full p-1 mr-3">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M21.8055 10.0415H21V10H12V14H17.6515C16.827 16.3285 14.6115 18 12 18C8.6865 18 6 15.3135 6 12C6 8.6865 8.6865 6 12 6C13.5295 6 14.921 6.577 15.9805 7.5195L18.809 4.691C17.023 3.0265 14.634 2 12 2C6.4775 2 2 6.4775 2 12C2 17.5225 6.4775 22 12 22C17.5225 22 22 17.5225 22 12C22 11.3295 21.931 10.675 21.8055 10.0415Z" fill="#FFC107"/>
            <path d="M3.15302 7.3455L6.43852 9.755C7.32752 7.554 9.48052 6 12 6C13.5295 6 14.921 6.577 15.9805 7.5195L18.809 4.691C17.023 3.0265 14.634 2 12 2C8.15902 2 4.82802 4.1685 3.15302 7.3455Z" fill="#FF3D00"/>
            <path d="M12 22C14.583 22 16.93 21.0115 18.7045 19.404L15.6095 16.785C14.6055 17.5455 13.3575 18 12 18C9.399 18 7.1905 16.3415 6.3585 14.027L3.0975 16.5395C4.7525 19.778 8.1135 22 12 22Z" fill="#4CAF50"/>
            <path d="M21.8055 10.0415H21V10H12V14H17.6515C17.257 15.1085 16.547 16.0765 15.608 16.7855L15.6095 16.7845L18.7045 19.4035C18.4855 19.6025 22 17 22 12C22 11.3295 21.931 10.675 21.8055 10.0415Z" fill="#1976D2"/>
          </svg>
        </div>
      )}
      
      {buttonText}
    </motion.button>
  );
};

export default GoogleSignInButton;