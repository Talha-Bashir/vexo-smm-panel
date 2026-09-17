import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Create Account | VEXARO SMM Panel",
  description: "Create your personal VEXARO SMM Panel account to manage orders and wallet balance.",
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

export default function SignupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
