import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Create Free Account - ₨0 Minimum Deposit",
  description:
    "Register for your free VEXO SMM account. Enjoy Pakistan's cheapest rates for Instagram followers, TikTok likes, YouTube watch time, and earn 5% lifetime referral commissions with SadaPay & Easypaisa.",
  alternates: {
    canonical: "/signup",
  },
};

export default function SignupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
