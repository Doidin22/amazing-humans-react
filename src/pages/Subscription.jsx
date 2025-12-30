import React, { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { getFunctions, httpsCallable } from 'firebase/functions';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';

// Initialize Stripe outside of component to avoid recreating stripe object on every render
// Initialize Stripe outside of component. Use placeholder if missing to avoid crash.
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || 'pk_test_placeholder');

const Subscription = () => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);

    const handleSubscribe = async (priceId) => {
        if (!user) {
            toast.error('You need to be logged in to subscribe.');
            return;
        }

        setLoading(true);
        try {
            const functions = getFunctions();
            const createStripeCheckoutSession = httpsCallable(functions, 'createStripeCheckoutSession');

            const { data } = await createStripeCheckoutSession({
                priceId: priceId,
                successUrl: window.location.origin + '/dashboard', // Normally /success, using dashboard for test
                cancelUrl: window.location.origin + '/subscription',
            });

            // MOCK HANDLING
            if (data.sessionId === 'mock_session_12345') {
                toast.success("TEST MODE: Subscription payment simulated!");
                setTimeout(() => {
                    window.location.href = '/dashboard';
                }, 1500);
                return;
            }

            // Init Stripe client (might be null if key missing)
            const stripe = await stripePromise;
            if (!stripe) {
                toast.error("Stripe key missing.");
                return;
            }
            const { error } = await stripe.redirectToCheckout({
                sessionId: data.sessionId,
            });

            if (error) {
                toast.error(error.message);
            }
        } catch (error) {
            console.error('Error:', error);
            toast.error('Failed to start subscription process.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#121212] text-white py-20 px-4">
            <div className="max-w-7xl mx-auto text-center">
                <h1 className="text-4xl md:text-5xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-600">
                    Choose Your Plan
                </h1>
                <p className="text-xl text-gray-400 mb-16 max-w-2xl mx-auto">
                    Unlock the full potential of Amazing Humans. Get access to exclusive content, early releases, and support your favorite authors.
                </p>

                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-5xl mx-auto">
                    {/* Free Plan */}
                    <div className="bg-[#1e1e1e] rounded-2xl p-8 border border-gray-800 hover:border-purple-500 transition-all duration-300 flex flex-col">
                        <h3 className="text-2xl font-bold mb-4">Free</h3>
                        <p className="text-4xl font-bold mb-6">$0<span className="text-lg text-gray-400 font-normal">/mo</span></p>
                        <ul className="space-y-4 mb-8 flex-1 text-left text-gray-300">
                            <li className="flex items-center"><span className="text-green-500 mr-2">✓</span> Access to free chapters</li>
                            <li className="flex items-center"><span className="text-green-500 mr-2">✓</span> Basic reading mode</li>
                            <li className="flex items-center"><span className="text-green-500 mr-2">✓</span> Community comments</li>
                        </ul>
                        <button className="w-full py-3 rounded-xl bg-gray-700 hover:bg-gray-600 transition-colors font-semibold">
                            Current Plan
                        </button>
                    </div>

                    {/* Pro Plan */}
                    <div className="bg-[#1e1e1e] rounded-2xl p-8 border border-purple-500 transform scale-105 shadow-xl shadow-purple-900/20 relative flex flex-col">
                        <div className="absolute top-0 right-0 bg-purple-600 text-xs font-bold px-3 py-1 rounded-bl-lg rounded-tr-lg">POPULAR</div>
                        <h3 className="text-2xl font-bold mb-4">Pro Reader</h3>
                        <p className="text-4xl font-bold mb-6">$1.99<span className="text-lg text-gray-400 font-normal">/mo</span></p>
                        <ul className="space-y-4 mb-8 flex-1 text-left text-gray-300">
                            <li className="flex items-center"><span className="text-green-500 mr-2">✓</span> Unlimited reading</li>
                            <li className="flex items-center"><span className="text-green-500 mr-2">✓</span> Offline mode</li>
                            <li className="flex items-center"><span className="text-green-500 mr-2">✓</span> Ad-free experience</li>
                            <li className="flex items-center"><span className="text-green-500 mr-2">✓</span> Early access to new chapters</li>
                        </ul>
                        <button
                            onClick={() => handleSubscribe('price_1234567890')} // Replace with actual Stripe Price ID
                            disabled={loading}
                            className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 transition-all font-semibold shadow-lg"
                        >
                            {loading ? 'Processing...' : 'Subscribe Now'}
                        </button>
                    </div>

                    {/* Patron Plan */}
                    <div className="bg-[#1e1e1e] rounded-2xl p-8 border border-gray-800 hover:border-yellow-500 transition-all duration-300 flex flex-col">
                        <h3 className="text-2xl font-bold mb-4 text-yellow-500">Patron</h3>
                        <p className="text-4xl font-bold mb-6">$5.00<span className="text-lg text-gray-400 font-normal">/mo</span></p>
                        <ul className="space-y-4 mb-8 flex-1 text-left text-gray-300">
                            <li className="flex items-center"><span className="text-green-500 mr-2">✓</span> All Pro benefits</li>
                            <li className="flex items-center"><span className="text-green-500 mr-2">✓</span> Exclusive author Q&A</li>
                            <li className="flex items-center"><span className="text-green-500 mr-2">✓</span> Founder badge on profile</li>
                            <li className="flex items-center"><span className="text-green-500 mr-2">✓</span> Vote on future stories</li>
                            <li className="flex items-center"><span className="text-green-500 mr-2">✓</span> Monetization for authors</li>
                        </ul>
                        <button
                            onClick={() => handleSubscribe('price_0987654321')} // Replace with actual Stripe Price ID
                            disabled={loading}
                            className="w-full py-3 rounded-xl bg-gray-700 hover:bg-gray-600 hover:text-yellow-400 transition-all font-semibold"
                        >
                            {loading ? 'Processing...' : 'Become a Patron'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Subscription;
