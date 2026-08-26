import React, { useEffect, useState } from 'react'
import { AuthContext } from './AuthContext'
import { auth } from '../../firebase.init'
import { createUserWithEmailAndPassword, GoogleAuthProvider, onAuthStateChanged, signInWithEmailAndPassword, signInWithPopup, signOut, updateProfile } from 'firebase/auth'
import { useQueryClient } from '@tanstack/react-query'
import axios from 'axios'

const AuthProvider = ({ children }) => {
    const [loading, setLoading] = useState(true)
    const [user, setUser] = useState(null)

    const updateLastActive = (currentUser) => {
        axios.patch(`${import.meta.env.VITE_SERVER_URL}/users/last-active`, { uid: currentUser.uid })
    }

    useEffect(() => {
        let intervalId
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser)
            setLoading(false)
            if (currentUser) {
                updateLastActive(currentUser)
                intervalId = setInterval(() => {
                    updateLastActive(currentUser)
                }, 5 * 60 * 1000)
            }
        })
        return () => {
            unsubscribe()
            clearInterval(intervalId)
        }
    }, [])

    // create user
    const createUser = (email, password) => {
        return createUserWithEmailAndPassword(auth, email, password)
    }
    // update user
    const updateUser = (name, photoUrl) => {
        return updateProfile(auth.currentUser, { displayName: name, photoURL: photoUrl })
    }
    // login
    const handleSignInWithEmailAndPassword = (email, password) => {
        return signInWithEmailAndPassword(auth, email, password)
    }
    // google login
    const googleProvider = new GoogleAuthProvider()
    const logInWithGooglePopUp = () => {
        return signInWithPopup(auth, googleProvider)
    }
    // log out
    const queryClient = useQueryClient()
    const logOut = () => {
        queryClient.clear()
        return signOut(auth)
    }

    const context = {
        loading,
        user,
        createUser,
        updateUser,
        handleSignInWithEmailAndPassword,
        logInWithGooglePopUp,
        logOut,
    }
    return (
        <AuthContext value={context}>{children}</AuthContext>
    )
}

export default AuthProvider
