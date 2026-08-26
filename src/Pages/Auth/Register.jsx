import React, { useContext } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router'
import { AuthContext } from '../../Context/AuthContext'
import toast from 'react-hot-toast'
import axios from 'axios'
import { User, Lock, Mail, Phone, ArrowRight } from 'lucide-react'
import logo from '../../assets/logo.png'


const Register = () => {
    const { createUser, updateUser, logInWithGooglePopUp } = useContext(AuthContext)
    const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm()
    const navigate = useNavigate()

    const handleGoogle = () => {
        logInWithGooglePopUp()
            .then(async (result) => {
                const user = result.user
                await axios.post(`${import.meta.env.VITE_SERVER_URL}/users`, {
                    uid: user.uid,
                    name: user.displayName,
                    email: user.email,
                    photo: user.photoURL
                })
                toast.success("Account created and logged in!")
                navigate("/dashboard")
            })
            .catch(err => {
                console.log(err)
                toast.error("Google sign-up failed")
            })
    }

    const onSubmit = async (data) => {
        try {
            const result = await createUser(data.email, data.password)
            await updateUser(data.name, "")
            // save user to db
            await axios.post(`${import.meta.env.VITE_SERVER_URL}/users`, {
                uid: result.user.uid,
                name: data.name,
                email: data.email,
                phone: data.phone,
            })
            toast.success("Account created successfully!")
            navigate("/dashboard")
        } catch (err) {
            console.log(err)
            toast.error(err.message || "Registration failed")
        }
    }

    return (
        <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-slate-200/80 p-5 sm:p-8 m-2 sm:m-4 space-y-5">
            {/* Header with Logo */}
            <div className="text-center space-y-2">
                <Link to="/" className="inline-block hover:scale-105 transition-transform duration-200">
                    <img 
                        src={logo} 
                        alt="Miami Beach Resort" 
                        className="h-12 sm:h-14 w-auto mx-auto object-contain drop-shadow-xs" 
                    />
                </Link>
                <h2 className="text-xl sm:text-2xl font-extrabold font-serif text-slate-900 tracking-tight">Create Account</h2>
                <p className="text-xs text-slate-500 font-medium">Join Miami Beach Resort guest portal</p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-3.5">
                <div className="form-control">
                    <label className="label py-1"><span className="label-text font-semibold text-slate-700 text-xs">Full Name</span></label>
                    <div className="relative">
                        <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            placeholder="John Doe"
                            className={`input input-sm sm:input-md input-bordered w-full pl-10 rounded-xl bg-slate-50 focus:bg-white text-xs sm:text-sm ${errors.name ? "input-error" : ""}`}
                            {...register("name", { required: "Name is required" })}
                        />
                    </div>
                    {errors.name && <span className="text-error text-[11px] mt-0.5">{errors.name.message}</span>}
                </div>

                <div className="form-control">
                    <label className="label py-1"><span className="label-text font-semibold text-slate-700 text-xs">Email Address</span></label>
                    <div className="relative">
                        <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="email"
                            placeholder="name@example.com"
                            className={`input input-sm sm:input-md input-bordered w-full pl-10 rounded-xl bg-slate-50 focus:bg-white text-xs sm:text-sm ${errors.email ? "input-error" : ""}`}
                            {...register("email", { required: "Email is required" })}
                        />
                    </div>
                    {errors.email && <span className="text-error text-[11px] mt-0.5">{errors.email.message}</span>}
                </div>

                <div className="form-control">
                    <label className="label py-1"><span className="label-text font-semibold text-slate-700 text-xs">Phone Number</span></label>
                    <div className="relative">
                        <Phone size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="tel"
                            placeholder="+88017..."
                            className="input input-sm sm:input-md input-bordered w-full pl-10 rounded-xl bg-slate-50 focus:bg-white text-xs sm:text-sm"
                            {...register("phone")}
                        />
                    </div>
                </div>

                <div className="form-control">
                    <label className="label py-1"><span className="label-text font-semibold text-slate-700 text-xs">Password</span></label>
                    <div className="relative">
                        <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="password"
                            placeholder="••••••••"
                            className={`input input-sm sm:input-md input-bordered w-full pl-10 rounded-xl bg-slate-50 focus:bg-white text-xs sm:text-sm ${errors.password ? "input-error" : ""}`}
                            {...register("password", { required: "Password is required", minLength: { value: 6, message: "Minimum 6 characters" } })}
                        />
                    </div>
                    {errors.password && <span className="text-error text-[11px] mt-0.5">{errors.password.message}</span>}
                </div>

                <button 
                    type="submit" 
                    disabled={isSubmitting}
                    className="btn btn-sm sm:btn-md btn-primary w-full rounded-xl text-white font-bold shadow-md shadow-teal-600/20 mt-2 gap-2 text-xs sm:text-sm"
                >
                    {isSubmitting ? <span className="loading loading-spinner" /> : <><span>Create Account</span> <ArrowRight size={15} /></>}
                </button>
            </form>

            <div className="divider text-[11px] text-slate-400 uppercase font-semibold my-2">Or continue with</div>

            <button 
                onClick={handleGoogle} 
                type="button"
                className="btn btn-sm sm:btn-md btn-outline border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 text-slate-700 w-full rounded-xl gap-2.5 font-semibold shadow-xs text-xs sm:text-sm"
            >
                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-4 h-4 sm:w-5 sm:h-5" alt="google" />
                Sign up with Google
            </button>

            <p className="text-center text-xs text-slate-500 pt-1">
                Already have an account? <Link to="/login" className="text-teal-700 font-bold hover:underline">Log in</Link>
            </p>
        </div>
    )
}

export default Register
