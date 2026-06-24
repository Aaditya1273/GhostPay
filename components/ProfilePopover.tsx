"use client";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useCustomWallet } from "@/contexts/CustomWallet";
import {
  ExternalLink,
  LogOut,
  User,
  Ghost,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";

export default function ProfilePopover() {
  const { isConnected, logout, redirectToAuthUrl, emailAddress, address } =
    useCustomWallet();

  if (isConnected) {
    return (
      <Popover>
        <PopoverTrigger asChild>
          <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-accent/50 transition-all duration-200 border border-transparent hover:border-border">
            <Avatar className="w-7 h-7">
              <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                {emailAddress?.[0]?.toUpperCase() || "U"}
              </AvatarFallback>
            </Avatar>
            <span className="hidden sm:block text-sm font-medium">
              {emailAddress?.split("@")[0] || "User"}
            </span>
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-0" align="end">
          <Card className="border-none shadow-none">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <Avatar className="w-10 h-10">
                  <AvatarFallback className="bg-primary text-primary-foreground font-medium">
                    {emailAddress?.[0]?.toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <CardTitle className="text-sm">{emailAddress || "User"}</CardTitle>
                  <CardDescription className="text-xs">
                    zkLogin • Sui Testnet
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pb-3 space-y-2">
              <div className="flex items-center justify-between p-2 rounded-lg bg-accent/50 text-xs">
                <span className="text-muted-foreground">Wallet</span>
                <div className="flex items-center gap-1.5">
                  <span className="font-mono">
                    {address?.slice(0, 6)}...{address?.slice(-4)}
                  </span>
                  <a
                    href={`https://suiscan.xyz/testnet/account/${address}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-0.5 hover:text-primary transition-colors"
                  >
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
              <Link
                href="/wallet"
                className="flex items-center gap-2 p-2 rounded-lg hover:bg-accent/50 transition-colors text-xs text-muted-foreground hover:text-foreground"
              >
                <User className="w-3.5 h-3.5" />
                <span>View Agent Wallet</span>
                <ArrowRight className="w-3 h-3 ml-auto" />
              </Link>
            </CardContent>
            <CardFooter className="border-t border-border pt-3">
              <Button
                variant="destructive"
                size="sm"
                className="w-full gap-2"
                onClick={logout}
              >
                <LogOut className="w-3.5 h-3.5" />
                Sign Out
              </Button>
            </CardFooter>
          </Card>
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <Button onClick={redirectToAuthUrl} size="sm" className="gap-2">
      <Ghost className="w-4 h-4" />
      Sign In
    </Button>
  );
}
