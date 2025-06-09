"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Key, Eye, EyeOff } from "lucide-react"; // The Shuffle icon is no longer needed
import { useAppStore } from "@/lib/store";
import type { Keys } from "@/lib/types";
import { SSCRT_ADDRESS, SUSDC_ADDRESS } from "@/lib/constants";

interface ViewingKeysModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ViewingKeysModal({
  open,
  onOpenChange,
}: ViewingKeysModalProps) {
  // Get the create function and the global isLoading state from the store
  const { setViewingKeys, viewingKeys, createViewingKey, isLoading } = useAppStore();
  
  const [keys, setKeys] = useState<Keys>({
    sSCRT: viewingKeys?.sSCRT || "",
    sUSDC: viewingKeys?.sUSDC || "",
  });
  const [showSSCRT, setShowSSCRT] = useState(false);
  const [showSUSDC, setShowSUSDC] = useState(false);

  // This function calls the store to create a real viewing key on-chain
  const handleCreateKey = async (token: 'sSCRT' | 'sUSDC') => {
    const tokenAddress = token === 'sSCRT' ? SSCRT_ADDRESS : SUSDC_ADDRESS;
    const newKey = await createViewingKey(tokenAddress);
    
    if (newKey) {
      setKeys(currentKeys => ({ ...currentKeys, [token]: newKey }));
    }
  };

  const handleSubmit = () => {
    if (keys.sSCRT.trim() && keys.sUSDC.trim()) {
      setViewingKeys(keys);
      onOpenChange(false);
    }
  };

  const handleClose = () => {
    // Reset to original values if user cancels
    setKeys({
      sSCRT: viewingKeys?.sSCRT || "",
      sUSDC: viewingKeys?.sUSDC || "",
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Manage Viewing Keys
          </DialogTitle>
          <DialogDescription>
            Create a new key on-chain or paste an existing one to view balances.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {/* sSCRT Section */}
          <div className="space-y-2">
            <Label htmlFor="sSCRT-key">sSCRT Viewing Key</Label>
            <div className="flex items-center space-x-2">
              <div className="relative flex-1">
                <Input
                  id="sSCRT-key"
                  type={showSSCRT ? "text" : "password"}
                  placeholder="Paste or create a key..."
                  value={keys.sSCRT}
                  onChange={(e) => setKeys({ ...keys, sSCRT: e.target.value })}
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3 py-2"
                  onClick={() => setShowSSCRT(!showSSCRT)}
                >
                  {showSSCRT ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              <Button variant="outline" onClick={() => handleCreateKey('sSCRT')} disabled={isLoading}>
                Create
              </Button>
            </div>
          </div>
          
          {/* sUSDC Section */}
          <div className="space-y-2">
            <Label htmlFor="sUSDC-key">sUSDC Viewing Key</Label>
            <div className="flex items-center space-x-2">
              <div className="relative flex-1">
                <Input
                  id="sUSDC-key"
                  type={showSUSDC ? "text" : "password"}
                  placeholder="Paste or create a key..."
                  value={keys.sUSDC}
                  onChange={(e) => setKeys({ ...keys, sUSDC: e.target.value })}
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3 py-2"
                  onClick={() => setShowSUSDC(!showSUSDC)}
                >
                  {showSUSDC ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              <Button variant="outline" onClick={() => handleCreateKey('sUSDC')} disabled={isLoading}>
                Create
              </Button>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!keys.sSCRT.trim() || !keys.sUSDC.trim() || isLoading}
          >
            Save Viewing Keys
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}