import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  FaEnvelope,
  FaPhoneAlt,
  FaCcVisa,
  FaCcMastercard,
  FaUniversity,
  FaMobileAlt,
  FaRupeeSign,
  FaCheckCircle,
} from "react-icons/fa";
import { useSearchParams } from "react-router-dom";
import PageHero from "../components/PageHero";
import { staggerContainer, staggerItem } from "../animations/variants";
import { useExternalScript } from "../hooks/useExternalScript";
import { useScrollReveal } from "../hooks/useScrollReveal";
import { useSEO } from "../hooks/useSEO";

const planAmountMap = {
  Gold: 25960,
  Platinum: 36580,
  "Partial Amount": "",
};

function formatCurrency(value) {
  if (value === "" || value === undefined || value === null) return "";
  const number = Number(value.toString().replace(/[^0-9]/g, ""));
  return number > 0 ? new Intl.NumberFormat("en-IN").format(number) : "";
}

export default function PaymentDetails() {
  useSEO({
    title: "Payment Details",
    description: "Enter your payment details to lock in a VEXARO courier plan.",
  });

  const { ref, isInView } = useScrollReveal(0.1);
  const [searchParams] = useSearchParams();
  const rawPlan = searchParams.get("plan") || "Gold";
  const plan = useMemo(() => {
    const normalized = rawPlan.toLowerCase();
    if (normalized.includes("gold")) return "Gold";
    if (normalized.includes("platinum")) return "Platinum";
    if (normalized.includes("partial")) return "Partial Amount";
    return "Gold";
  }, [rawPlan]);

  const isCustom = plan === "Partial Amount";
  const planAmount = planAmountMap[plan] || "";
  const razorpayKey = import.meta.env.VITE_RAZORPAY_KEY_ID;

  const [form, setForm] = useState({
    amount: isCustom ? "" : String(planAmount),
    email: "",
    phone: "",
    name: "",
    referralCode: "",
  });
  const [errors, setErrors] = useState({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [checkoutError, setCheckoutError] = useState("");
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  useEffect(() => {
    if (!isCustom) {
      setForm((prev) => ({ ...prev, amount: String(planAmount) }));
    }
  }, [isCustom, planAmount]);

  const displayAmount = useMemo(() => {
    if (!form.amount) return "";
    return formatCurrency(form.amount);
  }, [form.amount]);

  const getAmountValue = () => {
    return Number(form.amount.toString().replace(/[^0-9]/g, ""));
  };

  const validate = () => {
    const nextErrors = {};
    const amountValue = getAmountValue();

    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      nextErrors.email = "Enter a valid email.";
    }
    if (
      !form.phone.trim() ||
      !/^[6-9]\d{9}$/.test(form.phone.replace(/\s/g, ""))
    ) {
      nextErrors.phone = "Enter a valid 10-digit Indian mobile number.";
    }
    if (!form.name.trim() || form.name.trim().length < 2) {
      nextErrors.name = "Name must be at least 2 characters.";
    }
    if (!amountValue || amountValue <= 0) {
      nextErrors.amount = "Amount must be greater than zero.";
    }
    return nextErrors;
  };

  const openRazorpayCheckout = async () => {
    setCheckoutError("");
    setPaymentSuccess(false);
    const nextErrors = validate();
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      return;
    }

    if (!razorpayKey) {
      setCheckoutError(
        "Razorpay key is missing. Set VITE_RAZORPAY_KEY_ID in your .env file.",
      );
      return;
    }

    const amountValue = getAmountValue();
    if (!amountValue || amountValue <= 0) {
      setCheckoutError("Enter a valid payment amount.");
      return;
    }

    setIsProcessing(true);

    let Razorpay;
    try {
      Razorpay = await useExternalScript(
        "https://checkout.razorpay.com/v1/checkout.js",
      );
    } catch (error) {
      console.error(error);
      setCheckoutError(
        "Unable to load Razorpay checkout. Please refresh the page and try again.",
      );
      setIsProcessing(false);
      return;
    }

    if (!Razorpay || !window.Razorpay) {
      setCheckoutError(
        "Razorpay checkout is unavailable. Please try again later.",
      );
      setIsProcessing(false);
      return;
    }

    const checkoutOptions = {
      key: razorpayKey,
      amount: amountValue * 100,
      currency: "INR",
      name: "VEXARO Courier Solution",
      description: `${plan} Plan Payment`,
      prefill: {
        name: form.name,
        email: form.email,
        contact: form.phone,
      },
      notes: {
        plan,
        referralCode: form.referralCode || "",
      },
      theme: {
        color: "#1A3A8F",
      },
      handler: function (response) {
        setIsProcessing(false);
        setPaymentSuccess(true);
        console.log("Razorpay success response:", response);
      },
      modal: {
        ondismiss: function () {
          setIsProcessing(false);
        },
      },
    };

    try {
      const razorpayInstance = new window.Razorpay(checkoutOptions);
      razorpayInstance.on("payment.failed", function (response) {
        console.error("Razorpay payment failed:", response);
        setCheckoutError(
          "Payment could not be completed. Please try another method or try again.",
        );
        setIsProcessing(false);
      });
      razorpayInstance.open();
    } catch (error) {
      console.error(error);
      setCheckoutError(
        "Unable to open Razorpay checkout. Please refresh and try again.",
      );
      setIsProcessing(false);
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    openRazorpayCheckout();
  };

  const handleAmountChange = (event) => {
    if (!isCustom) return;
    const numericValue = event.target.value.replace(/[^0-9]/g, "");
    setForm((prev) => ({ ...prev, amount: numericValue }));
    setErrors((prev) => ({ ...prev, amount: "" }));
  };

  return (
    <>
      <PageHero
        title="Payment Details"
        subtitle="Complete your payment details to proceed with a premium VEXARO shipping plan."
        breadcrumb="Payment Details"
      />

      <section className="section-padding bg-white flex-1">
        <div className="container-custom">
          <motion.div
            ref={ref}
            variants={staggerContainer}
            initial="hidden"
            animate={isInView ? "visible" : "hidden"}
            className="grid lg:grid-cols-[1.05fr_0.95fr] gap-8 xl:gap-10"
          >
            <motion.aside
              variants={staggerItem}
              className="rounded-[32px] border border-soft-border bg-light-blue/80 p-8 lg:p-10 shadow-card"
            >
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-2xl bg-navy text-white grid place-items-center shadow-lg">
                    <span className="text-xl font-bold">V</span>
                  </div>
                  <div>
                    <p className="text-[13px] uppercase tracking-[0.3em] font-semibold text-orange mb-1">
                      VEXARO
                    </p>
                    <h2 className="text-3xl font-black font-heading text-charcoal">
                      VEXARO COURIER SOLUTION
                    </h2>
                  </div>
                </div>

                <div className="rounded-[28px] bg-white p-6 shadow-card border border-white/80">
                  <p className="text-sm font-medium uppercase tracking-[0.18em] text-navy mb-5">
                    Contact Information
                  </p>
                  <div className="space-y-4 text-graphite">
                    <div className="flex items-center gap-3">
                      <FaEnvelope className="text-navy" />
                      <a
                        href="mailto:info@vexarocouriersolutions.com"
                        className="text-sm font-medium text-charcoal hover:text-navy transition-colors"
                      >
                        info@vexarocouriersolutions.com
                      </a>
                    </div>
                    <div className="flex items-center gap-3">
                      <FaPhoneAlt className="text-navy" />
                      <a
                        href="tel:+919183888181"
                        className="text-sm font-medium text-charcoal hover:text-navy transition-colors"
                      >
                        +91-9183888181
                      </a>
                    </div>
                  </div>
                </div>

                <div className="rounded-[28px] bg-white p-6 shadow-card border border-white/80">
                  <p className="text-sm font-medium uppercase tracking-[0.18em] text-navy mb-4">
                    Terms & Conditions
                  </p>
                  <p className="text-sm leading-relaxed text-graphite font-body">
                    By proceeding, you agree to share the payment information
                    entered on this page with VEXARO Courier Solution and
                    Razorpay, subject to applicable laws.
                  </p>
                </div>

                <div className="rounded-[28px] bg-white p-6 shadow-card border border-soft-border">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="h-9 w-9 rounded-full bg-navy text-white grid place-items-center">
                      <FaRupeeSign />
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-graphite/70 font-semibold">
                        Payment provider
                      </p>
                      <p className="text-lg font-bold text-charcoal">
                        Razorpay
                      </p>
                    </div>
                  </div>
                  <p className="text-sm text-graphite leading-relaxed">
                    Your payment will be processed through Razorpay. This page
                    only handles the payment details experience.
                  </p>
                </div>

                <div className="rounded-[28px] border border-soft-border bg-light-blue/75 p-5 shadow-card">
                  <p className="text-sm font-semibold text-charcoal mb-3">
                    Accepted payment methods
                  </p>
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
                    <div className="flex flex-col items-center justify-center gap-2 rounded-3xl border border-soft-border bg-white py-4 text-center shadow-sm">
                      <FaMobileAlt className="text-navy" size={22} />
                      <span className="text-xs font-semibold text-graphite">
                        UPI
                      </span>
                    </div>
                    <div className="flex flex-col items-center justify-center gap-2 rounded-3xl border border-soft-border bg-white py-4 text-center shadow-sm">
                      <FaCcVisa className="text-navy" size={22} />
                      <span className="text-xs font-semibold text-graphite">
                        Visa
                      </span>
                    </div>
                    <div className="flex flex-col items-center justify-center gap-2 rounded-3xl border border-soft-border bg-white py-4 text-center shadow-sm">
                      <FaCcMastercard className="text-orange" size={22} />
                      <span className="text-xs font-semibold text-graphite">
                        Mastercard
                      </span>
                    </div>
                    <div className="flex flex-col items-center justify-center gap-2 rounded-3xl border border-soft-border bg-white py-4 text-center shadow-sm">
                      <span className="text-lg font-bold text-navy">Ru</span>
                      <span className="text-xs font-semibold text-graphite">
                        RuPay
                      </span>
                    </div>
                    <div className="flex flex-col items-center justify-center gap-2 rounded-3xl border border-soft-border bg-white py-4 text-center shadow-sm">
                      <FaUniversity className="text-charcoal" size={22} />
                      <span className="text-xs font-semibold text-graphite">
                        Net Banking
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.aside>

            <motion.div variants={staggerItem} className="relative">
              <div className="rounded-[32px] border border-soft-border bg-white p-8 lg:p-10 shadow-card">
                <div className="mb-8 flex flex-col gap-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm uppercase tracking-[0.22em] text-orange font-semibold">
                        Payment Details
                      </p>
                      <h3 className="text-3xl font-black font-heading text-charcoal mt-1">
                        {plan === "Partial Amount"
                          ? "Custom Plan"
                          : `${plan} Plan`}
                      </h3>
                    </div>
                    <div className="rounded-full border border-soft-border bg-light-blue px-4 py-2 text-sm font-semibold text-navy">
                      {plan}
                    </div>
                  </div>
                  <p className="text-sm leading-relaxed text-graphite font-body">
                    Fill in your contact details and confirm the amount. The pay
                    button updates automatically as the amount changes.
                  </p>
                </div>

                {paymentSuccess ? (
                  <div className="rounded-[32px] border border-green-200 bg-green-50 p-6 shadow-sm">
                    <div className="flex items-start gap-3">
                      <FaCheckCircle
                        className="mt-1 text-green-600"
                        size={22}
                      />
                      <div>
                        <p className="text-lg font-black font-heading text-charcoal">
                          Payment completed successfully
                        </p>
                        <p className="mt-2 text-sm leading-relaxed text-graphite">
                          Thank you for choosing VEXARO. Your payment has been
                          received and our team will contact you shortly with
                          the next steps.
                        </p>
                      </div>
                    </div>

                    <div className="mt-5 rounded-[24px] border border-green-100 bg-white/90 p-4 text-sm text-graphite">
                      <div className="flex items-center justify-between gap-3">
                        <span>Selected plan</span>
                        <span className="font-semibold text-charcoal">
                          {plan}
                        </span>
                      </div>
                      <div className="mt-3 flex items-center justify-between gap-3">
                        <span>Amount paid</span>
                        <span className="font-semibold text-charcoal">
                          ₹ {displayAmount || "0"}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <form
                    id="payment-form"
                    onSubmit={handleSubmit}
                    noValidate
                    className="space-y-6"
                  >
                    <div className="grid gap-6">
                      <label className="block">
                        <span className="text-sm font-semibold text-charcoal mb-2 inline-block">
                          Amount <span className="text-orange">*</span>
                        </span>
                        <div className="relative">
                          <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-graphite">
                            ₹
                          </span>
                          <input
                            type="text"
                            inputMode={isCustom ? "numeric" : "text"}
                            value={displayAmount}
                            onChange={handleAmountChange}
                            readOnly={!isCustom}
                            onKeyDown={(event) => {
                              if (!isCustom) {
                                event.preventDefault();
                              }
                              if (
                                isCustom &&
                                event.key.length === 1 &&
                                !/[0-9]/.test(event.key)
                              ) {
                                event.preventDefault();
                              }
                            }}
                            onPaste={(event) => {
                              if (!isCustom) {
                                event.preventDefault();
                                return;
                              }
                              const pasted = event.clipboardData
                                .getData("text/plain")
                                .replace(/[^0-9]/g, "");
                              setForm((prev) => ({ ...prev, amount: pasted }));
                              event.preventDefault();
                            }}
                            placeholder={
                              isCustom ? "Enter amount" : "Amount locked"
                            }
                            className={`w-full rounded-[20px] border px-14 py-4 text-lg font-semibold text-charcoal transition-all focus:outline-none focus:ring-2 focus:ring-navy/10 focus:border-navy bg-white ${errors.amount ? "border-red-400 bg-red-50" : "border-soft-border"}`}
                            aria-required="true"
                            aria-invalid={!!errors.amount}
                          />
                        </div>
                        {errors.amount && (
                          <p className="mt-2 text-sm text-red-500">
                            {errors.amount}
                          </p>
                        )}
                      </label>

                      <label className="block">
                        <span className="text-sm font-semibold text-charcoal mb-2 inline-block">
                          Email <span className="text-orange">*</span>
                        </span>
                        <input
                          type="email"
                          name="email"
                          value={form.email}
                          onChange={(event) => {
                            setForm((prev) => ({
                              ...prev,
                              email: event.target.value,
                            }));
                            setErrors((prev) => ({ ...prev, email: "" }));
                          }}
                          placeholder="you@example.com"
                          className={`w-full rounded-[20px] border px-5 py-4 text-sm text-charcoal transition-all focus:outline-none focus:ring-2 focus:ring-navy/10 focus:border-navy bg-white ${errors.email ? "border-red-400 bg-red-50" : "border-soft-border"}`}
                          aria-required="true"
                          aria-invalid={!!errors.email}
                        />
                        {errors.email && (
                          <p className="mt-2 text-sm text-red-500">
                            {errors.email}
                          </p>
                        )}
                      </label>

                      <label className="block">
                        <span className="text-sm font-semibold text-charcoal mb-2 inline-block">
                          Phone <span className="text-orange">*</span>
                        </span>
                        <div className="grid grid-cols-[96px_1fr] gap-3">
                          <div className="rounded-[20px] border border-soft-border bg-light-blue px-4 py-4 text-sm font-semibold text-charcoal flex items-center">
                            IN +91
                          </div>
                          <input
                            type="tel"
                            name="phone"
                            value={form.phone}
                            onChange={(event) => {
                              const digits = event.target.value.replace(
                                /[^0-9]/g,
                                "",
                              );
                              setForm((prev) => ({ ...prev, phone: digits }));
                              setErrors((prev) => ({ ...prev, phone: "" }));
                            }}
                            placeholder="91234 56789"
                            className={`w-full rounded-[20px] border px-5 py-4 text-sm text-charcoal transition-all focus:outline-none focus:ring-2 focus:ring-navy/10 focus:border-navy bg-white ${errors.phone ? "border-red-400 bg-red-50" : "border-soft-border"}`}
                            aria-required="true"
                            aria-invalid={!!errors.phone}
                          />
                        </div>
                        {errors.phone && (
                          <p className="mt-2 text-sm text-red-500">
                            {errors.phone}
                          </p>
                        )}
                      </label>

                      <label className="block">
                        <span className="text-sm font-semibold text-charcoal mb-2 inline-block">
                          Name <span className="text-orange">*</span>
                        </span>
                        <input
                          type="text"
                          name="name"
                          value={form.name}
                          onChange={(event) => {
                            setForm((prev) => ({
                              ...prev,
                              name: event.target.value,
                            }));
                            setErrors((prev) => ({ ...prev, name: "" }));
                          }}
                          placeholder="Your full name"
                          className={`w-full rounded-[20px] border px-5 py-4 text-sm text-charcoal transition-all focus:outline-none focus:ring-2 focus:ring-navy/10 focus:border-navy bg-white ${errors.name ? "border-red-400 bg-red-50" : "border-soft-border"}`}
                          aria-required="true"
                          aria-invalid={!!errors.name}
                        />
                        {errors.name && (
                          <p className="mt-2 text-sm text-red-500">
                            {errors.name}
                          </p>
                        )}
                      </label>

                      <label className="block">
                        <span className="text-sm font-semibold text-charcoal mb-2 inline-block">
                          Referral Code{" "}
                          <span className="text-graphite text-sm">
                            (Optional)
                          </span>
                        </span>
                        <input
                          type="text"
                          name="referralCode"
                          value={form.referralCode}
                          onChange={(event) =>
                            setForm((prev) => ({
                              ...prev,
                              referralCode: event.target.value,
                            }))
                          }
                          placeholder="Enter referral code"
                          className="w-full rounded-[20px] border border-soft-border px-5 py-4 text-sm text-charcoal transition-all focus:outline-none focus:ring-2 focus:ring-navy/10 focus:border-navy bg-white"
                        />
                      </label>
                    </div>

                    <div className="mt-4 rounded-[32px] border border-soft-border bg-white/90 p-5 text-sm text-graphite">
                      <p className="font-semibold text-charcoal mb-2">
                        Order summary
                      </p>
                      <div className="grid gap-3 text-sm">
                        <div className="flex items-center justify-between">
                          <span>Selected plan</span>
                          <span className="font-semibold text-charcoal">
                            {plan}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Payable amount</span>
                          <span className="font-semibold text-charcoal">
                            ₹ {displayAmount || "0"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="xl:hidden">
                      <button
                        type="submit"
                        disabled={isProcessing}
                        className={`w-full rounded-full px-6 py-4 text-base font-bold text-white shadow-lg shadow-navy/10 transition-all duration-200 ${isProcessing ? "bg-navy/70 cursor-not-allowed" : "bg-navy hover:bg-[#122f72]"}`}
                      >
                        {isProcessing
                          ? "Opening Razorpay..."
                          : `Pay ₹ ${displayAmount || "0"}`}
                      </button>
                    </div>
                    {checkoutError && (
                      <div
                        className="rounded-[24px] border border-red-200 bg-red-50 p-4 text-sm text-red-700"
                        role="alert"
                      >
                        {checkoutError}
                      </div>
                    )}
                  </form>
                )}
              </div>

              <div className="hidden xl:block">
                <div className="fixed bottom-6 right-6 z-50">
                  <button
                    type="submit"
                    form="payment-form"
                    disabled={isProcessing}
                    className={`rounded-full px-6 py-4 text-base font-bold text-white shadow-2xl shadow-navy/20 transition-all duration-200 ${isProcessing ? "bg-navy/70 cursor-not-allowed" : "bg-navy hover:bg-[#122f72]"}`}
                  >
                    {isProcessing
                      ? "Opening Razorpay..."
                      : `Pay ₹ ${displayAmount || "0"}`}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>
    </>
  );
}
