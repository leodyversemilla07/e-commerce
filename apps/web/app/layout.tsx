import { Geist, Geist_Mono, IBM_Plex_Sans } from "next/font/google"

import "@workspace/ui/globals.css"
import { QueryProvider } from "@/components/query-provider"
import { ThemeProvider } from "@/components/theme-provider"
import { AppToaster } from "@/components/toaster"
import { CheckoutStoreProvider } from "@/providers/checkout-store-provider"
import { cn } from "@workspace/ui/lib/utils";
import { TooltipProvider } from "@workspace/ui/components/tooltip";

const ibmPlexSans = IBM_Plex_Sans({subsets:['latin'],variable:'--font-sans'})

const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
})

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn("antialiased", fontMono.variable, "font-sans", ibmPlexSans.variable)}
    >
      <body>
        <QueryProvider>
          <CheckoutStoreProvider>
            <ThemeProvider>
              <TooltipProvider>
                {children}
                <AppToaster />
              </TooltipProvider>
            </ThemeProvider>
          </CheckoutStoreProvider>
        </QueryProvider>
      </body>
    </html>
  )
}
