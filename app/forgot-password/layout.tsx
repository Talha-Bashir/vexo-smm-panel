import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Reset Password | VEXARO SMM Panel",
  description: "Reset your VEXARO SMM Panel account password securely.",
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
    },
  },
};

export default function ForgotPasswordLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
