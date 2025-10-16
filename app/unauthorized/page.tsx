"use client";

import { Button } from "@/components/ui/button";
import { useAuthActions } from "@convex-dev/auth/react";
import { AlertTriangle, Mail, Shield } from "lucide-react";

export default function Unauthorized() {
  const { signOut } = useAuthActions();

  return (
    <div className="flex h-screen items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        <div className="flex justify-center mb-6">
          <div className="bg-red-100 p-3 rounded-full">
            <AlertTriangle className="h-8 w-8 text-red-600" />
          </div>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>

        <div className="space-y-4 text-gray-600 mb-8">
          <div className="flex items-center justify-center space-x-2">
            <Mail className="h-5 w-5" />
            <span>Only @bu.edu emails are allowed</span>
          </div>

          <div className="flex items-center justify-center space-x-2">
            <Shield className="h-5 w-5" />
            <span>Your email must be whitelisted by an administrator</span>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-blue-800">
            <strong>Need access?</strong> Contact your campus program
            coordinator to have your @bu.edu email added to the whitelist.
          </p>
        </div>

        <Button
          onClick={() => void signOut()}
          variant="outline"
          className="w-full"
        >
          Sign Out
        </Button>
      </div>
    </div>
  );
}
