import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Login - Access Your Growth Dashboard",
  description:
    "Log in to your VEXARO SMM Panel account. Access automated Instagram, TikTok, YouTube, and Facebook social media marketing services with instant delivery.",
  alternates: {
    canonical: "/login",
  },
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
