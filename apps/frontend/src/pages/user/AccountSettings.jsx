import React from 'react';
import { useAuth } from '../../context/AuthContext';

const AccountSettings = () => {
    const { user } = useAuth();

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col gap-2 mb-8">
                <h1 className="text-4xl font-black leading-tight tracking-tight text-slate-900 dark:text-slate-100 bg-none m-0">Account Settings</h1>
                <p className="text-slate-600 dark:text-slate-400 text-base font-medium m-0 pt-2">Manage your profile, security, and preferences.</p>
            </div>

            <div className="mb-8">
                <div className="flex border-b border-primary/10 gap-8 overflow-x-auto hide-scrollbar">
                    <button className="flex items-center justify-center border-b-[3px] border-primary text-slate-900 dark:text-slate-100 pb-3 pt-2 px-2 whitespace-nowrap bg-transparent cursor-pointer">
                        <span className="text-sm font-bold tracking-wide">Profile</span>
                    </button>
                    <button className="flex items-center justify-center border-b-[3px] border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:border-primary/30 transition-all pb-3 pt-2 px-2 whitespace-nowrap bg-transparent cursor-pointer">
                        <span className="text-sm font-bold tracking-wide">Security</span>
                    </button>
                    <button className="flex items-center justify-center border-b-[3px] border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:border-primary/30 transition-all pb-3 pt-2 px-2 whitespace-nowrap bg-transparent cursor-pointer">
                        <span className="text-sm font-bold tracking-wide">Notifications</span>
                    </button>
                    <button className="flex items-center justify-center border-b-[3px] border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:border-primary/30 transition-all pb-3 pt-2 px-2 whitespace-nowrap bg-transparent cursor-pointer">
                        <span className="text-sm font-bold tracking-wide">Preferences</span>
                    </button>
                </div>
            </div>

            <section className="flex flex-col gap-6 mb-12">
                <h2 className="text-2xl font-bold leading-tight tracking-tight text-slate-900 dark:text-slate-100 bg-none m-0 pb-2">Profile Information</h2>

                <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-center p-6 rounded-lg bg-white dark:bg-background-dark border border-primary/10 shadow-sm">
                    <div className="h-24 w-24 rounded-full border-4 border-background-light dark:border-background-dark shadow-md overflow-hidden bg-slate-200 object-cover">
                        <img
                            src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.email}`}
                            alt="User avatar"
                            className="w-full h-full object-cover"
                        />
                    </div>
                    <div className="flex flex-col flex-1 gap-1">
                        <p className="text-xl font-bold text-slate-900 dark:text-slate-100 m-0 pb-1">{user?.email?.split('@')[0] || 'User'}</p>
                        <div className="flex items-center gap-2">
                            <span className="text-slate-600 dark:text-slate-400 text-sm font-medium">KYC Status:</span>
                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${user?.kycStatus === 'APPROVED' ? 'bg-primary/10 text-primary' : 'bg-amber-100 text-amber-700'}`}>
                                <span className="material-symbols-outlined text-[14px]">
                                    {user?.kycStatus === 'APPROVED' ? 'verified' : 'pending'}
                                </span>
                                {user?.kycStatus === 'APPROVED' ? 'Verified Level 2' : (user?.kycStatus || 'Pending')}
                            </span>
                        </div>
                    </div>
                    <button className="flex items-center justify-center rounded-full h-10 px-6 bg-primary/10 hover:bg-primary/20 text-primary text-sm font-bold transition-colors w-full sm:w-auto border-none cursor-pointer">
                        Update Avatar
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Display Name</label>
                        <input
                            className="w-full h-12 px-4 rounded-lg border border-primary/20 bg-white dark:bg-background-dark text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-shadow font-medium"
                            type="text"
                            defaultValue={user?.email?.split('@')[0] || 'User'}
                        />
                    </div>
                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Email Address</label>
                        <input
                            className="w-full h-12 px-4 rounded-lg border border-primary/20 bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400 focus:outline-none transition-shadow font-medium cursor-not-allowed"
                            readOnly
                            type="email"
                            value={user?.email || ''}
                        />
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 m-0">Contact support to change your email address.</p>
                    </div>
                    <div className="flex flex-col gap-2 md:col-span-2">
                        <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Bio</label>
                        <textarea
                            className="w-full h-24 p-4 rounded-lg border border-primary/20 bg-white dark:bg-background-dark text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-shadow font-medium resize-none"
                            defaultValue="Active liquidity provider specializing in real estate RWAs."
                        ></textarea>
                    </div>
                </div>

                <div className="flex justify-end pt-4 mt-4">
                    <button className="flex items-center justify-center rounded-full h-12 px-8 bg-primary hover:bg-primary/90 text-white text-sm font-bold transition-colors shadow-md shadow-primary/20 border-none cursor-pointer">
                        Save Changes
                    </button>
                </div>
            </section>
        </div>
    );
};

export default AccountSettings;
