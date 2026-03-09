import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import {
    ArrowLeft, Send, Building2, Palette, ShieldCheck, CheckCircle2,
    Image as ImageIcon, FileText, MapPin, User, Layers, Activity,
    Gem, Leaf, Box, Info, Upload, CheckCircle, AlertTriangle, History, Briefcase
} from 'lucide-react';

const AssetOnboardingPage = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        // Stage 2: Identification
        name: '',
        symbol: '',
        type: '',
        regStatus: 'REGULATED', // REGULATED vs NON_REGULATED

        // Stage 2: Branding
        summary: '',
        description: '',

        // Stage 3: Dynamic Metadata (Real Estate)
        propertyTitle: '',
        usageType: 'RESIDENTIAL',
        propertyCategory: 'APARTMENT',
        yearBuilt: '',
        totalFloors: '',
        totalUnits: '',
        address: '',
        city: '',
        country: '',
        coordinates: '',

        // Stage 3: Dynamic Metadata (Fine Art)
        artistName: '',
        artworkTitle: '',
        artworkType: 'PAINTING',
        medium: '',
        dimensions: '',
        edition: '',
        yearCreated: '',
        provenance: '',

        // Stage 3: Dynamic Metadata (Luxury Items)
        brand: '',
        model: '',
        serialNumber: '',
        condition: 'NEW',
        manufactureYear: '',
        authCertificate: '',

        // Stage 3: Dynamic Metadata (Carbon Credits)
        projectName: '',
        standard: 'VCS',
        vintageYear: '',
        registryRecord: '',
        mitigationType: 'REMOVAL',
        verificationBody: '',

        // Stage 4: Custody
        custodyProvider: 'AssetLink',
        vaultId: '',
        storageLocation: '',

        // Stage 4: Transparency
        valuation: '',
        valuationMethod: 'DCF',
        valuationDate: '',
        valuationCurrency: 'USD',
        custodianName: '',
        accountRef: '',

        // Stage 5: Documents (Simulated)
        documents: [],

        // Attestations
        attestExist: false,
        attestOwnership: false,
        attestNav: false
    });
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [isSuccess, setIsSuccess] = useState(false);

    // File States
    const [files, setFiles] = useState({
        coverImage: null,
        gallery: [],
        ownershipProof: null,
        valuationProof: null,
        legalCompliance: null,
        logistics: null
    });

    const fileInputRefs = {
        coverImage: React.useRef(null),
        gallery: React.useRef(null),
        ownershipProof: React.useRef(null),
        valuationProof: React.useRef(null),
        legalCompliance: React.useRef(null),
        logistics: React.useRef(null)
    };

    const handleFileChange = (e, field) => {
        const selectedFiles = e.target.files;
        if (field === 'gallery') {
            setFiles(prev => ({ ...prev, [field]: [...prev.gallery, ...Array.from(selectedFiles)].slice(0, 10) }));
        } else {
            setFiles(prev => ({ ...prev, [field]: selectedFiles[0] }));
        }
    };

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const nextStep = () => {
        // Validation logic can be added per step here
        if (step === 1 && !formData.type) {
            setError('Please select an asset category');
            return;
        }
        if (step === 2 && (!formData.name || !formData.symbol)) {
            setError('Asset Name and Symbol are required');
            return;
        }
        if (step === 4 && !formData.valuation) {
            setError('Asset valuation is required for transparency');
            return;
        }
        setError('');
        setStep(prev => prev + 1);
    };

    const prevStep = () => setStep(prev => prev - 1);

    const handleSubmit = async (e) => {
        if (e) e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const data = new FormData();

            // Append all text fields
            Object.keys(formData).forEach(key => {
                if (key !== 'documents') {
                    data.append(key, formData[key]);
                }
            });

            // Append Single Files
            if (files.coverImage) data.append('coverImage', files.coverImage);
            if (files.ownershipProof) data.append('ownershipProof', files.ownershipProof);
            if (files.valuationProof) data.append('valuationProof', files.valuationProof);
            if (files.legalCompliance) data.append('legalCompliance', files.legalCompliance);
            if (files.logistics) data.append('logistics', files.logistics);

            // Append Multiple Files (Gallery)
            files.gallery.forEach(file => {
                data.append('gallery', file);
            });

            // Make invitation-only or admin-only if needed, for now just standard post
            await api.post('/assets/onboard', data, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            setIsSuccess(true);
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to onboard asset');
        } finally {
            setLoading(false);
        }
    };

    const assetTypes = [
        {
            id: 'REAL_ESTATE',
            label: 'Real Estate',
            icon: <Building2 size={32} />,
            description: 'Commercial & residential property tokens',
        },
        {
            id: 'ART',
            label: 'Fine Art',
            icon: <Palette size={32} />,
            description: 'Paintings, sculptures & collectibles',
        },
        {
            id: 'METAL',
            label: 'Luxury Items',
            icon: <Gem size={32} />,
            description: 'Gold, watches & high-end goods',
        },
        {
            id: 'CARBON',
            label: 'Carbon Credits',
            icon: <Leaf size={32} />,
            description: 'Verified carbon offset units',
        },
        {
            id: 'OTHER',
            label: 'Custom Asset',
            icon: <Box size={32} />,
            description: 'Alternative & emerging classes',
        },
    ];

    const steps = [
        { id: 1, label: 'Category' },
        { id: 2, label: 'Identity' },
        { id: 3, label: 'Metadata' },
        { id: 4, label: 'Custody' },
        { id: 5, label: 'Finalize' }
    ];

    const inputClasses = "w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary text-sm font-medium text-slate-900 dark:text-white placeholder-slate-400 transition-all shadow-sm";
    const labelClasses = "block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2";

    if (isSuccess) {
        return (
            <div className="max-w-2xl mx-auto py-12 animate-in zoom-in duration-500">
                <div className="bg-white dark:bg-background-dark border border-slate-200 dark:border-slate-800 rounded-3xl p-12 text-center shadow-xl">
                    <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-8">
                        <CheckCircle2 size={48} className="text-primary animate-bounce" />
                    </div>
                    <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-4 uppercase tracking-tighter">Ready for Tokenization</h2>
                    <p className="text-slate-500 dark:text-slate-400 mb-8 max-w-md mx-auto">
                        Your physical asset data and legal attestations have been successfully verified and stored.
                    </p>
                    <div className="flex flex-col gap-3">
                        <button onClick={() => navigate('/assets')} className="btn-primary py-4 text-base">
                            Go to Asset Dashboard
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500 pb-24">
            <div className="flex items-center justify-between">
                <button
                    onClick={() => navigate('/assets')}
                    className="btn-secondary flex items-center gap-2 border shadow-none"
                >
                    <ArrowLeft size={18} /> Cancel Onboarding
                </button>

                {/* Step Indicator */}
                <div className="flex items-center gap-4 bg-slate-100 dark:bg-slate-800/50 px-6 py-2 rounded-full border border-slate-200 dark:border-slate-700">
                    {steps.map((s) => (
                        <div key={s.id} className="flex items-center gap-2">
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all
                                ${step >= s.id ? 'bg-primary text-white' : 'bg-slate-300 dark:bg-slate-700 text-slate-500'}`}>
                                {step > s.id ? <CheckCircle size={14} /> : s.id}
                            </div>
                            <span className={`text-[10px] font-bold uppercase tracking-widest hidden md:block
                                ${step >= s.id ? 'text-primary' : 'text-slate-400'}`}>
                                {s.label}
                            </span>
                            {s.id !== 5 && <div className={`w-4 h-px ${step > s.id ? 'bg-primary' : 'bg-slate-300 dark:bg-slate-700'}`} />}
                        </div>
                    ))}
                </div>
            </div>

            <div className={`bg-white dark:bg-background-dark border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm transition-all duration-300 ${error ? 'animate-shake' : ''}`}>
                <div className="p-8 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/20">
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                        {step === 1 && <Layers className="text-primary" size={24} />}
                        {step === 2 && <Info className="text-primary" size={24} />}
                        {step === 3 && <Activity className="text-primary" size={24} />}
                        {step === 4 && <ShieldCheck className="text-primary" size={24} />}
                        {step === 5 && <CheckCircle className="text-primary" size={24} />}
                        {steps.find(s => s.id === step)?.label} - {step}/5
                    </h1>
                    <p className="text-slate-500 text-sm mt-1">
                        {step === 1 && "Choose the asset class for physical verification."}
                        {step === 2 && "Define the unique identity and branding for your asset."}
                        {step === 3 && `Collect class-specific metadata for your ${formData.type.replace('_', ' ')} asset.`}
                        {step === 4 && "Configure custodian details and physical storage."}
                        {step === 5 && "Upload legal documentation and sign final attestations."}
                    </p>
                </div>

                <div className="p-8">
                    {error && (
                        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl text-sm border border-red-100 dark:border-red-900/30 flex items-center gap-3 animate-in slide-in-from-top-2">
                            <AlertTriangle size={18} /> {error}
                        </div>
                    )}

                    {/* Stage 1: Category Selection */}
                    {step === 1 && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4 animate-in slide-in-from-bottom-4">
                            {assetTypes.map((t) => (
                                <button
                                    key={t.id}
                                    onClick={() => {
                                        setFormData({ ...formData, type: t.id });
                                        nextStep();
                                    }}
                                    className={`group flex flex-col items-center gap-4 p-6 rounded-3xl border-2 transition-all duration-300
                                        ${formData.type === t.id
                                            ? 'border-primary bg-primary/5 shadow-lg shadow-primary/10'
                                            : 'border-slate-100 dark:border-slate-800 hover:border-primary/50 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                                >
                                    <div className={`p-4 rounded-2xl transition-all duration-300 ${formData.type === t.id ? 'bg-primary text-white scale-110' : 'bg-slate-100 dark:bg-slate-800 text-slate-400 group-hover:text-primary group-hover:bg-primary/10'}`}>
                                        {t.icon}
                                    </div>
                                    <div className="text-center">
                                        <p className="text-xs font-black uppercase tracking-widest text-slate-900 dark:text-white">{t.label}</p>
                                        <p className="text-[10px] text-slate-400 mt-1 leading-tight">{t.description}</p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Stage 2: Identification & Branding */}
                    {step === 2 && (
                        <div className="space-y-8 animate-in slide-in-from-right-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className={labelClasses}>Internal Asset Name</label>
                                    <input type="text" name="name" value={formData.name} onChange={handleChange} placeholder="e.g. Genesis Fine Art #001" className={inputClasses} />
                                </div>
                                <div>
                                    <label className={labelClasses}>Ticker Symbol</label>
                                    <input type="text" name="symbol" value={formData.symbol} onChange={handleChange} placeholder="e.g. GFA1" className={inputClasses} />
                                </div>
                            </div>
                            <div>
                                <label className={labelClasses}>Regulatory Status</label>
                                <div className="flex gap-4">
                                    {['REGULATED', 'NON_REGULATED'].map(status => (
                                        <button
                                            key={status}
                                            onClick={() => setFormData({ ...formData, regStatus: status })}
                                            className={`flex-1 py-3 rounded-xl border-2 font-bold text-xs tracking-widest transition-all
                                                ${formData.regStatus === status ? 'border-primary bg-primary/5 text-primary' : 'border-slate-100 dark:border-slate-800 text-slate-400'}`}
                                        >
                                            {status.replace('_', ' ')}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label className={labelClasses}>One-line Summary</label>
                                <input type="text" name="summary" value={formData.summary} onChange={handleChange} placeholder="Quick highlight of the asset..." className={inputClasses} />
                            </div>
                            <div>
                                <label className={labelClasses}>Detailed Overview</label>
                                <textarea name="description" value={formData.description} onChange={handleChange} rows="4" className={inputClasses} placeholder="Historical importance, cultural value, etc..."></textarea>
                            </div>
                            <div>
                                <label className={labelClasses}>Media Assets</label>
                                <div className="grid grid-cols-4 gap-4">
                                    <div
                                        onClick={() => fileInputRefs.coverImage.current.click()}
                                        className={`col-span-1 aspect-square rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-2 cursor-pointer transition-all ${files.coverImage ? 'border-primary bg-primary/5 text-primary' : 'border-slate-200 dark:border-slate-800 text-slate-400 hover:border-primary/50 hover:bg-primary/5'}`}
                                    >
                                        <ImageIcon size={24} />
                                        <span className="text-[10px] font-bold text-center">{files.coverImage ? 'Image Selected' : 'Cover\nImage'}</span>
                                        <input type="file" hidden ref={fileInputRefs.coverImage} onChange={(e) => handleFileChange(e, 'coverImage')} accept="image/*" />
                                    </div>
                                    <div
                                        onClick={() => fileInputRefs.gallery.current.click()}
                                        className={`col-span-3 aspect-[4/1] rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-2 cursor-pointer transition-all ${files.gallery.length > 0 ? 'border-primary bg-primary/5 text-primary' : 'border-slate-200 dark:border-slate-800 text-slate-400 hover:border-primary/50 hover:bg-primary/5'}`}
                                    >
                                        <Upload size={24} />
                                        <span className="text-xs font-bold">
                                            {files.gallery.length > 0 ? `${files.gallery.length} Images Selected` : 'Gallery Support (Up to 10 Images)'}
                                        </span>
                                        <input type="file" hidden multiple ref={fileInputRefs.gallery} onChange={(e) => handleFileChange(e, 'gallery')} accept="image/*" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Stage 3: Class-Specific Metadata */}
                    {step === 3 && (
                        <div className="space-y-8 animate-in slide-in-from-right-4">
                            {formData.type === 'REAL_ESTATE' && (
                                <>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <label className={labelClasses}>Property Title</label>
                                            <input type="text" name="propertyTitle" value={formData.propertyTitle} onChange={handleChange} placeholder="Official legal title" className={inputClasses} />
                                        </div>
                                        <div>
                                            <label className={labelClasses}>Usage Type</label>
                                            <select name="usageType" value={formData.usageType} onChange={handleChange} className={inputClasses}>
                                                <option value="RESIDENTIAL">Residential</option>
                                                <option value="COMMERCIAL">Commercial</option>
                                                <option value="INDUSTRIAL">Industrial</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-3 gap-6">
                                        <div>
                                            <label className={labelClasses}>Year Built</label>
                                            <input type="number" name="yearBuilt" value={formData.yearBuilt} onChange={handleChange} className={inputClasses} />
                                        </div>
                                        <div>
                                            <label className={labelClasses}>Total Floors</label>
                                            <input type="number" name="totalFloors" value={formData.totalFloors} onChange={handleChange} className={inputClasses} />
                                        </div>
                                        <div>
                                            <label className={labelClasses}>Total Units</label>
                                            <input type="number" name="totalUnits" value={formData.totalUnits} onChange={handleChange} className={inputClasses} />
                                        </div>
                                    </div>
                                    <div>
                                        <label className={labelClasses}>Full Address</label>
                                        <div className="relative">
                                            <MapPin size={18} className="absolute left-4 top-4 text-slate-400" />
                                            <textarea name="address" value={formData.address} onChange={handleChange} rows="2" className={`${inputClasses} pl-12`} placeholder="Street, Building, etc."></textarea>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <label className={labelClasses}>City / Country</label>
                                            <div className="flex gap-2">
                                                <input type="text" name="city" value={formData.city} onChange={handleChange} placeholder="City" className={inputClasses} />
                                                <input type="text" name="country" value={formData.country} onChange={handleChange} placeholder="Country" className={inputClasses} />
                                            </div>
                                        </div>
                                        <div>
                                            <label className={labelClasses}>Geo-Coordinates</label>
                                            <input type="text" name="coordinates" value={formData.coordinates} onChange={handleChange} placeholder="Lat, Long" className={inputClasses} />
                                        </div>
                                    </div>
                                </>
                            )}

                            {formData.type === 'ART' && (
                                <>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <label className={labelClasses}>Artist Name</label>
                                            <div className="relative">
                                                <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                                <input type="text" name="artistName" value={formData.artistName} onChange={handleChange} placeholder="e.g. Vincent van Gogh" className={`${inputClasses} pl-12`} />
                                            </div>
                                        </div>
                                        <div>
                                            <label className={labelClasses}>Artwork Title</label>
                                            <input type="text" name="artworkTitle" value={formData.artworkTitle} onChange={handleChange} placeholder="Name of piece" className={inputClasses} />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-3 gap-6">
                                        <div>
                                            <label className={labelClasses}>Medium</label>
                                            <input type="text" name="medium" value={formData.medium} onChange={handleChange} placeholder="Oil, Bronze, etc." className={inputClasses} />
                                        </div>
                                        <div>
                                            <label className={labelClasses}>Dimensions</label>
                                            <input type="text" name="dimensions" value={formData.dimensions} onChange={handleChange} placeholder="H x W x D" className={inputClasses} />
                                        </div>
                                        <div>
                                            <label className={labelClasses}>Edition</label>
                                            <input type="text" name="edition" value={formData.edition} onChange={handleChange} placeholder="e.g. 1 of 1" className={inputClasses} />
                                        </div>
                                    </div>
                                    <div>
                                        <label className={labelClasses}>Provenance & History</label>
                                        <div className="relative">
                                            <History size={18} className="absolute left-4 top-4 text-slate-400" />
                                            <textarea name="provenance" value={formData.provenance} onChange={handleChange} rows="4" className={`${inputClasses} pl-12`} placeholder="Previous owners, exhibitions..."></textarea>
                                        </div>
                                    </div>
                                </>
                            )}

                            {formData.type === 'METAL' && (
                                <>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <label className={labelClasses}>Manufacturer / Brand</label>
                                            <input type="text" name="brand" value={formData.brand} onChange={handleChange} placeholder="e.g. Rolex, Patek Philippe" className={inputClasses} />
                                        </div>
                                        <div>
                                            <label className={labelClasses}>Model / Series</label>
                                            <input type="text" name="model" value={formData.model} onChange={handleChange} placeholder="e.g. Daytona 116500LN" className={inputClasses} />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-3 gap-6">
                                        <div>
                                            <label className={labelClasses}>Serial Number</label>
                                            <input type="text" name="serialNumber" value={formData.serialNumber} onChange={handleChange} placeholder="Unique identifier" className={inputClasses} />
                                        </div>
                                        <div>
                                            <label className={labelClasses}>Condition</label>
                                            <select name="condition" value={formData.condition} onChange={handleChange} className={inputClasses}>
                                                <option value="NEW">New / Unworn</option>
                                                <option value="EXCELLENT">Excellent</option>
                                                <option value="GOOD">Good / Pre-owned</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className={labelClasses}>Year</label>
                                            <input type="number" name="manufactureYear" value={formData.manufactureYear} onChange={handleChange} className={inputClasses} />
                                        </div>
                                    </div>
                                    <div>
                                        <label className={labelClasses}>Authentication Certificate ID</label>
                                        <input type="text" name="authCertificate" value={formData.authCertificate} onChange={handleChange} placeholder="COA or Archive Reference" className={inputClasses} />
                                    </div>
                                </>
                            )}

                            {formData.type === 'CARBON' && (
                                <>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <label className={labelClasses}>Project Name</label>
                                            <input type="text" name="projectName" value={formData.projectName} onChange={handleChange} placeholder="e.g. Amazon Rainforest Preservation" className={inputClasses} />
                                        </div>
                                        <div>
                                            <label className={labelClasses}>Standard</label>
                                            <select name="standard" value={formData.standard} onChange={handleChange} className={inputClasses}>
                                                <option value="VCS">Verra (VCS)</option>
                                                <option value="GOLD_STANDARD">Gold Standard</option>
                                                <option value="REGEN">Regen Network</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-3 gap-6">
                                        <div>
                                            <label className={labelClasses}>Vintage Year</label>
                                            <input type="number" name="vintageYear" value={formData.vintageYear} onChange={handleChange} placeholder="2023" className={inputClasses} />
                                        </div>
                                        <div>
                                            <label className={labelClasses}>Registry Record</label>
                                            <input type="text" name="registryRecord" value={formData.registryRecord} onChange={handleChange} placeholder="Public Link or ID" className={inputClasses} />
                                        </div>
                                        <div>
                                            <label className={labelClasses}>Mitigation</label>
                                            <select name="mitigationType" value={formData.mitigationType} onChange={handleChange} className={inputClasses}>
                                                <option value="REMOVAL">Removal</option>
                                                <option value="REDUCTION">Reduction</option>
                                                <option value="AVOIDANCE">Avoidance</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div>
                                        <label className={labelClasses}>Verification Body</label>
                                        <input type="text" name="verificationBody" value={formData.verificationBody} onChange={handleChange} placeholder="e.g. TÜV SÜD, Anchor" className={inputClasses} />
                                    </div>
                                </>
                            )}

                            {(formData.type !== 'REAL_ESTATE' && formData.type !== 'ART' && formData.type !== 'METAL' && formData.type !== 'CARBON') && (
                                <div className="p-12 text-center bg-slate-50 dark:bg-slate-900/40 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800">
                                    <Box className="mx-auto text-slate-300 mb-4" size={48} />
                                    <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Custom fields for {formData.type.replace('_', ' ')} logic pending</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Stage 4: Custody & Transparency */}
                    {step === 4 && (
                        <div className="space-y-8 animate-in slide-in-from-right-4">
                            <div className="p-6 rounded-2xl border border-primary/20 bg-primary/5">
                                <h3 className="text-sm font-black text-primary uppercase tracking-widest mb-6 flex items-center gap-2">
                                    <Briefcase size={18} /> Custody Configuration
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div>
                                        <label className={labelClasses}>Custodian</label>
                                        <select name="custodyProvider" value={formData.custodyProvider} onChange={handleChange} className={inputClasses}>
                                            <option value="AssetLink">AssetLink (Internal)</option>
                                            <option value="Fireblocks">Fireblocks Vault</option>
                                            <option value="External">External Provider</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className={labelClasses}>Vault ID / Ref</label>
                                        <input type="text" name="vaultId" value={formData.vaultId} onChange={handleChange} placeholder="e.g. V-7729" className={inputClasses} />
                                    </div>
                                    <div>
                                        <label className={labelClasses}>Physical Facility</label>
                                        <input type="text" name="storageLocation" value={formData.storageLocation} onChange={handleChange} placeholder="e.g. Zurich Vault #2" className={inputClasses} />
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-6">
                                    <h3 className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest flex items-center gap-2">
                                        <Activity size={16} /> NAV Declaration
                                    </h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className={labelClasses}>Valuation ($)</label>
                                            <input type="number" name="valuation" value={formData.valuation} onChange={handleChange} className={inputClasses} />
                                        </div>
                                        <div>
                                            <label className={labelClasses}>Methodology</label>
                                            <select name="valuationMethod" value={formData.valuationMethod} onChange={handleChange} className={inputClasses}>
                                                <option value="DCF">DCF Model</option>
                                                <option value="APPRAISAL">Third-Party Appraisal</option>
                                                <option value="COST">Historical Cost</option>
                                            </select>
                                        </div>
                                    </div>
                                    <label className="flex items-center gap-3 cursor-pointer group">
                                        <div className="relative">
                                            <input
                                                type="checkbox"
                                                className="peer sr-only"
                                                checked={formData.attestNav}
                                                onChange={(e) => setFormData({ ...formData, attestNav: e.target.checked })}
                                            />
                                            <div className="w-10 h-6 bg-slate-200 dark:bg-slate-800 rounded-full peer-checked:bg-primary transition-all"></div>
                                            <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full peer-checked:translate-x-4 transition-all shadow-sm"></div>
                                        </div>
                                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider group-hover:text-slate-700 dark:group-hover:text-slate-300">I attest to Valuation Accuracy</span>
                                    </label>
                                </div>

                                <div className="space-y-6">
                                    <h3 className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest flex items-center gap-2">
                                        <ShieldCheck size={16} /> Proof of Reserve (PoR)
                                    </h3>
                                    <div>
                                        <label className={labelClasses}>Physical Custodian Name</label>
                                        <input type="text" name="custodianName" value={formData.custodianName} onChange={handleChange} placeholder="Legal Name" className={inputClasses} />
                                    </div>
                                    <div>
                                        <label className={labelClasses}>Account Reference</label>
                                        <input type="text" name="accountRef" value={formData.accountRef} onChange={handleChange} placeholder="Account/Vault Number" className={inputClasses} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Stage 5: Documents & Final Attestation */}
                    {step === 5 && (
                        <div className="space-y-8 animate-in slide-in-from-right-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {[
                                    { label: 'Ownership Proof', desc: 'Title Deeds, Sale Deeds', required: true, key: 'ownershipProof' },
                                    { label: 'Valuation Proof', desc: 'Appraisal Reports', required: true, key: 'valuationProof' },
                                    { label: 'Legal / Compliance', desc: 'SPV Structuring, COA', required: false, key: 'legalCompliance' },
                                    { label: 'Logistics / Others', desc: 'Warehouse Receipts', required: false, key: 'logistics' },
                                ].map((doc, i) => (
                                    <div
                                        key={i}
                                        onClick={() => fileInputRefs[doc.key].current.click()}
                                        className={`p-6 rounded-2xl border-2 transition-all cursor-pointer group ${files[doc.key] ? 'border-primary bg-primary/5' : 'bg-slate-50 dark:bg-slate-900/40 border-slate-100 dark:border-slate-800 hover:border-primary/30'}`}
                                    >
                                        <div className="flex items-start justify-between mb-2">
                                            <div>
                                                <h4 className={`text-xs font-black uppercase tracking-wider ${files[doc.key] ? 'text-primary' : 'text-slate-900 dark:text-white'}`}>{doc.label}</h4>
                                                <p className="text-[10px] text-slate-500 mt-1">{files[doc.key] ? files[doc.key].name : doc.desc}</p>
                                            </div>
                                            <Upload className={files[doc.key] ? 'text-primary' : 'text-slate-300 group-hover:text-primary transition-colors'} size={20} />
                                        </div>
                                        <input type="file" hidden ref={fileInputRefs[doc.key]} onChange={(e) => handleFileChange(e, doc.key)} accept=".pdf,image/*" />
                                        {doc.required && !files[doc.key] && <span className="text-[9px] font-bold text-red-500 uppercase tracking-tighter">* Required for verification</span>}
                                    </div>
                                ))}
                            </div>

                            <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                                <label className="flex items-center gap-4 p-4 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-900/40 cursor-pointer transition-all border border-transparent hover:border-slate-200 dark:hover:border-slate-700">
                                    <input
                                        type="checkbox"
                                        className="w-5 h-5 rounded-lg border-2 border-slate-300 dark:border-slate-700 checked:bg-primary checked:border-primary accent-primary"
                                        checked={formData.attestExist}
                                        onChange={(e) => setFormData({ ...formData, attestExist: e.target.checked })}
                                    />
                                    <span className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest">
                                        Multi-point Attestation: <span className="text-slate-900 dark:text-white">"Asset Physically Exists"</span>
                                    </span>
                                </label>
                                <label className="flex items-center gap-4 p-4 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-900/40 cursor-pointer transition-all border border-transparent hover:border-slate-200 dark:hover:border-slate-700">
                                    <input
                                        type="checkbox"
                                        className="w-5 h-5 rounded-lg border-2 border-slate-300 dark:border-slate-700 checked:bg-primary checked:border-primary accent-primary"
                                        checked={formData.attestOwnership}
                                        onChange={(e) => setFormData({ ...formData, attestOwnership: e.target.checked })}
                                    />
                                    <span className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest">
                                        Legal Attestation: <span className="text-slate-900 dark:text-white">"Full Legal Ownership Confirmed"</span>
                                    </span>
                                </label>
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-8 border-t border-slate-100 dark:border-slate-800 bg-slate-50/20 flex items-center justify-between">
                    {step > 1 ? (
                        <button onClick={prevStep} className="btn-secondary h-12 px-6 flex items-center gap-2">
                            <ArrowLeft size={16} /> Back
                        </button>
                    ) : (
                        <div></div>
                    )}

                    <div className="flex gap-3">
                        {step < 5 ? (
                            <button onClick={nextStep} className="btn-primary h-12 px-8 flex items-center gap-2">
                                Continue <Send size={16} className="rotate-[-45deg]" />
                            </button>
                        ) : (
                            <button
                                onClick={handleSubmit}
                                disabled={loading || !formData.attestExist || !formData.attestOwnership}
                                className="btn-primary h-12 px-12 text-base flex items-center gap-2 disabled:opacity-50 disabled:grayscale"
                            >
                                {loading ? 'Processing...' : 'Complete Physical Onboarding'} <CheckCircle2 size={18} />
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AssetOnboardingPage;
