"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  LayoutDashboard,
  Wallet,
  Send,
  Database,
  Shield,
  ArrowLeftRight,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  Ghost,
  LogOut,
} from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useCustomWallet } from "@/contexts/CustomWallet";
import { motion, AnimatePresence } from "framer-motion";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/wallet", label: "Agent Wallet", icon: Wallet },
  { href: "/swap", label: "Swap", icon: ArrowLeftRight },
  { href: "/payments", label: "Payments", icon: Send },
  { href: "/vault", label: "Memory Vault", icon: Database },
  { href: "/compliance", label: "Compliance", icon: Shield },
];

const sidebarVariants = {
  expanded: { width: 240 },
  collapsed: { width: 64 },
};

const itemVariants = {
  expanded: { opacity: 1, x: 0 },
  collapsed: { opacity: 0, x: -10 },
};

export default function LayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { isConnected, logout, redirectToAuthUrl, emailAddress, address, isUsingEnoki } = useCustomWallet();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  return (
    <div className="flex h-screen overflow-hidden bg-[#0B0C10] text-[#F4F6FF] font-sans">
      {/* Mobile overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Mobile sidebar */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.aside
            initial={{ x: -280 }}
            animate={{ x: 0 }}
            exit={{ x: -280 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed inset-y-0 left-0 z-50 w-64 bg-[#0B0C10] lg:hidden"
          >
            <div className="flex h-full flex-col">
              <div className="flex h-16 items-center justify-between px-6 border-b border-sidebar-border">
                <Link href="/dashboard" className="flex items-center gap-2">
                  <span className="font-heading font-semibold text-[#F4F6FF]">Ghost<span className="text-[#B347FF]">Pay</span></span>
                </Link>
                <Button variant="ghost" size="icon" onClick={() => setMobileMenuOpen(false)}>
                  <X className="w-5 h-5" />
                </Button>
              </div>
              <nav className="flex-1 overflow-y-auto p-4 space-y-1">
                {navItems.map((item) => {
                  const isActive = pathname.startsWith(item.href);
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                        isActive
                          ? "bg-[rgba(179,71,255,0.1)] text-[#B347FF]"
                          : "text-[#A7B0C8] hover:text-[#F4F6FF] hover:bg-[rgba(255,255,255,0.05)]"
                      )}
                    >
                      <Icon className="w-5 h-5 flex-shrink-0" />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </nav>
              <div className="p-4 border-t border-sidebar-border">
                {isConnected ? (
                  isUsingEnoki ? (
                    <Popover>
                      <PopoverTrigger asChild>
                        <button
                          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 w-full transition-all duration-200"
                        >
                          <Avatar className="w-6 h-6">
                            <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                              {emailAddress?.[0]?.toUpperCase() || "G"}
                            </AvatarFallback>
                          </Avatar>
                          <span className="truncate">{emailAddress || "Signed In"}</span>
                        </button>
                      </PopoverTrigger>
                      <PopoverContent side="top" className="w-56 bg-[#0B0C10] border border-[rgba(255,255,255,0.05)] p-2">
                        <Button variant="ghost" className="w-full justify-start text-left text-[#F4F6FF] hover:bg-[rgba(255,255,255,0.05)]" onClick={logout}>
                          <LogOut className="w-4 h-4 mr-2 text-[#A7B0C8]" />
                          Sign out
                        </Button>
                      </PopoverContent>
                    </Popover>
                  ) : (
                    <Popover>
                      <PopoverTrigger asChild>
                        <button className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-[#A7B0C8] hover:text-[#F4F6FF] hover:bg-[rgba(255,255,255,0.05)] w-full transition-all duration-200">
                          <div className="flex items-center justify-center w-6 h-6 rounded-full bg-[rgba(255,255,255,0.05)] text-[#A7B0C8]">
                            <Wallet className="w-3 h-3" />
                          </div>
                          <span className="truncate">Wallet Connected</span>
                        </button>
                      </PopoverTrigger>
                      <PopoverContent side="top" className="w-56 bg-[#0B0C10] border border-[rgba(255,255,255,0.05)] p-2">
                        <Button variant="ghost" className="w-full justify-start text-left text-[#F4F6FF] hover:bg-[rgba(255,255,255,0.05)]" onClick={logout}>
                          <LogOut className="w-4 h-4 mr-2 text-[#A7B0C8]" />
                          Disconnect Wallet
                        </Button>
                      </PopoverContent>
                    </Popover>
                  )
                ) : null}
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Desktop sidebar */}
      <motion.aside
        animate={sidebarOpen ? "expanded" : "collapsed"}
        variants={sidebarVariants}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        className="hidden lg:flex flex-col bg-[#0B0C10] overflow-hidden"
      >
        <div className={cn(
          "flex h-16 items-center",
          sidebarOpen ? "px-6 justify-between" : "px-4 justify-center"
        )}>
          {sidebarOpen ? (
            <>
              <Link href="/dashboard" className="flex items-center gap-2">
                <span className="font-heading font-semibold text-[#F4F6FF]">Ghost<span className="text-[#B347FF]">Pay</span></span>
              </Link>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSidebarOpen(false)}
                className="text-sidebar-foreground/40 hover:text-sidebar-foreground"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
            </>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(true)}
              className="text-sidebar-foreground/40 hover:text-sidebar-foreground"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          )}
        </div>
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 relative group",
                  sidebarOpen ? "" : "justify-center",
                  isActive
                    ? "bg-[rgba(179,71,255,0.1)] text-[#B347FF]"
                    : "text-[#A7B0C8] hover:text-[#F4F6FF] hover:bg-[rgba(255,255,255,0.05)]"
                )}
              >
                <Icon className={cn("w-5 h-5 flex-shrink-0", isActive && "text-primary")} />
                <AnimatePresence>
                  {sidebarOpen && (
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="truncate"
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>
                {isActive && (
                  <div className="absolute inset-0 rounded-lg bg-sidebar-accent -z-10" />
                )}
              </Link>
            );
          })}
        </nav>
        <div className={cn(
          "p-3",
          sidebarOpen ? "" : "flex justify-center"
        )}>
          {isConnected ? (
            sidebarOpen ? (
              isUsingEnoki ? (
                <Popover>
                  <PopoverTrigger asChild>
                    <button
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 w-full transition-all duration-200"
                    >
                      <Avatar className="w-6 h-6">
                        <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                          {emailAddress?.[0]?.toUpperCase() || "G"}
                        </AvatarFallback>
                      </Avatar>
                      <span className="truncate">{emailAddress || "Signed In"}</span>
                    </button>
                  </PopoverTrigger>
                  <PopoverContent side="right" className="w-56 bg-[#0B0C10] border border-[rgba(255,255,255,0.05)] p-2 ml-4">
                    <Button variant="ghost" className="w-full justify-start text-left text-[#F4F6FF] hover:bg-[rgba(255,255,255,0.05)]" onClick={logout}>
                      <LogOut className="w-4 h-4 mr-2 text-[#A7B0C8]" />
                      Sign out
                    </Button>
                  </PopoverContent>
                </Popover>
              ) : (
                <div className="flex flex-col gap-2 w-full">
                  <button
                    onClick={redirectToAuthUrl}
                    className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium bg-[#B347FF] text-[#0B0C10] hover:scale-105 transition-all duration-200 w-full"
                  >
                    <Image src="/google.png" alt="Google" width={16} height={16} />
                    Sign in with Google
                  </button>
                  <Popover>
                    <PopoverTrigger asChild>
                      <button className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-[#A7B0C8] hover:text-[#F4F6FF] hover:bg-[rgba(255,255,255,0.05)] w-full transition-all duration-200">
                        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-[rgba(255,255,255,0.05)] text-[#A7B0C8]">
                          <Wallet className="w-3 h-3" />
                        </div>
                        <span className="truncate">Wallet Connected</span>
                      </button>
                    </PopoverTrigger>
                    <PopoverContent side="right" className="w-56 bg-[#0B0C10] border border-[rgba(255,255,255,0.05)] p-2 ml-4">
                      <Button variant="ghost" className="w-full justify-start text-left text-[#F4F6FF] hover:bg-[rgba(255,255,255,0.05)]" onClick={logout}>
                        <LogOut className="w-4 h-4 mr-2 text-[#A7B0C8]" />
                        Disconnect Wallet
                      </Button>
                    </PopoverContent>
                  </Popover>
                </div>
              )
            ) : (
              isUsingEnoki ? (
                <Popover>
                  <PopoverTrigger asChild>
                    <button className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-[rgba(255,255,255,0.05)] transition-all">
                      <Avatar className="w-6 h-6">
                        <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                          {emailAddress?.[0]?.toUpperCase() || "G"}
                        </AvatarFallback>
                      </Avatar>
                    </button>
                  </PopoverTrigger>
                  <PopoverContent side="right" className="w-56 bg-[#0B0C10] border border-[rgba(255,255,255,0.05)] p-2 ml-4">
                    <div className="px-3 py-2 text-sm text-[#A7B0C8] border-b border-[rgba(255,255,255,0.05)] mb-2 truncate">
                      {emailAddress || "Signed In"}
                    </div>
                    <Button variant="ghost" className="w-full justify-start text-left text-[#F4F6FF] hover:bg-[rgba(255,255,255,0.05)]" onClick={logout}>
                      <LogOut className="w-4 h-4 mr-2 text-[#A7B0C8]" />
                      Sign out
                    </Button>
                  </PopoverContent>
                </Popover>
              ) : (
                <Popover>
                  <PopoverTrigger asChild>
                    <button className="flex items-center justify-center w-8 h-8 rounded-full bg-[rgba(255,255,255,0.05)] text-[#A7B0C8] hover:bg-[rgba(255,255,255,0.08)] transition-all">
                      <Wallet className="w-4 h-4" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent side="right" className="w-56 bg-[#0B0C10] border border-[rgba(255,255,255,0.05)] p-2 ml-4">
                    <Button variant="ghost" className="w-full justify-start text-left text-[#F4F6FF] hover:bg-[rgba(255,255,255,0.05)]" onClick={logout}>
                      <LogOut className="w-4 h-4 mr-2 text-[#A7B0C8]" />
                      Disconnect Wallet
                    </Button>
                  </PopoverContent>
                </Popover>
              )
            )
          ) : null}
        </div>
      </motion.aside>        {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Topbar */}
        <header className="flex h-16 items-center gap-4 bg-[#0B0C10]/80 backdrop-blur-xl px-4 lg:px-6">
          <div className="flex items-center gap-3 lg:hidden">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMobileMenuOpen(true)}
            >
              <Menu className="w-5 h-5" />
            </Button>
            <Link href="/dashboard" className="flex items-center gap-2">
              <span className="font-heading font-semibold text-sm text-[#F4F6FF]">Ghost<span className="text-[#B347FF]">Pay</span></span>
            </Link>
          </div>

          <div className="flex-1" />

          <div className="flex items-center gap-2">
            {isConnected ? (
              <>
                <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[rgba(255,255,255,0.05)] text-sm text-[#A7B0C8]">
                  <span className="w-2 h-2 rounded-full bg-[#B347FF]" />
                  <span className="font-mono text-xs text-[#F4F6FF]">
                    {address?.slice(0, 6)}...{address?.slice(-4)}
                  </span>
                </div>
                {isUsingEnoki ? (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <Avatar className="w-7 h-7">
                          <AvatarImage src="" />
                          <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                            {emailAddress?.[0]?.toUpperCase() || "G"}
                          </AvatarFallback>
                        </Avatar>
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent align="end" sideOffset={8} className="w-56 bg-[#0B0C10] border border-[rgba(255,255,255,0.05)] p-2">
                      <div className="px-3 py-2 text-sm text-[#A7B0C8] border-b border-[rgba(255,255,255,0.05)] mb-2 truncate">
                        {emailAddress || "Signed In"}
                      </div>
                      <Button variant="ghost" className="w-full justify-start text-left text-[#F4F6FF] hover:bg-[rgba(255,255,255,0.05)]" onClick={logout}>
                        <LogOut className="w-4 h-4 mr-2 text-[#A7B0C8]" />
                        Sign out
                      </Button>
                    </PopoverContent>
                  </Popover>
                ) : (
                  <>
                    <Button
                      onClick={redirectToAuthUrl}
                      size="sm"
                      className="gap-2 bg-[rgba(255,255,255,0.05)] text-[#F4F6FF] hover:bg-[rgba(255,255,255,0.08)] border border-[rgba(255,255,255,0.1)] ml-2"
                    >
                      <Image src="/google.png" alt="Google" width={16} height={16} />
                      Sign in with Google
                    </Button>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-[#A7B0C8] hover:text-[#F4F6FF] bg-[rgba(255,255,255,0.05)] ml-2 rounded-full"
                        >
                          <Wallet className="w-4 h-4" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent align="end" sideOffset={8} className="w-56 bg-[#0B0C10] border border-[rgba(255,255,255,0.05)] p-2">
                        <Button variant="ghost" className="w-full justify-start text-left text-[#F4F6FF] hover:bg-[rgba(255,255,255,0.05)]" onClick={logout}>
                          <LogOut className="w-4 h-4 mr-2 text-[#A7B0C8]" />
                          Disconnect Wallet
                        </Button>
                      </PopoverContent>
                    </Popover>
                  </>
                )}
              </>
            ) : (
              <Button
                onClick={redirectToAuthUrl}
                size="sm"
                className="gap-2 bg-[#B347FF] text-[#0B0C10] hover:scale-105 transition-all duration-300 rounded-full font-semibold px-6"
              >
                <Image src="/google.png" alt="Google" width={16} height={16} />
                Sign in with Google
              </Button>
            )}
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto bg-[#0B0C10]">
          <div className="animate-page-in">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 bg-[#0B0C10]/95 backdrop-blur-xl lg:hidden">
        <div className="flex items-center justify-around h-16 px-2">
          {navItems.map((item) => {
            const isActive = pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-all duration-200",
                  isActive
                    ? "text-[#B347FF]"
                    : "text-[#A7B0C8] hover:text-[#F4F6FF]"
                )}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[10px] font-medium">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
