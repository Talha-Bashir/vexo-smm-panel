import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign In to Account",
  description: "Secure login for registered VEXARO SMM Panel account holders.",
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

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
