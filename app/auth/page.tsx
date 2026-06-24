"use client";

import Loading from "@/components/Loading";
import { useAuthCallback } from "@mysten/enoki/react";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Page() {
  const { handled } = useAuthCallback();
  const router = useRouter();

  useEffect(() => {
    if (handled) {
      router.push("/dashboard");
    }
  }, [handled, router]);

  return <Loading />;
}
